import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job as BullJob } from "bullmq";
import { Queue } from "bullmq";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { PrismaService } from "../../prisma/prisma.service";
import { JOB_EMBEDDINGS_QUEUE } from "../../queue/queue.module";
import { QdrantService } from "../../qdrant/qdrant.module";

/** OpenAI embedding model shared by job/catalog/candidate vectors. */
export const EMBEDDING_MODEL = "text-embedding-3-small";

/** Soft cap for job embedding input (~2–3k chars). */
const JOB_EMBEDDING_TEXT_MAX = 3000;

export type JobEmbeddingJobData = {
  jobId: string;
  companyId: string;
};

/** Fields used to build the job embedding document. */
export type JobEmbeddingTextInput = {
  title: string;
  location: string | null;
  workMode: string | null;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
  skills: { name: string; required: boolean }[];
  jobRole?: { name: string } | null;
  industry?: { name: string } | null;
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build truncated plain-text input for job embeddings.
 * Includes title, skills (required marked), role, location, work mode, industry,
 * and stripped description/requirements/responsibilities (capped ~3k chars).
 */
export function buildJobEmbeddingText(job: JobEmbeddingTextInput): string {
  const skills = job.skills
    .map((s) => {
      const name = s.name.trim();
      if (!name) return null;
      return s.required ? `${name} (required)` : name;
    })
    .filter(Boolean)
    .join(", ");

  const header = [
    job.title?.trim() ? `Title: ${job.title.trim()}` : null,
    skills ? `Skills: ${skills}` : null,
    job.jobRole?.name ? `Job role: ${job.jobRole.name}` : null,
    job.location?.trim() ? `Location: ${job.location.trim()}` : null,
    job.workMode?.trim() ? `Work mode: ${job.workMode.trim()}` : null,
    job.industry?.name ? `Industry: ${job.industry.name}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const bodySections: [string, string][] = [
    ["Description", job.description ? stripHtml(job.description) : ""],
    ["Requirements", job.requirements ? stripHtml(job.requirements) : ""],
    [
      "Responsibilities",
      job.responsibilities ? stripHtml(job.responsibilities) : "",
    ],
  ];

  let remaining = JOB_EMBEDDING_TEXT_MAX - header.length;
  const bodyParts: string[] = [];

  for (const [label, text] of bodySections) {
    if (!text || remaining <= 16) continue;
    // Reserve a newline before each body section when header (or prior parts) exist.
    const sep = header || bodyParts.length ? 1 : 0;
    const budget = remaining - sep - `${label}: `.length;
    if (budget <= 0) break;
    const clipped = text.length > budget ? text.slice(0, budget).trimEnd() : text;
    if (!clipped) continue;
    bodyParts.push(`${label}: ${clipped}`);
    remaining -= sep + `${label}: ${clipped}`.length;
  }

  return [header, ...bodyParts].filter(Boolean).join("\n");
}

@Injectable()
export class EmbeddingsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(JOB_EMBEDDINGS_QUEUE) private readonly queue: Queue,
  ) {}

  /** Mark job embedding PENDING and enqueue BullMQ (fail-soft on Redis timeout). */
  async enqueueJobEmbedding(jobId: string, companyId: string): Promise<void> {
    await this.prisma.jobEmbedding.upsert({
      where: { jobId },
      create: {
        jobId,
        status: "PENDING",
        model: EMBEDDING_MODEL,
      },
      update: {
        status: "PENDING",
        model: EMBEDDING_MODEL,
      },
    });

    try {
      // Fail fast when Redis/BullMQ is unreachable so publish/update don't hang.
      await Promise.race([
        this.queue.add(
          "embed-job",
          { jobId, companyId } satisfies JobEmbeddingJobData,
          {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          },
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Timed out enqueueing job embedding")),
            5000,
          ),
        ),
      ]);
    } catch (err) {
      console.error(`Failed to enqueue embedding for job ${jobId}:`, err);
      await this.prisma.jobEmbedding.updateMany({
        where: { jobId },
        data: { status: "FAILED" },
      });
    }
  }

  /**
   * Enqueue embedding rebuild for every PUBLISHED job.
   * Intended for admin reindex after embedding text changes.
   */
  async reindexAllPublishedJobs(): Promise<{ enqueued: number }> {
    const jobs = await this.prisma.job.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, companyId: true },
    });

    for (const job of jobs) {
      await this.enqueueJobEmbedding(job.id, job.companyId);
    }

    return { enqueued: jobs.length };
  }

  /** Embedding row for a company-scoped job, or null. */
  async getStatus(jobId: string, companyId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: {
        id: true,
        embedding: {
          select: {
            id: true,
            status: true,
            model: true,
            qdrantPointId: true,
            updatedAt: true,
          },
        },
      },
    });
    return job?.embedding ?? null;
  }
}

@Processor(JOB_EMBEDDINGS_QUEUE)
export class JobEmbeddingsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
  ) {
    super();
  }

  /** Worker: embed published job fields into Qdrant (rich text via buildJobEmbeddingText). */
  async process(job: BullJob<JobEmbeddingJobData>): Promise<void> {
    const { jobId, companyId } = job.data;

    await this.prisma.jobEmbedding.updateMany({
      where: { jobId },
      data: { status: "PROCESSING" },
    });

    try {
      const record = await this.prisma.job.findFirst({
        where: { id: jobId, companyId },
        select: {
          id: true,
          title: true,
          location: true,
          workMode: true,
          description: true,
          requirements: true,
          responsibilities: true,
          industryId: true,
          jobRoleId: true,
          status: true,
          skills: { select: { name: true, required: true } },
          jobRole: { select: { name: true } },
          industry: { select: { name: true } },
        },
      });
      if (!record) {
        throw new Error(`Job ${jobId} not found`);
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }

      const input = buildJobEmbeddingText(record);
      if (!input.trim()) {
        throw new Error("Job has no embeddable text fields");
      }

      const openai = new OpenAI({ apiKey });
      const embeddingRes = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input,
      });
      const vector = embeddingRes.data[0]?.embedding;
      if (!vector?.length) {
        throw new Error("Empty embedding from OpenAI");
      }

      const existing = await this.prisma.jobEmbedding.findUnique({
        where: { jobId },
      });
      const pointId = existing?.qdrantPointId || randomUUID();

      await this.qdrant.upsertJobPoint({
        pointId,
        vector,
        jobId,
        companyId,
        industryId: record.industryId,
        jobRoleId: record.jobRoleId,
        status: record.status,
      });

      await this.prisma.jobEmbedding.upsert({
        where: { jobId },
        create: {
          jobId,
          qdrantPointId: pointId,
          model: EMBEDDING_MODEL,
          status: "READY",
        },
        update: {
          qdrantPointId: pointId,
          model: EMBEDDING_MODEL,
          status: "READY",
        },
      });
    } catch (err) {
      console.error(`Job embedding failed for ${jobId}:`, err);
      await this.prisma.jobEmbedding.updateMany({
        where: { jobId },
        data: { status: "FAILED" },
      });
      throw err;
    }
  }
}

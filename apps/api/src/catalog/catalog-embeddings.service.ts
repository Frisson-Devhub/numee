import { Injectable } from "@nestjs/common";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job as BullJob } from "bullmq";
import { Queue } from "bullmq";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import { CATALOG_EMBEDDINGS_QUEUE } from "../queue/queue.module";
import { QdrantService } from "../qdrant/qdrant.module";
import { EMBEDDING_MODEL } from "../recruiter/embeddings/embeddings.service";

export type CatalogEmbeddingKind = "industry" | "job_role";

export type CatalogEmbeddingJobData = {
  kind: CatalogEmbeddingKind;
  id: string;
};

/** Compact industry embedding input (name + description). */
function buildIndustryText(row: {
  name: string;
  description: string | null;
}): string {
  return [
    `Industry: ${row.name}`,
    row.description ? `Description: ${row.description}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Compact job-role embedding input (name, industry, description). */
function buildJobRoleText(row: {
  name: string;
  description: string | null;
  industry: { name: string } | null;
}): string {
  return [
    `Job role: ${row.name}`,
    row.industry ? `Industry: ${row.industry.name}` : null,
    row.description ? `Description: ${row.description}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

@Injectable()
export class CatalogEmbeddingsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CATALOG_EMBEDDINGS_QUEUE) private readonly queue: Queue,
  ) {}

  /** Mark industry embedding PENDING and enqueue catalog worker job. */
  async enqueueIndustryEmbedding(id: string): Promise<void> {
    await this.prisma.industry.update({
      where: { id },
      data: { embeddingStatus: "PENDING" },
    });
    await this.enqueue({ kind: "industry", id });
  }

  /** Mark job-role embedding PENDING and enqueue catalog worker job. */
  async enqueueJobRoleEmbedding(id: string): Promise<void> {
    await this.prisma.jobRole.update({
      where: { id },
      data: { embeddingStatus: "PENDING" },
    });
    await this.enqueue({ kind: "job_role", id });
  }

  private async enqueue(data: CatalogEmbeddingJobData): Promise<void> {
    try {
      await Promise.race([
        this.queue.add("embed-catalog", data, {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Timed out enqueueing catalog embedding")),
            5000,
          ),
        ),
      ]);
    } catch (err) {
      console.error(
        `Failed to enqueue catalog embedding ${data.kind}:${data.id}:`,
        err,
      );
      if (data.kind === "industry") {
        await this.prisma.industry.updateMany({
          where: { id: data.id },
          data: { embeddingStatus: "FAILED" },
        });
      } else {
        await this.prisma.jobRole.updateMany({
          where: { id: data.id },
          data: { embeddingStatus: "FAILED" },
        });
      }
    }
  }
}

@Processor(CATALOG_EMBEDDINGS_QUEUE)
export class CatalogEmbeddingsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
  ) {
    super();
  }

  /** Worker: embed one industry or job role into Qdrant. */
  async process(job: BullJob<CatalogEmbeddingJobData>): Promise<void> {
    const { kind, id } = job.data;

    if (kind === "industry") {
      await this.embedIndustry(id);
    } else {
      await this.embedJobRole(id);
    }
  }

  private async embedIndustry(id: string): Promise<void> {
    await this.prisma.industry.updateMany({
      where: { id },
      data: { embeddingStatus: "PROCESSING" },
    });

    try {
      const row = await this.prisma.industry.findUnique({ where: { id } });
      if (!row) throw new Error(`Industry ${id} not found`);

      const vector = await this.createEmbedding(buildIndustryText(row));
      const pointId = row.qdrantPointId || randomUUID();

      await this.qdrant.upsertIndustryPoint({
        pointId,
        vector,
        industryId: row.id,
        slug: row.slug,
        name: row.name,
      });

      await this.prisma.industry.update({
        where: { id },
        data: {
          qdrantPointId: pointId,
          embeddingStatus: "READY",
        },
      });
    } catch (err) {
      console.error(`Industry embedding failed for ${id}:`, err);
      await this.prisma.industry.updateMany({
        where: { id },
        data: { embeddingStatus: "FAILED" },
      });
      throw err;
    }
  }

  private async embedJobRole(id: string): Promise<void> {
    await this.prisma.jobRole.updateMany({
      where: { id },
      data: { embeddingStatus: "PROCESSING" },
    });

    try {
      const row = await this.prisma.jobRole.findUnique({
        where: { id },
        include: { industry: { select: { name: true } } },
      });
      if (!row) throw new Error(`JobRole ${id} not found`);

      const vector = await this.createEmbedding(buildJobRoleText(row));
      const pointId = row.qdrantPointId || randomUUID();

      await this.qdrant.upsertJobRolePoint({
        pointId,
        vector,
        jobRoleId: row.id,
        slug: row.slug,
        name: row.name,
        industryId: row.industryId,
      });

      await this.prisma.jobRole.update({
        where: { id },
        data: {
          qdrantPointId: pointId,
          embeddingStatus: "READY",
        },
      });
    } catch (err) {
      console.error(`JobRole embedding failed for ${id}:`, err);
      await this.prisma.jobRole.updateMany({
        where: { id },
        data: { embeddingStatus: "FAILED" },
      });
      throw err;
    }
  }

  private async createEmbedding(input: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
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
    return vector;
  }
}

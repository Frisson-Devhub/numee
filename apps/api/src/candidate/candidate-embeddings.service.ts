import { HttpException, Injectable } from "@nestjs/common";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job as BullJob } from "bullmq";
import { Queue } from "bullmq";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import { CANDIDATE_EMBEDDINGS_QUEUE } from "../queue/queue.module";
import {
  QDRANT_CANDIDATES_COLLECTION,
  QdrantService,
} from "../qdrant/qdrant.module";
import { EMBEDDING_MODEL } from "../recruiter/embeddings/embeddings.service";

/** BullMQ payload for candidate embedding jobs. */
export type CandidateEmbeddingJobData = {
  userId: string;
};

const EMBED_TIMEOUT_MS = 20_000;

type AssessmentLike = {
  assessmentId: string;
  assessmentQuestionAnswers: unknown;
  assessmentData: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractDashboardPayload(
  assessmentData: unknown,
): Record<string, unknown> | null {
  const entry = asRecord(assessmentData);
  if (!entry) return null;
  const inner = asRecord(entry.data);
  return inner ?? entry;
}

function uniqueNonEmpty(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Compact embedding input aligned with job vectors:
 * skills (competencies), job roles, and location — not full assessment Q&A.
 */
export function buildCandidateEmbeddingText(params: {
  assessments: AssessmentLike[];
  location?: string | null;
}): string {
  const skills: string[] = [];
  const roles: string[] = [];
  let location = params.location?.trim() || "";

  for (const a of params.assessments) {
    const payload = extractDashboardPayload(a.assessmentData);
    if (!payload) continue;

    const ur = asRecord(payload.user_report);
    const jr = asRecord(payload.jobs_report);

    const competencies =
      (Array.isArray(ur?.main_competencies) && ur.main_competencies) ||
      (Array.isArray(payload.main_competencies)
        ? (payload.main_competencies as Array<{ competency?: string }>).map(
            (c) => c.competency,
          )
        : null);
    if (Array.isArray(competencies)) {
      for (const c of competencies) {
        if (typeof c === "string" && c.trim()) skills.push(c);
        else {
          const row = asRecord(c);
          if (typeof row?.competency === "string") skills.push(row.competency);
        }
      }
    }

    const recommended =
      (Array.isArray(jr?.recommended_roles) && jr.recommended_roles) ||
      (Array.isArray(ur?.recommended_jobs) && ur.recommended_jobs) ||
      null;
    if (Array.isArray(recommended)) {
      for (const r of recommended) {
        const row = asRecord(r);
        if (typeof row?.job_role === "string" && row.job_role.trim()) {
          roles.push(row.job_role);
        }
      }
    }

    if (!location) {
      const loc =
        (typeof payload.location === "string" && payload.location) ||
        (typeof ur?.location === "string" && ur.location) ||
        (typeof jr?.location === "string" && jr.location) ||
        null;
      if (loc?.trim()) location = loc.trim();
    }
  }

  // Fallback: skim Q&A for short skill-like user answers when report is sparse
  if (!skills.length && !roles.length) {
    for (const a of params.assessments) {
      const pairs = Array.isArray(a.assessmentQuestionAnswers)
        ? (a.assessmentQuestionAnswers as Array<{
            user?: string;
            assistant?: string;
          }>)
        : [];
      for (const p of pairs) {
        const answer = typeof p.user === "string" ? p.user.trim() : "";
        if (answer && answer.length <= 80) skills.push(answer);
      }
    }
  }

  const skillLine = uniqueNonEmpty(skills).join(", ");
  const roleLine = uniqueNonEmpty(roles).join(", ");

  return [
    skillLine ? `Skills: ${skillLine}` : null,
    roleLine ? `Job role: ${roleLine}` : null,
    location ? `Location: ${location}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

@Injectable()
export class CandidateEmbeddingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
    @InjectQueue(CANDIDATE_EMBEDDINGS_QUEUE) private readonly queue: Queue,
  ) {}

  /** Mark PENDING and enqueue BullMQ job (fail-soft if Redis is down). */
  async enqueueCandidateEmbedding(userId: string): Promise<void> {
    await this.prisma.candidateEmbedding.upsert({
      where: { userId },
      create: {
        userId,
        status: "PENDING",
        model: EMBEDDING_MODEL,
      },
      update: {
        status: "PENDING",
        model: EMBEDDING_MODEL,
      },
    });

    try {
      await Promise.race([
        this.queue.add(
          "embed-candidate",
          { userId } satisfies CandidateEmbeddingJobData,
          {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          },
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Timed out enqueueing candidate embedding")),
            5000,
          ),
        ),
      ]);
    } catch (err) {
      console.error(`Failed to enqueue embedding for candidate ${userId}:`, err);
      await this.prisma.candidateEmbedding.updateMany({
        where: { userId },
        data: { status: "FAILED" },
      });
    }
  }

  /**
   * Ensure a candidate vector exists in Qdrant and return it for search.
   * Sync-embeds when missing/stale so first search does not wait on the queue.
   */
  async ensureCandidateVector(userId: string): Promise<number[]> {
    const existing = await this.prisma.candidateEmbedding.findUnique({
      where: { userId },
    });

    if (existing?.status === "READY" && existing.qdrantPointId) {
      try {
        const retrieved = await this.withTimeout(
          this.qdrant.retrieveVector(
            QDRANT_CANDIDATES_COLLECTION,
            existing.qdrantPointId,
          ),
          "Timed out loading candidate vector (is Qdrant running?)",
        );
        if (retrieved?.vector?.length) return retrieved.vector;
      } catch (err) {
        if (err instanceof HttpException) throw err;
        console.warn(
          `Candidate vector retrieve failed for ${userId}, re-embedding:`,
          (err as Error).message,
        );
      }
    }

    return this.embedCandidateNow(userId);
  }

  /** Synchronously rebuild candidate text → OpenAI embedding → Qdrant + DB. */
  async embedCandidateNow(userId: string): Promise<number[]> {
    await this.prisma.candidateEmbedding.upsert({
      where: { userId },
      create: {
        userId,
        status: "PROCESSING",
        model: EMBEDDING_MODEL,
      },
      update: {
        status: "PROCESSING",
        model: EMBEDDING_MODEL,
      },
    });

    try {
      const vector = await this.withTimeout(
        this.computeAndUpsert(userId),
        "Timed out creating candidate embedding (check OpenAI/Qdrant)",
      );
      return vector;
    } catch (err) {
      await this.prisma.candidateEmbedding.updateMany({
        where: { userId },
        data: { status: "FAILED" },
      });
      if (err instanceof HttpException) throw err;
      console.error(`Candidate embedding failed for ${userId}:`, err);
      throw new HttpException(
        {
          error:
            (err as Error).message ||
            "Failed to create candidate embedding (check Redis/Qdrant/OpenAI)",
        },
        503,
      );
    }
  }

  private async computeAndUpsert(userId: string): Promise<number[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        resumeUrl: true,
        linkedInUrl: true,
        assessments: {
          select: {
            assessmentId: true,
            assessmentQuestionAnswers: true,
            assessmentData: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!user) {
      throw new HttpException({ error: "User not found" }, 404);
    }

    const hasAssessmentSignal = user.assessments.some(
      (a) =>
        (Array.isArray(a.assessmentQuestionAnswers) &&
          a.assessmentQuestionAnswers.length > 0) ||
        a.assessmentData != null,
    );
    if (!hasAssessmentSignal && !user.resumeUrl && !user.linkedInUrl) {
      throw new HttpException(
        {
          error:
            "Complete your assessment or add a resume/LinkedIn before matching jobs",
        },
        400,
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new HttpException(
        { error: "OPENAI_API_KEY is not configured" },
        503,
      );
    }

    const input = buildCandidateEmbeddingText({
      assessments: user.assessments,
    });
    if (!input.trim()) {
      throw new HttpException(
        {
          error:
            "Assessment has no skills or roles to match yet. Complete your assessment and try again.",
        },
        400,
      );
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

    const existing = await this.prisma.candidateEmbedding.findUnique({
      where: { userId },
    });
    const pointId = existing?.qdrantPointId || randomUUID();

    await this.qdrant.upsertCandidatePoint({
      pointId,
      vector,
      userId,
    });

    await this.prisma.candidateEmbedding.upsert({
      where: { userId },
      create: {
        userId,
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

    return vector;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    message: string,
  ): Promise<T> {
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(message)), EMBED_TIMEOUT_MS),
        ),
      ]);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { error: (err as Error).message || message },
        503,
      );
    }
  }
}

@Processor(CANDIDATE_EMBEDDINGS_QUEUE)
export class CandidateEmbeddingsProcessor extends WorkerHost {
  constructor(private readonly embeddings: CandidateEmbeddingsService) {
    super();
  }

  /** Worker entry: embed one candidate by userId. */
  async process(job: BullJob<CandidateEmbeddingJobData>): Promise<void> {
    try {
      await this.embeddings.embedCandidateNow(job.data.userId);
    } catch (err) {
      // Don't retry client errors (e.g. missing assessment/resume).
      if (err instanceof HttpException && err.getStatus() < 500) return;
      throw err;
    }
  }
}

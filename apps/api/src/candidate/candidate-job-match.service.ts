import { HttpException, Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import {
  QDRANT_JOBS_COLLECTION,
  QdrantService,
} from "../qdrant/qdrant.module";
import { EMBEDDING_MODEL } from "../recruiter/embeddings/embeddings.service";
import { CandidateEmbeddingsService } from "./candidate-embeddings.service";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const SEARCH_TIMEOUT_MS = 8_000;
const BROWSE_DEFAULT_LIMIT = 20;
const BROWSE_MAX_LIMIT = 50;

export type CandidateJobMatchResult = {
  jobId: string;
  score: number;
  title: string;
  companyId: string;
  companyName: string;
  industryId: string | null;
  industryName: string | null;
  jobRoleId: string | null;
  jobRoleName: string | null;
  location: string | null;
  workMode: string | null;
  snippet: string | null;
  status: string;
};

@Injectable()
export class CandidateJobMatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
    private readonly candidateEmbeddings: CandidateEmbeddingsService,
  ) {}

  /**
   * Assessment → JD vector match:
   * 1) Create/load candidate embedding from assessment (skills, roles, location)
   * 2) Vector-search published job embeddings
   * 3) Hydrate and return ranked job suggestions
   * Optional `query` embeds as an extra keyword signal for this search only.
   */
  async matchJobsForCandidate(
    userId: string,
    query?: string,
    limit = DEFAULT_LIMIT,
  ): Promise<{
    matches: CandidateJobMatchResult[];
    embeddingStatus: string;
  }> {
    const topN = Math.min(Math.max(1, limit || DEFAULT_LIMIT), MAX_LIMIT);

    const candidateVector = await this.candidateEmbeddings.ensureCandidateVector(
      userId,
    );

    const q = query?.trim() || "";
    let searchVector = candidateVector;
    if (q) {
      // Blend optional keywords into a one-off query vector for this match.
      searchVector = await this.withTimeout(
        this.embedQuery(`Skills: ${q}\nJob role: ${q}`),
        "Timed out creating query embedding (check OPENAI_API_KEY / network)",
      );
      // Average with assessment vector so results stay profile-grounded.
      searchVector = averageVectors(candidateVector, searchVector);
    }

    const jobHits = await this.withTimeout(
      this.qdrant.search(QDRANT_JOBS_COLLECTION, searchVector, topN * 5),
      "Timed out searching job vectors (is Qdrant running?)",
    );

    const published = jobHits.filter((h) => {
      const status = h.payload.status;
      return status === undefined || status === null || status === "PUBLISHED";
    });

    const scored = published.slice(0, topN * 2);
    const matches = await this.hydrateMatches(scored, topN);
    const embedding = await this.prisma.candidateEmbedding.findUnique({
      where: { userId },
      select: { status: true },
    });

    return {
      matches,
      embeddingStatus: embedding?.status ?? "READY",
    };
  }

  /** Active industries for candidate browse filters. */
  async listActiveIndustries(): Promise<
    Array<{ id: string; name: string; slug: string }>
  > {
    return this.prisma.industry.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
  }

  /** Browse published jobs with optional industry filter and pagination. */
  async listPublishedJobs(params: {
    industryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    jobs: Array<{
      jobId: string;
      title: string;
      companyId: string;
      companyName: string;
      industryId: string | null;
      industryName: string | null;
      jobRoleId: string | null;
      jobRoleName: string | null;
      location: string | null;
      workMode: string | null;
      snippet: string | null;
      status: string;
    }>;
    total: number;
  }> {
    const take = Math.min(
      Math.max(1, params.limit || BROWSE_DEFAULT_LIMIT),
      BROWSE_MAX_LIMIT,
    );
    const skip = Math.max(0, params.offset || 0);
    const where = {
      status: "PUBLISHED" as const,
      ...(params.industryId?.trim()
        ? { industryId: params.industryId.trim() }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          title: true,
          companyId: true,
          industryId: true,
          jobRoleId: true,
          location: true,
          workMode: true,
          description: true,
          requirements: true,
          status: true,
          company: { select: { name: true } },
          industry: { select: { name: true } },
          jobRole: { select: { name: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      total,
      jobs: rows.map((row) => ({
        jobId: row.id,
        title: row.title,
        companyId: row.companyId,
        companyName: row.company.name,
        industryId: row.industryId,
        industryName: row.industry?.name ?? null,
        jobRoleId: row.jobRoleId,
        jobRoleName: row.jobRole?.name ?? null,
        location: row.location,
        workMode: row.workMode,
        snippet: makeSnippet(row.description || row.requirements),
        status: row.status,
      })),
    };
  }

  private async hydrateMatches(
    scored: Array<{ score: number; payload: Record<string, unknown> }>,
    topN: number,
  ): Promise<CandidateJobMatchResult[]> {
    const jobIds = uniqueStrings(
      scored.map((h) => String(h.payload.jobId ?? "")),
    );
    const jobs = jobIds.length
      ? await this.prisma.job.findMany({
          where: { id: { in: jobIds }, status: "PUBLISHED" },
          select: {
            id: true,
            title: true,
            companyId: true,
            industryId: true,
            jobRoleId: true,
            location: true,
            workMode: true,
            description: true,
            requirements: true,
            status: true,
            company: { select: { name: true } },
            industry: { select: { name: true } },
            jobRole: { select: { name: true } },
          },
        })
      : [];
    const byId = new Map(jobs.map((j) => [j.id, j]));

    const matches: CandidateJobMatchResult[] = [];
    for (const hit of scored) {
      const jobId = String(hit.payload.jobId ?? "");
      const row = byId.get(jobId);
      if (!row) continue;
      matches.push({
        jobId: row.id,
        score: hit.score,
        title: row.title,
        companyId: row.companyId,
        companyName: row.company.name,
        industryId: row.industryId,
        industryName: row.industry?.name ?? null,
        jobRoleId: row.jobRoleId,
        jobRoleName: row.jobRole?.name ?? null,
        location: row.location,
        workMode: row.workMode,
        snippet: makeSnippet(row.description || row.requirements),
        status: row.status,
      });
      if (matches.length >= topN) break;
    }
    return matches;
  }

  private async embedQuery(query: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new HttpException(
        { error: "OPENAI_API_KEY is not configured" },
        503,
      );
    }
    try {
      const openai = new OpenAI({ apiKey });
      const res = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: query,
      });
      const vector = res.data[0]?.embedding;
      if (!vector?.length) {
        throw new Error("Empty embedding from OpenAI");
      }
      return vector;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error("Query embedding failed:", err);
      throw new HttpException(
        { error: "Failed to embed query (check OPENAI_API_KEY)" },
        503,
      );
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    message: string,
  ): Promise<T> {
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(message)), SEARCH_TIMEOUT_MS),
        ),
      ]);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error(message, err);
      throw new HttpException(
        { error: (err as Error).message || message },
        503,
      );
    }
  }
}

function averageVectors(a: number[], b: number[]): number[] {
  const n = Math.min(a.length, b.length);
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = (a[i]! + b[i]!) / 2;
  return out;
}

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

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

function makeSnippet(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const plain = stripHtml(text);
  if (!plain) return null;
  return plain.length > 180 ? `${plain.slice(0, 177)}…` : plain;
}

import { HttpException, Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import {
  QDRANT_INDUSTRIES_COLLECTION,
  QDRANT_JOB_ROLES_COLLECTION,
  QDRANT_JOBS_COLLECTION,
  QdrantService,
} from "../qdrant/qdrant.module";
import { EMBEDDING_MODEL } from "../recruiter/embeddings/embeddings.service";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10;
const CATALOG_TOP_K = 8;
const SEARCH_TIMEOUT_MS = 8_000;

export type JobMatchResult = {
  jobId: string;
  score: number;
  title: string;
  companyId: string;
  industryId: string | null;
  jobRoleId: string | null;
  status: string;
};

@Injectable()
export class CatalogMatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
  ) {}

  /**
   * Catalog-first → top-10 published jobs:
   * 1) Embed query
   * 2) Search industries + job_roles for relevant catalog IDs
   * 3) Vector-search jobs (no Qdrant payload filters — Cloud requires indexes)
   * 4) Prefer catalog-matched hits, then hydrate PUBLISHED rows from Postgres
   */
  async matchJobs(
    query: string,
    limit = DEFAULT_LIMIT,
  ): Promise<{
    matches: JobMatchResult[];
    catalog: {
      industryIds: string[];
      jobRoleIds: string[];
    };
  }> {
    const q = query?.trim();
    if (!q) {
      throw new HttpException({ error: "query is required" }, 400);
    }
    const topN = Math.min(Math.max(1, limit || DEFAULT_LIMIT), MAX_LIMIT);

    const vector = await this.withTimeout(
      this.embedQuery(q),
      "Timed out creating query embedding (check OPENAI_API_KEY / network)",
    );

    const [industryHits, roleHits] = await this.withTimeout(
      Promise.all([
        this.qdrant.search(
          QDRANT_INDUSTRIES_COLLECTION,
          vector,
          CATALOG_TOP_K,
        ),
        this.qdrant.search(QDRANT_JOB_ROLES_COLLECTION, vector, CATALOG_TOP_K),
      ]),
      "Timed out searching catalog vectors (is Qdrant running?)",
    );

    const industryIds = uniqueStrings(
      industryHits.map((h) => String(h.payload.industryId ?? "")),
    );
    const jobRoleIds = uniqueStrings(
      roleHits.map((h) => String(h.payload.jobRoleId ?? "")),
    );

    // Also include industries linked from matched job roles
    if (jobRoleIds.length) {
      const roles = await this.prisma.jobRole.findMany({
        where: { id: { in: jobRoleIds }, isActive: true },
        select: { industryId: true },
      });
      for (const r of roles) {
        if (r.industryId && !industryIds.includes(r.industryId)) {
          industryIds.push(r.industryId);
        }
      }
    }

    const industrySet = new Set(industryIds);
    const roleSet = new Set(jobRoleIds);
    const hasCatalog = industrySet.size > 0 || roleSet.size > 0;

    const jobHits = await this.withTimeout(
      this.qdrant.search(QDRANT_JOBS_COLLECTION, vector, topN * 10),
      "Timed out searching job vectors (is Qdrant running?)",
    );

    // Prefer published points; payload may omit status on older points.
    // Catalog preference is applied in-app (no Qdrant payload indexes).
    const published = jobHits.filter((h) => {
      const status = h.payload.status;
      return status === undefined || status === null || status === "PUBLISHED";
    });

    const catalogMatched = hasCatalog
      ? published.filter((h) => {
          const industryId = String(h.payload.industryId ?? "");
          const jobRoleId = String(h.payload.jobRoleId ?? "");
          return (
            (industryId && industrySet.has(industryId)) ||
            (jobRoleId && roleSet.has(jobRoleId))
          );
        })
      : [];

    const scored = (catalogMatched.length ? catalogMatched : published).slice(
      0,
      topN,
    );

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
            status: true,
          },
        })
      : [];
    const byId = new Map(jobs.map((j) => [j.id, j]));

    const matches: JobMatchResult[] = [];
    for (const hit of scored) {
      const jobId = String(hit.payload.jobId ?? "");
      const row = byId.get(jobId);
      if (!row) continue;
      matches.push({
        jobId: row.id,
        score: hit.score,
        title: row.title,
        companyId: row.companyId,
        industryId: row.industryId,
        jobRoleId: row.jobRoleId,
        status: row.status,
      });
      if (matches.length >= topN) break;
    }

    return {
      matches,
      catalog: { industryIds, jobRoleIds },
    };
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

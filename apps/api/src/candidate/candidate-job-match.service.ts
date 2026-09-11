import { HttpException, Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import {
  QDRANT_JOBS_COLLECTION,
  QdrantService,
} from "../qdrant/qdrant.module";
import { EMBEDDING_MODEL } from "../recruiter/embeddings/embeddings.service";
import { CandidateEmbeddingsService } from "./candidate-embeddings.service";
import {
  buildCompactAssessment,
  CandidateJobScoreService,
  extractCompactPreferences,
  MATCH_SCORE_TOP_K,
  type CandidateJobLayerScore,
  type CompactJobForScore,
} from "./candidate-job-score.service";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const SEARCH_TIMEOUT_MS = 8_000;
const BROWSE_DEFAULT_LIMIT = 20;
const BROWSE_MAX_LIMIT = 50;

export type CandidateJobMatchResult = {
  jobId: string;
  /** LLM final_score (0–100), or cosine mapped to 0–100 on fail-soft. */
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
  matchLevel?: string;
  semanticScore?: number;
  assessmentScore?: number;
  preferenceScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
  strengths?: string[];
  concerns?: string[];
  summary?: string;
  recommendation?: string;
};

type JobRowForMatch = {
  id: string;
  title: string;
  companyId: string;
  industryId: string | null;
  jobRoleId: string | null;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  noticePeriod: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string | null;
  requirements: string | null;
  status: string;
  company: { name: string };
  industry: { name: string } | null;
  jobRole: { name: string } | null;
  skills: Array<{ name: string; required: boolean }>;
};

const JOB_MATCH_SELECT = {
  id: true,
  title: true,
  companyId: true,
  industryId: true,
  jobRoleId: true,
  location: true,
  workMode: true,
  employmentType: true,
  noticePeriod: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  description: true,
  requirements: true,
  status: true,
  company: { select: { name: true } },
  industry: { select: { name: true } },
  jobRole: { select: { name: true } },
  skills: {
    select: { name: true, required: true },
    orderBy: { name: "asc" as const },
  },
};

@Injectable()
export class CandidateJobMatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
    private readonly candidateEmbeddings: CandidateEmbeddingsService,
    private readonly jobScore: CandidateJobScoreService,
  ) {}

  /**
   * Assessment → JD recall → batched 3-layer LLM rerank (top K).
   * Prefers Qdrant vector search; if Qdrant is unreachable (Cloud 404, local
   * down), shortlists published jobs from Postgres by assessment overlap.
   * On LLM failure, fail soft with similarity mapped to 0–100.
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
    const scoreK = Math.min(topN, MATCH_SCORE_TOP_K);

    await this.candidateEmbeddings.assertHasAssessment(userId);

    let orderedJobs: Array<{ row: JobRowForMatch; cosine: number }> = [];
    const qdrantReady = await this.qdrant.tryReady();
    if (qdrantReady) {
      try {
        orderedJobs = await this.vectorShortlist(userId, query, scoreK);
      } catch (err) {
        if (err instanceof HttpException && err.getStatus() < 500) {
          throw err;
        }
        console.warn(
          "Qdrant job search failed; scoring published jobs from the database:",
          err instanceof HttpException ? err.message : (err as Error).message,
        );
      }
    }

    if (!orderedJobs.length) {
      orderedJobs = await this.fallbackPublishedShortlist(
        userId,
        query,
        scoreK,
      );
    }

    const embedding = await this.prisma.candidateEmbedding.findUnique({
      where: { userId },
      select: { status: true },
    });
    const embeddingStatus = embedding?.status ?? "READY";

    if (!orderedJobs.length) {
      return { matches: [], embeddingStatus };
    }

    let matches: CandidateJobMatchResult[];
    try {
      matches = await this.scoreAndHydrate(userId, orderedJobs);
    } catch (err) {
      console.error("Candidate job LLM scoring failed; using vector ranks:", err);
      matches = orderedJobs.map(({ row, cosine }) =>
        hydrateFromRow(row, {
          score: cosineToPercent(cosine),
        }),
      );
    }

    return { matches, embeddingStatus };
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

  /**
   * Qdrant recall: candidate (and optional keyword) vector → published jobs.
   */
  private async vectorShortlist(
    userId: string,
    query: string | undefined,
    scoreK: number,
  ): Promise<Array<{ row: JobRowForMatch; cosine: number }>> {
    const candidateVector =
      await this.candidateEmbeddings.ensureCandidateVector(userId);

    const q = query?.trim() || "";
    let searchVector = candidateVector;
    if (q) {
      searchVector = await this.withTimeout(
        this.embedQuery(`Skills: ${q}\nJob role: ${q}`),
        "Timed out creating query embedding (check OPENAI_API_KEY / network)",
      );
      searchVector = averageVectors(candidateVector, searchVector);
    }

    const jobHits = await this.withTimeout(
      this.qdrant.search(QDRANT_JOBS_COLLECTION, searchVector, scoreK * 5),
      "Timed out searching job vectors (is Qdrant running?)",
    );

    const shortlist = jobHits.filter((h) => {
      const status = h.payload.status;
      return status === undefined || status === null || status === "PUBLISHED";
    });
    const jobIds = uniqueStrings(
      shortlist.map((h) => String(h.payload.jobId ?? "")),
    );
    const jobs = jobIds.length
      ? await this.prisma.job.findMany({
          where: { id: { in: jobIds }, status: "PUBLISHED" },
          select: JOB_MATCH_SELECT,
        })
      : [];
    const byId = new Map(jobs.map((j) => [j.id, j]));

    const orderedJobs: Array<{ row: JobRowForMatch; cosine: number }> = [];
    for (const hit of shortlist) {
      const jobId = String(hit.payload.jobId ?? "");
      const row = byId.get(jobId);
      if (!row) continue;
      orderedJobs.push({ row, cosine: hit.score });
      if (orderedJobs.length >= scoreK) break;
    }
    return orderedJobs;
  }

  /**
   * When Qdrant Cloud/local is down, shortlist published jobs by assessment
   * overlap (and optional keywords) so Find AI Match still returns scores.
   */
  private async fallbackPublishedShortlist(
    userId: string,
    query: string | undefined,
    scoreK: number,
  ): Promise<Array<{ row: JobRowForMatch; cosine: number }>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        assessments: {
          select: {
            assessmentQuestionAnswers: true,
            assessmentData: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    const assessment = buildCompactAssessment(user?.assessments ?? []);
    const needles = [
      ...assessment.competencies,
      ...assessment.recommendedRoles,
      ...(query?.trim() ? [query.trim()] : []),
    ];

    const jobs = await this.prisma.job.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: Math.max(scoreK * 10, 40),
      select: JOB_MATCH_SELECT,
    });

    return jobs
      .map((row) => ({ row, cosine: lexicalOverlap(row, needles) }))
      .sort((a, b) => b.cosine - a.cosine)
      .slice(0, scoreK);
  }

  private async scoreAndHydrate(
    userId: string,
    orderedJobs: Array<{ row: JobRowForMatch; cosine: number }>,
  ): Promise<CandidateJobMatchResult[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        assessments: {
          select: {
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

    const assessment = buildCompactAssessment(user.assessments);
    const preferences = extractCompactPreferences(user.assessments);
    // Resume text is optional; we do not fetch/parse resumeUrl PDFs.
    const resumeText: string | null = null;

    const compactJobs: CompactJobForScore[] = orderedJobs.map(({ row }) => ({
      jobId: row.id,
      title: row.title,
      skills: row.skills,
      industryName: row.industry?.name ?? null,
      jobRoleName: row.jobRole?.name ?? null,
      location: row.location,
      workMode: row.workMode,
      employmentType: row.employmentType,
      salaryMin: row.salaryMin,
      salaryMax: row.salaryMax,
      salaryCurrency: row.salaryCurrency,
      noticePeriod: row.noticePeriod,
      description: row.description,
      requirements: row.requirements,
    }));

    const scores = await this.jobScore.scoreJobs({
      resumeText,
      assessment,
      preferences,
      jobs: compactJobs,
    });
    const scoreById = new Map(scores.map((s) => [s.jobId, s]));

    const ranked = [...orderedJobs].sort((a, b) => {
      const sa = scoreById.get(a.row.id)?.finalScore ?? -1;
      const sb = scoreById.get(b.row.id)?.finalScore ?? -1;
      return sb - sa;
    });

    return ranked.map(({ row }) => {
      const scored = scoreById.get(row.id);
      if (!scored) {
        return hydrateFromRow(row, { score: 0 });
      }
      return hydrateFromRow(row, scored);
    });
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

function hydrateFromRow(
  row: JobRowForMatch,
  scored:
    | CandidateJobLayerScore
    | { score: number },
): CandidateJobMatchResult {
  const base: CandidateJobMatchResult = {
    jobId: row.id,
    score: "finalScore" in scored ? scored.finalScore : scored.score,
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
  };

  if ("finalScore" in scored) {
    base.matchLevel = scored.matchLevel;
    base.semanticScore = scored.semanticScore;
    base.assessmentScore = scored.assessmentScore;
    base.preferenceScore = scored.preferenceScore;
    base.matchingSkills = scored.matchingSkills;
    base.missingSkills = scored.missingSkills;
    base.strengths = scored.strengths;
    base.concerns = scored.concerns;
    base.summary = scored.summary;
    base.recommendation = scored.recommendation;
  }

  return base;
}

/** Map Qdrant cosine similarity to a 0–100 percent for fail-soft ranking. */
function cosineToPercent(cosine: number): number {
  if (!Number.isFinite(cosine)) return 0;
  return Math.round(Math.min(1, Math.max(0, (cosine + 1) / 2)) * 100);
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

/** 0–1 overlap of assessment/query phrases against job title, role, and skills. */
function lexicalOverlap(row: JobRowForMatch, needles: string[]): number {
  const phrases = uniqueStrings(
    needles.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  if (!phrases.length) return 0.5;
  const hay = [
    row.title,
    row.jobRole?.name ?? "",
    row.industry?.name ?? "",
    ...row.skills.map((s) => s.name),
  ]
    .join(" \n ")
    .toLowerCase();
  let hits = 0;
  for (const phrase of phrases) {
    if (phrase.length >= 2 && hay.includes(phrase)) {
      hits++;
      continue;
    }
    const tokens = phrase.split(/[^a-z0-9+#.]+/i).filter((t) => t.length >= 3);
    if (tokens.length && tokens.every((t) => hay.includes(t))) hits++;
  }
  return hits / phrases.length;
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

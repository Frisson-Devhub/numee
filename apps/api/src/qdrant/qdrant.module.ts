import { Global, Injectable, Module, OnModuleInit } from "@nestjs/common";
import { QdrantClient } from "@qdrant/js-client-rest";

/** Qdrant collection for published job JD vectors. */
export const QDRANT_JOBS_COLLECTION = "jobs";
/** Qdrant collection for industry catalog vectors. */
export const QDRANT_INDUSTRIES_COLLECTION = "industries";
/** Qdrant collection for job-role catalog vectors. */
export const QDRANT_JOB_ROLES_COLLECTION = "job_roles";
/** Qdrant collection for candidate assessment vectors. */
export const QDRANT_CANDIDATES_COLLECTION = "candidates";
/** text-embedding-3-small vector width used by all collections. */
export const EMBEDDING_VECTOR_SIZE = 1536;

const CATALOG_COLLECTIONS = [
  QDRANT_JOBS_COLLECTION,
  QDRANT_INDUSTRIES_COLLECTION,
  QDRANT_JOB_ROLES_COLLECTION,
  QDRANT_CANDIDATES_COLLECTION,
] as const;

export type QdrantSearchHit = {
  id: string | number;
  score: number;
  payload: Record<string, unknown>;
};

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient | null = null;
  private ready = false;

  get url(): string {
    return (process.env.QDRANT_URL ?? "http://127.0.0.1:6333")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\/$/, "");
  }

  get apiKey(): string | undefined {
    const key = process.env.QDRANT_API_KEY?.trim().replace(/^["']|["']$/g, "");
    return key || undefined;
  }

  /** True when QDRANT_URL is set (Cloud or local). */
  isConfigured(): boolean {
    return Boolean(process.env.QDRANT_URL?.trim());
  }

  /** Lazy Qdrant client; disables strict version check for Cloud lag. */
  getClient(): QdrantClient {
    if (!this.client) {
      this.client = new QdrantClient({
        url: this.url,
        ...(this.apiKey ? { apiKey: this.apiKey } : {}),
        // Cloud clusters often lag the npm client minor version.
        checkCompatibility: false,
      });
    }
    return this.client;
  }

  /** Best-effort create collections at boot; embeddings retry if Qdrant is down. */
  async onModuleInit() {
    try {
      await this.ensureAllCollections();
      this.ready = true;
    } catch (err) {
      console.warn(
        "Qdrant unavailable at startup — embeddings will retry on use:",
        (err as Error).message,
      );
    }
  }

  /** Create a Cosine collection of EMBEDDING_VECTOR_SIZE if missing. */
  async ensureCollection(name: string): Promise<void> {
    const client = this.getClient();
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === name);
    if (!exists) {
      await client.createCollection(name, {
        vectors: {
          size: EMBEDDING_VECTOR_SIZE,
          distance: "Cosine",
        },
      });
    }
  }

  /** Ensure jobs/industries/job_roles/candidates collections exist. */
  async ensureAllCollections(): Promise<void> {
    for (const name of CATALOG_COLLECTIONS) {
      await this.ensureCollection(name);
    }
  }

  /** Alias for ensureCollection(jobs) used by job embedding path. */
  async ensureJobsCollection(): Promise<void> {
    await this.ensureCollection(QDRANT_JOBS_COLLECTION);
  }

  private async ensureReady(): Promise<void> {
    if (!this.ready) {
      await this.ensureAllCollections();
      this.ready = true;
    }
  }

  /**
   * True when collections can be listed/created. Used so match can fall back
   * to Postgres instead of 503 when Cloud/local Qdrant is unreachable.
   */
  async tryReady(): Promise<boolean> {
    try {
      await this.ensureReady();
      return true;
    } catch (err) {
      this.ready = false;
      console.warn(
        "Qdrant not reachable — vector search disabled:",
        (err as Error).message,
      );
      return false;
    }
  }

  /** Upsert a job vector + payload into the jobs collection. */
  async upsertJobPoint(params: {
    pointId: string;
    vector: number[];
    jobId: string;
    companyId: string;
    industryId?: string | null;
    jobRoleId?: string | null;
    status?: string;
  }): Promise<void> {
    await this.ensureReady();
    const client = this.getClient();
    await client.upsert(QDRANT_JOBS_COLLECTION, {
      wait: true,
      points: [
        {
          id: params.pointId,
          vector: params.vector,
          payload: {
            jobId: params.jobId,
            companyId: params.companyId,
            industryId: params.industryId ?? null,
            jobRoleId: params.jobRoleId ?? null,
            status: params.status ?? "PUBLISHED",
          },
        },
      ],
    });
  }

  /** Upsert an industry vector + payload. */
  async upsertIndustryPoint(params: {
    pointId: string;
    vector: number[];
    industryId: string;
    slug: string;
    name: string;
  }): Promise<void> {
    await this.ensureReady();
    const client = this.getClient();
    await client.upsert(QDRANT_INDUSTRIES_COLLECTION, {
      wait: true,
      points: [
        {
          id: params.pointId,
          vector: params.vector,
          payload: {
            industryId: params.industryId,
            slug: params.slug,
            name: params.name,
          },
        },
      ],
    });
  }

  /** Upsert a job-role vector + payload. */
  async upsertJobRolePoint(params: {
    pointId: string;
    vector: number[];
    jobRoleId: string;
    slug: string;
    name: string;
    industryId?: string | null;
  }): Promise<void> {
    await this.ensureReady();
    const client = this.getClient();
    await client.upsert(QDRANT_JOB_ROLES_COLLECTION, {
      wait: true,
      points: [
        {
          id: params.pointId,
          vector: params.vector,
          payload: {
            jobRoleId: params.jobRoleId,
            slug: params.slug,
            name: params.name,
            industryId: params.industryId ?? null,
          },
        },
      ],
    });
  }

  /** Upsert a candidate vector + payload. */
  async upsertCandidatePoint(params: {
    pointId: string;
    vector: number[];
    userId: string;
  }): Promise<void> {
    await this.ensureReady();
    const client = this.getClient();
    await client.upsert(QDRANT_CANDIDATES_COLLECTION, {
      wait: true,
      points: [
        {
          id: params.pointId,
          vector: params.vector,
          payload: {
            userId: params.userId,
          },
        },
      ],
    });
  }

  /**
   * Retrieve a point vector (and payload). Fail-fast for callers that race/timeout.
   */
  async retrieveVector(
    collection: string,
    pointId: string,
  ): Promise<{ vector: number[]; payload: Record<string, unknown> } | null> {
    await this.ensureReady();
    const client = this.getClient();
    const results = await client.retrieve(collection, {
      ids: [pointId],
      with_payload: true,
      with_vector: true,
    });
    const point = results[0];
    if (!point) return null;
    const raw = point.vector;
    const vector = Array.isArray(raw)
      ? (raw as number[])
      : raw && typeof raw === "object" && "default" in (raw as object)
        ? ((raw as { default: number[] }).default ?? [])
        : [];
    if (!vector.length) return null;
    return {
      vector,
      payload: (point.payload ?? {}) as Record<string, unknown>,
    };
  }

  /** Delete a point by id; no-op if the collection/point is missing. */
  async deletePoint(collection: string, pointId: string): Promise<void> {
    await this.ensureReady();
    const client = this.getClient();
    await client.delete(collection, {
      wait: true,
      points: [pointId],
    });
  }

  /**
   * Vector search (no payload filters — Qdrant Cloud requires payload indexes).
   * Callers apply status/catalog constraints in-app after retrieve.
   * Fail-fast — caller should race/timeout.
   * Uses Qdrant client `query` API (replaces deprecated `search` in js-client-rest 1.19+).
   */
  async search(
    collection: string,
    vector: number[],
    limit: number,
  ): Promise<QdrantSearchHit[]> {
    await this.ensureReady();
    const client = this.getClient();
    const results = await client.query(collection, {
      query: vector,
      limit,
      with_payload: true,
    });
    return (results.points ?? []).map((r) => ({
      id: r.id,
      score: r.score,
      payload: (r.payload ?? {}) as Record<string, unknown>,
    }));
  }
}

@Global()
@Module({
  providers: [QdrantService],
  exports: [QdrantService],
})
export class QdrantModule {}

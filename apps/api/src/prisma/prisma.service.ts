import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/** Typed Prisma client (includes CandidateEmbedding and catalog models). */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prefer DIRECT_DATABASE_URL when using a pooled host (e.g. Neon `-pooler`)
    // that cannot run Prisma interactive `$transaction`s.
    const connectionString =
      process.env.DIRECT_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgresql://localhost:5432/numee";
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL is not set — Prisma will fail on first query");
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

import { Global, Injectable, Module } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { OTP_EXPIRY_SECONDS } from "@numee/shared/server";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Postgres-backed staging for in-flight signups (candidate and recruiter).
 *
 * Signup is a two-step flow: details are staged here, and the `User` / `Company` rows
 * are only created once the OTP is verified — so an unverified signup leaves nothing
 * behind. This used to be an Upstash Redis REST store, which made an external network
 * hop a hard dependency of signup: when the Upstash host was unreachable the whole
 * endpoint 500'd. The data is small, short-lived and already transactional with the
 * rows it becomes, so it lives in the primary database instead.
 *
 * Expiry is carried by `expiresAt`, not by Redis TTL: reads treat an expired row as
 * missing and writes sweep expired rows, so nothing accumulates from abandoned signups.
 */
@Injectable()
export class PendingSignupService {
  constructor(private readonly prisma: PrismaService) {}

  /** Read a staged signup, treating an expired row as absent. */
  async get<T>(key: string): Promise<T | null> {
    const row = await this.prisma.pendingSignup.findUnique({ where: { key } });
    if (!row) return null;

    if (row.expiresAt.getTime() <= Date.now()) {
      await this.del(key);
      return null;
    }

    return row.payload as T;
  }

  /**
   * Stage a signup. `ex` sets a fresh TTL in seconds; `keepTtl` preserves the existing
   * expiry when updating a staged payload in place (matching the previous Redis usage).
   */
  async set(
    key: string,
    value: unknown,
    opts?: { ex?: number; keepTtl?: boolean },
  ): Promise<void> {
    await this.sweepExpired();

    const payload = value as Prisma.InputJsonValue;

    if (opts?.keepTtl) {
      const existing = await this.prisma.pendingSignup.findUnique({
        where: { key },
        select: { key: true },
      });
      if (existing) {
        await this.prisma.pendingSignup.update({ where: { key }, data: { payload } });
        return;
      }
    }

    const expiresAt = new Date(Date.now() + (opts?.ex ?? OTP_EXPIRY_SECONDS) * 1000);
    await this.prisma.pendingSignup.upsert({
      where: { key },
      create: { key, payload, expiresAt },
      update: { payload, expiresAt },
    });
  }

  /** Drop a staged signup (consumed, abandoned, or too many OTP attempts). */
  async del(key: string): Promise<void> {
    await this.prisma.pendingSignup.deleteMany({ where: { key } });
  }

  /** Best-effort cleanup so abandoned signups do not accumulate. */
  private async sweepExpired(): Promise<void> {
    try {
      await this.prisma.pendingSignup.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    } catch (error) {
      console.error("Failed to sweep expired pending signups:", error);
    }
  }
}

@Global()
@Module({
  providers: [PendingSignupService],
  exports: [PendingSignupService],
})
export class PendingSignupModule {}

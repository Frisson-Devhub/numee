import { Injectable } from "@nestjs/common";
import {
  DEFAULT_ASSESSMENT_ACTIVE_TTL_SECONDS,
  DEFAULT_ASSESSMENT_MAX_ACTIVE,
  DEFAULT_ASSESSMENT_WAITING_TTL_SECONDS,
  type AssessmentSlotStatus,
} from "@numee/shared/server";
import { PrismaService } from "../prisma/prisma.service";

const ACTIVE = "active";
const WAITING = "waiting";

/**
 * Postgres key for the admission advisory lock.
 *
 * Admission reads a count and then writes based on it, so two candidates claiming at
 * the same instant could both see `activeCount < maxActive` and both be admitted.
 * A transaction-scoped advisory lock serialises the read-decide-write, and is released
 * automatically when the transaction ends (including on error).
 */
const ADMISSION_LOCK_KEY = 8_314_027;

/** Read a positive integer from the environment, falling back to the shared default. */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    console.warn(`${name}="${raw}" is not a positive integer; using ${fallback}`);
    return fallback;
  }
  return parsed;
}

/**
 * Admission control for live assessments.
 *
 * A live assessment holds a LiveKit room and an agent worker for its whole duration, so
 * concurrency is bounded by the agent tier rather than by this API. Candidates past the
 * ceiling wait in line instead of being handed a session that will stutter.
 *
 * State lives in Postgres rather than Redis, matching `PendingSignupService`: expiry is
 * carried by an `expiresAt` column and swept on read, so an unreachable Redis can never
 * take the assessment down with it.
 *
 * One row per candidate, keyed by `userId`, which is what makes the whole thing
 * idempotent — a refresh or a reconnect re-reads the same row and can never produce a
 * second queue entry.
 */
@Injectable()
export class AssessmentQueueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Latched once the table turns out not to exist, so a pending migration costs one
   * failed query rather than one per request.
   */
  private tableMissing = false;

  /** False when the model was not generated, or the table has not been migrated. */
  isQueueAvailable(): boolean {
    if (this.tableMissing) return false;
    return (
      typeof (this.prisma as { assessmentSlot?: unknown }).assessmentSlot !== "undefined"
    );
  }

  /** P2021: the model exists on the client but `assessment_slots` was never created. */
  private isMissingTable(error: unknown): boolean {
    return (error as { code?: string } | null)?.code === "P2021";
  }

  /**
   * Claim a seat, or `null` when admission control itself is unavailable.
   *
   * Capacity limiting is a performance guard, not an access control. If the table is
   * missing because migrations have not run, letting candidates through unmetered is a
   * far better failure than locking every one of them out of their assessment — so this
   * fails open, loudly, rather than throwing.
   */
  async tryClaim(
    userId: string,
    assessmentId: string,
  ): Promise<AssessmentSlotStatus | null> {
    if (!this.isQueueAvailable()) return null;
    try {
      return await this.claim(userId, assessmentId);
    } catch (error) {
      if (this.isMissingTable(error)) {
        this.tableMissing = true;
        console.error(
          "assessment_slots table does not exist — run `pnpm db:migrate`. " +
            "Assessment capacity limiting is disabled until it does.",
        );
        return null;
      }
      throw error;
    }
  }

  maxActive(): number {
    return envInt("ASSESSMENT_MAX_ACTIVE", DEFAULT_ASSESSMENT_MAX_ACTIVE);
  }

  activeTtlSeconds(): number {
    return envInt(
      "ASSESSMENT_ACTIVE_TTL_SECONDS",
      DEFAULT_ASSESSMENT_ACTIVE_TTL_SECONDS,
    );
  }

  waitingTtlSeconds(): number {
    return envInt(
      "ASSESSMENT_WAITING_TTL_SECONDS",
      DEFAULT_ASSESSMENT_WAITING_TTL_SECONDS,
    );
  }

  private expiryFor(state: string): Date {
    const ttl = state === ACTIVE ? this.activeTtlSeconds() : this.waitingTtlSeconds();
    return new Date(Date.now() + ttl * 1000);
  }

  /**
   * Admit the candidate, or place/keep them in line, and return where they stand.
   *
   * Idempotent: calling it repeatedly (a refresh, a poll, a reconnect) renews the
   * existing row rather than creating another one. Safe to use as both "claim" and
   * "status" — the only difference is that a caller who is merely polling still has
   * its entry renewed, which is what stops an abandoned tab holding up the queue.
   */
  async claim(userId: string, assessmentId: string): Promise<AssessmentSlotStatus> {
    const maxActive = this.maxActive();

    return this.prisma.$transaction(async (tx) => {
      // Serialise admission against other claims; released with the transaction.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMISSION_LOCK_KEY})`;

      // Expired slots are freed lazily, on the next claim that needs the space.
      await tx.assessmentSlot.deleteMany({ where: { expiresAt: { lt: new Date() } } });

      const existing = await tx.assessmentSlot.findUnique({ where: { userId } });

      if (existing?.state === ACTIVE) {
        await tx.assessmentSlot.update({
          where: { userId },
          data: { expiresAt: this.expiryFor(ACTIVE), assessmentId },
        });
        return this.describe(tx, ACTIVE, null, maxActive);
      }

      const activeCount = await tx.assessmentSlot.count({ where: { state: ACTIVE } });
      const freeSlots = Math.max(maxActive - activeCount, 0);

      if (existing?.state === WAITING) {
        const ahead = await tx.assessmentSlot.count({
          where: { state: WAITING, enqueuedAt: { lt: existing.enqueuedAt } },
        });
        const position = ahead + 1;

        // Promote as many from the head of the line as there are free slots, so a burst
        // of departures drains without each candidate waiting for a separate poll.
        if (position <= freeSlots) {
          await tx.assessmentSlot.update({
            where: { userId },
            data: { state: ACTIVE, expiresAt: this.expiryFor(ACTIVE), assessmentId },
          });
          return this.describe(tx, ACTIVE, null, maxActive);
        }

        await tx.assessmentSlot.update({
          where: { userId },
          data: { expiresAt: this.expiryFor(WAITING), assessmentId },
        });
        return this.describe(tx, WAITING, position, maxActive);
      }

      const waitingCount = await tx.assessmentSlot.count({ where: { state: WAITING } });

      // A newcomer may only take a free slot when nobody is waiting; otherwise it would
      // jump the line in front of candidates who have already been holding.
      if (freeSlots > 0 && waitingCount === 0) {
        await tx.assessmentSlot.create({
          data: { userId, assessmentId, state: ACTIVE, expiresAt: this.expiryFor(ACTIVE) },
        });
        return this.describe(tx, ACTIVE, null, maxActive);
      }

      await tx.assessmentSlot.create({
        data: { userId, assessmentId, state: WAITING, expiresAt: this.expiryFor(WAITING) },
      });
      return this.describe(tx, WAITING, waitingCount + 1, maxActive);
    });
  }

  /** True when the candidate currently holds an unexpired live slot. */
  async isActive(userId: string): Promise<boolean> {
    if (!this.isQueueAvailable()) return false;
    const slot = await this.prisma.assessmentSlot.findUnique({ where: { userId } });
    return (
      slot?.state === ACTIVE && slot.expiresAt.getTime() > Date.now()
    );
  }

  /**
   * Extend a live slot. Does not admit: a candidate whose slot already expired must go
   * back through `claim`, or a stale tab could reclaim a seat that was given away.
   */
  async heartbeat(userId: string, assessmentId: string): Promise<AssessmentSlotStatus> {
    const slot = await this.prisma.assessmentSlot.findUnique({ where: { userId } });
    if (slot?.state === ACTIVE && slot.expiresAt.getTime() > Date.now()) {
      await this.prisma.assessmentSlot.update({
        where: { userId },
        data: { expiresAt: this.expiryFor(ACTIVE) },
      });
      const [activeCount, waiting] = await Promise.all([
        this.prisma.assessmentSlot.count({ where: { state: ACTIVE } }),
        this.prisma.assessmentSlot.count({ where: { state: WAITING } }),
      ]);
      return { state: ACTIVE, waiting, activeCount, maxActive: this.maxActive() };
    }
    return this.claim(userId, assessmentId);
  }

  /**
   * Give up the slot or queue place.
   *
   * Best-effort only — it makes the seat available sooner than the TTL would, but the
   * TTL remains the guarantee, because a closed laptop never gets here.
   */
  async release(userId: string): Promise<void> {
    if (!this.isQueueAvailable()) return;
    try {
      await this.prisma.assessmentSlot.deleteMany({ where: { userId } });
    } catch (error) {
      // Releasing is already best-effort, so an unmigrated table is not worth an
      // error response — the caller is on their way out either way.
      if (this.isMissingTable(error)) {
        this.tableMissing = true;
        return;
      }
      throw error;
    }
  }

  /** Build the response payload from current counts. */
  private async describe(
    tx: {
      assessmentSlot: { count: (args: { where: { state: string } }) => Promise<number> };
    },
    state: string,
    position: number | null,
    maxActive: number,
  ): Promise<AssessmentSlotStatus> {
    const [activeCount, waiting] = await Promise.all([
      tx.assessmentSlot.count({ where: { state: ACTIVE } }),
      tx.assessmentSlot.count({ where: { state: WAITING } }),
    ]);
    return {
      state: state === ACTIVE ? ACTIVE : WAITING,
      ...(position !== null ? { position } : {}),
      waiting,
      activeCount,
      maxActive,
    };
  }
}

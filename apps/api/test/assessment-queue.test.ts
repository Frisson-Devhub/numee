/**
 * Waiting-room behaviour and threshold configuration.
 *
 * Run: pnpm --filter @numee/api test
 *
 * Prisma is replaced with an in-memory stand-in implementing only the handful of calls
 * the service makes, so the suite needs no database and no new dependency. The advisory
 * lock is a no-op here: Node runs these sequentially, so the interleaving the lock
 * exists to prevent cannot occur in-process.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { AssessmentQueueService } from "../src/assessment-queue/assessment-queue.service";

type Slot = {
  userId: string;
  assessmentId: string;
  state: string;
  enqueuedAt: Date;
  expiresAt: Date;
};

/** Minimal Prisma stand-in: an array of rows plus the query shapes the service uses. */
class FakePrisma {
  rows: Slot[] = [];
  /** Monotonic tiebreaker so rows created in the same millisecond still order by arrival. */
  private seq = 0;

  private matches(row: Slot, where: Record<string, unknown> | undefined): boolean {
    if (!where) return true;
    if (typeof where.userId === "string" && row.userId !== where.userId) return false;
    if (typeof where.state === "string" && row.state !== where.state) return false;
    const expires = where.expiresAt as { lt?: Date } | undefined;
    if (expires?.lt && !(row.expiresAt.getTime() < expires.lt.getTime())) return false;
    const enqueued = where.enqueuedAt as { lt?: Date } | undefined;
    if (enqueued?.lt && !(row.enqueuedAt.getTime() < enqueued.lt.getTime())) return false;
    return true;
  }

  assessmentSlot = {
    findUnique: async ({ where }: { where: { userId: string } }) =>
      this.rows.find((r) => r.userId === where.userId) ?? null,

    count: async ({ where }: { where?: Record<string, unknown> } = {}) =>
      this.rows.filter((r) => this.matches(r, where)).length,

    deleteMany: async ({ where }: { where?: Record<string, unknown> } = {}) => {
      const before = this.rows.length;
      this.rows = this.rows.filter((r) => !this.matches(r, where));
      return { count: before - this.rows.length };
    },

    create: async ({ data }: { data: Omit<Slot, "enqueuedAt"> & { enqueuedAt?: Date } }) => {
      const row: Slot = {
        ...data,
        enqueuedAt: data.enqueuedAt ?? new Date(Date.now() + this.seq++),
      };
      this.rows.push(row);
      return row;
    },

    update: async ({
      where,
      data,
    }: {
      where: { userId: string };
      data: Partial<Slot>;
    }) => {
      const row = this.rows.find((r) => r.userId === where.userId);
      if (!row) throw new Error("row not found");
      Object.assign(row, data);
      return row;
    },
  };

  async $executeRaw() {
    return 0;
  }

  async $transaction<T>(fn: (tx: FakePrisma) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

function makeService(env: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  const prisma = new FakePrisma();
  // The service only touches the members FakePrisma implements.
  const service = new AssessmentQueueService(prisma as never);
  return { service, prisma };
}

const ENV_KEYS = [
  "ASSESSMENT_MAX_ACTIVE",
  "ASSESSMENT_ACTIVE_TTL_SECONDS",
  "ASSESSMENT_WAITING_TTL_SECONDS",
];

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("threshold configuration", () => {
  it("defaults when the variable is unset", () => {
    const { service } = makeService();
    assert.equal(service.maxActive(), 25);
    assert.equal(service.activeTtlSeconds(), 90);
    assert.equal(service.waitingTtlSeconds(), 30);
  });

  it("reads the threshold from the environment", () => {
    const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: "3" });
    assert.equal(service.maxActive(), 3);
  });

  it("falls back rather than trusting a malformed value", () => {
    for (const bad of ["0", "-5", "abc", "2.5", ""]) {
      const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: bad });
      assert.equal(service.maxActive(), 25, `"${bad}" should not be accepted`);
    }
  });
});

describe("admission below the threshold", () => {
  it("admits candidates straight through, preserving the existing flow", async () => {
    const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: "3" });

    for (const user of ["u1", "u2", "u3"]) {
      const slot = await service.claim(user, "assessment1");
      assert.equal(slot.state, "active", `${user} should be admitted`);
      assert.equal(slot.position, undefined);
    }
  });

  it("reports capacity alongside the state", async () => {
    const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: "2" });
    await service.claim("u1", "assessment1");
    const slot = await service.claim("u2", "assessment1");
    assert.equal(slot.activeCount, 2);
    assert.equal(slot.maxActive, 2);
    assert.equal(slot.waiting, 0);
  });
});

describe("queueing at the threshold", () => {
  it("queues the candidate that tips it over", async () => {
    const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: "2" });
    await service.claim("u1", "assessment1");
    await service.claim("u2", "assessment1");

    const third = await service.claim("u3", "assessment1");
    assert.equal(third.state, "waiting");
    assert.equal(third.position, 1);
    assert.equal(third.waiting, 1);
  });

  it("numbers the queue in arrival order", async () => {
    const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");

    assert.equal((await service.claim("u2", "assessment1")).position, 1);
    assert.equal((await service.claim("u3", "assessment1")).position, 2);
    assert.equal((await service.claim("u4", "assessment1")).position, 3);
  });

  it("does not let a newcomer jump a non-empty queue", async () => {
    const { service, prisma } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    await service.claim("u2", "assessment1");

    // A seat frees up, but u2 is already in line for it.
    await service.release("u1");

    const newcomer = await service.claim("u9", "assessment1");
    assert.equal(newcomer.state, "waiting", "newcomer must queue behind u2");
    assert.equal(newcomer.position, 2);
    assert.equal(prisma.rows.find((r) => r.userId === "u2")?.state, "waiting");
  });
});

describe("idempotency across refresh and reconnect", () => {
  it("re-claiming an active slot returns the same seat, not a second one", async () => {
    const { service, prisma } = makeService({ ASSESSMENT_MAX_ACTIVE: "2" });
    await service.claim("u1", "assessment1");

    const again = await service.claim("u1", "assessment1");
    assert.equal(again.state, "active");
    assert.equal(again.activeCount, 1, "must not consume a second seat");
    assert.equal(prisma.rows.length, 1);
  });

  it("re-claiming while queued keeps the same position", async () => {
    const { service, prisma } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    await service.claim("u2", "assessment1");
    const first = await service.claim("u3", "assessment1");

    // u3 refreshes the page three times.
    const after = [
      await service.claim("u3", "assessment1"),
      await service.claim("u3", "assessment1"),
      await service.claim("u3", "assessment1"),
    ];

    for (const slot of after) {
      assert.equal(slot.position, first.position);
      assert.equal(slot.waiting, 2, "refreshing must not add queue entries");
    }
    assert.equal(prisma.rows.filter((r) => r.userId === "u3").length, 1);
  });
});

describe("promotion when capacity frees up", () => {
  it("promotes the head of the queue on its next poll", async () => {
    const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    await service.claim("u2", "assessment1");

    await service.release("u1");

    const promoted = await service.claim("u2", "assessment1");
    assert.equal(promoted.state, "active");
    assert.equal(promoted.position, undefined);
  });

  it("promotes as many as there are free seats, not just one", async () => {
    const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: "2" });
    await service.claim("a1", "assessment1");
    await service.claim("a2", "assessment1");
    await service.claim("w1", "assessment1");
    await service.claim("w2", "assessment1");
    await service.claim("w3", "assessment1");

    await service.release("a1");
    await service.release("a2");

    assert.equal((await service.claim("w1", "assessment1")).state, "active");
    assert.equal((await service.claim("w2", "assessment1")).state, "active");

    const stillWaiting = await service.claim("w3", "assessment1");
    assert.equal(stillWaiting.state, "waiting", "only two seats were freed");
    assert.equal(stillWaiting.position, 1);
  });

  it("keeps a candidate waiting while the assessment is still full", async () => {
    const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    await service.claim("u2", "assessment1");

    const polled = await service.claim("u2", "assessment1");
    assert.equal(polled.state, "waiting");
    assert.equal(polled.position, 1);
  });
});

describe("expiry frees seats without a release call", () => {
  it("reclaims an active slot whose heartbeat stopped", async () => {
    const { service, prisma } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    await service.claim("u2", "assessment1");

    // u1's browser was killed: no release, and the heartbeat stopped.
    const abandoned = prisma.rows.find((r) => r.userId === "u1")!;
    abandoned.expiresAt = new Date(Date.now() - 1_000);

    const promoted = await service.claim("u2", "assessment1");
    assert.equal(promoted.state, "active", "expired seats must be reclaimable");
    assert.equal(prisma.rows.some((r) => r.userId === "u1"), false);
  });

  it("drops an abandoned queue entry so it stops blocking the line", async () => {
    const { service, prisma } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    await service.claim("u2", "assessment1");
    await service.claim("u3", "assessment1");

    const abandoned = prisma.rows.find((r) => r.userId === "u2")!;
    abandoned.expiresAt = new Date(Date.now() - 1_000);

    const slot = await service.claim("u3", "assessment1");
    assert.equal(slot.position, 1, "u3 should move up when u2 times out");
  });
});

describe("heartbeat", () => {
  it("extends a live slot without consuming another", async () => {
    const { service, prisma } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    const before = prisma.rows[0].expiresAt.getTime();

    await new Promise((r) => setTimeout(r, 5));
    const status = await service.heartbeat("u1", "assessment1");

    assert.equal(status.state, "active");
    assert.ok(prisma.rows[0].expiresAt.getTime() > before, "expiry should move forward");
    assert.equal(prisma.rows.length, 1);
  });

  it("does not let an expired slot heartbeat its way back in", async () => {
    const { service, prisma } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    await service.claim("u2", "assessment1");

    // u1 expires and u2 takes the seat.
    prisma.rows.find((r) => r.userId === "u1")!.expiresAt = new Date(Date.now() - 1_000);
    assert.equal((await service.claim("u2", "assessment1")).state, "active");

    // u1's stale tab wakes up and heartbeats.
    const revived = await service.heartbeat("u1", "assessment1");
    assert.equal(revived.state, "waiting", "the seat was given away; u1 must queue");
  });
});

describe("isActive", () => {
  it("is true only for an unexpired live slot", async () => {
    const { service, prisma } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    assert.equal(await service.isActive("u1"), true);

    prisma.rows[0].expiresAt = new Date(Date.now() - 1);
    assert.equal(await service.isActive("u1"), false);

    assert.equal(await service.isActive("nobody"), false);
  });

  it("is false for a queued candidate", async () => {
    const { service } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    await service.claim("u2", "assessment1");
    assert.equal(await service.isActive("u2"), false);
  });
});

describe("release", () => {
  it("removes the row so the seat is immediately reusable", async () => {
    const { service, prisma } = makeService({ ASSESSMENT_MAX_ACTIVE: "1" });
    await service.claim("u1", "assessment1");
    await service.release("u1");

    assert.equal(prisma.rows.length, 0);
    assert.equal((await service.claim("u2", "assessment1")).state, "active");
  });

  it("is safe to call for a candidate with no slot", async () => {
    const { service } = makeService();
    await service.release("never-existed");
  });
});

describe("degrading when the table has not been migrated", () => {
  /** Prisma throws P2021 for every query until `db:migrate` creates the table. */
  class UnmigratedPrisma extends FakePrisma {
    calls = 0;
    constructor() {
      super();
      const missing = () => {
        this.calls += 1;
        throw Object.assign(new Error("table does not exist"), { code: "P2021" });
      };
      this.assessmentSlot = {
        findUnique: missing,
        count: missing,
        deleteMany: missing,
        create: missing,
        update: missing,
      } as unknown as FakePrisma["assessmentSlot"];
    }
  }

  it("tryClaim fails open instead of locking candidates out", async () => {
    const prisma = new UnmigratedPrisma();
    const service = new AssessmentQueueService(prisma as never);

    assert.equal(await service.tryClaim("u1", "assessment1"), null);
  });

  it("stops querying after the first failure", async () => {
    const prisma = new UnmigratedPrisma();
    const service = new AssessmentQueueService(prisma as never);

    await service.tryClaim("u1", "assessment1");
    const afterFirst = prisma.calls;

    await service.tryClaim("u2", "assessment1");
    await service.tryClaim("u3", "assessment1");

    assert.equal(prisma.calls, afterFirst, "a pending migration should cost one query");
    assert.equal(service.isQueueAvailable(), false);
  });

  it("release is a no-op rather than an error", async () => {
    const prisma = new UnmigratedPrisma();
    const service = new AssessmentQueueService(prisma as never);

    await service.release("u1");
  });

  it("isActive reports false once the queue is known unavailable", async () => {
    const prisma = new UnmigratedPrisma();
    const service = new AssessmentQueueService(prisma as never);

    await service.tryClaim("u1", "assessment1");
    assert.equal(await service.isActive("u1"), false);
  });

  it("a real error still propagates", async () => {
    const prisma = new FakePrisma();
    prisma.assessmentSlot.findUnique = async () => {
      throw Object.assign(new Error("connection refused"), { code: "P1001" });
    };
    const service = new AssessmentQueueService(prisma as never);

    await assert.rejects(() => service.tryClaim("u1", "assessment1"), /connection refused/);
  });
});

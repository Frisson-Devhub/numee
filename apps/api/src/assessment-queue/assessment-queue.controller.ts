import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { DEFAULT_ASSESSMENT_ID, isAssessmentIdWithinLimit } from "@numee/shared/server";
import { AssessmentQueueService } from "./assessment-queue.service";
import { SessionGuard } from "../common/guards/session.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { SessionPayload } from "../common/auth";

/** Resolve a caller-supplied assessment id, falling back to the default. */
function resolveAssessmentId(raw: unknown): string {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed && isAssessmentIdWithinLimit(trimmed)) return trimmed;
  }
  return DEFAULT_ASSESSMENT_ID;
}

/**
 * Waiting room for live assessments.
 *
 * Every endpoint is idempotent per user, so a refresh, a reconnect or a duplicated
 * request can never produce a second queue entry.
 */
@Controller("assessment-queue")
@UseGuards(SessionGuard)
export class AssessmentQueueController {
  constructor(private readonly queue: AssessmentQueueService) {}

  private assertAvailable(): void {
    if (!this.queue.isQueueAvailable()) {
      throw new HttpException({ error: "Assessment queue not available" }, 503);
    }
  }

  /** Take a slot if one is free, otherwise join (or keep) a place in line. */
  @Post("claim")
  async claim(
    @CurrentUser() user: SessionPayload,
    @Body() body: { assessmentId?: string },
  ) {
    this.assertAvailable();
    try {
      return await this.queue.claim(user.id!, resolveAssessmentId(body?.assessmentId));
    } catch (error) {
      console.error("Assessment queue claim error:", error);
      throw new HttpException({ error: "Failed to join the assessment queue" }, 500);
    }
  }

  /**
   * Current standing. Shares `claim`'s implementation on purpose: a waiting candidate
   * polls this, and each poll must renew their entry — otherwise a candidate who is
   * still watching the screen would silently time out of the queue.
   */
  @Get("status")
  async status(
    @CurrentUser() user: SessionPayload,
    @Query("assessmentId") assessmentId?: string,
  ) {
    this.assertAvailable();
    try {
      return await this.queue.claim(user.id!, resolveAssessmentId(assessmentId));
    } catch (error) {
      console.error("Assessment queue status error:", error);
      throw new HttpException({ error: "Failed to read queue status" }, 500);
    }
  }

  /** Keep a live slot from expiring while the assessment is in progress. */
  @Post("heartbeat")
  async heartbeat(
    @CurrentUser() user: SessionPayload,
    @Body() body: { assessmentId?: string },
  ) {
    this.assertAvailable();
    try {
      return await this.queue.heartbeat(
        user.id!,
        resolveAssessmentId(body?.assessmentId),
      );
    } catch (error) {
      console.error("Assessment queue heartbeat error:", error);
      throw new HttpException({ error: "Failed to refresh assessment slot" }, 500);
    }
  }

  /**
   * Hand the slot back when the assessment ends or the candidate leaves the queue.
   *
   * Always succeeds from the caller's point of view. Releasing is best-effort by
   * design — the TTL is what actually guarantees the seat comes back — and the caller
   * is on their way out, so there is nothing useful they could do with a failure. It
   * is also reached via `sendBeacon` on tab close, where no response is ever read.
   */
  @Post("release")
  async release(@CurrentUser() user: SessionPayload) {
    try {
      await this.queue.release(user.id!);
      return { success: true };
    } catch (error) {
      console.error("Assessment queue release error:", error);
      return { success: false };
    }
  }
}

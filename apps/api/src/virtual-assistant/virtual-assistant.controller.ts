import {
  Body,
  Controller,
  HttpException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { INITIAL_MILESTONE_STATUS, MILESTONE_CONFIG } from "@numee/shared/server";
import { PrismaService } from "../prisma/prisma.service";
import { AssessmentService } from "../assessment/assessment.module";
import { SessionGuard } from "../common/guards/session.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { SessionPayload } from "../common/auth";
import {
  getMilestonesFromStored,
  parseStoredMilestoneStatus,
  wrapMilestoneStatus,
} from "../milestone/milestone-status";
import {
  DEFAULT_LOCALE,
  getApiLanguage,
  isLocale,
} from "../i18n/i18n";

type QuestionAnswerPair = { assistant: string; user: string };
type StoredMilestoneItem = { key: string; status: string };

const DISPATCH_AGENT_PATH =
  process.env.VIRTUAL_ASSISTANT_DISPATCH_PATH || "virtual_assistant/dispatch-assistant";

/** Flatten stored assistant/user Q&A pairs into OpenAI-style role/content turns. */
function toConversationHistory(
  pairs: QuestionAnswerPair[] | null,
): Array<{ role: string; content: string }> {
  if (!Array.isArray(pairs) || pairs.length === 0) return [];
  const history: Array<{ role: string; content: string }> = [];
  for (const p of pairs) {
    const assistant = (p.assistant ?? "").trim();
    const user = (p.user ?? "").trim();
    if (assistant) history.push({ role: "assistant", content: assistant });
    if (user) history.push({ role: "user", content: user });
  }
  return history;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function normalizeStatusForMerge(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

type MilestoneItemLike = { milestone?: string; status?: string };

/** Normalize nested or flat conversation_status arrays from the milestone agent. */
function flattenConversationStatus(raw: unknown): MilestoneItemLike[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (Array.isArray(first)) {
    return raw.flat().filter((s): s is MilestoneItemLike => s != null && typeof s === "object");
  }
  return raw.filter((s): s is MilestoneItemLike => s != null && typeof s === "object");
}

/** Extract normalized milestone key/status pairs from a milestone_tracker response. */
function getConversationStatusFromResponse(
  data: unknown,
): { key: string; status: string }[] | null {
  const obj = data as { milestone_status?: { conversation_status?: unknown } };
  const raw = obj?.milestone_status?.conversation_status;
  const main = flattenConversationStatus(raw);
  if (main.length === 0) return null;
  const items = main
    .filter((s) => typeof s.milestone === "string")
    .map((s) => ({
      key: normalizeKey(s.milestone!),
      status: normalizeStatusForMerge(String(s.status ?? "in_progress")),
    }));
  return items.length > 0 ? items : null;
}

/**
 * Merge agent statuses onto stored milestones; never demotes completed.
 * Ensures exactly one in_progress when none is present.
 */
function mergeMilestoneStatus(
  existing: StoredMilestoneItem[] | null,
  fromResponse: { key: string; status: string }[],
): StoredMilestoneItem[] {
  const base =
    Array.isArray(existing) && existing.length > 0
      ? existing
      : [...INITIAL_MILESTONE_STATUS];
  const byKey = new Map<string, string>();
  base.forEach((s) => byKey.set(s.key, normalizeStatusForMerge(s.status)));
  fromResponse.forEach(({ key, status }) => {
    const current = byKey.get(key);
    if (current !== "completed") byKey.set(key, normalizeStatusForMerge(status));
  });
  let result = MILESTONE_CONFIG.map((c) => ({
    key: c.key,
    status: byKey.get(c.key) ?? "incomplete",
  }));
  const hasInProgress = result.some(
    (s) => normalizeStatusForMerge(s.status) === "in_progress",
  );
  if (!hasInProgress) {
    const firstIncompleteIndex = result.findIndex(
      (s) => normalizeStatusForMerge(s.status) === "incomplete",
    );
    if (firstIncompleteIndex >= 0) {
      result = result.map((item, i) =>
        i === firstIncompleteIndex ? { ...item, status: "in_progress" } : item,
      );
    }
  }
  return result;
}

/** Promote the first incomplete milestone to in_progress when the agent returns none. */
function ensureFirstIncompleteIsInProgress(
  existing: StoredMilestoneItem[] | null,
): StoredMilestoneItem[] {
  const base =
    Array.isArray(existing) && existing.length > 0
      ? existing
      : [...INITIAL_MILESTONE_STATUS];
  const firstIncompleteIndex = base.findIndex(
    (s) => normalizeStatusForMerge(s.status) === "incomplete",
  );
  if (firstIncompleteIndex < 0) return base;
  return base.map((item, i) =>
    i === firstIncompleteIndex ? { ...item, status: "in_progress" } : item,
  );
}

@Controller("virtual-assistant")
@UseGuards(SessionGuard)
export class VirtualAssistantController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessment: AssessmentService,
  ) {}

  private agentBase(): string {
    return (
      process.env.AI_AGENT_URL ||
      "https://dab3-2401-4900-8846-5146-4c78-4c76-d4b1-633f.ngrok-free.app"
    ).replace(/\/$/, "");
  }

  /** Proxy LiveKit/agent token for the signed-in user. */
  @Post("get-token")
  async getToken(@CurrentUser() user: SessionPayload) {
    try {
      const response = await fetch(`${this.agentBase()}/virtual_assistant/get-token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new HttpException(
          {
            error:
              (data as { detail?: string }).detail ??
              "Failed to get virtual assistant token",
          },
          response.status,
        );
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Virtual assistant get-token error:", error);
      throw new HttpException(
        { error: "Failed to get virtual assistant session" },
        500,
      );
    }
  }

  /** Forward a support-join notification to the AI agent service. */
  @Post("notify-support")
  async notifySupport(
    @Body() body: { room_name?: string; reason?: string; join_url?: string },
  ) {
    try {
      const AI_AGENT_URL = process.env.AI_AGENT_URL;
      if (!AI_AGENT_URL) {
        throw new HttpException(
          { error: "Support notification service not configured" },
          503,
        );
      }
      if (
        typeof body.room_name !== "string" ||
        typeof body.reason !== "string" ||
        typeof body.join_url !== "string"
      ) {
        throw new HttpException(
          { error: "room_name, reason, and join_url are required strings" },
          400,
        );
      }
      const response = await fetch(
        `${AI_AGENT_URL.replace(/\/$/, "")}/virtual_assistant/notify_support`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_name: body.room_name,
            reason: body.reason,
            join_url: body.join_url,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new HttpException(
          {
            error: (data as { detail?: string }).detail ?? "Failed to notify support",
          },
          response.status,
        );
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Notify support error:", error);
      throw new HttpException({ error: "Failed to notify support" }, 500);
    }
  }

  /** Call milestone_tracker agent and merge conversation_status into assessment. */
  @Post("milestone-tracker")
  async milestoneTracker(
    @CurrentUser() user: SessionPayload,
    @Body()
    body: { current_question_asked_by_assistant?: string; assessmentId?: string },
  ) {
    try {
      const currentQuestionAskedByAssistant = body?.current_question_asked_by_assistant;
      if (typeof currentQuestionAskedByAssistant !== "string") {
        throw new HttpException(
          { error: "current_question_asked_by_assistant must be a string" },
          400,
        );
      }
      const assessmentId =
        typeof body?.assessmentId === "string" && body.assessmentId.trim()
          ? body.assessmentId.trim()
          : "assessment1";

      const AI_AGENT_URL = process.env.AI_AGENT_URL;
      if (!AI_AGENT_URL) {
        throw new HttpException(
          { error: "Milestone tracker service not configured" },
          503,
        );
      }
      if (!this.assessment.isAssessmentAvailable()) {
        throw new HttpException({ error: "Assessment not available" }, 503);
      }

      const assessment = await this.assessment.getOrCreateAssessment(
        user.id!,
        assessmentId,
      );
      const response = await fetch(`${AI_AGENT_URL}/agents/milestone_tracker`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: assessment.id,
          current_question_asked_by_assistant: currentQuestionAskedByAssistant,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new HttpException(
          {
            error:
              (data as { detail?: string }).detail ?? "Milestone tracker request failed",
          },
          response.status,
        );
      }

      const fromResponse = getConversationStatusFromResponse(data);
      const existingDoc = parseStoredMilestoneStatus(assessment.milestoneStatus);
      const existingMilestones = getMilestonesFromStored(assessment.milestoneStatus);
      const mergedMilestones =
        fromResponse && fromResponse.length > 0
          ? mergeMilestoneStatus(existingMilestones, fromResponse)
          : ensureFirstIncompleteIsInProgress(existingMilestones);
      const apiRedFlag = (data as { red_flag?: boolean }).red_flag === true;
      const redFlag = apiRedFlag || existingDoc.red_flag === true;
      const toSave = wrapMilestoneStatus(
        mergedMilestones,
        existingDoc.resume_allowed,
        redFlag,
      );

      await this.prisma.assessment.update({
        where: { id: assessment.id },
        data: { milestoneStatus: toSave as object },
      });

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Milestone tracker error:", error);
      throw new HttpException({ error: "Failed to get milestone status" }, 500);
    }
  }

  /** Dispatch a named virtual-assistant action with locale + conversation history. */
  @Post(":action")
  async action(
    @Param("action") action: string,
    @CurrentUser() user: SessionPayload,
    @Body()
    body: {
      assessmentId?: string;
      locale?: string;
      language?: string;
    },
  ) {
    if (action === "get-token") {
      return this.getToken(user);
    }

    if (action === "dispatch-agent") {
      try {
        const assessmentId =
          typeof body?.assessmentId === "string" && body.assessmentId.trim()
            ? body.assessmentId.trim()
            : "assessment1";

        let pairs: QuestionAnswerPair[] | null = null;
        const assessment = await this.assessment.getOrCreateAssessment(
          user.id!,
          assessmentId,
        );
        if (
          Array.isArray(assessment.assessmentQuestionAnswers) &&
          assessment.assessmentQuestionAnswers.length > 0
        ) {
          pairs = assessment.assessmentQuestionAnswers as QuestionAnswerPair[];
        }
        const conversation_history = toConversationHistory(pairs);

        const localeFromBody = body?.locale;
        const languageFromBody = body?.language;
        const language =
          typeof languageFromBody === "string" && languageFromBody.trim()
            ? languageFromBody.trim()
            : typeof localeFromBody === "string" && isLocale(localeFromBody)
              ? getApiLanguage(localeFromBody)
              : getApiLanguage(DEFAULT_LOCALE);

        const dispatchUrl = `${this.agentBase()}/${DISPATCH_AGENT_PATH.replace(/^\//, "")}`;
        const response = await fetch(dispatchUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            conversation_id: assessment.id,
            conversation_history,
            language,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new HttpException(
            {
              error: (data as { detail?: string }).detail ?? "Failed to dispatch agent",
            },
            response.status,
          );
        }
        return data;
      } catch (error) {
        if (error instanceof HttpException) throw error;
        console.error("Virtual assistant dispatch-agent error:", error);
        throw new HttpException({ error: "Failed to dispatch agent" }, 500);
      }
    }

    throw new HttpException({ error: `Unknown action: ${action}` }, 404);
  }
}

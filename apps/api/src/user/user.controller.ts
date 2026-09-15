import {
  Body,
  Controller,
  Get,
  HttpException,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { PendingSignupService } from "../pending-signup/pending-signup.module";
import { AssessmentService } from "../assessment/assessment.module";
import { SessionGuard } from "../common/guards/session.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { SessionPayload } from "../common/auth";
import {
  createInitialMilestoneDocument,
  parseStoredMilestoneStatus,
  withResumeAllowed,
} from "../milestone/milestone-status";
import { CandidateEmbeddingsService } from "../candidate/candidate-embeddings.service";
import {
  LEGACY_SESSION_COOKIE,
  PORTAL_SESSION_COOKIES,
} from "@numee/shared/server";

@Controller()
export class UserController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pendingSignups: PendingSignupService,
    private readonly assessment: AssessmentService,
    private readonly candidateEmbeddings: CandidateEmbeddingsService,
  ) {}

  /** Authenticated profile plus per-assessment conversation history when available. */
  @Get("user/profile")
  @UseGuards(SessionGuard)
  async getProfile(@CurrentUser() user: SessionPayload) {
    try {
      const row = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          emailOrPhone: true,
          dateOfBirth: true,
          gender: true,
          linkedInUrl: true,
          resumeUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!row) throw new HttpException({ error: "User not found" }, 404);

      const conversation: Record<string, Array<{ user: string; assistant: string }>> = {};
      if (this.assessment.isAssessmentAvailable()) {
        const assessments = await this.prisma.assessment.findMany({
          where: { userId: user.id },
          select: { assessmentId: true, assessmentQuestionAnswers: true },
        });
        for (const a of assessments) {
          if (Array.isArray(a.assessmentQuestionAnswers)) {
            conversation[a.assessmentId] = a.assessmentQuestionAnswers as Array<{
              user: string;
              assistant: string;
            }>;
          }
        }
      }

      return {
        success: true,
        data: {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          fullName: `${row.firstName} ${row.lastName}`.trim(),
          emailOrPhone: row.emailOrPhone,
          dateOfBirth: row.dateOfBirth ?? undefined,
          gender: row.gender ?? undefined,
          linkedInUrl: row.linkedInUrl ?? undefined,
          resumeUrl: row.resumeUrl ?? undefined,
          assistantQuestionAnswers: conversation,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Profile fetch error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Update LinkedIn/resume; enqueues candidate re-embedding as a side effect. */
  @Patch("user/profile")
  @UseGuards(SessionGuard)
  async patchProfile(
    @CurrentUser() user: SessionPayload,
    @Body() body: { linkedInUrl?: string; resumeUrl?: string },
  ) {
    try {
      const linkedInUrl =
        typeof body.linkedInUrl === "string" ? body.linkedInUrl.trim() || null : undefined;
      const resumeUrl =
        typeof body.resumeUrl === "string" ? body.resumeUrl.trim() || null : undefined;

      if (linkedInUrl === undefined && resumeUrl === undefined) {
        throw new HttpException(
          { error: "Provide linkedInUrl and/or resumeUrl to update" },
          400,
        );
      }

      const update: { linkedInUrl?: string | null; resumeUrl?: string | null } = {};
      if (linkedInUrl !== undefined) update.linkedInUrl = linkedInUrl;
      if (resumeUrl !== undefined) update.resumeUrl = resumeUrl;

      const row = await this.prisma.user.update({
        where: { id: user.id },
        data: update,
        select: { linkedInUrl: true, resumeUrl: true },
      });

      // Keep candidate vector in sync when resume/LinkedIn change.
      if (user.id) {
        void this.candidateEmbeddings.enqueueCandidateEmbedding(user.id);
      }

      return {
        success: true,
        data: {
          linkedInUrl: row.linkedInUrl ?? undefined,
          resumeUrl: row.resumeUrl ?? undefined,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Profile update error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Assessment dashboard payloads and milestone status for the signed-in user. */
  @Get("user/dashboard-data")
  @UseGuards(SessionGuard)
  async dashboardData(
    @CurrentUser() user: SessionPayload,
    @Query("assessmentId") assessmentIdParam?: string,
  ) {
    try {
      const data: Record<string, unknown> = {};
      const milestoneStatus: Record<string, unknown> = {};

      if (this.assessment.isAssessmentAvailable()) {
        const assessments = await this.prisma.assessment.findMany({
          where: { userId: user.id },
          select: {
            assessmentId: true,
            assessmentData: true,
            milestoneStatus: true,
          },
        });
        for (const a of assessments) {
          if (a.assessmentData != null && typeof a.assessmentData === "object") {
            data[a.assessmentId] = a.assessmentData;
          }
          milestoneStatus[a.assessmentId] = a.milestoneStatus
            ? parseStoredMilestoneStatus(a.milestoneStatus)
            : createInitialMilestoneDocument();
        }
      }

      const assessmentId = assessmentIdParam?.trim() || null;
      return {
        success: true,
        data,
        milestoneStatus,
        ...(assessmentId
          ? {
              currentData: (data[assessmentId] as { data?: unknown } | undefined)?.data ?? null,
              currentMilestoneStatus: milestoneStatus[assessmentId] ?? null,
            }
          : {}),
      };
    } catch (error) {
      console.error("Dashboard data error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Load AI questionnaire answers and resume_allowed for an assessment. */
  @Get("user/ai-questionnaire-state")
  @UseGuards(SessionGuard)
  async getAiQuestionnaireState(
    @CurrentUser() user: SessionPayload,
    @Query("assessmentId") assessmentIdParam?: string,
  ) {
    try {
      const assessmentId = assessmentIdParam?.trim() || "assessment1";
      let assistantQuestionAnswers: unknown[] = [];
      let milestoneStatus = createInitialMilestoneDocument();

      if (this.assessment.isAssessmentAvailable()) {
        const assessment = await this.assessment.getOrCreateAssessment(
          user.id!,
          assessmentId,
        );
        assistantQuestionAnswers = Array.isArray(assessment.assessmentQuestionAnswers)
          ? (assessment.assessmentQuestionAnswers as unknown[])
          : [];
        milestoneStatus = parseStoredMilestoneStatus(assessment.milestoneStatus);
      }

      return {
        success: true,
        assessmentId,
        assistantQuestionAnswers,
        milestoneStatus,
        resumeAllowed: milestoneStatus.resume_allowed,
      };
    } catch (error) {
      console.error("AI questionnaire state error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Persist resume_allowed on the assessment milestone document. */
  @Post("user/ai-questionnaire-state")
  @UseGuards(SessionGuard)
  async postAiQuestionnaireState(
    @CurrentUser() user: SessionPayload,
    @Body() body: { assessmentId?: string; resume_allowed?: boolean },
  ) {
    try {
      if (!this.assessment.isAssessmentAvailable()) {
        throw new HttpException({ error: "Assessment not available" }, 503);
      }
      const assessmentId =
        typeof body?.assessmentId === "string" && body.assessmentId.trim()
          ? body.assessmentId.trim()
          : "assessment1";
      if (typeof body?.resume_allowed !== "boolean") {
        throw new HttpException({ error: "resume_allowed must be a boolean" }, 400);
      }

      const assessment = await this.assessment.getOrCreateAssessment(
        user.id!,
        assessmentId,
      );
      const updated = withResumeAllowed(assessment.milestoneStatus, body.resume_allowed);
      await this.prisma.assessment.update({
        where: { id: assessment.id },
        data: { milestoneStatus: updated as object },
      });

      return {
        success: true,
        assessmentId,
        milestoneStatus: updated,
        resumeAllowed: updated.resume_allowed,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("AI questionnaire state update error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /**
   * Attach resume/LinkedIn during staged signup or after session (qualification agent).
   * A resume is mandatory: the signup step it backs cannot be skipped, and the
   * qualification agent has nothing to work from without one.
   */
  @Post("signup/social")
  async signupSocial(
    @Req() req: Request,
    @Body()
    body: {
      linkedInUrl?: string;
      resumeUrl?: string;
      emailOrPhone?: string;
    },
  ) {
    try {
      const { linkedInUrl, resumeUrl, emailOrPhone } = body;
      if (!resumeUrl?.trim()) {
        throw new HttpException({ error: "Resume upload is required" }, 400);
      }
      // Read the portal-scoped cookie, not the pre-namespacing `session` one. Reading
      // only the legacy name meant a signed-in candidate looked logged-out here, so the
      // handler fell through to the staged-signup branch and rejected them with
      // "Please sign in or complete signup first" after a perfectly good resume upload.
      const cookies =
        (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
      const sessionToken =
        cookies[PORTAL_SESSION_COOKIES.candidate] ?? cookies[LEGACY_SESSION_COOKIE];
      const { verifySession } = await import("../common/auth");
      const session = sessionToken ? verifySession(sessionToken) : null;

      if (session?.id) {
        const existingUser = await this.prisma.user.findUnique({
          where: { id: session.id },
          select: { id: true },
        });
        if (!existingUser) {
          throw new HttpException(
            { error: "Session invalid or user not found. Please sign in again." },
            401,
          );
        }

        const linkedInValue =
          linkedInUrl != null ? String(linkedInUrl).trim() || null : undefined;
        const resumeValue =
          resumeUrl != null ? String(resumeUrl).trim() || null : undefined;

        // Save the profile before calling out. Resume upload is a mandatory step and the
        // assessment guards read `resumeUrl`, so failing this request on an external
        // outage used to strand the candidate: the resume was never persisted and they
        // were bounced straight back to this page with nothing saved.
        await this.prisma.user.update({
          where: { id: session.id },
          data: {
            ...(linkedInValue !== undefined && { linkedInUrl: linkedInValue }),
            ...(resumeValue !== undefined && { resumeUrl: resumeValue }),
          },
        });

        // Qualification questions personalise the assessment but are not required to
        // start it, so the agent is best-effort: log failures and carry on.
        let qualified = false;
        try {
          const qualificationAgentUrl = `${process.env.AI_AGENT_URL}/agents/qualification_agent`;
          const agentRes = await fetch(qualificationAgentUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", accept: "application/json" },
            body: JSON.stringify({
              resume_url: resumeValue ?? "",
              linkedin_url: linkedInValue ?? "",
            }),
          });

          if (!agentRes.ok) {
            console.error(
              "Qualification agent error:",
              agentRes.status,
              await agentRes.text(),
            );
          } else {
            const data = await agentRes.json();
            const questionToAsked = data?.qualifications_from_cv?.question_to_asked;
            const raw = Array.isArray(questionToAsked)
              ? questionToAsked
              : questionToAsked != null
                ? [questionToAsked]
                : [];
            const agentQuestions: string[] = [];
            for (const item of raw) {
              if (typeof item === "string") agentQuestions.push(item);
              else if (
                item &&
                typeof item === "object" &&
                Array.isArray(
                  (item as { qualification_question?: unknown }).qualification_question,
                )
              ) {
                for (const q of (item as { qualification_question: string[] })
                  .qualification_question) {
                  if (typeof q === "string") agentQuestions.push(q);
                }
              }
            }

            if (agentQuestions.length > 0) {
              await this.prisma.user.update({
                where: { id: session.id },
                data: { agentQuestions },
              });
            }
            qualified = true;
          }
        } catch (error) {
          console.error("Qualification agent request failed:", error);
        }

        return {
          message: "Profile updated",
          linkedInUrl: linkedInValue ?? null,
          resumeUrl: resumeValue ?? null,
          /** False when the qualification agent was unreachable; the profile still saved. */
          qualified,
        };
      }

      if (!emailOrPhone?.trim()) {
        throw new HttpException(
          { error: "Please sign in or complete signup first." },
          400,
        );
      }

      const pendingKey = `signup:${emailOrPhone.trim()}`;
      const signupData = await this.pendingSignups.get<Record<string, unknown>>(pendingKey);
      if (!signupData || typeof signupData !== "object") {
        throw new HttpException(
          { error: "Signup session not found or expired. Please sign up again." },
          404,
        );
      }

      const updated = {
        ...signupData,
        ...(linkedInUrl !== undefined && linkedInUrl !== null
          ? { linkedInUrl: String(linkedInUrl).trim() || null }
          : {}),
        ...(resumeUrl !== undefined && resumeUrl !== null
          ? { resumeUrl: String(resumeUrl).trim() || null }
          : {}),
      };
      await this.pendingSignups.set(pendingKey, updated, { keepTtl: true });
      return {
        message: "Profile updated",
        linkedInUrl: updated.linkedInUrl,
        resumeUrl: updated.resumeUrl,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Signup social error:", error);
      throw new HttpException({ error: "Something went wrong. Please try again." }, 500);
    }
  }
}

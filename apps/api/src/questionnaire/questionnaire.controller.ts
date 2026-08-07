import { Body, Controller, Get, HttpException, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SessionGuard } from "../common/guards/session.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { SessionPayload } from "../common/auth";

@Controller("questionnaire")
@UseGuards(SessionGuard)
export class QuestionnaireController {
  constructor(private readonly prisma: PrismaService) {}

  /** Current questionnaire step, answers, and agent-generated questions. */
  @Get("progress")
  async progress(@CurrentUser() user: SessionPayload) {
    try {
      const row = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          currentQuestionIndex: true,
          questionnaireAnswers: true,
          agentQuestions: true,
        },
      });
      if (!row) throw new HttpException({ error: "User not found" }, 404);
      return {
        stepIndex: row.currentQuestionIndex ?? 0,
        answers: (row.questionnaireAnswers as Record<string, string>) || {},
        agentQuestions: row.agentQuestions ?? null,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Progress error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Autosave step index and answers without creating a final response row. */
  @Post("save")
  async save(
    @CurrentUser() user: SessionPayload,
    @Body() body: { stepIndex?: number; answers?: Record<string, string> },
  ) {
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          currentQuestionIndex: body.stepIndex,
          questionnaireAnswers: body.answers ?? {},
        },
      });
      return { success: true };
    } catch (error) {
      console.error("Save error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Advance step and persist a QuestionnaireResponse snapshot. */
  @Post("submit")
  async submit(
    @CurrentUser() user: SessionPayload,
    @Body() body: { answers?: Record<string, string>; stepIndex?: number },
  ) {
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { currentQuestionIndex: (body.stepIndex ?? 0) + 1 },
      });
      await this.prisma.questionnaireResponse.create({
        data: { userId: user.id!, answers: body.answers ?? {} },
      });
      return { success: true };
    } catch (error) {
      console.error("Submit error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }
}

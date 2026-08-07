import {
  Body,
  Controller,
  HttpException,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import { AssessmentService } from "../assessment/assessment.module";
import { SessionGuard } from "../common/guards/session.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { SessionPayload } from "../common/auth";
import { SYSTEM_PROMPT } from "./system_prompt";
import { CandidateEmbeddingsService } from "../candidate/candidate-embeddings.service";

type QuestionAnswerPair = { assistant: string; user: string };

function isQuestionAnswerPair(x: unknown): x is QuestionAnswerPair {
  return (
    typeof x === "object" &&
    x !== null &&
    "assistant" in x &&
    "user" in x &&
    typeof (x as QuestionAnswerPair).assistant === "string" &&
    typeof (x as QuestionAnswerPair).user === "string"
  );
}

@Controller("anam")
export class AnamController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessment: AssessmentService,
    private readonly candidateEmbeddings: CandidateEmbeddingsService,
  ) {}

  /** Mint an Anam.ai session token for the Cara avatar (no auth). */
  @Post("session-token")
  async sessionToken() {
    const ANAM_API_KEY = process.env.ANAM_API_KEY;
    if (!ANAM_API_KEY) {
      throw new HttpException({ error: "ANAM_API_KEY is not configured" }, 500);
    }
    try {
      const response = await fetch("https://api.anam.ai/v1/auth/session-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANAM_API_KEY}`,
        },
        body: JSON.stringify({
          personaConfig: {
            name: "Cara",
            avatarId: "30fa96d0-26c4-4e55-94a0-517025942e18",
            voiceId: "6bfbe25a-979d-40f3-a92b-5394170af54b",
            llmId: "CUSTOMER_CLIENT_V1",
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new HttpException(
          { error: data.error ?? "Failed to create session" },
          response.status,
        );
      }
      return { sessionToken: data.sessionToken };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Session token error:", error);
      throw new HttpException({ error: "Failed to create session" }, 500);
    }
  }

  /** Persist Q&A pairs; optional master_agent call writes dashboard data and re-embeds. */
  @Post("save-messages")
  @UseGuards(SessionGuard)
  async saveMessages(
    @CurrentUser() user: SessionPayload,
    @Body()
    body: {
      assessmentId?: string;
      questionAnswerPairs?: unknown;
      callMasterAgent?: boolean;
    },
  ) {
    try {
      const assessmentId =
        typeof body?.assessmentId === "string" && body.assessmentId.trim()
          ? body.assessmentId.trim()
          : "assessment1";
      const raw = body?.questionAnswerPairs;
      if (!Array.isArray(raw)) {
        throw new HttpException(
          { error: "questionAnswerPairs must be an array of { assistant, user }" },
          400,
        );
      }
      const questionAnswerPairs = raw.filter(isQuestionAnswerPair);
      const callMasterAgent = body?.callMasterAgent === true;

      if (!this.assessment.isAssessmentAvailable()) {
        throw new HttpException({ error: "Assessment not available" }, 503);
      }

      const assessment = await this.assessment.getOrCreateAssessment(
        user.id!,
        assessmentId,
      );

      if (callMasterAgent) {
        const masterAgentUrl = `${process.env.AI_AGENT_URL}/agents/master_agent`;
        const agentRes = await fetch(masterAgentUrl, {
          method: "POST",
          headers: { accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            user_assistant_conversation: questionAnswerPairs.map((p) => ({
              assistant: p.assistant,
              user: p.user,
            })),
          }),
        });
        if (!agentRes.ok) {
          console.error("Master agent error:", agentRes.status, await agentRes.text());
          throw new HttpException(
            { error: "Failed to process conversation with master agent" },
            502,
          );
        }
        const agentPayload = await agentRes.json();
        const dashboardEntry = {
          data: agentPayload,
          status: true,
          message: null as string | null,
          success: true,
        };
        await this.prisma.assessment.update({
          where: { id: assessment.id },
          data: {
            assessmentQuestionAnswers: questionAnswerPairs as object,
            assessmentData: dashboardEntry as object,
          },
        });
        // Assessment report ready — refresh candidate vector for job matching.
        if (user.id) {
          void this.candidateEmbeddings.enqueueCandidateEmbedding(user.id);
        }
      } else {
        await this.prisma.assessment.update({
          where: { id: assessment.id },
          data: { assessmentQuestionAnswers: questionAnswerPairs as object },
        });
      }

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Save assistant messages error:", error);
      throw new HttpException({ error: "Failed to save conversation" }, 500);
    }
  }

  /** Stream OpenAI chat completions (SSE-ish JSON lines) using the Anam system prompt. */
  @Post("chat-stream")
  async chatStream(
    @Body() body: { messages?: OpenAI.Chat.ChatCompletionMessageParam[] },
    @Res() res: Response,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      throw new HttpException({ error: "OPENAI_API_KEY is not configured" }, 500);
    }
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(body.messages ?? []),
        ],
        stream: true,
        temperature: 0.7,
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? "";
        if (content) {
          res.write(JSON.stringify({ content }) + "\n");
        }
      }
      res.end();
    } catch (error) {
      console.error("LLM streaming error:", error);
      const message =
        error instanceof Error ? error.message : "An error occurred while streaming response";
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      } else {
        res.end();
      }
    }
  }
}

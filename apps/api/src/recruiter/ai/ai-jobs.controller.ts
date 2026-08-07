import {
  Body,
  Controller,
  HttpException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import OpenAI from "openai";
import { PrismaService } from "../../prisma/prisma.service";
import { SessionGuard } from "../../common/guards/session.guard";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";
import { CurrentMembership } from "../../common/decorators/current-membership.decorator";
import type { MembershipContext } from "../../common/guards/recruiter.guard";

type EnhanceResult = {
  title?: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  suggestedSkills?: { name: string; required: boolean }[];
  keywords?: string[];
  summary?: string;
};

type DraftJobBody = {
  title?: string;
  department?: string | null;
  employmentType?: string | null;
  workMode?: string | null;
  location?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  noticePeriod?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryNegotiable?: boolean;
  description?: string | null;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  skills?: { name: string; required?: boolean }[];
  industryName?: string | null;
  jobRoleName?: string | null;
};

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Escape plain text and wrap paragraphs for rich-text job description fields. */
function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`);
  return paragraphs.join("") || `<p>${escaped}</p>`;
}

@Controller("recruiter/jobs")
@UseGuards(SessionGuard, RecruiterGuard)
export class AiJobsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Draft-friendly summarize: builds a full rich job description (HTML)
   * from form fields. Works for unsaved jobs (no id required).
   */
  @Post("enhance-draft")
  async enhanceDraft(@Body() body: DraftJobBody) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new HttpException(
          { error: "OPENAI_API_KEY is not configured" },
          503,
        );
      }

      const title = body.title?.trim() || "";
      const description = body.description?.trim() || "";
      const responsibilities = body.responsibilities?.trim() || "";
      const requirements = body.requirements?.trim() || "";
      const benefits = body.benefits?.trim() || "";
      const skills =
        body.skills?.map((s) => s.name).filter(Boolean) ?? [];

      if (
        !title &&
        !description &&
        !responsibilities &&
        !requirements &&
        !benefits &&
        skills.length === 0
      ) {
        throw new HttpException(
          {
            error:
              "Add a job title or description details before summarizing",
          },
          400,
        );
      }

      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You write polished, recruiter-friendly full job descriptions.
Return JSON only with key: descriptionHtml (string of HTML).

Write a complete job description suitable for posting, structured with semantic HTML only:
- Use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <u>, <a> when useful.
- Typical sections: About the role, Responsibilities, Requirements, Nice to have (if supported), Benefits / What we offer, and any location/work-mode notes when present.
- Synthesize all provided fields into one cohesive description. Improve clarity and tone; do not invent unrealistic perks, salary figures, or requirements that are not implied by the input.
- If compensation or experience ranges are provided, include them accurately.
- Do not wrap the result in markdown code fences. Return raw HTML in descriptionHtml only.
- Keep tone professional and clear.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              title,
              description,
              responsibilities,
              requirements,
              benefits,
              skills,
              department: body.department ?? null,
              employmentType: body.employmentType ?? null,
              workMode: body.workMode ?? null,
              location: body.location ?? null,
              experienceMin: body.experienceMin ?? null,
              experienceMax: body.experienceMax ?? null,
              noticePeriod: body.noticePeriod ?? null,
              salaryMin: body.salaryMin ?? null,
              salaryMax: body.salaryMax ?? null,
              salaryCurrency: body.salaryCurrency ?? null,
              salaryNegotiable: body.salaryNegotiable ?? false,
              industryName: body.industryName ?? null,
              jobRoleName: body.jobRoleName ?? null,
            }),
          },
        ],
        temperature: 0.4,
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: { descriptionHtml?: string; summary?: string };
      try {
        parsed = JSON.parse(raw) as {
          descriptionHtml?: string;
          summary?: string;
        };
      } catch {
        throw new HttpException(
          { error: "Failed to parse AI summary response" },
          502,
        );
      }

      let html =
        typeof parsed.descriptionHtml === "string"
          ? parsed.descriptionHtml.trim()
          : typeof parsed.summary === "string"
            ? parsed.summary.trim()
            : "";

      if (!html) {
        throw new HttpException(
          { error: "AI returned an empty job description" },
          502,
        );
      }

      if (!looksLikeHtml(html)) {
        html = plainTextToHtml(html);
      }

      // `summary` kept for backward compatibility with older clients.
      return { descriptionHtml: html, summary: html };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("AI enhance-draft error:", error);
      throw new HttpException(
        { error: "Failed to create job description" },
        500,
      );
    }
  }

  /** AI-enhance fields for a saved company job (JSON suggestions, not persisted). */
  @Post(":id/enhance")
  async enhance(
    @Param("id") id: string,
    @CurrentMembership() membership: MembershipContext,
    @Body()
    body: {
      title?: string;
      responsibilities?: string;
      requirements?: string;
      benefits?: string;
      skills?: { name: string; required?: boolean }[];
    },
  ) {
    try {
      const job = await this.prisma.job.findFirst({
        where: { id, companyId: membership.companyId },
        include: { skills: true },
      });
      if (!job) {
        throw new HttpException({ error: "Job not found" }, 404);
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new HttpException(
          { error: "OPENAI_API_KEY is not configured" },
          503,
        );
      }

      const title = body.title?.trim() || job.title;
      const responsibilities =
        body.responsibilities?.trim() || job.responsibilities || "";
      const requirements =
        body.requirements?.trim() || job.requirements || "";
      const benefits = body.benefits?.trim() || job.benefits || "";
      const skills =
        body.skills?.map((s) => s.name).filter(Boolean) ??
        job.skills.map((s) => s.name);

      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You improve job descriptions for recruiters. Return JSON only with keys:
title (string, optional polish),
responsibilities (string, improved markdown-friendly paragraphs),
requirements (string),
benefits (string),
suggestedSkills (array of {name: string, required: boolean}),
keywords (string array of searchable keywords),
summary (short one-sentence overview).
Do not invent unrealistic perks. Keep tone professional.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              title,
              responsibilities,
              requirements,
              benefits,
              skills,
              department: job.department,
              employmentType: job.employmentType,
              workMode: job.workMode,
              location: job.location,
              description: job.description,
            }),
          },
        ],
        temperature: 0.4,
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: EnhanceResult;
      try {
        parsed = JSON.parse(raw) as EnhanceResult;
      } catch {
        throw new HttpException(
          { error: "Failed to parse AI enhancement response" },
          502,
        );
      }

      return {
        enhancement: {
          title: parsed.title ?? title,
          responsibilities: parsed.responsibilities ?? responsibilities,
          requirements: parsed.requirements ?? requirements,
          benefits: parsed.benefits ?? benefits,
          suggestedSkills: Array.isArray(parsed.suggestedSkills)
            ? parsed.suggestedSkills
            : [],
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          summary: parsed.summary ?? "",
        },
        applied: false,
        message:
          "Review the suggestions and apply them in the job form. Nothing was overwritten automatically.",
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("AI enhance error:", error);
      throw new HttpException(
        { error: "Failed to enhance job description" },
        500,
      );
    }
  }
}

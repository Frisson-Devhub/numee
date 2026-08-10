import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "../common/guards/session.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { SessionPayload } from "../common/auth";
import { PrismaService } from "../prisma/prisma.service";
import { CandidateJobMatchService } from "./candidate-job-match.service";

type MatchBody = {
  query?: string;
  limit?: number;
};

@Controller("user/jobs")
@UseGuards(SessionGuard)
export class CandidateJobsController {
  constructor(
    private readonly match: CandidateJobMatchService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Assessment embedding → JD vector match → ranked job suggestions.
   * Optional query blends keyword signal into the search vector.
   */
  @Post("match")
  async matchJobs(
    @CurrentUser() user: SessionPayload,
    @Body() body: MatchBody,
  ) {
    try {
      if (!user.id) {
        throw new HttpException({ error: "Unauthorized" }, 401);
      }
      return await this.match.matchJobsForCandidate(
        user.id,
        body.query,
        body.limit ?? 10,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Candidate match jobs error:", error);
      throw new HttpException(
        { error: "Failed to match jobs (check Redis/Qdrant/OpenAI)" },
        503,
      );
    }
  }

  /** Same as POST match; query/limit via query string. */
  @Get("match")
  async matchJobsGet(
    @CurrentUser() user: SessionPayload,
    @Query("query") query?: string,
    @Query("limit") limitParam?: string,
  ) {
    try {
      if (!user.id) {
        throw new HttpException({ error: "Unauthorized" }, 401);
      }
      const limit = limitParam ? Number(limitParam) : 10;
      return await this.match.matchJobsForCandidate(
        user.id,
        query,
        Number.isFinite(limit) ? limit : 10,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Candidate match jobs error:", error);
      throw new HttpException(
        { error: "Failed to match jobs (check Redis/Qdrant/OpenAI)" },
        503,
      );
    }
  }

  /** Active industries for browse filter. */
  @Get("industries")
  async listIndustries() {
    try {
      const industries = await this.match.listActiveIndustries();
      return { industries };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("List industries error:", error);
      throw new HttpException({ error: "Failed to list industries" }, 500);
    }
  }

  /** Applications submitted by the authenticated candidate, newest first. */
  @Get("applications")
  async listApplications(
    @CurrentUser() user: SessionPayload,
    @Query("limit") limitParam?: string,
    @Query("offset") offsetParam?: string,
  ) {
    const candidateId = await this.requireCandidate(user);
    const parsedLimit = Number(limitParam);
    const parsedOffset = Number(offsetParam);
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 50)
        : 20;
    const offset =
      Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const rows = await this.prisma.jobApplication.findMany({
      where: { candidateId },
      orderBy: { appliedAt: "desc" },
      skip: offset,
      take: limit + 1,
      select: {
        id: true,
        status: true,
        appliedAt: true,
        updatedAt: true,
        job: {
          select: {
            id: true,
            title: true,
            status: true,
            location: true,
            workMode: true,
            employmentType: true,
            company: { select: { id: true, name: true, logoUrl: true } },
          },
        },
      },
    });
    const hasMore = rows.length > limit;
    return { applications: rows.slice(0, limit), hasMore, offset, limit };
  }

  /** Published job details, scoped to the authenticated candidate. */
  @Get(":id")
  async getJob(
    @CurrentUser() user: SessionPayload,
    @Param("id") id: string,
  ) {
    const candidateId = await this.requireCandidate(user);
    const job = await this.prisma.job.findFirst({
      where: { id, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        department: true,
        employmentType: true,
        workMode: true,
        location: true,
        experienceMin: true,
        experienceMax: true,
        noticePeriod: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryNegotiable: true,
        description: true,
        responsibilities: true,
        requirements: true,
        benefits: true,
        createdAt: true,
        company: { select: { id: true, name: true, website: true, logoUrl: true, location: true } },
        industry: { select: { id: true, name: true } },
        jobRole: { select: { id: true, name: true } },
        skills: { select: { id: true, name: true, required: true }, orderBy: { name: "asc" } },
        applications: {
          where: { candidateId },
          select: { status: true, appliedAt: true },
          take: 1,
        },
      },
    });

    if (!job) {
      throw new HttpException({ error: "Published job not found" }, 404);
    }

    const application = job.applications[0];
    const { applications, ...details } = job;
    /**
     * When a job description exists it is the candidate-facing source of truth;
     * omit structured role-detail fields so they are not shown separately.
     */
    const hasJobDescription = Boolean(
      details.description
        ?.replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );

    return {
      job: {
        ...details,
        responsibilities: hasJobDescription ? null : details.responsibilities,
        requirements: hasJobDescription ? null : details.requirements,
        benefits: hasJobDescription ? null : details.benefits,
        hasApplied: Boolean(application),
        applicationStatus: application?.status ?? null,
        appliedAt: application?.appliedAt ?? null,
      },
    };
  }

  /** Create a candidate application. Repeated requests are idempotent. */
  @Post(":id/apply")
  async applyToJob(
    @CurrentUser() user: SessionPayload,
    @Param("id") id: string,
  ) {
    const candidateId = await this.requireCandidate(user);
    const job = await this.prisma.job.findFirst({
      where: { id, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!job) {
      throw new HttpException({ error: "Published job not found" }, 404);
    }

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_candidateId: { jobId: job.id, candidateId } },
      select: { id: true, status: true, appliedAt: true },
    });
    if (existing) {
      return { success: true, alreadyApplied: true, application: existing };
    }

    try {
      const application = await this.prisma.jobApplication.create({
        data: { jobId: job.id, candidateId },
        select: { id: true, status: true, appliedAt: true },
      });
      return { success: true, alreadyApplied: false, application };
    } catch (error: unknown) {
      // The unique constraint also covers concurrent double-clicks.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        const application = await this.prisma.jobApplication.findUniqueOrThrow({
          where: { jobId_candidateId: { jobId: job.id, candidateId } },
          select: { id: true, status: true, appliedAt: true },
        });
        return { success: true, alreadyApplied: true, application };
      }
      throw error;
    }
  }

  /** Browse published jobs (optional industry filter). */
  @Get()
  async listJobs(
    @Query("industryId") industryId?: string,
    @Query("limit") limitParam?: string,
    @Query("offset") offsetParam?: string,
  ) {
    try {
      const limit = limitParam ? Number(limitParam) : 20;
      const offset = offsetParam ? Number(offsetParam) : 0;
      return await this.match.listPublishedJobs({
        industryId,
        limit: Number.isFinite(limit) ? limit : 20,
        offset: Number.isFinite(offset) ? offset : 0,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("List published jobs error:", error);
      throw new HttpException({ error: "Failed to list jobs" }, 500);
    }
  }

  private async requireCandidate(user: SessionPayload): Promise<string> {
    if (!user.id) {
      throw new HttpException({ error: "Unauthorized" }, 401);
    }
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (!account) {
      throw new HttpException({ error: "Unauthorized" }, 401);
    }
    if (account.role !== null && account.role !== "STUDENT") {
      throw new HttpException({ error: "Candidate account required" }, 403);
    }
    return user.id;
  }
}

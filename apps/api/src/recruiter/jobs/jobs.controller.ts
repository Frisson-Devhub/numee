import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { JobApplicationStatus, JobStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SessionGuard } from "../../common/guards/session.guard";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentMembership } from "../../common/decorators/current-membership.decorator";
import type { SessionPayload } from "../../common/auth";
import type { MembershipContext } from "../../common/guards/recruiter.guard";
import { EmbeddingsService } from "../embeddings/embeddings.service";

type SkillInput = { name: string; required?: boolean };

type JobBody = {
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
  responsibilities?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  pipelineStages?: unknown;
  skills?: SkillInput[];
  industryId?: string | null;
  jobRoleId?: string | null;
};

const applicationStatuses: JobApplicationStatus[] = [
  "APPLIED",
  "REVIEWING",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
];

const jobInclude = {
  skills: true,
  industry: { select: { id: true, name: true, slug: true } },
  jobRole: { select: { id: true, name: true, slug: true, industryId: true } },
  embedding: {
    select: {
      id: true,
      status: true,
      model: true,
      qdrantPointId: true,
      updatedAt: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      emailOrPhone: true,
    },
  },
} as const;

function mapJobFields(body: JobBody): Prisma.JobUpdateInput {
  const data: Prisma.JobUpdateInput = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.department !== undefined)
    data.department = body.department?.trim() || null;
  if (body.employmentType !== undefined)
    data.employmentType = body.employmentType?.trim() || null;
  if (body.workMode !== undefined)
    data.workMode = body.workMode?.trim() || null;
  if (body.location !== undefined)
    data.location = body.location?.trim() || null;
  if (body.experienceMin !== undefined) data.experienceMin = body.experienceMin;
  if (body.experienceMax !== undefined) data.experienceMax = body.experienceMax;
  if (body.noticePeriod !== undefined)
    data.noticePeriod = body.noticePeriod?.trim() || null;
  if (body.salaryMin !== undefined) data.salaryMin = body.salaryMin;
  if (body.salaryMax !== undefined) data.salaryMax = body.salaryMax;
  if (body.salaryCurrency !== undefined)
    data.salaryCurrency = body.salaryCurrency?.trim() || null;
  if (body.salaryNegotiable !== undefined)
    data.salaryNegotiable = Boolean(body.salaryNegotiable);
  if (body.description !== undefined)
    data.description = body.description?.trim() || null;
  if (body.responsibilities !== undefined)
    data.responsibilities = body.responsibilities?.trim() || null;
  if (body.requirements !== undefined)
    data.requirements = body.requirements?.trim() || null;
  if (body.benefits !== undefined)
    data.benefits = body.benefits?.trim() || null;
  if (body.pipelineStages !== undefined) {
    data.pipelineStages = body.pipelineStages as Prisma.InputJsonValue;
  }
  if (body.industryId !== undefined) {
    data.industry = body.industryId?.trim()
      ? { connect: { id: body.industryId.trim() } }
      : { disconnect: true };
  }
  if (body.jobRoleId !== undefined) {
    data.jobRole = body.jobRoleId?.trim()
      ? { connect: { id: body.jobRoleId.trim() } }
      : { disconnect: true };
  }
  return data;
}

@Controller("recruiter/jobs")
@UseGuards(SessionGuard, RecruiterGuard)
export class JobsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  /** List company jobs (optional status filter). Recruiter session required. */
  @Get()
  async list(
    @CurrentMembership() membership: MembershipContext,
    @Query("status") statusParam?: string,
  ) {
    const status = statusParam?.trim().toUpperCase() as JobStatus | undefined;
    const where: Prisma.JobWhereInput = { companyId: membership.companyId };
    if (
      status === "DRAFT" ||
      status === "PUBLISHED" ||
      status === "CLOSED"
    ) {
      where.status = status;
    }

    const jobs = await this.prisma.job.findMany({
      where,
      include: jobInclude,
      orderBy: { updatedAt: "desc" },
    });
    return { jobs };
  }

  /** Fetch a single job scoped to the caller's company. */
  @Get(":id")
  async get(
    @Param("id") id: string,
    @CurrentMembership() membership: MembershipContext,
  ) {
    const job = await this.prisma.job.findFirst({
      where: { id, companyId: membership.companyId },
      include: jobInclude,
    });
    if (!job) {
      throw new HttpException({ error: "Job not found" }, 404);
    }
    return { job };
  }

  /** Paginated applications for a company job (candidate flags only, not full PII dump). */
  @Get(":id/applications")
  async listApplications(
    @Param("id") id: string,
    @CurrentMembership() membership: MembershipContext,
    @Query("limit") limitParam?: string,
    @Query("offset") offsetParam?: string,
  ) {
    const job = await this.prisma.job.findFirst({
      where: { id, companyId: membership.companyId },
      select: { id: true },
    });
    if (!job) {
      throw new HttpException({ error: "Job not found" }, 404);
    }

    const parsedLimit = Number(limitParam);
    const parsedOffset = Number(offsetParam);
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 50)
        : 20;
    const offset =
      Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    const rows = await this.prisma.jobApplication.findMany({
      where: { jobId: job.id },
      orderBy: { appliedAt: "desc" },
      skip: offset,
      take: limit + 1,
      select: {
        id: true,
        status: true,
        appliedAt: true,
        updatedAt: true,
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            resumeUrl: true,
            assessments: { select: { id: true }, take: 1 },
          },
        },
      },
    });
    const hasMore = rows.length > limit;
    const applications = rows.slice(0, limit).map((application) => ({
      id: application.id,
      status: application.status,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      candidate: {
        id: application.candidate.id,
        firstName: application.candidate.firstName,
        lastName: application.candidate.lastName,
        hasResume: Boolean(application.candidate.resumeUrl?.trim()),
        hasAssessment: application.candidate.assessments.length > 0,
      },
    }));
    return { applications, hasMore, offset, limit };
  }

  /** Update application status and write activity log. */
  @Patch(":id/applications/:applicationId")
  async updateApplicationStatus(
    @Param("id") id: string,
    @Param("applicationId") applicationId: string,
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
    @Body() body: { status?: string },
  ) {
    const status = body.status?.trim().toUpperCase() as
      | JobApplicationStatus
      | undefined;
    if (!status || !applicationStatuses.includes(status)) {
      throw new HttpException({ error: "Invalid application status" }, 400);
    }

    const job = await this.prisma.job.findFirst({
      where: { id, companyId: membership.companyId },
      select: { id: true },
    });
    if (!job) {
      throw new HttpException({ error: "Job not found" }, 404);
    }
    const application = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, jobId: job.id },
      select: { id: true },
    });
    if (!application) {
      throw new HttpException({ error: "Application not found" }, 404);
    }

    const updated = await this.prisma.jobApplication.update({
      where: { id: application.id },
      data: { status },
      select: { id: true, status: true, appliedAt: true, updatedAt: true },
    });
    if (user.id) {
      await this.prisma.activityLog.create({
        data: {
          companyId: membership.companyId,
          actorId: user.id,
          action: "job_application.status_updated",
          metadata: { jobId: job.id, applicationId: application.id, status },
        },
      });
    }
    return { application: updated };
  }

  /** Create a DRAFT job for the company; logs job.created. */
  @Post()
  async create(
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
    @Body() body: JobBody,
  ) {
    try {
      const title = body.title?.trim();
      if (!title) {
        throw new HttpException({ error: "Job title is required" }, 400);
      }
      if (!user.id) {
        throw new HttpException({ error: "Unauthorized" }, 401);
      }

      const skills = (body.skills ?? [])
        .map((s) => ({
          name: s.name?.trim(),
          required: s.required !== false,
        }))
        .filter((s) => s.name);

      const industryId = body.industryId?.trim() || null;
      const jobRoleId = body.jobRoleId?.trim() || null;
      if (industryId) {
        const industry = await this.prisma.industry.findFirst({
          where: { id: industryId, isActive: true },
        });
        if (!industry) {
          throw new HttpException({ error: "Invalid industryId" }, 400);
        }
      }
      if (jobRoleId) {
        const role = await this.prisma.jobRole.findFirst({
          where: { id: jobRoleId, isActive: true },
        });
        if (!role) {
          throw new HttpException({ error: "Invalid jobRoleId" }, 400);
        }
      }

      const job = await this.prisma.job.create({
        data: {
          companyId: membership.companyId,
          createdById: user.id,
          industryId,
          jobRoleId,
          title,
          department: body.department?.trim() || null,
          employmentType: body.employmentType?.trim() || null,
          workMode: body.workMode?.trim() || null,
          location: body.location?.trim() || null,
          experienceMin: body.experienceMin ?? null,
          experienceMax: body.experienceMax ?? null,
          noticePeriod: body.noticePeriod?.trim() || null,
          salaryMin: body.salaryMin ?? null,
          salaryMax: body.salaryMax ?? null,
          salaryCurrency: body.salaryCurrency?.trim() || null,
          salaryNegotiable: Boolean(body.salaryNegotiable),
          description: body.description?.trim() || null,
          responsibilities: body.responsibilities?.trim() || null,
          requirements: body.requirements?.trim() || null,
          benefits: body.benefits?.trim() || null,
          pipelineStages:
            (body.pipelineStages as Prisma.InputJsonValue) ?? undefined,
          status: "DRAFT",
          skills: skills.length
            ? { create: skills.map((s) => ({ name: s.name!, required: s.required })) }
            : undefined,
        },
        include: jobInclude,
      });

      await this.prisma.activityLog.create({
        data: {
          companyId: membership.companyId,
          actorId: user.id,
          action: "job.created",
          metadata: { jobId: job.id, title: job.title },
        },
      });

      return { job };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Create job error:", error);
      throw new HttpException({ error: "Failed to create job" }, 500);
    }
  }

  /** Update a non-closed job; re-embeds when status is already PUBLISHED. */
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
    @Body() body: JobBody,
  ) {
    try {
      const existing = await this.prisma.job.findFirst({
        where: { id, companyId: membership.companyId },
      });
      if (!existing) {
        throw new HttpException({ error: "Job not found" }, 404);
      }
      if (existing.status === "CLOSED") {
        throw new HttpException(
          { error: "Closed jobs cannot be edited" },
          400,
        );
      }

      const data = mapJobFields(body);
      if (body.title !== undefined && !body.title.trim()) {
        throw new HttpException({ error: "Job title is required" }, 400);
      }
      if (body.industryId?.trim()) {
        const industry = await this.prisma.industry.findFirst({
          where: { id: body.industryId.trim(), isActive: true },
        });
        if (!industry) {
          throw new HttpException({ error: "Invalid industryId" }, 400);
        }
      }
      if (body.jobRoleId?.trim()) {
        const role = await this.prisma.jobRole.findFirst({
          where: { id: body.jobRoleId.trim(), isActive: true },
        });
        if (!role) {
          throw new HttpException({ error: "Invalid jobRoleId" }, 400);
        }
      }

      const job = await this.prisma.$transaction(async (tx) => {
        if (body.skills !== undefined) {
          await tx.jobSkill.deleteMany({ where: { jobId: id } });
          const skills = body.skills
            .map((s) => ({
              name: s.name?.trim(),
              required: s.required !== false,
            }))
            .filter((s) => s.name);
          if (skills.length) {
            await tx.jobSkill.createMany({
              data: skills.map((s) => ({
                jobId: id,
                name: s.name!,
                required: s.required,
              })),
            });
          }
        }

        return tx.job.update({
          where: { id },
          data,
          include: jobInclude,
        });
      });

      if (user.id) {
        await this.prisma.activityLog.create({
          data: {
            companyId: membership.companyId,
            actorId: user.id,
            action: "job.updated",
            metadata: { jobId: job.id },
          },
        });
      }

      // Re-embed if already published
      if (job.status === "PUBLISHED") {
        await this.embeddings.enqueueJobEmbedding(
          job.id,
          membership.companyId,
        );
      }

      return { job };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Update job error:", error);
      throw new HttpException({ error: "Failed to update job" }, 500);
    }
  }

  /** Publish job and enqueue JD embedding for vector search. */
  @Post(":id/publish")
  async publish(
    @Param("id") id: string,
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
  ) {
    try {
      const existing = await this.prisma.job.findFirst({
        where: { id, companyId: membership.companyId },
      });
      if (!existing) {
        throw new HttpException({ error: "Job not found" }, 404);
      }
      if (!existing.title?.trim()) {
        throw new HttpException({ error: "Job title is required to publish" }, 400);
      }

      const job = await this.prisma.job.update({
        where: { id },
        data: { status: "PUBLISHED" },
        include: jobInclude,
      });

      await this.embeddings.enqueueJobEmbedding(job.id, membership.companyId);

      if (user.id) {
        await this.prisma.activityLog.create({
          data: {
            companyId: membership.companyId,
            actorId: user.id,
            action: "job.published",
            metadata: { jobId: job.id, title: job.title },
          },
        });
      }

      return { job };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Publish job error:", error);
      throw new HttpException({ error: "Failed to publish job" }, 500);
    }
  }

  /** Mark job CLOSED (does not delete embeddings). */
  @Post(":id/close")
  async close(
    @Param("id") id: string,
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
  ) {
    try {
      const existing = await this.prisma.job.findFirst({
        where: { id, companyId: membership.companyId },
      });
      if (!existing) {
        throw new HttpException({ error: "Job not found" }, 404);
      }

      const job = await this.prisma.job.update({
        where: { id },
        data: { status: "CLOSED" },
        include: jobInclude,
      });

      if (user.id) {
        await this.prisma.activityLog.create({
          data: {
            companyId: membership.companyId,
            actorId: user.id,
            action: "job.closed",
            metadata: { jobId: job.id, title: job.title },
          },
        });
      }

      return { job };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Close job error:", error);
      throw new HttpException({ error: "Failed to close job" }, 500);
    }
  }

  /** Embedding status for a company job (null if never enqueued). */
  @Get(":id/embedding")
  async embeddingStatus(
    @Param("id") id: string,
    @CurrentMembership() membership: MembershipContext,
  ) {
    const embedding = await this.embeddings.getStatus(
      id,
      membership.companyId,
    );
    if (!embedding) {
      const job = await this.prisma.job.findFirst({
        where: { id, companyId: membership.companyId },
        select: { id: true },
      });
      if (!job) {
        throw new HttpException({ error: "Job not found" }, 404);
      }
      return { embedding: null };
    }
    return { embedding };
  }

  /** Delete draft/closed jobs only; published jobs must be closed first. */
  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
  ) {
    try {
      const existing = await this.prisma.job.findFirst({
        where: { id, companyId: membership.companyId },
      });
      if (!existing) {
        throw new HttpException({ error: "Job not found" }, 404);
      }
      if (existing.status === "PUBLISHED") {
        throw new HttpException(
          { error: "Close the job before deleting, or keep it closed" },
          400,
        );
      }

      await this.prisma.job.delete({ where: { id } });

      if (user.id) {
        await this.prisma.activityLog.create({
          data: {
            companyId: membership.companyId,
            actorId: user.id,
            action: "job.deleted",
            metadata: { jobId: id, title: existing.title },
          },
        });
      }

      return { message: "Job deleted" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Delete job error:", error);
      throw new HttpException({ error: "Failed to delete job" }, 500);
    }
  }
}

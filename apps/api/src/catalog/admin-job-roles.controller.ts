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
import { PrismaService } from "../prisma/prisma.service";
import { SessionGuard } from "../common/guards/session.guard";
import { AdminGuard } from "../common/guards/admin.guard";
import { CatalogEmbeddingsService } from "./catalog-embeddings.service";
import { slugify } from "./slug";
import {
  QDRANT_JOB_ROLES_COLLECTION,
  QdrantService,
} from "../qdrant/qdrant.module";

type JobRoleBody = {
  name?: string;
  slug?: string;
  description?: string | null;
  industryId?: string | null;
  isActive?: boolean;
};

@Controller("admin/job-roles")
@UseGuards(SessionGuard, AdminGuard)
export class AdminJobRolesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: CatalogEmbeddingsService,
    private readonly qdrant: QdrantService,
  ) {}

  /** List job roles (active by default; optional industry filter). Admin only. */
  @Get()
  async list(
    @Query("industryId") industryId?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    const jobRoles = await this.prisma.jobRole.findMany({
      where: {
        ...(includeInactive === "true" || includeInactive === "1"
          ? {}
          : { isActive: true }),
        ...(industryId?.trim() ? { industryId: industryId.trim() } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        industry: { select: { id: true, name: true, slug: true } },
        _count: { select: { jobs: true } },
      },
    });
    return { jobRoles };
  }

  /** Job role detail with industry and job count. */
  @Get(":id")
  async get(@Param("id") id: string) {
    const jobRole = await this.prisma.jobRole.findUnique({
      where: { id },
      include: {
        industry: { select: { id: true, name: true, slug: true } },
        _count: { select: { jobs: true } },
      },
    });
    if (!jobRole) {
      throw new HttpException({ error: "Job role not found" }, 404);
    }
    return { jobRole };
  }

  /** Create job role and enqueue catalog embedding. */
  @Post()
  async create(@Body() body: JobRoleBody) {
    const name = body.name?.trim();
    if (!name) {
      throw new HttpException({ error: "name is required" }, 400);
    }
    const slug = (body.slug?.trim() || slugify(name)).toLowerCase();
    if (!slug) {
      throw new HttpException({ error: "slug is required" }, 400);
    }

    const industryId = body.industryId?.trim() || null;
    if (industryId) {
      const industry = await this.prisma.industry.findUnique({
        where: { id: industryId },
      });
      if (!industry) {
        throw new HttpException({ error: "Industry not found" }, 400);
      }
    }

    try {
      const jobRole = await this.prisma.jobRole.create({
        data: {
          name,
          slug,
          description: body.description?.trim() || null,
          industryId,
          isActive: body.isActive !== false,
          embeddingStatus: "PENDING",
        },
        include: {
          industry: { select: { id: true, name: true, slug: true } },
        },
      });
      await this.embeddings.enqueueJobRoleEmbedding(jobRole.id);
      return { jobRole };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw new HttpException(
          { error: "Job role slug already exists" },
          409,
        );
      }
      console.error("Create job role error:", err);
      throw new HttpException({ error: "Failed to create job role" }, 500);
    }
  }

  /** Update job role; re-embeds when text/industry fields change. */
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: JobRoleBody) {
    const existing = await this.prisma.jobRole.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ error: "Job role not found" }, 404);
    }

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      industryId?: string | null;
      isActive?: boolean;
    } = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new HttpException({ error: "name is required" }, 400);
      data.name = name;
    }
    if (body.slug !== undefined) {
      const slug =
        body.slug.trim().toLowerCase() ||
        slugify(data.name ?? existing.name);
      if (!slug) throw new HttpException({ error: "slug is required" }, 400);
      data.slug = slug;
    } else if (data.name) {
      data.slug = slugify(data.name);
    }
    if (body.description !== undefined) {
      data.description = body.description?.trim() || null;
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.industryId !== undefined) {
      const industryId = body.industryId?.trim() || null;
      if (industryId) {
        const industry = await this.prisma.industry.findUnique({
          where: { id: industryId },
        });
        if (!industry) {
          throw new HttpException({ error: "Industry not found" }, 400);
        }
      }
      data.industryId = industryId;
    }

    try {
      const jobRole = await this.prisma.jobRole.update({
        where: { id },
        data,
        include: {
          industry: { select: { id: true, name: true, slug: true } },
        },
      });
      const textChanged =
        data.name !== undefined ||
        data.description !== undefined ||
        data.slug !== undefined ||
        data.industryId !== undefined;
      if (textChanged) {
        await this.embeddings.enqueueJobRoleEmbedding(jobRole.id);
      }
      return { jobRole };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw new HttpException(
          { error: "Job role slug already exists" },
          409,
        );
      }
      console.error("Update job role error:", err);
      throw new HttpException({ error: "Failed to update job role" }, 500);
    }
  }

  /** Delete job role and its Qdrant point when present. */
  @Delete(":id")
  async remove(@Param("id") id: string) {
    const existing = await this.prisma.jobRole.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ error: "Job role not found" }, 404);
    }

    if (existing.qdrantPointId) {
      try {
        await this.qdrant.deletePoint(
          QDRANT_JOB_ROLES_COLLECTION,
          existing.qdrantPointId,
        );
      } catch (err) {
        console.warn("Failed to delete job role Qdrant point:", err);
      }
    }

    await this.prisma.jobRole.delete({ where: { id } });
    return { message: "Job role deleted" };
  }
}

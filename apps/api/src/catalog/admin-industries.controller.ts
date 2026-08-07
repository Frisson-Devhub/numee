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
  QDRANT_INDUSTRIES_COLLECTION,
  QdrantService,
} from "../qdrant/qdrant.module";

type IndustryBody = {
  name?: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
};

@Controller("admin/industries")
@UseGuards(SessionGuard, AdminGuard)
export class AdminIndustriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: CatalogEmbeddingsService,
    private readonly qdrant: QdrantService,
  ) {}

  /** List industries (active by default). Admin only. */
  @Get()
  async list(@Query("includeInactive") includeInactive?: string) {
    const industries = await this.prisma.industry.findMany({
      where:
        includeInactive === "true" || includeInactive === "1"
          ? undefined
          : { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { jobRoles: true, jobs: true } },
      },
    });
    return { industries };
  }

  /** Industry detail with roles and job count. */
  @Get(":id")
  async get(@Param("id") id: string) {
    const industry = await this.prisma.industry.findUnique({
      where: { id },
      include: {
        jobRoles: { orderBy: { name: "asc" } },
        _count: { select: { jobs: true } },
      },
    });
    if (!industry) {
      throw new HttpException({ error: "Industry not found" }, 404);
    }
    return { industry };
  }

  /** Create industry and enqueue catalog embedding. */
  @Post()
  async create(@Body() body: IndustryBody) {
    const name = body.name?.trim();
    if (!name) {
      throw new HttpException({ error: "name is required" }, 400);
    }
    const slug = (body.slug?.trim() || slugify(name)).toLowerCase();
    if (!slug) {
      throw new HttpException({ error: "slug is required" }, 400);
    }

    try {
      const industry = await this.prisma.industry.create({
        data: {
          name,
          slug,
          description: body.description?.trim() || null,
          isActive: body.isActive !== false,
          embeddingStatus: "PENDING",
        },
      });
      await this.embeddings.enqueueIndustryEmbedding(industry.id);
      return { industry };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw new HttpException(
          { error: "Industry name or slug already exists" },
          409,
        );
      }
      console.error("Create industry error:", err);
      throw new HttpException({ error: "Failed to create industry" }, 500);
    }
  }

  /** Update industry; re-embeds when text/slug fields change. */
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: IndustryBody) {
    const existing = await this.prisma.industry.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ error: "Industry not found" }, 404);
    }

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new HttpException({ error: "name is required" }, 400);
      data.name = name;
    }
    if (body.slug !== undefined) {
      const slug = body.slug.trim().toLowerCase() || slugify(data.name ?? existing.name);
      if (!slug) throw new HttpException({ error: "slug is required" }, 400);
      data.slug = slug;
    } else if (data.name) {
      data.slug = slugify(data.name);
    }
    if (body.description !== undefined) {
      data.description = body.description?.trim() || null;
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    try {
      const industry = await this.prisma.industry.update({
        where: { id },
        data,
      });
      const textChanged =
        data.name !== undefined ||
        data.description !== undefined ||
        data.slug !== undefined;
      if (textChanged) {
        await this.embeddings.enqueueIndustryEmbedding(industry.id);
      }
      return { industry };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw new HttpException(
          { error: "Industry name or slug already exists" },
          409,
        );
      }
      console.error("Update industry error:", err);
      throw new HttpException({ error: "Failed to update industry" }, 500);
    }
  }

  /** Delete industry and its Qdrant point when present. */
  @Delete(":id")
  async remove(@Param("id") id: string) {
    const existing = await this.prisma.industry.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ error: "Industry not found" }, 404);
    }

    if (existing.qdrantPointId) {
      try {
        await this.qdrant.deletePoint(
          QDRANT_INDUSTRIES_COLLECTION,
          existing.qdrantPointId,
        );
      } catch (err) {
        console.warn("Failed to delete industry Qdrant point:", err);
      }
    }

    await this.prisma.industry.delete({ where: { id } });
    return { message: "Industry deleted" };
  }
}

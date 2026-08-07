import {
  Body,
  Controller,
  Get,
  HttpException,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CloudinaryService } from "../../cloudinary/cloudinary.module";
import { SessionGuard } from "../../common/guards/session.guard";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";
import { OwnerGuard } from "../../common/guards/owner.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentMembership } from "../../common/decorators/current-membership.decorator";
import type { SessionPayload } from "../../common/auth";
import type { MembershipContext } from "../../common/guards/recruiter.guard";

@Controller("recruiter/company")
@UseGuards(SessionGuard, RecruiterGuard)
export class CompanyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Company profile for the caller's membership. */
  @Get()
  async get(@CurrentMembership() membership: MembershipContext) {
    const company = await this.prisma.company.findUnique({
      where: { id: membership.companyId },
    });
    if (!company) {
      throw new HttpException({ error: "Company not found" }, 404);
    }
    return { company, membershipRole: membership.role };
  }

  /** Owner-only company profile update; logs company.updated. */
  @Patch()
  @UseGuards(OwnerGuard)
  async update(
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
    @Body()
    body: {
      name?: string;
      website?: string | null;
      industry?: string | null;
      size?: string | null;
      description?: string | null;
      location?: string | null;
      hiringCategories?: unknown;
    },
  ) {
    try {
      const data: Prisma.CompanyUpdateInput = {};
      if (body.name !== undefined) {
        const name = body.name?.trim();
        if (!name) {
          throw new HttpException({ error: "Company name is required" }, 400);
        }
        data.name = name;
      }
      if (body.website !== undefined) data.website = body.website?.trim() || null;
      if (body.industry !== undefined)
        data.industry = body.industry?.trim() || null;
      if (body.size !== undefined) data.size = body.size?.trim() || null;
      if (body.description !== undefined)
        data.description = body.description?.trim() || null;
      if (body.location !== undefined)
        data.location = body.location?.trim() || null;
      if (body.hiringCategories !== undefined) {
        data.hiringCategories = body.hiringCategories as Prisma.InputJsonValue;
      }

      const company = await this.prisma.company.update({
        where: { id: membership.companyId },
        data,
      });

      if (user.id) {
        await this.prisma.activityLog.create({
          data: {
            companyId: membership.companyId,
            actorId: user.id,
            action: "company.updated",
            metadata: { fields: Object.keys(data) },
          },
        });
      }

      return { company };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Company update error:", error);
      throw new HttpException({ error: "Failed to update company" }, 500);
    }
  }

  /** Owner-only logo upload to Cloudinary; updates company.logoUrl. */
  @Post("logo")
  @UseGuards(OwnerGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadLogo(
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!this.cloudinary.isConfigured()) {
      throw new HttpException({ error: "Cloudinary is not configured" }, 503);
    }
    if (!file) {
      throw new HttpException(
        { error: "Missing or invalid file. Use field name 'file'." },
        400,
      );
    }

    try {
      const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "png";
      const publicId = `${randomUUID()}.${ext}`;
      const { url } = await this.cloudinary.uploadImage(
        {
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname,
          size: file.size,
        },
        publicId,
        `companies/${membership.companyId}`,
      );

      const company = await this.prisma.company.update({
        where: { id: membership.companyId },
        data: { logoUrl: url },
      });

      if (user.id) {
        await this.prisma.activityLog.create({
          data: {
            companyId: membership.companyId,
            actorId: user.id,
            action: "company.logo_updated",
          },
        });
      }

      return { company };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const err = error as Error;
      if (
        err.message?.includes("Invalid file type") ||
        err.message?.includes("File size")
      ) {
        throw new HttpException({ error: err.message }, 400);
      }
      console.error("Logo upload error:", error);
      throw new HttpException({ error: "Failed to upload logo" }, 500);
    }
  }
}

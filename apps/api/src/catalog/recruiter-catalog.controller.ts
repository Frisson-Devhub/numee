import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SessionGuard } from "../common/guards/session.guard";
import { RecruiterGuard } from "../common/guards/recruiter.guard";

@Controller("recruiter/catalog")
@UseGuards(SessionGuard, RecruiterGuard)
export class RecruiterCatalogController {
  constructor(private readonly prisma: PrismaService) {}

  /** Active industries for job form pickers. */
  @Get("industries")
  async industries() {
    const industries = await this.prisma.industry.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });
    return { industries };
  }

  /** Active job roles, optionally filtered by industry. */
  @Get("job-roles")
  async jobRoles(@Query("industryId") industryId?: string) {
    const jobRoles = await this.prisma.jobRole.findMany({
      where: {
        isActive: true,
        ...(industryId?.trim() ? { industryId: industryId.trim() } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        industryId: true,
      },
    });
    return { jobRoles };
  }
}

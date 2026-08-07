import { Controller, Get, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SessionGuard } from "../../common/guards/session.guard";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";
import { CurrentMembership } from "../../common/decorators/current-membership.decorator";
import type { MembershipContext } from "../../common/guards/recruiter.guard";

@Controller("recruiter/dashboard")
@UseGuards(SessionGuard, RecruiterGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /** Job counts, stubbed metrics, and recent activity for the company. */
  @Get()
  async get(@CurrentMembership() membership: MembershipContext) {
    const companyId = membership.companyId;

    const [activeJobs, draftJobs, closedJobs, activity] = await Promise.all([
      this.prisma.job.count({
        where: { companyId, status: "PUBLISHED" },
      }),
      this.prisma.job.count({
        where: { companyId, status: "DRAFT" },
      }),
      this.prisma.job.count({
        where: { companyId, status: "CLOSED" },
      }),
      this.prisma.activityLog.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              emailOrPhone: true,
            },
          },
        },
      }),
    ]);

    return {
      cards: {
        activeJobs,
        draftJobs,
        closedJobs,
        applications: 0,
        aiMatchedCandidates: 0,
      },
      stubs: {
        applications: {
          available: false,
          message: "Applications tracking coming soon",
        },
        matching: {
          available: false,
          message: "AI candidate matching coming soon",
        },
        outreach: {
          available: false,
          message: "Automated outreach coming soon",
        },
      },
      activity,
    };
  }
}

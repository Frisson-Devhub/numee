import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { CompanyMemberRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedRequest } from "./session.guard";

/** Company membership attached by RecruiterGuard for scoped recruiter routes. */
export type MembershipContext = {
  id: string;
  companyId: string;
  role: CompanyMemberRole;
};

/** Authenticated recruiter request with company membership context. */
export type RecruiterRequest = AuthenticatedRequest & {
  membership: MembershipContext;
};

/** Require RECRUITER role and attach the first company membership to `req`. */
@Injectable()
export class RecruiterGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RecruiterRequest>();
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException({ error: "Unauthorized" });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        companyMemberships: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { id: true, companyId: true, role: true },
        },
      },
    });

    const membership = user?.companyMemberships[0];
    if (!user || user.role !== "RECRUITER" || !membership) {
      throw new ForbiddenException({ error: "Recruiter access required" });
    }

    req.membership = membership;
    return true;
  }
}

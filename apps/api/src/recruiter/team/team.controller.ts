import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import type { CompanyMemberRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../../mail/mail.module";
import { SessionGuard } from "../../common/guards/session.guard";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";
import { OwnerGuard } from "../../common/guards/owner.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentMembership } from "../../common/decorators/current-membership.decorator";
import { signSession, verifySession } from "../../common/auth";
import {
  PORTAL_SESSION_COOKIES,
  setPortalSessionCookie,
} from "../../common/cookies/session-cookie";
import type { SessionPayload } from "../../common/auth";
import type { MembershipContext } from "../../common/guards/recruiter.guard";

const MAX_RECRUITERS = 3;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SALT_ROUNDS = 10;

function recruiterBaseUrl(): string {
  return (process.env.RECRUITER_URL ?? "http://localhost:3003").replace(
    /\/$/,
    "",
  );
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

@Controller("recruiter/team")
export class TeamController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private async countRecruiters(companyId: string): Promise<number> {
    return this.prisma.companyMember.count({
      where: { companyId, role: "RECRUITER" },
    });
  }

  private async countPendingRecruiterInvites(
    companyId: string,
  ): Promise<number> {
    return this.prisma.invitation.count({
      where: {
        companyId,
        role: "RECRUITER",
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });
  }

  /** Members, pending invites, and recruiter seat limits for the company. */
  @Get()
  @UseGuards(SessionGuard, RecruiterGuard)
  async list(@CurrentMembership() membership: MembershipContext) {
    const [members, invitations] = await Promise.all([
      this.prisma.companyMember.findMany({
        where: { companyId: membership.companyId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              emailOrPhone: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.invitation.findMany({
        where: {
          companyId: membership.companyId,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      members,
      invitations,
      limits: {
        maxRecruiters: MAX_RECRUITERS,
        recruiterCount: members.filter((m) => m.role === "RECRUITER").length,
      },
    };
  }

  /** Owner invite: create PENDING invitation, email link; enforces recruiter cap. */
  @Post("invite")
  @UseGuards(SessionGuard, RecruiterGuard, OwnerGuard)
  async invite(
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
    @Body() body: { email?: string; role?: CompanyMemberRole },
  ) {
    try {
      const email = body.email ? normalizeEmail(body.email) : "";
      if (!email || !email.includes("@")) {
        throw new HttpException({ error: "A valid email is required" }, 400);
      }

      const role: CompanyMemberRole =
        body.role === "OWNER" ? "OWNER" : "RECRUITER";
      if (role === "OWNER") {
        throw new HttpException(
          {
            error:
              "Cannot invite another owner. Transfer ownership separately.",
          },
          400,
        );
      }

      const existingMember = await this.prisma.companyMember.findFirst({
        where: {
          companyId: membership.companyId,
          user: { emailOrPhone: email },
        },
      });
      if (existingMember) {
        throw new HttpException(
          { error: "User is already a member of this company" },
          409,
        );
      }

      const [recruiterCount, pendingCount] = await Promise.all([
        this.countRecruiters(membership.companyId),
        this.countPendingRecruiterInvites(membership.companyId),
      ]);
      if (recruiterCount + pendingCount >= MAX_RECRUITERS) {
        throw new HttpException(
          {
            error: `Company may have at most ${MAX_RECRUITERS} recruiter seats (pending invites count toward the limit).`,
          },
          400,
        );
      }

      await this.prisma.invitation.updateMany({
        where: {
          companyId: membership.companyId,
          email,
          status: "PENDING",
        },
        data: { status: "REVOKED" },
      });

      const token = randomBytes(32).toString("hex");
      const invitation = await this.prisma.invitation.create({
        data: {
          companyId: membership.companyId,
          email,
          role,
          token,
          status: "PENDING",
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      });

      const company = await this.prisma.company.findUnique({
        where: { id: membership.companyId },
        select: { name: true },
      });

      const inviteUrl = `${recruiterBaseUrl()}/invite/${token}`;
      await this.mail.sendInvitationEmail(
        email,
        company?.name ?? "a company",
        inviteUrl,
      );

      if (user.id) {
        await this.prisma.activityLog.create({
          data: {
            companyId: membership.companyId,
            actorId: user.id,
            action: "team.invited",
            metadata: { email, role },
          },
        });
      }

      return {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Invite error:", error);
      throw new HttpException({ error: "Failed to send invitation" }, 500);
    }
  }

  /** Public invite preview; reports whether the current session matches invite email. */
  @Get("invite/:token")
  async getInvite(@Param("token") token: string, @Req() req: Request) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        company: { select: { id: true, name: true, logoUrl: true } },
      },
    });
    if (!invitation) {
      throw new HttpException({ error: "Invitation not found" }, 404);
    }
    if (invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
      throw new HttpException(
        { error: "Invitation is no longer valid", status: invitation.status },
        410,
      );
    }

    const inviteEmail = normalizeEmail(invitation.email);
    const cookieToken = req.cookies?.[
      PORTAL_SESSION_COOKIES.recruiter
    ] as string | undefined;
    const session = cookieToken ? verifySession(cookieToken) : null;
    let signedInEmail: string | null = null;
    let sessionMatchesInvite = false;
    if (session?.id) {
      const sessionUser = await this.prisma.user.findUnique({
        where: { id: session.id },
        select: { emailOrPhone: true },
      });
      if (sessionUser) {
        signedInEmail = normalizeEmail(sessionUser.emailOrPhone);
        sessionMatchesInvite = signedInEmail === inviteEmail;
      }
    }

    return {
      email: inviteEmail,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      company: invitation.company,
      signedInEmail,
      sessionMatchesInvite,
    };
  }

  /** Accept invite: create/reuse user, add membership, set session cookie. */
  @Post("invite/:token/accept")
  async acceptInvite(
    @Param("token") token: string,
    @Req() req: Request,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      password?: string;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const invitation = await this.prisma.invitation.findUnique({
        where: { token },
        include: { company: true },
      });
      if (
        !invitation ||
        invitation.status !== "PENDING" ||
        invitation.expiresAt < new Date()
      ) {
        throw new HttpException(
          { error: "Invitation is invalid or expired" },
          410,
        );
      }

      const inviteEmail = normalizeEmail(invitation.email);
      const cookieToken = req.cookies?.[
        PORTAL_SESSION_COOKIES.recruiter
      ] as string | undefined;
      const session = cookieToken ? verifySession(cookieToken) : null;

      const sessionUser = session?.id
        ? await this.prisma.user.findUnique({ where: { id: session.id } })
        : null;

      // Only reuse the session when it belongs to the invited email.
      // A mismatched session (e.g. owner testing the invite link) must not
      // block signup/accept for the invitee.
      const sessionMatchesInvite = Boolean(
        sessionUser &&
          normalizeEmail(sessionUser.emailOrPhone) === inviteEmail,
      );

      let user = sessionMatchesInvite ? sessionUser : null;

      if (!user) {
        const existingByEmail = await this.prisma.user.findFirst({
          where: {
            emailOrPhone: { equals: inviteEmail, mode: "insensitive" },
          },
        });
        if (existingByEmail) {
          user = existingByEmail;
        } else {
          const firstName = body.firstName?.trim();
          const lastName = body.lastName?.trim();
          const password = body.password;
          if (!firstName || !lastName) {
            throw new HttpException(
              { error: "First name and last name are required to join" },
              400,
            );
          }
          if (!password || password.length < 8) {
            throw new HttpException(
              { error: "Password must be at least 8 characters" },
              400,
            );
          }
          const passwordHash = await hash(password, SALT_ROUNDS);
          user = await this.prisma.user.create({
            data: {
              firstName,
              lastName,
              emailOrPhone: inviteEmail,
              passwordHash,
              role: "RECRUITER",
            },
          });
        }
      }

      if (normalizeEmail(user.emailOrPhone) !== inviteEmail) {
        throw new HttpException(
          {
            error: "Signed-in email does not match the invitation",
            code: "EMAIL_MISMATCH",
            signedInEmail: normalizeEmail(user.emailOrPhone),
            inviteEmail,
          },
          403,
        );
      }

      const already = await this.prisma.companyMember.findUnique({
        where: {
          companyId_userId: {
            companyId: invitation.companyId,
            userId: user.id,
          },
        },
      });
      if (already) {
        throw new HttpException(
          { error: "You are already a member of this company" },
          409,
        );
      }

      if (invitation.role === "RECRUITER") {
        const recruiterCount = await this.countRecruiters(invitation.companyId);
        if (recruiterCount >= MAX_RECRUITERS) {
          throw new HttpException(
            {
              error: `Company already has the maximum of ${MAX_RECRUITERS} recruiters`,
            },
            400,
          );
        }
      }

      const userId = user.id;
      await this.prisma.$transaction(async (tx) => {
        await tx.companyMember.create({
          data: {
            companyId: invitation.companyId,
            userId,
            role: invitation.role,
          },
        });
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        });
        await tx.user.update({
          where: { id: userId },
          data: { role: "RECRUITER" },
        });
        await tx.activityLog.create({
          data: {
            companyId: invitation.companyId,
            actorId: userId,
            action: "team.joined",
            metadata: { email: inviteEmail, role: invitation.role },
          },
        });
      });

      const newSession = signSession({
        id: user.id,
        email: normalizeEmail(user.emailOrPhone),
      });
      setPortalSessionCookie(res, "recruiter", newSession);

      return {
        message: "Invitation accepted",
        redirectTo: "recruiter-dashboard",
        company: {
          id: invitation.company.id,
          name: invitation.company.name,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Accept invite error:", error);
      throw new HttpException({ error: "Failed to accept invitation" }, 500);
    }
  }

  /** Owner removes a non-owner member (cannot remove self). */
  @Delete("members/:memberId")
  @UseGuards(SessionGuard, RecruiterGuard, OwnerGuard)
  async removeMember(
    @Param("memberId") memberId: string,
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
  ) {
    try {
      const member = await this.prisma.companyMember.findFirst({
        where: { id: memberId, companyId: membership.companyId },
      });
      if (!member) {
        throw new HttpException({ error: "Member not found" }, 404);
      }
      if (member.role === "OWNER") {
        throw new HttpException({ error: "Cannot remove the owner" }, 400);
      }
      if (member.userId === user.id) {
        throw new HttpException({ error: "Cannot remove yourself" }, 400);
      }

      await this.prisma.companyMember.delete({ where: { id: member.id } });

      if (user.id) {
        await this.prisma.activityLog.create({
          data: {
            companyId: membership.companyId,
            actorId: user.id,
            action: "team.removed",
            metadata: { memberId: member.id, userId: member.userId },
          },
        });
      }

      return { message: "Member removed" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Remove member error:", error);
      throw new HttpException({ error: "Failed to remove member" }, 500);
    }
  }

  /** Owner changes member role; ownership transfer is handled carefully in-body. */
  @Patch("members/:memberId/role")
  @UseGuards(SessionGuard, RecruiterGuard, OwnerGuard)
  async assignRole(
    @Param("memberId") memberId: string,
    @CurrentMembership() membership: MembershipContext,
    @CurrentUser() user: SessionPayload,
    @Body() body: { role?: CompanyMemberRole },
  ) {
    try {
      const role = body.role;
      if (role !== "OWNER" && role !== "RECRUITER") {
        throw new HttpException({ error: "Invalid role" }, 400);
      }

      const member = await this.prisma.companyMember.findFirst({
        where: { id: memberId, companyId: membership.companyId },
      });
      if (!member) {
        throw new HttpException({ error: "Member not found" }, 404);
      }
      if (member.role === "OWNER" && role !== "OWNER") {
        throw new HttpException(
          { error: "Cannot demote the sole owner via this endpoint" },
          400,
        );
      }

      if (role === "OWNER" && member.role !== "OWNER") {
        const recruiterCount = await this.countRecruiters(membership.companyId);
        if (recruiterCount >= MAX_RECRUITERS) {
          throw new HttpException(
            {
              error: `Cannot transfer ownership: recruiter seats are full (${MAX_RECRUITERS})`,
            },
            400,
          );
        }

        const updated = await this.prisma.$transaction(async (tx) => {
          await tx.companyMember.updateMany({
            where: {
              companyId: membership.companyId,
              role: "OWNER",
            },
            data: { role: "RECRUITER" },
          });
          return tx.companyMember.update({
            where: { id: member.id },
            data: { role: "OWNER" },
          });
        });

        if (user.id) {
          await this.prisma.activityLog.create({
            data: {
              companyId: membership.companyId,
              actorId: user.id,
              action: "team.ownership_transferred",
              metadata: { memberId: member.id, userId: member.userId },
            },
          });
        }

        return { member: updated };
      }

      if (role === "RECRUITER" && member.role !== "RECRUITER") {
        const recruiterCount = await this.countRecruiters(membership.companyId);
        if (recruiterCount >= MAX_RECRUITERS) {
          throw new HttpException(
            {
              error: `Company may have at most ${MAX_RECRUITERS} recruiters`,
            },
            400,
          );
        }
      }

      const updated = await this.prisma.companyMember.update({
        where: { id: member.id },
        data: { role },
      });

      if (user.id) {
        await this.prisma.activityLog.create({
          data: {
            companyId: membership.companyId,
            actorId: user.id,
            action: "team.role_updated",
            metadata: { memberId: member.id, role },
          },
        });
      }

      return { member: updated };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Assign role error:", error);
      throw new HttpException({ error: "Failed to update role" }, 500);
    }
  }
}

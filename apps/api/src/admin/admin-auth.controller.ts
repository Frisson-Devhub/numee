import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { compare } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { signSession } from "../common/auth";
import {
  clearPortalSessionCookie,
  setPortalSessionCookie,
} from "../common/cookies/session-cookie";
import { SessionGuard } from "../common/guards/session.guard";
import { AdminGuard } from "../common/guards/admin.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { SessionPayload } from "../common/auth";

/**
 * Admin portal auth under `/api/admin/auth/*`.
 * Sets/clears only `numee_admin_session` so candidate/recruiter sessions stay intact.
 */
@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Email/password login for ADMIN role only.
   * Side effect: sets the admin portal session cookie (and clears legacy `session`).
   */
  @Post("login")
  async login(
    @Body() body: { email?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const email = body.email?.trim();
      const { password } = body;
      if (!email || !password) {
        throw new HttpException({ error: "Missing email or password" }, 400);
      }

      const user = await this.prisma.user.findFirst({
        where: {
          emailOrPhone: { equals: email, mode: "insensitive" },
        },
      });
      if (!user) {
        throw new HttpException({ error: "Invalid credentials" }, 401);
      }

      const passwordValid = await compare(password, user.passwordHash);
      if (!passwordValid) {
        throw new HttpException({ error: "Invalid credentials" }, 401);
      }

      if (user.role !== "ADMIN") {
        throw new HttpException(
          {
            error:
              "This sign-in is for administrator accounts. Use the candidate or recruiter portal for other roles.",
          },
          403,
        );
      }

      const session = signSession({ id: user.id, email: user.emailOrPhone });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
      setPortalSessionCookie(res, "admin", session);

      return {
        message: "Login successful",
        redirectTo: "admin-dashboard",
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Admin login error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Clear the admin portal session cookie. */
  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    clearPortalSessionCookie(res, "admin");
    return { message: "Signed out successfully" };
  }

  /**
   * Current admin identity for the SPA gate and sidebar.
   * Requires a valid admin portal session + ADMIN role.
   */
  @Get("me")
  @UseGuards(SessionGuard, AdminGuard)
  async me(@CurrentUser() session: SessionPayload) {
    const userId = session.id;
    if (!userId) {
      throw new HttpException({ error: "Unauthorized" }, 401);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, emailOrPhone: true },
    });
    if (!user) {
      throw new HttpException({ error: "Unauthorized" }, 401);
    }
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    return {
      fullName,
      emailOrPhone: user.emailOrPhone,
    };
  }
}

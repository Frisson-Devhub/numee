import {
  Body,
  Controller,
  HttpException,
  Post,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { compare, hash } from "bcryptjs";
import { OTP_EXPIRY_SECONDS } from "@numee/shared/server";
import { PrismaService } from "../../prisma/prisma.service";
import { PendingSignupService } from "../../pending-signup/pending-signup.module";
import { MailService } from "../../mail/mail.module";
import { generateOTP } from "../../otp/otp";
import { signSession, verifySession } from "../../common/auth";
import {
  clearPortalSessionCookie,
  setPortalSessionCookie,
} from "../../common/cookies/session-cookie";

const SALT_ROUNDS = 10;

type RecruiterSignupPayload = {
  firstName: string;
  lastName: string;
  emailOrPhone: string;
  passwordHash: string;
  companyName: string;
  companyWebsite?: string | null;
  otp: string;
  otpAttempts: number;
};

@Controller("recruiter/auth")
export class RecruiterAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pendingSignups: PendingSignupService,
    private readonly mail: MailService,
  ) {}

  /** Stage recruiter+company signup and email OTP. */
  @Post("signup")
  async signup(@Body() body: Record<string, string>) {
    try {
      const {
        firstName,
        lastName,
        emailOrPhone,
        password,
        companyName,
        companyWebsite,
      } = body;

      if (!firstName?.trim() || !lastName?.trim()) {
        throw new HttpException(
          { error: "First name and last name are required" },
          400,
        );
      }
      if (!emailOrPhone?.trim() || !emailOrPhone.includes("@")) {
        throw new HttpException({ error: "A valid email is required" }, 400);
      }
      if (!password || password.length < 8) {
        throw new HttpException(
          { error: "Password must be at least 8 characters" },
          400,
        );
      }
      if (!companyName?.trim()) {
        throw new HttpException({ error: "Company name is required" }, 400);
      }

      const email = emailOrPhone.trim().toLowerCase();
      const existingUser = await this.prisma.user.findUnique({
        where: { emailOrPhone: email },
      });
      if (existingUser) {
        throw new HttpException(
          { error: "An account with this email already exists" },
          409,
        );
      }

      const passwordHash = await hash(password, SALT_ROUNDS);
      const otp = generateOTP();
      const signupData: RecruiterSignupPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailOrPhone: email,
        passwordHash,
        companyName: companyName.trim(),
        companyWebsite: companyWebsite?.trim() || null,
        otp,
        otpAttempts: 0,
      };

      await this.pendingSignups.set(`recruiter-signup:${email}`, signupData, {
        ex: OTP_EXPIRY_SECONDS,
      });
      await this.mail.sendSignupEmail(email, signupData.firstName, otp);

      return {
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        emailOrPhone: signupData.emailOrPhone,
        companyName: signupData.companyName,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Recruiter signup error:", error);
      throw new HttpException(
        { error: "Something went wrong. Please try again." },
        500,
      );
    }
  }

  /** Verify OTP; create RECRUITER user, company, OWNER membership; set session. */
  @Post("verify-otp")
  async verifyOtp(
    @Body() body: { emailOrPhone?: string; otp?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const email = body.emailOrPhone?.trim().toLowerCase();
      const { otp } = body;
      if (!email || !otp) {
        throw new HttpException({ error: "Missing required fields" }, 400);
      }

      const pendingKey = `recruiter-signup:${email}`;
      const signupData =
        await this.pendingSignups.get<RecruiterSignupPayload>(pendingKey);
      if (!signupData) {
        throw new HttpException(
          {
            error: "Signup session expired or not found. Please sign up again.",
          },
          404,
        );
      }

      if (signupData.otp !== otp) {
        signupData.otpAttempts = (signupData.otpAttempts || 0) + 1;
        if (signupData.otpAttempts >= 3) {
          await this.pendingSignups.del(pendingKey);
          throw new HttpException(
            {
              error:
                "Invalid OTP. Maximum attempts exceeded. Please sign up again.",
              accountDeleted: true,
            },
            400,
          );
        }
        await this.pendingSignups.set(pendingKey, signupData, { keepTtl: true });
        const remainingAttempts = 3 - signupData.otpAttempts;
        throw new HttpException(
          {
            error: `Invalid OTP. You have ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`,
            remainingAttempts,
          },
          400,
        );
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            firstName: signupData.firstName,
            lastName: signupData.lastName,
            emailOrPhone: signupData.emailOrPhone,
            passwordHash: signupData.passwordHash,
            role: "RECRUITER",
            otp: null,
            otpExpiry: null,
            otpAttempts: 0,
          },
        });

        const company = await tx.company.create({
          data: {
            name: signupData.companyName,
            website: signupData.companyWebsite ?? null,
          },
        });

        await tx.companyMember.create({
          data: {
            userId: user.id,
            companyId: company.id,
            role: "OWNER",
          },
        });

        await tx.activityLog.create({
          data: {
            companyId: company.id,
            actorId: user.id,
            action: "company.created",
            metadata: { companyName: company.name },
          },
        });

        return { user, company };
      });

      await this.pendingSignups.del(pendingKey);
      const session = signSession({
        id: result.user.id,
        email: result.user.emailOrPhone,
      });
      setPortalSessionCookie(res, "recruiter", session);

      return {
        message: "OTP verified successfully",
        redirectTo: "recruiter-dashboard",
        company: {
          id: result.company.id,
          name: result.company.name,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Recruiter verify OTP error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Rotate recruiter signup OTP and resend email. */
  @Post("resend-signup-otp")
  async resendSignupOtp(@Body() body: { emailOrPhone?: string }) {
    try {
      const email = body.emailOrPhone?.trim().toLowerCase();
      if (!email) {
        throw new HttpException({ error: "Email is required" }, 400);
      }

      const pendingKey = `recruiter-signup:${email}`;
      const signupData =
        await this.pendingSignups.get<RecruiterSignupPayload>(pendingKey);
      if (!signupData) {
        throw new HttpException(
          { error: "Session expired", code: "SESSION_EXPIRED" },
          404,
        );
      }

      const otp = generateOTP();
      await this.pendingSignups.set(
        pendingKey,
        { ...signupData, otp, otpAttempts: 0 },
        { ex: OTP_EXPIRY_SECONDS },
      );
      await this.mail.sendSignupEmail(
        signupData.emailOrPhone,
        signupData.firstName,
        otp,
      );

      return {
        message: "New verification code sent",
        expiresInSeconds: OTP_EXPIRY_SECONDS,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Recruiter resend OTP error:", error);
      throw new HttpException(
        { error: "Something went wrong. Please try again." },
        500,
      );
    }
  }

  /** Recruiter login; requires RECRUITER role and a company membership. */
  @Post("login")
  async login(
    @Body() body: { email?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const email = body.email?.trim().toLowerCase();
      const { password } = body;
      if (!email || !password) {
        throw new HttpException({ error: "Missing email or password" }, 400);
      }

      const user = await this.prisma.user.findUnique({
        where: { emailOrPhone: email },
        include: {
          companyMemberships: {
            take: 1,
            select: { companyId: true, role: true },
          },
        },
      });
      if (!user) {
        throw new HttpException({ error: "Invalid credentials" }, 401);
      }

      const passwordValid = await compare(password, user.passwordHash);
      if (!passwordValid) {
        throw new HttpException({ error: "Invalid credentials" }, 401);
      }

      if (user.role !== "RECRUITER" || user.companyMemberships.length === 0) {
        throw new HttpException(
          { error: "Recruiter account required. Use company signup or accept an invite." },
          403,
        );
      }

      const session = signSession({ id: user.id, email: user.emailOrPhone });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
      setPortalSessionCookie(res, "recruiter", session);

      return {
        message: "Login successful",
        redirectTo: "recruiter-dashboard",
        membership: user.companyMemberships[0],
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Recruiter login error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Clear the recruiter portal session cookie. */
  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    clearPortalSessionCookie(res, "recruiter");
    return { message: "Signed out successfully" };
  }

  /** Email reset OTP for a RECRUITER account only. */
  @Post("forgot-password")
  async forgotPassword(@Body() body: { email?: string }) {
    try {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        throw new HttpException({ error: "Email is required" }, 400);
      }

      const user = await this.prisma.user.findFirst({
        where: { emailOrPhone: email, role: "RECRUITER" },
      });
      if (!user) {
        throw new HttpException({ error: "User not found" }, 404);
      }

      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otp, otpExpiry },
      });
      await this.mail.sendSignupEmail(user.emailOrPhone, user.firstName, otp);
      return { message: "OTP sent successfully" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Recruiter forgot password error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Validate recruiter reset OTP and return a reset JWT. */
  @Post("verify-reset-otp")
  async verifyResetOtp(@Body() body: { email?: string; otp?: string }) {
    try {
      const email = body.email?.trim().toLowerCase();
      const { otp } = body;
      if (!email || !otp) {
        throw new HttpException({ error: "Email and OTP are required" }, 400);
      }

      const user = await this.prisma.user.findFirst({
        where: { emailOrPhone: email, role: "RECRUITER" },
      });
      if (
        !user ||
        user.otp !== otp ||
        !user.otpExpiry ||
        new Date() > user.otpExpiry
      ) {
        throw new HttpException({ error: "Invalid or expired OTP" }, 400);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiry: null },
      });

      const token = signSession({ email: user.emailOrPhone });
      return { message: "OTP verified", token };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Recruiter verify reset OTP error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Set a new password using the recruiter reset token. */
  @Post("reset-password")
  async resetPassword(@Body() body: { token?: string; newPassword?: string }) {
    try {
      const { token, newPassword } = body;
      if (!token || !newPassword) {
        throw new HttpException(
          { error: "Token and new password are required" },
          400,
        );
      }
      if (newPassword.length < 8) {
        throw new HttpException(
          { error: "Password must be at least 8 characters" },
          400,
        );
      }

      const payload = verifySession(token) as { email?: string } | null;
      if (!payload?.email) {
        throw new HttpException({ error: "Invalid or expired token" }, 400);
      }

      const user = await this.prisma.user.findFirst({
        where: { emailOrPhone: payload.email, role: "RECRUITER" },
      });
      if (!user) {
        throw new HttpException({ error: "User not found" }, 404);
      }

      const hashedPassword = await hash(newPassword, SALT_ROUNDS);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });
      return { message: "Password reset successfully" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Recruiter reset password error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }
}

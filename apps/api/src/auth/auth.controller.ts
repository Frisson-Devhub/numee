import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { compare, hash } from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { OTP_EXPIRY_SECONDS, apiRoutes, frontendRoutes } from "@numee/shared/server";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.module";
import { MailService } from "../mail/mail.module";
import { generateOTP } from "../otp/otp";
import { signSession, verifySession } from "../common/auth";
import {
  clearPortalSessionCookie,
  setPortalSessionCookie,
} from "../common/cookies/session-cookie";

const SALT_ROUNDS = 10;
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const SCOPES = ["openid", "email", "profile"].join(" ");
const OAUTH_PLACEHOLDER_PASSWORD =
  "oauth-no-password-" + (process.env.JWT_SECRET ?? "default");

function candidateBaseUrl(): string {
  return (
    process.env.CANDIDATE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function apiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.GOOGLE_REDIRECT_URI?.replace(/\/api\/auth\/google\/callback$/, "") ??
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  /** Stage candidate signup in Redis and email OTP; user row created after verify. */
  @Post("signup")
  async signup(@Body() body: Record<string, string>) {
    try {
      const {
        firstName,
        lastName,
        emailOrPhone,
        dateOfBirth,
        gender,
        password,
      } = body;

      if (!firstName?.trim() || !lastName?.trim()) {
        throw new HttpException({ error: "First name and last name are required" }, 400);
      }
      if (!emailOrPhone?.trim()) {
        throw new HttpException({ error: "Email or phone number is required" }, 400);
      }
      if (!password || password.length < 8) {
        throw new HttpException({ error: "Password must be at least 8 characters" }, 400);
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { emailOrPhone: emailOrPhone.trim() },
      });
      if (existingUser) {
        throw new HttpException(
          { error: "An account with this email or phone already exists" },
          409,
        );
      }

      const passwordHash = await hash(password, SALT_ROUNDS);
      const otp = generateOTP();
      const signupData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailOrPhone: emailOrPhone.trim(),
        dateOfBirth: dateOfBirth?.trim() || null,
        gender: gender?.trim() || null,
        passwordHash,
        otp,
        otpAttempts: 0,
      };

      await this.redis.set(`signup:${emailOrPhone.trim()}`, signupData, {
        ex: OTP_EXPIRY_SECONDS,
      });

      if (emailOrPhone.includes("@")) {
        await this.mail.sendSignupEmail(emailOrPhone, signupData.firstName, otp);
      }

      return {
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        emailOrPhone: signupData.emailOrPhone,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2002") {
        throw new HttpException(
          { error: "An account with this email or phone already exists" },
          409,
        );
      }
      console.error("Signup error:", error);
      throw new HttpException({ error: "Something went wrong. Please try again." }, 500);
    }
  }

  /** Verify signup OTP, create user, set session cookie. */
  @Post("verify-otp")
  async verifyOtp(
    @Body() body: { emailOrPhone?: string; otp?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { emailOrPhone, otp } = body;
      if (!emailOrPhone || !otp) {
        throw new HttpException({ error: "Missing required fields" }, 400);
      }

      const redisKey = `signup:${emailOrPhone}`;
      const signupData = await this.redis.get<Record<string, unknown>>(redisKey);
      if (!signupData) {
        throw new HttpException(
          { error: "Signup session expired or not found. Please sign up again." },
          404,
        );
      }

      if (signupData.otp !== otp) {
        signupData.otpAttempts = ((signupData.otpAttempts as number) || 0) + 1;
        if ((signupData.otpAttempts as number) >= 3) {
          await this.redis.del(redisKey);
          throw new HttpException(
            {
              error: "Invalid OTP. Maximum attempts exceeded. Please sign up again.",
              accountDeleted: true,
            },
            400,
          );
        }
        await this.redis.set(redisKey, signupData, { keepTtl: true });
        const remainingAttempts = 3 - (signupData.otpAttempts as number);
        throw new HttpException(
          {
            error: `Invalid OTP. You have ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`,
            remainingAttempts,
          },
          400,
        );
      }

      const user = await this.prisma.user.create({
        data: {
          firstName: signupData.firstName as string,
          lastName: signupData.lastName as string,
          emailOrPhone: signupData.emailOrPhone as string,
          dateOfBirth: (signupData.dateOfBirth as string | null) ?? null,
          gender: (signupData.gender as string | null) ?? null,
          passwordHash: signupData.passwordHash as string,
          otp: null,
          otpExpiry: null,
          otpAttempts: 0,
          ...(signupData.linkedInUrl != null && {
            linkedInUrl: signupData.linkedInUrl as string,
          }),
          ...(signupData.resumeUrl != null && {
            resumeUrl: signupData.resumeUrl as string,
          }),
        } as Prisma.UserCreateInput,
      });

      await this.redis.del(redisKey);
      const session = signSession({ id: user.id, email: user.emailOrPhone });
      setPortalSessionCookie(res, "candidate", session);

      return {
        message: "OTP verified successfully",
        currentQuestionIndex: user.currentQuestionIndex,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Error verifying OTP:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Rotate signup OTP in Redis and resend email when address looks like email. */
  @Post("resend-signup-otp")
  async resendSignupOtp(@Body() body: { emailOrPhone?: string }) {
    try {
      const emailOrPhone = body.emailOrPhone?.trim();
      if (!emailOrPhone) {
        throw new HttpException({ error: "Email or phone is required" }, 400);
      }

      const redisKey = `signup:${emailOrPhone}`;
      const signupData = await this.redis.get<{
        firstName: string;
        emailOrPhone: string;
        otpAttempts: number;
        [key: string]: unknown;
      }>(redisKey);

      if (!signupData) {
        throw new HttpException(
          { error: "Session expired", code: "SESSION_EXPIRED" },
          404,
        );
      }

      const otp = generateOTP();
      await this.redis.set(
        redisKey,
        { ...signupData, otp, otpAttempts: 0 },
        { ex: OTP_EXPIRY_SECONDS },
      );

      if (emailOrPhone.includes("@")) {
        await this.mail.sendSignupEmail(
          signupData.emailOrPhone,
          signupData.firstName,
          otp,
        );
      }

      return {
        message: "New verification code sent",
        expiresInSeconds: OTP_EXPIRY_SECONDS,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Resend signup OTP error:", error);
      throw new HttpException({ error: "Something went wrong. Please try again." }, 500);
    }
  }

  /** Candidate/student login; rejects ADMIN/RECRUITER roles and sets session cookie. */
  @Post("login")
  async login(
    @Body() body: { email?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { email, password } = body;
      if (!email || !password) {
        throw new HttpException({ error: "Missing email or password" }, 400);
      }

      const user = await this.prisma.user.findUnique({
        where: { emailOrPhone: email },
      });
      if (!user) {
        throw new HttpException({ error: "Invalid credentials" }, 401);
      }

      const passwordValid = await compare(password, user.passwordHash);
      if (!passwordValid) {
        throw new HttpException({ error: "Invalid credentials" }, 401);
      }

      if (user.role === "ADMIN" || user.role === "RECRUITER") {
        throw new HttpException(
          {
            error:
              "This sign-in is for candidate and student accounts. Use the appropriate portal for recruiter or administrator access.",
          },
          403,
        );
      }

      const session = signSession({ id: user.id, email: user.emailOrPhone });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
      setPortalSessionCookie(res, "candidate", session);

      return { message: "Login successful", redirectTo: "dashboard" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Login error:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Clear the candidate portal session cookie. */
  @Post("signout")
  async signout(@Res({ passthrough: true }) res: Response) {
    clearPortalSessionCookie(res, "candidate");
    return { message: "Signed out successfully" };
  }

  /** Persist reset OTP on the user and email it (5-minute expiry). */
  @Post("forgot-password")
  async forgotPassword(@Body() body: { email?: string }) {
    try {
      const { email } = body;
      if (!email) {
        throw new HttpException({ error: "Email is required" }, 400);
      }

      const user = await this.prisma.user.findFirst({
        where: { emailOrPhone: email },
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
      console.error("Error sending forgot password OTP:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Validate reset OTP and return a short-lived JWT used by reset-password. */
  @Post("verify-reset-otp")
  async verifyResetOtp(@Body() body: { email?: string; otp?: string }) {
    try {
      const { email, otp } = body;
      if (!email || !otp) {
        throw new HttpException({ error: "Email and OTP are required" }, 400);
      }

      const user = await this.prisma.user.findFirst({
        where: { emailOrPhone: email },
      });
      if (!user || user.otp !== otp || !user.otpExpiry || new Date() > user.otpExpiry) {
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
      console.error("Error verifying reset OTP:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Set a new password using the token from verify-reset-otp. */
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

      const payload = verifySession(token) as { email?: string } | null;
      if (!payload?.email) {
        throw new HttpException({ error: "Invalid or expired token" }, 400);
      }

      const user = await this.prisma.user.findFirst({
        where: { emailOrPhone: payload.email },
      });
      if (!user) {
        throw new HttpException({ error: "User not found" }, 404);
      }

      const hashedPassword = await hash(newPassword, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });
      return { message: "Password reset successfully" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Error resetting password:", error);
      throw new HttpException({ error: "Internal server error" }, 500);
    }
  }

  /** Redirect to Google OAuth consent for candidate sign-in. */
  @Get("google")
  googleStart(@Res() res: Response) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new HttpException({ error: "Google login is not configured" }, 500);
    }
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ??
      `${apiBaseUrl()}${apiRoutes.auth.googleCallback}`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
    });
    return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  }

  /** Google OAuth callback: upsert user, set session, redirect to candidate app. */
  @Get("google/callback")
  async googleCallback(
    @Query("code") code: string | undefined,
    @Query("error") errorParam: string | undefined,
    @Res() res: Response,
  ) {
    const baseUrl = candidateBaseUrl();
    const redirectWithError = (message: string) => {
      const loginUrl = `${baseUrl}${frontendRoutes.login}?error=${encodeURIComponent(message)}`;
      return res.redirect(loginUrl);
    };

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return redirectWithError("Google login is not configured");
    }
    if (errorParam) {
      return redirectWithError(
        errorParam === "access_denied"
          ? "Google sign-in was cancelled."
          : "Google sign-in failed.",
      );
    }
    if (!code) {
      return redirectWithError("Missing authorization code.");
    }

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ??
      `${apiBaseUrl()}${apiRoutes.auth.googleCallback}`;

    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) {
        return redirectWithError("Failed to complete Google sign-in.");
      }
      const tokens = (await tokenRes.json()) as { access_token?: string };
      if (!tokens.access_token) {
        return redirectWithError("No access token from Google.");
      }

      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!userInfoRes.ok) {
        return redirectWithError("Failed to fetch your Google profile.");
      }
      const profile = (await userInfoRes.json()) as {
        email?: string;
        name?: string;
        given_name?: string;
        family_name?: string;
      };
      const email = profile.email?.trim();
      if (!email) {
        return redirectWithError("Google did not provide an email.");
      }

      const firstName =
        profile.given_name?.trim() || profile.name?.trim() || "User";
      const lastName = profile.family_name?.trim() || "";
      const passwordHash = await hash(OAUTH_PLACEHOLDER_PASSWORD, 10);

      let user = await this.prisma.user.findUnique({
        where: { emailOrPhone: email },
        select: { id: true, role: true, linkedInUrl: true, resumeUrl: true },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: { firstName, lastName, emailOrPhone: email, passwordHash },
          select: { id: true, role: true, linkedInUrl: true, resumeUrl: true },
        });
      }

      if (user.role === "ADMIN" || user.role === "RECRUITER") {
        return redirectWithError(
          "This sign-in is for candidate and student accounts. Use the appropriate portal for recruiter or administrator access.",
        );
      }

      const session = signSession({ id: user.id, email });
      setPortalSessionCookie(res, "candidate", session);

      const hasCompletedSocial = Boolean(
        user.linkedInUrl?.trim() || user.resumeUrl?.trim(),
      );
      const assessments = await this.prisma.assessment.findMany({
        where: { userId: user.id },
        select: { assessmentQuestionAnswers: true },
      });
      const hasCompletedQuestionnaire = assessments.some(
        (a) =>
          Array.isArray(a.assessmentQuestionAnswers) &&
          a.assessmentQuestionAnswers.length > 0,
      );

      let path: string;
      if (!hasCompletedSocial) path = frontendRoutes.social;
      else if (!hasCompletedQuestionnaire) path = frontendRoutes.questionnaire;
      else path = frontendRoutes.dashboard;

      return res.redirect(`${baseUrl}${path}`);
    } catch (e) {
      console.error("Google callback error:", e);
      return redirectWithError("Something went wrong. Please try again.");
    }
  }
}

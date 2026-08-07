import { Global, Injectable, Module } from "@nestjs/common";
import nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  private getLoginUrl(): string {
    const base =
      process.env.CANDIDATE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";
    return `${base.replace(/\/$/, "")}/user/login`;
  }

  /** Send OTP / verification email (signup and password-reset reuse). */
  async sendSignupEmail(to: string, firstName: string, otp?: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: "Verification",
      html: `<div style="font-family: Arial, sans-serif">
        <h2>Hello, ${firstName}!</h2>
        <p>Your Numee verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 3 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <p>Thank you for using Numee!</p>
        <p>Best regards,</p>
        <p>Numee Team</p>
      </div>`,
    });
  }

  /** Email a recruiter team invitation link. */
  async sendInvitationEmail(
    to: string,
    companyName: string,
    inviteUrl: string,
  ) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: `You're invited to join ${companyName} on Numee`,
      html: `<div style="font-family: Arial, sans-serif">
        <h2>You've been invited</h2>
        <p>Join <strong>${companyName}</strong> as a recruiter on Numee.</p>
        <p><a href="${inviteUrl}" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #205EC5; color: white; text-decoration: none; border-radius: 6px;">Accept invitation</a></p>
        <p>Or copy this link: ${inviteUrl}</p>
        <p>If you did not expect this email, you can ignore it.</p>
        <p>Best regards,<br/>Numee Team</p>
      </div>`,
    });
  }

  /** Email generated credentials after admin bulk onboard. */
  async sendBulkOnboardEmail(to: string, firstName: string, password: string) {
    const loginUrl = this.getLoginUrl();
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: "Your Numee account is ready",
      html: `<div style="font-family: Arial, sans-serif">
        <h2>Hello, ${firstName}!</h2>
        <p>Your Numee account has been created. Use the details below to sign in.</p>
        <p><strong>Email:</strong> ${to}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p><a href="${loginUrl}" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Sign in to Numee</a></p>
        <p>We recommend changing your password after your first login.</p>
        <p>Best regards,</p>
        <p>Numee Team</p>
      </div>`,
    });
  }
}

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

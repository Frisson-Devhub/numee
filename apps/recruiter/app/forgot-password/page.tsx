"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { OTPInput } from "@/components/ui/OTPInput";
import { Modal } from "@/components/ui/Modal";
import { apiRoutes } from "@/constants/api";
import { RESET_OTP_EXPIRY_MS } from "@/constants/constants";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { ApiCall } from "@/lib/utils";

type Step = "email" | "otp";

/**
 * Two-step forgot password: request OTP, then verify and stash reset token
 * for the reset-password page.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSent, setShowSent] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.recruiter.auth.forgotPassword,
        method: "POST",
        body: { email },
      });
      if (!res.ok) {
        setError(res.data?.error ?? res.error ?? "Something went wrong");
        return;
      }
      sessionStorage.setItem(
        "recruiterForgotPasswordOtpExpiresAt",
        String(Date.now() + RESET_OTP_EXPIRY_MS),
      );
      setShowSent(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await ApiCall<{ error?: string; token?: string }>({
        url: apiRoutes.recruiter.auth.verifyResetOtp,
        method: "POST",
        body: { email, otp },
      });
      if (!res.ok || !res.data?.token) {
        setError(res.data?.error ?? res.error ?? "Invalid or expired OTP");
        return;
      }
      router.push(
        `${recruiterRoutes.resetPassword}?token=${encodeURIComponent(res.data.token)}`,
      );
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Modal
        open={showSent}
        onClose={() => {
          setShowSent(false);
          setStep("otp");
        }}
      >
        <div className="p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Check your email
          </h3>
          <p className="text-sm text-foreground-muted">
            We sent a reset code to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
          <GradientButton
            type="button"
            onClick={() => {
              setShowSent(false);
              setStep("otp");
            }}
          >
            Enter code
          </GradientButton>
        </div>
      </Modal>

      <AuthFormHeading
        title="Forgot password"
        subtitle={
          step === "email"
            ? "Enter your work email and we'll send a reset code."
            : "Enter the verification code from your email."
        }
      />

      {step === "email" ? (
        <form className="space-y-5" onSubmit={sendOtp}>
          <LabeledInput
            id="email"
            type="email"
            label="Work email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-danger text-sm font-medium">{error}</p>}
          <GradientButton disabled={isLoading || !email}>
            {isLoading ? "Sending..." : "Send reset code"}
          </GradientButton>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={verifyOtp}>
          <OTPInput
            id="reset-otp"
            label="Reset code"
            value={otp}
            onChange={setOtp}
          />
          {error && <p className="text-danger text-sm font-medium">{error}</p>}
          <GradientButton disabled={isLoading || otp.length < 4}>
            {isLoading ? "Verifying..." : "Continue"}
          </GradientButton>
        </form>
      )}

      <p className="text-right text-sm text-foreground-subtle">
        Back to{" "}
        <Link
          href={recruiterRoutes.login}
          className="font-medium text-brand-primary hover:text-brand-primary-bright underline"
        >
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

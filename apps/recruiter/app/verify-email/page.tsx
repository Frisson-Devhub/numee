"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { OTPInput } from "@/components/ui/OTPInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { Modal } from "@/components/ui/Modal";
import { formatTime, ApiCall } from "@/lib/utils";
import { apiRoutes } from "@/constants/api";
import { MAX_RESEND_ATTEMPTS } from "@/constants/constants";
import { recruiterRoutes } from "@/constants/frontendRoutes";

/**
 * Signup OTP verification. Requires `recruiterSignupIdentifier` in sessionStorage;
 * tracks expiry and resend attempts client-side against shared limits.
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [otpExpired, setOtpExpired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendAttemptsUsed, setResendAttemptsUsed] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const id = sessionStorage.getItem("recruiterSignupIdentifier");
    if (!id) {
      router.replace(recruiterRoutes.signup);
      return;
    }
    setIdentifier(id);
    const used = Number(
      sessionStorage.getItem("recruiterSignupResendAttemptsUsed") || "0",
    );
    setResendAttemptsUsed(Number.isFinite(used) ? used : 0);

    const expiresAt = Number(
      sessionStorage.getItem("recruiterSignupOtpExpiresAt") || "0",
    );
    if (expiresAt > Date.now()) {
      setSecondsRemaining(Math.ceil((expiresAt - Date.now()) / 1000));
    } else {
      setOtpExpired(true);
      setSecondsRemaining(0);
    }
  }, [router]);

  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;
    const t = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          setOtpExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [secondsRemaining]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await ApiCall<{ error?: string; accountDeleted?: boolean }>({
        url: apiRoutes.recruiter.auth.verifyOtp,
        method: "POST",
        body: { emailOrPhone: identifier, otp },
      });
      if (!res.ok) {
        setError(res.data?.error || res.error || "Verification failed");
        if (res.data?.accountDeleted) {
          sessionStorage.removeItem("recruiterSignupIdentifier");
          sessionStorage.removeItem("recruiterSignupOtpExpiresAt");
          sessionStorage.removeItem("recruiterSignupResendPayload");
          sessionStorage.removeItem("recruiterSignupResendAttemptsUsed");
          setTimeout(() => router.replace(recruiterRoutes.signup), 2500);
        }
        return;
      }
      sessionStorage.removeItem("recruiterSignupIdentifier");
      sessionStorage.removeItem("recruiterSignupOtpExpiresAt");
      sessionStorage.removeItem("recruiterSignupResendPayload");
      sessionStorage.removeItem("recruiterSignupResendAttemptsUsed");
      setShowSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendAttemptsUsed >= MAX_RESEND_ATTEMPTS) return;
    setError("");
    setIsResending(true);
    try {
      let res = await ApiCall<{ error?: string; expiresInSeconds?: number }>({
        url: apiRoutes.recruiter.auth.resendSignupOtp,
        method: "POST",
        body: { emailOrPhone: identifier },
      });

      if (res.status === 404) {
        const payloadStr = sessionStorage.getItem("recruiterSignupResendPayload");
        if (!payloadStr) {
          setError("Session expired. Please sign up again.");
          return;
        }
        const payload = JSON.parse(payloadStr) as Record<string, unknown>;
        res = await ApiCall<{ error?: string; expiresInSeconds?: number }>({
          url: apiRoutes.recruiter.auth.signup,
          method: "POST",
          body: payload,
        });
      }

      if (!res.ok) {
        setError(res.data?.error || res.error || "Failed to resend code");
        return;
      }

      const nextUsed = resendAttemptsUsed + 1;
      setResendAttemptsUsed(nextUsed);
      sessionStorage.setItem(
        "recruiterSignupResendAttemptsUsed",
        String(nextUsed),
      );
      const expiresIn = res.data?.expiresInSeconds ?? 180;
      const expiresAt = Date.now() + expiresIn * 1000;
      sessionStorage.setItem(
        "recruiterSignupOtpExpiresAt",
        String(expiresAt),
      );
      setSecondsRemaining(expiresIn);
      setOtpExpired(false);
      setOtp("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <Modal
        open={showSuccess}
        onClose={() => router.replace(recruiterRoutes.dashboard)}
      >
        <div className="p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Email verified
          </h3>
          <p className="text-sm text-foreground-muted">
            Your company workspace is ready.
          </p>
          <GradientButton
            type="button"
            onClick={() => router.replace(recruiterRoutes.dashboard)}
          >
            Go to dashboard
          </GradientButton>
        </div>
      </Modal>

      <AuthFormHeading
        title="Verify your email"
        subtitle={`Enter the code sent to ${identifier || "your email"}.`}
      />

      <form className="space-y-5" onSubmit={handleVerify}>
        <OTPInput
          id="verify-otp"
          label="Verification code"
          value={otp}
          onChange={setOtp}
        />
        {secondsRemaining !== null && (
          <p className="text-sm text-foreground-subtle">
            {otpExpired
              ? "Code expired."
              : `Code expires in ${formatTime(secondsRemaining)}`}
          </p>
        )}
        {error && <p className="text-danger text-sm font-medium">{error}</p>}
        <GradientButton disabled={isLoading || otp.length < 4}>
          {isLoading ? "Verifying..." : "Verify email"}
        </GradientButton>
      </form>

      <p className="text-sm text-foreground-subtle">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          disabled={
            isResending ||
            resendAttemptsUsed >= MAX_RESEND_ATTEMPTS ||
            (!otpExpired && (secondsRemaining ?? 0) > 120)
          }
          onClick={() => void handleResend()}
          className="font-medium text-brand-primary hover:text-brand-primary-bright disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResending ? "Sending..." : "Resend code"}
        </button>
      </p>
    </AuthLayout>
  );
}

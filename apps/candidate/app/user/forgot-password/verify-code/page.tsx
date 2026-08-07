"use client";

import { useState, useEffect, Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OTPInput } from "@/components/ui/OTPInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRoutes } from "@/constants/api";
import { MAX_RESEND_ATTEMPTS, RESET_OTP_EXPIRY_MS } from "@/constants/constants";
import { ApiCall, formatTime } from "@/lib/utils";

function VerifyCodeContent() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [otpExpired, setOtpExpired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendAttemptsUsed, setResendAttemptsUsed] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  useEffect(() => {
    const used = sessionStorage.getItem("forgotPasswordResendAttemptsUsed");
    if (used !== null) {
      setResendAttemptsUsed(parseInt(used, 10) || 0);
    }
  }, []);

  // OTP expiry countdown (re-runs when resendCount changes after resend)
  useEffect(() => {
    const expiresAtStr = sessionStorage.getItem("forgotPasswordOtpExpiresAt");
    if (!expiresAtStr) {
      setSecondsRemaining(null);
      return;
    }
    const expiresAt = Number(expiresAtStr);
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setOtpExpired(true);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [resendCount]);

  const handleResendOTP = async () => {
    if (!email || resendAttemptsUsed >= MAX_RESEND_ATTEMPTS) return;
    setError("");
    setIsResending(true);
    try {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.auth.forgotPassword,
        method: "POST",
        body: { email },
      });

      if (!res.ok) {
        setError(res.data?.error ?? res.error ?? "Failed to resend code. Please try again.");
        return;
      }
      const expiresAt = Date.now() + RESET_OTP_EXPIRY_MS;
      sessionStorage.setItem("forgotPasswordOtpExpiresAt", String(expiresAt));
      setOtp("");
      setOtpExpired(false);
      setResendCount((c) => c + 1);
      const newAttempts = resendAttemptsUsed + 1;
      setResendAttemptsUsed(newAttempts);
      sessionStorage.setItem("forgotPasswordResendAttemptsUsed", String(newAttempts));
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError("");
    setIsLoading(true);
    try {
      const res = await ApiCall<{ token?: string; error?: string }>({
        url: apiRoutes.auth.verifyResetOtp,
        method: "POST",
        body: { email, otp },
      });

      if (res.ok && res.data?.token) {
        sessionStorage.removeItem("forgotPasswordOtpExpiresAt");
        sessionStorage.removeItem("forgotPasswordResendAttemptsUsed");
        router.push(`/user/forgot-password/reset-password?token=${res.data.token}`);
      } else {
        setError(res.data?.error ?? res.error ?? "Invalid OTP");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Enter verification code</h2>
        <p className="text-gray-600 mt-1">
          We have just sent a verification code to <span className="font-semibold text-gray-900">{email}</span>
        </p>
      </div>

      <form
        className="space-y-6"
        onSubmit={handleVerify}
      >
        <OTPInput
          id="otp"
          label="Enter OTP"
          length={6}
          value={otp}
          onChange={setOtp}
          placeholder="0"
        />
        {secondsRemaining !== null && (
          <p className="text-sm text-gray-600 text-muted-foreground tabular-nums">
            {otpExpired ? (
              resendAttemptsUsed >= MAX_RESEND_ATTEMPTS ? (
                <span className="text-amber-600 font-medium">
                  Maximum resend attempts ({resendAttemptsUsed}/{MAX_RESEND_ATTEMPTS}) reached. Please go back to forgot password to get a new code.
                </span>
              ) : (
                <span className="text-amber-600 font-medium">
                  OTP expired. Request a new code below. (Attempts: {resendAttemptsUsed}/{MAX_RESEND_ATTEMPTS})
                </span>
              )
            ) : (
              <>
                Code expires in {formatTime(secondsRemaining)} · Attempts: {resendAttemptsUsed}/{MAX_RESEND_ATTEMPTS}
              </>
            )}
          </p>
        )}
        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        {otpExpired ? (
          <GradientButton
            type="button"
            disabled={isResending || resendAttemptsUsed >= MAX_RESEND_ATTEMPTS}
            onClick={handleResendOTP}
          >
            {isResending ? "Sending..." : "Resend OTP"}
          </GradientButton>
        ) : (
          <GradientButton disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify OTP"}
          </GradientButton>
        )}
      </form>
    </>
  );
}

export default function ForgotPasswordVerifyCodePage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyCodeContent />
      </Suspense>
    </AuthLayout>
  );
}

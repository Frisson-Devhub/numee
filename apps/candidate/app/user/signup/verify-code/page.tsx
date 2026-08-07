"use client";

import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { OTPInput } from "@/components/ui/OTPInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { AccountCreatedModal } from "@/components/ui/AccountCreatedModal";
import { formatTime, ApiCall } from "@/lib/utils";
import { apiRoutes } from "@/constants/api";
import { MAX_RESEND_ATTEMPTS } from "@/constants/constants";

import { useRouter } from "next/navigation";
import { frontendRoutes } from "@/constants/frontendRoutes";

/**
 * Signup OTP verify/resend. Identifier and expiry live in sessionStorage from
 * the signup form; capped by `MAX_RESEND_ATTEMPTS`.
 */
export default function VerifyCodePage() {
  const router = useRouter();
  const [OTP, setOTP] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [identifier, setIdentifier] = useState("Email Or Phone");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [otpExpired, setOtpExpired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendAttemptsUsed, setResendAttemptsUsed] = useState(0);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await ApiCall<{ error?: string; accountDeleted?: boolean }>({
        url: apiRoutes.auth.verifyOtp,
        method: "POST",
        body: { emailOrPhone: identifier, otp: OTP },
      });

      if (!res.ok) {
        setError(res.data?.error || res.error || "Verification failed");
        setIsLoading(false);

        // If account was deleted due to max attempts, redirect to signup
        if (res.data?.accountDeleted) {
          sessionStorage.removeItem("signupIdentifier");
          sessionStorage.removeItem("signupOtpExpiresAt");
          sessionStorage.removeItem("signupResendPayload");
          sessionStorage.removeItem("signupResendAttemptsUsed");
          setTimeout(() => {
            router.replace("/user/signup");
          }, 3000); // Give user time to read the error message
        }
        return;
      }

      // Clear signup data from sessionStorage
      sessionStorage.removeItem("signupIdentifier");
      sessionStorage.removeItem("signupOtpExpiresAt");
      sessionStorage.removeItem("signupResendPayload");
      sessionStorage.removeItem("signupResendAttemptsUsed");

      // Show success modal, then redirect to social step
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendAttemptsUsed >= MAX_RESEND_ATTEMPTS) return;
    setError("");
    setIsResending(true);
    try {
      let res = await ApiCall<{ error?: string; expiresInSeconds?: number }>({
        url: apiRoutes.auth.resendSignupOtp,
        method: "POST",
        body: { emailOrPhone: identifier },
      });

      // If session expired (404), request new OTP via signup API using stored payload
      if (res.status === 404) {
        const payloadStr = sessionStorage.getItem("signupResendPayload");
        if (!payloadStr) {
          setError("Session expired. Please sign up again.");
          return;
        }
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(payloadStr) as Record<string, unknown>;
        } catch {
          setError("Session expired. Please sign up again.");
          return;
        }
        res = await ApiCall<{ error?: string; expiresInSeconds?: number }>({
          url: apiRoutes.auth.signup,
          method: "POST",
          body: payload,
        });
        if (!res.ok) {
          setError(res.data?.error || res.error || "Failed to resend code. Please try again.");
          return;
        }
        const expiresAt = Date.now() + 3 * 60 * 1000;
        sessionStorage.setItem("signupOtpExpiresAt", String(expiresAt));
        setOTP("");
        setOtpExpired(false);
        setResendCount((c) => c + 1);
        const newAttempts = resendAttemptsUsed + 1;
        setResendAttemptsUsed(newAttempts);
        sessionStorage.setItem("signupResendAttemptsUsed", String(newAttempts));
        return;
      }

      if (!res.ok) {
        setError(res.data?.error || res.error || "Failed to resend code. Please try again.");
        return;
      }
      const data = res.data;
      const expiresAt = Date.now() + (data?.expiresInSeconds ?? 180) * 1000;
      sessionStorage.setItem("signupOtpExpiresAt", String(expiresAt));
      setOTP("");
      setOtpExpired(false);
      setResendCount((c) => c + 1);
      const newAttempts = resendAttemptsUsed + 1;
      setResendAttemptsUsed(newAttempts);
      sessionStorage.setItem("signupResendAttemptsUsed", String(newAttempts));
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    const value: string | null = sessionStorage.getItem("signupIdentifier");
    if (value) {
      setIdentifier(value);
    }
    const used = sessionStorage.getItem("signupResendAttemptsUsed");
    if (used !== null) {
      setResendAttemptsUsed(parseInt(used, 10) || 0);
    }
  }, []);

  // OTP expiry countdown (re-runs when resendCount changes after resend)
  useEffect(() => {
    const expiresAtStr = sessionStorage.getItem("signupOtpExpiresAt");
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

  return (
    <AuthLayout>
      <AccountCreatedModal
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace(frontendRoutes.social);
        }}
      />

      <AuthFormHeading
        title="Enter verification code"
        subtitle={`We have just sent a verification code to ${identifier}`}
      />

      <form className="space-y-6" onSubmit={handleVerifyOTP}>
        <OTPInput
          id="emailOrPhone-otp"
          label="Enter OTP"
          length={6}
          value={OTP}
          onChange={setOTP}
          placeholder="0"
        />
        {secondsRemaining !== null && (
          <p className="text-sm text-gray-600 text-muted-foreground tabular-nums">
            {otpExpired ? (
              resendAttemptsUsed >= MAX_RESEND_ATTEMPTS ? (
                <span className="text-amber-600 font-medium">
                  Maximum resend attempts ({MAX_RESEND_ATTEMPTS}) reached. Please sign up again to get a new code.
                </span>
              ) : (
                <span className="text-amber-600 font-medium">OTP expired. Request a new code below.</span>
              )
            ) : (
              <>Code expires in {formatTime(secondsRemaining)}</>
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
    </AuthLayout>
  );
}

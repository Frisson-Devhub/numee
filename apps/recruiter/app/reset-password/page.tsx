"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { Modal } from "@/components/ui/Modal";
import { apiRoutes } from "@/constants/api";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { ApiCall } from "@/lib/utils";

/** Completes password reset using `?token=` from the forgot-password OTP step. */
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Missing reset token");
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.recruiter.auth.resetPassword,
        method: "POST",
        body: { token, newPassword: password },
      });
      if (!res.ok) {
        setError(res.data?.error ?? res.error ?? "Failed to reset password");
        return;
      }
      setShowSuccess(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Modal
        open={showSuccess}
        onClose={() => router.push(recruiterRoutes.login)}
      >
        <div className="p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Password updated
          </h3>
          <p className="text-sm text-foreground-muted">
            You can now sign in with your new password.
          </p>
          <GradientButton
            type="button"
            onClick={() => router.push(recruiterRoutes.login)}
          >
            Go to login
          </GradientButton>
        </div>
      </Modal>

      <AuthFormHeading
        title="Reset password"
        subtitle="Choose a new password for your recruiter account."
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <PasswordInput
          id="new-password"
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordInput
          id="confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <p className="text-danger text-sm font-medium">{error}</p>}
        <GradientButton disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset password"}
        </GradientButton>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-foreground-muted">
          Loading...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

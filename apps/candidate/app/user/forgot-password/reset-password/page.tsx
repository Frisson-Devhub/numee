"use client";

import { useState, Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { PasswordChangedModal } from "@/components/ui/PasswordChangedModal";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRoutes } from "@/constants/api";
import { ApiCall } from "@/lib/utils";
import { frontendRoutes } from "@/constants/frontendRoutes";

function ResetPasswordContent() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (!token) {
      alert("Missing reset token");
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.auth.resetPassword,
        method: "POST",
        body: { token, newPassword: password },
      });

      if (res.ok) {
        setShowSuccessModal(true);
      } else {
        alert(res.data?.error ?? res.error ?? "Failed to reset password");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <PasswordChangedModal
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push(frontendRoutes.login);
        }}
      />
      <AuthFormHeading
        title="Reset Password"
        subtitle="Enter a new password to reset the password on your account. We'll ask for this password whenever you log in."
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <PasswordInput
          id="new-password"
          label="New Password"
          placeholder="••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordInput
          id="confirm-password"
          label="Confirm New Password"
          placeholder="••••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <GradientButton disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset Password"}
        </GradientButton>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { CheckEmailModal } from "@/components/ui/CheckEmailModal";
import { apiRoutes } from "@/constants/api";
import { RESET_OTP_EXPIRY_MS } from "@/constants/constants";
import { ApiCall } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [showCheckEmailModal, setShowCheckEmailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.auth.forgotPassword,
        method: "POST",
        body: { email },
      });

      if (res.ok) {
        setShowCheckEmailModal(true);
      } else {
        alert(res.data?.error ?? res.error ?? "Something went wrong");
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
      <CheckEmailModal
        open={showCheckEmailModal}
        onClose={() => {
          setShowCheckEmailModal(false);
          const expiresAt = Date.now() + RESET_OTP_EXPIRY_MS;
          sessionStorage.setItem("forgotPasswordOtpExpiresAt", String(expiresAt));
          router.push(`/user/forgot-password/verify-code?email=${encodeURIComponent(email)}`);
        }}
        email={email}
      />
      <AuthFormHeading
        title="Forgot Password"
        subtitle="Enter your registered email address and we'll give you reset instruction."
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <LabeledInput
          id="email"
          type="email"
          label="Work Email"
          placeholder="admin@numee.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <GradientButton disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Reset Link"}
        </GradientButton>
      </form>

      <p className="text-right text-sm text-gray-600">
        Back to{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

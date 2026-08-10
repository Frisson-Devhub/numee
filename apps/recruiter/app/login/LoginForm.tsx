"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Formik, Form, ErrorMessage, type FormikHelpers } from "formik";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { GradientButton } from "@/components/ui/GradientButton";
import { AuthCallout } from "@numee/shared/components";
import { apiRoutes } from "@/constants/api";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { LoginSchema } from "@/constants/formikSchema";
import { ApiCall } from "@/lib/utils";

type LoginValues = { email: string; password: string };

/** Recruiter login; follows Nest `redirectTo` when present (e.g. incomplete verify). */
export default function LoginForm({
  errorFromQuery,
}: {
  errorFromQuery?: string;
}) {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (errorFromQuery) setError(errorFromQuery);
  }, [errorFromQuery]);

  const handleLogin = async (
    values: LoginValues,
    { setSubmitting }: FormikHelpers<LoginValues>,
  ) => {
    setError("");
    setSubmitting(true);
    try {
      const res = await ApiCall<{ error?: string; redirectTo?: string }>({
        url: apiRoutes.recruiter.auth.login,
        method: "POST",
        body: { email: values.email, password: values.password },
      });

      if (!res.ok) {
        setError(res.data?.error || res.error || "Login failed");
        return;
      }

      router.replace(recruiterRoutes.dashboard);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <AuthFormHeading
          title="Recruiter sign in"
          subtitle="Access your company hiring workspace."
        />

        <AuthCallout title="Secure portal.">
          Use your company recruiter credentials.
        </AuthCallout>

        <Formik<LoginValues>
          initialValues={{ email: "", password: "" }}
          validationSchema={LoginSchema}
          onSubmit={handleLogin}
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form className="space-y-5">
              <LabeledInput
                id="email"
                type="email"
                label="Work email"
                placeholder="you@company.com"
                value={values.email}
                onChange={(e) => setFieldValue("email", e.target.value)}
              />
              <ErrorMessage
                name="email"
                component="div"
                className="text-danger text-sm"
              />
              <PasswordInput
                id="password"
                label="Password"
                placeholder="••••••••••"
                value={values.password}
                onChange={(e) => setFieldValue("password", e.target.value)}
              />
              <ErrorMessage
                name="password"
                component="div"
                className="text-danger text-sm"
              />
              <div className="flex items-center justify-between gap-3">
                <CheckboxField
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  label="Remember me"
                />
                <Link
                  href={recruiterRoutes.forgotPassword}
                  className="shrink-0 text-sm font-medium text-brand-primary transition hover:text-brand-primary-bright"
                >
                  Forgot password?
                </Link>
              </div>
              {error && (
                <p className="text-sm font-medium text-danger">{error}</p>
              )}
              <GradientButton disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </GradientButton>
            </Form>
          )}
        </Formik>

        <p className="text-center text-sm text-foreground-subtle">
          New company?{" "}
          <Link
            href={recruiterRoutes.signup}
            className="font-medium text-brand-primary transition hover:text-brand-primary-bright"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

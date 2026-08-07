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
      <AuthFormHeading
        title="Recruiter sign in"
        subtitle="Access your company hiring workspace."
      />

      <div className="flex gap-3 p-4 rounded-lg bg-brand-primary/5 border border-brand-primary/15">
        <div className="shrink-0 w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center">
          <span className="text-white font-bold text-sm">!</span>
        </div>
        <p className="text-sm text-foreground-muted">
          <span className="font-semibold text-foreground">Secure portal.</span>{" "}
          Use your company recruiter credentials.
        </p>
      </div>

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
                className="text-sm font-medium text-brand-primary hover:text-brand-primary-bright shrink-0"
              >
                Forgot password?
              </Link>
            </div>
            {error && (
              <p className="text-danger text-sm font-medium">{error}</p>
            )}
            <GradientButton disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </GradientButton>
          </Form>
        )}
      </Formik>

      <p className="text-sm text-foreground-subtle text-center">
        New company?{" "}
        <Link
          href={recruiterRoutes.signup}
          className="font-medium text-brand-primary hover:text-brand-primary-bright underline"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

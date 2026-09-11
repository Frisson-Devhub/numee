"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { MobileAuthLayout } from "@/components/auth/MobileAuthLayout";
import { SocialLoginOptions } from "@/components/auth/SocialLoginOptions";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { GradientButton } from "@/components/ui/GradientButton";
import { AuthCallout } from "@numee/shared/components";
import { apiRoutes } from "@/constants/api";
import { ApiCall } from "@/lib/utils";
import { frontendRoutes } from "@/constants/frontendRoutes";
import { Formik, Form, ErrorMessage, FormikHelpers } from "formik";
import { LoginSchema } from "@/constants/formikSchema";
import { LoginDataInterface } from "@/interfaces/types";
import { useI18n } from "@/contexts/I18nContext";

type LoginFormProps = {
  errorFromQuery?: string;
  variant?: "default" | "mobile";
};

/**
 * Candidate login. Honors Nest `redirectTo`, links to recruiter login via
 * `NEXT_PUBLIC_RECRUITER_URL`, and supports a compact mobile layout.
 * Admin credentials are rejected by the candidate auth API.
 */
export default function LoginForm({ errorFromQuery, variant = "default" }: LoginFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const isMobile = variant === "mobile";
  const recruiterLoginUrl = `${
    process.env.NEXT_PUBLIC_RECRUITER_URL?.replace(/\/$/, "") ||
    "http://localhost:3003"
  }/login`;

  useEffect(() => {
    if (errorFromQuery) setError(errorFromQuery);
  }, [errorFromQuery]);

  const handleLogin = async (values: LoginDataInterface, { setSubmitting }: FormikHelpers<LoginDataInterface>) => {
    setError("");
    setSubmitting(true);

    try {
      const res = await ApiCall<{ error?: string; redirectTo?: string }>({
        url: apiRoutes.auth.login,
        method: "POST",
        body: {
          email: values.email,
          password: values.password,
        },
      });

      if (!res.ok) {
        setError(res.data?.error || res.error || t("auth.login.loginFailed"));
        setSubmitting(false);
        return;
      }

      const redirectTo = res.data?.redirectTo;
      if (redirectTo === "social") {
        router.replace(frontendRoutes.social);
      } else if (redirectTo === "ai-questionnaire") {
        router.replace(frontendRoutes.questionnaire);
      } else {
        router.replace(frontendRoutes.dashboard);
      }
    } catch (err) {
      console.error(err);
      setError(t("auth.login.somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  const formBody = (
    <div className={isMobile ? "space-y-6" : "space-y-4"}>
      <AuthFormHeading
        title={isMobile ? t("auth.login.titleMobile") : t("auth.login.title")}
        subtitle={isMobile ? t("auth.login.subtitleMobile") : t("auth.login.subtitle")}
      />

      {!isMobile && (
        <AuthCallout title={t("auth.login.securityTitle")}>
          {t("auth.login.securityMessage")}
        </AuthCallout>
      )}

      <Formik<LoginDataInterface>
        initialValues={{
          email: "",
          password: "",
        }}
        validationSchema={LoginSchema}
        onSubmit={handleLogin}
      >
        {({ isSubmitting, setFieldValue, values }) => (
          <Form className={isMobile ? "space-y-5" : "space-y-4"}>
            <LabeledInput
              id="email"
              type="email"
              label={isMobile ? t("auth.login.emailMobile") : t("auth.login.email")}
              placeholder={isMobile ? "demo@example.com" : "you@example.com"}
              value={values.email}
              onChange={(e) => setFieldValue("email", e.target.value)}
            />
            <ErrorMessage name="email" component="div" className="text-danger text-sm" />
            <PasswordInput
              id="password"
              label={t("auth.login.password")}
              placeholder="••••••••••"
              value={values.password}
              onChange={(e) => setFieldValue("password", e.target.value)}
            />
            <ErrorMessage name="password" component="div" className="text-danger text-sm" />
            <div className="flex items-center justify-between gap-3">
              <CheckboxField
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                label={t("auth.login.rememberMe")}
              />
              <Link
                href="/user/forgot-password"
                className="text-sm font-medium text-brand-primary hover:text-brand-primary-bright shrink-0"
              >
                {isMobile ? t("auth.login.forgotPasswordMobile") : t("auth.login.forgotPassword")}
              </Link>
            </div>
            {error && <p className="text-danger text-sm font-medium">{error}</p>}
            <GradientButton disabled={isSubmitting}>
              {isSubmitting
                ? isMobile
                  ? t("auth.login.loggingIn")
                  : t("auth.login.signingIn")
                : isMobile
                  ? t("auth.login.signInMobile")
                  : t("auth.login.signIn")}
            </GradientButton>
          </Form>
        )}
      </Formik>

      <SocialLoginOptions layout={isMobile ? "stack" : "grid"} />
      {/* Single compact footer block: keeps the sign-in screen inside one viewport. */}
      <div className="space-y-1 text-center text-sm text-foreground-subtle">
        {!isMobile && (
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/user/signup"
              className="font-medium text-brand-primary transition hover:text-brand-primary-bright"
            >
              Sign up
            </Link>
          </p>
        )}
        <p>
          Are you a recruiter?{" "}
          <a
            href={recruiterLoginUrl}
            className="font-medium text-brand-primary transition hover:text-brand-primary-bright"
          >
            Sign in to the Recruiter Portal
          </a>
          . Admin credentials are not accepted here.
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return <MobileAuthLayout>{formBody}</MobileAuthLayout>;
  }

  return <AuthLayout fitViewport>{formBody}</AuthLayout>;
}

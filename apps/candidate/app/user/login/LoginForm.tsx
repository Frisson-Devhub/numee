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
 * Candidate login. Honors Nest `redirectTo` (e.g. admin), links to recruiter
 * login via `NEXT_PUBLIC_RECRUITER_URL`, and supports a compact mobile layout.
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
    <>
      <AuthFormHeading
        title={isMobile ? t("auth.login.titleMobile") : t("auth.login.title")}
        subtitle={isMobile ? t("auth.login.subtitleMobile") : t("auth.login.subtitle")}
      />

      {!isMobile && (
        <div className="flex gap-3 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <div className="shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">!</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-blue-900">{t("auth.login.securityTitle")}</span>{" "}
            <span className="text-blue-800">{t("auth.login.securityMessage")}</span>
          </div>
        </div>
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
          <Form className="space-y-5">
            <LabeledInput
              id="email"
              type="email"
              label={isMobile ? t("auth.login.emailMobile") : t("auth.login.email")}
              placeholder={isMobile ? "demo@example.com" : "admin@numee.com"}
              value={values.email}
              onChange={(e) => setFieldValue("email", e.target.value)}
            />
            <ErrorMessage name="email" component="div" className="text-red-600 text-sm" />
            <PasswordInput
              id="password"
              label={t("auth.login.password")}
              placeholder="••••••••••"
              value={values.password}
              onChange={(e) => setFieldValue("password", e.target.value)}
            />
            <ErrorMessage name="password" component="div" className="text-red-600 text-sm" />
            <div className="flex items-center justify-between gap-3">
              <CheckboxField
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                label={t("auth.login.rememberMe")}
              />
              <Link
                href="/user/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 shrink-0"
              >
                {isMobile ? t("auth.login.forgotPasswordMobile") : t("auth.login.forgotPassword")}
              </Link>
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
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
      {!isMobile && (
        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/user/signup" className="font-medium text-blue-600 hover:text-blue-700">
            Sign up
          </Link>
        </p>
      )}
      <p className="text-center text-sm text-gray-600">
        Are you a recruiter?{" "}
        <a
          href={recruiterLoginUrl}
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Sign in to the Recruiter Portal
        </a>
        . Admin credentials are not accepted here.
      </p>
    </>
  );

  if (isMobile) {
    return <MobileAuthLayout>{formBody}</MobileAuthLayout>;
  }

  return <AuthLayout>{formBody}</AuthLayout>;
}

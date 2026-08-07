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
import { Modal } from "@/components/ui/Modal";
import { apiRoutes } from "@/constants/api";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { RecruiterSignupSchema } from "@/constants/formikSchema";
import { ApiCall } from "@/lib/utils";

type SignupValues = {
  firstName: string;
  lastName: string;
  emailOrPhone: string;
  password: string;
  companyName: string;
  companyWebsite: string;
  agreeToTerms: boolean;
};

const initialValues: SignupValues = {
  firstName: "",
  lastName: "",
  emailOrPhone: "",
  password: "",
  companyName: "",
  companyWebsite: "",
  agreeToTerms: false,
};

/**
 * Company signup. Persists identifier in sessionStorage and resumes verify-email
 * if the user returns mid-OTP flow.
 */
export default function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  useEffect(() => {
    const signupIdentifier = sessionStorage.getItem("recruiterSignupIdentifier");
    if (signupIdentifier) {
      router.replace(recruiterRoutes.verifyEmail);
    }
  }, [router]);

  const handleSignup = async (
    values: SignupValues,
    { setSubmitting }: FormikHelpers<SignupValues>,
  ) => {
    setError("");
    try {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.recruiter.auth.signup,
        method: "POST",
        body: {
          firstName: values.firstName,
          lastName: values.lastName,
          emailOrPhone: values.emailOrPhone,
          password: values.password,
          companyName: values.companyName,
          companyWebsite: values.companyWebsite || undefined,
        },
      });
      if (!res.ok) {
        setError(res.data?.error ?? res.error ?? "Signup failed");
        return;
      }
      const otpExpiresAt = Date.now() + 3 * 60 * 1000;
      sessionStorage.setItem("recruiterSignupOtpExpiresAt", String(otpExpiresAt));
      sessionStorage.setItem(
        "recruiterSignupResendPayload",
        JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          emailOrPhone: values.emailOrPhone,
          password: values.password,
          companyName: values.companyName,
          companyWebsite: values.companyWebsite || undefined,
        }),
      );
      setSubmittedEmail(values.emailOrPhone);
      setShowOtpModal(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout rightPanelOverflow maxWidth="max-w-lg">
      <Modal
        open={showOtpModal}
        onClose={() => {
          setShowOtpModal(false);
          sessionStorage.setItem("recruiterSignupIdentifier", submittedEmail);
          sessionStorage.setItem("recruiterSignupResendAttemptsUsed", "0");
          router.replace(recruiterRoutes.verifyEmail);
        }}
      >
        <div className="p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Check your email
          </h3>
          <p className="text-sm text-foreground-muted">
            We sent a verification code to{" "}
            <span className="font-medium text-foreground">{submittedEmail}</span>.
          </p>
          <GradientButton
            type="button"
            onClick={() => {
              setShowOtpModal(false);
              sessionStorage.setItem("recruiterSignupIdentifier", submittedEmail);
              sessionStorage.setItem("recruiterSignupResendAttemptsUsed", "0");
              router.replace(recruiterRoutes.verifyEmail);
            }}
          >
            Continue
          </GradientButton>
        </div>
      </Modal>

      <AuthFormHeading
        title="Create company account"
        subtitle="Set up your hiring workspace on Numee."
      />

      <Formik<SignupValues>
        initialValues={initialValues}
        validationSchema={RecruiterSignupSchema}
        onSubmit={handleSignup}
      >
        {({ isSubmitting, setFieldValue, values }) => (
          <Form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <LabeledInput
                  id="firstName"
                  label="First name"
                  value={values.firstName}
                  onChange={(e) => setFieldValue("firstName", e.target.value)}
                />
                <ErrorMessage
                  name="firstName"
                  component="div"
                  className="text-danger text-sm mt-1"
                />
              </div>
              <div>
                <LabeledInput
                  id="lastName"
                  label="Last name"
                  value={values.lastName}
                  onChange={(e) => setFieldValue("lastName", e.target.value)}
                />
                <ErrorMessage
                  name="lastName"
                  component="div"
                  className="text-danger text-sm mt-1"
                />
              </div>
            </div>
            <LabeledInput
              id="emailOrPhone"
              type="email"
              label="Work email"
              placeholder="you@company.com"
              value={values.emailOrPhone}
              onChange={(e) => setFieldValue("emailOrPhone", e.target.value)}
            />
            <ErrorMessage
              name="emailOrPhone"
              component="div"
              className="text-danger text-sm"
            />
            <PasswordInput
              id="password"
              label="Password"
              value={values.password}
              onChange={(e) => setFieldValue("password", e.target.value)}
            />
            <ErrorMessage
              name="password"
              component="div"
              className="text-danger text-sm"
            />
            <LabeledInput
              id="companyName"
              label="Company name"
              value={values.companyName}
              onChange={(e) => setFieldValue("companyName", e.target.value)}
            />
            <ErrorMessage
              name="companyName"
              component="div"
              className="text-danger text-sm"
            />
            <LabeledInput
              id="companyWebsite"
              label="Company website (optional)"
              placeholder="https://company.com"
              value={values.companyWebsite}
              onChange={(e) => setFieldValue("companyWebsite", e.target.value)}
            />
            <ErrorMessage
              name="companyWebsite"
              component="div"
              className="text-danger text-sm"
            />
            <CheckboxField
              id="agreeToTerms"
              checked={values.agreeToTerms}
              onChange={(e) => setFieldValue("agreeToTerms", e.target.checked)}
              label="I agree to the terms of service"
            />
            <ErrorMessage
              name="agreeToTerms"
              component="div"
              className="text-danger text-sm"
            />
            {error && (
              <p className="text-danger text-sm font-medium">{error}</p>
            )}
            <GradientButton disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </GradientButton>
          </Form>
        )}
      </Formik>

      <p className="text-sm text-foreground-subtle text-center">
        Already have an account?{" "}
        <Link
          href={recruiterRoutes.login}
          className="font-medium text-brand-primary hover:text-brand-primary-bright underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Formik, Form, ErrorMessage, type FormikHelpers } from "formik";
import * as Yup from "yup";
import {
  apiRoutes,
  adminRoutes,
  ApiCall,
  AuthShell,
  AuthBrandingCopy,
  AuthCallout,
  AuthFormHeading,
  LabeledInput,
  PasswordInput,
  GradientButton,
} from "@numee/shared";

const LoginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email format").required("Email is required"),
  password: Yup.string().required("Password is required"),
});

type LoginValues = { email: string; password: string };

/**
 * Admin portal login — email/password only; uses `numee_admin_session` via Nest admin auth.
 * No Google/social and no cross-links to candidate/recruiter login.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async (
    values: LoginValues,
    { setSubmitting }: FormikHelpers<LoginValues>,
  ) => {
    setError("");
    setSubmitting(true);
    try {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.admin.auth.login,
        method: "POST",
        body: { email: values.email, password: values.password },
      });
      if (!res.ok) {
        setError(res.data?.error || res.error || "Login failed");
        return;
      }
      navigate(adminRoutes.dashboard, { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      portal="admin"
      logoSrc="/numee-logo.png"
      logoOnLightSrc="/numee-logo-dark.png"
      bgSrc="/auth-panel-bg.png"
      logoHref={adminRoutes.login}
      branding={<AuthBrandingCopy />}
    >
      <div className="space-y-6">
        <AuthFormHeading
          title="Admin sign in"
          subtitle="Access the NuMee administration workspace."
        />

        <AuthCallout title="Administrator access.">
          Use your admin credentials only.
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
                placeholder="admin@numee.com"
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
              {error && (
                <p className="text-sm font-medium text-danger">{error}</p>
              )}
              <GradientButton disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </GradientButton>
            </Form>
          )}
        </Formik>
      </div>
    </AuthShell>
  );
}

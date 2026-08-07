"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Formik, Form, ErrorMessage, type FormikHelpers } from "formik";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { Spinner } from "@/components/ui/Spinner";
import { apiRoutes } from "@/constants/api";
import { InviteAcceptSchema } from "@/constants/formikSchema";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { ApiCall } from "@/lib/utils";

type InviteInfo = {
  email: string;
  role: string;
  company: { id: string; name: string; logoUrl?: string | null };
  signedInEmail?: string | null;
  sessionMatchesInvite?: boolean;
};

type AcceptValues = {
  firstName: string;
  lastName: string;
  password: string;
};

/**
 * Team invite accept: loads invite by token; if another session is signed in,
 * offers sign-out; creates account when invitee has none.
 */
export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [needsAccount, setNeedsAccount] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const res = await ApiCall<InviteInfo & { error?: string; status?: string }>(
        {
          url: apiRoutes.recruiter.teamInviteByToken(token),
          method: "GET",
        },
      );
      if (cancelled) return;
      if (!res.ok || !res.data?.email) {
        setLoadError(res.data?.error ?? res.error ?? "Invitation not found");
        setLoading(false);
        return;
      }
      setInvite({
        email: res.data.email,
        role: res.data.role,
        company: res.data.company,
        signedInEmail: res.data.signedInEmail ?? null,
        sessionMatchesInvite: Boolean(res.data.sessionMatchesInvite),
      });
      // Matching logged-in user can accept without creating an account.
      setNeedsAccount(!res.data.sessionMatchesInvite);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accept = async (
    values: AcceptValues | Record<string, never>,
    helpers?: FormikHelpers<AcceptValues>,
  ) => {
    setSubmitError("");
    helpers?.setSubmitting(true);
    try {
      const body =
        needsAccount && "firstName" in values
          ? {
              firstName: values.firstName,
              lastName: values.lastName,
              password: values.password,
            }
          : {};
      const res = await ApiCall<{
        error?: string;
        code?: string;
        signedInEmail?: string;
        inviteEmail?: string;
        redirectTo?: string;
      }>({
        url: apiRoutes.recruiter.teamInviteAccept(token),
        method: "POST",
        body,
      });
      if (!res.ok) {
        const msg = res.data?.error ?? res.error ?? "Failed to accept invite";
        if (msg.toLowerCase().includes("first name")) {
          setNeedsAccount(true);
        }
        setSubmitError(msg);
        return;
      }
      router.replace(recruiterRoutes.dashboard);
    } catch {
      setSubmitError("Something went wrong");
    } finally {
      helpers?.setSubmitting(false);
    }
  };

  const signOutWrongAccount = async () => {
    setSigningOut(true);
    setSubmitError("");
    try {
      await ApiCall({
        url: apiRoutes.recruiter.auth.logout,
        method: "POST",
      });
      setInvite((prev) =>
        prev
          ? {
              ...prev,
              signedInEmail: null,
              sessionMatchesInvite: false,
            }
          : prev,
      );
      setNeedsAccount(true);
    } catch {
      setSubmitError("Could not sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-12">
          <Spinner className="w-8 h-8 text-brand-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (loadError || !invite) {
    return (
      <AuthLayout>
        <AuthFormHeading
          title="Invitation unavailable"
          subtitle={loadError || "This invite link is invalid or expired."}
        />
        <GradientButton
          type="button"
          onClick={() => router.push(recruiterRoutes.login)}
        >
          Go to login
        </GradientButton>
      </AuthLayout>
    );
  }

  const wrongAccount =
    Boolean(invite.signedInEmail) && !invite.sessionMatchesInvite;

  return (
    <AuthLayout>
      <AuthFormHeading
        title={`Join ${invite.company.name}`}
        subtitle={`You've been invited as ${invite.role.toLowerCase()} (${invite.email}).`}
      />

      {wrongAccount && (
        <div className="mb-4 rounded-lg border border-border-default bg-surface-muted p-3 text-sm text-foreground-muted">
          <p>
            You&apos;re signed in as{" "}
            <span className="font-medium text-foreground">
              {invite.signedInEmail}
            </span>
            , which doesn&apos;t match this invite. You can continue to join as{" "}
            <span className="font-medium text-foreground">{invite.email}</span>{" "}
            (your session will switch), or sign out first.
          </p>
          <button
            type="button"
            className="mt-2 text-sm text-brand-primary underline disabled:opacity-60"
            disabled={signingOut}
            onClick={() => void signOutWrongAccount()}
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}

      {needsAccount ? (
        <Formik<AcceptValues>
          initialValues={{ firstName: "", lastName: "", password: "" }}
          validationSchema={InviteAcceptSchema}
          onSubmit={accept}
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
              <PasswordInput
                id="password"
                label="Create password"
                value={values.password}
                onChange={(e) => setFieldValue("password", e.target.value)}
              />
              <ErrorMessage
                name="password"
                component="div"
                className="text-danger text-sm"
              />
              {submitError && (
                <p className="text-danger text-sm font-medium">{submitError}</p>
              )}
              <GradientButton disabled={isSubmitting}>
                {isSubmitting ? "Joining..." : "Accept invitation"}
              </GradientButton>
            </Form>
          )}
        </Formik>
      ) : (
        <div className="space-y-4">
          {submitError && (
            <p className="text-danger text-sm font-medium">{submitError}</p>
          )}
          <GradientButton type="button" onClick={() => void accept({})}>
            Accept invitation
          </GradientButton>
          <button
            type="button"
            className="text-sm text-brand-primary underline"
            onClick={() => setNeedsAccount(true)}
          >
            Create a new account instead
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

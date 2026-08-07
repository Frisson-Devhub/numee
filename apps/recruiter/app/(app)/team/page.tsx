"use client";

import { useCallback, useEffect, useState } from "react";
import { Formik, Form, ErrorMessage, type FormikHelpers } from "formik";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { apiRoutes } from "@/constants/api";
import { TeamInviteSchema } from "@/constants/formikSchema";
import { ApiCall } from "@/lib/utils";

type Member = {
  id: string;
  role: "OWNER" | "RECRUITER";
  user: {
    id: string;
    firstName: string;
    lastName: string;
    emailOrPhone: string;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
};

/**
 * Team members + pending invites. Invite/revoke actions are owner-only and
 * respect the company’s recruiter seat limit.
 */
export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [limits, setLimits] = useState({ maxRecruiters: 3, recruiterCount: 0 });
  const [membershipRole, setMembershipRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isOwner = membershipRole === "OWNER";

  const load = useCallback(async () => {
    const [teamRes, companyRes] = await Promise.all([
      ApiCall<{
        members?: Member[];
        invitations?: Invitation[];
        limits?: { maxRecruiters: number; recruiterCount: number };
        error?: string;
      }>({ url: apiRoutes.recruiter.team, method: "GET" }),
      ApiCall<{ membershipRole?: string }>({
        url: apiRoutes.recruiter.company,
        method: "GET",
      }),
    ]);

    if (!teamRes.ok) {
      setError(teamRes.data?.error ?? teamRes.error ?? "Failed to load team");
      setLoading(false);
      return;
    }
    setMembers(teamRes.data?.members ?? []);
    setInvitations(teamRes.data?.invitations ?? []);
    if (teamRes.data?.limits) setLimits(teamRes.data.limits);
    if (companyRes.ok) setMembershipRole(companyRes.data?.membershipRole ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async (
    values: { email: string },
    { setSubmitting, resetForm }: FormikHelpers<{ email: string }>,
  ) => {
    setError("");
    setSuccess("");
    try {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.recruiter.teamInvite,
        method: "POST",
        body: { email: values.email, role: "RECRUITER" },
      });
      if (!res.ok) {
        setError(res.data?.error ?? res.error ?? "Invite failed");
        return;
      }
      setSuccess(`Invitation sent to ${values.email}`);
      resetForm();
      await load();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Remove this team member?")) return;
    setError("");
    const res = await ApiCall<{ error?: string }>({
      url: apiRoutes.recruiter.teamMember(memberId),
      method: "DELETE",
    });
    if (!res.ok) {
      setError(res.data?.error ?? res.error ?? "Failed to remove member");
      return;
    }
    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Team</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Manage recruiters for your company. Max {limits.maxRecruiters}{" "}
          recruiter seats ({limits.recruiterCount} used).
        </p>
      </div>

      {isOwner && (
        <section className="rounded-xl border border-border-default bg-surface p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Invite recruiter
          </h2>
          <Formik
            initialValues={{ email: "" }}
            validationSchema={TeamInviteSchema}
            onSubmit={invite}
          >
            {({ isSubmitting, setFieldValue, values }) => (
              <Form className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <LabeledInput
                    id="email"
                    type="email"
                    label="Work email"
                    placeholder="teammate@company.com"
                    value={values.email}
                    onChange={(e) => setFieldValue("email", e.target.value)}
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="text-danger text-sm mt-1"
                  />
                </div>
                <GradientButton
                  disabled={isSubmitting}
                  className="!w-auto px-6 shrink-0"
                >
                  {isSubmitting ? "Sending..." : "Send invite"}
                </GradientButton>
              </Form>
            )}
          </Formik>
        </section>
      )}

      {error && <p className="text-danger text-sm font-medium">{error}</p>}
      {success && <p className="text-success text-sm font-medium">{success}</p>}

      <section className="rounded-xl border border-border-default bg-surface overflow-hidden">
        <div className="border-b border-border-default px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Members</h2>
        </div>
        <ul className="divide-y divide-border-default">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {m.user.firstName} {m.user.lastName}
                </p>
                <p className="text-xs text-foreground-subtle">
                  {m.user.emailOrPhone}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-primary">
                  {m.role}
                </span>
                {isOwner && m.role !== "OWNER" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void removeMember(m.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {invitations.length > 0 && (
        <section className="rounded-xl border border-border-default bg-surface overflow-hidden">
          <div className="border-b border-border-default px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Pending invites
            </h2>
          </div>
          <ul className="divide-y divide-border-default">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {inv.email}
                  </p>
                  <p className="text-xs text-foreground-subtle">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs font-medium text-foreground-subtle uppercase">
                  {inv.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  FileEdit,
  Archive,
  Users,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { apiRoutes } from "@/constants/api";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { ApiCall } from "@/lib/utils";

type DashboardPayload = {
  cards: {
    activeJobs: number;
    draftJobs: number;
    closedJobs: number;
    applications: number;
    aiMatchedCandidates: number;
  };
  stubs: {
    applications: { available: boolean; message: string };
    matching: { available: boolean; message: string };
    outreach: { available: boolean; message: string };
  };
  activity: {
    id: string;
    action: string;
    createdAt: string;
    metadata?: unknown;
    actor?: {
      firstName?: string;
      lastName?: string;
      emailOrPhone?: string;
    };
  }[];
};

function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-foreground-subtle">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
          {hint && (
            <p className="mt-1 text-xs text-foreground-subtle">{hint}</p>
          )}
        </div>
        <div className="rounded-lg bg-brand-primary/10 p-2.5 text-brand-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function formatAction(action: string) {
  return action.replace(/\./g, " · ").replace(/_/g, " ");
}

/**
 * Recruiter home metrics + recent activity. Stub cards surface features that
 * are not live yet (`stubs.*.available === false`).
 */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await ApiCall<DashboardPayload & { error?: string }>({
        url: apiRoutes.recruiter.dashboard,
        method: "GET",
      });
      if (cancelled) return;
      if (!res.ok || !res.data?.cards) {
        setError(res.data?.error ?? res.error ?? "Failed to load dashboard");
        setLoading(false);
        return;
      }
      setData(res.data as DashboardPayload);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-brand-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-danger/30 bg-surface p-6 text-danger">
        {error || "Unable to load dashboard"}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Hiring overview for your company.
          </p>
        </div>
        <Link
          href={recruiterRoutes.jobsNew}
          className="inline-flex items-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-primary-bright transition-colors"
        >
          Post a job
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Active jobs"
          value={data.cards.activeJobs}
          icon={Briefcase}
        />
        <MetricCard
          label="Drafts"
          value={data.cards.draftJobs}
          icon={FileEdit}
        />
        <MetricCard
          label="Closed"
          value={data.cards.closedJobs}
          icon={Archive}
        />
        <MetricCard
          label="Applications"
          value={data.cards.applications}
          icon={Users}
          hint={data.stubs.applications.message}
        />
        <MetricCard
          label="AI matched candidates"
          value={data.cards.aiMatchedCandidates}
          icon={Sparkles}
          hint={data.stubs.matching.message}
        />
        <div className="rounded-xl border border-dashed border-border-strong bg-surface-subtle p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-foreground-subtle">Outreach</p>
              <p className="mt-2 text-base font-medium text-foreground">
                {data.stubs.outreach.message}
              </p>
            </div>
            <div className="rounded-lg bg-brand-accent/10 p-2.5 text-brand-accent">
              <Megaphone className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border-default bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          Recent activity
        </h2>
        {data.activity.length === 0 ? (
          <p className="mt-4 text-sm text-foreground-subtle">
            No activity yet. Create a job or invite a teammate to get started.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border-default">
            {data.activity.map((item) => {
              const actorName = item.actor
                ? `${item.actor.firstName ?? ""} ${item.actor.lastName ?? ""}`.trim() ||
                  item.actor.emailOrPhone
                : "Someone";
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {formatAction(item.action)}
                    </p>
                    <p className="text-xs text-foreground-subtle">{actorName}</p>
                  </div>
                  <time className="text-xs text-foreground-subtle">
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

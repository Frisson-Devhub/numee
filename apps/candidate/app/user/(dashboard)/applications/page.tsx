"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Briefcase, Building2, CalendarDays, MapPin } from "lucide-react";
import { apiRoutes } from "@/constants/api";
import { DASHBOARD_CARD_CLASS } from "@/constants/constants";
import { Spinner } from "@/components/ui/Spinner";
import { ApiCall } from "@/lib/utils";

type Application = {
  id: string;
  status: string;
  appliedAt: string;
  job: {
    id: string;
    title: string;
    status: string;
    location: string | null;
    workMode: string | null;
    employmentType: string | null;
    company: { id: string; name: string; logoUrl: string | null };
  };
};

const statusClasses: Record<string, string> = {
  APPLIED: "bg-blue-50 text-[#205ec5]",
  REVIEWING: "bg-amber-50 text-amber-700",
  SHORTLISTED: "bg-violet-50 text-violet-700",
  REJECTED: "bg-red-50 text-red-700",
  HIRED: "bg-emerald-50 text-emerald-700",
};

function statusLabel(status: string) {
  return status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Candidate’s submitted applications with pipeline status badges. */
export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await ApiCall<{ applications?: Application[]; error?: string }>({
      url: apiRoutes.user.applications,
      method: "GET",
    });
    setLoading(false);
    if (!res.ok) {
      setApplications([]);
      setError(res.data?.error ?? res.error ?? "Failed to load your applications");
      return;
    }
    setApplications(res.data?.applications ?? []);
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <section className={DASHBOARD_CARD_CLASS}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#205ec5]">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">My Applications</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track the status of roles you have applied for.
            </p>
          </div>
        </div>

        {loading && (
          <div className="mt-8 flex justify-center py-8">
            <Spinner className="h-8 w-8 text-[#205ec5]" />
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadApplications()}
              className="mt-2 font-medium underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && applications.length === 0 && (
          <div className="mt-7 rounded-lg border border-dashed border-gray-200 px-5 py-8 text-center">
            <p className="font-medium text-gray-800">No applications yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Explore open roles and apply when you find a good fit.
            </p>
            <Link
              href="/user/jobs"
              className="mt-4 inline-flex text-sm font-semibold text-[#205ec5] hover:underline"
            >
              Browse jobs
            </Link>
          </div>
        )}

        {!loading && !error && applications.length > 0 && (
          <ul className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-100">
            {applications.map((application) => {
              const { job } = application;
              return (
                <li key={application.id}>
                  <Link
                    href={`/user/jobs/${job.id}`}
                    className="block px-4 py-4 transition-colors hover:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#205ec5]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{job.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            {job.company.name}
                          </span>
                          {(job.location || job.workMode) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {[job.location, job.workMode].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Applied {new Date(application.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusClasses[application.status] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabel(application.status)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

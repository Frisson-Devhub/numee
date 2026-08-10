"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, ErrorMessage, type FormikHelpers } from "formik";
import { Sparkles, Wand2 } from "lucide-react";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { SelectInput } from "@/components/ui/SelectInput";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { GradientButton } from "@/components/ui/GradientButton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { apiRoutes } from "@/constants/api";
import { JobSchema } from "@/constants/formikSchema";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { ApiCall } from "@/lib/utils";
import { RichTextEditor } from "@/components/jobs/RichTextEditor";
import { SkillsChipInput } from "@/components/jobs/SkillsChipInput";

type CatalogIndustry = { id: string; name: string; slug: string };
type CatalogJobRole = {
  id: string;
  name: string;
  slug: string;
  industryId?: string | null;
};

/** Formik shape for create/edit; numeric API fields stay strings until submit. */
export type JobFormValues = {
  title: string;
  department: string;
  employmentType: string;
  workMode: string;
  location: string;
  experienceMin: string;
  experienceMax: string;
  noticePeriod: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryNegotiable: boolean;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  skillsText: string;
  pipelineText: string;
  industryId: string;
  jobRoleId: string;
};

export type JobRecord = {
  id: string;
  title: string;
  department?: string | null;
  employmentType?: string | null;
  workMode?: string | null;
  location?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  noticePeriod?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryNegotiable?: boolean;
  description?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  pipelineStages?: unknown;
  status?: string;
  industryId?: string | null;
  jobRoleId?: string | null;
  industry?: { id: string; name: string; slug: string } | null;
  jobRole?: {
    id: string;
    name: string;
    slug: string;
    industryId?: string | null;
  } | null;
  skills?: { name: string; required: boolean }[];
  embedding?: { status?: string } | null;
};

type Enhancement = {
  title?: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  suggestedSkills?: { name: string; required: boolean }[];
  keywords?: string[];
  summary?: string;
};

/**
 * Fields recruiters must fill before AI can draft a job description.
 * Mirrors the inputs the enhance-draft endpoint uses for a useful JD.
 */
const JD_AI_REQUIRED_FIELDS: {
  key: keyof JobFormValues;
  label: string;
}[] = [
  { key: "title", label: "Job title" },
  { key: "industryId", label: "Industry" },
  { key: "jobRoleId", label: "Job role" },
  { key: "employmentType", label: "Employment type" },
  { key: "workMode", label: "Work mode" },
  { key: "location", label: "Location" },
  { key: "experienceMin", label: "Min years of experience" },
  { key: "skillsText", label: "Skills" },
];

/** True when TipTap/HTML description has visible text (not empty tags). */
function hasJobDescriptionText(html: string | null | undefined): boolean {
  if (!html) return false;
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length > 0;
}

/** Labels of JD-AI prerequisites still empty on the form. */
function missingJdAiFields(values: JobFormValues): string[] {
  return JD_AI_REQUIRED_FIELDS.filter(
    ({ key }) => !String(values[key] ?? "").trim(),
  ).map(({ label }) => label);
}

const emptyValues: JobFormValues = {
  title: "",
  department: "",
  employmentType: "",
  workMode: "",
  location: "",
  experienceMin: "",
  experienceMax: "",
  noticePeriod: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "INR",
  salaryNegotiable: false,
  description: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  skillsText: "",
  pipelineText: "Applied, Screen, Interview, Offer, Hired",
  industryId: "",
  jobRoleId: "",
};

const textareaClassName =
  "w-full min-h-[6rem] rounded-lg border border-border-default bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none transition duration-200 placeholder:text-foreground-subtle hover:border-border-strong focus:border-focus-ring focus:shadow-input-focus disabled:cursor-not-allowed disabled:opacity-60";

/** Map API job record → Formik values (numbers/arrays → strings for inputs). */
export function jobToFormValues(job?: JobRecord | null): JobFormValues {
  if (!job) return emptyValues;
  const stages = Array.isArray(job.pipelineStages)
    ? (job.pipelineStages as string[]).join(", ")
    : emptyValues.pipelineText;
  return {
    title: job.title ?? "",
    department: job.department ?? "",
    employmentType: job.employmentType ?? "",
    workMode: job.workMode ?? "",
    location: job.location ?? "",
    experienceMin:
      job.experienceMin === null || job.experienceMin === undefined
        ? ""
        : String(job.experienceMin),
    experienceMax:
      job.experienceMax === null || job.experienceMax === undefined
        ? ""
        : String(job.experienceMax),
    noticePeriod: job.noticePeriod ?? "",
    salaryMin:
      job.salaryMin === null || job.salaryMin === undefined
        ? ""
        : String(job.salaryMin),
    salaryMax:
      job.salaryMax === null || job.salaryMax === undefined
        ? ""
        : String(job.salaryMax),
    salaryCurrency: job.salaryCurrency ?? "INR",
    salaryNegotiable: Boolean(job.salaryNegotiable),
    description: job.description ?? "",
    responsibilities: job.responsibilities ?? "",
    requirements: job.requirements ?? "",
    benefits: job.benefits ?? "",
    skillsText: (job.skills ?? []).map((s) => s.name).join(", "),
    pipelineText: stages,
    industryId: job.industryId ?? job.industry?.id ?? "",
    jobRoleId: job.jobRoleId ?? job.jobRole?.id ?? "",
  };
}

/** Formik values → Nest body: split skills/pipeline, coerce empty numbers to null. */
function toPayload(values: JobFormValues) {
  const skills = values.skillsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, required: true }));
  const pipelineStages = values.pipelineText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const numOrNull = (v: string) => {
    if (v === "" || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    title: values.title,
    department: values.department || null,
    employmentType: values.employmentType || null,
    workMode: values.workMode || null,
    location: values.location || null,
    experienceMin: numOrNull(values.experienceMin),
    experienceMax: numOrNull(values.experienceMax),
    noticePeriod: values.noticePeriod || null,
    salaryMin: numOrNull(values.salaryMin),
    salaryMax: numOrNull(values.salaryMax),
    salaryCurrency: values.salaryCurrency || null,
    salaryNegotiable: values.salaryNegotiable,
    description: values.description || null,
    responsibilities: values.responsibilities || null,
    requirements: values.requirements || null,
    benefits: values.benefits || null,
    pipelineStages,
    skills,
    industryId: values.industryId || null,
    jobRoleId: values.jobRoleId || null,
  };
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-foreground-subtle">{children}</p>;
}

/** Soft inset group for related fields inside a section (not a decorative card). */
function FieldCluster({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-soft bg-surface-muted/50 px-4 py-4 sm:px-5">
      {title ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Section shell for job form blocks — teal accent rail + muted header for hierarchy.
 */
function FormSection({
  step,
  title,
  description,
  children,
  actions,
}: {
  step?: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border-default bg-surface shadow-sm">
      <div className="flex gap-0">
        <div
          aria-hidden
          className="w-1 shrink-0 bg-gradient-to-b from-brand-primary to-brand-primary-bright"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-soft bg-surface-muted/60 px-5 py-4 sm:px-6">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                {step ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-primary/10 px-1.5 text-xs font-bold tabular-nums text-brand-primary">
                    {step}
                  </span>
                ) : null}
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
              </div>
              {description ? (
                <p className="max-w-xl text-sm leading-relaxed text-foreground-muted">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

/**
 * Create/edit job with catalog industry/role, AI enhance/summarize, and
 * publish/draft/close actions. Closed jobs stay read-only.
 */
export function JobForm({
  mode,
  job,
}: {
  mode: "create" | "edit";
  job?: JobRecord | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [enhancement, setEnhancement] = useState<Enhancement | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [industries, setIndustries] = useState<CatalogIndustry[]>([]);
  const [jobRoles, setJobRoles] = useState<CatalogJobRole[]>([]);
  /**
   * JD editor stays locked until AI generates text (or the job already has a
   * description). Once unlocked in this session it stays editable.
   */
  const [jdEditable, setJdEditable] = useState(() =>
    hasJobDescriptionText(job?.description),
  );

  const closed = job?.status === "CLOSED";

  useEffect(() => {
    if (hasJobDescriptionText(job?.description)) {
      setJdEditable(true);
    }
  }, [job?.description, job?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [indRes, roleRes] = await Promise.all([
        ApiCall<{ industries?: CatalogIndustry[] }>({
          url: apiRoutes.recruiter.catalogIndustries,
          method: "GET",
        }),
        ApiCall<{ jobRoles?: CatalogJobRole[] }>({
          url: apiRoutes.recruiter.catalogJobRoles,
          method: "GET",
        }),
      ]);
      if (cancelled) return;
      if (indRes.ok) setIndustries(indRes.data?.industries ?? []);
      if (roleRes.ok) setJobRoles(roleRes.data?.jobRoles ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (
    values: JobFormValues,
    options?: { publish?: boolean },
  ) => {
    setError("");
    setBusyAction(options?.publish ? "publish" : "save");
    try {
      const body = toPayload(values);
      let jobId = job?.id;
      if (mode === "create") {
        const res = await ApiCall<{ job?: JobRecord; error?: string }>({
          url: apiRoutes.recruiter.jobs,
          method: "POST",
          body,
        });
        if (!res.ok || !res.data?.job) {
          setError(res.data?.error ?? res.error ?? "Failed to create job");
          return;
        }
        jobId = res.data.job.id;
      } else if (jobId) {
        const res = await ApiCall<{ job?: JobRecord; error?: string }>({
          url: apiRoutes.recruiter.job(jobId),
          method: "PATCH",
          body,
        });
        if (!res.ok || !res.data?.job) {
          setError(res.data?.error ?? res.error ?? "Failed to update job");
          return;
        }
      }

      if (options?.publish && jobId) {
        const pub = await ApiCall<{ job?: JobRecord; error?: string }>({
          url: apiRoutes.recruiter.jobPublish(jobId),
          method: "POST",
        });
        if (!pub.ok) {
          setError(pub.data?.error ?? pub.error ?? "Failed to publish");
          if (mode === "create") router.replace(recruiterRoutes.jobEdit(jobId));
          return;
        }
      }

      if (jobId) {
        router.replace(recruiterRoutes.job(jobId));
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setBusyAction(null);
    }
  };

  const save = async (
    values: JobFormValues,
    { setSubmitting }: FormikHelpers<JobFormValues>,
    options?: { publish?: boolean },
  ) => {
    setSubmitting(true);
    try {
      await persist(values, options);
    } finally {
      setSubmitting(false);
    }
  };

  const enhance = async (values: JobFormValues) => {
    if (!job?.id) {
      setError("Save the job as a draft before using AI enhance.");
      return;
    }
    setEnhancing(true);
    setError("");
    try {
      const res = await ApiCall<{
        enhancement?: Enhancement;
        error?: string;
        message?: string;
      }>({
        url: apiRoutes.recruiter.jobEnhance(job.id),
        method: "POST",
        body: {
          title: values.title,
          responsibilities: values.responsibilities,
          requirements: values.requirements,
          benefits: values.benefits,
          skills: toPayload(values).skills,
        },
      });
      if (!res.ok || !res.data?.enhancement) {
        setError(res.data?.error ?? res.error ?? "Enhance failed");
        return;
      }
      setEnhancement(res.data.enhancement);
    } catch {
      setError("Enhance failed");
    } finally {
      setEnhancing(false);
    }
  };

  const summarizeDescription = async (values: JobFormValues) => {
    const missing = missingJdAiFields(values);
    if (missing.length > 0) {
      setError(
        `Fill required fields before creating a job description with AI: ${missing.join(", ")}.`,
      );
      return;
    }
    setSummarizing(true);
    setError("");
    setAiSummary(null);
    try {
      const payload = toPayload(values);
      const industryName =
        industries.find((i) => i.id === values.industryId)?.name ?? null;
      const jobRoleName =
        jobRoles.find((r) => r.id === values.jobRoleId)?.name ?? null;
      const res = await ApiCall<{
        descriptionHtml?: string;
        summary?: string;
        error?: string;
      }>({
        url: apiRoutes.recruiter.jobEnhanceDraft,
        method: "POST",
        body: {
          title: values.title,
          department: values.department || null,
          employmentType: values.employmentType || null,
          workMode: values.workMode || null,
          location: values.location || null,
          experienceMin: payload.experienceMin,
          experienceMax: payload.experienceMax,
          noticePeriod: payload.noticePeriod,
          salaryMin: payload.salaryMin,
          salaryMax: payload.salaryMax,
          salaryCurrency: payload.salaryCurrency,
          salaryNegotiable: payload.salaryNegotiable,
          description: values.description || null,
          responsibilities: values.responsibilities,
          requirements: values.requirements,
          benefits: values.benefits,
          skills: payload.skills,
          industryName,
          jobRoleName,
        },
      });
      const html = res.data?.descriptionHtml ?? res.data?.summary;
      if (!res.ok || !html) {
        setError(
          res.data?.error ?? res.error ?? "Failed to create job description",
        );
        return;
      }
      setAiSummary(html);
    } catch {
      setError("Failed to create job description");
    } finally {
      setSummarizing(false);
    }
  };

  const closeJob = async () => {
    if (!job?.id || !confirm("Close this job?")) return;
    setBusyAction("close");
    const res = await ApiCall<{ error?: string }>({
      url: apiRoutes.recruiter.jobClose(job.id),
      method: "POST",
    });
    setBusyAction(null);
    if (!res.ok) {
      setError(res.data?.error ?? res.error ?? "Failed to close job");
      return;
    }
    router.replace(recruiterRoutes.job(job.id));
    router.refresh();
  };

  return (
    <Formik<JobFormValues>
      initialValues={jobToFormValues(job)}
      enableReinitialize
      validationSchema={JobSchema}
      onSubmit={(values, helpers) => void save(values, helpers)}
    >
      {({ isSubmitting, setFieldValue, values, setValues }) => {
        const statusHint =
          mode === "create"
            ? "Save a draft anytime — publish when the posting is ready."
            : job?.status === "PUBLISHED"
              ? "Changes apply to the live posting when you save."
              : "Keep editing as a draft until you publish.";
        const jdAiMissing = missingJdAiFields(values);
        const canCreateJdWithAi = jdAiMissing.length === 0;
        const jdEditorLocked = !closed && !jdEditable;

        return (
          <Form className="pb-24">
            <div className="space-y-6">
              <Modal open={!!enhancement} onClose={() => setEnhancement(null)}>
                <div className="max-h-[80vh] space-y-4 overflow-y-auto p-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    AI suggestions
                  </h3>
                  {enhancement?.summary && (
                    <p className="text-sm text-foreground-muted">
                      {enhancement.summary}
                    </p>
                  )}
                  {enhancement?.keywords?.length ? (
                    <p className="text-xs text-foreground-subtle">
                      Keywords: {enhancement.keywords.join(", ")}
                    </p>
                  ) : null}
                  <p className="text-sm text-foreground-muted">
                    Review and apply. Nothing is overwritten until you confirm.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <GradientButton
                      type="button"
                      className="!w-auto px-5"
                      onClick={() => {
                        if (!enhancement) return;
                        setValues({
                          ...values,
                          title: enhancement.title ?? values.title,
                          responsibilities:
                            enhancement.responsibilities ??
                            values.responsibilities,
                          requirements:
                            enhancement.requirements ?? values.requirements,
                          benefits: enhancement.benefits ?? values.benefits,
                          skillsText: enhancement.suggestedSkills?.length
                            ? enhancement.suggestedSkills
                                .map((s) => s.name)
                                .join(", ")
                            : values.skillsText,
                        });
                        setEnhancement(null);
                      }}
                    >
                      Apply to form
                    </GradientButton>
                    <Button
                      type="button"
                      size="md"
                      variant="secondary"
                      onClick={() => setEnhancement(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </Modal>

              <Modal open={aiSummary !== null} onClose={() => setAiSummary(null)}>
                <div className="max-h-[80vh] space-y-4 overflow-y-auto p-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    Job description preview
                  </h3>
                  <p className="text-sm text-foreground-muted">
                    Review the AI job description below. Nothing is written to the
                    editor until you apply.
                  </p>
                  <div
                    className="rich-text-content rounded-lg border border-border-default bg-surface-muted/40 px-3 py-3 text-sm text-foreground"
                    dangerouslySetInnerHTML={{ __html: aiSummary ?? "" }}
                  />
                  <div className="flex flex-wrap gap-3">
                    <GradientButton
                      type="button"
                      className="!w-auto px-5"
                      onClick={() => {
                        if (!aiSummary) return;
                        void setFieldValue("description", aiSummary);
                        setJdEditable(true);
                        setAiSummary(null);
                      }}
                    >
                      Apply
                    </GradientButton>
                    <Button
                      type="button"
                      size="md"
                      variant="secondary"
                      onClick={() => setAiSummary(null)}
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              </Modal>

              {/* lg+: main content left, metadata/settings right; JD is full-width last */}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
                <div className="min-w-0 space-y-6">
                  <FormSection
                    step="01"
                    title="Basic details"
                    description="Title, catalog role, and how candidates will find this posting."
                  >
                    <div>
                      <LabeledInput
                        id="title"
                        label="Job title"
                        placeholder="e.g. Senior Frontend Engineer"
                        value={values.title}
                        onChange={(e) => setFieldValue("title", e.target.value)}
                        disabled={closed}
                      />
                      <ErrorMessage
                        name="title"
                        component="div"
                        className="mt-1.5 text-sm text-danger"
                      />
                    </div>

                    <FieldCluster title="Catalog">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <SelectInput
                            id="industryId"
                            label="Industry"
                            value={values.industryId}
                            onChange={(e) => {
                              const nextIndustry = e.target.value;
                              setFieldValue("industryId", nextIndustry);
                              const role = jobRoles.find(
                                (r) => r.id === values.jobRoleId,
                              );
                              if (
                                role?.industryId &&
                                nextIndustry &&
                                role.industryId !== nextIndustry
                              ) {
                                setFieldValue("jobRoleId", "");
                              }
                            }}
                            disabled={closed}
                          >
                            <option value="">Select industry</option>
                            {industries.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name}
                              </option>
                            ))}
                          </SelectInput>
                          <FieldHint>
                            Filters job roles and improves AI matching.
                          </FieldHint>
                        </div>
                        <div>
                          <SelectInput
                            id="jobRoleId"
                            label="Job role"
                            value={values.jobRoleId}
                            onChange={(e) => {
                              const nextRoleId = e.target.value;
                              setFieldValue("jobRoleId", nextRoleId);
                              const role = jobRoles.find(
                                (r) => r.id === nextRoleId,
                              );
                              if (role?.industryId && !values.industryId) {
                                setFieldValue("industryId", role.industryId);
                              }
                            }}
                            disabled={closed}
                          >
                            <option value="">Select job role</option>
                            {jobRoles
                              .filter(
                                (r) =>
                                  !values.industryId ||
                                  !r.industryId ||
                                  r.industryId === values.industryId,
                              )
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                          </SelectInput>
                          <FieldHint>
                            Catalog role used for search and recommendations.
                          </FieldHint>
                        </div>
                      </div>
                    </FieldCluster>

                    <FieldCluster title="Placement">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <LabeledInput
                          id="department"
                          label="Department"
                          placeholder="e.g. Engineering"
                          value={values.department}
                          onChange={(e) =>
                            setFieldValue("department", e.target.value)
                          }
                          disabled={closed}
                        />
                        <SelectInput
                          id="employmentType"
                          label="Employment type"
                          value={values.employmentType}
                          onChange={(e) =>
                            setFieldValue("employmentType", e.target.value)
                          }
                          disabled={closed}
                        >
                          <option value="">Select type</option>
                          <option value="full-time">Full-time</option>
                          <option value="part-time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="internship">Internship</option>
                        </SelectInput>
                        <SelectInput
                          id="workMode"
                          label="Work mode"
                          value={values.workMode}
                          onChange={(e) =>
                            setFieldValue("workMode", e.target.value)
                          }
                          disabled={closed}
                        >
                          <option value="">Select mode</option>
                          <option value="onsite">On-site</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="remote">Remote</option>
                        </SelectInput>
                        <div>
                          <LabeledInput
                            id="location"
                            label="Location"
                            placeholder="e.g. Bengaluru, India"
                            value={values.location}
                            onChange={(e) =>
                              setFieldValue("location", e.target.value)
                            }
                            disabled={closed}
                          />
                          <FieldHint>
                            City or region candidates should expect for this role.
                          </FieldHint>
                        </div>
                      </div>
                    </FieldCluster>
                  </FormSection>

                  <FormSection
                    step="02"
                    title="Role details"
                    description="Optional notes for AI drafting. Candidates see this content only inside the Job Description, not as separate sections."
                    actions={
                      !closed && mode === "edit" && job?.id ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={enhancing || summarizing || !!busyAction}
                          onClick={() => void enhance(values)}
                          className="!normal-case !tracking-normal inline-flex items-center gap-2 border border-border-soft bg-surface shadow-sm"
                        >
                          {enhancing ? (
                            <>
                              <Spinner className="h-4 w-4 text-brand-primary" />
                              Enhancing…
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 text-brand-primary" />
                              Enhance with AI
                            </>
                          )}
                        </Button>
                      ) : null
                    }
                  >
                    {(
                      [
                        [
                          "responsibilities",
                          "Responsibilities",
                          6,
                          "Outline what this role owns day to day…",
                        ],
                        [
                          "requirements",
                          "Requirements",
                          5,
                          "Must-have experience, education, or tools…",
                        ],
                        [
                          "benefits",
                          "Benefits",
                          4,
                          "Perks, equity, learning budget, flexibility…",
                        ],
                      ] as const
                    ).map(([key, label, rows, placeholder]) => (
                      <div key={key}>
                        <label
                          htmlFor={key}
                          className="mb-1.5 block text-sm font-medium text-foreground-muted"
                        >
                          {label}
                        </label>
                        <textarea
                          id={key}
                          rows={rows}
                          disabled={closed}
                          value={values[key]}
                          onChange={(e) => setFieldValue(key, e.target.value)}
                          placeholder={placeholder}
                          className={textareaClassName}
                        />
                      </div>
                    ))}
                  </FormSection>
                </div>

                <div className="min-w-0 space-y-6 lg:sticky lg:top-4 lg:self-start">
                  <FormSection
                    step="03"
                    title="Experience"
                    description="Seniority band and availability expectations."
                  >
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      <div>
                        <LabeledInput
                          id="experienceMin"
                          type="number"
                          label="Min years"
                          placeholder="2"
                          value={values.experienceMin}
                          onChange={(e) =>
                            setFieldValue("experienceMin", e.target.value)
                          }
                          disabled={closed}
                        />
                      </div>
                      <div>
                        <LabeledInput
                          id="experienceMax"
                          type="number"
                          label="Max years"
                          placeholder="6"
                          value={values.experienceMax}
                          onChange={(e) =>
                            setFieldValue("experienceMax", e.target.value)
                          }
                          disabled={closed}
                        />
                      </div>
                      <div>
                        <LabeledInput
                          id="noticePeriod"
                          label="Notice period"
                          placeholder="e.g. 30 days"
                          value={values.noticePeriod}
                          onChange={(e) =>
                            setFieldValue("noticePeriod", e.target.value)
                          }
                          disabled={closed}
                        />
                        <FieldHint>
                          Typical joining timeline you can accept.
                        </FieldHint>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection
                    step="04"
                    title="Compensation"
                    description="Salary range shown to candidates. Leave blank if confidential."
                  >
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      <LabeledInput
                        id="salaryMin"
                        type="number"
                        label="Salary min"
                        placeholder="1200000"
                        value={values.salaryMin}
                        onChange={(e) =>
                          setFieldValue("salaryMin", e.target.value)
                        }
                        disabled={closed}
                      />
                      <LabeledInput
                        id="salaryMax"
                        type="number"
                        label="Salary max"
                        placeholder="2000000"
                        value={values.salaryMax}
                        onChange={(e) =>
                          setFieldValue("salaryMax", e.target.value)
                        }
                        disabled={closed}
                      />
                      <div>
                        <LabeledInput
                          id="salaryCurrency"
                          label="Currency"
                          placeholder="INR"
                          value={values.salaryCurrency}
                          onChange={(e) =>
                            setFieldValue("salaryCurrency", e.target.value)
                          }
                          disabled={closed}
                        />
                        <FieldHint>ISO currency code (e.g. INR, USD).</FieldHint>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border-soft bg-surface-muted/40 px-4 py-3">
                      <CheckboxField
                        id="salaryNegotiable"
                        checked={values.salaryNegotiable}
                        onChange={(e) =>
                          setFieldValue("salaryNegotiable", e.target.checked)
                        }
                        label="Salary negotiable"
                        disabled={closed}
                      />
                    </div>
                  </FormSection>

                  <FormSection
                    step="05"
                    title="Skills"
                    description="Key skills used for matching and screening."
                  >
                    <SkillsChipInput
                      id="skillsText"
                      value={values.skillsText}
                      onChange={(next) => setFieldValue("skillsText", next)}
                      disabled={closed}
                      placeholder="e.g. React"
                    />
                  </FormSection>

                  <FormSection
                    step="06"
                    title="Hiring pipeline"
                    description="Stages candidates move through after they apply."
                  >
                    <div>
                      <LabeledInput
                        id="pipelineText"
                        label="Pipeline stages"
                        placeholder="Applied, Screen, Interview, Offer, Hired"
                        value={values.pipelineText}
                        onChange={(e) =>
                          setFieldValue("pipelineText", e.target.value)
                        }
                        disabled={closed}
                      />
                      <FieldHint>
                        Comma-separated stage names, in order.
                      </FieldHint>
                    </div>
                  </FormSection>
                </div>
              </div>

              <FormSection
                step="07"
                title="Job description"
                description={
                  jdEditorLocked
                    ? "Create a draft with AI first. The editor unlocks after you apply the generated description."
                    : "Full posting shown to candidates. Edit freely after AI creates it, or when a description already exists."
                }
                actions={
                  !closed ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={
                        summarizing ||
                        enhancing ||
                        !!busyAction ||
                        !canCreateJdWithAi
                      }
                      onClick={() => void summarizeDescription(values)}
                      className="!normal-case !tracking-normal inline-flex items-center gap-2 border border-border-soft bg-surface shadow-sm"
                      title={
                        canCreateJdWithAi
                          ? undefined
                          : `Required: ${jdAiMissing.join(", ")}`
                      }
                    >
                      {summarizing ? (
                        <>
                          <Spinner className="h-4 w-4 text-brand-primary" />
                          Creating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-brand-primary" />
                          Create with AI
                        </>
                      )}
                    </Button>
                  ) : null
                }
              >
                {!closed && !canCreateJdWithAi ? (
                  <p
                    role="status"
                    className="rounded-lg border border-border-soft bg-surface-muted/50 px-3.5 py-3 text-sm text-foreground-muted"
                  >
                    Complete these fields before creating a job description with
                    AI:{" "}
                    <span className="font-medium text-foreground">
                      {jdAiMissing.join(", ")}
                    </span>
                    .
                  </p>
                ) : null}
                {jdEditorLocked ? (
                  <p
                    role="status"
                    className="rounded-lg border border-dashed border-border-default bg-surface-muted/40 px-3.5 py-3 text-sm text-foreground-muted"
                  >
                    The job description editor is read-only until you create one
                    with AI and apply it.
                  </p>
                ) : null}
                <RichTextEditor
                  id="description"
                  value={values.description}
                  onChange={(html) => void setFieldValue("description", html)}
                  disabled={closed || jdEditorLocked}
                  placeholder={
                    jdEditorLocked
                      ? "Use Create with AI to generate a job description…"
                      : "Edit the full job description…"
                  }
                />
              </FormSection>

              {error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3.5 text-sm font-medium text-danger"
                >
                  {error}
                </div>
              ) : null}

              {closed ? (
                <p className="rounded-xl border border-border-default bg-surface px-4 py-3.5 text-sm text-foreground-muted shadow-sm">
                  This job is closed and can no longer be edited.
                </p>
              ) : null}
            </div>

            {!closed ? (
              <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-border-default bg-surface/95 px-4 py-3 shadow-md backdrop-blur-md sm:-mx-6 sm:px-6">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm text-foreground-muted">
                    {statusHint}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {mode === "edit" && job?.id && job.status === "PUBLISHED" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!busyAction || isSubmitting}
                        onClick={() => void closeJob()}
                        className="!normal-case !tracking-normal text-foreground-muted"
                      >
                        {busyAction === "close" ? "Closing…" : "Close job"}
                      </Button>
                    )}
                    <GradientButton
                      disabled={isSubmitting || !!busyAction}
                      loading={busyAction === "save"}
                      className="!w-auto !px-4 !py-2 !text-sm"
                      type="submit"
                    >
                      {mode === "create" ? "Save draft" : "Save changes"}
                    </GradientButton>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={isSubmitting || !!busyAction}
                      onClick={() => void persist(values, { publish: true })}
                      className="!normal-case !tracking-normal inline-flex items-center gap-2 !bg-none !bg-brand-primary !py-2 hover:!bg-brand-primary-bright"
                    >
                      {busyAction === "publish" ? (
                        <>
                          <Spinner className="h-3.5 w-3.5 text-on-brand" />
                          Publishing…
                        </>
                      ) : (
                        "Publish"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </Form>
        );
      }}
    </Formik>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Formik, Form, ErrorMessage, type FormikHelpers } from "formik";
import Image from "next/image";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { SelectInput } from "@/components/ui/SelectInput";
import { GradientButton } from "@/components/ui/GradientButton";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { FileDropZone } from "@/components/ui/FileDropZone";
import { apiRoutes } from "@/constants/api";
import { CompanySchema } from "@/constants/formikSchema";
import { ApiCall } from "@/lib/utils";

type Company = {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  description?: string | null;
  location?: string | null;
  logoUrl?: string | null;
  hiringCategories?: unknown;
};

type CompanyValues = {
  name: string;
  website: string;
  industry: string;
  size: string;
  description: string;
  location: string;
};

const sizeOptions = [
  { value: "", label: "Select company size" },
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201-500", label: "201–500" },
  { value: "501-1000", label: "501–1000" },
  { value: "1000+", label: "1000+" },
];

/** Company profile edit + logo upload; non-owners see a read-only view. */
export default function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [membershipRole, setMembershipRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const isOwner = membershipRole === "OWNER";

  const load = async () => {
    const res = await ApiCall<{
      company?: Company;
      membershipRole?: string;
      error?: string;
    }>({
      url: apiRoutes.recruiter.company,
      method: "GET",
    });
    if (!res.ok || !res.data?.company) {
      setError(res.data?.error ?? res.error ?? "Failed to load company");
      setLoading(false);
      return;
    }
    setCompany(res.data.company);
    setMembershipRole(res.data.membershipRole ?? "");
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async (
    values: CompanyValues,
    { setSubmitting }: FormikHelpers<CompanyValues>,
  ) => {
    setError("");
    setSuccess("");
    try {
      const res = await ApiCall<{ company?: Company; error?: string }>({
        url: apiRoutes.recruiter.company,
        method: "PATCH",
        body: {
          name: values.name,
          website: values.website || null,
          industry: values.industry || null,
          size: values.size || null,
          description: values.description || null,
          location: values.location || null,
        },
      });
      if (!res.ok || !res.data?.company) {
        setError(res.data?.error ?? res.error ?? "Failed to update company");
        return;
      }
      setCompany(res.data.company);
      setSuccess("Company profile saved.");
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogo = async (files: FileList | null) => {
    if (!files?.[0] || !isOwner) return;
    setLogoUploading(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res = await ApiCall<{ company?: Company; error?: string }>({
        url: apiRoutes.recruiter.companyLogo,
        method: "POST",
        body: formData,
      });
      if (!res.ok || !res.data?.company) {
        setError(res.data?.error ?? res.error ?? "Logo upload failed");
        return;
      }
      setCompany(res.data.company);
      setSuccess("Logo updated.");
    } catch {
      setError("Logo upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-brand-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-xl border border-danger/30 bg-surface p-6 text-danger">
        {error || "Company not found"}
      </div>
    );
  }

  const initialValues: CompanyValues = {
    name: company.name ?? "",
    website: company.website ?? "",
    industry: company.industry ?? "",
    size: company.size ?? "",
    description: company.description ?? "",
    location: company.location ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Company</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Profile details shown to candidates and teammates.
          {!isOwner && " Only owners can edit."}
        </p>
      </div>

      <section className="rounded-xl border border-border-default bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Logo</h2>
        {company.logoUrl ? (
          <Image
            src={company.logoUrl}
            alt={`${company.name} logo`}
            width={96}
            height={96}
            className="h-24 w-24 rounded-lg object-cover border border-border-default"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-surface-muted text-sm text-foreground-subtle">
            No logo
          </div>
        )}
        {isOwner && (
          <div className="max-w-md">
            <FileDropZone
              id="company-logo"
              label={logoUploading ? "Uploading..." : "Upload company logo"}
              accept="image/png,image/jpeg,image/webp"
              disabled={logoUploading}
              onChange={(files) => void handleLogo(files)}
            />
          </div>
        )}
      </section>

      <Formik
        initialValues={initialValues}
        enableReinitialize
        validationSchema={CompanySchema}
        onSubmit={handleSave}
      >
        {({ isSubmitting, setFieldValue, values }) => (
          <Form className="rounded-xl border border-border-default bg-surface p-6 space-y-4">
            <LabeledInput
              id="name"
              label="Company name"
              value={values.name}
              onChange={(e) => setFieldValue("name", e.target.value)}
              disabled={!isOwner}
            />
            <ErrorMessage
              name="name"
              component="div"
              className="text-danger text-sm"
            />
            <LabeledInput
              id="website"
              label="Website"
              value={values.website}
              onChange={(e) => setFieldValue("website", e.target.value)}
              disabled={!isOwner}
            />
            <ErrorMessage
              name="website"
              component="div"
              className="text-danger text-sm"
            />
            <LabeledInput
              id="industry"
              label="Industry"
              value={values.industry}
              onChange={(e) => setFieldValue("industry", e.target.value)}
              disabled={!isOwner}
            />
            <SelectInput
              id="size"
              label="Company size"
              value={values.size}
              onChange={(e) => setFieldValue("size", e.target.value)}
              disabled={!isOwner}
            >
              {sizeOptions.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SelectInput>
            <LabeledInput
              id="location"
              label="Location"
              value={values.location}
              onChange={(e) => setFieldValue("location", e.target.value)}
              disabled={!isOwner}
            />
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-foreground-muted mb-1.5"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                disabled={!isOwner}
                value={values.description}
                onChange={(e) => setFieldValue("description", e.target.value)}
                className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:opacity-60"
              />
            </div>
            {error && <p className="text-danger text-sm font-medium">{error}</p>}
            {success && (
              <p className="text-success text-sm font-medium">{success}</p>
            )}
            {isOwner && (
              <div className="flex gap-3">
                <GradientButton disabled={isSubmitting} className="!w-auto px-6">
                  {isSubmitting ? "Saving..." : "Save changes"}
                </GradientButton>
                <Button
                  type="button"
                  size="md"
                  variant="secondary"
                  onClick={() => void load()}
                >
                  Reset
                </Button>
              </div>
            )}
          </Form>
        )}
      </Formik>
    </div>
  );
}

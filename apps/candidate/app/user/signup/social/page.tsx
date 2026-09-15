"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { GradientButton } from "@/components/ui/GradientButton";
import { FileDropZone } from "@/components/ui/FileDropZone";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { apiRoutes } from "@/constants/api";
import { ApiCall } from "@/lib/utils";
import { frontendRoutes } from "@/constants/frontendRoutes"

function LinkedInIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function SignupSocialPage() {
  const router = useRouter();
  const [showLinkedInInput, setShowLinkedInInput] = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeKey, setResumeKey] = useState<string | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState<string | null>(null);

  useEffect(() => {
    const identifier = sessionStorage.getItem("signupIdentifier");
    setEmailOrPhone(identifier ?? null);
  }, []);

  const handleResumeChange = async (files: FileList | null) => {
    setResumeError("");
    if (!files?.length) return;

    const file = files[0];
    setResumeUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "resumes");
      if (resumeKey) formData.append("previous_key", resumeKey);
      const res = await ApiCall<{ error?: string; url?: string; key?: string }>({
        url: apiRoutes.uploadDocument,
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        setResumeError(res.data?.error ?? res.error ?? "Upload failed");
        return;
      }
      if (res.data?.url) setResumeUrl(res.data.url);
      if (res.data?.key) setResumeKey(res.data.key);
    } catch {
      setResumeError("Failed to upload resume");
    } finally {
      setResumeUploading(false);
    }
  };

  const handleReviewAndContinue = async () => {
    setSubmitError("");
    if (!resumeUrl) {
      setSubmitError("Please upload your resume to continue.");
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await ApiCall<{ error?: string }>({
        url: apiRoutes.signup.social,
        method: "POST",
        body: {
          linkedInUrl: linkedInUrl.trim() || undefined,
          resumeUrl,
          ...(emailOrPhone?.trim() ? { emailOrPhone: emailOrPhone.trim() } : {}),
        },
      });
      if (!res.ok) {
        setSubmitError(res.data?.error ?? res.error ?? "Something went wrong");
        return;
      }
      router.replace(frontendRoutes.questionnaire);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <AuthLayout rightPanelOverflow>
      <AuthFormHeading
        title="Create your account"
        subtitle="Connect your LinkedIn account and upload your profile and preferred job description to continue."
      />

      <div className="space-y-5">
        <GradientButton
          type="button"
          className="flex items-center justify-center gap-2"
          disabled={submitLoading}
          onClick={() => setShowLinkedInInput(!showLinkedInInput)}
        >
          <LinkedInIcon className="w-6 h-6 text-white" />
          Connect with LinkedIn
        </GradientButton>

        {showLinkedInInput && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <LabeledInput
              id="linkedin-url"
              label="LinkedIn Profile URL"
              placeholder="https://www.linkedin.com/in/..."
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              disabled={submitLoading}
            />
          </div>
        )}
        <p className="text-sm text-gray-500 text-center">
          Securely import your profile & experience
        </p>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500 font-medium">AND</span>
          </div>
        </div>

        <div className="space-y-4">
          <FileDropZone
            id="interested-jd"
            label="your interested JD"
            variant="document"
            accept=".pdf,.doc,.docx"
          />
          <div>
            <FileDropZone
              id="resume"
              label="your resume"
              variant="resume"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeChange}
              disabled={resumeUploading || submitLoading}
            />
            {resumeUploading && (
              <p className="text-sm text-sky-600 mt-1">Uploading…</p>
            )}
            {resumeUrl && !resumeUploading && (
              <p className="text-sm text-green-600 mt-1">Resume uploaded</p>
            )}
            {resumeError && (
              <p className="text-sm text-red-600 mt-1">{resumeError}</p>
            )}
          </div>
        </div>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {submitError}
          </p>
        )}
        <GradientButton
          type="button"
          className="w-full"
          disabled={submitLoading || resumeUploading || !resumeUrl}
          onClick={handleReviewAndContinue}
        >
          {submitLoading ? "Saving…" : resumeUploading ? "Uploading…" : "Review and continue"}
        </GradientButton>
        {!resumeUrl && !resumeUploading && (
          <p className="text-sm text-gray-500 text-center">
            Upload your resume to continue.
          </p>
        )}


        <p className="text-sm text-gray-500 text-right">
          Your data is secure and used only to personalize your experience. By continuing, you agree to our{" "}
          <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-700">
            Privacy Policy
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

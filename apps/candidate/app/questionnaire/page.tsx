"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { NuMeeLogo } from "@/components/auth/NuMeeLogo";
import { GradientButton } from "@/components/ui/GradientButton";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { CalendarIcon } from "@/components/ui/CalendarIcon";
import { Modal } from "@/components/ui/Modal";
import {
  QUESTION_STEPS,
  TOTAL_QUESTIONS,
  agentQuestionsToSteps,
  type QuestionStep,
  type QuestionField,
} from "./questionnaire-data";
import { apiRoutes } from "@/constants/api";
import { ApiCall } from "@/lib/utils";

/** Shown only after the candidate answers practical experience on the onboarding step. */
const HIDDEN_UNTIL_PRACTICAL = ["businessExperience", "professionalStations", "yearsInProfession"];

/** Field IDs required for the current step (onboarding gates some fields until practical experience). */
function getRequiredFieldIds(step: QuestionStep, answers: Record<string, string>): string[] {
  if (step.id === "onboarding") {
    const hasPractical = (answers.practicalExperience ?? "").trim().length > 0;
    if (!hasPractical) {
      return step.fields.filter((f) => !HIDDEN_UNTIL_PRACTICAL.includes(f.id)).map((f) => f.id);
    }
  }
  return step.fields.map((f) => f.id);
}

/** True when every currently required field (see `getRequiredFieldIds`) has a non-empty answer. */
function isStepComplete(step: QuestionStep, answers: Record<string, string>): boolean {
  const required = getRequiredFieldIds(step, answers);
  return required.every((id) => (answers[id] ?? "").trim().length > 0);
}

const inputClassName =
  "w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-700";

function FieldInput({
  field,
  value,
  onChange,
  twoColumns,
}: {
  field: QuestionField;
  value: string;
  onChange: (value: string) => void;
  twoColumns?: boolean;
}) {
  const wrapperClass = twoColumns ? "sm:col-span-1" : "";

  if (field.type === "textarea") {
    return (
      <div className={wrapperClass}>
        {field.label ? (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {field.label} <span className="text-red-500">*</span>
          </label>
        ) : null}
        <textarea
          id={field.id}
          rows={4}
          className={`${inputClassName} resize-y min-h-[100px]`}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  const isDate = field.type === "date";
  const labelWithRequired = field.label ? `${field.label} *` : "";
  return (
    <div className={wrapperClass}>
      <LabeledInput
        id={field.id}
        type={isDate ? "date" : "text"}
        label={labelWithRequired}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rightIcon={isDate ? <CalendarIcon /> : undefined}
      />
    </div>
  );
}

function QuestionContent({
  step,
  answers,
  onAnswer,
}: {
  step: QuestionStep;
  answers: Record<string, string>;
  onAnswer: (fieldId: string, value: string) => void;
}) {
  const showExtraExperience =
    step.id === "onboarding" && (answers.practicalExperience ?? "").trim().length > 0;
  const visibleFields =
    step.id === "onboarding" && !showExtraExperience
      ? step.fields.filter((f) => !HIDDEN_UNTIL_PRACTICAL.includes(f.id))
      : step.fields;

  const twoColumns = step.twoColumns && visibleFields.length >= 6;
  const textFields = visibleFields.filter((f) => f.type !== "textarea");

  const [extraFieldsVisible, setExtraFieldsVisible] = useState(false);
  useEffect(() => {
    if (showExtraExperience) {
      setExtraFieldsVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setExtraFieldsVisible(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setExtraFieldsVisible(false);
    }
  }, [showExtraExperience]);

  const extraFields = visibleFields.slice(6);

  return (
    <div className="space-y-4">
      {step.intro ? (
        <p className="text-base font-medium text-gray-900">{step.intro}</p>
      ) : null}
      {step.title && !step.intro ? (
        <p className="text-base font-semibold text-gray-900">{step.title}</p>
      ) : step.title && step.intro ? (
        <p className="text-base font-medium text-gray-900 mt-2">{step.title}</p>
      ) : null}

      {twoColumns ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {textFields.slice(0, 6).map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                value={answers[field.id] ?? ""}
                onChange={(v) => onAnswer(field.id, v)}
                twoColumns
              />
            ))}
          </div>
          {extraFields.length > 0 ? (
            <div
              className={`space-y-4 overflow-hidden transition-all duration-300 ease-out ${
                extraFieldsVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
              }`}
            >
              {extraFields.map((field) => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={answers[field.id] ?? ""}
                  onChange={(v) => onAnswer(field.id, v)}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-4">
          {step.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={answers[field.id] ?? ""}
              onChange={(v) => onAnswer(field.id, v)}
              twoColumns={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Multi-step written questionnaire: resumes saved progress, appends agent-generated
 * questions, and submits answers to Nest.
 */
export default function QuestionnairePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<QuestionStep[]>(QUESTION_STEPS);
  const [isRecording, setIsRecording] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState("");

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const res = await ApiCall<{
          stepIndex?: number;
          answers?: Record<string, string>;
          agentQuestions?: unknown;
        }>({ url: apiRoutes.questionnaire.progress, method: "GET" });
        if (res.status === 401) {
          window.location.href = "/login?redirectTo=questionnaire";
          return;
        }
        if (res.ok && res.data) {
          const data = res.data;
          if (typeof data.stepIndex === "number") setCurrentStep(data.stepIndex);
          if (data.answers) setAnswers(data.answers);
          const agentSteps = agentQuestionsToSteps(data.agentQuestions ?? null);
          setSteps(agentSteps.length > 0 ? [...QUESTION_STEPS, ...agentSteps] : QUESTION_STEPS);
        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      }
    };
    loadProgress();
  }, []);

  useEffect(() => {
    setStepError("");
  }, [currentStep]);

  const totalSteps = steps.length;
  const step = steps[currentStep];
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  const onAnswer = useCallback((fieldId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setStepError("");
  }, []);

  const goNext = async () => {
    setStepError("");
    if (!step || !isStepComplete(step, answers)) {
      setStepError("Please fill in all required fields before continuing.");
      return;
    }

    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    setIsSubmitting(true);

    try {
      const endpoint = isLast ? apiRoutes.questionnaire.submit : apiRoutes.questionnaire.save;
      const res = await ApiCall({
        url: endpoint,
        method: "POST",
        body: {
          stepIndex: isLast ? currentStep : nextStep,
          answers,
        },
      });
      if (!res.ok) {
        setStepError(res.error ?? "Failed to save progress.");
        return;
      }
    } catch (error) {
      console.error("Failed to save progress:", error);
      setStepError("Failed to save progress.");
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (isLast) {
      setShowSuccessModal(true);
      return;
    }
    setCurrentStep(nextStep);
  };

  const goBack = () => {
    setStepError("");
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-sky-100/90 via-white to-amber-100/80 flex flex-col">
      {/* Header */}
      <header className="pt-8 pb-4 flex flex-col items-center gap-1">
        <NuMeeLogo href="/" gradientId="questionnaire-logo" size="md" />
        <p className="text-gray-600 text-sm font-medium">Shape your future with NuMee</p>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-start justify-center px-4 pb-8 pt-2">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 flex flex-col gap-6">
          {/* Progress */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Progress
              </p>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-amber-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700 shrink-0">
              Question {currentStep + 1} of {steps.length}
            </span>
          </div>

          {/* Question content */}
          {step && <QuestionContent step={step} answers={answers} onAnswer={onAnswer} />}

          {stepError ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {stepError}
            </p>
          ) : null}

          {/* OR + Voice */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500 font-medium">OR</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRecording((r) => !r)}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-300 bg-sky-50/80 text-gray-700 font-medium hover:bg-sky-100/80 transition"
          >
            <svg
              className={`w-5 h-5 text-sky-600 ${isRecording ? "animate-pulse" : ""}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
            Record voice answer
          </button>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4 pt-2">
            {isFirst ? (
              <div />
            ) : (
              <button
                type="button"
                onClick={goBack}
                disabled={isSubmitting}
                className="py-2.5 px-5 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
            )}
            <GradientButton
              type="button"
              onClick={goNext}
              loading={isSubmitting}
              className="ml-auto w-auto min-w-[120px] px-6 py-2.5"
            >
              {isLast ? "Submit" : "Next"}
            </GradientButton>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500">
        Need help?{" "}
        <Link href="#" className="font-medium text-blue-600 hover:text-blue-700">
          Ask NuMee Assistant
        </Link>
      </footer>

      {/* Success modal */}
      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        className="p-6 sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Details saved successfully</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">
            We have saved your LinkedIn profile, resume, and the job descriptions you&apos;re
            interested in along with your questions. Based on this information, our AI Mentor will
            carefully review your details and suggest the most suitable career path for you.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Please give us a little time to complete this review and provide you with the best
            recommendations.
          </p>
          <Link
            href="/user/dashboard"
            className="w-full py-2.5 px-5 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50 transition text-center"
          >
            Back to home
          </Link>
        </div>
      </Modal>
    </div>
  );
}

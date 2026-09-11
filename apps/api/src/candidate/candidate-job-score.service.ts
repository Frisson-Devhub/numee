import { HttpException, Injectable } from "@nestjs/common";
import OpenAI from "openai";

/** Max jobs scored in a single batched LLM call. */
export const MATCH_SCORE_TOP_K = 5;

const SCORE_MODEL = "gpt-4o-mini";
const SCORE_TEMPERATURE = 0.2;
const TEXT_CAP = 1200;

export type CompactJobForScore = {
  jobId: string;
  title: string;
  skills: Array<{ name: string; required: boolean }>;
  industryName: string | null;
  jobRoleName: string | null;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  noticePeriod: string | null;
  description: string | null;
  requirements: string | null;
};

export type CompactAssessmentForScore = {
  competencies: string[];
  recommendedRoles: string[];
  highlights: string[];
};

/** Preference signals extracted from assessment; missing fields stay null. */
export type CompactPreferencesForScore = {
  location: string | null;
  workMode: string | null;
  salary: string | null;
  noticePeriod: string | null;
  employmentType: string | null;
};

export type CandidateJobLayerScore = {
  jobId: string;
  finalScore: number;
  matchLevel: string;
  semanticScore: number;
  assessmentScore: number;
  preferenceScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  strengths: string[];
  concerns: string[];
  summary: string;
  recommendation: string;
};

type AssessmentLike = {
  assessmentQuestionAnswers: unknown;
  assessmentData: unknown;
};

const SYSTEM_PROMPT = `You are an AI recruitment matching engine.

Your task is to evaluate how well a candidate matches each job posting using a 3-layer scoring system.

## Inputs (JSON user message)

- CANDIDATE_RESUME: string or null (null means no resume text; do not invent resume content)
- ASSESSMENT_RESULTS: compact assessment summary
- CANDIDATE_PREFERENCES: compact preferences (location, workMode, salary, noticePeriod, employmentType). Null fields mean unknown — treat preference layer as neutral (~50) rather than inventing conflicts.
- JOBS: array of compact job objects (score every job in this array)

---

## Layer 1: Semantic Match (50%)

Evaluate:

* Job title similarity
* Skills similarity
* Responsibilities similarity
* Industry/domain similarity
* Education relevance
* Overall profile/resume relevance to the job

When CANDIDATE_RESUME is null, score Layer 1 from ASSESSMENT_RESULTS / profile signals only. Do not invent resume content.

Generate:

semantic_score (0-100)

Reasoning:

* Matching skills
* Missing skills
* Related experience
* Relevant projects

---

## Layer 2: Assessment Match (30%)

Compare assessment performance with the requirements of the job.

Consider:

* Technical skills
* Problem solving
* Communication
* Domain knowledge
* Aptitude

Generate:

assessment_score (0-100)

Reasoning:

* Strong areas
* Weak areas
* Skills validated by assessment

---

## Layer 3: Preference Match (20%)

Evaluate:

* Preferred location
* Remote/Hybrid/Onsite preference
* Salary expectation
* Notice period
* Employment type

Generate:

preference_score (0-100)

If preferences are mostly missing/null, use ~50 (neutral). Preference mismatches should affect only the preference score.

---

## Final Score Calculation

final_score =
(semantic_score × 0.50) +
(assessment_score × 0.30) +
(preference_score × 0.20)

Round to the nearest whole number.

---

## Match Classification

90-100 = Excellent Match
75-89 = Strong Match
60-74 = Good Match
40-59 = Moderate Match
0-39 = Weak Match

---

## Return ONLY valid JSON

{
  "scores": [
    {
      "job_id": "",
      "final_score": 0,
      "match_level": "",
      "semantic_score": 0,
      "assessment_score": 0,
      "preference_score": 0,
      "matching_skills": [],
      "missing_skills": [],
      "strengths": [],
      "concerns": [],
      "summary": "",
      "recommendation": ""
    }
  ]
}

Rules:

* Score every job in JOBS exactly once; job_id must match the input jobId.
* Be strict about required skills.
* Do not inflate scores.
* Missing mandatory skills should significantly reduce the semantic score.
* Assessment results should influence technical suitability.
* Preference mismatches should affect only the preference score.
* Explain strengths and concerns clearly.
* Return JSON only with no markdown and no additional text.`;

/**
 * Batched gpt-4o-mini 3-layer scorer for candidate–job match shortlists.
 * One call scores up to {@link MATCH_SCORE_TOP_K} jobs; final_score is recomputed server-side.
 */
@Injectable()
export class CandidateJobScoreService {
  /**
   * Score a shortlist of jobs in a single LLM call.
   * Resume text is optional (pass null); does not fetch or parse resume URLs.
   */
  async scoreJobs(params: {
    resumeText: string | null;
    assessment: CompactAssessmentForScore;
    preferences: CompactPreferencesForScore;
    jobs: CompactJobForScore[];
  }): Promise<CandidateJobLayerScore[]> {
    const jobs = params.jobs.slice(0, MATCH_SCORE_TOP_K);
    if (!jobs.length) return [];

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new HttpException(
        { error: "OPENAI_API_KEY is not configured" },
        503,
      );
    }

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: SCORE_MODEL,
      response_format: { type: "json_object" },
      temperature: SCORE_TEMPERATURE,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            CANDIDATE_RESUME: params.resumeText?.trim() || null,
            ASSESSMENT_RESULTS: params.assessment,
            CANDIDATE_PREFERENCES: params.preferences,
            JOBS: jobs.map((j) => ({
              jobId: j.jobId,
              title: j.title,
              skills: j.skills,
              industryName: j.industryName,
              jobRoleName: j.jobRoleName,
              location: j.location,
              workMode: j.workMode,
              employmentType: j.employmentType,
              salaryMin: j.salaryMin,
              salaryMax: j.salaryMax,
              salaryCurrency: j.salaryCurrency,
              noticePeriod: j.noticePeriod,
              description: truncatePlain(j.description),
              requirements: truncatePlain(j.requirements),
            })),
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Failed to parse job score LLM response as JSON");
    }

    const byId = indexScores(parsed);
    const out: CandidateJobLayerScore[] = [];
    for (const job of jobs) {
      const row = byId.get(job.jobId) ?? {};
      out.push(normalizeScoreRow(job.jobId, row));
    }
    return out;
  }
}

/** Build a compact assessment payload for the scorer from stored assessment rows. */
export function buildCompactAssessment(
  assessments: AssessmentLike[],
): CompactAssessmentForScore {
  const competencies: string[] = [];
  const recommendedRoles: string[] = [];
  const highlights: string[] = [];

  for (const a of assessments) {
    const payload = extractDashboardPayload(a.assessmentData);
    if (payload) {
      const ur = asRecord(payload.user_report);
      const jr = asRecord(payload.jobs_report);

      const comps =
        (Array.isArray(ur?.main_competencies) && ur.main_competencies) ||
        (Array.isArray(payload.main_competencies)
          ? payload.main_competencies
          : null);
      if (Array.isArray(comps)) {
        for (const c of comps) {
          if (typeof c === "string" && c.trim()) competencies.push(c.trim());
          else {
            const row = asRecord(c);
            if (typeof row?.competency === "string" && row.competency.trim()) {
              competencies.push(row.competency.trim());
            }
          }
        }
      }

      const recommended =
        (Array.isArray(jr?.recommended_roles) && jr.recommended_roles) ||
        (Array.isArray(ur?.recommended_jobs) && ur.recommended_jobs) ||
        null;
      if (Array.isArray(recommended)) {
        for (const r of recommended) {
          const row = asRecord(r);
          if (typeof row?.job_role === "string" && row.job_role.trim()) {
            recommendedRoles.push(row.job_role.trim());
          }
        }
      }

      const summary =
        (typeof ur?.summary === "string" && ur.summary) ||
        (typeof payload.summary === "string" && payload.summary) ||
        null;
      if (summary?.trim()) highlights.push(truncatePlain(summary, 400) ?? "");
    }

    const pairs = Array.isArray(a.assessmentQuestionAnswers)
      ? (a.assessmentQuestionAnswers as Array<{
          user?: string;
          assistant?: string;
        }>)
      : [];
    for (const p of pairs) {
      const answer = typeof p.user === "string" ? p.user.trim() : "";
      if (answer && answer.length <= 120) highlights.push(answer);
    }
  }

  return {
    competencies: uniqueNonEmpty(competencies).slice(0, 24),
    recommendedRoles: uniqueNonEmpty(recommendedRoles).slice(0, 12),
    highlights: uniqueNonEmpty(highlights).slice(0, 16),
  };
}

/**
 * Extract compact preferences from assessment report/Q&A.
 * Missing fields remain null so the scorer can apply a neutral preference score.
 */
export function extractCompactPreferences(
  assessments: AssessmentLike[],
): CompactPreferencesForScore {
  const prefs: CompactPreferencesForScore = {
    location: null,
    workMode: null,
    salary: null,
    noticePeriod: null,
    employmentType: null,
  };

  for (const a of assessments) {
    const payload = extractDashboardPayload(a.assessmentData);
    if (payload) {
      const ur = asRecord(payload.user_report);
      const jr = asRecord(payload.jobs_report);
      const sources = [payload, ur, jr].filter(Boolean) as Record<
        string,
        unknown
      >[];

      for (const src of sources) {
        prefs.location ??= pickString(src, [
          "location",
          "preferred_location",
          "preferredLocation",
        ]);
        prefs.workMode ??= pickString(src, [
          "work_mode",
          "workMode",
          "preferred_work_mode",
          "preferredWorkMode",
        ]);
        prefs.salary ??= pickString(src, [
          "salary",
          "salary_expectation",
          "salaryExpectation",
          "expected_salary",
          "expectedSalary",
        ]);
        prefs.noticePeriod ??= pickString(src, [
          "notice_period",
          "noticePeriod",
          "notice",
        ]);
        prefs.employmentType ??= pickString(src, [
          "employment_type",
          "employmentType",
          "preferred_employment_type",
          "preferredEmploymentType",
        ]);
      }
    }

    const pairs = Array.isArray(a.assessmentQuestionAnswers)
      ? (a.assessmentQuestionAnswers as Array<{
          user?: string;
          assistant?: string;
        }>)
      : [];
    for (const p of pairs) {
      const question = (typeof p.assistant === "string" ? p.assistant : "")
        .toLowerCase();
      const answer = typeof p.user === "string" ? p.user.trim() : "";
      if (!answer) continue;

      if (
        !prefs.location &&
        /location|city|relocat|where.*(work|live)/i.test(question)
      ) {
        prefs.location = answer.slice(0, 120);
      }
      if (
        !prefs.workMode &&
        /remote|hybrid|onsite|on-site|work mode|wfh|work from/i.test(
          question + " " + answer,
        )
      ) {
        prefs.workMode = inferWorkMode(answer) ?? answer.slice(0, 80);
      }
      if (
        !prefs.salary &&
        /salary|compensation|pay|ctc|package/i.test(question)
      ) {
        prefs.salary = answer.slice(0, 80);
      }
      if (
        !prefs.noticePeriod &&
        /notice|available|join|start date/i.test(question)
      ) {
        prefs.noticePeriod = answer.slice(0, 80);
      }
      if (
        !prefs.employmentType &&
        /full[- ]?time|part[- ]?time|contract|internship|employment type/i.test(
          question + " " + answer,
        )
      ) {
        prefs.employmentType = answer.slice(0, 80);
      }
      if (
        /professional preferences/i.test(question) &&
        (!prefs.workMode || !prefs.location || !prefs.employmentType)
      ) {
        // Free-form preferences answer — keep as salary/location/workMode hints via keywords.
        prefs.workMode ??= inferWorkMode(answer);
        if (!prefs.location) {
          const locHint = answer.match(
            /\b(?:in|at|from)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/,
          );
          if (locHint?.[1]) prefs.location = locHint[1];
        }
      }
    }
  }

  return prefs;
}

/** Map layer scores to Excellent/Strong/Good/Moderate/Weak bands. */
export function matchLevelFromScore(finalScore: number): string {
  if (finalScore >= 90) return "Excellent Match";
  if (finalScore >= 75) return "Strong Match";
  if (finalScore >= 60) return "Good Match";
  if (finalScore >= 40) return "Moderate Match";
  return "Weak Match";
}

/** Recompute weighted final score; clamp layer inputs to 0–100. */
export function recomputeFinalScore(
  semantic: number,
  assessment: number,
  preference: number,
): number {
  const s = clampScore(semantic);
  const a = clampScore(assessment);
  const p = clampScore(preference);
  return Math.round(s * 0.5 + a * 0.3 + p * 0.2);
}

function normalizeScoreRow(
  jobId: string,
  row: Record<string, unknown>,
): CandidateJobLayerScore {
  const semanticScore = clampScore(num(row.semantic_score ?? row.semanticScore));
  const assessmentScore = clampScore(
    num(row.assessment_score ?? row.assessmentScore),
  );
  const preferenceScore = clampScore(
    num(row.preference_score ?? row.preferenceScore, 50),
  );
  const finalScore = recomputeFinalScore(
    semanticScore,
    assessmentScore,
    preferenceScore,
  );

  return {
    jobId,
    finalScore,
    matchLevel: matchLevelFromScore(finalScore),
    semanticScore,
    assessmentScore,
    preferenceScore,
    matchingSkills: stringList(row.matching_skills ?? row.matchingSkills),
    missingSkills: stringList(row.missing_skills ?? row.missingSkills),
    strengths: stringList(row.strengths),
    concerns: stringList(row.concerns),
    summary: typeof row.summary === "string" ? row.summary.trim() : "",
    recommendation:
      typeof row.recommendation === "string" ? row.recommendation.trim() : "",
  };
}

function indexScores(parsed: unknown): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  const root = asRecord(parsed);
  if (!root) return map;

  const list = Array.isArray(root.scores)
    ? root.scores
    : Array.isArray(root.results)
      ? root.results
      : Array.isArray(parsed)
        ? parsed
        : null;

  if (Array.isArray(list)) {
    for (const item of list) {
      const row = asRecord(item);
      if (!row) continue;
      const id = String(row.job_id ?? row.jobId ?? "").trim();
      if (id) map.set(id, row);
    }
    return map;
  }

  // Single-object fallback when the model forgets the scores array.
  const id = String(root.job_id ?? root.jobId ?? "").trim();
  if (id) map.set(id, root);
  return map;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractDashboardPayload(
  assessmentData: unknown,
): Record<string, unknown> | null {
  const entry = asRecord(assessmentData);
  if (!entry) return null;
  const inner = asRecord(entry.data);
  return inner ?? entry;
}

function pickString(
  src: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const v = src[key];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 120);
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function inferWorkMode(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bhybrid\b/.test(t)) return "Hybrid";
  if (/\bremote\b|\bwfh\b|work from home/.test(t)) return "Remote";
  if (/\bonsite\b|\bon-site\b|\bin office\b/.test(t)) return "Onsite";
  return null;
}

function uniqueNonEmpty(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncatePlain(
  text: string | null | undefined,
  cap = TEXT_CAP,
): string | null {
  if (!text?.trim()) return null;
  const plain = stripHtml(text);
  if (!plain) return null;
  return plain.length > cap ? `${plain.slice(0, cap - 1)}…` : plain;
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
    .map((v) => v.trim())
    .slice(0, 20);
}

export type QuestionField = {
  id: string;
  label: string;
  type: "text" | "date" | "textarea";
  placeholder?: string;
};

export type QuestionStep = {
  id: string;
  title: string;
  /** Optional intro text above the inputs */
  intro?: string;
  /** For multi-field steps (e.g. Q1), define fields. For single textarea steps, use a single textarea field. */
  fields: QuestionField[];
  /** If true, fields are laid out in a 2-column grid (e.g. Q1 first row) */
  twoColumns?: boolean;
};

export const QUESTION_STEPS: QuestionStep[] = [
  {
    id: "onboarding",
    title: "Onboarding by NuMee",
    fields: [
      { id: "name", label: "Tell us your name?", type: "text", placeholder: "Tell us your name?" },
      { id: "birthDate", label: "When were you born?", type: "date", placeholder: "When were you born?" },
      { id: "identity", label: "How do you identify yourself?", type: "text", placeholder: "How do you identify yourself?" },
      { id: "whereLive", label: "Where do you live?", type: "text", placeholder: "Where do you live?" },
      { id: "whereWantToLive", label: "Where would you like to live and work?", type: "text", placeholder: "Where would you like to live and work?" },
      { id: "practicalExperience", label: "What practical experience do you have?", type: "text", placeholder: "What practical experience do you have?" },
      { id: "businessExperience", label: "Tell me more about your Business experience", type: "textarea", placeholder: "Tell me more about your Business experience" },
      { id: "professionalStations", label: "How many professional stations have you already gone through?", type: "text", placeholder: "How many professional stations have you already gone through?" },
      { id: "yearsInProfession", label: "How long have you been in the profession?", type: "text", placeholder: "How long have you been in the profession?" },
    ],
    twoColumns: true,
  },
  {
    id: "way-of-doing",
    title: "Thank you. Let me now learn more about you and the way you are doing things. In case you have no Business Experience, please think about other areas of life to answer the questions.",
    fields: [{ id: "message", label: "", type: "textarea", placeholder: "Type Your Message Here..." }],
  },
  {
    id: "know-you",
    intro: "Thank you. It is time to get to know you a bit more personally.",
    title: "",
    fields: [
      { id: "knowYourself", label: "How well do you know yourself?", type: "textarea", placeholder: "How well do you know yourself?" },
      { id: "workWithOthers", label: "How do you work with others?", type: "textarea", placeholder: "How do you work with others?" },
      { id: "dealWithNew", label: "How do you deal with new situations and people?", type: "textarea", placeholder: "How do you deal with new situations and people?" },
    ],
  },
  {
    id: "drivers",
    title: "Awesome. It's a pleasure talking to you. Let me ask you now about your drivers in life.",
    fields: [{ id: "drivers", label: "", type: "textarea", placeholder: "Type Your Message Here..." }],
  },
  {
    id: "way-of-thinking",
    title: "Interesting. I would like to learn more about your way of thinking. So ...",
    fields: [{ id: "wayOfThinking", label: "", type: "textarea", placeholder: "Type Your Message Here..." }],
  },
  {
    id: "hobbies",
    title: "To have a well rounded picture of you as person, please tell me more about your Hobbies.",
    fields: [{ id: "hobbies", label: "", type: "textarea", placeholder: "Type Your Message Here..." }],
  },
  {
    id: "last-question",
    title: "Understood. Last question:",
    fields: [{ id: "lastQuestion", label: "", type: "textarea", placeholder: "Type Your Message Here..." }],
  },
  {
    id: "conclude",
    title: "Wonderful. I think at a first glance I have everything what I need. To conclude and start the analyze ...",
    fields: [{ id: "conclude", label: "", type: "textarea", placeholder: "Type Your Message Here..." }],
  },
];

export const TOTAL_QUESTIONS = QUESTION_STEPS.length;

/** Convert agent API questions (strings or { question } objects) to QuestionStep[] for appending at end of questionnaire */
export function agentQuestionsToSteps(agentQuestions: unknown): QuestionStep[] {
  if (!agentQuestions || !Array.isArray(agentQuestions)) return [];
  return agentQuestions.map((q, i) => {
    const text =
      typeof q === "string" ? q : typeof q === "object" && q !== null && "question" in q ? String((q as { question: unknown }).question) : String(q);
    const id = `agent-q-${i}`;
    return {
      id,
      title: text,
      fields: [{ id, label: "", type: "textarea" as const, placeholder: text }],
    };
  });
}

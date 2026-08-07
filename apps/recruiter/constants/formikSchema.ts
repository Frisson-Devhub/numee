import * as Yup from "yup";

/** Shared password complexity for signup, invite accept, and reset flows. */
const passwordRules = Yup.string()
  .required("Password is required")
  .min(8, "Password must be at least 8 characters")
  .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
  .matches(/[a-z]/, "Password must contain at least one lowercase letter")
  .matches(/\d/, "Password must contain at least one number")
  .matches(
    /[@$!%*?&]/,
    "Password must contain at least one special character",
  );

export const LoginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email format").required("Email is required"),
  password: Yup.string().required("Password is required"),
});

/** Creates company + owner account; empty website becomes optional (not invalid URL). */
export const RecruiterSignupSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, "Too short")
    .max(40, "Too long")
    .required("First name is required"),
  lastName: Yup.string()
    .min(2, "Too short")
    .max(40, "Too long")
    .required("Last name is required"),
  emailOrPhone: Yup.string()
    .email("Invalid email format")
    .required("Work email is required"),
  password: passwordRules,
  companyName: Yup.string().required("Company name is required"),
  companyWebsite: Yup.string()
    .transform((v) => (v === "" ? undefined : v))
    .url("Enter a valid URL")
    .optional(),
  agreeToTerms: Yup.boolean()
    .oneOf([true], "You must agree to terms")
    .required(),
});

export const CompanySchema = Yup.object().shape({
  name: Yup.string().required("Company name is required"),
  website: Yup.string()
    .transform((v) => (v === "" ? undefined : v))
    .url("Enter a valid URL")
    .optional(),
  industry: Yup.string().nullable().notRequired(),
  size: Yup.string().nullable().notRequired(),
  description: Yup.string().nullable().notRequired(),
  location: Yup.string().nullable().notRequired(),
});

/**
 * Job create/edit Formik shape. Numeric fields stay nullable; skills/pipeline
 * are comma-separated text until `toPayload` splits them.
 */
export const JobSchema = Yup.object().shape({
  title: Yup.string().required("Job title is required"),
  department: Yup.string().nullable().notRequired(),
  employmentType: Yup.string().nullable().notRequired(),
  workMode: Yup.string().nullable().notRequired(),
  location: Yup.string().nullable().notRequired(),
  experienceMin: Yup.number().nullable().min(0).notRequired(),
  experienceMax: Yup.number().nullable().min(0).notRequired(),
  noticePeriod: Yup.string().nullable().notRequired(),
  salaryMin: Yup.number().nullable().min(0).notRequired(),
  salaryMax: Yup.number().nullable().min(0).notRequired(),
  salaryCurrency: Yup.string().nullable().notRequired(),
  salaryNegotiable: Yup.boolean().notRequired(),
  description: Yup.string().nullable().notRequired(),
  responsibilities: Yup.string().nullable().notRequired(),
  requirements: Yup.string().nullable().notRequired(),
  benefits: Yup.string().nullable().notRequired(),
  skillsText: Yup.string().nullable().notRequired(),
  pipelineText: Yup.string().nullable().notRequired(),
});

/** Completing a team invite when the invitee has no account yet. */
export const InviteAcceptSchema = Yup.object().shape({
  firstName: Yup.string().min(2).max(40).required("First name is required"),
  lastName: Yup.string().min(2).max(40).required("Last name is required"),
  password: passwordRules,
});

export const TeamInviteSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Email is required"),
});

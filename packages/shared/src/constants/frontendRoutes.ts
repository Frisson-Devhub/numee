/** Candidate app path constants (Next.js app router). */
export const frontendRoutes = {
  questionnaire: "/user/signup/ai-questionnaire",
  verifyCode: "signup/verify-code",
  dashboard: "/user/dashboard",
  adminDashboard: "/admin/dashboard",
  courses: "/user/courses",
  jobs: "/user/jobs",
  applications: "/user/applications",
  profile: "/user/profile",
  social: "/user/signup/social",
  login: "/login",
  mobileLogin: "/user/mobile-login",
  signup: "/user/signup",
  forgotPassword: "/user/forgot-password",
} as const;

/** Admin Vite app path constants (port 3002). */
export const adminRoutes = {
  login: "/login",
  dashboard: "/dashboard",
  userManagement: "/user-management",
  universityManagement: "/university-management",
  catalog: "/catalog",
  analytics: "/analytics",
  communication: "/communication",
  logsAudits: "/logs-audits",
} as const;

/** Recruiter app (`apps/recruiter`) routes — root paths on port 3003 */
export const recruiterRoutes = {
  login: "/login",
  signup: "/signup",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  invite: (token: string) => `/invite/${token}`,
  dashboard: "/dashboard",
  company: "/company",
  team: "/team",
  jobs: "/jobs",
  jobsNew: "/jobs/new",
  job: (id: string) => `/jobs/${id}`,
  jobEdit: (id: string) => `/jobs/${id}/edit`,
  settings: "/settings",
} as const;

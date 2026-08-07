import jwt from "jsonwebtoken";

/** Session claims from the Nest-issued cookie JWT (recruiter portal). */
export type SessionPayload = {
  id?: string;
  email?: string;
};

function getSecretKey(): string {
  return process.env.JWT_SECRET || "default-secret-key";
}

/** Verify session JWT for Next.js server components (cookie set by Nest API). */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    return jwt.verify(token, getSecretKey()) as SessionPayload;
  } catch {
    return null;
  }
}

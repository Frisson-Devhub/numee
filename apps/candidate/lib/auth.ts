import jwt from "jsonwebtoken";

function getSecretKey(): string {
  return process.env.JWT_SECRET || "default-secret-key";
}

/** Verify session JWT for Next.js server components (cookie set by Nest API). */
export async function verifySession(token: string) {
  try {
    return jwt.verify(token, getSecretKey());
  } catch {
    return null;
  }
}

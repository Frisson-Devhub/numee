import jwt from "jsonwebtoken";

/** JWT session claims; `id` is required for authenticated API routes. */
export type SessionPayload = {
  id?: string;
  email?: string;
  [key: string]: unknown;
};

/** Read at call time — Nest imports modules before main.ts dotenv runs. */
function getSecretKey(): string {
  return process.env.JWT_SECRET || "default-secret-key";
}

/** Sign a 24h JWT session cookie payload. */
export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getSecretKey(), { expiresIn: "24h" });
}

/** Verify a session JWT; returns null when invalid/expired. */
export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getSecretKey()) as SessionPayload;
  } catch {
    return null;
  }
}

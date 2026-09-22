import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CANDIDATE_SESSION_COOKIE } from "@/lib/auth/sessionCookie";

/**
 * Shared job links (`/user/jobs/:id?source=`) send logged-out visitors
 * straight to login so the job page never flashes first.
 */
export function middleware(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source")?.trim();
  if (!source) return NextResponse.next();

  const jobMatch = request.nextUrl.pathname.match(/^\/user\/jobs\/([^/]+)$/);
  if (!jobMatch?.[1]) return NextResponse.next();

  if (request.cookies.get(CANDIDATE_SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("pendingJob", jobMatch[1]);
  loginUrl.searchParams.set("source", source);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/user/jobs/:id"],
};

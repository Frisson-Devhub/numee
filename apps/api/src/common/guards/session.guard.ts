import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { verifySession, type SessionPayload } from "../auth";
import {
  PORTAL_SESSION_COOKIES,
  resolvePortalFromPath,
} from "../cookies/session-cookie";

/** Express request after SessionGuard attaches `user` from the portal session cookie. */
export type AuthenticatedRequest = Request & { user: SessionPayload };

/**
 * Require a valid portal-scoped session cookie and attach `req.user`.
 * Cookie name is chosen from the request path (admin / recruiter / candidate).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const path = req.originalUrl || req.url || req.path || "";
    const portal = resolvePortalFromPath(path);
    const cookieName = PORTAL_SESSION_COOKIES[portal];
    const token = (req.cookies?.[cookieName] as string | undefined) ?? undefined;

    if (!token) {
      throw new UnauthorizedException({ error: "Unauthorized" });
    }

    const session = verifySession(token);
    if (!session?.id) {
      throw new UnauthorizedException({ error: "Unauthorized" });
    }

    req.user = session;
    return true;
  }
}

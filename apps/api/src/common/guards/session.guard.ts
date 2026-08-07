import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { verifySession, type SessionPayload } from "../auth";
import { SESSION_COOKIE } from "../cookies/session-cookie";

/** Express request after SessionGuard attaches `user` from the session cookie. */
export type AuthenticatedRequest = Request & { user: SessionPayload };

/** Require a valid session cookie and attach `req.user`. */
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token =
      (req.cookies?.[SESSION_COOKIE] as string | undefined) ??
      undefined;

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

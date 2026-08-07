import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { RecruiterRequest } from "./recruiter.guard";

/** Require membership.role === OWNER (must run after RecruiterGuard). */
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RecruiterRequest>();
    if (!req.user?.id) {
      throw new UnauthorizedException({ error: "Unauthorized" });
    }
    if (req.membership?.role !== "OWNER") {
      throw new ForbiddenException({ error: "Owner access required" });
    }
    return true;
  }
}

import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type {
  MembershipContext,
  RecruiterRequest,
} from "../guards/recruiter.guard";

/** Param decorator: company membership set by RecruiterGuard. */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MembershipContext => {
    const req = ctx.switchToHttp().getRequest<RecruiterRequest>();
    return req.membership;
  },
);

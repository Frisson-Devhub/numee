import { Module } from "@nestjs/common";
import { TeamController } from "./team.controller";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";
import { OwnerGuard } from "../../common/guards/owner.guard";

@Module({
  controllers: [TeamController],
  providers: [RecruiterGuard, OwnerGuard],
})
export class TeamModule {}

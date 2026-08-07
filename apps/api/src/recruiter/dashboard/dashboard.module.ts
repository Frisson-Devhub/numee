import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";

@Module({
  controllers: [DashboardController],
  providers: [RecruiterGuard],
})
export class DashboardModule {}

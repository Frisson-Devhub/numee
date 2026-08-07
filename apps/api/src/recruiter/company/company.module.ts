import { Module } from "@nestjs/common";
import { CompanyController } from "./company.controller";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";
import { OwnerGuard } from "../../common/guards/owner.guard";

@Module({
  controllers: [CompanyController],
  providers: [RecruiterGuard, OwnerGuard],
})
export class CompanyModule {}

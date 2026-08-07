import { Module } from "@nestjs/common";
import { RecruiterAuthController } from "./recruiter-auth.controller";

@Module({
  controllers: [RecruiterAuthController],
})
export class RecruiterAuthModule {}

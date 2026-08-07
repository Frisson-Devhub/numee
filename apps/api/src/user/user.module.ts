import { Module } from "@nestjs/common";
import { CandidateModule } from "../candidate/candidate.module";
import { UserController } from "./user.controller";

@Module({
  imports: [CandidateModule],
  controllers: [UserController],
})
export class UserModule {}

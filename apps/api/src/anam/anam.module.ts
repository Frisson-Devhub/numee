import { Module } from "@nestjs/common";
import { CandidateModule } from "../candidate/candidate.module";
import { AnamController } from "./anam.controller";

@Module({
  imports: [CandidateModule],
  controllers: [AnamController],
})
export class AnamModule {}

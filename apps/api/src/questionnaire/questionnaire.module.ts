import { Module } from "@nestjs/common";
import { QuestionnaireController } from "./questionnaire.controller";

@Module({
  controllers: [QuestionnaireController],
})
export class QuestionnaireModule {}

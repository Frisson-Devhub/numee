import { Global, Injectable, Module } from "@nestjs/common";
import { MAX_ASSESSMENTS_PER_USER } from "@numee/shared/server";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  /** False when Prisma client was generated without Assessment model. */
  isAssessmentAvailable(): boolean {
    return typeof (this.prisma as { assessment?: unknown }).assessment !== "undefined";
  }

  /** Load assessment by (userId, assessmentId) or create within per-user max. */
  async getOrCreateAssessment(userId: string, assessmentId: string) {
    if (!this.isAssessmentAvailable()) {
      throw new Error("Assessment model not available");
    }
    const existing = await this.prisma.assessment.findUnique({
      where: { userId_assessmentId: { userId, assessmentId } },
    });
    if (existing) {
      return existing;
    }
    const count = await this.prisma.assessment.count({ where: { userId } });
    if (count >= MAX_ASSESSMENTS_PER_USER) {
      throw new Error(`Maximum of ${MAX_ASSESSMENTS_PER_USER} assessments per user`);
    }
    return this.prisma.assessment.create({
      data: { userId, assessmentId },
    });
  }
}

@Global()
@Module({
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}

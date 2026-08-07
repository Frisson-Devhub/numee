import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { bullmqConnectionFromEnv } from "./redis-connection";

/** BullMQ queue name for published job embeddings. */
export const JOB_EMBEDDINGS_QUEUE = "job-embeddings";
/** BullMQ queue name for industry/job-role catalog embeddings. */
export const CATALOG_EMBEDDINGS_QUEUE = "catalog-embeddings";
/** BullMQ queue name for candidate assessment embeddings. */
export const CANDIDATE_EMBEDDINGS_QUEUE = "candidate-embeddings";

/** Registers BullMQ root connection and embedding queues. */
@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: bullmqConnectionFromEnv(),
    }),
    BullModule.registerQueue({
      name: JOB_EMBEDDINGS_QUEUE,
    }),
    BullModule.registerQueue({
      name: CATALOG_EMBEDDINGS_QUEUE,
    }),
    BullModule.registerQueue({
      name: CANDIDATE_EMBEDDINGS_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

import { Module } from "@nestjs/common";
import { VirtualAssistantController } from "./virtual-assistant.controller";

@Module({
  controllers: [VirtualAssistantController],
})
export class VirtualAssistantModule {}

import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminGuard } from "../common/guards/admin.guard";

@Module({
  controllers: [AdminAuthController, AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}

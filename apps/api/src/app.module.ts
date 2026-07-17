import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { EvidenceModule } from "./evidence.module.js";

@Module({
  controllers: [AppController],
  imports: [EvidenceModule],
})
export class AppModule {}

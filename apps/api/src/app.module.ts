import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { DatabaseClientBridge } from "./database-client.bridge.js";
import { EvidenceModule } from "./evidence.module.js";
import { createApiDatabaseLifecycle } from "./runtime-database.js";

@Module({
  controllers: [AppController],
  imports: [EvidenceModule],
  providers: [
    {
      provide: DatabaseClientBridge,
      useFactory: (): DatabaseClientBridge =>
        new DatabaseClientBridge(createApiDatabaseLifecycle()),
    },
  ],
})
export class AppModule {}

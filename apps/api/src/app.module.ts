import { loadApiConfig } from "@fas/config";
import {
  createDatabaseClient,
  createStubDatabaseClient,
  type DatabaseClientLifecycle,
} from "@fas/database";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { DatabaseClientBridge } from "./database-client.bridge.js";
import { EvidenceModule } from "./evidence.module.js";

function createConfiguredDatabaseClient(): DatabaseClientLifecycle {
  const config = loadApiConfig();

  return config.database.clientMode === "stub"
    ? createStubDatabaseClient()
    : createDatabaseClient(config.database.url);
}

@Module({
  controllers: [AppController],
  imports: [EvidenceModule],
  providers: [
    {
      provide: DatabaseClientBridge,
      useFactory: (): DatabaseClientBridge =>
        new DatabaseClientBridge(createConfiguredDatabaseClient()),
    },
  ],
})
export class AppModule {}

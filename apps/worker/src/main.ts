import "reflect-metadata";
import { loadWorkerConfig } from "@fas/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  loadWorkerConfig();
  const app = await NestFactory.createApplicationContext(WorkerModule);

  app.enableShutdownHooks();
  Logger.log("Worker started.", "Bootstrap");
  await app.close();
}

void bootstrap().catch((error: unknown) => {
  const stack = error instanceof Error ? error.stack : String(error);

  Logger.error("Worker failed to start.", stack, "Bootstrap");
  process.exitCode = 1;
});

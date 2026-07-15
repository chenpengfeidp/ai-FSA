import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number.parseInt(process.env.PORT ?? "3001", 10);

  await app.listen(port, host);
  Logger.log(`API listening on http://${host}:${port}`, "Bootstrap");
}

void bootstrap().catch((error: unknown) => {
  const stack = error instanceof Error ? error.stack : String(error);

  Logger.error("API failed to start.", stack, "Bootstrap");
  process.exitCode = 1;
});

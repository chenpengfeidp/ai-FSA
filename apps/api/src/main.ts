import "reflect-metadata";
import { loadApiConfig } from "@fas/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { configureOpenApi } from "./openapi.js";

async function bootstrap(): Promise<void> {
  const config = loadApiConfig();
  const app = await NestFactory.create(AppModule);

  configureOpenApi(app);
  await app.listen(config.http.port, config.http.host);
  Logger.log(
    `API listening on http://${config.http.host}:${config.http.port}`,
    "Bootstrap",
  );
}

void bootstrap().catch((error: unknown) => {
  const stack = error instanceof Error ? error.stack : String(error);

  Logger.error("API failed to start.", stack, "Bootstrap");
  process.exitCode = 1;
});

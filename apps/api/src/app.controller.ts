import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { DatabaseClientBridge } from "./database-client.bridge.js";

@Controller()
export class AppController {
  constructor(private readonly database: DatabaseClientBridge) {}

  @Get()
  getRoot(): Readonly<{ name: string; status: string }> {
    return {
      name: "AI Football Analysis Platform",
      status: "Repository Bootstrap Completed",
    };
  }

  @Get("health/live")
  getLiveness(): Readonly<{ status: string }> {
    return { status: "ok" };
  }

  @Get("health/ready")
  async getReadiness(): Promise<Readonly<{ status: string }>> {
    try {
      await this.database.ping();
      return { status: "ready" };
    } catch {
      throw new HttpException(
        {
          status: "not_ready",
          reason: "database_unreachable",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get("version")
  getVersion(): Readonly<{ name: string; version: string }> {
    return {
      name: "@fas/api",
      version: "0.0.0",
    };
  }
}

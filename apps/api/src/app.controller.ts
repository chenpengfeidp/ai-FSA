import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
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
  getReadiness(): Readonly<{ status: string }> {
    return { status: "ready" };
  }

  @Get("version")
  getVersion(): Readonly<{ name: string; version: string }> {
    return {
      name: "@fas/api",
      version: "0.0.0",
    };
  }
}

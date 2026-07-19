import type { DatabaseClientLifecycle } from "@fas/database";
import { HttpException, HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppController } from "../src/app.controller.js";
import { DatabaseClientBridge } from "../src/database-client.bridge.js";

describe("GET /health/ready database awareness", () => {
  it("returns ready when the database client pings", async () => {
    const database: DatabaseClientLifecycle = {
      connect: async () => undefined,
      disconnect: async () => undefined,
      ping: async () => undefined,
    };
    const controller = new AppController(new DatabaseClientBridge(database));

    await expect(controller.getReadiness()).resolves.toEqual({
      status: "ready",
    });
  });

  it("returns not_ready when the database client ping fails", async () => {
    const database: DatabaseClientLifecycle = {
      connect: async () => undefined,
      disconnect: async () => undefined,
      ping: async () => {
        throw new Error("connection refused");
      },
    };
    const controller = new AppController(new DatabaseClientBridge(database));

    try {
      await controller.getReadiness();
      throw new Error("Expected readiness to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.getResponse()).toEqual({
        status: "not_ready",
        reason: "database_unreachable",
      });
    }
  });
});

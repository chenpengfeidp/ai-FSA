import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "config",
          environment: "node",
          include: ["packages/config/test/**/*.spec.ts"],
        },
      },
    ],
  },
});

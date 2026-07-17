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
      {
        test: {
          name: "database",
          environment: "node",
          env: {
            DATABASE_URL:
              "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation",
          },
          include: ["packages/database/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "evidence",
          environment: "node",
          include: ["packages/evidence/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "evidence-normalizer",
          environment: "node",
          include: ["packages/evidence-normalizer/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "match",
          environment: "node",
          include: ["packages/match/test/**/*.spec.ts"],
        },
      },
    ],
  },
});

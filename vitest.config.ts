import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "ai-provider",
          environment: "node",
          include: ["packages/ai-provider/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "analysis",
          environment: "node",
          include: ["packages/analysis/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "api",
          environment: "node",
          include: ["apps/api/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "application",
          environment: "node",
          include: ["packages/application/test/**/*.spec.ts"],
        },
      },
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
          name: "evidence-import",
          environment: "node",
          include: ["packages/evidence-import/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "evidence-query",
          environment: "node",
          include: ["packages/evidence-query/test/**/*.spec.ts"],
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
          name: "feature",
          environment: "node",
          include: ["packages/feature/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "match",
          environment: "node",
          include: ["packages/match/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "prompt",
          environment: "node",
          include: ["packages/prompt/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "provider-fixture",
          environment: "node",
          include: ["packages/provider-fixture/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "provider-odds",
          environment: "node",
          include: ["packages/provider-odds/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "rule",
          environment: "node",
          include: ["packages/rule/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "report",
          environment: "node",
          include: ["packages/report/test/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "statistics",
          environment: "node",
          include: ["packages/statistics/test/**/*.spec.ts"],
        },
      },
    ],
  },
});

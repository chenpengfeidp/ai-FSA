"use strict";

/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular-dependencies",
      comment:
        "Circular dependencies make ownership and initialization order ambiguous.",
      severity: "error",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-packages-to-apps",
      comment: "Reusable packages must not depend on application composition roots.",
      severity: "error",
      from: {
        path: "^packages/",
      },
      to: {
        path: "^apps/",
      },
    },
    {
      name: "no-api-to-other-apps",
      comment:
        "The API composition root must not import the web or worker applications.",
      severity: "error",
      from: {
        path: "^apps/api/",
      },
      to: {
        path: "^apps/(web|worker)/",
      },
    },
    {
      name: "no-web-to-other-apps",
      comment:
        "The web composition root must not import the API or worker applications.",
      severity: "error",
      from: {
        path: "^apps/web/",
      },
      to: {
        path: "^apps/(api|worker)/",
      },
    },
    {
      name: "no-worker-to-other-apps",
      comment:
        "The worker composition root must not import the API or web applications.",
      severity: "error",
      from: {
        path: "^apps/worker/",
      },
      to: {
        path: "^apps/(api|web)/",
      },
    },
    {
      name: "no-prisma-outside-database",
      comment:
        "Prisma and PostgreSQL driver ownership is restricted to @fas/database.",
      severity: "error",
      from: {
        pathNot: "^packages/database/",
      },
      to: {
        path: "(^|node_modules/)(@prisma/|prisma(/|$)|pg(/|$))",
      },
    },
    {
      name: "fixture-no-app-imports",
      comment:
        "The controlled fixture proves forbidden dependency enforcement is executable.",
      severity: "error",
      from: {
        path: "^tooling/dependency-cruiser/fixtures/",
      },
      to: {
        path: "^apps/",
      },
    },

    // ---------------------------------------------------------------------------
    // v0.2 pipeline layer rules (Provider → Evidence → Feature → Rule → Analysis
    // → Report → Prompt → AI). Composition roots (apps/*) are exempt.
    // ---------------------------------------------------------------------------
    {
      name: "no-provider-to-analysis",
      comment: "Providers must not depend on Analysis.",
      severity: "error",
      from: {
        path: "^packages/provider-",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/analysis/",
      },
    },
    {
      name: "no-provider-to-rule",
      comment: "Providers must not depend on Rule.",
      severity: "error",
      from: {
        path: "^packages/provider-",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/rule/",
      },
    },
    {
      name: "no-provider-to-feature",
      comment: "Providers must not skip Evidence into Feature.",
      severity: "error",
      from: {
        path: "^packages/provider-",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/feature/",
      },
    },
    {
      name: "no-provider-to-report",
      comment: "Providers must not depend on Report.",
      severity: "error",
      from: {
        path: "^packages/provider-",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/report/",
      },
    },
    {
      name: "no-provider-to-prompt",
      comment: "Providers must not depend on Prompt.",
      severity: "error",
      from: {
        path: "^packages/provider-",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/prompt/",
      },
    },
    {
      name: "no-provider-to-ai-provider",
      comment: "Football/odds providers must not depend on AI provider adapters.",
      severity: "error",
      from: {
        path: "^packages/provider-",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/ai-provider/",
      },
    },
    {
      name: "no-rule-to-provider",
      comment: "Rule must not call Providers.",
      severity: "error",
      from: {
        path: "^packages/rule/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/provider-",
      },
    },
    {
      name: "no-analysis-to-provider",
      comment: "Analysis must not call Providers.",
      severity: "error",
      from: {
        path: "^packages/analysis/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/provider-",
      },
    },
    {
      name: "no-feature-to-provider",
      comment: "Feature must not call Providers.",
      severity: "error",
      from: {
        path: "^packages/feature/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/provider-",
      },
    },
    {
      name: "no-prompt-to-feature",
      comment: "Prompt composition must not depend on Feature.",
      severity: "error",
      from: {
        path: "^packages/prompt/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/feature/",
      },
    },
    {
      name: "no-prompt-to-rule",
      comment: "Prompt composition must not depend on Rule.",
      severity: "error",
      from: {
        path: "^packages/prompt/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/rule/",
      },
    },
    {
      name: "no-prompt-to-analysis",
      comment: "Prompt composition must not depend on Analysis.",
      severity: "error",
      from: {
        path: "^packages/prompt/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/analysis/",
      },
    },
    {
      name: "no-prompt-to-report",
      comment: "Prompt must not depend upward on Report.",
      severity: "error",
      from: {
        path: "^packages/prompt/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/report/",
      },
    },
    {
      name: "no-prompt-to-provider",
      comment: "Prompt must not depend on data Providers.",
      severity: "error",
      from: {
        path: "^packages/prompt/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/provider-",
      },
    },
    {
      name: "no-ai-provider-to-report",
      comment: "AI Provider must not depend upward on Report.",
      severity: "error",
      from: {
        path: "^packages/ai-provider/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/report/",
      },
    },
    {
      name: "no-ai-provider-to-analysis",
      comment: "AI Provider must not depend on Analysis.",
      severity: "error",
      from: {
        path: "^packages/ai-provider/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/analysis/",
      },
    },
    {
      name: "no-ai-provider-to-rule",
      comment: "AI Provider must not depend on Rule.",
      severity: "error",
      from: {
        path: "^packages/ai-provider/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/rule/",
      },
    },
    {
      name: "no-ai-provider-to-feature",
      comment: "AI Provider must not depend on Feature.",
      severity: "error",
      from: {
        path: "^packages/ai-provider/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/feature/",
      },
    },
    {
      name: "no-ai-provider-to-data-provider",
      comment: "AI Provider must not depend on football/odds Providers.",
      severity: "error",
      from: {
        path: "^packages/ai-provider/",
        pathNot: "(/test/|\\.spec\\.ts$)",
      },
      to: {
        path: "^packages/provider-",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: "(^|/)(node_modules|\\.next|dist|coverage|\\.turbo|packages/database/generated)(/|$)",
    },
    tsConfig: {
      fileName: "tsconfig.base.json",
    },
    tsPreCompilationDeps: true,
    preserveSymlinks: false,
  },
};

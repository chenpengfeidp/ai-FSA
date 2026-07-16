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

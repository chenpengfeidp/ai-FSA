import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const fixtures = [
  {
    path: "tooling/dependency-cruiser/fixtures/forbidden-import.ts",
    expectedRule: "fixture-no-app-imports",
  },
  {
    path: "tooling/dependency-cruiser/fixtures/forbidden-prisma-import.ts",
    expectedRule: "no-prisma-outside-database",
  },
];

for (const fixture of fixtures) {
  const result = spawnSync(
    command,
    ["exec", "depcruise", "--config", "dependency-cruiser.config.cjs", fixture.path],
    {
      encoding: "utf8",
    },
  );

  if (result.error) {
    throw result.error;
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();

  if (result.status === 0) {
    throw new Error(`Boundary negative test failed: ${fixture.path} was accepted.`);
  }

  if (!output.includes(fixture.expectedRule)) {
    throw new Error(
      `Boundary negative test failed without the expected "${fixture.expectedRule}" violation.\n${output}`,
    );
  }

  console.log(
    `Boundary negative test passed: dependency-cruiser rejected ${fixture.path} with "${fixture.expectedRule}".`,
  );
}

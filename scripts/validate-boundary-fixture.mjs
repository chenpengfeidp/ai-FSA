import { spawnSync } from "node:child_process";

const expectedRule = "fixture-no-app-imports";
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  command,
  [
    "exec",
    "depcruise",
    "--config",
    "dependency-cruiser.config.cjs",
    "tooling/dependency-cruiser/fixtures/forbidden-import.ts",
  ],
  {
    encoding: "utf8",
  },
);

if (result.error) {
  throw result.error;
}

const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();

if (result.status === 0) {
  throw new Error(
    "Boundary negative test failed: the forbidden fixture was accepted.",
  );
}

if (!output.includes(expectedRule)) {
  throw new Error(
    `Boundary negative test failed without the expected "${expectedRule}" violation.\n${output}`,
  );
}

console.log(
  `Boundary negative test passed: dependency-cruiser rejected the fixture with "${expectedRule}".`,
);

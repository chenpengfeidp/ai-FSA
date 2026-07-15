import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateToolchainContract } from "./validate-toolchain.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const manifest = JSON.parse(
  await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);
const nvmrc = await readFile(path.join(repositoryRoot, ".nvmrc"), "utf8");
const expectedNodeVersion = manifest.engines.node;
const expectedPnpmVersion = manifest.engines.pnpm;
const supportedUserAgent = `pnpm/${expectedPnpmVersion} npm/? node/v${expectedNodeVersion}`;

function changeVersion(version, component) {
  const parts = version.split(".").map(Number);
  parts[component] += 1;
  return parts.join(".");
}

function contract(overrides = {}) {
  return {
    manifest: structuredClone(manifest),
    nvmrc,
    actualNodeVersion: `v${expectedNodeVersion}`,
    packageManagerUserAgent: supportedUserAgent,
    ...overrides,
  };
}

function expectContractFailure(overrides, expectedText) {
  assert.throws(
    () => validateToolchainContract(contract(overrides)),
    (error) => {
      assert.match(error.message, expectedText);
      assert.match(error.message, /expected .+, observed .+/);
      return true;
    },
  );
}

async function runFixtureInstall({ nodeVersion, packageManagerVersion }) {
  const fixtureDirectory = await mkdtemp(
    path.join(tmpdir(), "fas-toolchain-enforcement-"),
  );

  try {
    const fixtureManifest = {
      name: "fas-toolchain-enforcement-fixture",
      version: "0.0.0",
      private: true,
      packageManager: `pnpm@${packageManagerVersion}`,
      engines: {
        node: nodeVersion,
        pnpm: expectedPnpmVersion,
      },
    };

    await Promise.all([
      writeFile(
        path.join(fixtureDirectory, "package.json"),
        `${JSON.stringify(fixtureManifest, null, 2)}\n`,
      ),
      writeFile(
        path.join(fixtureDirectory, "pnpm-workspace.yaml"),
        "packages: []\nengineStrict: true\npmOnFail: error\n",
      ),
    ]);

    const pnpmEntryPoint = Reflect.get(process.env, "npm_execpath");
    assert.ok(
      pnpmEntryPoint,
      "pnpm lifecycle metadata must identify the active pnpm executable",
    );

    const result = spawnSync(
      process.execPath,
      [pnpmEntryPoint, "install", "--ignore-scripts"],
      {
        cwd: fixtureDirectory,
        encoding: "utf8",
        env: {
          ...process.env,
          CI: "true",
        },
        timeout: 15_000,
      },
    );

    if (result.error) {
      throw result.error;
    }

    return {
      status: result.status,
      output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(),
    };
  } finally {
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
}

test("accepts the supported Node.js and pnpm versions", () => {
  assert.deepEqual(
    validateToolchainContract(
      contract({
        actualNodeVersion: process.version,
        packageManagerUserAgent: Reflect.get(process.env, "npm_config_user_agent"),
      }),
    ),
    {
      node: expectedNodeVersion,
      pnpm: expectedPnpmVersion,
    },
  );
});

test("rejects an unsupported Node.js major version", () => {
  const unsupportedVersion = changeVersion(expectedNodeVersion, 0);
  expectContractFailure(
    { actualNodeVersion: `v${unsupportedVersion}` },
    /Node\.js version mismatch/,
  );
});

test("rejects an unsupported Node.js patch version", () => {
  const unsupportedVersion = changeVersion(expectedNodeVersion, 2);
  expectContractFailure(
    { actualNodeVersion: `v${unsupportedVersion}` },
    /Node\.js version mismatch/,
  );
});

test("rejects an unsupported pnpm major version", () => {
  const unsupportedVersion = changeVersion(expectedPnpmVersion, 0);
  expectContractFailure(
    {
      packageManagerUserAgent: `pnpm/${unsupportedVersion} npm/? node/v${expectedNodeVersion}`,
    },
    /pnpm version mismatch/,
  );
});

test("rejects an unsupported pnpm patch version", () => {
  const unsupportedVersion = changeVersion(expectedPnpmVersion, 2);
  expectContractFailure(
    {
      packageManagerUserAgent: `pnpm/${unsupportedVersion} npm/? node/v${expectedNodeVersion}`,
    },
    /pnpm version mismatch/,
  );
});

test("rejects npm as the invoking package manager", () => {
  expectContractFailure(
    { packageManagerUserAgent: `npm/${expectedPnpmVersion}` },
    /invoking package manager mismatch/,
  );
});

test("rejects Yarn as the invoking package manager", () => {
  expectContractFailure(
    { packageManagerUserAgent: `yarn/${expectedPnpmVersion}` },
    /invoking package manager mismatch/,
  );
});

test("rejects missing runtime metadata", () => {
  expectContractFailure(
    { packageManagerUserAgent: undefined },
    /invoking package manager mismatch/,
  );
});

test("rejects malformed runtime metadata", () => {
  expectContractFailure(
    { actualNodeVersion: "vcurrent" },
    /executing Node\.js version mismatch/,
  );
});

test("rejects a mismatch between .nvmrc and engines.node", () => {
  expectContractFailure(
    { nvmrc: changeVersion(expectedNodeVersion, 2) },
    /\.nvmrc and engines\.node mismatch/,
  );
});

test("rejects a mismatch between engines.pnpm and packageManager", () => {
  const inconsistentManifest = structuredClone(manifest);
  inconsistentManifest.packageManager = `pnpm@${changeVersion(
    expectedPnpmVersion,
    2,
  )}`;

  expectContractFailure(
    { manifest: inconsistentManifest },
    /packageManager and engines\.pnpm mismatch/,
  );
});

test("rejects missing exact version declarations", () => {
  const incompleteManifest = structuredClone(manifest);
  delete incompleteManifest.engines.node;

  expectContractFailure({ manifest: incompleteManifest }, /engines\.node mismatch/);
});

test("rejects malformed exact version declarations", () => {
  const malformedManifest = structuredClone(manifest);
  malformedManifest.engines.pnpm = `^${expectedPnpmVersion}`;

  expectContractFailure({ manifest: malformedManifest }, /engines\.pnpm mismatch/);
});

test("pnpm rejects an incompatible root Node.js engine", async () => {
  const unsupportedVersion = changeVersion(expectedNodeVersion, 0);
  const result = await runFixtureInstall({
    nodeVersion: unsupportedVersion,
    packageManagerVersion: expectedPnpmVersion,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.output, /unsupported environment|unsupported engine/i);
  assert.match(result.output, /node/i);
  assert.match(result.output, new RegExp(unsupportedVersion.replaceAll(".", "\\.")));
});

test("pnpm rejects a mismatched packageManager version", async () => {
  const unsupportedVersion = changeVersion(expectedPnpmVersion, 2);
  const result = await runFixtureInstall({
    nodeVersion: expectedNodeVersion,
    packageManagerVersion: unsupportedVersion,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.output, /package manager|configured to use/i);
  assert.match(result.output, /pnpm/i);
  assert.match(result.output, new RegExp(unsupportedVersion.replaceAll(".", "\\.")));
});

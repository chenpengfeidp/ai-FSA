import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const exactVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function display(value) {
  return typeof value === "string" && value.length > 0 ? value : "<missing>";
}

function mismatch(subject, expected, observed) {
  throw new Error(
    `${subject} mismatch (expected ${display(expected)}, observed ${display(observed)}).`,
  );
}

export function parseExactVersion(value, subject) {
  if (typeof value !== "string" || !exactVersionPattern.test(value)) {
    mismatch(subject, "an exact x.y.z version", value);
  }

  return value;
}

function parseNodeRuntimeVersion(value) {
  const normalized =
    typeof value === "string" && value.startsWith("v") ? value.slice(1) : value;

  return parseExactVersion(normalized, "executing Node.js version");
}

function parsePackageManager(value) {
  if (typeof value !== "string" || !value.startsWith("pnpm@")) {
    mismatch("packageManager", "pnpm@<exact x.y.z>", value);
  }

  return parseExactVersion(value.slice("pnpm@".length), "packageManager version");
}

function parsePnpmUserAgent(value) {
  if (typeof value !== "string" || value.length === 0) {
    mismatch("invoking package manager", "pnpm/<exact x.y.z>", value);
  }

  const [identity] = value.trim().split(/\s+/, 1);

  if (!identity.startsWith("pnpm/")) {
    mismatch("invoking package manager", "pnpm/<exact x.y.z>", identity);
  }

  return parseExactVersion(identity.slice("pnpm/".length), "invoking pnpm version");
}

export function validateToolchainContract({
  manifest,
  nvmrc,
  actualNodeVersion,
  packageManagerUserAgent,
}) {
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    mismatch("root package manifest", "an object", typeof manifest);
  }

  const engines = manifest.engines;

  if (engines === null || typeof engines !== "object" || Array.isArray(engines)) {
    mismatch("root engines metadata", "an object", typeof engines);
  }

  const expectedNodeVersion = parseExactVersion(engines.node, "engines.node");
  const expectedPnpmVersion = parseExactVersion(engines.pnpm, "engines.pnpm");
  const packageManagerVersion = parsePackageManager(manifest.packageManager);
  const nvmVersion = parseExactVersion(
    typeof nvmrc === "string" ? nvmrc.trim() : nvmrc,
    ".nvmrc",
  );
  const observedNodeVersion = parseNodeRuntimeVersion(actualNodeVersion);
  const observedPnpmVersion = parsePnpmUserAgent(packageManagerUserAgent);

  if (nvmVersion !== expectedNodeVersion) {
    mismatch(".nvmrc and engines.node", expectedNodeVersion, nvmVersion);
  }

  if (packageManagerVersion !== expectedPnpmVersion) {
    mismatch(
      "packageManager and engines.pnpm",
      expectedPnpmVersion,
      packageManagerVersion,
    );
  }

  if (observedNodeVersion !== expectedNodeVersion) {
    mismatch(
      "Node.js version",
      `v${expectedNodeVersion}`,
      `v${observedNodeVersion}`,
    );
  }

  if (observedPnpmVersion !== expectedPnpmVersion) {
    mismatch("pnpm version", expectedPnpmVersion, observedPnpmVersion);
  }

  return {
    node: expectedNodeVersion,
    pnpm: expectedPnpmVersion,
  };
}

export async function validateCurrentToolchain() {
  const [manifestSource, nvmrc] = await Promise.all([
    readFile(path.join(repositoryRoot, "package.json"), "utf8"),
    readFile(path.join(repositoryRoot, ".nvmrc"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource);

  return validateToolchainContract({
    manifest,
    nvmrc,
    actualNodeVersion: process.version,
    packageManagerUserAgent: Reflect.get(process.env, "npm_config_user_agent"),
  });
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;

if (invokedPath === import.meta.url) {
  try {
    const versions = await validateCurrentToolchain();
    console.log(
      `Toolchain validation passed: Node.js v${versions.node}; pnpm ${versions.pnpm}.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Toolchain validation failed: ${message}`);
    process.exitCode = 1;
  }
}

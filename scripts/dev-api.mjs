import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");
const env = { ...process.env };

/** Same non-secret local default as `@fas/config` / `.env.example` (Prisma generate only). */
const DEFAULT_DATABASE_URL =
  "postgresql://fas_local:change_me_local_only@127.0.0.1:5432/fas_local";

if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (env[key] === undefined) {
      env[key] = value;
    }
  }
} else {
  console.warn(
    "No .env found; starting API with process environment only (ODDS defaults to recorded).",
  );
}

if (env.DATABASE_URL === undefined || env.DATABASE_URL.trim().length === 0) {
  env.DATABASE_URL = DEFAULT_DATABASE_URL;
  console.warn(
    `DATABASE_URL unset; using local default for Prisma generate: ${DEFAULT_DATABASE_URL}`,
  );
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited via signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${String(code ?? 1)}`));
        return;
      }

      resolve();
    });
  });
}

try {
  // Build after .env load so @fas/database prisma generate can resolve DATABASE_URL.
  await run("pnpm", ["exec", "turbo", "run", "build", "--filter=@fas/api..."]);
  await run("pnpm", ["--filter", "@fas/api", "dev"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

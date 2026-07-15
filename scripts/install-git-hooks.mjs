import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const isDisabled =
  process.env.HUSKY === "0" ||
  process.env.CI === "true" ||
  process.env.NODE_ENV === "production" ||
  process.env.npm_config_production === "true" ||
  (process.env.npm_config_omit ?? "").split(",").includes("dev");

if (!isDisabled) {
  try {
    await access(".git");
  } catch (error) {
    if (error?.code === "ENOENT") {
      process.exit(0);
    }

    throw error;
  }

  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["exec", "husky"], {
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

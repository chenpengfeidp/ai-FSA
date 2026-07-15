import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const requiredDirectories = ["apps", "packages", "tooling", "scripts", ".github"];
const workspaceRoots = ["apps", "packages"];

for (const directory of requiredDirectories) {
  await access(path.join(repositoryRoot, directory));
}

const workspaceDefinition = await readFile(
  path.join(repositoryRoot, "pnpm-workspace.yaml"),
  "utf8",
);

for (const pattern of ['"apps/*"', '"packages/*"']) {
  if (!workspaceDefinition.includes(pattern)) {
    throw new Error(`Missing workspace pattern: ${pattern}`);
  }
}

const packageNames = new Set();
let packageCount = 0;

for (const workspaceRoot of workspaceRoots) {
  const entries = await readdir(path.join(repositoryRoot, workspaceRoot), {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const manifestPath = path.join(
      repositoryRoot,
      workspaceRoot,
      entry.name,
      "package.json",
    );

    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      const packageName = manifest.name;

      if (typeof packageName !== "string" || !packageName.startsWith("@fas/")) {
        throw new Error(`${manifestPath} must use an @fas/* package name`);
      }

      if (packageNames.has(packageName)) {
        throw new Error(`Duplicate workspace package name: ${packageName}`);
      }

      packageNames.add(packageName);
      packageCount += 1;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

console.log(
  `Workspace validation passed (${packageCount} package${packageCount === 1 ? "" : "s"}).`,
);

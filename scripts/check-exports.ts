import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACKAGES = join(ROOT, "packages");

const targetsOf = (entry) =>
  typeof entry === "string"
    ? [entry]
    : Object.values(entry).filter((value) => typeof value === "string");

const globMatches = (dir, target) => {
  const [prefix = "", suffix = ""] = target.replace(/^\.\//, "").split("*");
  return readdirSync(join(dir, prefix))
    .filter((name) => name.endsWith(suffix))
    .map((name) => join(prefix, name));
};

const isBuilt = (target) => target.startsWith("./dist/");

const failure = (name, subpath, target, reason) =>
  `${name} ${subpath} -> ${target}: ${reason}`;

const main = () => {
  const failures = [];
  const packages = readdirSync(PACKAGES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const name of packages) {
    const dir = join(PACKAGES, name);
    const manifestPath = join(dir, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (!manifest.exports || typeof manifest.exports !== "object") continue;

    const scripts = manifest.scripts ?? {};
    const packageId = manifest.name ?? name;

    for (const [subpath, entry] of Object.entries(manifest.exports)) {
      for (const target of targetsOf(entry)) {
        if (target.includes("*")) {
          if (globMatches(dir, target).length === 0)
            failures.push(
              failure(packageId, subpath, target, "matches no file"),
            );
        } else if (isBuilt(target)) {
          if (typeof scripts.build !== "string")
            failures.push(
              failure(
                packageId,
                subpath,
                target,
                "build target from a package with no build script",
              ),
            );
        } else if (!existsSync(resolve(dir, target))) {
          failures.push(failure(packageId, subpath, target, "file missing"));
        }
      }
    }
  }

  for (const item of failures) console.error(`FAIL ${item}`);
  if (failures.length) {
    console.error(
      `\n${failures.length} export target(s) that do not resolve. Fix the map or the file.`,
    );
    process.exit(1);
  }
  console.log(
    `exports: ${packages.length} packages, every target resolves to a file`,
  );
};

if (import.meta.url === `file://${process.argv[1]}`) main();

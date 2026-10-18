import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards `/docs/native-testing`. The bug it exists for: `@gpuixui/testing`
 * shipped as the evidence behind every `verified 0.10.0` row, but the site only
 * named it in a one-line bullet, and the Values API exclusion sent readers to
 * Contributing for runs that page did not describe. The scenario model, the
 * `0`/`1`/`2` exit contract and the limits of the suite were reachable only from
 * the package README. Nothing compared the page to the package, so a renamed
 * script or a fourth namespace projection would drift silently.
 *
 * `node:fs` is deliberate at this vitest boundary, as in
 * `content-references.test.ts`; `apps/docs` imports no Effect runtime.
 */

const root = fileURLToPath(new URL("../../../", import.meta.url));

const read = (relative: string): string =>
  readFileSync(join(root, relative), "utf8");

const page = read("apps/docs/content/docs/native-testing.mdx");
const testingEntry = read("packages/testing/src/index.ts");
const reportSource = read("packages/testing/src/report.ts");
const cli = read("apps/playground/src/smoke/run.ts");
const contributing = read("apps/docs/content/docs/contributing.mdx");
const architecture = read("apps/docs/content/docs/architecture.mdx");
const policy = read("apps/docs/src/lib/api-values.ts");
const apiValuesPage = read("apps/docs/content/docs/api-values.mdx");

const namespaces = [...testingEntry.matchAll(/export \* as (\w+) from/g)].map(
  (match) => match[1] ?? "",
);

const documentedCommands = [...page.matchAll(/nub run --filter (\S+) (\S+)/g)]
  .map((match) => ({ packageName: match[1] ?? "", script: match[2] ?? "" }))
  .filter(({ packageName, script }) => packageName !== "" && script !== "");

interface WorkspaceManifest {
  readonly name: string;
  readonly scripts: Readonly<Record<string, string>>;
}

const isWorkspaceManifest = (value: unknown): value is WorkspaceManifest => {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value) || typeof value.name !== "string") return false;
  if (!("scripts" in value) || typeof value.scripts !== "object") return false;
  return (
    value.scripts !== null &&
    Object.values(value.scripts).every((script) => typeof script === "string")
  );
};

/** Every workspace's `scripts` object, keyed by package name. */
const workspaceScripts = ["apps", "packages"].flatMap((kind) =>
  readdirSync(join(root, kind), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const manifest = join(root, kind, entry.name, "package.json");
      if (!existsSync(manifest)) return [];
      const parsed: unknown = JSON.parse(readFileSync(manifest, "utf8"));
      return isWorkspaceManifest(parsed)
        ? [{ name: parsed.name, scripts: parsed.scripts }]
        : [];
    }),
);

const scriptsFor = (packageName: string): Readonly<Record<string, string>> =>
  workspaceScripts.find((workspace) => workspace.name === packageName)
    ?.scripts ?? {};

describe("the native-testing page", () => {
  it("names every namespace projection the package exports", () => {
    expect(namespaces).toEqual(["Report", "Runtime", "Smoke"]);
    const missing = namespaces.filter(
      (name) => !page.includes("`" + name + "`"),
    );
    expect(missing).toEqual([]);
  });

  it("documents only scripts the named workspace defines", () => {
    expect(documentedCommands.length).toBeGreaterThan(0);
    const unknown = documentedCommands
      .filter(({ packageName, script }) => !(script in scriptsFor(packageName)))
      .map(({ packageName, script }) => `${packageName} ${script}`);
    expect(unknown).toEqual([]);
  });

  it("states the exit-code contract the CLI and the report implement", () => {
    expect(cli).toContain("unverified: 2");
    expect(cli).toContain("EXIT.unverified");
    expect(reportSource).toContain("export const exitCode");
    expect(page).toContain("Report.exitCode");
    expect(page).toContain("exit 2");
    expect(page).toContain("unverified");
  });

  it("is reachable from the pages that point a contributor at it", () => {
    expect(contributing).toContain("(/docs/native-testing)");
    expect(architecture).toContain("/docs/native-testing");
    for (const link of [
      "/docs/capabilities",
      "/docs/contributing",
      "/docs/components",
    ]) {
      expect(page).toContain(link);
    }
  });

  it("includes the real entry point and a real scenario", () => {
    for (const source of [
      "packages/testing/src/index.ts",
      "apps/playground/src/scenarios/layout.tsx",
    ]) {
      expect(page).toContain(source);
      expect(existsSync(join(root, source))).toBe(true);
    }
  });

  it("keeps the Values API exclusion pointing at this page", () => {
    expect(policy).toContain("documented on the Native smoke suite page");
    expect(apiValuesPage).toContain("(/docs/native-testing)");
  });
});

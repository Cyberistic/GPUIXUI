import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The contributing page is a set of instructions, and an instruction is only
 * useful if the thing it names exists.
 *
 * It had drifted in three ways: it taught `nub run test:behaviour`, a script
 * only `packages/components` declares, so a contributor running it from the root
 * got "script not found"; it called `main` the integration branch of a repository
 * whose only branch is `master`; and it sent a new component's page to
 * `apps/docs/content/docs/components`, when the page a component ships is
 * `packages/<package>/docs` and the curated file is an optional overlay. Each
 * claim is read from disk here, so the page cannot teach a command or a path that
 * does not exist.
 */

const root = new URL("../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A manifest's `scripts` map, keyed by the package's own name. */
interface Package {
  readonly name: string;
  readonly scripts: Readonly<Record<string, string>>;
}

const manifest = (path: string): Package | undefined => {
  const parsed: unknown = JSON.parse(read(path));
  if (!isRecord(parsed) || typeof parsed.name !== "string") return undefined;
  const scripts = isRecord(parsed.scripts) ? parsed.scripts : {};
  return {
    name: parsed.name,
    scripts: Object.fromEntries(
      Object.entries(scripts).flatMap(([key, body]) =>
        typeof body === "string" ? [[key, body]] : [],
      ),
    ),
  };
};

/** Every workspace manifest a `--filter` can name, plus the root. */
const workspace: ReadonlyArray<Package> = [
  "package.json",
  ...["apps", "packages"].flatMap((dir) =>
    readdirSync(new URL(`${dir}/`, root), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${dir}/${entry.name}/package.json`),
  ),
].flatMap((path) => {
  const parsed = manifest(path);
  return parsed === undefined ? [] : [parsed];
});

const rootPackage = workspace.find((pkg) => pkg.name === "gpuixui");

const page = read("apps/docs/content/docs/contributing.mdx");

/** The shell lines the page's `sh` blocks teach, comments and blanks dropped. */
const commands = (): ReadonlyArray<string> =>
  page
    .split("```")
    .filter((fence) => fence.startsWith("sh\n") || fence.startsWith("sh\r\n"))
    .flatMap((fence) =>
      fence
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("nub ")),
    );

/** The script a command runs, and the package whose manifest must declare it. */
const scriptOf = (
  command: string,
):
  | { readonly packageName: string | undefined; readonly script: string }
  | undefined => {
  const filtered = /^nub run --filter (\S+) ([\w:]+)$/.exec(command);
  if (filtered?.[1] !== undefined && filtered[2] !== undefined) {
    return { packageName: filtered[1], script: filtered[2] };
  }
  const plain = /^nub run ([\w:]+)$/.exec(command);
  return plain?.[1] === undefined
    ? undefined
    : { packageName: undefined, script: plain[1] };
};

describe("the contributing page", () => {
  it("teaches only scripts a workspace manifest declares", () => {
    // A command that does not exist is the one instruction a reader cannot
    // finish: `nub run test:behaviour` was root-level advice for a script that
    // only `@gpuixui/components` declares.
    const broken = commands().flatMap((command) => {
      const target = scriptOf(command);
      if (target === undefined) return [];
      const owner =
        target.packageName === undefined
          ? rootPackage
          : workspace.find((pkg) => pkg.name === target.packageName);
      return owner?.scripts[target.script] === undefined
        ? [
            `${command} — ${owner?.name ?? target.packageName} has no ${target.script}`,
          ]
        : [];
    });

    expect(broken).toEqual([]);
  });

  it("teaches at least the gate, the suite and a native check", () => {
    // An empty block would satisfy the case above. These three are what the page
    // is for: the merge gate, the tests, and the proof in the real renderer.
    const taught = commands()
      .map((command) => command)
      .join("\n");

    expect(taught).toContain("nub run check");
    expect(taught).toContain("nub run test");
    expect(taught).toContain("test:runtime");
  });

  it("names the branch this repository has", () => {
    expect(page).toContain("`master`");
    expect(page).not.toContain("`main`");
  });

  it("names where a component's page lives, package first", () => {
    expect(page).toContain("packages/<package>/docs");
    expect(page).toContain("apps/docs/content/docs/components");
  });
});

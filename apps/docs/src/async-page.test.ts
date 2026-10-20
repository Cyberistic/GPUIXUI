import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the Async data and effects page (plan 632).
 *
 * The bug being prevented is a page that answers a real reader question
 * (`async`, `data fetching`, `suspense`, `useeffect`, `cache`, `retry`,
 * `cancellation`) with claims nothing checks. Every claim on the page is a
 * statement about the repository or the installed dependency, so each one is
 * re-derived here: the only `ManagedRuntime`, the three timers the library
 * schedules, the timer-free Countdown, the absence of a data library in every
 * workspace manifest and the absence of `Suspense` in the installed
 * `@gpuix/react`. A new timer, runtime or dependency fails this suite by name
 * until the page states it.
 *
 * `node:fs` is a deliberate test-boundary import, like
 * `content-references.test.ts` and `example-snippets.test.ts`: the docs bundle
 * must not import the runtime, and the guard has to read the tree.
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = join(appRoot, "../..");
const page = readFileSync(join(appRoot, "content/docs/async-data.mdx"), "utf8");

const relativeToRepo = (path: string): string =>
  relative(repoRoot, path).split("\\").join("/");

const sourceFiles = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === "dist") return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isSource =
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx");
    return isSource ? [path] : [];
  });

/** Every non-test source file under a package's `src`. */
const packageSources = readdirSync(join(repoRoot, "packages"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const directory = join(repoRoot, "packages", entry.name, "src");
    return existsSync(directory) ? sourceFiles(directory) : [];
  });

const filesContaining = (pattern: RegExp): ReadonlyArray<string> =>
  packageSources
    .filter((path) => pattern.test(readFileSync(path, "utf8")))
    .map(relativeToRepo);

const headings = [
  "The library does not fetch",
  "Where an effect may run",
  "Model the states",
  "Cancel and dispose",
  "Failure is a value",
  "Test it",
  "What is not provided",
] as const;

describe("async data page", () => {
  it("keeps the sections that answer the subject", () => {
    const missing = headings.filter(
      (heading) => !page.includes(`\n## ${heading}\n`),
    );
    expect(missing).toEqual([]);
  });

  it("includes the real boundary sources it describes", () => {
    const sources = [
      "packages/components/src/toast/provider.tsx",
      "packages/components/src/toast/lifecycle.ts",
    ];
    expect(
      sources.filter(
        (source) =>
          !existsSync(join(repoRoot, source)) || !page.includes(source),
      ),
    ).toEqual([]);
  });

  it("names the only ManagedRuntime", () => {
    const owners = filesContaining(/ManagedRuntime\.make\s*\(/);
    expect(owners).toEqual(["packages/components/src/toast/provider.tsx"]);
    expect(page).toContain("only `ManagedRuntime`");
    expect(page).toContain("provider.tsx");
  });

  it("names every timer the library schedules, and no timer in Countdown", () => {
    const owners = filesContaining(/\bset(?:Timeout|Interval)\s*\(/);
    expect(owners).toEqual([
      "packages/components/src/preview-card.tsx",
      "packages/primitives/src/components/internal.ts",
    ]);
    expect(page).toContain("Preview card");
    expect(page).toContain("loading indicators");
    const countdown = readFileSync(
      join(repoRoot, "packages/components/src/countdown.tsx"),
      "utf8",
    );
    expect(/\bset(?:Timeout|Interval)\s*\(/.test(countdown)).toBe(false);
    expect(page).toContain("Countdown");
  });

  it("finds no data-fetching or state library in any workspace manifest", () => {
    const denied = [
      "@apollo/client",
      "@reduxjs/toolkit",
      "@tanstack/react-query",
      "axios",
      "jotai",
      "ky",
      "mobx",
      "react-query",
      "redux",
      "swr",
      "urql",
      "valtio",
      "zustand",
    ];
    const manifests = [
      join(repoRoot, "package.json"),
      ...readdirSync(join(repoRoot, "packages"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(repoRoot, "packages", entry.name, "package.json")),
      ...readdirSync(join(repoRoot, "apps"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(repoRoot, "apps", entry.name, "package.json")),
      ...readdirSync(join(repoRoot, "examples"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(repoRoot, "examples", entry.name, "package.json")),
    ].filter(existsSync);

    const found = manifests.flatMap((path) => {
      const text = readFileSync(path, "utf8");
      return denied
        .filter((name) => new RegExp(`"${name}"\\s*:`).test(text))
        .map((name) => `${relativeToRepo(path)}: ${name}`);
    });
    expect(found).toEqual([]);
  });

  it("keeps the Suspense and worker absences true for the packages and the installed integration", () => {
    const reactRoot = dirname(
      createRequire(import.meta.url).resolve("@gpuix/react"),
    );
    const installed = sourceFiles(reactRoot).filter((path) =>
      readFileSync(path, "utf8").includes("Suspense"),
    );
    const packages = filesContaining(/Suspense/);
    const workers = filesContaining(/new Worker\s*\(|node:worker_threads/);
    expect({ installed, packages, workers }).toEqual({
      installed: [],
      packages: [],
      workers: [],
    });
    expect(page).toContain("`Suspense`");
  });

  it("keeps its summary a search name without claiming another page's alias", () => {
    const description =
      page.split("\n").find((line) => line.startsWith("description: ")) ?? "";
    expect(description.length).toBeGreaterThan(0);
    expect(description).toContain("loading");
    expect(description).toContain("failure");
    expect(description).toContain("cancellation");
    expect(description).not.toContain("state management");
  });
});

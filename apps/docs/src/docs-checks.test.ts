import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The bug guarded: `contributing.mdx` named one docs-site check
 * (`smoke:build`) while the app shipped four, so a contributor never learned
 * that the browser and live-preview smokes exist, what they prove, or what
 * their exit `2` means. Nothing compared the prose to the scripts, so each new
 * smoke drifts silently.
 *
 * `readFileSync`/`JSON.parse` are deliberate: `apps/docs` has no Effect runtime
 * and its bundle must not import `effect` (`architecture.test.ts`); every docs
 * test reads repository files the same way (`content-references.test.ts`).
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const contentRoot = join(appRoot, "content", "docs");

const scripts: Readonly<Record<string, string>> = JSON.parse(
  readFileSync(join(appRoot, "package.json"), "utf8"),
).scripts;

const smokeScripts = Object.keys(scripts).filter((name) =>
  name.startsWith("smoke:"),
);

const page = readFileSync(join(contentRoot, "contributing.mdx"), "utf8");

const walk = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? walk(path)
      : entry.name.endsWith(".mdx")
        ? [path]
        : [];
  });

/** A `nub run --filter docs <script>` command, with the file that writes it. */
const documentedCommands = walk(contentRoot).flatMap((path) =>
  [
    ...readFileSync(path, "utf8").matchAll(
      /nub run --filter docs ([a-z][\w:-]*)/g,
    ),
  ]
    .map((match) => match[1] ?? "")
    .map((script) => ({ page: path.slice(contentRoot.length + 1), script })),
);

describe("docs commands in the content", () => {
  it("writes at least one command, so an empty walk cannot pass", () => {
    expect(documentedCommands.length).toBeGreaterThan(0);
  });

  it("names only scripts apps/docs/package.json defines", () => {
    const unknown = documentedCommands
      .filter(({ script }) => !(script in scripts))
      .map(({ page: source, script }) => `${source}: no script "${script}"`);
    expect(unknown).toEqual([]);
  });
});

describe("Contributing page checks", () => {
  it("has smoke scripts to document, so a rename cannot pass vacuously", () => {
    expect(smokeScripts.length).toBeGreaterThanOrEqual(3);
  });

  it("names every docs-site smoke check", () => {
    const missing = smokeScripts.filter((name) => !page.includes(name));
    expect(missing).toEqual([]);
  });

  it("names the unit suite and the authoring command", () => {
    expect(page).toContain("nub run --filter docs test");
    expect(page).toContain("studio");
  });

  it("tells the reader what an unverifiable smoke means", () => {
    expect(page).toContain("could not verify");
  });
});

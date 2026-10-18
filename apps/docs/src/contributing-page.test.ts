import { readFileSync } from "node:fs";
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

const scripts: Readonly<Record<string, string>> = JSON.parse(
  readFileSync(`${appRoot}/package.json`, "utf8"),
).scripts;

const smokeScripts = Object.keys(scripts).filter((name) =>
  name.startsWith("smoke:"),
);

const page = readFileSync(`${appRoot}/content/docs/contributing.mdx`, "utf8");

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

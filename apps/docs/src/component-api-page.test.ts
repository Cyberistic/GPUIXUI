import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the component API page (plan 482). The page is the only place a
 * consumer learns the rules every component page assumes — parts, controlled
 * state, state-aware styles, the keyboard contract and the supported ARIA
 * subset. The failure worth catching is a page that builds, sits in the
 * sidebar and has lost the block that makes a rule executable: the real hook,
 * the real keyboard module, or the generated parts index.
 *
 * The page must also stay honest about the pinned runtime: the maintainer
 * contract promises `defaultPrevented` and a warning when `value` and
 * `defaultValue` are both supplied, and the shipped code has neither. The page
 * records the real limitation instead of repeating the promise.
 */
const pagePath = fileURLToPath(
  new URL("../content/docs/component-api.mdx", import.meta.url),
);
const page = readFileSync(pagePath, "utf8");
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const sections = [
  "Parts",
  "Controlled and uncontrolled",
  "State-aware styles",
  "Keyboard",
  "Accessibility",
  "State ownership",
  "Where the rules live",
] as const;

const headings = (): ReadonlyArray<string> =>
  page
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice("## ".length).trim());

const includeBodies = (): ReadonlyArray<string> =>
  [...page.matchAll(/<include[^>]*>\s*([\s\S]*?)\s*<\/include>/g)].map(
    (match) => (match[1] ?? "").trim(),
  );

const included = (path: string): boolean =>
  includeBodies().some((body) => body.endsWith(path));

const sources = [
  "packages/components/src/internal/parts.ts",
  "packages/components/src/internal/controllable.ts",
  "packages/primitives/src/core/keyboard.ts",
] as const;

describe("component API page", () => {
  it("carries every rule in the documented order", () => {
    expect(headings()).toEqual([...sections]);
  });

  it("includes the shared mechanisms from their real files", () => {
    const missing = sources.filter(
      (source) => !included(source) || !existsSync(join(repoRoot, source)),
    );
    expect(missing).toEqual([]);
  });

  it("renders the parts index generated from the registry", () => {
    expect(page.match(/<PartIndex \/>/g) ?? []).toHaveLength(1);
  });

  it("names the controlled props, the state type and the children type", () => {
    const terms = [
      "value",
      "defaultValue",
      "onValueChange",
      "StateStyle",
      "PartChildren",
    ];
    expect(terms.filter((term) => !page.includes(term))).toEqual([]);
  });

  it("records the runtime limitation instead of repeating the contract", () => {
    expect(page).toContain("carries no `defaultPrevented`");
    expect(page).not.toContain("defaultPrevented` is respected");
  });

  it("links the measured capability matrix and the component index", () => {
    expect(page).toContain("(/docs/capabilities)");
    expect(page).toContain("(/docs/components)");
  });

  it("ships no placeholder prose", () => {
    expect(/\b(coming soon|TBD|TODO|FIXME)\b/i.test(page)).toBe(false);
  });

  it("sits in the sidebar directly after Architecture", () => {
    const meta = readFileSync(
      fileURLToPath(new URL("../content/docs/meta.json", import.meta.url)),
      "utf8",
    );
    const pages = JSON.parse(meta) as { pages: ReadonlyArray<string> };
    expect(pages.pages.indexOf("component-api")).toBe(
      pages.pages.indexOf("architecture") + 1,
    );
  });
});

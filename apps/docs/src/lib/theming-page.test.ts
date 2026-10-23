import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/theming` teaches the platform switch but stopped at `platformTheme`:
 * a consumer could pick a shipped look and could not author one, although the
 * mission's acceptance is that a reader takes a platform theme file, edits it
 * and ships their own look.
 *
 * The page now shows `applyStyle` over a style object and names the two tables
 * a reader copies. This guard reads the package to keep the page true: every
 * field `PlatformStyle` requires must be a key in the page's sample, the merge
 * rule the page states must be the one `applyStyle` implements, and the audit
 * the page recommends must be the exported gate.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/theming.mdx").replace(/\s+/g, " ");

const platforms = read("packages/tokens/src/platforms.ts");
const theme = read("packages/tokens/src/theme.ts");
const audit = read("packages/tokens/src/audit.ts");

/** The fields an interface declares itself, `?` kept so required is derivable. */
const declared = (source: string, name: string): ReadonlyArray<string> => {
  const body = source.split(`interface ${name}`)[1]?.split("\n}")[0] ?? "";

  return [...body.matchAll(/readonly (\w+)(\??):/g)].flatMap((match) =>
    match[1] === undefined ? [] : [`${match[1]}${match[2] ?? ""}`],
  );
};

/** `PlatformStyle` is `PlatformType` plus its own fields. */
const styleFields = [
  ...declared(platforms, "PlatformType"),
  ...declared(platforms, "PlatformStyle"),
];

const requiredStyleFields = styleFields.filter((field) => !field.endsWith("?"));

/** The fence under a heading, so another sample on the page cannot satisfy it. */
const fenceAfter = (heading: string): string => {
  const start = page.indexOf(heading);
  const fence = page.indexOf("```tsx", start);
  const end = page.indexOf("```", fence + 7);

  return page.slice(fence + 7, end);
};

const styleSample = fenceAfter("Author a style");

describe("the theming page's platform styles", () => {
  it("names the merge function and the tables a reader copies", () => {
    // Bug guarded: the page offered only `platformTheme`, a name lookup, so
    // "start from one and change any value" had no shown route.
    expect(theme).toContain("export function applyStyle");
    expect(page).toContain("applyStyle");
    expect(styleSample).toContain("applyStyle(themes.light, acme)");
    expect(page).toContain("`platformStyles`");
    expect(page).toContain("`retroStyles`");
    expect(page).toContain("packages/tokens/src/platforms.ts");
    expect(page).toContain("packages/tokens/src/retro.ts");
  });

  it("declares every field a style must carry", () => {
    expect(requiredStyleFields.length).toBeGreaterThanOrEqual(7);

    const missing = requiredStyleFields.filter(
      (field) => !new RegExp(`\\b${field}:`).test(styleSample),
    );

    expect(missing).toEqual([]);
  });

  it("states the contrast rule the merge implements", () => {
    // A style is designed against one variant's floors, which is why a theme
    // that needs more keeps its own palette — page and source must agree.
    expect(theme).toContain("contrast === style.contrast");
    expect(page).toContain("keeps its own colours");
    expect(page).toContain("geometry and families");
  });

  it("sends a reader to the audit before shipping", () => {
    expect(audit).toContain("export function auditTheme");
    expect(page).toContain("auditTheme(brand)");
    expect(page).toContain("passed");
  });
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards plan 629. The bug it exists for: the runtime's second theme had no
 * page. `GpuixTheme`, `SyntaxTheme` and `GpuixMetrics` were reachable only from
 * the installed declarations; `syntax colors` returned the colour picker,
 * `code metrics` returned Theming's scale table and `gutter` returned nothing.
 *
 * These tests fail when a section, table mount, cross-link or evidence limit is
 * removed from the page, and when the playground scenario the page cites stops
 * existing. `node:fs` is deliberate at this vitest boundary.
 */
const root = fileURLToPath(new URL("../../../", import.meta.url));

const read = (relative: string): string =>
  readFileSync(join(root, relative), "utf8");

const page = read("apps/docs/content/docs/native-text-theme.mdx");
const meta = read("apps/docs/content/docs/meta.json");
const nativeElements = read("apps/docs/content/docs/native-elements.mdx");
const textInput = read("apps/docs/content/docs/components/text-input.mdx");

const sections = [
  "## Which elements take a theme",
  "## The palette",
  "## Syntax colours",
  "## Row metrics",
  "## Mapping the design system",
  "## A code block",
  "## Diff and markdown",
  "## What is not provided",
  "## Evidence and limits",
];

describe("the native text theme page", () => {
  it("names the two themes and the helper in its summary", () => {
    expect(page).toContain("GpuixTheme");
    expect(page).toContain("SyntaxTheme");
    expect(page).toContain("GpuixMetrics");
    expect(page).toContain("nativeTextTheme");
    expect(page).toContain("two themes");
  });

  it("keeps every section", () => {
    const missing = sections.filter((section) => !page.includes(section));
    expect(missing).toEqual([]);
  });

  it("mounts every generated table", () => {
    const missing = [
      "<NativeTextElements />",
      "<NativeTextThemeFields />",
      "<SyntaxThemeFields />",
      "<GpuixMetricsFields />",
      "<NativeTextMapping />",
      "<NativeTextAbsences />",
    ].filter((block) => !page.includes(block));
    expect(missing).toEqual([]);
  });

  it("sits after Native elements in the sidebar", () => {
    expect(meta).toContain('"native-text-theme"');
    expect(meta.indexOf('"native-text-theme"')).toBeGreaterThan(
      meta.indexOf('"native-elements"'),
    );
    expect(meta.indexOf('"native-text-theme"')).toBeLessThan(
      meta.indexOf('"selection"'),
    );
  });

  it("is reachable from the two pages that mention the surface", () => {
    expect(nativeElements).toContain("/docs/native-text-theme");
    expect(textInput).toContain("/docs/native-text-theme");
  });

  it("cites evidence that exists", () => {
    expect(page).toContain("text-native");
    expect(
      existsSync(join(root, "packages/primitives/src/core/style.ts")),
    ).toBe(true);
    expect(
      existsSync(join(root, "apps/playground/src/scenarios/text.tsx")),
    ).toBe(true);
    expect(page).toContain("packages/primitives/src/core/style.ts");
  });

  it("states the painted-colour limit instead of claiming a capture", () => {
    expect(page).toContain(
      "No probe in this repository measures a **painted colour**",
    );
    expect(page).toContain("declared by the runtime");
  });

  it("points the component page at the shared mapping", () => {
    expect(textInput).toContain("nativeTextTheme");
  });
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

/**
 * Guards the accessibility page (plan 565). Its sections are the contract a
 * reader relies on: the supported surface, the substitutes, the aggregate of
 * recorded limitations, and — just as important — the limits of the evidence.
 * The failure worth catching is a page that still builds after losing one of
 * those blocks, or that quietly drops the honesty paragraph and implies a
 * screen-reader test that never ran.
 *
 * `node:fs` is test-only: Vitest runs in Node, and the docs bundle never reaches
 * this file. The sidebar is decoded with `Schema` rather than cast.
 */
const page = readFileSync(
  fileURLToPath(new URL("../content/docs/accessibility.mdx", import.meta.url)),
  "utf8",
);

const meta = readFileSync(
  fileURLToPath(new URL("../content/docs/meta.json", import.meta.url)),
  "utf8",
);

const Sidebar = Schema.Struct({ pages: Schema.Array(Schema.String) });
const decodeSidebar = Schema.decodeUnknownSync(Schema.fromJsonString(Sidebar));

const sections = [
  "What assistive technology sees",
  "Missing attributes have substitutes",
  "Keyboard",
  "Pointer and touch input",
  "Recorded limitations",
  "What is verified",
  "What is not verified",
  "Building accessibly",
  "Related",
] as const;

const headings = (): ReadonlyArray<string> =>
  page
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice("## ".length).trim());

describe("the accessibility page", () => {
  it("carries every section in the documented order", () => {
    expect(headings()).toEqual([...sections]);
  });

  it("renders the generated ARIA surface and the registry's limitations", () => {
    expect(page.match(/<AriaSupportTable \/>/g) ?? []).toHaveLength(1);
    expect(page.match(/<AccessibilityIndex \/>/g) ?? []).toHaveLength(1);
  });

  it("names the evidence and its limits instead of implying a screen-reader run", () => {
    expect(page).toContain("No manual screen-reader session is recorded");
    expect(page).toContain("The live surface on this site is a canvas");
    expect(page).toContain("No live-region attributes");
  });

  it("links the pages that own the detail", () => {
    const links = [
      "/docs/component-api#accessibility",
      "/docs/component-api#keyboard",
      "/docs/capabilities",
      "/docs/native-testing",
      "/docs/contributing",
      "/docs/component-pages",
      "/docs/components",
    ];
    expect(links.filter((link) => !page.includes(`](${link})`))).toEqual([]);
  });

  it("sits in the sidebar directly after Component API", () => {
    const pages = decodeSidebar(meta).pages;
    expect(pages.indexOf("accessibility")).toBe(
      pages.indexOf("component-api") + 1,
    );
  });

  it("ships no placeholder prose", () => {
    expect(/\b(coming soon|TBD|TODO|FIXME)\b/i.test(page)).toBe(false);
  });
});

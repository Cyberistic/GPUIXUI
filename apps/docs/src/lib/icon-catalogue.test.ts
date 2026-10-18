import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { browserMarkup, filterIcons } from "@/components/icon-catalogue";
import { iconCatalogue } from "./icon-catalogue.generated";
import { deriveIconCatalogue, readIconSources } from "./icon-catalogue";

/**
 * Guards plan 507. The bug: `/docs/components/icon` told the reader that `name`
 * is an `IconName` and listed none of the 48 names the set ships, so an icon
 * name copied from a package (`chevrons-up-down`, `star-filled`) was neither on
 * the page nor in ⌘K. A second failure is silent drift: the catalogue is
 * generated from `packages/icons`, so a new icon must fail the suite until the
 * file is regenerated rather than shipping a page that is quietly one icon
 * short.
 *
 * Expectations are read from the package source in the test where possible, not
 * from the derivation under test.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const namesSource = readFileSync(`${root}packages/icons/src/names.ts`, "utf8");
const page = readFileSync(
  `${root}apps/docs/content/docs/components/icon.mdx`,
  "utf8",
);

/** `ICON_NAMES`, parsed here so the catalogue cannot be its own expectation. */
const declaredNames = [
  ...namesSource
    .slice(namesSource.indexOf("export const ICON_NAMES = ["))
    .matchAll(/^ {2}"([^"]+)",$/gm),
].map((match) => match[1] ?? "");

describe("icon catalogue", () => {
  it("lists every icon the package declares, in the package's order", () => {
    expect(declaredNames.length).toBeGreaterThan(40);
    expect(iconCatalogue.map((entry) => entry.name)).toEqual(declaredNames);
  });

  it("draws the runtime's own markup: one svg per icon on the 24x24 grid", () => {
    const markers = iconCatalogue.flatMap((entry) => {
      const opens = entry.markup.match(/<svg /g) ?? [];
      const closes = entry.markup.match(/<\/svg>/g) ?? [];
      return opens.length === 1 &&
        closes.length === 1 &&
        entry.markup.includes('viewBox="0 0 24 24"')
        ? []
        : [entry.name];
    });
    expect(markers).toEqual([]);
    expect(readIconSources(root).shapes.size).toBe(declaredNames.length);
  });

  it("keeps only the retintable paint every entry is allowed to carry", () => {
    // GPUix replaces the monochrome paint with `style.color`; a second colour in
    // the markup would survive that pass and paint wrong in one theme.
    const paints = iconCatalogue.flatMap((entry) =>
      [...entry.markup.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]+)"/g)]
        .map((match) => match[1] ?? "")
        .filter((paint) => paint.toLowerCase() !== "#000")
        .map((paint) => `${entry.name}: ${paint}`),
    );
    expect(paints).toEqual([]);
  });

  it("turns every replaceable paint into the current text colour", () => {
    expect(
      iconCatalogue.filter((entry) =>
        browserMarkup(entry.markup).includes("#000"),
      ),
    ).toEqual([]);
    expect(browserMarkup(iconCatalogue[0]?.markup ?? "")).toContain(
      'stroke="currentColor"',
    );
  });

  it("is current: the committed catalogue equals a fresh derivation", () => {
    const fresh = deriveIconCatalogue({ root });
    // Compare the data, not the layout: `oxfmt` owns formatting, and a byte
    // comparison would fail on a wrapped string with no change in meaning. A
    // new, renamed or re-drawn icon still fails here until the command runs.
    expect(iconCatalogue).toEqual(fresh);
    expect(
      readFileSync(
        `${root}apps/docs/src/lib/icon-catalogue.generated.ts`,
        "utf8",
      ),
    ).toContain("nub run --filter docs icons");
  });

  it("ships the catalogue on the Icons page, under Variants", () => {
    const variants = page.slice(
      page.indexOf("## Variants"),
      page.indexOf("## Sizes"),
    );
    expect(variants).toContain("<IconCatalogue />");
    expect(variants).toContain("every name the set ships");
    expect(variants).toContain("not a native capture");
  });

  it("filters by name and can return nothing", () => {
    const arrows = filterIcons("arrow");
    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows.every((icon) => icon.name.includes("arrow"))).toBe(true);
    expect(filterIcons("zzz")).toEqual([]);
    expect(filterIcons("")).toHaveLength(iconCatalogue.length);
  });
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { getMDXComponents } from "../mdx";
import { APPROXIMATION_NOTICE } from "./approximation-banner";
import { captureFor } from "./captures";
import { LIVE_SURFACE_NOTICE } from "./live-surface";
import {
  PREVIEW_TIER_ROWS,
  PreviewTiers,
  previewTierCounts,
} from "./preview-tiers";
import { selectPreview } from "./select-preview";

/**
 * Guards the reader-facing preview guide (plan 571). The bug being prevented is
 * a site that renders exact labels — "Live GPUix surface", "Native coverage",
 * "Illustrative approximation" — while the only full explanation lives in a
 * repository file behind a raw GitHub link. The guide must list every tier the
 * strategy defines, reuse the labels the components render, and derive its
 * counts from the same selection the pages use; a hand-written count would
 * silently lie the first time a record gained a scene or a capture.
 *
 * `readFileSync` is deliberate: a test reads fixed repository files at import
 * time. The page and the strategy are content, not runtime inputs.
 */

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const strategy = read("../../../../../docs/preview-strategy.md");
const page = read("../../../content/docs/previews.mdx");
const meta = read("../../../content/docs/meta.json");
const introduction = read("../../../content/docs/index.mdx");
const architecture = read("../../../content/docs/architecture.mdx");
const componentsIndex = read("../../../content/docs/components/index.mdx");

/** The tier column of the strategy table, e.g. `S` and `S (interaction)`. */
const strategyTiers = [
  ...strategy.matchAll(/^\| \*\*([LNSVAX])\*\*( \(interaction\))?/gm),
].flatMap((match) => {
  const letter = match[1];
  if (letter === undefined) return [];
  return [match[2] === undefined ? letter : `${letter} (interaction)`];
});

const html = renderToStaticMarkup(<PreviewTiers />);

describe("preview guide", () => {
  it("counts every record exactly once with the page's own selector", () => {
    const counts = previewTierCounts();
    const direct = components.reduce((accumulator, component) => {
      const { tier } = selectPreview(component, captureFor);
      return accumulator + (tier === "live" ? 1 : 0);
    }, 0);
    expect(counts.total).toBe(components.length);
    expect(counts.live).toBe(direct);
    expect(
      counts.live +
        counts.screenshot +
        counts.playground +
        counts.runtime +
        counts.unavailable,
    ).toBe(counts.total);
  });

  it("reports the measured split rather than a remembered one", () => {
    // Measured 2026-10-19: every record has a suite; 45 of 66 also ship a live
    // scene. A new scene or capture must update this line and the prose, not
    // leave the guide behind.
    expect(previewTierCounts()).toEqual({
      total: 66,
      live: 45,
      screenshot: 0,
      playground: 0,
      runtime: 21,
      unavailable: 0,
    });
  });

  it("lists every tier the strategy defines, and no invented one", () => {
    expect(strategyTiers).toHaveLength(7);
    expect(new Set(PREVIEW_TIER_ROWS.map((row) => row.tier))).toEqual(
      new Set(strategyTiers),
    );
    expect(new Set(strategyTiers)).toEqual(
      new Set(["L", "N", "S", "S (interaction)", "V", "A", "X"]),
    );
  });

  it("reuses the exact label the live surface and approximation render", () => {
    expect(html).toContain(LIVE_SURFACE_NOTICE.replaceAll("'", "&#x27;"));
    expect(html).toContain(APPROXIMATION_NOTICE.replaceAll("'", "&#x27;"));
    expect(html).toContain("Native coverage:");
    expect(html).toContain("Run it natively: nub run dev:playground");
    expect(html).toContain("Not verified in the GPUix runtime");
  });

  it("renders a row per tier with the derived counts", () => {
    expect(html.match(/data-preview-tier-row=/g)).toHaveLength(
      PREVIEW_TIER_ROWS.length,
    );
    expect(html).toContain(
      `${previewTierCounts().total} component records ship today`,
    );
    expect(html).toContain(`${previewTierCounts().live} select a live`);
    expect(html).toContain(
      `${previewTierCounts().runtime} select native coverage`,
    );
  });

  it("is wired into the sidebar and the pages that explained it in prose", () => {
    const pages = (JSON.parse(meta) as { pages: ReadonlyArray<string> }).pages;
    expect(pages.indexOf("previews")).toBeGreaterThan(
      pages.indexOf("architecture"),
    );
    expect(introduction).toContain("[Previews](/docs/previews)");
    expect(architecture).toContain("[Previews](/docs/previews)");
    expect(componentsIndex).toContain("[Previews](/docs/previews)");
    expect(getMDXComponents().PreviewTiers).toBe(PreviewTiers);
  });

  it("states no hand-written tier total in the page", () => {
    expect(page).not.toMatch(/\b(44|22|66)\b/);
  });
});

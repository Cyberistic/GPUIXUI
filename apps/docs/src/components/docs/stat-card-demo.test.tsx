import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { packagePreviews } from "@/lib/package-preview";
import { demos } from "./demos";
import {
  STAT_SAMPLES,
  StatCardFrame,
  areaOf,
  areaReading,
  statCardDemoSource,
  trendBetween,
  trendInk,
  trendRole,
} from "./stat-card-demo";

/**
 * The Statistic / metric cards preview.
 *
 * `packages/data/docs/stat-card.mdx` is the package's Markdown, so the site
 * mounts the drawing from `package-preview.ts` and the page carries no
 * `<ComponentPreview>`. The registry's guard sees the demo and the page mount;
 * what it cannot see is whether the drawing still paints the card's contract —
 * a reading derived from the box, and a trend in the status tone's readable
 * role, the roles `trendTone` reads in the shipped component.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** `successSoftForeground` → `success-soft-foreground`: the preview's variable. */
const kebab = (name: string): string =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe("the Statistic card preview", () => {
  it("derives the reading from the box instead of storing it twice", () => {
    expect(STAT_SAMPLES.map(areaOf)).toEqual([12, 40, 84]);
    expect(STAT_SAMPLES.map(areaReading)).toEqual(["12", "40", "84"]);
  });

  it("reads a trend from the two readings", () => {
    expect(trendBetween(12, 40)).toEqual({ direction: "up", text: "+233%" });
    expect(trendBetween(40, 12)).toEqual({ direction: "down", text: "-70%" });
    // An unchanged reading is the third direction rather than `+0%`.
    expect(trendBetween(40, 40)).toEqual({ direction: "flat", text: "0%" });
  });

  it("paints each trend in the role the shipped trendTone reads", () => {
    // The premise is the package's own derivation: the docs table must name the
    // same three roles, or the drawing teaches a colour the card never paints.
    const card = read("packages/data/src/surfaces/stat-card.tsx");
    expect(card).toContain('statusTone(theme, "success").foreground');
    expect(card).toContain('statusTone(theme, "destructive").foreground');
    expect(card).toContain("theme.colors.mutedForeground");

    expect(trendRole("up")).toBe("successSoftForeground");
    expect(trendRole("down")).toBe("destructiveSoftForeground");
    expect(trendRole("flat")).toBe("mutedForeground");

    // The tokens answer those roles for both shipped palettes.
    [themes.light, themes.dark].forEach((theme) => {
      expect(trendInk(theme, "up")).toBe(theme.colors.successSoftForeground);
      expect(trendInk(theme, "down")).toBe(
        theme.colors.destructiveSoftForeground,
      );
      expect(trendInk(theme, "flat")).toBe(theme.colors.mutedForeground);
    });

    // The style sheet paints each role through the preview's variable bridge,
    // so the platform switch repaints a trend with the card.
    const css = read("apps/docs/src/styles/demos.css");
    expect(css).toContain(`color: var(--${kebab(trendRole("up"))});`);
    expect(css).toContain(`color: var(--${kebab(trendRole("down"))});`);
    expect(css).toContain(`color: var(--${kebab(trendRole("flat"))});`);
  });

  it("draws the parts the card renders", () => {
    const html = renderToStaticMarkup(
      <StatCardFrame
        hint="8 × 5"
        label="Area"
        trend={{ direction: "up", text: "+233%" }}
        unit="px²"
        value="40"
      />,
    );

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Area"');
    expect(html).toContain(">Area<");
    expect(html).toContain(">40<");
    expect(html).toContain("px²");
    expect(html).toContain("8 × 5");
    expect(html).toContain('data-direction="up"');
    expect(html).toContain("+233%");
    expect(html).not.toContain('data-direction="down"');
  });

  it("is wired to the page the package ships", () => {
    expect(demos["stat-card-demo"]).toBeDefined();
    const row = packagePreviews.find(
      (preview) =>
        preview.origin === "data" && preview.path === "stat-card.mdx",
    );
    expect(row?.demo).toBe("stat-card-demo");

    // The Code tab is the native card, not the browser drawing.
    expect(statCardDemoSource).toContain(
      'import { StatCard } from "@gpuixui/data"',
    );
    expect(statCardDemoSource).toContain("<StatCard");
    expect(statCardDemoSource).toContain("value={width * height}");

    // The package's page is the package's, and it still teaches the trend.
    const page = read("packages/data/docs/stat-card.mdx");
    expect(page).not.toContain("<ComponentPreview");
    expect(page).toContain("trend");
  });
});

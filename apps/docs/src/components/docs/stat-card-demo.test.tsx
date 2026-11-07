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

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

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

    expect(trendBetween(40, 40)).toEqual({ direction: "flat", text: "0%" });
  });

  it("paints each trend in the role the shipped trendTone reads", () => {
    const card = read("packages/data/src/surfaces/stat-card.tsx");
    expect(card).toContain('statusTone(theme, "success").foreground');
    expect(card).toContain('statusTone(theme, "destructive").foreground');
    const trendTone = card.slice(
      card.indexOf("export const trendTone"),
      card.indexOf("export const StatCard"),
    );

    expect(trendTone).toMatch(
      /(?:theme\.colors|themeColors\(theme\))\.mutedForeground/,
    );
    expect(trendTone).not.toMatch(
      /colors\.(?:success|destructive)(?![A-Za-z])/,
    );

    expect(trendRole("up")).toBe("successSoftForeground");
    expect(trendRole("down")).toBe("destructiveSoftForeground");
    expect(trendRole("flat")).toBe("mutedForeground");

    [themes.light, themes.dark].forEach((theme) => {
      expect(trendInk(theme, "up")).toBe(theme.colors.successSoftForeground);
      expect(trendInk(theme, "down")).toBe(
        theme.colors.destructiveSoftForeground,
      );
      expect(trendInk(theme, "flat")).toBe(theme.colors.mutedForeground);
    });

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

    expect(statCardDemoSource).toContain(
      'import { StatCard } from "@gpuixui/data"',
    );
    expect(statCardDemoSource).toContain("<StatCard");
    expect(statCardDemoSource).toContain("value={width * height}");

    const page = read("packages/data/docs/stat-card.mdx");
    expect(page).not.toContain("<ComponentPreview");
    expect(page).toContain("trend");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const drawerSource = read("../../../../../packages/components/src/drawer.tsx");
const overlaySource = read(
  "../../../../../packages/components/src/internal/overlay.ts",
);
const timingSource = read("../../../../../packages/motion/src/timing.ts");
const demoSource = read("../docs/demos.tsx");
const drawingSource = read("../docs/sheet-drawer-preview.tsx");

const block = (selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, names]) =>
      (names ?? "").split(",").some((one) => one.trim() === selector),
    )
    .map(([, , body]) => body ?? "")
    .join("\n");

const reduced = (): string => {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  return start === -1 ? "" : css.slice(start);
};

describe("the overlay drawings", () => {
  it("paint the house wash over every modal family's page", () => {
    const wash = /const OVERLAY_WASH = ([\d.]+)/.exec(overlaySource)?.[1];
    expect(wash).toBe("0.55");
    expect(block(".gx-overlay-veil")).toContain(
      `color-mix(in srgb, var(--background) ${Math.round(Number(wash) * 100)}%, transparent)`,
    );

    for (const source of [demoSource, drawingSource]) {
      const backdrops = [
        ...source.matchAll(/className="(gx-(?:dialog|drawer)-backdrop[^"]*)"/g),
      ].map((match) => match[1] ?? "");
      expect(backdrops.length).toBeGreaterThan(0);
      expect(
        backdrops.filter((name) => !name.includes("gx-overlay-veil")),
      ).toEqual([]);
    }
  });

  it("blur the page behind a modal, which the native veil cannot do", () => {
    expect(block(".gx-overlay-veil")).toContain("backdrop-filter: blur(6px)");
  });

  it("slide the sheet its own span on the motion table's slow level", () => {
    const slow = Number(/slow: (\d+)/.exec(timingSource)?.[1]);
    expect(slow).toBeGreaterThan(0);
    expect(block(":root")).toContain(`--gx-overlay-ms: ${slow}ms`);
    expect(block(".gx-drawer")).toContain(
      "animation: gx-sheet-in-right var(--gx-overlay-ms) ease-out",
    );

    expect(drawerSource).toContain("isVertical(side) ? box.height : box.width");
    expect(css).toContain("translate: 100% 0");
    expect(css).toContain("translate: -100% 0");
    expect(css).toContain("translate: 0 100%");
  });

  it("round only the inner corners and draw the component's grabber", () => {
    expect(drawerSource).toContain("...innerCorners(side, theme.radius.xl)");
    expect(block('.gx-drawer[data-side="right"]')).toContain(
      "border-radius: var(--radius-xl) 0 0 var(--radius-xl)",
    );

    const width = /const GRABBER_WIDTH = (\d+)/.exec(drawerSource)?.[1];
    const height = /const GRABBER_HEIGHT = (\d+)/.exec(drawerSource)?.[1];
    expect(block(".gx-drawer-grabber")).toContain(`width: ${width}px`);
    expect(block(".gx-drawer-grabber")).toContain(`height: ${height}px`);

    expect(drawingSource).toContain("isVertical(side) ? (");
    expect(drawingSource).toContain('className="gx-drawer-grabber"');
  });

  it("takes focus without scrolling the moving surface into place", () => {
    const focuses = [...drawingSource.matchAll(/\.focus\(([^)]*)\)/g)];
    expect(focuses.length).toBeGreaterThan(0);
    expect(
      focuses.filter((match) => !match[1]?.includes("preventScroll")),
    ).toEqual([]);
  });

  it("collapses every drawn journey when the reader asks for less motion", () => {
    const reducedCss = reduced();
    for (const selector of [
      ".gx-overlay-veil",
      ".gx-dialog",
      ".gx-drawer",
      ".gx-nav-content",
      ".gx-popover",
    ]) {
      expect(reducedCss, `${selector} keeps moving`).toContain(selector);
    }
    expect(reducedCss).toContain(".gx-nav-chevron-mark");
  });
});

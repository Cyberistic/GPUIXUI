import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { areaFractions, hueAt, railFraction } from "./color-picker-preview";

const repo = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

const demo = read("apps/docs/src/components/docs/color-picker-demo.tsx");
const css = read("apps/docs/src/styles/demos.css");

const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

describe("a pointer on the area", () => {
  const box = { left: 100, top: 200, width: 300, height: 150 };

  it("names the saturation and brightness the point sits at", () => {
    const point = areaFractions({ clientX: 175, clientY: 237.5 }, box);

    expect(point.saturation).toBeCloseTo(0.25, 5);

    expect(point.brightness).toBeCloseTo(0.75, 5);
  });

  it("holds the ends when the pointer leaves the box", () => {
    const before = areaFractions({ clientX: 0, clientY: 0 }, box);
    const after = areaFractions({ clientX: 9999, clientY: 9999 }, box);

    expect(before.saturation).toBe(0);
    expect(before.brightness).toBe(1);
    expect(after.saturation).toBe(1);
    expect(after.brightness).toBe(0);
  });

  it("reads a zero-width box as the start rather than a division by zero", () => {
    const point = areaFractions(
      { clientX: 10, clientY: 10 },
      { left: 0, top: 0, width: 0, height: 0 },
    );

    expect(point.saturation).toBe(0);
    expect(point.brightness).toBe(0);
  });
});

describe("a pointer on a rail", () => {
  const box = { left: 50, width: 400 };

  it("names the fraction it sits at", () => {
    expect(railFraction(150, box)).toBeCloseTo(0.25, 5);
    expect(railFraction(450, box)).toBeCloseTo(1, 5);
    expect(railFraction(-10, box)).toBe(0);
  });

  it("names a hue the rail can paint", () => {
    expect(hueAt(0)).toBe(0);
    expect(hueAt(0.5)).toBe(180);
    expect(hueAt(1)).toBe(0);
    expect(hueAt(0.999)).toBe(359);
  });
});

describe("the drag wiring", () => {
  it("reads every rail with a press and a move, so the pointer is captured", () => {
    const rails = demo.match(/className="gx-cp-(area|track)"/g) ?? [];

    expect(rails.length).toBe(3);
    expect((demo.match(/onPointerDown=/g) ?? []).length).toBe(3);
    expect((demo.match(/onPointerMove=/g) ?? []).length).toBe(3);
    expect((demo.match(/onPointerUp=/g) ?? []).length).toBe(3);
  });

  it("captures the pointer on the press, so a drag past the rail still reports", () => {
    expect(demo).toContain("setPointerCapture");
    expect(demo).toContain("releasePointerCapture");
  });
});

describe("the panel's exit", () => {
  it("keeps the panel in the tree while it leaves", () => {
    expect(demo).toContain("data-open");
    expect(demo).toContain("usePanelPresence");
    expect(demo).toContain("onAnimationEnd");
  });

  it("paints the exit over the panel, toward the trigger", () => {
    const exit = rule('.gx-cp-panel[data-open="false"]');

    expect(exit).toContain("animation-name: gx-cp-panel-out");
    expect(exit).toContain("animation-fill-mode: forwards");
    expect(css).toContain("@keyframes gx-cp-panel-out");

    expect(rule(".gx-cp-panel")).toContain("transform-origin: 0 0");
  });

  it("snaps under reduced motion", () => {
    const guard = css.slice(
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
      css.indexOf(".gx-nav-chevron-mark"),
    );

    expect(guard).toContain(".gx-cp-panel");
    expect(guard).toContain('.gx-cp-panel[data-open="false"]');
  });
});

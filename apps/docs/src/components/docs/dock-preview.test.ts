import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DOCK_BOUNDS,
  DOCK_DIVIDER_WIDTH,
  DOCK_INITIAL,
  DOCK_STEP,
  clampWidth,
  dragWidth,
  dockKeyOf,
  keyWidth,
} from "./dock-preview";

/**
 * The dock preview's rule, held to the component it stands in for.
 *
 * `@gpuixui/dock`'s `SplitPane` ships a 6px divider that steps 16px on the
 * arrows and clamps to the caller's bounds, and the browser preview restates
 * that arithmetic so the divider is explorable on `/docs/workspace`. The
 * numbers and the CSS are read from the package and the style sheet, so a
 * preview that drifts from the shipped control fails here instead of teaching a
 * rule the library does not use.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The declaration block of a selector in a style sheet. */
const block = (css: string, selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  const end = css.indexOf("}", start);
  return end === -1 ? "" : css.slice(start, end + 1);
};

/** A numeric export in `packages/dock/src/logic.ts`. */
const constant = (name: string): number =>
  Number(
    new RegExp(`export const ${name} = ([\\d.]+);`).exec(
      read("packages/dock/src/logic.ts"),
    )?.[1] ?? Number.NaN,
  );

describe("the dock preview's split arithmetic", () => {
  it("takes the divider's width and step from the component", () => {
    expect(constant("DIVIDER_WIDTH")).toBe(DOCK_DIVIDER_WIDTH);
    expect(constant("DIVIDER_STEP")).toBe(DOCK_STEP);

    // The bounds are the preview's caller-owned numbers, so both ends are
    // reachable from where it opens.
    expect(DOCK_BOUNDS.min).toBeLessThan(DOCK_INITIAL);
    expect(DOCK_INITIAL).toBeLessThan(DOCK_BOUNDS.max);
  });

  it("clamps a drag and a key to the caller's bounds", () => {
    expect(clampWidth(DOCK_INITIAL, DOCK_BOUNDS)).toBe(DOCK_INITIAL);
    expect(clampWidth(0, DOCK_BOUNDS)).toBe(DOCK_BOUNDS.min);
    expect(clampWidth(10_000, DOCK_BOUNDS)).toBe(DOCK_BOUNDS.max);

    // A drag is measured from the width its press found, not the previous one.
    expect(dragWidth(DOCK_INITIAL, 40, DOCK_BOUNDS)).toBe(DOCK_INITIAL + 40);
    expect(dragWidth(DOCK_INITIAL, -10_000, DOCK_BOUNDS)).toBe(DOCK_BOUNDS.min);
    expect(dragWidth(DOCK_BOUNDS.max, 40, DOCK_BOUNDS)).toBe(DOCK_BOUNDS.max);

    expect(keyWidth(DOCK_INITIAL, "right", DOCK_BOUNDS)).toBe(
      DOCK_INITIAL + DOCK_STEP,
    );
    expect(keyWidth(DOCK_INITIAL, "left", DOCK_BOUNDS)).toBe(
      DOCK_INITIAL - DOCK_STEP,
    );
    expect(keyWidth(DOCK_BOUNDS.min, "left", DOCK_BOUNDS)).toBe(
      DOCK_BOUNDS.min,
    );
    expect(keyWidth(DOCK_INITIAL, "home", DOCK_BOUNDS)).toBe(DOCK_BOUNDS.min);
    expect(keyWidth(DOCK_INITIAL, "end", DOCK_BOUNDS)).toBe(DOCK_BOUNDS.max);
  });

  it("answers the four browser keys and ignores the rest", () => {
    expect(["ArrowLeft", "ArrowRight", "Home", "End"].map(dockKeyOf)).toEqual([
      "left",
      "right",
      "home",
      "end",
    ]);
    expect(["ArrowUp", "Tab", "a"].map(dockKeyOf)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);

    // A step of zero would let the two keys disagree with the package's.
    expect(DOCK_STEP).toBeGreaterThan(0);
  });
});

describe("the dock preview's paint", () => {
  const css = read("apps/docs/src/styles/demos.css");
  const demos = read("apps/docs/src/components/docs/demos.tsx");
  const page = read("apps/docs/content/docs/workspace/index.mdx");

  it("draws the library's divider, focus ring and surfaces from the theme", () => {
    const demo = read("apps/docs/src/components/docs/dock-demo.tsx");
    const handle = block(css, ".gx-dock-handle");
    // The 6px box is the component's number, applied to the divider the way
    // `SplitPane` sizes its own.
    expect(demo).toContain("style={{ width: DOCK_DIVIDER_WIDTH }}");
    expect(handle).toContain("cursor: col-resize");
    expect(block(css, ".gx-dock-handle:focus-visible")).toContain(
      "var(--ring)",
    );

    // The panes are the theme's surfaces, not the docs chrome's.
    expect(block(css, ".gx-dock")).toContain("var(--background)");
    expect(block(css, ".gx-dock-inspector")).toContain("var(--card)");
    expect(block(css, '.gx-dock-file[aria-current="page"]')).toContain(
      "var(--accent)",
    );
  });

  it("is registered as a composition and mounted on the workspace lane", () => {
    expect(demos).toContain('"panel-preview": {');
    expect(demos).toContain("render: DockPreview");
    expect(demos).toContain("composition: true");

    expect(page).toContain('<ComponentPreview name="panel-preview" />');
    expect(page).toContain("16px");
    expect(page).toContain("aria-valuetext");
    expect(page).toContain("`SplitPane`");
    expect(page).toContain("](/docs/dock/split-pane)");
  });
});

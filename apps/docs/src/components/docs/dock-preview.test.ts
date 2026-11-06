import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  clampSize,
  dragSize,
  resizeByKey,
  sizeBounds,
} from "@gpuixui/dock/logic";
import {
  DOCK_BOUNDS,
  DOCK_DIVIDER_WIDTH,
  DOCK_INITIAL,
  DOCK_STEP,
  clampWidth,
  dragWidth,
  dockKeyOf,
  dockKeys,
  keyWidth,
  type DockKey,
} from "./dock-preview";

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const block = (css: string, selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  const end = css.indexOf("}", start);
  return end === -1 ? "" : css.slice(start, end + 1);
};

describe("the dock preview's split arithmetic", () => {
  it("takes the divider's width and step from the component", () => {
    expect(DOCK_DIVIDER_WIDTH).toBe(DIVIDER_WIDTH);
    expect(DOCK_STEP).toBe(DIVIDER_STEP);

    expect(DOCK_BOUNDS.min).toBeLessThan(DOCK_INITIAL);
    expect(DOCK_INITIAL).toBeLessThan(DOCK_BOUNDS.max);
  });

  it("clamps a drag and a key to the caller's bounds", () => {
    expect(clampWidth(DOCK_INITIAL, DOCK_BOUNDS)).toBe(DOCK_INITIAL);
    expect(clampWidth(0, DOCK_BOUNDS)).toBe(DOCK_BOUNDS.min);
    expect(clampWidth(10_000, DOCK_BOUNDS)).toBe(DOCK_BOUNDS.max);

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

  it("answers what the package's own reducers answer", () => {
    const bounds = [
      DOCK_BOUNDS,
      { min: 0, max: Infinity },
      { min: 100, max: 100 },
    ] as const;
    const widths = [-50, 0, 219, 220, 312, 380, 381, 10_000] as const;
    const keys: ReadonlyArray<DockKey> = ["left", "right", "home", "end"];

    const mismatched = bounds.flatMap((bound) => {
      const packageBounds = sizeBounds(bound.min, bound.max);
      return widths.flatMap((width) =>
        keys.flatMap((key) =>
          keyWidth(width, key, bound) === resizeByKey(width, key, packageBounds)
            ? []
            : [`${key} ${width} in ${bound.min}..${bound.max}`],
        ),
      );
    });

    expect(mismatched).toEqual([]);

    expect(widths.map((width) => clampWidth(width, DOCK_BOUNDS))).toEqual(
      widths.map((width) => clampSize(width, sizeBounds(220, 380))),
    );
    expect(widths.map((width) => dragWidth(width, 40, DOCK_BOUNDS))).toEqual(
      widths.map((width) => dragSize(width, 40, sizeBounds(220, 380))),
    );

    expect(keyWidth(DOCK_INITIAL, "left", DOCK_BOUNDS)).not.toBe(
      keyWidth(DOCK_INITIAL, "right", DOCK_BOUNDS),
    );
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

    expect(DOCK_STEP).toBeGreaterThan(0);

    expect(dockKeys).toEqual(["left", "right", "home", "end"]);
  });
});

describe("the dock preview's source", () => {
  it("runs the package's rules instead of restating them", () => {
    const preview = read("apps/docs/src/components/docs/dock-preview.ts");

    expect(preview).toContain('from "@gpuixui/dock/logic"');
    expect(preview).toContain("clampSize");
    expect(preview).toContain("dragSize");
    expect(preview).toContain("resizeByKey");
    expect(preview).not.toMatch(/Math\.min\(Math\.max/);
    expect(preview).not.toContain("const widths");
  });
});

describe("the dock preview's paint", () => {
  const css = read("apps/docs/src/styles/demos.css");
  const demos = read("apps/docs/src/components/docs/demos.tsx");
  const page = read("apps/docs/content/docs/workspace/index.mdx");
  const splitPage = read("packages/dock/docs/split-pane.mdx");

  it("draws the library's divider, focus ring and surfaces from the theme", () => {
    const demo = read("apps/docs/src/components/docs/dock-demo.tsx");
    const handle = block(css, ".gx-dock-handle");

    expect(demo).toContain("style={{ width: DOCK_DIVIDER_WIDTH }}");
    expect(handle).toContain("cursor: col-resize");
    expect(block(css, ".gx-dock-handle:focus-visible")).toContain(
      "var(--ring)",
    );

    expect(block(css, ".gx-dock")).toContain("var(--background)");
    expect(block(css, ".gx-dock-inspector")).toContain("var(--card)");
    expect(block(css, '.gx-dock-file[aria-current="page"]')).toContain(
      "var(--accent)",
    );
  });

  it("tiles its columns and keeps the rail's rows inside it", () => {
    const px = (declarations: string, name: string): number => {
      const value = new RegExp(`${name}:\\s*(-?[\\d.]+)px`).exec(declarations);
      if (value === null) throw new Error(`no ${name} in "${declarations}"`);
      return Number(value[1]);
    };

    const frame = block(css, ".gx-dock");
    const rail = block(css, ".gx-dock-rail");
    const row = block(css, ".gx-dock-file");
    const name = block(css, ".gx-dock-name");
    const badge = block(css, ".gx-dock-file b");

    const inner = px(frame, "max-width") - 2 * px(frame, "border");
    const inspector =
      inner - px(rail, "width") - DOCK_INITIAL - DOCK_DIVIDER_WIDTH;

    expect(inspector).toBeGreaterThan(0);
    expect(
      px(rail, "width") + DOCK_INITIAL + DOCK_DIVIDER_WIDTH + inspector,
    ).toBe(inner);

    expect(rail).not.toContain("border-right");

    expect(row).toContain("white-space: nowrap;");
    expect(name).toContain("text-overflow: ellipsis;");
    expect(name).toContain("min-width: 0;");
    expect(badge).toContain("flex: none;");
  });

  it("is registered as a composition and mounted on both pages that draw it", () => {
    expect(demos).toContain('"panel-preview": {');
    expect(demos).toContain("render: DockPreview");
    expect(demos).toContain("composition: true");

    expect(page).toContain('<ComponentPreview name="panel-preview" />');
    expect(splitPage).toContain('<ComponentPreview name="panel-preview" />');
    expect(page).toContain("16px");
    expect(page).toContain("aria-valuetext");
    expect(page).toContain("`SplitPane`");
    expect(page).toContain("](/dock/split-pane)");
  });
});

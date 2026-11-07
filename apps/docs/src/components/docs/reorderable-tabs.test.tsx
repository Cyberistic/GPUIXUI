import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReorderableTabs, type ReorderableTab } from "./reorderable-tabs";
import {
  closedTabs,
  dropIndex,
  gapOf,
  moveTabTo,
  orderWith,
  positionsFor,
  shiftsFor,
  type TabBox,
} from "./reorderable-tabs-logic";

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const boxes: ReadonlyArray<TabBox> = [
  { id: "page.tsx", left: 0, width: 100 },
  { id: "button.tsx", left: 106, width: 80 },
  { id: "theme.ts", left: 192, width: 60 },
];

const tabs: ReadonlyArray<ReorderableTab> = [
  { id: "page.tsx", label: "page.tsx" },
  { id: "button.tsx", label: "button.tsx" },
  { id: "theme.ts", label: "theme.ts" },
];

describe("the drop slot", () => {
  it("splits a tab at its centre, not its left edge", () => {
    const rest = boxes.filter((box) => box.id !== "page.tsx");
    expect(dropIndex(rest, 106)).toBe(0);
    expect(dropIndex(rest, 147)).toBe(1);
    expect(dropIndex(rest, 223)).toBe(2);
  });

  it("reads a zero-width strip as the only slot", () => {
    expect(dropIndex([], 999)).toBe(0);
  });

  it("subtracts the rail's origin from the pointer's viewport coordinate", () => {
    const rest = boxes.filter((box) => box.id !== "page.tsx");

    expect(dropIndex(rest, 387, 240)).toBe(1);
    expect(dropIndex(rest, 346, 240)).toBe(0);
  });
});

describe("the order a release produces", () => {
  it("moves a tab to the slot the pointer names", () => {
    expect(orderWith(boxes, "page.tsx", 2).map((box) => box.id)).toEqual([
      "button.tsx",
      "theme.ts",
      "page.tsx",
    ]);
  });

  it("clamps a slot past the end instead of dropping the tab", () => {
    expect(orderWith(boxes, "page.tsx", 99).map((box) => box.id)).toEqual([
      "button.tsx",
      "theme.ts",
      "page.tsx",
    ]);
  });

  it("moves the same way for the keyboard's post-removal index", () => {
    expect(moveTabTo(tabs, "button.tsx", 0).map((tab) => tab.id)).toEqual([
      "button.tsx",
      "page.tsx",
      "theme.ts",
    ]);
  });

  it("keeps the array it was handed when the tab is unknown", () => {
    expect(moveTabTo(tabs, "missing.tsx", 0)).toBe(tabs);
  });
});

describe("the gap the drag paints", () => {
  it("measures the gutter between two tabs", () => {
    expect(gapOf(boxes)).toBe(6);
  });

  it("places unequal widths without rounding to an average", () => {
    const positions = positionsFor(boxes, "theme.ts", 0);
    expect(positions["theme.ts"]).toBe(0);
    expect(positions["page.tsx"]).toBe(66);
    expect(positions["button.tsx"]).toBe(172);
  });

  it("moves the dragged tab to its slot and the neighbours by the hole", () => {
    const shifts = shiftsFor(boxes, "page.tsx", 2);
    expect(shifts.dragged).toBe(152);
    expect(shifts.others["button.tsx"]).toBe(-106);
    expect(shifts.others["theme.ts"]).toBe(-106);
  });
});

describe("closing a tab", () => {
  it("selects the tab that took the closed tab's slot", () => {
    expect(closedTabs(tabs, "button.tsx").active).toBe("theme.ts");
  });

  it("falls back to the previous tab at the end of the strip", () => {
    expect(closedTabs(tabs, "theme.ts").active).toBe("button.tsx");
  });

  it("has no selection left when the last tab closes", () => {
    expect(closedTabs(tabs.slice(0, 1), "page.tsx").active).toBeNull();
  });

  it("leaves the list alone when the tab is not there", () => {
    expect(closedTabs(tabs, "missing.tsx").tabs).toBe(tabs);
  });
});

describe("the strip's public shape", () => {
  const markup = renderToStaticMarkup(
    <ReorderableTabs
      active="page.tsx"
      label="Open editor files"
      onActivate={() => undefined}
      onClose={() => undefined}
      onReorder={() => undefined}
      tabs={tabs}
    />,
  );

  it("is one named tab list with one roving tab stop", () => {
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Open editor files"');
    expect(markup.match(/role="tab"/g)).toHaveLength(3);
    expect(markup.match(/tabindex="0"/g)).toHaveLength(1);
    expect(markup.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(markup).toContain('aria-selected="true"');
  });

  it("names every close control after the tab it removes", () => {
    expect(
      tabs.map((tab) => markup.includes(`aria-label="Close ${tab.label}"`)),
    ).toEqual([true, true, true]);
    expect(markup.match(/data-reorder-close=""/g)).toHaveLength(3);
  });

  it("carries the pointer gesture and its transitions", () => {
    const source = read("./reorderable-tabs.tsx");
    const css = read("../../styles/demos.css");
    expect(source).toContain("onPointerDown");
    expect(source).toContain("onPointerMove");
    expect(source).toContain("onPointerUp");
    expect(source).toContain("setPointerCapture");
    expect(css).toContain("touch-action: none");
    expect(css).toContain('[data-dragging="true"]');
    expect(css).toContain('[data-closing="true"]');

    expect(source).toContain("gx-reorder-indicator");
    expect(css).toContain(".gx-reorder-indicator");

    expect(source).toContain("width: dropWidth");
    expect(css).toContain("opacity: 0.2");

    expect(source).toContain("pendingClear");

    expect(source).toContain("data-settling");
    expect(css).toContain('[data-settling="true"]');
  });
});

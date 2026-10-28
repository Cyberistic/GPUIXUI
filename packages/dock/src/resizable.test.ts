import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PanelLayout } from "./logic.js";
import { layoutOfDeclarations, type ResizablePanelProps } from "./resizable.js";

/**
 * `Resizable` is a skin over `PanelGroup`, not a second resize.
 *
 * shadcn's block is four names over `react-resizable-panels`; this package
 * already has the drag, the 16px key step and the persisted shape. The alias
 * declares panes and hands them to that group, so these cases hold the mapping
 * (declared fractions → `PanelLayout`, label defaulting, direction) and the
 * source (one `PanelGroup`, one `Divider`, parts that paint nothing).
 */

const source = readFileSync(
  new URL("./resizable.tsx", import.meta.url),
  "utf8",
);

const group = readFileSync(
  new URL("./panel-group.tsx", import.meta.url),
  "utf8",
);

const index = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

const panel = (
  id: string,
  defaultSize: number,
  label?: string,
): ResizablePanelProps => ({
  id,
  defaultSize,
  ...(label === undefined ? {} : { label }),
});

describe("the declared layout", () => {
  it("maps each panel's share onto the persisted shape", () => {
    const layout = layoutOfDeclarations("horizontal", [
      panel("sidebar", 20, "Sidebar"),
      panel("editor", 80, "Editor"),
    ]);

    expect(layout).toBeInstanceOf(PanelLayout);
    expect(layout.orientation).toBe("horizontal");
    expect(layout.panels.map((entry) => entry.id)).toEqual([
      "sidebar",
      "editor",
    ]);
    expect(layout.panels.map((entry) => entry.size)).toEqual([20, 80]);
  });

  it("names a pane that gave no label after its id", () => {
    const layout = layoutOfDeclarations("vertical", [panel("console", 30)]);
    expect(layout.panels[0]?.label).toBe("console");
    expect(layout.orientation).toBe("vertical");
  });

  it("keeps the shares a caller wrote, so a restore reads the same numbers", () => {
    // `normalizePanels` rescales at paint time; the declaration itself is the
    // caller's own numbers, which is what a persisted layout stores.
    const layout = layoutOfDeclarations("horizontal", [
      panel("a", 1),
      panel("b", 3),
    ]);
    expect(layout.panels.map((entry) => entry.size)).toEqual([1, 3]);
  });
});

describe("one control underneath", () => {
  it("renders the package's group rather than its own drag", () => {
    expect(source).toContain("<PanelGroup");
    expect(source).not.toContain("onDragDelta");
    expect(source).not.toContain('role="separator"');
    // The divider lives in the group, and the alias only names it.
    expect(group).toContain("dividerLabel?.(index) ?? `Resize ${panel.label}`");
  });

  it("paints its parts as declarations", () => {
    expect(source).toContain(
      "export const ResizablePanel = (_props: ResizablePanelProps): null => null;",
    );
    expect(source).toContain(
      "export const ResizableHandle = (_props: ResizableHandleProps): null => null;",
    );
  });

  it("exports the four names a shadcn caller writes", () => {
    for (const name of [
      "ResizableHandle",
      "ResizablePanel",
      "ResizablePanelGroup",
    ]) {
      expect(index).toContain(name);
    }
    expect(source).toContain("export const ResizablePanelGroup");
  });
});

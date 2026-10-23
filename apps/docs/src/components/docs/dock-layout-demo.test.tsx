import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  resizeSplit,
  resizeSplitByKey,
  setActiveTab,
} from "@gpuixui/dock/logic";
import {
  DOCK_LAYOUT_WIDTH,
  DockLayoutDemo,
  DockLayoutFrame,
  activateTab,
  activeLabel,
  dockAvailable,
  dockReadout,
  dockStart,
  dragDock,
  keyDock,
} from "./dock-layout-demo";

/**
 * The docking layout's preview.
 *
 * `packages/dock/docs/dock-layout.mdx` mounts a labelled browser approximation.
 * `component-preview.test.ts` holds the registry to the pages and
 * `preview-demo-render.test.tsx` mounts every demo in both palettes; what those
 * cannot see is whether the drawing still runs the package's own reducers.
 * These cases read the markup and call the preview's helpers against
 * `@gpuixui/dock`'s: a tab press is `setActiveTab` and a divider move is
 * `resizeSplit`/`resizeSplitByKey`.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

describe("the DockLayout preview", () => {
  const html = markup(
    <DockLayoutFrame layout={dockStart()} onChange={() => undefined} />,
  );

  it("draws both tab groups and one chosen tab per group", () => {
    const tree = dockStart();

    expect(html).toContain('data-group="editor"');
    expect(html).toContain('data-group="outline"');
    expect(html.match(/role="tab"/g)).toHaveLength(
      tree.first.tabs.length + tree.second.tabs.length,
    );
    // The chosen tab is the group's own `activeTab`, not the first one.
    expect(html).toContain('aria-selected="true"');
    expect(html.match(/aria-selected="false"/g)).toHaveLength(2);
    expect(activeLabel(tree.first)).toBe("Code");
    expect(activeLabel(tree.second)).toBe("Outline");
    expect(dockReadout(tree)).toBe("Code 58% · Outline 42%");
  });

  it("paints the active tab's body and only that one", () => {
    expect(html).toContain("// the tree is the state");
    // The outline group's chosen tab is its own body, not the problems one.
    expect(html).toContain("DockLayout");
    // The other two tabs' bodies are not in the tree.
    expect(html).not.toContain("The active tab");
    expect(html).not.toContain("No problems");
    expect(markup(<DockLayoutDemo />)).toContain("Code 58% · Outline 42%");
  });

  it("switches a tab through the package's reducer, leaving the sibling alone", () => {
    const start = dockStart();
    const next = activateTab(start, "editor", "preview");

    expect(next.first.activeTab).toBe("preview");
    // The other group is the same reference, not a rewritten copy.
    expect(next.second).toBe(start.second);
    expect(next.size).toBe(start.size);
    expect(dockReadout(next)).toBe("Preview 58% · Outline 42%");

    // The package's reducer is what ran; an unknown group or tab is a no-op.
    expect(next).toEqual(setActiveTab(start, "editor", "preview"));
    expect(activateTab(start, "missing", "code")).toBe(start);
    expect(activateTab(start, "editor", "missing")).toBe(start);
  });

  it("moves the divider by the package's fraction arithmetic", () => {
    const start = dockStart();
    const available = dockAvailable();
    const dragged = dragDock(start, start.size, available / 4);

    expect(available).toBe(DOCK_LAYOUT_WIDTH - DIVIDER_WIDTH);
    expect(dragged.size).toBeCloseTo(0.83, 10);
    expect(dragged.size).toBe(resizeSplit(start.size, 0.25));
    // The split's identity and both groups survive a resize.
    expect(dragged.kind).toBe("split");
    expect(dragged.id).toBe("root");
    expect(dragged.first).toBe(start.first);
    expect(dragged.second).toBe(start.second);

    // A drag past either end is clamped by the package's reducer.
    expect(dragDock(start, start.size, 100_000).size).toBe(1);
    expect(dragDock(start, start.size, -100_000).size).toBe(0);
  });

  it("steps the divider by the package's step and bounds", () => {
    const start = dockStart();
    const step = DIVIDER_STEP / dockAvailable();

    expect(keyDock(start, "right").size).toBeCloseTo(0.58 + step, 10);
    expect(keyDock(start, "left").size).toBeCloseTo(0.58 - step, 10);
    expect(keyDock(start, "home").size).toBe(0);
    expect(keyDock(start, "end").size).toBe(1);

    // The same call `DockSplitView` makes for a key.
    expect(keyDock(start, "right").size).toBe(
      resizeSplitByKey(start.size, "right", step),
    );
    // A key never rewrites the tree's groups.
    expect(keyDock(start, "end").first).toBe(start.first);
  });

  it("runs the package's reducers instead of restating them", () => {
    const demo = read("apps/docs/src/components/docs/dock-layout-demo.tsx");

    expect(demo).toContain('from "@gpuixui/dock/logic"');
    expect(demo).toContain("resizeSplit");
    expect(demo).toContain("resizeSplitByKey");
    expect(demo).toContain("setActiveTab");
    expect(demo).not.toMatch(/Math\.min\(Math\.max/);
    // The frame's own width is a documented preview number, not the split's.
    expect(demo).toContain("DOCK_LAYOUT_WIDTH");
    expect(read("packages/dock/src/dock-layout.tsx")).toContain("onLayout");
    // The tree is a `DockNode`, so the preview narrows it rather than casting.
    expect(demo).not.toMatch(/\bas DockTabs/);
    expect(demo).not.toMatch(/\bas DockSplit/);
  });

  it("draws the layout from the theme, and sizes its controls by density", () => {
    const css = read("apps/docs/src/styles/demos.css");
    const block = (selector: string): string => {
      const start = css.indexOf(`${selector} {`);
      return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
    };

    expect(block(".gx-layout")).toContain("var(--background)");
    expect(block(".gx-layout-tabs")).toContain("--control-height-sm");
    expect(block('.gx-layout-tab[aria-selected="true"]')).toContain(
      "var(--accent)",
    );
    expect(block(".gx-layout-tab:focus-visible")).toContain("var(--ring)");
    expect(block(".gx-layout-row")).toContain("--row-height");
    expect(block(".gx-layout-handle")).toContain("cursor: col-resize");
    expect(block(".gx-layout-handle:focus-visible")).toContain("var(--ring)");
  });

  it("is mounted by the package page, which prints what the drawing is not", () => {
    const page = read("packages/dock/docs/dock-layout.mdx");

    expect(page).toContain('<ComponentPreview name="dock-layout-demo" />');
    expect(page).toContain("## API");
    expect(page).toContain("## Limitations");
    expect(page).toContain("620");
    expect(page).toContain("onLayout");
    expect(page).toContain("one-level tree");
    // The drawn tab is a real button in a tablist, not the shipped div.
    expect(page).toContain("real `<button>`s in a `tablist`");
    expect(page).toContain('div role="tab"');
  });
});

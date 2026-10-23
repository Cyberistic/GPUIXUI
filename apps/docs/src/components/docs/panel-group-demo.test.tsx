import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  Panel,
  PanelLayout,
  dividerKeys,
  isDividerKey,
  normalizePanels,
  resizePanels,
  resizePanelsByKey,
  togglePanelCollapsed,
} from "@gpuixui/dock/logic";
import {
  GROUP_WIDTH,
  PanelGroupDemo,
  PanelGroupFrame,
  browserDividerKey,
  dragLayout,
  groupAvailable,
  groupStart,
  keyLayout,
  shareLabel,
} from "./panel-group-demo";

/**
 * The panel group's preview.
 *
 * `packages/dock/docs/panel-group.mdx` mounts a labelled browser approximation.
 * `component-preview.test.ts` holds the registry to the pages and
 * `preview-demo-render.test.tsx` mounts every demo in both palettes; what those
 * cannot see is whether the drawing still runs the package's own reducers.
 * These cases read the markup and call the preview's helpers against the
 * arithmetic `@gpuixui/dock` ships: a pane's share, a drag, a key and a
 * collapse are `PanelGroup`'s, not a second rule written for the browser.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

/** A layout whose fractions do not sum to one, so normalising is visible. */
const uneven = (): PanelLayout =>
  new PanelLayout({
    orientation: "horizontal",
    panels: [
      new Panel({ id: "sidebar", label: "Sidebar", size: 0.4, collapsible: true }),
      new Panel({ id: "editor", label: "Editor", size: 1 }),
      new Panel({ id: "inspector", label: "Inspector", size: 0.6 }),
    ],
  });

describe("the PanelGroup preview", () => {
  const html = markup(
    <PanelGroupFrame layout={groupStart()} onChange={() => undefined} />,
  );

  it("paints one pane per panel and one divider per adjacent pair", () => {
    const start = groupStart();

    // A preview that painted a fixed two-column box would agree with the
    // picture and not with a group that takes N panels.
    expect(html.match(/data-panel="/g)).toHaveLength(start.panels.length);
    expect(html.match(/role="separator"/g)).toHaveLength(start.panels.length - 1);
    expect(html).toContain(`width:${DIVIDER_WIDTH}px`);
  });

  it("takes each pane's share from the package's normaliser", () => {
    const layout = uneven();
    const shares = normalizePanels(layout.panels);
    const unevenHtml = markup(
      <PanelGroupFrame layout={layout} onChange={() => undefined} />,
    );

    expect(shares.map((panel) => panel.size)).toEqual([0.2, 0.5, 0.3]);
    expect(unevenHtml).toContain("flex-grow:0.2");
    expect(unevenHtml).toContain("flex-grow:0.5");
    expect(unevenHtml).toContain("flex-grow:0.3");
    expect(shareLabel(layout)).toBe("sidebar 20% · editor 50% · inspector 30%");
    // The page's own readout is the normalised shape, not the raw fractions.
    expect(unevenHtml).not.toContain("flex-grow:0.4");
    expect(markup(<PanelGroupDemo />)).toContain("sidebar 22%");
  });

  it("steps a divider by the package's step over the preview's pane space", () => {
    const start = groupStart();
    const available = groupAvailable(start.panels.length);
    const step = DIVIDER_STEP / available;
    const next = keyLayout(start, 0, "right");

    expect(available).toBe(GROUP_WIDTH - 2 * DIVIDER_WIDTH);
    expect(next.panels[0]?.size).toBeCloseTo(0.22 + step, 10);
    expect(next.panels[1]?.size).toBeCloseTo(0.5 - step, 10);
    // The divider trades space between its own pair and leaves the rest alone.
    expect(next.panels[2]?.size).toBe(0.28);

    // The same call the shipped group makes for a key: the preview adds no
    // rule of its own, only the pixel-to-fraction conversion.
    expect(next.panels.map((panel) => panel.size)).toEqual(
      resizePanelsByKey(
        normalizePanels(start.panels),
        0,
        "right",
        step,
      ).map((panel) => panel.size),
    );

    // Home and End name the pair's bounds, as the component's do.
    const home = keyLayout(start, 0, "home");
    const end = keyLayout(start, 0, "end");
    expect(home.panels[0]?.size).toBe(0);
    expect(home.panels[1]?.size).toBeCloseTo(0.72, 10);
    expect(end.panels[0]?.size).toBeCloseTo(0.72, 10);
    expect(end.panels[1]?.size).toBe(0);
    expect(home.panels[2]?.size).toBe(0.28);
  });

  it("converts a drag's pixels against the pane space the press found", () => {
    const start = groupStart();
    const available = groupAvailable(start.panels.length);
    const dragged = dragLayout(start, 0, start.panels, available / 4);

    expect(dragged.panels[0]?.size).toBeCloseTo(0.47, 10);
    expect(dragged.panels[1]?.size).toBeCloseTo(0.25, 10);
    expect(dragged.panels[2]?.size).toBe(0.28);

    // The move is clamped inside the pair, and a press that began elsewhere
    // still reports the list it found rather than the layout's next render.
    const past = dragLayout(start, 0, start.panels, 100_000);
    const back = dragLayout(start, 0, start.panels, -100_000);
    expect(past.panels[0]?.size).toBeCloseTo(0.72, 10);
    expect(past.panels[1]?.size).toBe(0);
    expect(back.panels[0]?.size).toBe(0);
    expect(back.panels[1]?.size).toBeCloseTo(0.72, 10);

    // The helper is the package's reducer, not a parallel one.
    expect(dragged.panels.map((panel) => panel.size)).toEqual(
      resizePanels(normalizePanels(start.panels), 0, 0.25).map(
        (panel) => panel.size,
      ),
    );
  });

  it("collapses a pane through the package's flag and drops its body", () => {
    const start = groupStart();
    const collapsed = togglePanelCollapsed(start, "sidebar");
    const collapsedHtml = markup(
      <PanelGroupFrame layout={collapsed} onChange={() => undefined} />,
    );

    expect(collapsed.panels[0]?.collapsed).toBe(true);
    expect(collapsedHtml).toContain('data-collapsed="true"');
    expect(collapsedHtml).toContain('aria-expanded="false"');
    expect(collapsedHtml).toContain("▸");
    // A collapsed pane's content leaves the tree, so the neighbours fill it.
    expect(collapsedHtml).not.toContain("panel-group.tsx");
    expect(collapsedHtml).toContain('data-panel="editor"');

    // A panel that is not collapsible, and an id that names none, are no-ops.
    expect(togglePanelCollapsed(start, "editor")).toBe(start);
    expect(togglePanelCollapsed(start, "missing")).toBe(start);
  });

  it("maps the browser's key names onto the package's own key union", () => {
    expect(dividerKeys).toEqual(["left", "right", "up", "down", "home", "end"]);
    expect(
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].map(
        browserDividerKey,
      ),
    ).toEqual(["left", "right", "up", "down", "home", "end"]);
    expect(["Tab", "a", "PageDown", ""].map(browserDividerKey)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);

    // Every key the drawing answers is a key the package names, so the two
    // lists cannot drift.
    const mapped = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].flatMap(
      (name) => {
        const key = browserDividerKey(name);
        return key === undefined ? [] : [key];
      },
    );
    expect(mapped.filter((key) => !isDividerKey(key))).toEqual([]);
  });

  it("runs the package's rules instead of restating them", () => {
    const demo = read("apps/docs/src/components/docs/panel-group-demo.tsx");

    // The preview imports the reducer and the step; a literal 16 or a local
    // clamp would be a second rule that drifts from the component.
    expect(demo).toContain('from "@gpuixui/dock/logic"');
    expect(demo).toContain("DIVIDER_STEP");
    expect(demo).toContain("resizePanelsByKey");
    expect(demo).toContain("togglePanelCollapsed");
    expect(demo).not.toContain("const DIVIDER_STEP");
    expect(demo).not.toMatch(/Math\.min\(Math\.max/);

    // The split preview's own guard reads the package source through a regex;
    // this one imports the constant, so the widths cannot disagree.
    expect(read("packages/dock/src/logic.ts")).toContain(
      `export const DIVIDER_WIDTH = ${DIVIDER_WIDTH};`,
    );
  });

  it("draws the group from the theme, and sizes its controls by density", () => {
    const css = read("apps/docs/src/styles/demos.css");
    const block = (selector: string): string => {
      const start = css.indexOf(`${selector} {`);
      return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
    };

    expect(block(".gx-group")).toContain("var(--background)");
    expect(block(".gx-group")).toContain("var(--border)");
    expect(block(".gx-group-head")).toContain("--control-height-sm");
    expect(block(".gx-group-head:hover")).toContain("var(--accent)");
    expect(block(".gx-group-file")).toContain("--row-height");
    expect(block(".gx-group-handle")).toContain("cursor: col-resize");
    expect(block(".gx-group-handle:focus-visible")).toContain("var(--ring)");
  });

  it("is mounted by the package page the registry names", () => {
    const page = read("packages/dock/docs/panel-group.mdx");

    expect(page).toContain('<ComponentPreview name="panel-group-demo" />');
    // The page still opens with the prop contract the drawing stands for.
    expect(page).toContain("## API");
    expect(page).toContain("## Limitations");
    // The policy's approximation claim is the page's to print.
    expect(page).toContain("620");
    expect(page).toContain("onLayout");
  });
});

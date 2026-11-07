import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { splitOverflow } from "@/lib/shell-logic";
import {
  TOOLBAR_ACTIONS,
  TOOLBAR_MAX,
  TOOLBAR_MODES,
  ToolbarFrame,
  initialTabStop,
  moveTabStop,
  slotDisabled,
  tabStopLabel,
  toolbarReadout,
  toolbarSpecs,
  toolbarStrip,
} from "./toolbar-demo";

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

const block = (css: string, selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  const end = css.indexOf("}", start);
  return end === -1 ? "" : css.slice(start, end);
};

const frame = (
  tabStop: Option.Option<number>,
  overflowOpen = false,
  max = TOOLBAR_MAX,
): string =>
  markup(
    <ToolbarFrame
      actions={TOOLBAR_ACTIONS}
      max={max}
      mode={TOOLBAR_MODES[0]?.id}
      modes={TOOLBAR_MODES}
      onAction={() => undefined}
      onModeChange={() => undefined}
      onOverflowOpenChange={() => undefined}
      onTabStopChange={() => undefined}
      overflowOpen={overflowOpen}
      tabStop={tabStop}
    />,
  );

describe("the Toolbar preview", () => {
  it("splits the strip with the package's overflow rule", () => {
    const strip = toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX);
    const split = splitOverflow(toolbarSpecs(TOOLBAR_ACTIONS), TOOLBAR_MAX);

    expect(strip.visible.map((action) => action.id)).toEqual([
      "new",
      "open",
      "save",
      "undo",
    ]);
    expect(strip.overflow.map((action) => action.id)).toEqual(["redo", "find"]);
    expect(strip.slots).toBe(5);
    expect(strip.visible).toHaveLength(split.visible.length);
    expect(strip.overflow).toHaveLength(split.overflow.length);

    const html = frame(initialTabStop(strip));
    expect(html.match(/data-action="/g)).toHaveLength(5);
    expect(html).toContain('data-action="overflow"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).not.toContain('data-action="find"');
  });

  it("puts the overflowed actions in the menu, not in the strip", () => {
    const strip = toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX);
    const html = frame(initialTabStop(strip), true);

    expect(html).toContain('role="menu"');
    expect(html).toContain('data-action="redo"');
    expect(html).toContain('data-action="find"');
    expect(html.match(/role="menuitem"/g)).toHaveLength(2);

    expect(frame(initialTabStop(strip))).not.toContain('role="menu"');
  });

  it("keeps the tab stop off the disabled action", () => {
    const strip = toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX);

    expect(slotDisabled(strip, 0)).toBe(false);
    expect(slotDisabled(strip, 1)).toBe(true);
    expect(Option.getOrNull(initialTabStop(strip))).toBe(0);

    const moved = moveTabStop(strip, 0, 1);
    expect(Option.getOrNull(moved)).toBe(2);
    expect(tabStopLabel(strip, moved)).toBe("Save");

    const html = frame(moved);
    expect(html).toContain(
      'data-action="save" data-disabled="false" data-tab-stop="true"',
    );
    expect(html).toContain(
      'data-action="open" data-disabled="true" data-tab-stop="false"',
    );
  });

  it("wraps the roving tab stop, as the package's move does", () => {
    const strip = toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX);

    expect(Option.getOrNull(moveTabStop(strip, 4, 1))).toBe(0);
    expect(Option.getOrNull(moveTabStop(strip, 0, -1))).toBe(4);
    expect(tabStopLabel(strip, Option.some(4))).toBe("More actions");
  });

  it("reports the strip the package's split produced", () => {
    const strip = toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX);

    expect(toolbarReadout(strip, Option.some(0))).toBe(
      "4 of 6 in the strip · the tab stop is on New",
    );

    expect(
      toolbarReadout(toolbarStrip(TOOLBAR_ACTIONS, 6), Option.some(0)),
    ).toBe("6 of 6 in the strip · the tab stop is on New");
    expect(frame(initialTabStop(strip))).toContain(
      "4 of 6 in the strip · the tab stop is on New",
    );
  });

  it("paints the shared button family in the strip's groups", () => {
    const html = frame(
      initialTabStop(toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX)),
    );
    const css = read("apps/docs/src/styles/demos.css");

    const buttons = [...html.matchAll(/<button[^>]*class="([^"]*)"/g)].map(
      (match) => match[1] ?? "",
    );

    expect(buttons).toHaveLength(7);
    expect(buttons.every((classes) => classes.includes("gx-btn"))).toBe(true);
    expect(html).toContain('class="gx-btn gx-btn-ghost gx-btn-sm"');
    expect(html).toContain("gx-btn-square");

    const toolbar = html.slice(html.indexOf('role="toolbar"'));
    const spacer = toolbar.indexOf("gx-shell-spacer");
    const modes = toolbar.indexOf('class="gx-tgroup"');
    const overflow = toolbar.indexOf('data-action="overflow"');
    expect(spacer).toBeGreaterThan(-1);
    expect(modes).toBeGreaterThan(spacer);
    expect(overflow).toBeGreaterThan(modes);

    const strip = block(css, ".gx-shell-toolbar");
    expect(strip).toContain("width: 100%;");
    expect(strip).toContain("gap: 4px;");
    expect(strip).not.toContain("border-radius");
  });

  it("runs the package's reducers instead of restating them", () => {
    const demo = read("apps/docs/src/components/docs/toolbar-demo.tsx");

    expect(demo).toContain('from "@/lib/shell-logic"');
    expect(demo).toContain("splitOverflow");
    expect(demo).toContain("initialRoving");
    expect(demo).toContain("moveRoving");

    expect(demo).not.toMatch(/max - 1/);
  });
});

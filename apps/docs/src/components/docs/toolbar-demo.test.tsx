import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { splitOverflow } from "@/lib/shell-logic";
import {
  TOOLBAR_ACTIONS,
  TOOLBAR_MAX,
  ToolbarFrame,
  initialTabStop,
  moveTabStop,
  slotDisabled,
  tabStopLabel,
  toolbarReadout,
  toolbarSpecs,
  toolbarStrip,
} from "./toolbar-demo";

/**
 * The Toolbar preview.
 *
 * `packages/shell/docs/toolbar.mdx` is the package's Markdown, so the site
 * mounts the drawing from `package-preview.ts` and the page itself carries no
 * `<ComponentPreview>`. The registry's own guard sees the demo; what it cannot
 * see is whether the drawing still runs the package's rules instead of a copy
 * of them. These cases hold the strip to `@gpuixui/shell`'s `splitOverflow`,
 * `initialRoving` and `moveRoving`.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

const frame = (
  tabStop: Option.Option<number>,
  overflowOpen = false,
  max = TOOLBAR_MAX,
): string =>
  markup(
    <ToolbarFrame
      actions={TOOLBAR_ACTIONS}
      max={max}
      onAction={() => undefined}
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

    // The overflow trigger takes one of the visible slots, so `max - 1` actions
    // stay in the strip and the rest overflow.
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
    // The menu is closed until the trigger is pressed.
    expect(frame(initialTabStop(strip))).not.toContain('role="menu"');
  });

  it("keeps the tab stop off the disabled action", () => {
    const strip = toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX);

    expect(slotDisabled(strip, 0)).toBe(false);
    expect(slotDisabled(strip, 1)).toBe(true);
    expect(Option.getOrNull(initialTabStop(strip))).toBe(0);

    // Right past the disabled action lands on the next enabled one.
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

    // The overflow trigger is the last slot, so a right from it wraps to the
    // first action.
    expect(Option.getOrNull(moveTabStop(strip, 4, 1))).toBe(0);
    expect(Option.getOrNull(moveTabStop(strip, 0, -1))).toBe(4);
    expect(tabStopLabel(strip, Option.some(4))).toBe("More actions");
  });

  it("reports the strip the package's split produced", () => {
    const strip = toolbarStrip(TOOLBAR_ACTIONS, TOOLBAR_MAX);

    expect(toolbarReadout(strip, Option.some(0))).toBe(
      "4 of 6 in the strip · the tab stop is on New",
    );
    // A wider strip takes one more action out of the menu.
    expect(
      toolbarReadout(toolbarStrip(TOOLBAR_ACTIONS, 6), Option.some(0)),
    ).toBe("6 of 6 in the strip · the tab stop is on New");
    expect(frame(initialTabStop(strip))).toContain(
      "4 of 6 in the strip · the tab stop is on New",
    );
  });

  it("runs the package's reducers instead of restating them", () => {
    const demo = read("apps/docs/src/components/docs/toolbar-demo.tsx");

    expect(demo).toContain('from "@/lib/shell-logic"');
    expect(demo).toContain("splitOverflow");
    expect(demo).toContain("initialRoving");
    expect(demo).toContain("moveRoving");
    // A local copy of the split would show up as the arithmetic it re-implements.
    expect(demo).not.toMatch(/max - 1/);
  });
});

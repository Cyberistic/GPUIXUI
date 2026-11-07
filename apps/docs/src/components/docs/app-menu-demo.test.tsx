import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { dismiss, hoverOpen, initial, step } from "@/lib/shell-logic";
import {
  APP_MENU_ENTRIES,
  AppMenuFrame,
  activeRow,
  appMenuReadout,
  appMenuSpecs,
} from "./app-menu-demo";

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

const specs = appMenuSpecs(APP_MENU_ENTRIES);

const bar = (state: Parameters<typeof AppMenuFrame>[0]["state"]): string =>
  markup(
    <AppMenuFrame
      menus={APP_MENU_ENTRIES}
      onSelect={() => undefined}
      onStateChange={() => undefined}
      state={state}
    />,
  );

describe("the Application menu preview", () => {
  it("opens nothing on hover while the bar is closed", () => {
    const hovered = hoverOpen(initial, specs, 1);

    expect(hovered).toEqual(initial);
    expect(Option.isNone(hovered.openMenu)).toBe(true);
    expect(bar(hovered)).not.toContain('role="menu"');
    expect(bar(initial)).toContain("no menu is open");
  });

  it("takes a sibling over while a menu is open", () => {
    const opened = step(initial, specs, { _tag: "Open", menu: 0 });
    const hovered = hoverOpen(opened, specs, 1);

    expect(Option.getOrNull(hovered.openMenu)).toBe(1);
    expect(hovered).toEqual(hoverOpen(opened, specs, 1));

    const html = bar(hovered);
    expect(html).toContain('data-menu="edit" data-open="true"');
    expect(html).toContain('data-menu="file" data-open="false"');

    expect(html).toContain('data-item="undo"');
    expect(html).toContain('data-item="redo"');
    expect(html).not.toContain('data-item="save"');
  });

  it("highlights the row the package's traversal names", () => {
    const opened = step(initial, specs, { _tag: "Open", menu: 0 });
    const moved = step(opened, specs, { _tag: "MoveItem", delta: 1 });

    expect(Option.getOrNull(moved.activeItem)).toBe(0);
    const html = bar(moved);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    const highlighted =
      /<button[^>]*aria-selected="true"[^>]*>/.exec(html)?.[0] ?? "";
    expect(highlighted).toContain('data-item="new"');
    expect(appMenuReadout(moved, APP_MENU_ENTRIES)).toBe(
      "File is open · the highlighted row is New file",
    );

    expect(Option.getOrNull(activeRow(moved, APP_MENU_ENTRIES))).toEqual({
      menuId: "file",
      itemId: "new",
    });
  });

  it("never highlights the disabled row", () => {
    const opened = step(initial, specs, { _tag: "Open", menu: 1 });
    const moved = step(opened, specs, { _tag: "MoveItem", delta: 1 });

    expect(Option.getOrNull(moved.activeItem)).toBe(0);

    const again = step(moved, specs, { _tag: "MoveItem", delta: 1 });
    expect(Option.getOrNull(again.activeItem)).toBe(0);
    expect(Option.isNone(activeRow(again, APP_MENU_ENTRIES))).toBe(false);

    const html = bar(moved);
    const redoRow = /<button[^>]*data-item="redo"[^>]*>/.exec(html)?.[0] ?? "";
    expect(redoRow).toContain('aria-disabled="true"');
    expect(redoRow).toContain('aria-selected="false"');
  });

  it("closes with Escape and names the trigger the focus returns to", () => {
    const opened = step(initial, specs, { _tag: "Open", menu: 2 });
    const closed = dismiss(opened);

    expect(Option.getOrNull(closed.refocus)).toBe(2);
    expect(Option.isNone(closed.state.openMenu)).toBe(true);
    expect(bar(closed.state)).not.toContain('role="menu"');
    expect(bar(closed.state)).toContain("no menu is open");
  });

  it("runs the package's reducers instead of restating them", () => {
    const demo = read("apps/docs/src/components/docs/app-menu-demo.tsx");

    expect(demo).toContain('from "@/lib/shell-logic"');
    expect(demo).toContain("hoverOpen");
    expect(demo).toContain("dismiss");
    expect(demo).toContain("step");

    expect(demo).toContain('_tag: "MoveBar"');
    expect(demo).toContain('_tag: "MoveItem"');
    expect(demo).toContain('_tag: "Open"');
  });
});

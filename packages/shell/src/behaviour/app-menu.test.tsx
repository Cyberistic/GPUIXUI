/**
 * AppMenu pointer switching, in the real GPUix renderer.
 *
 * The bugs these guard: a pointer crossing a sibling title while a menu is open
 * left the old menu open; hovering a closed bar opened one (macOS opens on hover
 * only after a press); the pressed title stayed on the menu that just closed;
 * `aria-expanded` reported two menus open at once; a press on the open trigger
 * reopened instead of toggling it shut; and Escape closed without returning
 * focus to the title.
 */

import type { TestRoot } from "@gpuix/react/testing";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Option from "effect/Option";
import { afterEach, describe, expect, it } from "vitest";
import { AppMenu, type AppMenuEntry } from "../app-menu/app-menu.js";

const MENUS: ReadonlyArray<AppMenuEntry> = [
  {
    id: "ghostty",
    label: "Ghostty",
    items: [{ id: "about", label: "About Ghostty" }],
  },
  {
    id: "file",
    label: "File",
    items: [{ id: "new", label: "New Window" }],
  },
  {
    id: "services",
    label: "Services",
    items: [{ id: "open", label: "Open Services" }],
  },
];

let mounted: TestRoot | null = null;

const renderMenu = (): TestRoot => {
  const root = createTestRoot({ width: 900, height: 400 });
  root.render(
    <ThemeProvider theme={darkTheme}>
      <AppMenu label="Editor" menus={MENUS} />
    </ThemeProvider>,
  );
  mounted = root;
  return root;
};

afterEach(() => {
  mounted?.unmount();
  mounted = null;
});

const triggerId = (menu: string): string => `app-menu-trigger-${menu}`;
const panelId = (menu: string): string => `app-menu-panel-${menu}`;
const itemId = (item: string): string => `app-menu-item-${item}`;

const element = (root: TestRoot, testId: string) => {
  const found = root.renderer.findByTestId(testId);
  if (found === undefined) throw new Error(`no element with testId ${testId}`);
  return found;
};

/** Move the pointer to the centre of `testId`. */
const hover = (root: TestRoot, testId: string): void => {
  const bounds = root.renderer.getElementBounds(element(root, testId).id);
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  root.renderer.nativeSimulateMouseMove(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
};

/** Press the centre of `testId` through the runtime's hit testing. */
const click = (root: TestRoot, testId: string): void => {
  const bounds = root.renderer.getElementBounds(element(root, testId).id);
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  root.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
};

const expanded = (root: TestRoot, menu: string): unknown =>
  element(root, triggerId(menu)).customProps?.["aria-expanded"];

const focusedTestId = (root: TestRoot): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

describe("AppMenu hover switching", () => {
  it("opens a sibling on hover and closes the previous menu", () => {
    const root = renderMenu();
    click(root, triggerId("ghostty"));

    expect(expanded(root, "ghostty")).toBe(true);
    expect(root.renderer.findByTestId(panelId("ghostty"))).toBeDefined();

    hover(root, triggerId("file"));

    expect(expanded(root, "file")).toBe(true);
    expect(expanded(root, "ghostty")).toBe(false);
    expect(root.renderer.findByTestId(panelId("file"))).toBeDefined();
    expect(root.renderer.findByTestId(panelId("ghostty"))).toBeUndefined();
  });

  it("switches back to the menu it came from", () => {
    const root = renderMenu();
    click(root, triggerId("ghostty"));
    hover(root, triggerId("file"));
    expect(expanded(root, "file")).toBe(true);

    hover(root, triggerId("ghostty"));

    expect(expanded(root, "ghostty")).toBe(true);
    expect(expanded(root, "file")).toBe(false);
    expect(root.renderer.findByTestId(panelId("ghostty"))).toBeDefined();
    expect(root.renderer.findByTestId(panelId("file"))).toBeUndefined();
  });

  it("opens nothing on hover while the bar is closed (negative control)", () => {
    const root = renderMenu();

    hover(root, triggerId("file"));

    expect(expanded(root, "file")).toBe(false);
    expect(root.renderer.findByTestId(panelId("file"))).toBeUndefined();
    expect(root.renderer.findByTestId(itemId("new"))).toBeUndefined();
  });

  it("keeps the panel while the pointer crosses the gap into it", () => {
    const root = renderMenu();
    click(root, triggerId("ghostty"));
    const trigger = root.renderer.getElementBounds(
      element(root, triggerId("ghostty")).id,
    );
    const panel = root.renderer.getElementBounds(
      element(root, panelId("ghostty")).id,
    );
    if (trigger === null || panel === null) throw new Error("no painted box");

    root.renderer.nativeSimulateMouseMove(
      trigger.x + trigger.width / 2,
      trigger.y + trigger.height + 1,
    );
    root.renderer.nativeSimulateMouseMove(panel.x + 10, panel.y + 2);

    expect(expanded(root, "ghostty")).toBe(true);
    expect(root.renderer.findByTestId(panelId("ghostty"))).toBeDefined();
  });

  it("closes on Escape and returns focus to the switched-to title", () => {
    const root = renderMenu();
    click(root, triggerId("ghostty"));
    hover(root, triggerId("file"));

    root.renderer.simulateKeystrokes("escape");

    expect(root.renderer.findByTestId(panelId("file"))).toBeUndefined();
    expect(expanded(root, "file")).toBe(false);
    expect(focusedTestId(root)).toEqual(Option.some(triggerId("file")));
  });

  it("opens the next menu on ArrowRight and paints its title pressed", () => {
    const root = renderMenu();
    click(root, triggerId("ghostty"));

    root.renderer.simulateKeystrokes("right");

    expect(expanded(root, "file")).toBe(true);
    expect(expanded(root, "ghostty")).toBe(false);
    expect(root.renderer.findByTestId(panelId("file"))).toBeDefined();
    expect(element(root, triggerId("file")).style.backgroundColor).toBe(
      darkTheme.colors.active,
    );
    expect(element(root, triggerId("ghostty")).style.backgroundColor).not.toBe(
      darkTheme.colors.active,
    );
  });

  it("toggles the open menu shut on a second press", () => {
    const root = renderMenu();
    click(root, triggerId("ghostty"));

    click(root, triggerId("ghostty"));

    expect(expanded(root, "ghostty")).toBe(false);
    expect(root.renderer.findByTestId(panelId("ghostty"))).toBeUndefined();
  });
});

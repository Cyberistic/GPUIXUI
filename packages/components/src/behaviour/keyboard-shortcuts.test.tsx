/**
 * Keyboard-shortcuts behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a group that loses its rows or its heading, a chord
 * rendered with the wrong platform glyphs, keycaps that do not paint the muted
 * surface, rows that stop being list items, and a style callback that cannot
 * see the formatted keys.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  KeyboardShortcut,
  KeyboardShortcuts,
  KeyboardShortcutsGroup,
  type KeyboardShortcutState,
} from "../keyboard-shortcuts.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { nodesWithRole } from "../internal/a11y.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** The style callback used by the ordering and state assertions. */
const byKeyCount = (state: KeyboardShortcutState) => ({
  opacity: state.keys.length === 3 ? 1 : 0.5,
});

/** A cheat sheet with two groups and a mixed-width chord. */
const Sheet = () => (
  <KeyboardShortcuts label="Editor shortcuts" testId="shortcuts">
    <KeyboardShortcutsGroup label="File">
      <KeyboardShortcut
        testId="new"
        label="New file"
        accelerator="ctrl+n"
        platform="win32"
        style={byKeyCount}
      />
      <KeyboardShortcut
        testId="save"
        label="Save"
        accelerator="ctrl+shift+s"
        platform="win32"
        style={byKeyCount}
      />
    </KeyboardShortcutsGroup>
    <KeyboardShortcutsGroup label="Navigation">
      <KeyboardShortcut
        label="Go to line"
        accelerator="ctrl+g"
        platform="win32"
      />
    </KeyboardShortcutsGroup>
  </KeyboardShortcuts>
);

/** A row's keycap box by position: row → keys row → cap. */
const keycapOf = (
  root: ComponentTestRoot,
  rowTestId: string,
  index: number,
) => {
  const row = root.renderer.findByTestId(rowTestId);
  if (row === undefined) return undefined;
  const keysId = row.children[1];
  if (keysId === undefined) return undefined;
  const keys = root.renderer.getElement(keysId);
  const capId = keys?.children[index];
  return capId === undefined ? undefined : root.renderer.getElement(capId);
};

/** The styled `<text>` node behind a string. */
const styledText = (root: ComponentTestRoot, value: string) => {
  const leaf = root.renderer.findByText(value);
  if (leaf?.parentId == null) return undefined;
  return root.renderer.getElement(leaf.parentId);
};

describe("KeyboardShortcuts", () => {
  it("renders groups, labels and formatted keys in declaration order", () => {
    const sheet = renderComponent(<Sheet />);

    expect(sheet.renderer.getAllText()).toEqual([
      "File",
      "New file",
      "Ctrl",
      "N",
      "Save",
      "Ctrl",
      "Shift",
      "S",
      "Navigation",
      "Go to line",
      "Ctrl",
      "G",
    ]);

    sheet.unmount();
  });

  it("reports a named list, listitem rows and named groups", () => {
    const sheet = renderComponent(<Sheet />);

    const lists = nodesWithRole(sheet.renderer, "list");
    expect(lists).toHaveLength(1);
    expect(lists[0]?.name).toBe("Editor shortcuts");

    expect(nodesWithRole(sheet.renderer, "listitem")).toHaveLength(3);
    expect(
      nodesWithRole(sheet.renderer, "group").map((node) => node.name),
    ).toEqual(["File", "Navigation"]);

    sheet.unmount();
  });

  it("announces each group heading at level three", () => {
    const sheet = renderComponent(<Sheet />);

    const headings = nodesWithRole(sheet.renderer, "heading");
    expect(headings.map((node) => node.name)).toEqual(["File", "Navigation"]);
    expect(headings.map((node) => node.level)).toEqual([
      Option.some(3),
      Option.some(3),
    ]);

    sheet.unmount();
  });

  it("takes each group heading's level from the caller", () => {
    const sheet = renderComponent(
      <KeyboardShortcuts label="Editor shortcuts">
        <KeyboardShortcutsGroup label="File" level={2}>
          <KeyboardShortcut label="New file" accelerator="mod+n" />
        </KeyboardShortcutsGroup>
        <KeyboardShortcutsGroup label="Navigation">
          <KeyboardShortcut label="Go to line" accelerator="mod+g" />
        </KeyboardShortcutsGroup>
      </KeyboardShortcuts>,
    );

    expect(
      nodesWithRole(sheet.renderer, "heading").map((node) => node.level),
    ).toEqual([Option.some(2), Option.some(3)]);

    sheet.unmount();
  });

  it("honours a raw aria-level, and the typed level wins", () => {
    const sheet = renderComponent(
      <KeyboardShortcuts label="Editor shortcuts">
        <KeyboardShortcutsGroup label="Raw" aria-level={4} testId="raw-group">
          <KeyboardShortcut label="New file" accelerator="mod+n" />
        </KeyboardShortcutsGroup>
        <KeyboardShortcutsGroup label="Typed" level={2} aria-level={4}>
          <KeyboardShortcut label="Save" accelerator="mod+s" />
        </KeyboardShortcutsGroup>
      </KeyboardShortcuts>,
    );

    expect(
      nodesWithRole(sheet.renderer, "heading").map((node) => node.level),
    ).toEqual([Option.some(4), Option.some(2)]);

    sheet.unmount();
  });

  it("keeps a raw aria-level off the group element", () => {
    const sheet = renderComponent(
      <KeyboardShortcuts label="Editor shortcuts">
        <KeyboardShortcutsGroup label="Raw" aria-level={4} testId="raw-group">
          <KeyboardShortcut label="New file" accelerator="mod+n" />
        </KeyboardShortcutsGroup>
      </KeyboardShortcuts>,
    );

    expect(
      sheet.renderer.findByTestId("raw-group")?.customProps?.["aria-level"],
    ).toBeUndefined();

    sheet.unmount();
  });

  it("paints the keycap surface from the muted roles", () => {
    const sheet = renderComponent(<Sheet />);

    const cap = keycapOf(sheet, "new", 0);
    expect(cap?.style.backgroundColor).toBe(darkTheme.colors.muted);
    expect(cap?.style.borderWidth).toBe(darkTheme.borderWidth.thin);
    expect(cap?.style.borderColor).toBe(darkTheme.colors.border);

    sheet.unmount();

    const light = renderComponent(<Sheet />, "light");
    expect(keycapOf(light, "new", 0)?.style.backgroundColor).toBe(
      lightTheme.colors.muted,
    );
    expect(styledText(light, "File")?.style.color).toBe(
      lightTheme.colors.mutedForeground,
    );
    light.unmount();
  });

  it("lets a row style win and hands it the formatted keys", () => {
    const sheet = renderComponent(<Sheet />);

    expect(sheet.renderer.findByTestId("new")?.style.opacity).toBe(0.5);
    expect(sheet.renderer.findByTestId("save")?.style.opacity).toBe(1);

    sheet.unmount();
  });

  it("keeps row labels in the foreground role in both themes", () => {
    const sheet = renderComponent(<Sheet />);
    expect(styledText(sheet, "Save")?.style.color).toBe(
      darkTheme.colors.foreground,
    );
    sheet.unmount();

    const light = renderComponent(<Sheet />, "light");
    expect(styledText(light, "Save")?.style.color).toBe(
      lightTheme.colors.foreground,
    );
    light.unmount();
  });
});

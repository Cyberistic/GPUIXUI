/**
 * The toolbar in a window: its anatomy, its tab stop and its overflow.
 *
 * The bug these guard: the strip hand-rolled a second button chrome and put the
 * overflow trigger directly after the last action, so it had no trailing group,
 * no flexible spacer and no mode group — the things the package's own docs call
 * the toolbar's anatomy. The geometry is the renderer's; the button family is a
 * source read, because 0.11.0 publishes no recipe query.
 */

import { readFileSync } from "node:fs";
import type { TestRoot } from "@gpuix/react/testing";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Toolbar,
  type ToolbarAction,
  type ToolbarMode,
} from "../toolbar/toolbar.js";

const FRAME = { width: 900, height: 120 } as const;

const ACTIONS: ReadonlyArray<ToolbarAction> = [
  { id: "new", label: "New", group: "file" },
  { id: "open", label: "Open", group: "file", disabled: true },
  { id: "save", label: "Save", group: "file" },
  { id: "undo", label: "Undo", group: "edit" },
  { id: "redo", label: "Redo", group: "edit" },
];

const MODES: ReadonlyArray<ToolbarMode> = [
  { id: "edit", label: "Edit" },
  { id: "preview", label: "Preview" },
];

let mounted: TestRoot | null = null;

afterEach(() => {
  mounted?.unmount();
  mounted = null;
});

const renderToolbar = (): TestRoot => {
  const root = createTestRoot({ width: FRAME.width, height: FRAME.height });
  root.render(
    <ThemeProvider theme={darkTheme}>
      <div style={{ display: "flex", flexDirection: "column", height: 120 }}>
        <Toolbar
          label="Document"
          actions={ACTIONS}
          max={3}
          modes={MODES}
          mode="edit"
          testId="toolbar"
        />
      </div>
    </ThemeProvider>,
  );
  mounted = root;
  root.renderer.flush();
  return root;
};

const element = (root: TestRoot, testId: string) => {
  const found = root.renderer.findByTestId(testId);
  if (found === undefined || found === null) {
    throw new Error(`no element with testId ${testId}`);
  }
  return found;
};

const boundsOf = (root: TestRoot, testId: string) => {
  const bounds = root.renderer.getElementBounds(element(root, testId).id);
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  return bounds;
};

const click = (root: TestRoot, testId: string): void => {
  const bounds = boundsOf(root, testId);
  root.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
};

describe("the toolbar's anatomy", () => {
  it("spans its frame with the actions leading and the overflow trailing", () => {
    const root = renderToolbar();
    const bar = boundsOf(root, "toolbar");
    const first = boundsOf(root, "toolbar-action-new");
    const mode = boundsOf(root, "toolbar-mode-edit");
    const overflow = boundsOf(root, "toolbar-overflow");

    expect(bar.width).toBe(FRAME.width);
    // Leading actions, then the spacer, then the mode group, then the trigger.
    // Adjacent controls are a gap apart; the spacer is the frame's spare width.
    expect(mode.x - (first.x + first.width)).toBeGreaterThan(100);
    expect(overflow.x).toBeGreaterThan(mode.x);
    expect(overflow.x + overflow.width).toBeLessThanOrEqual(bar.x + bar.width);
    expect(bar.y + bar.height).toBeLessThan(FRAME.height);
  });

  it("opens the overflowed actions in a menu", () => {
    const root = renderToolbar();

    expect(
      root.renderer.findByTestId("toolbar-overflow-item-redo"),
    ).toBeUndefined();
    click(root, "toolbar-overflow");

    expect(
      root.renderer.findByTestId("toolbar-overflow-item-redo"),
    ).toBeDefined();
    expect(
      element(root, "toolbar-overflow").customProps?.["aria-expanded"],
    ).toBe(true);
  });
});

describe("the toolbar's paint", () => {
  it("composes the primitives, never a second button", () => {
    const source = readFileSync(
      new URL("../toolbar/toolbar.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("Button,");
    expect(source).toContain("IconButton,");
    expect(source).toContain("ToggleGroup,");
    expect(source).toContain("Separator,");
    // The old strip drew its own action: a recipe, a role and a keyboard pair.
    expect(source).not.toContain("TOOLBAR_ACTION");
    expect(source).not.toContain('role="button"');
  });
});

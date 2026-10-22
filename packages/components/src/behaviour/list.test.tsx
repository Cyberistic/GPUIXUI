/**
 * List behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a row that can be selected although it is disabled, by
 * click or by key; a hover/selection fill that ignores the theme; the roving tab
 * stop landing on more than one row (which would make the list several stops) or
 * on a disabled one; a click that selects twice; arrow keys that move the active
 * row without moving real focus; wrap-around failing at either end; a controlled
 * list that updates its own selection when the consumer says no; and — in
 * multiple mode — a Cmd-click that replaces instead of toggling, a Shift range
 * that includes a disabled row, Shift+Arrow moving focus without extending, and
 * Cmd/Ctrl+A doing nothing in multiple mode (or reporting a change in single
 * mode).
 *
 * Activation: Enter that selected but ran nothing; Space that ran the action it
 * should only select with; a click that did not run the row it selected; a plain
 * list click that ran nothing; a disabled row that activated anyway; and an
 * arrow move that activated the old row instead of the reached one.
 *
 * A caller `ref` on a row was also discarded in favour of the internal one, and
 * so was a caller `onClick`.
 *
 * Type-ahead: typing a prefix moved nothing, a repeated letter did not advance,
 * a disabled row won the match, an uppercase letter never matched, a missed
 * prefix poisoned the next search, and a typed jump must not change the
 * selection in multiple mode.
 *
 * Selection paint: a selected row declares `selectedForeground` for its text,
 * but the title's own recipe painted the page's `foreground` over it, so the
 * on-colour the row hands everything else never reached its label.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import { contrastFloors, contrastRatio } from "@gpuixui/tokens";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  pressKey,
  requireBounds,
} from "../internal/interaction.js";
import { List, ListItem, ListItemDescription, ListItemTitle } from "../list.js";
import { darkTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** Three rows, the middle one disabled. */
const catalog = (
  <List testId="list" selectionMode="single">
    <ListItem testId="row-a" value="a">
      <ListItemTitle>Alpha</ListItemTitle>
    </ListItem>
    <ListItem testId="row-b" value="b" disabled>
      <ListItemTitle>Beta</ListItemTitle>
    </ListItem>
    <ListItem testId="row-c" value="c">
      <ListItemTitle>Gamma</ListItemTitle>
      <ListItemDescription>third</ListItemDescription>
    </ListItem>
  </List>
);

/** Every row that owns the list's tab stop: exactly one should. */
const tabStop = (
  root: ComponentTestRoot,
  testIds: ReadonlyArray<string> = ["row-a", "row-b", "row-c"],
): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(testIds, (testId) =>
      Option.map(
        Option.filter(
          Option.flatMap(
            Option.fromNullishOr(root.renderer.findByTestId(testId)),
            (element) => Option.fromNullishOr(element.customProps),
          ),
          (props) => props.tabIndex === 0,
        ),
        () => testId,
      ),
    ),
  );

/** Four rows for the multiple-mode suites; the second is disabled. */
const multiCatalog = (
  onValueChange?: (values: ReadonlyArray<string>) => void,
) => (
  <List testId="list" selectionMode="multiple" onValueChange={onValueChange}>
    <ListItem testId="row-a" value="a">
      <ListItemTitle>Alpha</ListItemTitle>
    </ListItem>
    <ListItem testId="row-b" value="b" disabled>
      <ListItemTitle>Beta</ListItemTitle>
    </ListItem>
    <ListItem testId="row-c" value="c">
      <ListItemTitle>Gamma</ListItemTitle>
    </ListItem>
    <ListItem testId="row-d" value="d">
      <ListItemTitle>Delta</ListItemTitle>
    </ListItem>
  </List>
);

/** All four row ids, for the tab-stop helper. */
const multiIds = ["row-a", "row-b", "row-c", "row-d"];

/** Rows for type-ahead: two D rows, a disabled B row, and an unsearched row. */
const searchable = (mode: "single" | "multiple" = "single") => (
  <List testId="list" selectionMode={mode}>
    <ListItem testId="row-alpha" value="alpha" textValue="Alpha">
      <ListItemTitle>Alpha</ListItemTitle>
    </ListItem>
    <ListItem testId="row-beta" value="beta" disabled textValue="Beta">
      <ListItemTitle>Beta</ListItemTitle>
    </ListItem>
    <ListItem testId="row-banana" value="banana" textValue="Banana">
      <ListItemTitle>Banana</ListItemTitle>
    </ListItem>
    <ListItem testId="row-delta" value="delta" textValue="Delta">
      <ListItemTitle>Delta</ListItemTitle>
    </ListItem>
    <ListItem testId="row-draft" value="draft" textValue="Draft">
      <ListItemTitle>Draft</ListItemTitle>
    </ListItem>
    <ListItem testId="row-echo" value="echo">
      <ListItemTitle>Echo</ListItemTitle>
    </ListItem>
  </List>
);

/** The six ids of the type-ahead fixture, for the tab-stop helper. */
const searchableIds = [
  "row-alpha",
  "row-beta",
  "row-banana",
  "row-delta",
  "row-draft",
  "row-echo",
];

/** Whether a row reports itself selected. */
const isSelected = (root: ComponentTestRoot, testId: string): unknown =>
  root.renderer.findByTestId(testId)?.customProps?.["aria-selected"];

describe("List", () => {
  it("presents rows without selection or a tab stop", () => {
    const list = renderComponent(
      <List testId="list">
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );

    expect(list.renderer.findByTestId("list")?.customProps?.role).toBe("list");
    expect(list.renderer.findByTestId("row-a")?.customProps?.role).toBe(
      "listitem",
    );
    expect(list.renderer.findByTestId("row-a")?.customProps?.tabIndex).toBe(
      undefined,
    );
    expect(list.renderer.findByTestId("row-a")?.style.cursor).toBe(undefined);

    list.unmount();
  });

  it("reports a single selection as a listbox with the first row tabbable", () => {
    const list = renderComponent(catalog);

    expect(list.renderer.findByTestId("list")?.customProps?.role).toBe(
      "listbox",
    );
    expect(list.renderer.findByTestId("row-a")?.customProps?.role).toBe(
      "option",
    );
    expect(tabStop(list)).toEqual(["row-a"]);

    list.unmount();
  });

  it("renders the title and description of a row", () => {
    const list = renderComponent(catalog);

    expect(list.renderer.getAllText()).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
      "third",
    ]);

    list.unmount();
  });

  it("paints a selected row's title in the row's on-colour", () => {
    const list = renderComponent(
      <List testId="list" selectionMode="single" defaultValue="a">
        <ListItem testId="row-a" value="a">
          <ListItemTitle testId="title-a">Alpha</ListItemTitle>
          <ListItemDescription testId="description-a">
            first
          </ListItemDescription>
        </ListItem>
        <ListItem testId="row-b" value="b">
          <ListItemTitle testId="title-b">Beta</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c">
          <ListItemTitle testId="title-c" style={{ color: "#FF0000" }}>
            Gamma
          </ListItemTitle>
        </ListItem>
      </List>,
    );

    const painted = (testId: string): unknown =>
      list.renderer.findByTestId(testId)?.style.color;

    // The row's on-colour, not the page's body role: `selected` is the fill and
    // the title sits on it, so the recipe's `text-foreground` erased the role
    // the row declares. The token contract holds this pair to the body floor.
    expect(painted("title-a")).toBe(darkTheme.colors.selectedForeground);
    expect(
      contrastRatio(
        darkTheme.colors.selectedForeground,
        darkTheme.colors.selected,
      ) ?? 0,
    ).toBeGreaterThanOrEqual(contrastFloors.body);
    expect(painted("title-b")).toBe(darkTheme.colors.foreground);
    // The second line keeps its muted role, which the contract measures on the
    // same fill at the secondary floor.
    expect(painted("description-a")).toBe(darkTheme.colors.mutedForeground);

    clickCentreOf(list, "row-b");

    expect(painted("title-b")).toBe(darkTheme.colors.selectedForeground);
    expect(painted("title-a")).toBe(darkTheme.colors.foreground);

    // A caller's `style` is still the last word.
    clickCentreOf(list, "row-c");

    expect(painted("title-c")).toBe("#FF0000");

    list.unmount();
  });

  it("selects the row a click lands on and reports it once", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single" onValueChange={onValueChange}>
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b">
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    clickCentreOf(list, "row-b");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(
      list.renderer.findByTestId("row-b")?.customProps?.["aria-selected"],
    ).toBe(true);
    expect(list.renderer.findByTestId("row-b")?.style.backgroundColor).toBe(
      darkTheme.colors.selected,
    );

    clickCentreOf(list, "row-a");

    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(list.renderer.findByTestId("row-a")?.style.backgroundColor).toBe(
      darkTheme.colors.selected,
    );

    list.unmount();
  });

  it("runs a caller onClick once before selecting the row", () => {
    const onClick = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single" defaultValue="a">
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" onClick={onClick}>
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    clickCentreOf(list, "row-b");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(
      list.renderer.findByTestId("row-b")?.customProps?.["aria-selected"],
    ).toBe(true);

    list.unmount();
  });

  it("ignores a click on a disabled row", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single" onValueChange={onValueChange}>
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" disabled>
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    clickCentreOf(list, "row-b");

    expect(onValueChange).not.toHaveBeenCalled();
    expect(list.renderer.findByTestId("row-b")?.style.opacity).toBe(0.5);

    list.unmount();
  });

  it("moves real focus down and up, skipping disabled rows and wrapping", () => {
    const list = renderComponent(catalog);

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    list.renderer.simulateKeystrokes("down");

    expect(focusedTestId(list)).toEqual(Option.some("row-c"));

    list.renderer.simulateKeystrokes("down");

    expect(focusedTestId(list)).toEqual(Option.some("row-a"));

    list.renderer.simulateKeystrokes("up");

    expect(focusedTestId(list)).toEqual(Option.some("row-c"));

    list.unmount();
  });

  it("jumps to the first and last enabled row", () => {
    const list = renderComponent(catalog);
    const last = list.renderer.findByTestId("row-c")?.id ?? -1;

    list.renderer.focusElement(last);
    list.renderer.simulateKeystrokes("home");

    expect(focusedTestId(list)).toEqual(Option.some("row-a"));

    list.renderer.simulateKeystrokes("end");

    expect(focusedTestId(list)).toEqual(Option.some("row-c"));

    list.unmount();
  });

  it("selects the active row from the keyboard", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single" onValueChange={onValueChange}>
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b">
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    list.renderer.simulateKeystrokes("down");
    list.renderer.simulateKeystrokes("enter");

    expect(onValueChange).toHaveBeenCalledWith("b");

    list.unmount();
  });

  it("hands the tab stop to the selected row", () => {
    const list = renderComponent(
      <List testId="list" selectionMode="single" defaultValue="c">
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b">
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
      </List>,
    );

    expect(tabStop(list)).toEqual(["row-c"]);

    list.unmount();
  });

  it("keeps a controlled selection where the consumer put it", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(
      <List
        testId="list"
        selectionMode="single"
        value="a"
        onValueChange={onValueChange}
      >
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b">
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    clickCentreOf(list, "row-b");

    // The change is reported, but the consumer still owns the value.
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(
      list.renderer.findByTestId("row-a")?.customProps?.["aria-selected"],
    ).toBe(true);
    expect(
      list.renderer.findByTestId("row-b")?.customProps?.["aria-selected"],
    ).toBe(false);

    list.unmount();
  });

  it("measures a dense row shorter than a comfortable one", () => {
    const comfortable = renderComponent(
      <List testId="list">
        <ListItem testId="row" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );
    const comfortableHeight = comfortable.renderer.getElementBounds(
      comfortable.renderer.findByTestId("row")?.id ?? -1,
    )?.height;
    comfortable.unmount();

    const dense = renderComponent(
      <List testId="list" dense>
        <ListItem testId="row" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );
    const denseHeight = dense.renderer.getElementBounds(
      dense.renderer.findByTestId("row")?.id ?? -1,
    )?.height;
    dense.unmount();

    expect([comfortableHeight, denseHeight]).toEqual([
      darkTheme.density.rowHeight + darkTheme.spacing.md,
      darkTheme.density.rowHeight,
    ]);
  });

  it("tints a hovered row with the accent role", () => {
    const list = renderComponent(catalog);

    hoverCentreOf(list, "row-a");

    // The runtime resolves the hover diff into a full style record, so the
    // assertion is on the one field that matters.
    expect(list.renderer.findByTestId("row-a")?.style.hover).toMatchObject({
      backgroundColor: darkTheme.colors.accent,
    });

    list.unmount();
  });

  it("reports a multiple selection as a listbox of options with one tab stop", () => {
    const list = renderComponent(multiCatalog());

    expect(list.renderer.findByTestId("list")?.customProps?.role).toBe(
      "listbox",
    );
    expect(list.renderer.findByTestId("row-a")?.customProps?.role).toBe(
      "option",
    );
    expect(tabStop(list, multiIds)).toEqual(["row-a"]);
    expect(isSelected(list, "row-a")).toBe(false);

    list.unmount();
  });

  it("replaces the selection on a plain click in multiple mode", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    clickCentreOf(list, "row-c");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(["c"]);
    expect(isSelected(list, "row-c")).toBe(true);
    expect(isSelected(list, "row-a")).toBe(false);

    list.unmount();
  });

  it("toggles a row on a Cmd-click without losing the selection", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    clickCentreOf(list, "row-c");
    clickCentreOf(list, "row-d", "cmd");

    expect(onValueChange).toHaveBeenLastCalledWith(["c", "d"]);
    expect(isSelected(list, "row-c")).toBe(true);
    expect(isSelected(list, "row-d")).toBe(true);

    list.unmount();
  });

  it("selects the enabled range on a Shift-click", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    clickCentreOf(list, "row-a");
    clickCentreOf(list, "row-d", "shift");

    expect(onValueChange).toHaveBeenLastCalledWith(["a", "c", "d"]);
    expect(isSelected(list, "row-b")).toBe(false);

    list.unmount();
  });

  it("toggles the focused row with Space in multiple mode", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    pressKey(list, "space");
    list.renderer.simulateKeystrokes("down");
    pressKey(list, "space");

    expect(onValueChange).toHaveBeenLastCalledWith(["a", "c"]);

    list.unmount();
  });

  it("extends the selection with Shift+Arrow and moves real focus", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    pressKey(list, "space");
    list.renderer.simulateKeystrokes("shift-down");

    expect(focusedTestId(list)).toEqual(Option.some("row-c"));
    expect(onValueChange).toHaveBeenLastCalledWith(["a", "c"]);

    list.unmount();
  });

  it("selects every enabled row on Cmd+A and keeps focus put", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    list.renderer.focusElement(list.renderer.findByTestId("row-c")?.id ?? -1);
    list.renderer.simulateKeystrokes("cmd-a");

    expect(onValueChange).toHaveBeenLastCalledWith(["a", "c", "d"]);
    expect(isSelected(list, "row-a")).toBe(true);
    expect(isSelected(list, "row-b")).toBe(false);
    expect(isSelected(list, "row-c")).toBe(true);
    expect(isSelected(list, "row-d")).toBe(true);
    expect(focusedTestId(list)).toEqual(Option.some("row-c"));

    list.unmount();
  });

  it("ignores select-all in single mode", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single" onValueChange={onValueChange}>
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b">
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    list.renderer.simulateKeystrokes("ctrl-a");

    expect(onValueChange).not.toHaveBeenCalled();
    expect(focusedTestId(list)).toEqual(Option.some("row-a"));

    list.unmount();
  });

  it("never selects a disabled row by Cmd-click", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    clickCentreOf(list, "row-c");
    clickCentreOf(list, "row-b", "cmd");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(isSelected(list, "row-b")).toBe(false);
    expect(isSelected(list, "row-c")).toBe(true);

    list.unmount();
  });

  it("keeps a controlled multiple selection where the consumer put it", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(
      <List
        testId="list"
        selectionMode="multiple"
        value={["a"]}
        onValueChange={onValueChange}
      >
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
      </List>,
    );

    clickCentreOf(list, "row-c");

    expect(onValueChange).toHaveBeenCalledWith(["c"]);
    expect(isSelected(list, "row-a")).toBe(true);
    expect(isSelected(list, "row-c")).toBe(false);

    list.unmount();
  });

  it("feeds both the internal and the caller's row ref", () => {
    const ref = createRef<PublicInstance>();
    const list = renderComponent(
      <List testId="list" selectionMode="single">
        <ListItem ref={ref} testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b">
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    expect(ref.current?.id).toBe(list.renderer.findByTestId("row-a")?.id);

    // The internal ref still carries the roving tab stop.
    list.renderer.focusElement(ref.current?.id ?? -1);
    list.renderer.simulateKeystrokes("down");
    expect(focusedTestId(list)).toEqual(Option.some("row-b"));

    list.unmount();
  });

  it("jumps to the first row matching a typed prefix", () => {
    const list = renderComponent(searchable());

    clickCentreOf(list, "row-alpha");
    list.renderer.simulateKeystrokes("d");

    expect(focusedTestId(list)).toEqual(Option.some("row-delta"));
    expect(tabStop(list, searchableIds)).toEqual(["row-delta"]);

    list.unmount();
  });

  it("advances on a repeated letter and wraps", () => {
    const list = renderComponent(searchable());

    clickCentreOf(list, "row-alpha");
    list.renderer.simulateKeystrokes("d");
    expect(focusedTestId(list)).toEqual(Option.some("row-delta"));

    list.renderer.simulateKeystrokes("d");
    expect(focusedTestId(list)).toEqual(Option.some("row-draft"));

    list.renderer.simulateKeystrokes("d");
    expect(focusedTestId(list)).toEqual(Option.some("row-delta"));

    list.unmount();
  });

  it("skips a disabled row with a matching prefix", () => {
    const list = renderComponent(searchable());

    clickCentreOf(list, "row-alpha");
    list.renderer.simulateKeystrokes("b");

    expect(focusedTestId(list)).toEqual(Option.some("row-banana"));

    list.unmount();
  });

  it("matches an uppercase letter case-insensitively", () => {
    const list = renderComponent(searchable());

    clickCentreOf(list, "row-alpha");
    list.renderer.simulateKeystrokes("shift-b");

    expect(focusedTestId(list)).toEqual(Option.some("row-banana"));

    list.unmount();
  });

  it("starts a new search after a prefix matches nothing", () => {
    const list = renderComponent(searchable());

    clickCentreOf(list, "row-alpha");
    list.renderer.simulateKeystrokes("z");
    expect(focusedTestId(list)).toEqual(Option.some("row-alpha"));

    list.renderer.simulateKeystrokes("b");
    expect(focusedTestId(list)).toEqual(Option.some("row-banana"));

    list.unmount();
  });

  it("moves focus without changing a multiple selection", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(
      <List
        testId="list"
        selectionMode="multiple"
        onValueChange={onValueChange}
      >
        <ListItem testId="row-alpha" value="alpha" textValue="Alpha">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-delta" value="delta" textValue="Delta">
          <ListItemTitle>Delta</ListItemTitle>
        </ListItem>
      </List>,
    );

    clickCentreOf(list, "row-alpha");
    expect(onValueChange).toHaveBeenCalledTimes(1);

    list.renderer.simulateKeystrokes("d");

    expect(focusedTestId(list)).toEqual(Option.some("row-delta"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(isSelected(list, "row-alpha")).toBe(true);
    expect(isSelected(list, "row-delta")).toBe(false);

    list.unmount();
  });

  it("does not search a row without textValue", () => {
    const list = renderComponent(searchable());

    clickCentreOf(list, "row-alpha");
    list.renderer.simulateKeystrokes("e");

    expect(focusedTestId(list)).toEqual(Option.some("row-alpha"));

    list.unmount();
  });

  it("activates the focused row on Enter without a redundant selection", () => {
    const onValueChange = vi.fn();
    const onActivate = vi.fn();
    const list = renderComponent(
      <List
        testId="list"
        selectionMode="single"
        defaultValue="a"
        onValueChange={onValueChange}
        onActivate={onActivate}
      >
        <ListItem testId="row-a" value="a" textValue="Alpha">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c" textValue="Gamma">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
      </List>,
    );

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    list.renderer.simulateKeystrokes("enter");

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith("a");
    expect(onValueChange).not.toHaveBeenCalled();

    list.unmount();
  });

  it("selects with Space but never activates", () => {
    const onValueChange = vi.fn();
    const onActivate = vi.fn();
    const list = renderComponent(
      <List
        testId="list"
        selectionMode="single"
        defaultValue="a"
        onValueChange={onValueChange}
        onActivate={onActivate}
      >
        <ListItem testId="row-a" value="a" textValue="Alpha">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c" textValue="Gamma">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
      </List>,
    );

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    list.renderer.simulateKeystrokes("down");
    pressKey(list, "space");

    expect(onValueChange).toHaveBeenLastCalledWith("c");
    expect(onActivate).not.toHaveBeenCalled();

    list.unmount();
  });

  it("selects and activates the row a click lands on", () => {
    const onValueChange = vi.fn();
    const onActivate = vi.fn();
    const list = renderComponent(
      <List
        testId="list"
        selectionMode="single"
        defaultValue="a"
        onValueChange={onValueChange}
        onActivate={onActivate}
      >
        <ListItem testId="row-a" value="a" textValue="Alpha">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c" textValue="Gamma">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
      </List>,
    );

    clickCentreOf(list, "row-c");

    expect(onValueChange).toHaveBeenLastCalledWith("c");
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith("c");

    list.unmount();
  });

  it("activates a row on click when there is no selection mode", () => {
    const onActivate = vi.fn();
    const list = renderComponent(
      <List testId="list" onActivate={onActivate}>
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
      </List>,
    );

    clickCentreOf(list, "row-c");

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith("c");

    list.unmount();
  });

  it("never activates a disabled row by click or Enter", () => {
    const onActivate = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single" onActivate={onActivate}>
        <ListItem testId="row-a" value="a" textValue="Alpha">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" textValue="Beta" disabled>
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    clickCentreOf(list, "row-b");
    list.renderer.focusElement(list.renderer.findByTestId("row-b")?.id ?? -1);
    list.renderer.simulateKeystrokes("enter");

    expect(onActivate).not.toHaveBeenCalled();

    list.unmount();
  });

  it("clips a long title and description to the row's one line", () => {
    const text =
      "A very long label that would otherwise wrap far beyond the row it sits in";
    const list = renderComponent(
      <div style={{ width: 260, padding: 20 }}>
        <List testId="list">
          <ListItem testId="row" value="long">
            <ListItemTitle testId="title">{text}</ListItemTitle>
            <ListItemDescription testId="description">
              {text}
            </ListItemDescription>
          </ListItem>
        </List>
        <text testId="control" style={{ width: 200 }}>
          {text}
        </text>
      </div>,
    );

    const row = requireBounds(list, "row");
    const control = requireBounds(list, "control");
    const title = requireBounds(list, "title");
    const description = requireBounds(list, "description");
    const titleStyle = list.renderer.findByTestId("title")?.style;
    const descriptionStyle = list.renderer.findByTestId("description")?.style;

    // The control is the same text with no one-line rule: it wraps, so the
    // measurement can see a wrap, and the row's parts must not be that tall.
    expect(control.height).toBeGreaterThan(title.height);
    expect(title.height).toBe(titleStyle?.lineHeight);
    expect(description.height).toBe(descriptionStyle?.lineHeight);

    // Neither the title nor the description stretches the row.
    expect(title.width).toBeLessThanOrEqual(row.width);
    expect(description.width).toBeLessThanOrEqual(row.width);

    expect(titleStyle).toMatchObject({
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });
    expect(descriptionStyle).toMatchObject({
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });

    list.unmount();
  });

  it("activates the row the arrow keys reached", () => {
    const onValueChange = vi.fn();
    const onActivate = vi.fn();
    const list = renderComponent(
      <List
        testId="list"
        selectionMode="single"
        defaultValue="a"
        onValueChange={onValueChange}
        onActivate={onActivate}
      >
        <ListItem testId="row-a" value="a" textValue="Alpha">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" textValue="Beta" disabled>
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c" textValue="Gamma">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
      </List>,
    );

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    list.renderer.simulateKeystrokes("down");
    list.renderer.simulateKeystrokes("enter");

    expect(onValueChange).toHaveBeenLastCalledWith("c");
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith("c");

    list.unmount();
  });
});

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
 * that includes a disabled row, and Shift+Arrow moving focus without extending.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
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
    list.renderer.simulateKeystrokes("space");
    list.renderer.simulateKeystrokes("down");
    list.renderer.simulateKeystrokes("space");

    expect(onValueChange).toHaveBeenLastCalledWith(["a", "c"]);

    list.unmount();
  });

  it("extends the selection with Shift+Arrow and moves real focus", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    list.renderer.simulateKeystrokes("space");
    list.renderer.simulateKeystrokes("shift-down");

    expect(focusedTestId(list)).toEqual(Option.some("row-c"));
    expect(onValueChange).toHaveBeenLastCalledWith(["a", "c"]);

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
});

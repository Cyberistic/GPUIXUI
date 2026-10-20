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
 * list click that ran nothing; a disabled row that activated anyway; an arrow
 * move that activated the old row instead of the reached one; a held Enter that
 * activated once per repeat; and a plain activatable list whose rows could not
 * take focus, leaving its documented Enter path unreachable.
 *
 * A caller `ref` on a row was also discarded in favour of the internal one, and
 * so was a caller `onClick`.
 *
 * Type-ahead: typing a prefix moved nothing, a repeated letter did not advance,
 * a disabled row won the match, an uppercase letter never matched, a missed
 * prefix poisoned the next search, and a typed jump must not change the
 * selection in multiple mode. A disabled row also kept the pointer cursor and
 * the hover/press fills, so it read as pressable (plan 394).
 *
 * Paint cost (plan 339): a roving-focus move used to re-render every row. The
 * list repaints only the row that lost the ring and the row that gained it;
 * the style-function count pins that contract.
 *
 * Native focus origin (plan 578): a native focus change never runs React's
 * `onFocus`, so a list entered with `Tab` had no active row — `Space`/`Enter`
 * reported nothing, the first arrow jumped to the first row, a first
 * `Shift+Arrow` started its range there and type-ahead started from the first
 * match. The keyboard origin is now the renderer's focused id.
 *
 * Registry position (plan 620): a `disabled` toggle or a `textValue` edit
 * unregistered the row and re-appended it, so the next arrow key skipped its
 * authored neighbour and type-ahead searched in a different order.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import type { PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { createRef, useCallback, useLayoutEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
} from "../internal/interaction.js";
import { List, ListItem, ListItemDescription, ListItemTitle } from "../list.js";
import { Button } from "../internal/button.js";
import { FOCUS_SAMPLE_MS } from "../internal/native-focus.js";
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

/** Three rows whose middle one is disabled, with a control to toggle it. */
const ToggleMiddleRow = () => {
  const [disabled, setDisabled] = useState(true);
  return (
    <div testId="root">
      <div
        role="button"
        tabIndex={0}
        testId="toggle-middle"
        onClick={() => setDisabled((value) => !value)}
      >
        toggle
      </div>
      <List testId="list" selectionMode="single">
        <ListItem testId="row-a" value="a" textValue="Alpha">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" textValue="Beta" disabled={disabled}>
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c" textValue="Gamma">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
      </List>
    </div>
  );
};

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

/** Rows built from data, so a test can rerender a different set. */
const dataRows = (
  values: ReadonlyArray<string>,
  disabled: ReadonlyArray<string> = [],
) => (
  <List testId="list" selectionMode="single">
    {Arr.map(values, (value) => (
      <ListItem
        key={value}
        testId={`row-${value}`}
        value={value}
        disabled={Arr.contains(value)(disabled)}
      >
        <ListItemTitle>{value}</ListItemTitle>
      </ListItem>
    ))}
  </List>
);

/** Rows built from data, each with a focusable control in its `trailing` slot. */
const trailingRows = (
  values: ReadonlyArray<string>,
  disabled: ReadonlyArray<string> = [],
) => (
  <List testId="list" selectionMode="single">
    {Arr.map(values, (value) => (
      <ListItem
        key={value}
        testId={`row-${value}`}
        value={value}
        disabled={Arr.contains(value)(disabled)}
        trailing={
          <Button size="sm" testId={`trail-${value}`}>
            Open
          </Button>
        }
      >
        <ListItemTitle>{value.toUpperCase()}</ListItemTitle>
      </ListItem>
    ))}
  </List>
);

/**
 * Wait for the list's focus sample (50 ms) to observe a native focus move. The
 * binding delivers no React `onFocus`, so the holder is read on a timer
 * (plans 613/659/708).
 */
const sampleFocus = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, FOCUS_SAMPLE_MS + 30));

/** A control rendered before the list that claims focus in the same update. */
const Claim = ({ claim }: { readonly claim: boolean }) => {
  const renderer = useGpuix().renderer;
  const [instance, setInstance] = useState<Option.Option<PublicInstance>>(
    Option.none(),
  );
  const attach = useCallback(
    (next: PublicInstance | null) => setInstance(Option.fromNullishOr(next)),
    [],
  );
  useLayoutEffect(() => {
    if (claim) {
      Option.match(instance, {
        onNone: () => undefined,
        onSome: (element) => renderer?.focusElement?.(element.id),
      });
    }
  }, [claim, instance, renderer]);
  return (
    <div testId="claim" tabIndex={0} ref={attach}>
      <text>claim</text>
    </div>
  );
};

const claiming = (values: ReadonlyArray<string>, claim: boolean) => (
  // The runtime keeps only one child at the root (measured, plan 510), so
  // the claim control and the list share a container.
  <div style={{ display: "flex", flexDirection: "column" }}>
    <Claim claim={claim} />
    {dataRows(values)}
  </div>
);

/** The same container, with a slot control in every row. */
const claimingTrailing = (values: ReadonlyArray<string>, claim: boolean) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <Claim claim={claim} />
    {trailingRows(values)}
  </div>
);

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

  it("shows no pointer affordance on a disabled row", () => {
    // A disabled row is skipped by clicks but used to keep the pointer cursor
    // and the hover/press fills, so it read as pressable (plan 394).
    const list = renderComponent(catalog);

    const disabled = list.renderer.findByTestId("row-b")?.style;
    const enabled = list.renderer.findByTestId("row-a")?.style;

    expect(disabled?.cursor).toBe("not-allowed");
    expect(disabled?.hover).toBeUndefined();
    expect(disabled?.active).toBeUndefined();
    expect(enabled?.cursor).toBe("pointer");
    expect(enabled?.hover).toMatchObject({
      backgroundColor: darkTheme.colors.accent,
    });

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

  it("keeps a re-enabled row in the authored position", () => {
    // Guarded bug: a `disabled` toggle ran the registration cleanup and
    // re-appended the row, so the registry order became a, c, b and the next
    // arrow key skipped the authored neighbour.
    const list = renderComponent(<ToggleMiddleRow />);
    clickCentreOf(list, "toggle-middle");

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    list.renderer.simulateKeystrokes("down");

    expect(focusedTestId(list)).toEqual(Option.some("row-b"));

    list.unmount();
  });

  it("moves from the natively focused row, not the first one", () => {
    // `focusElement` never runs React's `onFocus`, so `active` is still empty
    // when the key arrives; the renderer names the row (plan 578).
    const list = renderComponent(
      <List testId="list" selectionMode="single">
        <ListItem testId="row-a" value="a" textValue="Alpha">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" textValue="Beta">
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c" textValue="Gamma">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
        <ListItem testId="row-d" value="d" textValue="Delta">
          <ListItemTitle>Delta</ListItemTitle>
        </ListItem>
      </List>,
    );

    list.renderer.focusElement(list.renderer.findByTestId("row-c")?.id ?? -1);
    list.renderer.simulateKeystrokes("down");

    expect(focusedTestId(list)).toEqual(Option.some("row-d"));

    list.renderer.simulateKeystrokes("up");

    expect(focusedTestId(list)).toEqual(Option.some("row-c"));

    list.unmount();
  });

  it("repaints only the rows whose state changed when focus moves", () => {
    // Plan 339: before the row subscriptions, one arrow move re-rendered every
    // row — a 1,000-row list spent ~1–2 s per key press. A row re-renders when
    // its `style` function is called, so the count is the paint contract.
    const paints = new Map<string, number>();
    const values = ["a", "b", "c", "d", "e", "f"];
    const counted = (
      <List testId="list" selectionMode="single">
        {Arr.map(values, (value) => (
          <ListItem
            key={value}
            testId={`row-${value}`}
            value={value}
            style={() => {
              paints.set(value, (paints.get(value) ?? 0) + 1);
              return {};
            }}
          >
            <ListItemTitle>{value}</ListItemTitle>
          </ListItem>
        ))}
      </List>
    );
    const list = renderComponent(counted);

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    paints.clear();
    list.renderer.simulateKeystrokes("down");

    expect(focusedTestId(list)).toEqual(Option.some("row-b"));
    expect(Arr.sort([...paints.keys()], Order.String)).toEqual(["a", "b"]);

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

  it("lets a control in a row's trailing slot keep its own Enter", () => {
    // A key from a control inside a row bubbles to the list root; the list must
    // not also activate the row it sits in (plan 577).
    const onActivate = vi.fn();
    const onDelete = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single" onActivate={onActivate}>
        <ListItem
          testId="row-a"
          value="a"
          textValue="Alpha"
          trailing={
            <Button size="sm" testId="row-action" onClick={onDelete}>
              Delete
            </Button>
          }
        >
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" textValue="Beta">
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    // The defect needs an active row, so reach one before focusing the control.
    clickCentreOf(list, "row-a");
    onActivate.mockClear();

    const action = list.renderer.findByTestId("row-action");
    if (action === undefined) throw new Error("behaviour: no row control");
    list.renderer.nativeSimulateKeystrokes(action.id, "enter");

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();

    list.unmount();
  });

  it("does not steal focus from a field inside a row", () => {
    // Typing in a trailing field bubbled to type-ahead, which moved native
    // focus out of the field on the first character (plan 577).
    const onChange = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single">
        <ListItem
          testId="row-alpha"
          value="alpha"
          textValue="Alpha"
          trailing={
            <input
              testId="row-field"
              onChange={(event) => onChange(event.value ?? "")}
            />
          }
        >
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-beta" value="beta" textValue="Beta">
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    const field = list.renderer.findByTestId("row-field");
    if (field === undefined) throw new Error("behaviour: no row field");

    list.renderer.nativeSimulateKeystrokes(field.id, "b");

    expect(onChange).toHaveBeenCalledWith("b");
    expect(list.renderer.getFocusedElementId?.()).toBe(field.id);

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

  it("keeps the row tint while the pointer is over a trailing control", () => {
    const list = renderComponent(
      <List testId="list" selectionMode="single">
        <ListItem
          testId="row-a"
          value="a"
          trailing={<Button testId="trailing-action">Open</Button>}
        >
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );

    // Hover is per element: the trailing Button owns the pointer, so the row's
    // declared `hover` refinement no longer paints. The row must script it.
    hoverCentreOf(list, "trailing-action");

    expect(list.renderer.findByTestId("row-a")?.style.backgroundColor).toBe(
      darkTheme.colors.accent,
    );

    list.unmount();
  });

  it("clears the row tint when the pointer leaves the row", () => {
    const list = renderComponent(
      <List testId="list" selectionMode="single">
        <ListItem
          testId="row-a"
          value="a"
          trailing={<Button testId="trailing-action">Open</Button>}
        >
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );

    hoverCentreOf(list, "trailing-action");
    expect(list.renderer.findByTestId("row-a")?.style.backgroundColor).toBe(
      darkTheme.colors.accent,
    );
    const row = requireBounds(list, "row-a");
    list.renderer.nativeSimulateMouseMove(row.x + row.width + 100, row.y + 400);

    expect(list.renderer.findByTestId("row-a")?.style.backgroundColor).not.toBe(
      darkTheme.colors.accent,
    );

    list.unmount();
  });

  it("composes the caller's pointer handlers on a member control", () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single">
        <ListItem
          testId="row-a"
          value="a"
          trailing={
            <Button
              testId="trailing-action"
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            >
              Open
            </Button>
          }
        >
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );

    hoverCentreOf(list, "trailing-action");
    expect(list.renderer.findByTestId("row-a")?.style.backgroundColor).toBe(
      darkTheme.colors.accent,
    );
    const row = requireBounds(list, "row-a");
    list.renderer.nativeSimulateMouseMove(row.x + row.width + 100, row.y + 400);

    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);

    list.unmount();
  });

  it("clears the tint when a hovered trailing control is removed", () => {
    // The member's unmount cleanup must leave the group, or a removed control
    // keeps the row lit with no pointer over it.
    const list = renderComponent(
      <List testId="list" selectionMode="single">
        <ListItem
          testId="row-a"
          value="a"
          trailing={<Button testId="trailing-action">Open</Button>}
        >
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );

    hoverCentreOf(list, "trailing-action");
    expect(list.renderer.findByTestId("row-a")?.style.backgroundColor).toBe(
      darkTheme.colors.accent,
    );

    list.rerender(
      <List testId="list" selectionMode="single">
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );

    // The row may re-take the pointer on the rerender (it is still under it);
    // leaving the row then proves the removed member left the group, because a
    // stale count would keep the tint after the row's own leave.
    const row = requireBounds(list, "row-a");
    list.renderer.nativeSimulateMouseMove(row.x + row.width + 100, row.y + 400);

    expect(list.renderer.findByTestId("row-a")?.style.backgroundColor).not.toBe(
      darkTheme.colors.accent,
    );

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

  it("selects the natively focused row with Space", () => {
    // The list is entered by native focus only; `active` is empty, so the old
    // code had nothing to select (plan 578).
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    list.renderer.focusElement(list.renderer.findByTestId("row-c")?.id ?? -1);
    list.renderer.simulateKeystrokes("space");

    expect(onValueChange).toHaveBeenLastCalledWith(["c"]);

    list.unmount();
  });

  it("extends the range from the natively focused row", () => {
    // With no anchor yet, the range starts at the row the user is on — not at
    // the first enabled row (plan 578).
    const onValueChange = vi.fn();
    const list = renderComponent(multiCatalog(onValueChange));

    list.renderer.focusElement(list.renderer.findByTestId("row-c")?.id ?? -1);
    list.renderer.simulateKeystrokes("shift-down");

    expect(onValueChange).toHaveBeenLastCalledWith(["c", "d"]);

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

  it("types from the natively focused row", () => {
    // Starting on the first `d` row, the old origin stayed on it instead of
    // advancing to the next match (plan 578).
    const list = renderComponent(searchable());

    list.renderer.focusElement(
      list.renderer.findByTestId("row-delta")?.id ?? -1,
    );
    list.renderer.simulateKeystrokes("d");

    expect(focusedTestId(list)).toEqual(Option.some("row-draft"));

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

  it("activates once while Enter repeats", () => {
    const onActivate = vi.fn();
    const list = renderComponent(
      <List testId="list" selectionMode="single" onActivate={onActivate}>
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );
    const row = list.renderer.findByTestId("row-a");
    expect(row).toBeDefined();
    if (row === undefined) return;

    list.renderer.nativeSimulateKeyDown(row.id, "enter");
    list.renderer.nativeSimulateKeyDown(row.id, "enter", true);

    expect(onActivate).toHaveBeenCalledTimes(1);

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
    list.renderer.simulateKeystrokes("space");

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

  it("gives a plain activatable list one roving tab stop", () => {
    const list = renderComponent(
      <List testId="list" onActivate={() => undefined}>
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" disabled>
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
        <ListItem testId="row-c" value="c">
          <ListItemTitle>Gamma</ListItemTitle>
        </ListItem>
      </List>,
    );

    expect(list.renderer.findByTestId("list")?.customProps?.role).toBe("list");
    expect(list.renderer.findByTestId("row-a")?.customProps?.role).toBe(
      "listitem",
    );
    expect(tabStop(list)).toEqual(["row-a"]);
    expect(list.renderer.findByTestId("row-a")?.style.cursor).toBe("pointer");

    list.unmount();
  });

  it("activates a plain list's reached row from the keyboard", () => {
    const onActivate = vi.fn();
    const list = renderComponent(
      <List testId="list" onActivate={onActivate}>
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

    expect(focusedTestId(list)).toEqual(Option.some("row-c"));

    list.renderer.simulateKeystrokes("enter");

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith("c");

    list.unmount();
  });

  it("never activates a plain row on Space", () => {
    const onActivate = vi.fn();
    const list = renderComponent(
      <List testId="list" onActivate={onActivate}>
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );

    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
    list.renderer.simulateKeystrokes("space");

    expect(onActivate).not.toHaveBeenCalled();

    list.unmount();
  });

  it("reflects autoFocus in the roving focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the roving state and the row's ring must still follow it (plan 388).
    const list = renderComponent(
      <List testId="list" selectionMode="single" defaultValue="a">
        <ListItem testId="row-a" value="a">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" autoFocus>
          <ListItemTitle>Beta</ListItemTitle>
        </ListItem>
      </List>,
    );

    expect(focusedTestId(list)).toEqual(Option.some("row-b"));
    expect(list.renderer.findByTestId("row-b")?.style.boxShadow).toBeDefined();
    expect(
      list.renderer.findByTestId("row-a")?.style.boxShadow,
    ).toBeUndefined();

    list.unmount();
  });

  /**
   * Dynamic rows (plans 510/647). The bug these guard, measured: removing the
   * active row left every remaining row `tabIndex -1` with focus `null`, so the
   * list lost its only tab stop; disabling it left the tab stop — and the focus
   * ring — on the row that could no longer be activated. `focusElement` is the
   * runtime's own move, exactly like a `Tab` entry, and never runs React's
   * `onFocus` on this binding — so the handover must read the renderer's focused
   * host, not only the id a focus event remembered. Focus relocation must also
   * never steal focus a consumer claimed in the same update.
   */
  it("keeps a tab stop when the active row is removed", () => {
    const list = renderComponent(dataRows(["a", "b", "c"]));

    list.renderer.focusElement(list.renderer.findByTestId("row-b")?.id ?? -1);
    list.rerender(dataRows(["a", "c"]));

    expect(tabStop(list, ["row-a", "row-c"])).toEqual(["row-a"]);
    expect(list.renderer.findByTestId("row-c")?.customProps?.tabIndex).toBe(-1);

    list.unmount();
  });

  it("hands focus to the tab stop when the focused row is removed", async () => {
    const list = renderComponent(dataRows(["a", "b", "c"]));

    list.renderer.focusElement(list.renderer.findByTestId("row-b")?.id ?? -1);
    await sampleFocus();
    list.rerender(dataRows(["a", "c"]));

    expect(focusedTestId(list)).toEqual(Option.some("row-a"));
    expect(list.renderer.findByTestId("row-a")?.style.boxShadow).toBeDefined();
    expect(
      list.renderer.findByTestId("row-c")?.style.boxShadow,
    ).toBeUndefined();

    list.unmount();
  });

  it("falls back to the surviving selection when the focused row is removed", async () => {
    const list = renderComponent(dataRows(["a", "b", "c"]));

    clickCentreOf(list, "row-a");
    list.renderer.focusElement(list.renderer.findByTestId("row-b")?.id ?? -1);
    await sampleFocus();
    list.rerender(dataRows(["a", "c"]));

    expect(tabStop(list, ["row-a", "row-c"])).toEqual(["row-a"]);
    expect(focusedTestId(list)).toEqual(Option.some("row-a"));

    list.unmount();
  });

  it("takes the tab stop and focus off a row that becomes disabled", () => {
    const list = renderComponent(dataRows(["a", "b", "c"]));

    list.renderer.focusElement(list.renderer.findByTestId("row-b")?.id ?? -1);
    list.rerender(dataRows(["a", "b", "c"], ["b"]));

    expect(tabStop(list, ["row-a", "row-b", "row-c"])).toEqual(["row-a"]);
    expect(list.renderer.findByTestId("row-b")?.customProps?.tabIndex).toBe(-1);
    expect(
      list.renderer.findByTestId("row-b")?.style.boxShadow,
    ).toBeUndefined();
    expect(focusedTestId(list)).toEqual(Option.some("row-a"));

    list.unmount();
  });

  it("never steals focus a consumer claimed in the same update", () => {
    const list = renderComponent(claiming(["a", "b", "c"], false));

    list.renderer.focusElement(list.renderer.findByTestId("row-b")?.id ?? -1);
    list.rerender(claiming(["a", "c"], true));

    expect(focusedTestId(list)).toEqual(Option.some("claim"));
    expect(tabStop(list, ["row-a", "row-c"])).toEqual(["row-a"]);

    list.unmount();
  });

  it("does not grab focus when rows return after being emptied", () => {
    const list = renderComponent(dataRows(["a", "b"]));

    list.renderer.focusElement(list.renderer.findByTestId("row-b")?.id ?? -1);
    list.rerender(dataRows([]));

    expect(focusedTestId(list)).toEqual(Option.none());

    // The vanished row is forgotten: a refill must not resume its focus.
    list.rerender(dataRows(["a", "c"]));

    expect(tabStop(list, ["row-a", "row-c"])).toEqual(["row-a"]);
    expect(focusedTestId(list)).toEqual(Option.none());

    list.unmount();
  });

  /**
   * Focus inside a row's slot (plan 708). The bug these guard, measured: a row
   * removed while a `Button` in its `trailing` slot held native focus dropped
   * focus entirely (`None`), although the list could hand it to the row that now
   * owns the tab stop. A native focus move runs no React `onFocus` and a removed
   * host cannot be read afterwards, so the holder is sampled while it exists.
   */
  it("hands focus to the tab stop when a row with a focused slot control is removed", async () => {
    const list = renderComponent(trailingRows(["a", "b", "c"]));

    list.renderer.focusElement(list.renderer.findByTestId("trail-b")?.id ?? -1);
    await sampleFocus();
    list.rerender(trailingRows(["a", "c"]));

    expect(focusedTestId(list)).toEqual(Option.some("row-a"));

    list.unmount();
  });

  it("keeps a slot control's focus when its row only turns disabled", async () => {
    // The row hands the tab stop over, but the control inside it is still
    // enabled and owns its keys (plan 577), so focus must stay where it is.
    const list = renderComponent(trailingRows(["a", "b", "c"]));

    list.renderer.focusElement(list.renderer.findByTestId("trail-b")?.id ?? -1);
    await sampleFocus();
    list.rerender(trailingRows(["a", "b", "c"], ["b"]));

    expect(focusedTestId(list)).toEqual(Option.some("trail-b"));
    expect(tabStop(list, ["row-a", "row-b", "row-c"])).toEqual(["row-a"]);

    list.unmount();
  });

  it("keeps a slot control's focus when another row is removed", async () => {
    const list = renderComponent(trailingRows(["a", "b", "c"]));

    list.renderer.focusElement(list.renderer.findByTestId("trail-a")?.id ?? -1);
    await sampleFocus();
    list.rerender(trailingRows(["a", "c"]));

    expect(focusedTestId(list)).toEqual(Option.some("trail-a"));

    list.unmount();
  });

  it("leaves a consumer's focus alone when the removed row held none", async () => {
    const list = renderComponent(claimingTrailing(["a", "b", "c"], false));

    list.renderer.focusElement(list.renderer.findByTestId("trail-b")?.id ?? -1);
    await sampleFocus();
    list.rerender(claimingTrailing(["a", "c"], true));

    expect(focusedTestId(list)).toEqual(Option.some("claim"));
    expect(tabStop(list, ["row-a", "row-c"])).toEqual(["row-a"]);

    list.unmount();
  });
});

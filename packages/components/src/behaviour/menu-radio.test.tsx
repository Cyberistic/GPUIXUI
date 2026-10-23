/**
 * Menu radio rows, in the real GPUix renderer.
 *
 * The bug these guard: the menu family had an on/off row and nothing for an
 * exclusive choice, so a "sort by" or an "appearance" menu had to be built from
 * checkbox rows — several rows could read as chosen at once, and each announced
 * itself as a checkbox.
 *
 * A radio row is its group's choice, so the group is what decides which row is
 * marked: `value` is the only truth, a press reports the row's value and closes
 * the menu (a checkbox row stays open), a press on the chosen row reports
 * nothing, and a disabled row reports nothing and keeps the menu open. Both menu
 * families share the row, so both are mounted here.
 *
 * 0.11.0 has no `aria-checked`, so the row's state is `aria-selected` plus a
 * check mark — the substitution the checkbox row already uses.
 */

import * as Option from "effect/Option";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuTrigger,
} from "../context-menu.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../dropdown-menu.js";
import { nodesWithRole } from "../internal/a11y.js";
import {
  clickCentreOf,
  focusedTestId,
  waitFor,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** The chosen value, as the renderer reads it off a row. */
const selectedOf = (root: ComponentTestRoot, testId: string): unknown =>
  root.renderer.findByTestId(testId)?.customProps?.["aria-selected"];

/** The accessible names of the check marks painted in the menu. */
const checkMarks = (root: ComponentTestRoot): ReadonlyArray<string> =>
  nodesWithRole(root.renderer, "image")
    .map((node) => node.name)
    .filter((name) => name === "Checked");

/** An appearance menu whose choice lives in the caller, as a radio group must. */
const AppearanceMenu = ({
  onValueChange,
  triggerDisabled,
  disabledValue,
}: {
  readonly onValueChange: (value: string) => void;
  readonly triggerDisabled?: boolean;
  readonly disabledValue?: string;
}) => {
  const [value, setValue] = useState("system");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger testId="trigger" disabled={triggerDisabled}>
          Appearance
        </DropdownMenuTrigger>
        <DropdownMenuContent testId="menu" label="Appearance">
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => {
              setValue(next);
              onValueChange(next);
            }}
          >
            <DropdownMenuRadioItem testId="system" value="system">
              System
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              testId="light"
              value="light"
              disabled={disabledValue === "light"}
            >
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem testId="dark" value="dark">
              Dark
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/** The same choice offered from a context menu, to prove the row is shared. */
const SortRow = ({
  onValueChange,
}: {
  readonly onValueChange: (value: string) => void;
}) => {
  const [value, setValue] = useState("name");

  return (
    <ContextMenu>
      <ContextMenuTrigger
        testId="row"
        style={{ width: 320, height: 120, padding: 12 }}
      >
        <text>Rows</text>
      </ContextMenuTrigger>
      <ContextMenuContent testId="menu" label="Sort">
        <ContextMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            setValue(next);
            onValueChange(next);
          }}
        >
          <ContextMenuRadioItem testId="by-name" value="name">
            Name
          </ContextMenuRadioItem>
          <ContextMenuRadioItem testId="by-date" value="date">
            Date
          </ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
};

/** Focus the trigger, as Tab would. */
const focusTrigger = (root: ComponentTestRoot): void => {
  root.renderer.focusElement(root.renderer.findByTestId("trigger")?.id ?? -1);
};

describe("menu radio rows", () => {
  it("marks exactly the row the group chose", async () => {
    const menu = renderComponent(<AppearanceMenu onValueChange={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    expect(selectedOf(menu, "system")).toBe(true);
    expect(selectedOf(menu, "light")).toBe(false);
    expect(selectedOf(menu, "dark")).toBe(false);
    // One mark on screen, and it is the chosen row's.
    expect(checkMarks(menu)).toEqual(["Checked"]);

    clickCentreOf(menu, "dark");

    // The menu closes on a choice (a checkbox row would stay open) and the
    // caller's value is what the next open paints.
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );
    clickCentreOf(menu, "trigger");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeDefined(),
    );

    expect(selectedOf(menu, "system")).toBe(false);
    expect(selectedOf(menu, "dark")).toBe(true);
    expect(checkMarks(menu)).toEqual(["Checked"]);

    menu.unmount();
  });

  it("presents its rows as radio items, not checkboxes", () => {
    const menu = renderComponent(<AppearanceMenu onValueChange={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    expect(
      nodesWithRole(menu.renderer, "menuitemradio").map((node) => node.name),
    ).toEqual(["System", "Light", "Dark"]);
    expect(nodesWithRole(menu.renderer, "menuitemcheckbox")).toEqual([]);

    menu.unmount();
  });

  it("reports the chosen value once and returns focus to the trigger", async () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(
      <AppearanceMenu onValueChange={onValueChange} />,
    );
    clickCentreOf(menu, "trigger");

    clickCentreOf(menu, "light");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("light");
    await waitFor(() =>
      expect(focusedTestId(menu)).toEqual(Option.some("trigger")),
    );

    menu.unmount();
  });

  it("reports nothing when the chosen row is chosen again", async () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(
      <AppearanceMenu onValueChange={onValueChange} />,
    );
    clickCentreOf(menu, "trigger");

    clickCentreOf(menu, "system");

    expect(onValueChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

    menu.unmount();
  });

  it("refuses a disabled row and keeps the menu open", () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(
      <AppearanceMenu onValueChange={onValueChange} disabledValue="light" />,
    );
    clickCentreOf(menu, "trigger");

    clickCentreOf(menu, "light");

    expect(onValueChange).not.toHaveBeenCalled();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    expect(selectedOf(menu, "system")).toBe(true);

    menu.unmount();
  });

  it("activates the row the keyboard is on", () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(
      <AppearanceMenu onValueChange={onValueChange} />,
    );
    focusTrigger(menu);

    // Open on the first row, step to the second, then choose it.
    menu.renderer.simulateKeystrokes("down");
    menu.renderer.simulateKeystrokes("down");
    menu.renderer.simulateKeystrokes("enter");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("light");

    menu.unmount();
  });

  it("carries the exclusive rule into the context menu", () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(<SortRow onValueChange={onValueChange} />);
    menu.renderer.nativeSimulateClick(60, 60, 2);

    expect(selectedOf(menu, "by-name")).toBe(true);
    expect(selectedOf(menu, "by-date")).toBe(false);

    clickCentreOf(menu, "by-date");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("date");

    menu.unmount();
  });
});

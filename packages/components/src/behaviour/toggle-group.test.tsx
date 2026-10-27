/**
 * ToggleGroup behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a single group kept its old value pressed after a
 * re-press (or cleared nothing), the group published more than one tab stop, an
 * arrow key pressed an option while it moved focus, and the selected option
 * painted a literal instead of the active platform's accent.
 */

import { platformTheme } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { lightTheme, type Theme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { ToggleGroup, ToggleGroupItem } from "../toggle-group.js";

/** One option's value and the tab stop it carries. */
const stopOf = (
  root: ComponentTestRoot,
  id: string,
): { readonly value: unknown; readonly tabIndex: unknown } => {
  const element = root.renderer.findByTestId(id);
  return {
    value: element?.customProps?.["aria-valuetext"],
    tabIndex: element?.customProps?.["tabIndex"],
  };
};

/** A single group of three alignments. */
const Alignments = ({
  onValueChange,
}: {
  readonly onValueChange?: (next: string) => void;
}) => (
  <ToggleGroup
    type="single"
    label="Alignment"
    defaultValue="left"
    itemTestId={(value) => `item-${value}`}
    onValueChange={onValueChange}
  >
    <ToggleGroupItem value="left" label="Align left">
      Left
    </ToggleGroupItem>
    <ToggleGroupItem value="centre" label="Align centre">
      Centre
    </ToggleGroupItem>
    <ToggleGroupItem value="right" label="Align right">
      Right
    </ToggleGroupItem>
  </ToggleGroup>
);

describe("ToggleGroup", () => {
  it("keeps one tab stop for the single group and deselects on a re-press", () => {
    const onValueChange = vi.fn();
    const group = renderComponent(<Alignments onValueChange={onValueChange} />);

    expect(
      ["left", "centre", "right"].map((id) => stopOf(group, `item-${id}`)),
    ).toEqual([
      { value: "pressed", tabIndex: 0 },
      { value: "not pressed", tabIndex: -1 },
      { value: "not pressed", tabIndex: -1 },
    ]);

    clickCentreOf(group, "item-left");

    expect(onValueChange).toHaveBeenLastCalledWith("");
    expect(
      ["left", "centre", "right"].map(
        (id) => stopOf(group, `item-${id}`).value,
      ),
    ).toEqual(["not pressed", "not pressed", "not pressed"]);

    group.unmount();
  });

  it("moves focus with the arrow keys without pressing an option", () => {
    const group = renderComponent(<Alignments />);
    group.renderer.focusNext();
    group.renderer.flush();
    group.renderer.simulateKeystrokes("right");
    group.renderer.flush();

    expect(
      Option.getOrElse(focusedTestId(group), () =>
        expect.fail("no option holds the focus"),
      ),
    ).toBe("item-centre");
    expect(stopOf(group, "item-centre").tabIndex).toBe(0);
    expect(stopOf(group, "item-left").tabIndex).toBe(-1);
    // The mode is the one it was before the key: focus is not activation.
    expect(stopOf(group, "item-left").value).toBe("pressed");
    expect(stopOf(group, "item-centre").value).toBe("not pressed");

    group.unmount();
  });

  it("keeps every pressed value in multiple mode, and clears one on a re-press", () => {
    const onValueChange = vi.fn();
    const group = renderComponent(
      <ToggleGroup
        type="multiple"
        label="Formatting"
        defaultValue={["bold", "italic"]}
        itemTestId={(value) => `item-${value}`}
        onValueChange={onValueChange}
      >
        <ToggleGroupItem value="bold" label="Bold">
          Bold
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" label="Italic">
          Italic
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(
      ["bold", "italic"].map((id) => stopOf(group, `item-${id}`).value),
    ).toEqual(["pressed", "pressed"]);

    clickCentreOf(group, "item-bold");

    expect(onValueChange).toHaveBeenLastCalledWith(["italic"]);
    expect(
      ["bold", "italic"].map((id) => stopOf(group, `item-${id}`).value),
    ).toEqual(["not pressed", "pressed"]);

    group.unmount();
  });

  it("keeps the selected option on the active platform's accent", () => {
    const paint = (theme: Theme) => {
      const root = renderComponent(<Alignments />, theme);
      const style = root.renderer.findByTestId("item-left")?.style;
      root.unmount();
      return style;
    };
    const macOS = platformTheme(lightTheme, "darwin");
    const windows = platformTheme(lightTheme, "win32");

    expect(paint(macOS)).toMatchObject({
      backgroundColor: macOS.colors.accent,
      color: macOS.colors.accentForeground,
    });
    expect(paint(windows)).toMatchObject({
      backgroundColor: windows.colors.accent,
      color: windows.colors.accentForeground,
    });
    // The premise: the two styles do not paint the same selected face.
    expect(macOS.colors.accent).not.toBe(windows.colors.accent);
  });
});

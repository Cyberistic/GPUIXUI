/**
 * Combobox behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a popup that opens without focusing its search field; a
 * filter that hides matches; a selection that reports the label instead of the
 * value; a single select that does not replace the previous value; a multi select
 * that loses order or duplicates; a disabled option that can still be chosen; an
 * empty state that never appears; a ranking that puts `Vacation` before
 * `Calendar`; and Escape that does not return focus to the trigger.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { Combobox, type ComboboxOption } from "../combobox.js";

const options: ReadonlyArray<ComboboxOption> = [
  { value: "calendar", label: "Calendar", description: "Scheduling" },
  { value: "camera", label: "Camera", description: "Hardware" },
  { value: "vacation", label: "Vacation", description: "Time off" },
  { value: "desk", label: "Desk booking", description: "Workspace" },
];

const Picker = ({
  onValueChange,
  multiple,
  disabledCamera,
}: {
  readonly onValueChange?: (
    value: string | null | ReadonlyArray<string>,
  ) => void;
  readonly multiple?: boolean;
  readonly disabledCamera?: boolean;
}) => (
  <div style={{ width: 360, padding: 40 }}>
    <Combobox
      options={
        disabledCamera === true
          ? options.map((option) =>
              option.value === "camera"
                ? { ...option, disabled: true }
                : option,
            )
          : options
      }
      multiple={multiple}
      label="Assign reviewer"
      onValueChange={onValueChange}
    />
  </div>
);

/** Let the runtime's microtask (focus) and React's updates settle. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/** Open the popup and wait for its input. */
const open = async (root: ComponentTestRoot): Promise<void> => {
  clickCentreOf(root, "combobox-trigger");
  await settle();
};

/** Type into the focused search field. */
const type = (root: ComponentTestRoot, text: string): void => {
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

describe("Combobox", () => {
  it("opens the popup and focuses the search input", async () => {
    const picker = renderComponent(<Picker />);

    await open(picker);

    expect(picker.renderer.findByTestId("combobox-content")).toBeDefined();
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-input"));

    picker.unmount();
  });

  it("filters the rows as the query is typed", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    type(picker, "ca");
    await settle();

    const texts = picker.renderer.getAllText();
    expect(texts).toContain("Calendar");
    expect(texts).toContain("Camera");
    expect(texts).toContain("Vacation");
    expect(texts).not.toContain("Desk booking");

    picker.unmount();
  });

  it("selects the second match with ArrowDown and Enter, by value", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Picker onValueChange={onValueChange} />);
    await open(picker);

    type(picker, "ca");
    await settle();
    picker.renderer.simulateKeystrokes("down");
    picker.renderer.simulateKeystrokes("enter");
    await settle();

    expect(onValueChange).toHaveBeenCalledWith("camera");
    expect(picker.renderer.getAllText()).toContain("Camera");

    picker.unmount();
  });

  it("shows the empty label when nothing matches", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    type(picker, "zzz");
    await settle();

    expect(picker.renderer.findByTestId("combobox-empty")).toBeDefined();
    expect(picker.renderer.getAllText()).toContain("No matches");

    picker.unmount();
  });

  it("replaces the value in single mode", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Picker onValueChange={onValueChange} />);

    await open(picker);
    type(picker, "ca");
    await settle();
    clickCentreOf(picker, "combobox-option-calendar");
    await settle();

    await open(picker);
    type(picker, "ca");
    await settle();
    clickCentreOf(picker, "combobox-option-camera");
    await settle();

    expect(onValueChange.mock.calls.at(-1)).toEqual(["camera"]);
    expect(picker.renderer.getAllText()).toContain("Camera");

    picker.unmount();
  });

  it("adds and removes in multiple mode, preserving selection order", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker multiple onValueChange={onValueChange} />,
    );
    await open(picker);

    clickCentreOf(picker, "combobox-option-calendar");
    await settle();
    clickCentreOf(picker, "combobox-option-camera");
    await settle();
    clickCentreOf(picker, "combobox-option-calendar");
    await settle();

    expect(onValueChange.mock.calls).toEqual([
      [["calendar"]],
      [["calendar", "camera"]],
      [["camera"]],
    ]);

    picker.unmount();
  });

  it("shows a disabled option but does not select it", async () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Picker disabledCamera onValueChange={onValueChange} />,
    );
    await open(picker);

    expect(picker.renderer.getAllText()).toContain("Camera");

    clickCentreOf(picker, "combobox-option-camera");
    await settle();

    expect(onValueChange).not.toHaveBeenCalled();
    expect(picker.renderer.findByTestId("combobox-content")).toBeDefined();

    picker.unmount();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    picker.renderer.simulateKeystrokes("escape");
    await settle();

    expect(picker.renderer.findByTestId("combobox-content")).toBeUndefined();
    expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));

    picker.unmount();
  });

  it("ranks a prefix match above a substring match", async () => {
    const picker = renderComponent(<Picker />);
    await open(picker);

    type(picker, "ca");
    await settle();

    const texts = picker.renderer.getAllText();
    expect(texts.indexOf("Calendar")).toBeLessThan(texts.indexOf("Vacation"));
    expect(texts.indexOf("Camera")).toBeLessThan(texts.indexOf("Vacation"));

    picker.unmount();
  });

  it("paints the popup from whichever theme is active", async () => {
    const assertTheme = async (
      theme: TestTheme,
      popover: string,
    ): Promise<void> => {
      const picker = renderComponent(<Picker />, theme);
      await open(picker);

      expect(
        picker.renderer.findByTestId("combobox-content")?.style.backgroundColor,
      ).toBe(popover);

      picker.unmount();
    };

    await assertTheme("dark", darkTheme.colors.popover);
    await assertTheme("light", lightTheme.colors.popover);
  });
});

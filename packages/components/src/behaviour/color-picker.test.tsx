/**
 * ColorPicker behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a saturation/value area that never reports the point it
 * was pressed at, a hue rail that cannot be stepped back to the colour it
 * announces, an alpha rail whose reported value does not reach the hex the
 * picker commits, a hex field that accepts a shorthand it never expands or
 * commits a draft it cannot read, a preset row that paints a colour without
 * reporting it, a panel whose controls the keyboard cannot reach, and a
 * disabled picker that still opens.
 */

import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import * as Option from "effect/Option";
import { ColorPicker } from "../color-picker.js";
import { parseColor, toHex } from "../color-picker/logic.js";
import {
  clickCentreOf,
  focusedTestId,
  pressKey,
  requireBounds,
  settleMotion,
  settle,
} from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { a11yNodes } from "../internal/a11y.js";

/** A caller-owned colour, and the value the picker reports into it. */
const Harness = ({
  initial = "#FF0000",
  disabled = false,
  onValueChange,
}: {
  readonly initial?: string;
  readonly disabled?: boolean;
  readonly onValueChange?: (value: string) => void;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, width: 320 }}
    >
      <ColorPicker
        testId="picker"
        label="Accent colour"
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
      />
    </div>
  );
};

/** Open the panel and let the anchored surface settle. */
const open = (root: ComponentTestRoot): void => {
  clickCentreOf(root, "picker");
  settleMotion(root);
};

/** The announced value of a slider, or the area's own sentence. */
const announced = (root: ComponentTestRoot, testId: string): string =>
  String(
    root.renderer.findByTestId(testId)?.customProps?.["aria-valuetext"] ?? "",
  );

/** The colour a committed hex parses to, failing the case when it does not. */
const parse = (hex: string) => {
  const parsed = parseColor(hex);
  if (Option.isNone(parsed)) throw new Error(`not a colour: ${hex}`);
  return parsed.value;
};

/** Press the picker's hex field into a new draft. */
const typeHex = (root: ComponentTestRoot, text: string): void => {
  root.renderer.focusElement(
    root.renderer.findByTestId("picker-hex")?.id ?? -1,
  );
  root.renderer.simulateKeystrokes("cmd-a");
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
  settle(root);
};

describe("ColorPicker", () => {
  it("reports the saturation and brightness of the point the area was pressed at", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);
    open(picker);

    const box = requireBounds(picker, "picker-area");
    picker.renderer.nativeSimulateClick(
      box.x + box.width * 0.25,
      box.y + box.height * 0.25,
    );
    settle(picker);

    expect(onValueChange).toHaveBeenCalled();
    const latest = onValueChange.mock.calls.at(-1)?.[0] ?? "";
    const colour = parse(String(latest));
    expect(colour.s).toBeCloseTo(0.25, 1);
    expect(colour.v).toBeCloseTo(0.75, 1);
    expect(announced(picker, "picker-area")).toContain("Saturation 25%");
    expect(announced(picker, "picker-area")).toContain("brightness 75%");

    picker.unmount();
  });

  it("drags the saturation and brightness thumb across the area", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);
    open(picker);

    const box = requireBounds(picker, "picker-area");
    // The press sets the colour at the point that was hit; the moves carry it.
    picker.renderer.nativeSimulateMouseDown(
      box.x + box.width * 0.5,
      box.y + box.height * 0.5,
    );
    picker.renderer.nativeSimulateMouseMove(
      box.x + box.width * 0.25,
      box.y + box.height * 0.25,
      0,
    );
    picker.renderer.nativeSimulateMouseUp(
      box.x + box.width * 0.25,
      box.y + box.height * 0.25,
    );
    settle(picker);

    const colour = parse(String(onValueChange.mock.calls.at(-1)?.[0] ?? ""));
    expect(colour.s).toBeCloseTo(0.25, 1);
    expect(colour.v).toBeCloseTo(0.75, 1);
    expect(announced(picker, "picker-area")).toContain("Saturation 25%");
    expect(announced(picker, "picker-area")).toContain("brightness 75%");

    picker.unmount();
  });

  it("moves the saturation and brightness thumb with the arrow keys", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);
    open(picker);

    picker.renderer.focusElement(
      picker.renderer.findByTestId("picker-area")?.id ?? -1,
    );
    pressKey(picker, "left");
    pressKey(picker, "down");
    settle(picker);

    const colour = parse(String(onValueChange.mock.calls.at(-1)?.[0] ?? ""));
    // The red default is fully saturated at full brightness: each arrow moves
    // one axis by a step.
    expect(colour.s).toBeCloseTo(0.99, 1);
    expect(colour.v).toBeCloseTo(0.99, 1);

    picker.unmount();
  });

  it("cycles the hue rail and commits the colour it names", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);
    open(picker);

    expect(announced(picker, "picker-hue")).toBe("0 degrees");
    picker.renderer.focusElement(
      picker.renderer.findByTestId("picker-hue")?.id ?? -1,
    );
    pressKey(picker, "right");
    pressKey(picker, "right");
    settle(picker);

    expect(announced(picker, "picker-hue")).toBe("2 degrees");
    expect(
      parse(String(onValueChange.mock.calls.at(-1)?.[0] ?? "")).h,
    ).toBeCloseTo(2, 0);

    picker.unmount();
  });

  it("composites the alpha rail into the committed hex", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);
    open(picker);

    expect(announced(picker, "picker-alpha")).toBe("100%");
    picker.renderer.focusElement(
      picker.renderer.findByTestId("picker-alpha")?.id ?? -1,
    );
    pressKey(picker, "pagedown");
    settle(picker);

    expect(announced(picker, "picker-alpha")).toBe("90%");
    const committed = String(onValueChange.mock.calls.at(-1)?.[0] ?? "");
    // 90% of a byte is 230: the value carries the alpha digit the rail names.
    expect(committed).toBe("#FF0000E6");
    expect(toHex(parse(committed))).toBe(committed);

    picker.unmount();
  });

  it("expands and commits a typed shorthand, and refuses a draft it cannot read", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);
    open(picker);

    typeHex(picker, "f0a");
    pressKey(picker, "enter");
    settle(picker);

    expect(onValueChange).toHaveBeenLastCalledWith("#FF00AA");
    expect(picker.renderer.findByTestId("picker-hex")?.customProps?.value).toBe(
      "#FF00AA",
    );

    typeHex(picker, "zzz");
    pressKey(picker, "enter");
    settle(picker);

    // The refused draft keeps the field's text and paints the destructive
    // edge; the value and the trigger never take it.
    expect(picker.renderer.findByTestId("picker-hex")?.customProps?.value).toBe(
      "zzz",
    );
    expect(picker.renderer.findByTestId("picker-error")).toBeDefined();
    expect(onValueChange).toHaveBeenLastCalledWith("#FF00AA");

    picker.unmount();
  });

  it("sets the value from a pressed preset and marks it chosen", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);
    open(picker);

    clickCentreOf(picker, "picker-preset-2");
    settle(picker);

    const accent = darkTheme.colors.accent.toUpperCase();
    expect(onValueChange).toHaveBeenLastCalledWith(accent);
    expect(
      picker.renderer.findByTestId("picker-preset-2")?.customProps,
    ).toMatchObject({ "aria-selected": true });
    expect(
      picker.renderer.findByTestId("picker-preset-2-marker"),
    ).toBeDefined();

    picker.unmount();
  });

  it("reaches every control with the keyboard", () => {
    const picker = renderComponent(<Harness />);
    open(picker);

    expect(focusedTestId(picker)).toEqual(Option.some("picker-area"));
    // The area takes focus when the panel opens; Tab walks the parts in the
    // order a reader meets them.
    const walked: string[] = [];
    for (let step = 0; step < 11; step += 1) {
      const focused = picker.renderer.getFocusedElementId?.() ?? -1;
      // A key-down only: `pressKey`'s key-up names the element it started on,
      // which would move focus back to where the walk began.
      picker.renderer.nativeSimulateKeyDown(focused, "tab");
      settle(picker);
      const next = focusedTestId(picker);
      if (Option.isSome(next)) walked.push(next.value);
    }

    expect(walked).toEqual(
      expect.arrayContaining([
        "picker-done",
        "picker-area",
        "picker-hue",
        "picker-alpha",
        "picker-hex",
        "picker-preset-0",
      ]),
    );

    picker.unmount();
  });

  it("names the trigger and the hex field, and a blank label reads as the default", () => {
    const named = renderComponent(<Harness />);
    const names = a11yNodes(named.renderer).map((node) => node.name);
    expect(names).toContain("Accent colour");
    named.unmount();

    const blank = renderComponent(<ColorPicker label="   " value="#FF0000" />);
    const fallback = a11yNodes(blank.renderer).map((node) => node.name);
    expect(fallback).toContain("Color picker");
    blank.unmount();
  });

  it("does not open while it is disabled", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Harness disabled onValueChange={onValueChange} />,
    );

    expect(picker.renderer.findByTestId("picker")?.customProps?.tabIndex).toBe(
      -1,
    );
    clickCentreOf(picker, "picker");
    settleMotion(picker);

    expect(picker.renderer.findByTestId("picker-panel")).toBeUndefined();
    expect(onValueChange).not.toHaveBeenCalled();

    picker.unmount();
  });

  it("reads a stored colour and palette a record wrote as absence", () => {
    const picker = renderComponent(
      <ColorPicker
        testId="picker"
        label="Accent colour"
        // @ts-expect-error — the colour a store wrote where it carried none.
        value={null}
        // @ts-expect-error — the palette a store wrote where it carried none.
        swatches={null}
      />,
    );

    expect(
      picker.renderer.findByTestId("picker-swatch")?.style.backgroundColor,
    ).toBe("#000000");
    open(picker);
    expect(
      picker.renderer.findByTestId("picker-preset-0")?.style.backgroundColor,
    ).toBe(darkTheme.colors.primary);

    picker.unmount();
  });
});

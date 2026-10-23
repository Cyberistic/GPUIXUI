/**
 * ColorPicker behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a swatch grid that ignores the theme, a shorthand hex
 * that is not expanded on commit, an invalid draft that commits anyway, a blur
 * that keeps invalid text, a disabled picker that still changes, and a style
 * callback that cannot see validity.
 */

import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import * as Arr from "effect/Array";
import * as P from "effect/Predicate";
import { contrastFloors, contrastRatio } from "@gpuixui/tokens";
import { ColorPicker } from "../color-picker.js";
import { clickCentreOf } from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { a11yNodes } from "../internal/a11y.js";

/** A caller-owned colour. */
const Harness = ({
  initial = "#000000",
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
        style={(state) => ({ gap: state.valid ? 8 : 12 })}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
      />
      <div testId="elsewhere" tabIndex={0} style={{ height: 20 }}>
        Elsewhere
      </div>
    </div>
  );
};

/** Replace the field's text and commit with Enter. */
const typeHex = (root: ComponentTestRoot, text: string): void => {
  root.renderer.focusElement(
    root.renderer.findByTestId("picker-hex")?.id ?? -1,
  );
  root.renderer.simulateKeystrokes("cmd-a");
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

const hexValue = (root: ComponentTestRoot): unknown =>
  root.renderer.findByTestId("picker-hex")?.customProps?.value;

/** A painted colour, or `undefined` for a style value that is not a string. */
const colourOf = (value: unknown): string | undefined =>
  P.isString(value) ? value : undefined;

describe("ColorPicker", () => {
  it("renders the swatches, the hex field and the preview", () => {
    const picker = renderComponent(<Harness />);

    expect(a11yNodes(picker.renderer).map((node) => node.name)).toContain(
      "Accent colour",
    );
    expect(picker.renderer.findByTestId("picker-hex")).toBeDefined();
    expect(hexValue(picker)).toBe("#000000");
    expect(
      picker.renderer.findByTestId("picker-preview")?.style.backgroundColor,
    ).toBe("#000000");

    picker.unmount();
  });

  it("offers six swatches from the theme", () => {
    const picker = renderComponent(<Harness />);

    expect(
      picker.renderer.findByTestId("picker-swatch-0")?.style.backgroundColor,
    ).toBe(darkTheme.colors.primary);
    expect(
      picker.renderer.findByTestId("picker-swatch-5")?.style.backgroundColor,
    ).toBe(darkTheme.colors.foreground);
    expect(picker.renderer.findByTestId("picker-swatch-6")).toBeUndefined();

    picker.unmount();
  });

  it("commits a pressed swatch and marks it selected", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);

    clickCentreOf(picker, "picker-swatch-2");

    expect(onValueChange).toHaveBeenCalledWith(
      darkTheme.colors.accent.toLowerCase(),
    );
    expect(
      picker.renderer.findByTestId("picker-swatch-2")?.customProps,
    ).toMatchObject({ "aria-selected": true });

    picker.unmount();
  });

  it("expands and commits a typed shorthand hex", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);

    typeHex(picker, "#abc");
    picker.renderer.simulateKeystrokes("enter");

    expect(onValueChange).toHaveBeenCalledWith("#aabbcc");
    expect(hexValue(picker)).toBe("#aabbcc");

    picker.unmount();
  });

  it("marks an invalid draft destructive and refuses to commit it", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);

    typeHex(picker, "zzz");
    expect(picker.renderer.findByTestId("picker-hex")?.style.borderColor).toBe(
      darkTheme.colors.destructive,
    );

    picker.renderer.simulateKeystrokes("enter");
    expect(onValueChange).not.toHaveBeenCalled();

    picker.unmount();
  });

  it("commits a valid draft on blur and reverts an invalid one", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);

    typeHex(picker, "#123456");
    picker.renderer.focusElement(
      picker.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    expect(onValueChange).toHaveBeenCalledWith("#123456");

    picker.unmount();

    const invalid = renderComponent(<Harness onValueChange={onValueChange} />);
    typeHex(invalid, "nope");
    invalid.renderer.focusElement(
      invalid.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    expect(hexValue(invalid)).toBe("#000000");
    invalid.unmount();
  });

  it("is inert when disabled", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <Harness disabled onValueChange={onValueChange} />,
    );

    expect(
      picker.renderer.findByTestId("picker-swatch-0")?.customProps?.tabIndex,
    ).toBe(-1);
    expect(
      picker.renderer.findByTestId("picker-hex")?.customProps?.readOnly,
    ).toBe(true);

    clickCentreOf(picker, "picker-swatch-1");
    expect(onValueChange).not.toHaveBeenCalled();

    picker.unmount();
  });

  it("refuses a hex draft committed after the picker is disabled", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(<Harness onValueChange={onValueChange} />);

    typeHex(picker, "#123456");
    // A form disables the picker while it saves, and a read-only host still
    // receives Enter: the field's own submit listener must refuse with it.
    picker.rerender(<Harness disabled onValueChange={onValueChange} />);
    picker.renderer.simulateKeystrokes("enter");

    expect(onValueChange).not.toHaveBeenCalled();
    expect(
      picker.renderer.findByTestId("picker-preview")?.style.backgroundColor,
    ).toBe("#000000");

    picker.unmount();
  });

  it("hands validity to a style callback, in both themes", () => {
    const picker = renderComponent(<Harness />);
    expect(picker.renderer.findByTestId("picker")?.style.gap).toBe(8);
    picker.unmount();

    const invalid = renderComponent(<Harness />, "light");
    typeHex(invalid, "nope");
    expect(invalid.renderer.findByTestId("picker")?.style.gap).toBe(12);
    expect(
      invalid.renderer.findByTestId("picker-swatch-0")?.style.borderColor,
    ).toBe(lightTheme.colors.border);
    invalid.unmount();
  });

  it("marks the selected swatch in a role the swatch cannot swallow", () => {
    // The bug: selection was a `foreground` border and nothing else, and
    // `foreground` is the last of the six default swatches — choosing it
    // painted the mark in its own colour (1.00:1), so the reader could not see
    // which colour they had chosen. The pip carries the page fill and the body
    // ink, a measured pair, so at least one of the three marks clears the 3:1
    // a non-text indicator needs against every default swatch.
    const failures = Arr.flatMap(["dark", "light"] as const, (mode) =>
      Arr.flatMap(Arr.range(0, 5), (index) => {
        const picker = renderComponent(<Harness />, mode);
        const id = `picker-swatch-${index}`;
        const early =
          picker.renderer.findByTestId(`${id}-marker`) === undefined
            ? []
            : [`${mode} ${index}: marked before it was chosen`];

        clickCentreOf(picker, id);

        const cell = picker.renderer.findByTestId(id);
        const marker = picker.renderer.findByTestId(`${id}-marker`);
        const swatch = colourOf(cell?.style.backgroundColor);
        const best = Arr.reduce(
          Arr.flatMap(
            [
              colourOf(cell?.style.borderColor),
              colourOf(marker?.style.backgroundColor),
              colourOf(marker?.style.borderColor),
            ],
            (mark) => {
              const ratio = contrastRatio(mark, swatch);
              return ratio === undefined ? [] : [ratio];
            },
          ),
          0,
          (highest, ratio) => (ratio > highest ? ratio : highest),
        );

        picker.unmount();

        if (marker === undefined) {
          return Arr.append(
            early,
            `${mode} ${index}: no marker after choosing`,
          );
        }
        return best < contrastFloors.boundary
          ? Arr.append(
              early,
              `${mode} ${index}: the best mark on ${String(swatch)} is ${best.toFixed(2)}`,
            )
          : early;
      }),
    );

    expect(failures).toEqual([]);
  });
});

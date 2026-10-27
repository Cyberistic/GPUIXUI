/** @jsxImportSource @gpuix/react */
/**
 * Slider: one value on a track, or the two ends of a range.
 *
 * The primitives own the arithmetic, the pointer capture, the focus movement
 * and the keyboard contract — an arrow moves one step, `PageUp`/`PageDown` ten,
 * `Home`/`End` the track's ends, and a disabled slider answers none of them.
 * This component owns shadcn's surface: **one** `Slider` whose `value` is a
 * number or a `[from, to]` pair, so the caller does not pick between two
 * component names, and the union the rest of its props keep.
 *
 * A range is a different ARIA contract from a single slider — two `slider`
 * nodes in a named group rather than one slider with an array value — and the
 * primitive renders exactly that. The pair cannot cross: each end moves against
 * the other, so `from` stays at or below `to` by construction.
 *
 * **The runtime publishes no `aria-valuenow` and no `aria-orientation`**
 * (`docs/gpuix-capabilities.md`), so each thumb announces its value through
 * `aria-valuetext` and the orientation is the caller's layout fact. There is no
 * value tooltip either: the primitive publishes no popup part beside a thumb,
 * so a visible value belongs in a `Label` the caller composes.
 */

import type { Props } from "@gpuix/react";
import {
  RangeSlider,
  Slider as PrimitiveSlider,
  type SliderOrientation,
} from "@gpuixui/primitives/slider";
import { isSliderSpan, sliderMode, type SliderValue } from "./slider/logic.js";

export { isSliderSpan } from "./slider/logic.js";
export type { SliderValue } from "./slider/logic.js";

/** {@link Slider} props. */
export interface SliderProps extends Omit<Props, "onChange"> {
  /**
   * The value — a number for one thumb, a `[from, to]` pair for a range.
   * `[70, 20]` paints as `20 … 70`: the ends are ordered, not swapped in place.
   */
  readonly value?: SliderValue;
  /** The uncontrolled starting value; the shape chooses the surface too. */
  readonly defaultValue?: SliderValue;
  /** Every accepted move, in the shape the caller passed. */
  readonly onValueChange?: (value: SliderValue) => void;
  /** The value a gesture ended on: a pointer release, or one moving key. */
  readonly onValueCommit?: (value: SliderValue) => void;
  /** Defaults to `0`. */
  readonly min?: number;
  /** Defaults to `100`. */
  readonly max?: number;
  /** Defaults to `1`; `0` makes the track continuous. */
  readonly step?: number;
  readonly disabled?: boolean;
  /** A failed validation paints the destructive role, like a field. */
  readonly invalid?: boolean;
  /** Defaults to `horizontal`; a vertical track needs a definite height. */
  readonly orientation?: SliderOrientation;
  /** The accessible name; a range derives "<label> minimum"/"maximum" from it. */
  readonly label?: string;
  /** Announced help after the name. */
  readonly description?: string;
  /** How a value is announced and read by a screen reader. Defaults to `String(value)`. */
  readonly formatValue?: (value: number) => string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Stable locator for the automation host. */
  readonly testId?: string;
}

/**
 * A value on a track.
 *
 * ```tsx
 * <Slider label="Volume" defaultValue={40} onValueChange={setVolume} />
 * <Slider label="Price" defaultValue={[20, 80]} min={0} max={100} step={5} />
 * ```
 */
export const Slider = (props: SliderProps) => {
  const {
    value,
    defaultValue,
    onValueChange,
    onValueCommit,
    min,
    max,
    step,
    disabled,
    invalid,
    orientation,
    label,
    description,
    formatValue,
    className,
    testId,
    ...host
  } = props;
  const shared = {
    ...host,
    min,
    max,
    step,
    disabled,
    invalid,
    orientation,
    label,
    description,
    formatValue,
    className,
    testId,
    onValueChange: (next: SliderValue) => onValueChange?.(next),
    onValueCommit: (next: SliderValue) => onValueCommit?.(next),
  };

  return sliderMode(value, defaultValue) === "range" ? (
    <RangeSlider
      {...shared}
      value={isSliderSpan(value) ? value : undefined}
      defaultValue={isSliderSpan(defaultValue) ? defaultValue : undefined}
    />
  ) : (
    <PrimitiveSlider
      {...shared}
      value={typeof value === "number" ? value : undefined}
      defaultValue={typeof defaultValue === "number" ? defaultValue : undefined}
    />
  );
};

/** Inventory record, mirrored into `COMPONENTS.md`'s Slider row. */
export const sliderMeta = {
  name: "Slider",
  tier: 1,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "No `aria-valuenow`, `aria-valuemin`, `aria-valuemax` or `aria-orientation`: each thumb announces its value through `aria-valuetext`",
    "No value tooltip: the primitive publishes no popup beside a thumb, so a visible value is a `Label` the caller composes",
    "A vertical track has no natural length; give it a definite height",
  ],
  docs: "docs/slider.mdx",
  example: "examples/slider.example.tsx",
  testFile: "src/behaviour/slider.test.tsx",
} as const;

/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  RangeSlider,
  Slider as PrimitiveSlider,
  type SliderOrientation,
} from "@gpuixui/primitives/slider";
import { isSliderSpan, sliderMode, type SliderValue } from "./slider/logic.js";

export { isSliderSpan } from "./slider/logic.js";
export type { SliderValue } from "./slider/logic.js";

export interface SliderProps extends Omit<Props, "onChange"> {
  readonly value?: SliderValue;

  readonly defaultValue?: SliderValue;

  readonly onValueChange?: (value: SliderValue) => void;

  readonly onValueCommit?: (value: SliderValue) => void;

  readonly min?: number;

  readonly max?: number;

  readonly step?: number;
  readonly disabled?: boolean;

  readonly invalid?: boolean;

  readonly orientation?: SliderOrientation;

  readonly label?: string;

  readonly description?: string;

  readonly formatValue?: (value: number) => string;

  readonly className?: string;

  readonly testId?: string;
}

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

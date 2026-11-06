export type SliderValue = number | readonly [number, number];

export const isSliderSpan = (
  value: unknown,
): value is readonly [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((end) => typeof end === "number" && Number.isFinite(end));

export const sliderMode = (
  value: unknown,
  defaultValue: unknown,
): "single" | "range" =>
  isSliderSpan(value ?? defaultValue) ? "range" : "single";

/**
 * The two shapes one `Slider` accepts, and the surface it paints.
 *
 * shadcn's slider is a track with one thumb or two, and this package publishes
 * one `Slider` that takes either shape rather than making a caller choose a
 * component name. A range is a **pair of numbers**; anything else is a single
 * value — JSON's `null` for a field a record never wrote, an array with a
 * missing end, or a stored object from an older shape is a single slider with
 * no value, so the union cannot throw out of the render.
 */

/** One value, or the two ends of a range. */
export type SliderValue = number | readonly [number, number];

/** Whether a stored value is a range `[from, to]`. */
export const isSliderSpan = (
  value: unknown,
): value is readonly [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((end) => typeof end === "number" && Number.isFinite(end));

/**
 * The surface the caller asked for.
 *
 * A controlled `value` decides; with none, the starting `defaultValue` does. A
 * `value` and a `defaultValue` of different shapes is the controlled one's
 * answer, because it is the value the slider actually paints.
 */
export const sliderMode = (
  value: unknown,
  defaultValue: unknown,
): "single" | "range" =>
  isSliderSpan(value ?? defaultValue) ? "range" : "single";

/**
 * The slider route: `@gpuixui/primitives/slider`.
 *
 * The package root re-exports every primitive, so a package that needs one
 * track would load all of Tier 1 to paint it. This entry publishes the single
 * and range sliders with their shared value reader, the route `./button`,
 * `./hint` and `./scroll-area` take. It is a re-export seam, not a second
 * implementation.
 */

export {
  RangeSlider,
  Slider,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  sliderRange,
  sliderValueText,
} from "./components/Slider.js";
export type {
  RangeSliderProps,
  SliderIndicatorProps,
  SliderProps,
  SliderState,
  SliderThumbProps,
  SliderTrackProps,
} from "./components/Slider.js";
export type { SliderOrientation } from "./core/style.js";

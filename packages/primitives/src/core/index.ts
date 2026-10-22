/**
 * The runtime-free core of `@gpuixui/primitives`.
 *
 * Nothing here imports `@gpuix/react` at runtime — only its types, which
 * `verbatimModuleSyntax` erases. That is deliberate: this is the layer whose
 * tests need no renderer, and it is where the design system's decisions
 * actually live (theme role → `StyleDesc` resolution, keyboard contracts,
 * controlled state).
 */

export { alpha } from "@gpuixui/tokens";
export { accessibleName } from "./a11y.js";

export {
  decideAbsolute,
  decideActivation,
  decideMove,
  decidePage,
  decideToggle,
  ENTER_KEY,
  SPACE_KEY,
} from "./keyboard.js";
export type { KeyName, KeyPhase, Orientation } from "./keyboard.js";

export { initValueState, setValue, withValue } from "./state.js";
export type { ControlMode, ValueState } from "./state.js";

export { rovingIndex } from "./roving.js";

export { SCROLL_END, scrollTarget } from "./scroll.js";
export type { ScrollMetrics, ScrollOffset } from "./scroll.js";

export {
  clampNumeric,
  decideNumberKey,
  formatNumber,
  parseNumericText,
  stepNumber,
} from "./number.js";
export type { NumberRange } from "./number.js";

export { clampRating, decideRating, ratingTabStop } from "./rating.js";

export {
  applyOtpInput,
  decideOtpKey,
  normalizeOtp,
  otpCells,
  otpLength,
} from "./otp.js";
export type { OtpEdit } from "./otp.js";

export {
  clampValue,
  decideValueKey,
  fractionValue,
  moveSpanEnd,
  nearestEnd,
  normalizeRange,
  normalizeSpan,
  pointerValue,
  stepValue,
  valueFraction,
  valueStep,
} from "./value.js";
export type { TrackBox, ValueRange, ValueSpan } from "./value.js";

export {
  boxStyle,
  gridStyle,
  stackStyle,
  STACK_ALIGNS,
  STACK_DIRECTIONS,
  STACK_JUSTIFIES,
} from "./layout.js";
export type {
  BoxSpec,
  GridSpec,
  StackAlign,
  StackDirection,
  StackJustify,
  StackSpec,
} from "./layout.js";

export {
  radioDotStyle,
  SELECTION_ACCENTS,
  SELECTION_STATES,
  selectionBoxStyle,
  selectionMarkColor,
  switchThumbStyle,
  switchTrackStyle,
  toggleSelection,
} from "./selection.js";
export type {
  SelectionAccent,
  SelectionSpec,
  SelectionState,
} from "./selection.js";

export {
  indeterminateFillStyle,
  indeterminateLeadStyle,
  indeterminateOffset,
  progressAnimates,
  PULSE_STEPS,
  pulseOpacity,
  skeletonSize,
  skeletonStyle,
  SPINNER_ACCENTS,
  SPINNER_SEGMENTS,
  spinnerDotStyle,
  spinnerDots,
} from "./loading.js";
export type {
  SkeletonSpec,
  SpinnerAccent,
  SpinnerDot,
  SpinnerSpec,
} from "./loading.js";

export { controlRing, keyboardRing, keepContent } from "./focus.js";
export type { RingState } from "./focus.js";

export {
  controlFocusStyle,
  controlStyle,
  fieldTextStyle,
  nativeTextTheme,
  numberInputStyle,
  numberStepperColumnStyle,
  numberStepperStyle,
  otpCellStyle,
  otpGroupStyle,
  progressFillStyle,
  progressPercent,
  progressTrackStyle,
  ratingStarColor,
  ratingStarStyle,
  PROGRESS_TONES,
  ruleStyle,
  scrollStyle,
  sliderFillStyle,
  sliderInset,
  sliderRailStyle,
  sliderThumbStyle,
  sliderTrackStyle,
  surfaceStyle,
  SURFACE_TONES,
  textStyle,
  TEXT_TONES,
  toneColor,
} from "./style.js";
export type {
  ControlSpec,
  ControlVariant,
  OtpCellSpec,
  ProgressSpec,
  ProgressTone,
  RatingStarSpec,
  RuleSpec,
  ScrollSpec,
  SliderSpec,
  SurfaceSpec,
  SurfaceTone,
  TextSpec,
  TextTone,
} from "./style.js";

export {
  buttonVariants,
  BUTTON_VARIANTS,
  fieldVariant,
  hasPointerFeedback,
  TOGGLE_VARIANTS,
  toggleVariants,
  variantKey,
  variantTable,
} from "./variants.js";
export type { ButtonVariant, ToggleVariant } from "./variants.js";

export type {
  BorderWidth,
  ColorRef,
  ControlSize,
  Density,
  DensityName,
  Elevation,
  ElevationLevel,
  FontWeight,
  PrimitiveTheme,
  Radius,
  RadiusStep,
  Spacing,
  SpaceStep,
  TextRole,
  TextStyle,
  ThemeColors,
  ThemeIconSize,
  ThemeMode,
  ThemeShadow,
  Typography,
} from "./theme.js";

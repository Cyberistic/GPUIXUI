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
  defaultMessages,
  pressWord,
  resolveMessages,
  selectionWord,
} from "./messages.js";
export type {
  PressWords,
  PrimitiveMessages,
  SelectionWords,
} from "./messages.js";

export {
  decideAbsolute,
  decideActivation,
  decideMove,
  decidePage,
  decideToggle,
  decideTypeAhead,
  ENTER_KEY,
  isTypeAheadKey,
  SPACE_KEY,
  TYPE_AHEAD_RESET_MS,
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
  parseNumberText,
  parseNumericText,
  stepNumber,
} from "./number.js";
export type { NumberRange, ParseValue } from "./number.js";

export {
  clampRating,
  decideRating,
  pointerRating,
  ratingTabStop,
  starFill,
  starState,
} from "./rating.js";
export type { StarBox, StarState } from "./rating.js";

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
  verticalPointerValue,
} from "./value.js";
export type {
  TrackBox,
  ValueRange,
  ValueSpan,
  VerticalTrackBox,
} from "./value.js";

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
  nativeTextFills,
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
  ratingPartialCellStyle,
  ratingPartialStyle,
  PROGRESS_TONES,
  ruleStyle,
  scrollStyle,
  sliderFillStyle,
  sliderInset,
  sliderRailStyle,
  SLIDER_ORIENTATIONS,
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
  NativeTextFill,
  NativeTextTheme,
  OtpCellSpec,
  ProgressSpec,
  ProgressTone,
  RatingStarSpec,
  RuleSpec,
  ScrollSpec,
  SliderOrientation,
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

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
export {
  accessibleName,
  fieldHelp,
  spokenSentence,
  spokenText,
  spokenWord,
  visibleCopy,
} from "./a11y.js";

export {
  busyWord,
  defaultMessages,
  indeterminateWord,
  pressWord,
  rangeThumbNames,
  resolveMessages,
  selectionWord,
  starWord,
} from "./messages.js";
export type {
  LoadingWords,
  MessagesSource,
  PressWords,
  PrimitiveMessages,
  RangeEndWords,
  SelectionWords,
  StarWords,
} from "./messages.js";

export {
  decideAbsolute,
  decideActivation,
  decideMove,
  decidePage,
  decideToggle,
  decideTypeAhead,
  ENTER_KEY,
  isOrientation,
  isPlainKey,
  isTypeAheadKey,
  orientationOf,
  SPACE_KEY,
  TYPE_AHEAD_RESET_MS,
} from "./keyboard.js";
export type { KeyChord, KeyName, KeyPhase, Orientation } from "./keyboard.js";

export { initValueState, setValue, withValue } from "./state.js";
export type { ControlMode, ValueState } from "./state.js";

export { rovingIndex } from "./roving.js";

export { SCROLL_END, scrollTarget } from "./scroll.js";
export type { ScrollMetrics, ScrollOffset } from "./scroll.js";

export {
  clampNumeric,
  decideNumberKey,
  displayNumber,
  expandedNumber,
  formatNumber,
  normalizeNumberRange,
  numberDisplay,
  parseNumberText,
  parseNumericText,
  SCRUB_PIXELS_PER_STEP,
  scrubNumber,
  stepNumber,
} from "./number.js";
export type { NumberRange, ParseValue } from "./number.js";

export {
  clampRating,
  decideRating,
  pointerRating,
  ratingTabStop,
  starCount,
  starFill,
  starState,
} from "./rating.js";
export type { StarBox, StarState } from "./rating.js";

export {
  applyOtpInput,
  DEFAULT_OTP_LENGTH,
  decideOtpKey,
  normalizeOtp,
  otpCellCount,
  otpCells,
  otpEmptiedCell,
  otpLength,
} from "./otp.js";
export type { OtpEdit } from "./otp.js";

export {
  storedList,
  storedNumber,
  storedText,
  storedTextList,
} from "./stored.js";

export {
  clampValue,
  decideValueKey,
  fractionValue,
  moveSpanEnd,
  nearestEnd,
  normalizeRange,
  normalizeSpan,
  pointerValue,
  spanFrom,
  stepValue,
  storedRange,
  valueFraction,
  valueStep,
  verticalPointerValue,
} from "./value.js";
export type {
  StoredRange,
  TrackBox,
  ValueRange,
  ValueSpan,
  VerticalTrackBox,
} from "./value.js";

export {
  boxStyle,
  gridStyle,
  isStackDirection,
  stackDirection,
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
  isSelectionAccent,
  radioDotStyle,
  SELECTION_ACCENTS,
  SELECTION_STATES,
  selectionAccentOf,
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
  SwitchPaintTheme,
} from "./selection.js";

export {
  indeterminateFillStyle,
  indeterminateLeadStyle,
  indeterminateOffset,
  progressAnimates,
  PULSE_INTERVAL_MS,
  PULSE_STEPS,
  pulseOpacity,
  skeletonSize,
  isSpinnerAccent,
  skeletonStyle,
  SPINNER_ACCENTS,
  SPINNER_ARC_TICKS,
  SPINNER_FADE_FLOOR,
  SPINNER_RING_TICKS,
  SPINNER_SEGMENTS,
  spinnerAccentOf,
  spinnerTickStyle,
  spinnerTicks,
  STEP_INTERVAL_MS,
} from "./loading.js";
export type {
  SkeletonSpec,
  SpinnerAccent,
  SpinnerSpec,
  SpinnerTick,
} from "./loading.js";

export { controlRing, keyboardRing, keepContent } from "./focus.js";
export type { RingState } from "./focus.js";

export { pressWash, primaryButton } from "./pointer.js";

export {
  BORDER_STYLES,
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
  isProgressSize,
  isProgressTone,
  isTextAlign,
  isTextTone,
  progressFillStyle,
  progressPercent,
  progressSizeOf,
  progressToneOf,
  progressTrackStyle,
  PROGRESS_SIZES,
  ratingStarColor,
  ratingStarStyle,
  ratingPartialCellStyle,
  ratingPartialStyle,
  PROGRESS_TONES,
  ruleStyle,
  SCROLL_AXES,
  isScrollAxis,
  scrollAxis,
  scrollStyle,
  sliderFillStyle,
  sliderInset,
  sliderRailStyle,
  SLIDER_ORIENTATIONS,
  sliderThumbStyle,
  sliderTrackStyle,
  surfaceStyle,
  SURFACE_TONES,
  textAlignOf,
  textAlignValue,
  textStyle,
  TEXT_ALIGNMENTS,
  textToneOf,
  TEXT_TONES,
  toneColor,
} from "./style.js";
export type {
  BorderStyle,
  ControlSpec,
  ControlVariant,
  NativeTextFill,
  NativeTextTheme,
  OtpCellSpec,
  ProgressSize,
  ProgressSpec,
  ProgressTone,
  RatingStarSpec,
  RuleSpec,
  ScrollAxis,
  ScrollSpec,
  SliderOrientation,
  SliderSpec,
  SurfaceSpec,
  SurfaceTone,
  TextAlign,
  TextSpec,
  TextTone,
} from "./style.js";

export {
  actionOnColor,
  buttonVariants,
  buttonVariantOf,
  BUTTON_VARIANTS,
  fieldVariant,
  hasPointerFeedback,
  isButtonVariant,
  isToggleVariant,
  TOGGLE_VARIANTS,
  toggleVariantOf,
  toggleVariants,
  variantKey,
  variantTable,
} from "./variants.js";
export type { ButtonVariant, ToggleVariant } from "./variants.js";

export {
  borderWidthOf,
  colorRole,
  colorsOf,
  controlHeightOf,
  controlPaddingOf,
  controlSize,
  elevationLevel,
  familyOf,
  iconSideOf,
  iconStepValue,
  isIconStep,
  isRadiusStep,
  isSpaceStep,
  isTextRole,
  radiusStep,
  radiusValue,
  rowHeightOf,
  spaceStep,
  spaceValue,
  typeOf,
} from "./theme.js";

export type {
  BorderWidth,
  BorderWidthSource,
  ColorRef,
  ColorSource,
  ControlSize,
  Density,
  DensityName,
  DensitySource,
  Elevation,
  ElevationLevel,
  FontWeight,
  IconSizeSource,
  PrimitiveTheme,
  Radius,
  RadiusSource,
  RadiusStep,
  Spacing,
  SpaceSource,
  SpaceStep,
  TextRole,
  TextStyle,
  ThemeColors,
  ThemeIconSize,
  ThemeMode,
  ThemeShadow,
  TypeSource,
  Typography,
} from "./theme.js";

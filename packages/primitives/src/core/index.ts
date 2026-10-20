/**
 * The runtime-free core of `@gpuixui/primitives`.
 *
 * Nothing here imports `@gpuix/react` at runtime — only its types, which
 * `verbatimModuleSyntax` erases. That is deliberate: this is the layer that can
 * be proven on a machine where GPUix's native binding does not exist, and it is
 * where the design system's decisions actually live (theme role → `StyleDesc`
 * resolution, keyboard contracts, controlled state).
 */

export { alpha } from "@gpuixui/tokens";

export { paintedBox, scrollIntoViewDelta } from "./bounds.js";
export type { BoxBounds } from "./bounds.js";

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

export {
  availableOn,
  availableWidth,
  decideHorizontalSide,
  decideVerticalSide,
  FLOATING_FOLLOW_MS,
  FLOATING_MARGIN,
  isHorizontalSide,
  resolveAlign,
} from "./floating.js";
export type {
  AlignRequest,
  HorizontalPlacementRequest,
  HorizontalSide,
  LayerAlign,
  LayerSide,
  PlacementRequest,
  ResolvedAlign,
  VerticalSide,
} from "./floating.js";

export {
  clampNumeric,
  decideNumberKey,
  draftApplies,
  formatNumber,
  normalizeNumberRange,
  parseNumericText,
  stepNumber,
} from "./number.js";
export type { NumberDraft, NumberRange } from "./number.js";

export { clampRating, decideRating, ratingTabStop } from "./rating.js";

export {
  buttonRecipeRing,
  buttonRecipeStyle,
  fieldRecipeRing,
  fieldRecipeStyle,
  fieldRowStyle,
  otpCellStyle,
  squareFieldRecipeStyle,
  type ButtonRecipeSpec,
  type FieldRecipeState,
  type OtpCellSpec,
} from "./recipes.js";

export { isSelectGroup, selectOptions, selectRowCounts } from "./select.js";
export type {
  SelectEntry,
  SelectOption,
  SelectOptionGroup,
  SelectRowCounts,
} from "./select.js";

export {
  isPressed,
  nextSelection,
  TOGGLE_GROUP_TYPES,
} from "./toggle-group.js";
export type { ToggleGroupOption, ToggleGroupType } from "./toggle-group.js";

export {
  enabledValues,
  groupParentState,
  isGroupSelected,
  toggleGroupAll,
  toggleGroupValue,
} from "./checkbox-group.js";
export type { CheckboxGroupOption } from "./checkbox-group.js";

export {
  applyOtpInput,
  decideOtpKey,
  normalizeOtp,
  otpCells,
  otpLength,
  otpTabStop,
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
  spanAfterMove,
  stepValue,
  usableLength,
  valueFraction,
  valueStep,
} from "./value.js";
export type { TrackBox, ValueRange, ValueSpan } from "./value.js";

export {
  boxStyle,
  decideScroll,
  GRID_TRACK_MINS,
  gridStyle,
  resolveScroll,
  SCROLL_DIRECTIONS,
  scrollLine,
  stackStyle,
  STACK_ALIGNS,
  STACK_DIRECTIONS,
  STACK_JUSTIFIES,
} from "./layout.js";
export type {
  BoxSpec,
  GridSpec,
  GridTrackMin,
  ScrollDirection,
  ScrollGeometry,
  ScrollMove,
  StackAlign,
  StackDirection,
  StackJustify,
  StackSpec,
} from "./layout.js";

export {
  groupDisabled,
  initialActiveIndex,
  radioDotStyle,
  SELECTION_ACCENTS,
  SELECTION_STATES,
  selectionBoxStyle,
  selectionMarkColor,
  selectionMarkSize,
  selectionRowStyle,
  switchThumbStyle,
  switchTrackStyle,
} from "./selection.js";
export type {
  SelectableOption,
  SelectionAccent,
  SelectionRowSpec,
  SelectionSpec,
  SelectionState,
} from "./selection.js";

export {
  indeterminateFillStyle,
  indeterminateLeadStyle,
  indeterminateOffset,
  PULSE_STEPS,
  pulseOpacity,
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

export {
  clippedFocusRingStyle,
  controlFocusStyle,
  controlLabelStyle,
  controlStyle,
  nativeTextTheme,
  numberInputStyle,
  numberStepperColumnStyle,
  numberStepperStyle,
  otpGroupStyle,
  progressFillStyle,
  progressPercent,
  progressTrackStyle,
  ratingStarColor,
  ratingStarStyle,
  PROGRESS_TONES,
  ruleStyle,
  scrollStyle,
  shrinkLayoutStyle,
  sliderFillStyle,
  sliderInset,
  sliderRailStyle,
  sliderThumbStyle,
  sliderTrackStyle,
  splitCallerStyle,
  surfaceStyle,
  SURFACE_TONES,
  textStyle,
  TEXT_TONES,
  toneColor,
} from "./style.js";
export type {
  ControlSpec,
  ControlVariant,
  ProgressSpec,
  ProgressTone,
  RatingStarSpec,
  RuleSpec,
  ScrollSpec,
  SliderSpec,
  SplitCallerStyle,
  SurfaceSpec,
  SurfaceTone,
  TextDecoration,
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

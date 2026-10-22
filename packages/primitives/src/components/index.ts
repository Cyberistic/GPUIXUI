/** The public component surface of `@gpuixui/primitives`. */

export {
  MissingThemeProviderError,
  ThemeProvider,
  useTheme,
} from "./ThemeProvider.js";
export type { ThemeProviderProps } from "./ThemeProvider.js";

export type { InteractionProps, TooltipTriggerProps } from "./internal.js";

export { Box } from "./Box.js";
export type { BoxProps } from "./Box.js";

export { Grid, Stack } from "./Stack.js";
export type { GridProps, StackProps } from "./Stack.js";

export { Separator, Spacer } from "./Separator.js";
export type { SeparatorProps, SpacerProps } from "./Separator.js";

export { ScrollArea, ScrollAreaViewport } from "./ScrollArea.js";
export type { ScrollAreaProps, ScrollAreaViewportProps } from "./ScrollArea.js";

export { Text } from "./Text.js";
export type { TextProps } from "./Text.js";

export { Label, labelledBy } from "./Label.js";
export type { LabelProps } from "./Label.js";

export { Button } from "./Button.js";
export type { ButtonFocus, ButtonProps, ButtonState } from "./Button.js";

export { IconButton, iconButtonProps } from "./IconButton.js";
export type { IconButtonProps } from "./IconButton.js";

export {
  ButtonGroup,
  BUTTON_GROUP_MODES,
  BUTTON_GROUP_ORIENTATIONS,
} from "./ButtonGroup.js";
export type {
  ButtonGroupMode,
  ButtonGroupOrientation,
  ButtonGroupProps,
} from "./ButtonGroup.js";

export { pressedValueText, Toggle } from "./Toggle.js";
export type { ToggleProps, ToggleState } from "./Toggle.js";

export {
  TOGGLE_GROUP_MODES,
  ToggleGroup,
  ToggleGroupItem,
  toggleGroupItems,
  toggleGroupValue,
  toggleGroupValues,
} from "./ToggleGroup.js";
export type {
  ToggleGroupItemProps,
  ToggleGroupMode,
  ToggleGroupOption,
  ToggleGroupProps,
  ToggleGroupState,
  ToggleItemState,
} from "./ToggleGroup.js";

export { Input } from "./Input.js";
export type { FieldProps, FieldState, InputProps } from "./Input.js";

export { fieldHint, hintFrame, renderFieldHint } from "./hint.js";
export type { FieldHint, FieldHintAlign, HintField, HintSpec } from "./hint.js";

export {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  numberRange,
} from "./NumberField.js";
export type {
  NumberFieldInputProps,
  NumberFieldProps,
  NumberFieldStepperProps,
} from "./NumberField.js";

export { OTPField, OTPFieldInput, otpCellLabel } from "./OTPField.js";
export type { OTPFieldInputProps, OTPFieldProps } from "./OTPField.js";

export { TextArea } from "./TextArea.js";
export type { TextAreaProps } from "./TextArea.js";

export {
  Checkbox,
  CheckboxIndicator,
  checkboxState,
  selectionValueText,
} from "./Checkbox.js";
export type {
  CheckboxIndicatorProps,
  CheckboxProps,
  CheckboxState,
} from "./Checkbox.js";

export {
  CheckboxGroup,
  CheckboxGroupItem,
  checkboxGroupItems,
} from "./CheckboxGroup.js";
export type {
  CheckboxGroupItemProps,
  CheckboxGroupOption,
  CheckboxGroupProps,
  CheckboxGroupState,
  CheckboxItemState,
} from "./CheckboxGroup.js";

export type { GroupItemProps, GroupOption } from "./group.js";

export { Switch, SwitchThumb } from "./Switch.js";
export type { SwitchProps, SwitchState, SwitchThumbProps } from "./Switch.js";

export {
  initialActiveIndex,
  radioItems,
  RadioGroup,
  RadioGroupItem,
} from "./RadioGroup.js";
export type {
  RadioGroupItemProps,
  RadioGroupProps,
  RadioGroupState,
  RadioItemState,
  RadioOption,
} from "./RadioGroup.js";

export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "./Progress.js";
export type {
  ProgressIndicatorProps,
  ProgressLabelProps,
  ProgressProps,
  ProgressTrackProps,
  ProgressValueProps,
} from "./Progress.js";

export { Rating, ratingMax } from "./Rating.js";
export type { RatingProps, RatingState } from "./Rating.js";

export {
  RangeSlider,
  Slider,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  sliderRange,
  sliderValueText,
} from "./Slider.js";
export type {
  RangeSliderProps,
  SliderIndicatorProps,
  SliderProps,
  SliderState,
  SliderThumbProps,
  SliderTrackProps,
} from "./Slider.js";

export {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from "./Meter.js";
export type {
  MeterIndicatorProps,
  MeterLabelProps,
  MeterProps,
  MeterTrackProps,
  MeterValueProps,
} from "./Meter.js";

export { Skeleton } from "./Skeleton.js";
export type { SkeletonProps } from "./Skeleton.js";

export { Spinner } from "./Spinner.js";
export type { SpinnerProps } from "./Spinner.js";

export {
  isSelectGroup,
  Select,
  selectContentStyle,
  selectItemStyle,
  selectLabelStyle,
  selectOptions,
  selectSeparatorStyle,
  selectTriggerStyle,
} from "./Select.js";
export type {
  SelectEntry,
  SelectItemState,
  SelectOption,
  SelectOptionGroup,
  SelectProps,
  SelectTriggerState,
} from "./Select.js";

export { Tooltip } from "./Tooltip.js";
export type { TooltipProps } from "./Tooltip.js";

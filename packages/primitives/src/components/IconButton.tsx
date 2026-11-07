/** @jsxImportSource @gpuix/react */
import { useContext, type ReactElement, type ReactNode } from "react";
import { useMotionPreference } from "@gpuixui/motion/react/presence";
import type { EventPayload } from "@gpuix/react";
import type { StateStyle } from "@gpuix/react/floating";
import { controlSize } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ButtonVariant } from "../core/variants.js";
import { defaultMessages, type PrimitiveMessages } from "../core/messages.js";
import { reducedMotionOf } from "../core/motion.js";
import {
  renderButton,
  ToolbarScope,
  type ButtonFocus,
  type ButtonProps,
  type ButtonState,
} from "./Button.js";
import {
  AttachedGroup,
  useFocus,
  type ActionHostProps,
  type InteractionProps,
  type TooltipTriggerProps,
} from "./internal.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

export interface IconButtonProps
  extends InteractionProps, TooltipTriggerProps, ActionHostProps {
  readonly label: string;

  readonly icon: ReactNode;

  readonly variant?: ButtonVariant;

  readonly size?: ControlSize;
  readonly disabled?: boolean;

  readonly loading?: boolean;

  readonly loadingLabel?: string;

  readonly reducedMotion?: boolean;

  readonly onActivate?: (event: EventPayload) => void;

  readonly style?: StateStyle<ButtonState>;

  readonly className?: string;
  readonly testId?: string;

  readonly tabIndex?: number;
}

export const iconButtonProps = (props: IconButtonProps): ButtonProps => {
  const {
    variant,
    size,
    disabled,
    loading,
    loadingLabel,
    reducedMotion,
    label,
    icon,
    onActivate,
    onClick,
    onMouseEnter,
    onMouseLeave,
    "aria-description": description,
    onKeyDown,
    onKeyUp,
    onFocus,
    onBlur,
    style,
    className,
    testId,
    tabIndex,

    ...host
  } = props;
  return {
    ...host,
    variant: variant ?? "ghost",
    size: size === undefined ? undefined : controlSize(size),
    square: true,
    disabled,
    loading,
    loadingLabel,
    reducedMotion,
    label,
    leading: icon,
    onActivate,
    onClick,
    onMouseEnter,
    onMouseLeave,
    "aria-description": description,
    onKeyDown,
    onKeyUp,
    onFocus,
    onBlur,
    style,
    className,
    testId,
    tabIndex,
  };
};

export const renderIconButton = (
  props: IconButtonProps,
  theme: PrimitiveTheme,
  focus: ButtonFocus,
  attached = false,
  messages: PrimitiveMessages = defaultMessages,
  inToolbar = false,
): ReactElement =>
  renderButton(
    iconButtonProps(props),
    theme,
    focus,
    attached,
    messages,
    inToolbar,
  );

export const IconButton = (props: IconButtonProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();

  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  return renderIconButton(
    { ...props, reducedMotion },
    theme,
    focus,
    useContext(AttachedGroup),
    useMessages(),
    useContext(ToolbarScope),
  );
};

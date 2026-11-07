/** @jsxImportSource @gpuix/react */
import {
  createContext,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { useMotionPreference } from "@gpuixui/motion/react/presence";
import { reducedMotionOf } from "../core/motion.js";
import { accessibleName } from "../core/a11y.js";
import {
  busyWord,
  defaultMessages,
  type PrimitiveMessages,
} from "../core/messages.js";
import {
  decideActivation,
  isPlainKey,
  swallowKeyDefault,
} from "../core/keyboard.js";
import { colorRole, controlSize, iconSideOf } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  variantSpinnerAccent,
  paintsFilledSurface,
  type ButtonVariant,
} from "../core/variants.js";
import { buttonClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  AttachedGroup,
  childrenName,
  composeEvent,
  composePress,
  mergeStyle,
  suppressFeedback,
  type ActionHostProps,
  type InteractionProps,
  type TooltipTriggerProps,
} from "./internal.js";
import { controlRing, keepContent } from "../core/focus.js";
import { Spinner } from "./Spinner.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

export const ToolbarScope = createContext(false);

export interface ButtonProps
  extends InteractionProps, TooltipTriggerProps, ActionHostProps {
  readonly variant?: ButtonVariant;

  readonly size?: ControlSize;

  readonly square?: boolean;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;

  readonly loading?: boolean;

  readonly loadingLabel?: string;

  readonly reducedMotion?: boolean;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;

  readonly label?: string;

  readonly onActivate?: (event: EventPayload) => void;

  readonly style?: StateStyle<ButtonState>;

  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;

  readonly tabIndex?: number;
}

export interface ButtonFocus {
  readonly focused: boolean;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
}

export interface ButtonState {
  readonly disabled: boolean;
  readonly focused: boolean;
}

const isBusy = (props: {
  readonly disabled?: boolean;
  readonly loading?: boolean;
}): boolean => props.disabled === true || props.loading === true;

export const renderButton = (
  props: ButtonProps,
  theme: PrimitiveTheme,
  focus: ButtonFocus,
  attached = false,
  messages: PrimitiveMessages = defaultMessages,

  inToolbar = false,
): ReactElement => {
  const {
    variant = "primary",
    size: requestedSize,
    square,
    fullWidth,
    disabled,
    loading,
    loadingLabel,
    reducedMotion,
    leading,
    trailing,
    label,
    onActivate,
    style: callerStyle,
    className,
    children,
    testId,
    tabIndex,
    onClick,
    onKeyDown,
    onKeyUp,
    onFocus,
    onBlur,
    onMouseEnter,
    onMouseLeave,
    "aria-description": description,

    ...host
  } = props;
  const size = controlSize(requestedSize);
  const busy = isBusy({ disabled, loading });

  const loadingWord = loadingLabel ?? busyWord(messages.loading);
  const activate = (event: EventPayload): void => {
    if (busy) return;
    onActivate?.(event);
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: KeyEvent): void => {
      if (!isPlainKey(event.modifiers)) return;
      if (swallowKeyDefault(event.key ?? "", phase)) event.preventDefault();
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        activate(event);
    };

  const resolved = recipeTw.classesToStyle(
    cn(
      buttonClass(variant, size, {
        square,
        fullWidth,
      }),
      className,
    ),
    theme,
  );
  const base =
    disabled === true
      ? suppressFeedback(mergeStyle(resolved.style, resolved.disabled))
      : theme.interaction === "appkit" && inToolbar
        ? mergeStyle(resolved.style, {
            hover: { backgroundColor: colorRole(theme, "muted") },
          })
        : resolved.style;
  const own = mergeStyle(
    paintsFilledSurface(variant) ? mergeStyle(base, keepContent) : base,
    controlRing(theme, { disabled }),
  );
  const shape = attached ? mergeStyle(own, { borderRadius: 0 }) : own;
  const style = mergeStyle(
    shape,
    resolveStyle(callerStyle, {
      disabled: busy,
      focused: focus.focused,
    }),
  );

  return (
    <div
      {...host}
      role="button"
      aria-label={accessibleName(label) ?? childrenName(children)}
      aria-description={
        loading === true
          ? accessibleName(loadingWord)
          : accessibleName(description)
      }
      tabIndex={tabIndex ?? (disabled === true ? -1 : 0)}
      testId={testId}
      onClick={composePress(busy, onClick, activate)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={composeEvent<EventPayload>(onFocus, focus.onFocus)}
      onBlur={composeEvent<EventPayload>(onBlur, focus.onBlur)}
      onKeyDown={composeEvent<KeyEvent>(onKey("down"), onKeyDown)}
      onKeyUp={composeEvent<KeyEvent>(onKey("up"), onKeyUp)}
      style={style}
    >
      {loading === true ? (
        <Spinner
          size={iconSideOf(theme, "sm")}
          accent={variantSpinnerAccent(variant, disabled)}
          label={loadingWord}
          reducedMotion={reducedMotion}
        />
      ) : (
        leading
      )}
      {children}
      {trailing}
    </div>
  );
};

export const Button = (props: ButtonProps): ReactElement => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  return renderButton(
    { ...props, reducedMotion },
    theme,
    {
      focused,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
    useContext(AttachedGroup),
    useMessages(),
    useContext(ToolbarScope),
  );
};

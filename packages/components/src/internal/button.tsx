/**
 * `Button` and `IconButton`: the local stand-in for `@gpuixui/primitives`.
 *
 * GPUix has no `button` element type — the types are `div`, `text`, `img`, `svg`,
 * `canvas`, `input`, `textarea`, `anchored`, `code`, `diff`, `markdown` and
 * `virtual-list` — and `@gpuix/react@0.10.0` ships neither `Button` nor
 * `buttonProps`. A button is therefore a `div` with `role="button"`, a tab stop
 * and Enter/Space activation, which is what a newer `@gpuix/react` does upstream.
 *
 * Both exports are replaced by `@gpuixui/primitives`' own the moment that package
 * lands; plan 110 §7 has the amendment and `TODO.md` → Interlocks the record.
 *
 * Known gap: `@gpuix/native@0.10.0` accepts no `aria-disabled`. A disabled
 * button leaves the tab order, drops its handlers, dims, and announces
 * `Disabled` through `aria-description` (plan 516).
 */

import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import { activationHandlers } from "./activate.js";
import { useFocusState } from "./focus.js";
import { useHoverGroupMember } from "./hover-group.js";
import { controlName } from "./name.js";
import { stateDescription } from "./state-description.js";
import {
  alpha,
  controlHeight,
  controlPaddingX,
  focusRing,
  textStyle,
  useTheme,
  type Theme,
} from "./theme.js";

/** The five looks a control can take. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/** The control heights the theme's density defines. */
export type ButtonSize = "sm" | "md" | "lg";

/** {@link Button} props. */
export interface ButtonProps extends Props {
  /** Default `"secondary"`. */
  readonly variant?: ButtonVariant;
  /** Default `"md"`. */
  readonly size?: ButtonSize;
  /** Leave the tab order, drop the handlers and dim. Never inferred. */
  readonly disabled?: boolean;
}

/** {@link IconButton} props. */
export interface IconButtonProps extends Props {
  /** The accessible name: an icon-only control shows no visible text. */
  readonly label: string;
  /** Default `"md"`. */
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
}

/** One variant's fill, text colour and interaction states. */
const variantStyle = (theme: Theme, value: ButtonVariant): StyleDesc =>
  Match.value(value).pipe(
    Match.when("primary", () => ({
      backgroundColor: theme.colors.primary,
      color: theme.colors.primaryForeground,
      // Tokens ship no `primaryHover`; a half-alpha fill is the closest honest
      // step, and the interlock records the missing role.
      hover: { backgroundColor: alpha(theme.colors.primary, 0.5) },
    })),
    Match.when("danger", () => ({
      backgroundColor: theme.colors.destructive,
      color: theme.colors.destructiveForeground,
      hover: {
        backgroundColor: alpha(theme.colors.destructive, 0.5),
      },
    })),
    Match.when("secondary", () => ({
      backgroundColor: theme.colors.secondary,
      color: theme.colors.secondaryForeground,
      borderWidth: theme.borderWidth.thin,
      borderColor: theme.colors.border,
      hover: { backgroundColor: theme.colors.hover },
      active: { backgroundColor: theme.colors.active },
    })),
    Match.when("ghost", () => ({
      color: theme.colors.foreground,
      hover: { backgroundColor: theme.colors.hover },
      active: { backgroundColor: theme.colors.active },
    })),
    Match.exhaustive,
  );

/** The control's box: type, height and padding from the theme, then its variant. */
const controlStyle = (
  theme: Theme,
  variant: ButtonVariant,
  size: ButtonSize,
): StyleDesc => ({
  ...textStyle(theme, "label"),
  ...variantStyle(theme, variant),
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing.sm,
  height: controlHeight(theme, size),
  paddingLeft: controlPaddingX(theme, size),
  paddingRight: controlPaddingX(theme, size),
  borderRadius: theme.radius.md,
});

/**
 * Click and key activation, muted when the control is disabled. A disabled
 * control keeps its own key handlers so a wrapper can still see keys bubble;
 * Enter fires on key down and Space on key up (`internal/activate.ts`).
 */
const activation = (
  disabled: boolean,
  onClick: Props["onClick"],
  onKeyDown: Props["onKeyDown"],
  onKeyUp: Props["onKeyUp"],
): Pick<Props, "onClick" | "onKeyDown" | "onKeyUp"> => ({
  onClick: disabled ? undefined : onClick,
  ...activationHandlers((event) => onClick?.(event), {
    disabled,
    onKeyDown,
    onKeyUp,
  }),
});

/**
 * A control's look when it is disabled: dimmed, out of the tab order, and inert
 * — the variant's hover and press diffs are cleared, because a control that
 * cannot be pressed must not light up under the pointer (plan 394).
 */
const disabledStyle = (disabled: boolean): StyleDesc =>
  disabled
    ? {
        opacity: 0.5,
        cursor: "not-allowed",
        hover: undefined,
        active: undefined,
      }
    : { opacity: 1, cursor: "pointer" };

/**
 * Strip interaction diffs a caller's `style` may reintroduce.
 * `disabledStyle` clears the variant's own hover/press, but the caller's style
 * merges last, and a wrapper that always supplies a hover would otherwise light
 * an inert control (plan 691).
 */
const inertInteraction = (
  disabled: boolean,
  resolved: StyleDesc | undefined,
): StyleDesc | undefined =>
  disabled && resolved !== undefined
    ? { ...resolved, hover: undefined, active: undefined }
    : resolved;

/**
 * A labelled action. `variant` picks the look, `size` the density-defined
 * height; the caller's `style` is merged last and wins.
 */
export const Button = ({
  variant = "secondary",
  size = "md",
  disabled = false,
  autoFocus = false,
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  style,
  children,
  ...rest
}: ButtonProps) => {
  const theme = useTheme();
  const [focused, setFocused] = useFocusState(autoFocus, disabled);
  const name = controlName(rest["aria-label"], children);
  const hoverMember = useHoverGroupMember(onMouseEnter, onMouseLeave);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      {...rest}
      {...hoverMember}
      {...(name === undefined ? {} : { "aria-label": name })}
      {...stateDescription(disabled, rest["aria-description"])}
      autoFocus={autoFocus && !disabled}
      {...activation(disabled, onClick, onKeyDown, onKeyUp)}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={inertInteraction(
        disabled,
        mergeStyles(
          {
            ...controlStyle(theme, variant, size),
            ...disabledStyle(disabled),
            ...(focused ? focusRing(theme) : {}),
          },
          style,
        ),
      )}
    >
      {children}
    </div>
  );
};

/**
 * A square, icon-only action. The glyph is the caller's `children`; the
 * accessible name is `label`, because there is no visible text to read.
 */
export const IconButton = ({
  label,
  size = "md",
  disabled = false,
  autoFocus = false,
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  style,
  ...rest
}: IconButtonProps) => {
  const theme = useTheme();
  const [focused, setFocused] = useFocusState(autoFocus, disabled);
  const side = controlHeight(theme, size);
  const hoverMember = useHoverGroupMember(onMouseEnter, onMouseLeave);

  return (
    <div
      role="button"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      {...rest}
      {...hoverMember}
      {...stateDescription(disabled, rest["aria-description"])}
      autoFocus={autoFocus && !disabled}
      {...activation(disabled, onClick, onKeyDown, onKeyUp)}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={inertInteraction(
        disabled,
        mergeStyles(
          {
            ...textStyle(theme, "label"),
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            width: side,
            height: side,
            borderRadius: theme.radius.md,
            color: theme.colors.mutedForeground,
            hover: {
              backgroundColor: theme.colors.hover,
              color: theme.colors.foreground,
            },
            active: { backgroundColor: theme.colors.active },
            ...disabledStyle(disabled),
            ...(focused ? focusRing(theme) : {}),
          },
          style,
        ),
      )}
    />
  );
};

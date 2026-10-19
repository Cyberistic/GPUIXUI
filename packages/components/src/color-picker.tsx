/**
 * ColorPicker: discrete swatches and a HEX field.
 *
 * The classic saturation/value square needs two gradients (white→hue and
 * transparent→black). `@gpuix/native@0.10.0` supports two-stop linear gradients
 * only and no radial gradient, so the square is not honestly expressible and is
 * not faked. The strongest honest picker is a keyboard-reachable swatch grid, a
 * HEX field that normalises what it is given, and a preview of the current
 * value. Alpha, HSL/RGB fields and an eyedropper are not in v1.
 *
 * 0.10.0 delivers no React `blur` for a native focus change, so a typed HEX
 * commits on `Enter`, `Tab` or a press outside the picker, and an invalid draft
 * reverts on the same signals.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import * as Option from "effect/Option";
import { useLayoutEffect, useState } from "react";
import { normalizeHex, sameHex } from "./color/hex.js";
import { activationHandlers } from "./internal/activate.js";
import { useControllableState } from "./internal/controllable.js";
import { useFocusState } from "./internal/focus.js";
import { isTab } from "./internal/key.js";
import { stateDescription } from "./internal/state-description.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
  type Theme,
} from "./internal/theme.js";

/** The six theme colours offered by default. */
const defaultSwatches = (theme: Theme): ReadonlyArray<string> => [
  theme.colors.primary,
  theme.colors.secondary,
  theme.colors.accent,
  theme.colors.muted,
  theme.colors.destructive,
  theme.colors.foreground,
];

/** {@link ColorPicker} props. */
export interface ColorPickerProps extends Omit<
  Props,
  "children" | "style" | "onChange"
> {
  /** The group's accessible name. */
  readonly label: string;
  /** The controlled normalised hex value. `undefined` means uncontrolled. */
  readonly value?: string;
  readonly defaultValue?: string;
  /** Every committed colour (a swatch press, or a valid typed hex). */
  readonly onValueChange?: (value: string) => void;
  /** Defaults to six theme colours. */
  readonly swatches?: ReadonlyArray<string>;
  readonly disabled?: boolean;
  /** A style, or a function of the field's state. */
  readonly style?: StateStyle<ColorPickerState>;
}

/** What the picker draws: whether it is disabled, and whether the draft is valid. */
export interface ColorPickerState {
  readonly disabled: boolean;
  readonly valid: boolean;
}

/** Swatches plus a HEX field, with a preview of the current colour. */
export const ColorPicker = ({
  label,
  value: valueProp,
  defaultValue = "#000000",
  onValueChange,
  swatches: swatchesProp,
  disabled = false,
  style,
  testId,
  onMouseDownOutside,
  ...rest
}: ColorPickerProps) => {
  const theme = useTheme();
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useFocusState(false, disabled);
  const [focusedSwatch, setFocusedSwatch] = useState<Option.Option<number>>(
    Option.none(),
  );
  const swatches = swatchesProp ?? defaultSwatches(theme);
  const valid = Option.isSome(normalizeHex(draft));

  // An external change (a swatch press or the caller) wins over a stale draft.
  useLayoutEffect(() => {
    setDraft(value);
  }, [value]);

  // A disabled picker is inert: a swatch focused before the app disabled it
  // must not keep the ring (plan 680).
  useLayoutEffect(() => {
    if (disabled) setFocusedSwatch(Option.none());
  }, [disabled]);

  const commit = (): void => {
    Option.match(normalizeHex(draft), {
      onNone: () => setDraft(value),
      onSome: (hex) => {
        setDraft(hex);
        if (hex !== value) setValue(hex);
      },
    });
  };

  const choose = (swatch: string): void => {
    const hex = Option.getOrElse(normalizeHex(swatch), () => swatch);
    setDraft(hex);
    setValue(hex);
  };

  return (
    <div
      role="group"
      aria-label={label}
      {...rest}
      {...stateDescription(disabled, rest["aria-description"])}
      testId={testId}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        if (!disabled) commit();
      }}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          opacity: disabled ? 0.5 : 1,
        },
        resolveStyle(style, { disabled, valid }),
      )}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.spacing.sm,
        }}
      >
        {swatches.map((swatch, index) => {
          const selected = sameHex(swatch, value);
          return (
            <div
              key={index}
              role="button"
              aria-label={swatch}
              aria-selected={selected}
              {...stateDescription(disabled)}
              testId={
                testId === undefined ? undefined : `${testId}-swatch-${index}`
              }
              tabIndex={disabled ? -1 : 0}
              onClick={() => {
                if (!disabled) choose(swatch);
              }}
              onFocus={() => setFocusedSwatch(Option.some(index))}
              onBlur={() => setFocusedSwatch(Option.none())}
              {...activationHandlers(() => choose(swatch), { disabled })}
              style={{
                width: controlHeight(theme, "sm"),
                height: controlHeight(theme, "sm"),
                backgroundColor: swatch,
                borderRadius: theme.radius.md,
                borderWidth: selected
                  ? theme.borderWidth.strong
                  : theme.borderWidth.thin,
                borderColor: selected
                  ? theme.colors.foreground
                  : theme.colors.border,
                ...(!disabled && Option.contains(focusedSwatch, index)
                  ? focusRing(theme)
                  : {}),
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <div
          testId={testId === undefined ? undefined : `${testId}-preview`}
          style={{
            width: controlHeight(theme, "md"),
            height: controlHeight(theme, "md"),
            borderRadius: theme.radius.md,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            backgroundColor: Option.getOrElse(
              normalizeHex(value),
              () => theme.colors.muted,
            ),
          }}
        />
        <input
          aria-label={`${label} hex value`}
          {...stateDescription(
            disabled,
            valid ? undefined : "Invalid hex colour",
          )}
          testId={testId === undefined ? undefined : `${testId}-hex`}
          value={draft}
          readOnly={disabled}
          {...(disabled ? { tabIndex: -1 } : {})}
          onSubmit={() => commit()}
          onChange={(event) => setDraft(event.value ?? "")}
          onKeyDown={(event) => {
            if (!disabled && isTab(event)) commit();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          style={{
            ...textStyle(theme, "body"),
            flexGrow: 1,
            height: controlHeight(theme, "md"),
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.md,
            backgroundColor: theme.colors.background,
            color: theme.colors.inputForeground,
            borderRadius: theme.radius.md,
            borderWidth: theme.borderWidth.thin,
            borderColor: valid ? theme.colors.border : theme.colors.destructive,
            ...(focused ? focusRing(theme) : {}),
          }}
        />
      </div>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const colorPickerMeta = {
  name: "Color picker",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  focusable: true,
  limitations: [
    "no saturation/value square: 0.10.0 supports two-stop linear gradients only and no radial gradient",
    "swatches plus HEX entry only; no alpha, HSL/RGB fields or eyedropper",
    "the HEX field commits on Enter, Tab or a press outside; an invalid draft is marked destructive and reverted when the edit ends",
  ],
  docs: "docs/color-picker.mdx",
  example: "examples/color-picker.example.tsx",
  testFile: "src/behaviour/color-picker.test.tsx",
} as const;

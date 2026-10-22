/**
 * ColorPicker: discrete swatches and a HEX field.
 *
 * The classic saturation/value square needs two gradients (white→hue and
 * transparent→black). `@gpuix/native@0.11.0` supports two-stop linear gradients
 * only and no radial gradient, so the square is not honestly expressible and is
 * not faked. The strongest honest picker is a keyboard-reachable swatch grid, a
 * HEX field that normalises what it is given, and a preview of the current
 * value. Alpha, HSL/RGB fields and an eyedropper are not in v1.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  cn,
  COLOR_PICKER_CELL,
  COLOR_PICKER_FIELD,
  COLOR_PICKER_INPUT,
  COLOR_PICKER_ROOT,
  COLOR_PICKER_SWATCHES,
} from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useLayoutEffect, useState } from "react";
import { normalizeHex, sameHex } from "./color/hex.js";
import { useControllableState } from "./internal/controllable.js";
import { activationHandlers } from "./internal/key.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlHeight,
  keepContent,
  controlRing,
  disabledFade,
  nativeTextTheme,
  selectionWash,
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

/**
 * The mark on the chosen swatch.
 *
 * A ring alone cannot mark an arbitrary colour: `foreground` is one of the six
 * default swatches, so a `foreground` edge around that swatch paints nothing,
 * and a caller's own colour can match any single role. The pip carries two
 * roles a theme keeps a body pair apart — the page fill behind it and the body
 * ink around it — so at most one of them can disappear into the swatch.
 */
const SelectedSwatch = ({
  testId,
  index,
}: {
  readonly testId: string | undefined;
  readonly index: number;
}) => {
  const theme = useTheme();

  return (
    <div
      testId={
        testId === undefined ? undefined : `${testId}-swatch-${index}-marker`
      }
      style={{
        width: theme.spacing.sm,
        height: theme.spacing.sm,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.background,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.foreground,
      }}
    />
  );
};

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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
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
  className,
  style,
  testId,
  ...rest
}: ColorPickerProps) => {
  const theme = useTheme();
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [draft, setDraft] = useState(value);
  const swatches = swatchesProp ?? defaultSwatches(theme);
  const valid = Option.isSome(normalizeHex(draft));

  // An external change (a swatch press or the caller) wins over a stale draft.
  useLayoutEffect(() => {
    setDraft(value);
  }, [value]);

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
      testId={testId}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(COLOR_PICKER_ROOT, className), theme), {
          ...disabledFade(disabled),
        }),
        resolveStyle(style, { disabled, valid }),
      )}
    >
      <div style={recipeStyle(COLOR_PICKER_SWATCHES, theme)}>
        {swatches.map((swatch, index) => {
          const selected = sameHex(swatch, value);
          return (
            <div
              key={index}
              role="button"
              aria-label={swatch}
              aria-selected={selected}
              testId={
                testId === undefined ? undefined : `${testId}-swatch-${index}`
              }
              tabIndex={disabled ? -1 : 0}
              onClick={() => {
                if (!disabled) choose(swatch);
              }}
              {...activationHandlers(() => {
                if (!disabled) choose(swatch);
              })}
              style={mergeStyles(recipeStyle(COLOR_PICKER_CELL, theme), {
                width: controlHeight(theme, "sm"),
                height: controlHeight(theme, "sm"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: swatch,
                borderWidth: selected
                  ? theme.borderWidth.strong
                  : theme.borderWidth.thin,
                borderColor: selected
                  ? theme.colors.foreground
                  : theme.colors.border,
                ...controlRing(theme, { disabled }),
              })}
            >
              {selected ? (
                <SelectedSwatch testId={testId} index={index} />
              ) : null}
            </div>
          );
        })}
      </div>
      <div style={recipeStyle(COLOR_PICKER_FIELD, theme)}>
        <div
          testId={testId === undefined ? undefined : `${testId}-preview`}
          style={mergeStyles(recipeStyle(COLOR_PICKER_CELL, theme), {
            width: controlHeight(theme, "md"),
            height: controlHeight(theme, "md"),
            backgroundColor: Option.getOrElse(
              normalizeHex(value),
              () => theme.colors.muted,
            ),
          })}
        />
        <input
          aria-label={`${label} hex value`}
          // The hex field paints the page role as its own fill.
          theme={nativeTextTheme(theme, "background")}
          {...(valid ? {} : { "aria-description": "Invalid hex colour" })}
          testId={testId === undefined ? undefined : `${testId}-hex`}
          value={draft}
          readOnly={disabled}
          onSubmit={() => commit()}
          onChange={(event) => setDraft(event.value ?? "")}
          onBlur={() => commit()}
          style={mergeStyles(recipeStyle(COLOR_PICKER_INPUT, theme), {
            height: controlHeight(theme, "md"),
            borderColor: valid ? theme.colors.border : theme.colors.destructive,
            ...controlRing(theme, { disabled, invalid: !valid }),
            ...selectionWash(theme),
            ...keepContent,
          })}
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
  limitations: [
    "no saturation/value square: 0.11.0 supports two-stop linear gradients only and no radial gradient",
    "swatches plus HEX entry only; no alpha, HSL/RGB fields or eyedropper",
    "the HEX field is validated on commit; an invalid draft is marked destructive and reverted on blur",
  ],
  docs: "docs/color-picker.mdx",
  example: "examples/color-picker.example.tsx",
  testFile: "src/behaviour/color-picker.test.tsx",
} as const;

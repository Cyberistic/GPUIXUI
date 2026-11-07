/** @jsxImportSource @gpuix/react */
import type { KeyEvent, Props, PublicInstance } from "@gpuix/react";
import { useGpuix, useWindowSize } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { accessibleName } from "@gpuixui/primitives/core";
import { IconButton } from "@gpuixui/primitives/button";
import { Icon } from "@gpuixui/icons";
import { Input } from "@gpuixui/primitives/input";
import {
  cn,
  COLOR_PICKER_FIELD,
  COLOR_PICKER_INPUT,
  COLOR_PICKER_PANEL,
  COLOR_PICKER_TRIGGER,
} from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { textOf } from "./internal/text.js";
import { isDismiss } from "./internal/key.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlRing,
  disabledFade,
  textStyle,
  useTheme,
} from "./internal/theme.js";
import {
  DEFAULT_COLOR_PICKER_LABEL,
  DEFAULT_COLOUR,
  Hsva,
  parseColor,
  storedDraft,
  storedSwatches,
  toHex,
} from "./color-picker/logic.js";
import {
  AlphaSlider,
  ColorArea,
  ColorChip,
  ContrastReadout,
  HueSlider,
  PresetRow,
} from "./color-picker/parts.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

const PANEL_WIDTH = 304;
const WINDOW_GUTTER = 32;

export interface ColorPickerProps extends Omit<
  Props,
  "children" | "style" | "onChange"
> {
  readonly label: string;

  readonly value?: string;

  readonly defaultValue?: string;

  readonly onValueChange?: (hex: string) => void;

  readonly background?: string;

  readonly swatches?: ReadonlyArray<string>;
  readonly disabled?: boolean;

  readonly className?: string;

  readonly style?: StateStyle<ColorPickerState>;
}

export interface ColorPickerState {
  readonly disabled: boolean;
  readonly valid: boolean;
}

const defaultSwatches = (colors: {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly muted: string;
  readonly destructive: string;
  readonly foreground: string;
}): ReadonlyArray<string> => [
  colors.primary,
  colors.secondary,
  colors.accent,
  colors.muted,
  colors.destructive,
  colors.foreground,
];

const initialOf = (colour: string | undefined): Hsva =>
  Option.getOrElse(
    parseColor(colour ?? DEFAULT_COLOUR),
    () => new Hsva({ h: 0, s: 0, v: 0, a: 1 }),
  );

export const ColorPicker = ({
  label,
  value,
  defaultValue = DEFAULT_COLOUR,
  onValueChange,
  background,
  swatches: swatchesProp,
  disabled = false,
  className,
  style,
  testId,
  ...rest
}: ColorPickerProps) => {
  const theme = useTheme();
  const window = useWindowSize();
  const { renderer } = useGpuix();
  const panel = useRef<PublicInstance | null>(null);
  const area = useRef<PublicInstance | null>(null);

  const stops = useRef<Array<PublicInstance | null>>([]);
  const stop = useMemo(
    () =>
      Array.from(
        { length: 32 },
        (_, index) =>
          (instance: PublicInstance | null): void => {
            stops.current[index] = instance;
          },
      ),
    [],
  );
  const setArea = useMemo(
    () =>
      (instance: PublicInstance | null): void => {
        area.current = instance;
        stops.current[1] = instance;
      },
    [],
  );
  const setPreset = useCallback(
    (index: number, instance: PublicInstance | null): void => {
      stops.current[5 + index] = instance;
    },
    [],
  );

  const name = accessibleName(textOf(label)) ?? DEFAULT_COLOR_PICKER_LABEL;
  const [hsva, setHsva] = useState<Hsva>(() => initialOf(defaultValue));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [invalid, setInvalid] = useState(false);
  const seen = useRef<Option.Option<string>>(Option.none());

  const storedValue = Option.getOrUndefined(storedDraft(value));
  useLayoutEffect(() => {
    if (storedValue === undefined) return;
    const same = Option.exists(seen.current, (last) => last === storedValue);
    seen.current = Option.some(storedValue);
    if (same) return;
    if (storedValue === toHex(hsva)) return;
    Option.match(parseColor(storedValue, hsva.h), {
      onNone: () => undefined,
      onSome: setHsva,
    });
  }, [storedValue, hsva]);

  const swatches = Option.getOrElse(storedSwatches(swatchesProp), () =>
    defaultSwatches(theme.colors),
  );
  const hex = toHex(hsva);
  const field = draft ?? hex;
  const surface = background ?? theme.colors.background;
  const state: ColorPickerState = { disabled, valid: !invalid };

  const commit = (next: Hsva): void => {
    if (disabled) return;
    const value = toHex(next);
    setHsva(next);
    if (value !== hex) onValueChange?.(value);
  };

  const commitDraft = (): void => {
    if (disabled || draft === undefined) return;
    Option.match(parseColor(draft, hsva.h), {
      onNone: () => setInvalid(true),
      onSome: (next) => {
        setDraft(undefined);
        setInvalid(false);
        commit(next);
      },
    });
  };

  const greeted = useRef(false);
  useLayoutEffect(() => {
    if (!open) greeted.current = false;
  }, [open]);

  const focusStep = (delta: -1 | 1): void => {
    const ids = stops.current.flatMap((entry) =>
      entry === null ? [] : [entry.id],
    );
    if (ids.length === 0) return;
    const current = renderer?.getFocusedElementId?.() ?? -1;
    const at = ids.indexOf(current);
    const index =
      at < 0
        ? delta > 0
          ? 0
          : ids.length - 1
        : (at + delta + ids.length) % ids.length;
    const next = ids[index];
    if (next !== undefined) renderer?.focusElement?.(next);
  };

  const close = (): void => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...rest}
        testId={testId}
        label={name}
        disabled={disabled}
        className={cn(COLOR_PICKER_TRIGGER, className)}
        style={mergeStyles(
          { height: theme.spacing["3xl"] + theme.spacing.lg },
          resolveStyle(style, state),
        )}
      >
        <ColorChip
          hsva={hsva}
          size={theme.iconSize.xl + theme.spacing.xs}
          testId={testId === undefined ? undefined : `${testId}-swatch`}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            textAlign: "start",
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {name}
          </text>
          <text style={{ ...textStyle(theme, "bodyStrong") }}>{hex}</text>
        </div>
      </PopoverTrigger>
      <PopoverContent
        ref={panel}
        testId={testId === undefined ? undefined : `${testId}-panel`}
        side="bottom"
        align="start"
        sideOffset={6}
        className={COLOR_PICKER_PANEL}
        style={{
          width: Math.min(PANEL_WIDTH, window.width - WINDOW_GUTTER),
          padding: theme.spacing.lg,
          ...disabledFade(disabled),
        }}
      >
        <div
          onKeyDown={(event: KeyEvent) => {
            if (event.key !== "tab") return;
            event.preventDefault();
            event.stopPropagation();
            focusStep(event.modifiers?.shift === true ? -1 : 1);
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
            }}
          >
            <ColorChip
              hsva={hsva}
              size={theme.iconSize.xl + theme.spacing.xs}
            />
            <div
              style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {name}
              </text>
              <text style={{ ...textStyle(theme, "bodyStrong") }}>{hex}</text>
            </div>
            <IconButton
              ref={stop[0]}
              label="Done"
              size="sm"
              testId={testId === undefined ? undefined : `${testId}-done`}
              icon={
                <Icon name="check" size="md" color={theme.colors.foreground} />
              }
              onActivate={close}
            />
          </div>

          <ColorArea
            ref={setArea}
            onMeasured={() => {
              if (!open || greeted.current) return;
              greeted.current = true;
              const id = area.current?.id;
              if (id !== undefined) renderer?.focusElement?.(id);
            }}
            label={`${name} saturation and brightness`}
            hsva={hsva}
            disabled={disabled}
            onChange={commit}
            testId={testId === undefined ? undefined : `${testId}-area`}
          />
          <HueSlider
            ref={stop[2]}
            label={`${name} hue`}
            hue={hsva.h}
            disabled={disabled}
            onChange={(hue) => commit(new Hsva({ ...hsva, h: hue }))}
            testId={testId === undefined ? undefined : `${testId}-hue`}
          />
          <AlphaSlider
            ref={stop[3]}
            label={`${name} opacity`}
            hsva={hsva}
            disabled={disabled}
            onChange={(alpha) => commit(new Hsva({ ...hsva, a: alpha }))}
            testId={testId === undefined ? undefined : `${testId}-alpha`}
          />

          <div style={recipeStyle(COLOR_PICKER_FIELD, theme)}>
            <Input
              ref={stop[4]}
              tabIndex={disabled ? -1 : 0}
              label={`${name} hex value`}
              testId={testId === undefined ? undefined : `${testId}-hex`}
              value={field}
              invalid={invalid}
              disabled={disabled}
              fullWidth
              className={COLOR_PICKER_INPUT}
              style={controlRing(theme, { disabled, invalid })}
              onChange={(next: string) => {
                setDraft(next);
                setInvalid(false);
              }}
              onSubmit={() => commitDraft()}
              onKeyDown={(event: KeyEvent) => {
                if (isDismiss(event) && draft !== undefined) {
                  setDraft(undefined);
                  setInvalid(false);
                }
              }}
              onBlur={() => {
                if (invalid) {
                  setDraft(undefined);
                  setInvalid(false);
                  return;
                }
                commitDraft();
              }}
            />
          </div>
          {invalid ? (
            <text
              testId={testId === undefined ? undefined : `${testId}-error`}
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.destructive,
              }}
            >
              Enter a hex colour, such as #2F6BFF or #2F6BFF80
            </text>
          ) : undefined}

          <ContrastReadout hsva={hsva} background={surface} />
          <PresetRow
            swatches={swatches}
            value={hsva}
            disabled={disabled}
            onInstance={setPreset}
            onSelect={(preset) => {
              Option.match(parseColor(preset, hsva.h), {
                onNone: () => undefined,
                onSome: commit,
              });
            }}
            testId={testId === undefined ? undefined : `${testId}-preset`}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const colorPickerMeta = {
  name: "Color picker",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no `transform`: the area's thumb is placed by the area's own measured box, not by a translated centre",
    "a gradient is two stops: the area is three stacked fills and the hue rail six ramps; there is no radial or conic gradient",
    "no repeating gradient: the alpha rail fades to the panel fill instead of painting a checkerboard",
    "no screen sampling: the eyedropper is absent, not a button that reports nothing",
    "hex is the only grammar; rgb(), hsl() and oklch() entry is not parsed",
    "no `aria-roledescription` or `aria-valuenow`: the area announces saturation and brightness through `aria-valuetext`",
    "presets are one `Button` per colour; there is no saved-palette add, delete or reorder",
    "a blank label reads as `Color picker`, so the trigger and the field are always named",
  ],
  docs: "docs/color-picker.mdx",
  example: "examples/color-picker.example.tsx",
  testFile: "src/behaviour/color-picker.test.tsx",
} as const;

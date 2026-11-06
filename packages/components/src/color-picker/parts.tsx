/** @jsxImportSource @gpuix/react */
import type {
  EventPayload,
  KeyEvent,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Button } from "@gpuixui/primitives/button";
import { primaryButton } from "@gpuixui/primitives/core";
import {
  Slider,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "@gpuixui/primitives/slider";
import {
  COLOR_PICKER_AREA,
  COLOR_PICKER_CELL,
  COLOR_PICKER_CONTRAST,
  COLOR_PICKER_ROW,
  COLOR_PICKER_SWATCHES,
} from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useMemo, useRef, useState, type Ref } from "react";
import { useMergedRef } from "../internal/ref.js";
import { recipeStyle } from "../internal/recipe.js";
import {
  controlRing,
  disabledFade,
  statusTone,
  textStyle,
  useTheme,
} from "../internal/theme.js";
import {
  contrast,
  grade,
  HUE_STOPS,
  Hsva,
  opaqueHex,
  sameColor,
  toHex,
  type Grade,
} from "./logic.js";

const AREA_HEIGHT = 148;

const THUMB = 20;

const THUMB_RING = 3;

const AREA_STEP = 0.01;
const AREA_BIG_STEP = 0.1;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

const pureHue = (hue: number): string =>
  opaqueHex(new Hsva({ h: hue, s: 1, v: 1, a: 1 }));

const ramp = (from: string, to: string, angle: number): StyleDesc => ({
  background: {
    type: "linear-gradient",
    angle,
    stops: [
      { color: from, position: 0 },
      { color: to, position: 1 },
    ],
  },
});

export const areaLayers: ReadonlyArray<StyleDesc> = [
  ramp("#FFFFFF", "#FFFFFF00", 90),
  ramp("#000000", "#00000000", 0),
];

export const hueLayers: ReadonlyArray<StyleDesc> = HUE_STOPS.slice(0, 6).map(
  (stop, index) => ramp(stop, HUE_STOPS[index + 1] ?? stop, 90),
);

const thumbStyle = (fill: string): StyleDesc => ({
  width: THUMB,
  height: THUMB,
  backgroundColor: fill,
  borderWidth: THUMB_RING,
  borderColor: "#FFFFFF",
  boxShadow: {
    offsetX: 0,
    offsetY: 1,
    blurRadius: 4,
    spreadRadius: 0,
    color: "#00000059",
  },
});

export interface ColorChipProps {
  readonly hsva: Hsva;
  readonly size: number;
  readonly testId?: string;
}

export const ColorChip = ({ hsva, size, testId }: ColorChipProps) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      style={mergeStyles(recipeStyle(COLOR_PICKER_CELL, theme), {
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: toHex(hsva),

        pointerEvents: "none",
      })}
    />
  );
};

export interface ColorAreaProps {
  readonly label: string;
  readonly hsva: Hsva;
  readonly disabled?: boolean;
  readonly onChange: (next: Hsva) => void;
  readonly testId?: string;
  readonly ref?: Ref<PublicInstance>;

  readonly onMeasured?: () => void;
}

export const ColorArea = ({
  label,
  hsva,
  disabled = false,
  onChange,
  testId,
  ref,
  onMeasured,
}: ColorAreaProps) => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const instance = useRef<PublicInstance | null>(null);
  const setInstance = useMergedRef<PublicInstance | null>(instance, ref);
  const dragging = useRef(false);
  const [size, setSize] = useState<
    { readonly width: number; readonly height: number } | undefined
  >(undefined);

  const read = (event: EventPayload): void => {
    const id = instance.current?.id;
    const box = id === undefined ? undefined : renderer?.getElementBounds?.(id);
    if (box === null || box === undefined) return;
    if (event.x === undefined || event.y === undefined) return;
    onChange(
      new Hsva({
        ...hsva,
        s: clamp((event.x - box.x) / box.width),
        v: 1 - clamp((event.y - box.y) / box.height),
      }),
    );
  };

  const step = (event: KeyEvent): readonly [number, number] | undefined => {
    const amount = event.modifiers?.shift === true ? AREA_BIG_STEP : AREA_STEP;
    const key = event.key;
    if (key === "right") return [amount, 0];
    if (key === "left") return [-amount, 0];
    if (key === "up") return [0, amount];
    if (key === "down") return [0, -amount];
    return undefined;
  };

  const left = size === undefined ? 0 : hsva.s * size.width - THUMB / 2;
  const top = size === undefined ? 0 : (1 - hsva.v) * size.height - THUMB / 2;

  return (
    <div
      ref={setInstance}
      role="slider"
      aria-label={label}
      aria-valuetext={`Saturation ${Math.round(hsva.s * 100)}%, brightness ${Math.round(hsva.v * 100)}%`}
      tabIndex={disabled ? -1 : 0}
      testId={testId}
      onLayout={(event) => {
        setSize({ width: event.width ?? 0, height: event.height ?? 0 });
        onMeasured?.();
      }}
      onMouseDown={(event) => {
        if (disabled || !primaryButton(event)) return;
        dragging.current = true;
        read(event);
      }}
      onMouseMove={(event) => {
        if (disabled || !dragging.current) return;
        if (event.pressedButton !== 0) {
          dragging.current = false;
          return;
        }
        read(event);
      }}
      onMouseUp={() => {
        dragging.current = false;
      }}
      onKeyDown={(event) => {
        const move = step(event);
        if (disabled || move === undefined) return;
        onChange(
          new Hsva({
            ...hsva,
            s: clamp(hsva.s + move[0]),
            v: clamp(hsva.v + move[1]),
          }),
        );
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(COLOR_PICKER_AREA, theme), {
          height: AREA_HEIGHT,
          backgroundColor: pureHue(hsva.h),
          cursor: disabled ? "not-allowed" : "crosshair",
          ...disabledFade(disabled),
        }),
        controlRing(theme, { disabled }),
      )}
    >
      {areaLayers.map((layer, index) => (
        <div
          key={index}
          style={{
            ...layer,
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: theme.radius.xl,
            pointerEvents: "none",
          }}
        />
      ))}
      <div
        testId={testId === undefined ? undefined : `${testId}-thumb`}
        style={{
          position: "absolute",
          left,
          top,
          width: THUMB,
          height: THUMB,
          borderRadius: theme.radius.full,
          backgroundColor: opaqueHex(hsva),
          borderWidth: THUMB_RING,
          borderColor: "#FFFFFF",
          boxShadow: {
            offsetX: 0,
            offsetY: 2,
            blurRadius: 8,
            spreadRadius: 0,
            color: "#0000004D",
          },
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export interface HueSliderProps {
  readonly label: string;
  readonly hue: number;
  readonly disabled?: boolean;
  readonly onChange: (hue: number) => void;
  readonly testId?: string;
  readonly ref?: Ref<PublicInstance>;
}

export const HueSlider = ({
  label,
  hue,
  disabled = false,
  onChange,
  testId,
  ref,
}: HueSliderProps) => {
  const theme = useTheme();
  return (
    <div style={recipeStyle(COLOR_PICKER_ROW, theme)}>
      <Slider
        ref={ref}
        label={label}
        disabled={disabled}
        min={0}
        max={360}
        step={1}
        value={Math.round(hue) % 360}
        formatValue={(value) => `${Math.round(value)} degrees`}
        onValueChange={(value) => onChange(value % 360)}
        testId={testId}
      >
        <SliderTrack
          style={{
            position: "relative",
            height: theme.spacing.md,
            backgroundColor: "transparent",
            borderRadius: theme.radius.full,
            overflow: "hidden",
          }}
        >
          {hueLayers.map((layer, index) => (
            <div
              key={index}
              style={{
                ...layer,
                width: `${100 / hueLayers.length}%`,
                height: "100%",
                flexShrink: 0,
                pointerEvents: "none",
              }}
            />
          ))}
          <SliderIndicator style={{ backgroundColor: "transparent" }} />
          <SliderThumb style={thumbStyle(pureHue(hue))} />
        </SliderTrack>
      </Slider>
    </div>
  );
};

export interface AlphaSliderProps {
  readonly label: string;
  readonly hsva: Hsva;
  readonly disabled?: boolean;
  readonly onChange: (alpha: number) => void;
  readonly testId?: string;
  readonly ref?: Ref<PublicInstance>;
}

export const AlphaSlider = ({
  label,
  hsva,
  disabled = false,
  onChange,
  testId,
  ref,
}: AlphaSliderProps) => {
  const theme = useTheme();
  const opaque = opaqueHex(hsva);
  return (
    <div style={recipeStyle(COLOR_PICKER_ROW, theme)}>
      <Slider
        ref={ref}
        label={label}
        disabled={disabled}
        min={0}
        max={100}
        step={1}
        value={Math.round(hsva.a * 100)}
        formatValue={(value) => `${Math.round(value)}%`}
        onValueChange={(value) => onChange(value / 100)}
        testId={testId}
      >
        <SliderTrack
          style={{
            ...ramp(`${opaque}00`, opaque, 90),
            position: "relative",
            height: theme.spacing.md,
            borderRadius: theme.radius.full,
          }}
        >
          <SliderIndicator style={{ backgroundColor: "transparent" }} />
          <SliderThumb style={thumbStyle(opaque)} />
        </SliderTrack>
      </Slider>
    </div>
  );
};

export interface PresetSwatchProps {
  readonly value: string;
  readonly selected: boolean;
  readonly disabled?: boolean;
  readonly onSelect: (value: string) => void;
  readonly testId?: string;
  readonly ref?: Ref<PublicInstance>;
}

export const PresetSwatch = ({
  value,
  selected,
  disabled = false,
  onSelect,
  testId,
  ref,
}: PresetSwatchProps) => {
  const theme = useTheme();
  const size = theme.iconSize.xl;
  return (
    <Button
      ref={ref}
      testId={testId}
      variant="ghost"
      size="sm"
      square
      disabled={disabled}
      label={value}
      aria-selected={selected}
      onActivate={() => onSelect(value)}
      style={{
        width: size,
        height: size,
        padding: 0,
        borderRadius: theme.radius.full,
        backgroundColor: value,
        borderWidth: selected
          ? theme.borderWidth.strong
          : theme.borderWidth.thin,
        borderColor: selected ? theme.colors.foreground : theme.colors.border,
      }}
    >
      {selected ? (
        <div
          testId={testId === undefined ? undefined : `${testId}-marker`}
          style={{
            width: theme.spacing.sm,
            height: theme.spacing.sm,
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.background,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.foreground,
          }}
        />
      ) : undefined}
    </Button>
  );
};

export interface PresetRowProps {
  readonly swatches: ReadonlyArray<string>;
  readonly value: Hsva;
  readonly disabled?: boolean;
  readonly onSelect: (value: string) => void;
  readonly testId?: string;

  readonly onInstance?: (
    index: number,
    instance: PublicInstance | null,
  ) => void;
}

export const PresetRow = ({
  swatches,
  value,
  disabled = false,
  onSelect,
  testId,
  onInstance,
}: PresetRowProps) => {
  const theme = useTheme();
  const current = toHex(value);

  const refFor = useMemo(
    () =>
      swatches.map(
        (_, index) => (instance: PublicInstance | null) =>
          onInstance?.(index, instance),
      ),
    [swatches, onInstance],
  );
  return (
    <div
      role="group"
      aria-label="Preset colours"
      style={recipeStyle(COLOR_PICKER_SWATCHES, theme)}
    >
      {swatches.map((swatch, index) => (
        <PresetSwatch
          key={`${swatch}-${index}`}
          value={swatch}
          selected={sameColor(swatch, current)}
          disabled={disabled}
          onSelect={onSelect}
          testId={testId === undefined ? undefined : `${testId}-${index}`}
          ref={refFor[index]}
        />
      ))}
    </div>
  );
};

const gradeTone = (value: Grade): "success" | "warning" | "destructive" =>
  value === "Fails"
    ? "destructive"
    : value === "AA large"
      ? "warning"
      : "success";

export interface ContrastReadoutProps {
  readonly hsva: Hsva;
  readonly background: string;
}

export const ContrastReadout = ({ hsva, background }: ContrastReadoutProps) => {
  const theme = useTheme();
  const measured = Option.getOrElse(contrast(hsva, background), () => 1);
  const value = grade(measured);
  const tone = statusTone(theme, gradeTone(value));

  return (
    <div style={recipeStyle(COLOR_PICKER_CONTRAST, theme)}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: theme.spacing["3xl"] + theme.spacing.xs,
          height: theme.spacing["2xl"] + theme.spacing.xs,
          flexShrink: 0,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: background,
          color: opaqueHex(hsva),
        }}
      >
        <text style={{ ...textStyle(theme, "label") }}>Aa</text>
      </div>
      <text style={{ ...textStyle(theme, "bodyStrong") }}>
        {`${measured.toFixed(2)}:1`}
      </text>
      <text
        style={{
          ...textStyle(theme, "caption"),
          flexGrow: 1,
          color: theme.colors.mutedForeground,
        }}
      >
        against background
      </text>
      <div
        style={{
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
          paddingTop: theme.spacing["2xs"],
          paddingBottom: theme.spacing["2xs"],
          borderRadius: theme.radius.full,
          backgroundColor: tone.background,
          color: tone.foreground,
        }}
      >
        <text style={{ ...textStyle(theme, "caption") }}>{value}</text>
      </div>
    </div>
  );
};

/**
 * `Slider` and `RangeSlider` — a value on a track.
 *
 * GPUix publishes **no slider** (plan 020 §1.5): there is a `div`, a style
 * object and real mouse/key events, and the rest is this package's. The
 * arithmetic lives in `core/value.ts`, the paint in `core/style.ts`, and this
 * file owns only what is irreducible here — reading the track's box from the
 * renderer so a pointer becomes a value, the drag flag, and focus.
 *
 * A gesture is the **primary button** only. The runtime captures the pointer on
 * the pressed element, so a drag keeps updating after it leaves the track and
 * clamps at the ends (measured, plan 063 §0); `event.button`/`pressedButton`
 * are the runtime's own 0/1/2 encoding.
 *
 * **One runtime limit is structural, not a defect:** there is no
 * `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, so the value reaches
 * assistive technology through `aria-valuetext` only.
 *
 * `RangeSlider` is a different ARIA contract from `Slider` — two sliders in one
 * group rather than one slider with an array value — so it is a second
 * component, not a mode of the first.
 */

import { useRef, useState, type ReactElement } from "react";
import type {
  EventPayload,
  NativeRenderer,
  PublicInstance,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import * as Option from "effect/Option";
import {
  clampValue,
  decideValueKey,
  moveSpanEnd,
  nearestEnd,
  normalizeRange,
  normalizeSpan,
  pointerValue,
  valueFraction,
  type ValueRange,
  type ValueSpan,
} from "../core/value.js";
import {
  sliderFillStyle,
  sliderInset,
  sliderRailStyle,
  sliderThumbStyle,
  sliderTrackStyle,
  type SliderSpec,
} from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `Slider` style callback receives. */
export interface SliderState {
  readonly disabled: boolean;
  readonly invalid: boolean;
}

/** The public state a `RangeSlider` style callback receives. */
export interface RangeSliderState {
  readonly disabled: boolean;
  readonly invalid: boolean;
}

/** The public state a `Slider` thumb callback receives. */
export interface SliderThumbState {
  readonly focused: boolean;
  readonly disabled: boolean;
  readonly invalid: boolean;
}

/** The public state a `RangeSlider` thumb callback receives. */
export interface RangeSliderThumbState extends SliderThumbState {
  readonly end: "start" | "end";
}

/** A single value on a track. */
export interface SliderProps {
  /** Controlled value. Omit to let the slider hold its own. */
  readonly value?: number;
  readonly defaultValue?: number;
  readonly onChange?: (value: number) => void;
  /** Defaults to 0. */
  readonly min?: number;
  /** Defaults to 100. */
  readonly max?: number;
  /** Defaults to 1. `0` makes the slider continuous. */
  readonly step?: number;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  /** A failed validation paints the destructive role, like a field. */
  readonly invalid?: boolean;
  /** Accessible name. */
  readonly label?: string;
  /** How the value is announced. Defaults to `String(value)`. */
  readonly formatValue?: (value: number) => string;
  /** An object, or a callback over the slider's public state. */
  readonly style?: StateStyle<SliderState>;
  /** An object, or a callback over the thumb's own state. Merged last. */
  readonly thumbStyle?: StateStyle<SliderThumbState>;
  readonly testId?: string;
}

/** Two values on one track. */
export interface RangeSliderProps {
  readonly value?: readonly [number, number];
  readonly defaultValue?: readonly [number, number];
  readonly onChange?: (value: readonly [number, number]) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** The group's name; each thumb becomes "<label> minimum"/"<label> maximum". */
  readonly label?: string;
  readonly formatValue?: (value: number) => string;
  /** An object, or a callback over the range slider's public state. */
  readonly style?: StateStyle<RangeSliderState>;
  /** An object, or a callback over each thumb's own state. Merged last. */
  readonly thumbStyle?: StateStyle<RangeSliderThumbState>;
  readonly testId?: string;
}

/** The range a slider was configured with, normalised. */
export const sliderRange = (props: {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}): ValueRange =>
  normalizeRange({
    min: props.min ?? 0,
    max: props.max ?? 100,
    step: props.step ?? 1,
  });

/** The text a slider announces. */
export const sliderValueText = (
  value: number,
  formatValue?: (value: number) => string,
): string => formatValue?.(value) ?? String(value);

/** What a rendered slider needs from the component that owns its state. */
export interface SliderHandlers {
  readonly onValueChange: (next: number) => void;
  readonly registerTrack: (instance: PublicInstance | null) => void;
  readonly onPointerDown: (event: EventPayload) => void;
  readonly onPointerMove: (event: EventPayload) => void;
  readonly onPointerUp: () => void;
}

export const renderSlider = (
  props: SliderProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  focus: FocusState,
  handlers: SliderHandlers,
): ReactElement => {
  const range = sliderRange(props);
  const value = clampValue(state.current, range);
  const spec: SliderSpec = {
    size: props.size ?? "md",
    invalid: props.invalid,
    disabled: props.disabled,
    focused: focus.focused,
  };
  return (
    <div
      ref={handlers.registerTrack}
      role="slider"
      aria-label={props.label}
      aria-valuetext={sliderValueText(value, props.formatValue)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onMouseDown={handlers.onPointerDown}
      onMouseMove={handlers.onPointerMove}
      onMouseUp={handlers.onPointerUp}
      onKeyDown={(event) => {
        if (props.disabled === true) return;
        Option.match(decideValueKey(value, range, event.key ?? ""), {
          onNone: () => {},
          onSome: handlers.onValueChange,
        });
      }}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={resolvePartStyle(sliderTrackStyle(spec, theme), props.style, {
        disabled: props.disabled === true,
        invalid: props.invalid === true,
      })}
    >
      <div style={sliderRailStyle(theme)}>
        <div
          style={sliderFillStyle(valueFraction(value, range), spec, theme)}
        />
        <div
          testId={
            props.testId === undefined ? undefined : `${props.testId}-thumb`
          }
          style={resolvePartStyle(
            sliderThumbStyle(spec, theme),
            props.thumbStyle,
            {
              focused: focus.focused,
              disabled: props.disabled === true,
              invalid: props.invalid === true,
            },
          )}
        />
      </div>
    </div>
  );
};

/** Which thumb holds focus, and how the group learns that it moved. */
export interface RangeSliderFocus {
  readonly focusedIndex: Option.Option<0 | 1>;
  readonly onFocus: (index: 0 | 1) => void;
  readonly onBlur: (index: 0 | 1) => void;
}

export interface RangeSliderHandlers {
  readonly onSpanChange: (next: readonly [number, number]) => void;
  readonly registerTrack: (instance: PublicInstance | null) => void;
  readonly registerThumb: (
    index: 0 | 1,
  ) => (instance: PublicInstance | null) => void;
  readonly onPointerDown: (event: EventPayload) => void;
  readonly onPointerMove: (event: EventPayload) => void;
  readonly onPointerUp: () => void;
}

const spanOf = (
  values: readonly [number, number],
  range: ValueRange,
): ValueSpan => normalizeSpan({ start: values[0], end: values[1] }, range);

const spanTuple = (span: ValueSpan): readonly [number, number] => [
  span.start,
  span.end,
];

/** The two thumbs and the fill between them. */
export const renderRangeSlider = (
  props: RangeSliderProps,
  theme: PrimitiveTheme,
  state: ValueState<readonly [number, number]>,
  focus: RangeSliderFocus,
  handlers: RangeSliderHandlers,
): ReactElement => {
  const range = sliderRange(props);
  const span = spanOf(state.current, range);
  const base: SliderSpec = {
    size: props.size ?? "md",
    invalid: props.invalid,
    disabled: props.disabled,
  };
  const labels =
    props.label === undefined
      ? ([undefined, undefined] as const)
      : ([`${props.label} minimum`, `${props.label} maximum`] as const);
  const thumb = (index: 0 | 1): ReactElement => {
    const value = index === 0 ? span.start : span.end;
    const end = index === 0 ? "start" : "end";
    const focused = Option.exists(
      focus.focusedIndex,
      (focusedIndex) => focusedIndex === index,
    );
    return (
      <div
        ref={handlers.registerThumb(index)}
        role="slider"
        aria-label={labels[index]}
        aria-valuetext={sliderValueText(value, props.formatValue)}
        tabIndex={props.disabled === true ? undefined : 0}
        onFocus={() => focus.onFocus(index)}
        onBlur={() => focus.onBlur(index)}
        onKeyDown={(event) => {
          if (props.disabled === true) return;
          Option.match(decideValueKey(value, range, event.key ?? ""), {
            onNone: () => {},
            onSome: (next) =>
              handlers.onSpanChange(
                spanTuple(moveSpanEnd(span, end, next, range)),
              ),
          });
        }}
        testId={
          props.testId === undefined
            ? undefined
            : `${props.testId}-thumb-${end}`
        }
        style={resolvePartStyle(
          sliderThumbStyle({ ...base, focused }, theme),
          props.thumbStyle,
          {
            end,
            focused,
            disabled: props.disabled === true,
            invalid: props.invalid === true,
          },
        )}
      />
    );
  };
  return (
    <div
      ref={handlers.registerTrack}
      role="group"
      aria-label={props.label}
      testId={props.testId}
      onMouseDown={handlers.onPointerDown}
      onMouseMove={handlers.onPointerMove}
      onMouseUp={handlers.onPointerUp}
      style={resolvePartStyle(sliderTrackStyle(base, theme), props.style, {
        disabled: props.disabled === true,
        invalid: props.invalid === true,
      })}
    >
      <div style={sliderRailStyle(theme)}>
        <div
          style={sliderFillStyle(valueFraction(span.start, range), base, theme)}
        />
        {thumb(0)}
        <div
          style={sliderFillStyle(
            valueFraction(span.end, range) - valueFraction(span.start, range),
            base,
            theme,
          )}
        />
        {thumb(1)}
      </div>
    </div>
  );
};

/** A pointer position on the track, as a value, or nothing without a box. */
const pointerOf = (
  event: EventPayload,
  renderer: NativeRenderer | null,
  trackId: number | null,
  range: ValueRange,
  inset: number,
): Option.Option<number> => {
  if (trackId === null) return Option.none();
  const box = renderer?.getElementBounds?.(trackId);
  if (box === null || box === undefined) return Option.none();
  return Option.some(
    clampValue(pointerValue(event.x ?? 0, box, range, inset), range),
  );
};

/** A value on a track, by click, drag or keyboard. */
export const Slider = (props: SliderProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const focus = useFocus();
  const range = sliderRange(props);
  const trackId = useRef<number | null>(null);
  const dragging = useRef(false);
  const state = useControlState(
    props.value,
    clampValue(props.defaultValue ?? range.min, range),
    props.onChange,
  );
  const inset = sliderInset(props.size ?? "md", theme);
  const apply = (event: EventPayload): void =>
    Option.match(pointerOf(event, renderer, trackId.current, range, inset), {
      onNone: () => {},
      onSome: state.set,
    });
  return renderSlider(props, theme, state.value, focus, {
    onValueChange: state.set,
    registerTrack: (instance) => {
      trackId.current = instance?.id ?? null;
    },
    onPointerDown: (event) => {
      if (props.disabled === true || event.button !== 0) return;
      dragging.current = true;
      apply(event);
    },
    onPointerMove: (event) => {
      if (props.disabled === true || !dragging.current) return;
      if (event.pressedButton !== 0) {
        dragging.current = false;
        return;
      }
      apply(event);
    },
    onPointerUp: () => {
      dragging.current = false;
    },
  });
};

/** Two values on one track. */
export const RangeSlider = (props: RangeSliderProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const range = sliderRange(props);
  const initial = spanOf(
    [
      props.defaultValue?.[0] ?? range.min,
      props.defaultValue?.[1] ?? range.max,
    ] as const,
    range,
  );
  const trackId = useRef<number | null>(null);
  const thumbIds = useRef<Map<0 | 1, number>>(new Map());
  const activeEnd = useRef<"start" | "end">("start");
  const dragging = useRef(false);
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<0 | 1>>(
    Option.none(),
  );
  const state = useControlState<readonly [number, number]>(
    props.value,
    [initial.start, initial.end],
    props.onChange,
  );
  const inset = sliderInset(props.size ?? "md", theme);
  const focusThumb = (index: 0 | 1): void => {
    Option.match(Option.fromNullishOr(thumbIds.current.get(index)), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
    setFocusedIndex(Option.some(index));
  };
  const change = (span: ValueSpan, end: "start" | "end", value: number): void =>
    state.set(spanTuple(moveSpanEnd(span, end, value, range)));
  return renderRangeSlider(
    props,
    theme,
    state.value,
    {
      focusedIndex,
      onFocus: (index) => setFocusedIndex(Option.some(index)),
      onBlur: (index) =>
        setFocusedIndex((current) =>
          Option.filter(current, (focused) => focused !== index),
        ),
    },
    {
      onSpanChange: state.set,
      registerTrack: (instance) => {
        trackId.current = instance?.id ?? null;
      },
      registerThumb: (index) => (instance) => {
        if (instance === null) thumbIds.current.delete(index);
        else thumbIds.current.set(index, instance.id);
      },
      onPointerDown: (event) => {
        if (props.disabled === true || event.button !== 0) return;
        const span = spanOf(state.value.current, range);
        Option.match(
          pointerOf(event, renderer, trackId.current, range, inset),
          {
            onNone: () => {},
            onSome: (value) => {
              const end = nearestEnd(value, span);
              activeEnd.current = end;
              dragging.current = true;
              change(span, end, value);
              focusThumb(end === "start" ? 0 : 1);
            },
          },
        );
      },
      onPointerMove: (event) => {
        if (props.disabled === true || !dragging.current) return;
        if (event.pressedButton !== 0) {
          dragging.current = false;
          return;
        }
        Option.match(
          pointerOf(event, renderer, trackId.current, range, inset),
          {
            onNone: () => {},
            onSome: (value) =>
              change(
                spanOf(state.value.current, range),
                activeEnd.current,
                value,
              ),
          },
        );
      },
      onPointerUp: () => {
        dragging.current = false;
      },
    },
  );
};

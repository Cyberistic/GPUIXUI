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

import { useRef, type ReactElement } from "react";
import type {
  EventPayload,
  NativeRenderer,
  PublicInstance,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import * as Option from "effect/Option";
import { pipe } from "effect";
import {
  clampValue,
  decideValueKey,
  nearestEnd,
  normalizeRange,
  normalizeSpan,
  pointerValue,
  spanAfterMove,
  valueFraction,
  valueText,
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
import { paintedBox } from "../core/bounds.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  ariaName,
  composeHandler,
  composeRef,
  resolvePartStyle,
  useControlState,
  useFocus,
  useRovingFocus,
  usableLabel,
  type FocusState,
  type StateStyle,
  type TriggerHandlers,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `Slider` style callback receives. */
export interface SliderState {
  readonly disabled: boolean;
  readonly invalid: boolean;
  /** Visible and focusable, but refuses to change (plan `802`). */
  readonly readOnly: boolean;
}

/** The public state a `RangeSlider` style callback receives. */
export interface RangeSliderState {
  readonly disabled: boolean;
  readonly invalid: boolean;
  /** Visible and focusable, but refuses to change (plan `802`). */
  readonly readOnly: boolean;
}

/** The public state a `Slider` thumb callback receives. */
export interface SliderThumbState {
  readonly focused: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly invalid: boolean;
}

/** The public state a `RangeSlider` thumb callback receives. */
export interface RangeSliderThumbState extends SliderThumbState {
  readonly end: "start" | "end";
}

/** A single value on a track. */
export interface SliderProps extends TriggerHandlers {
  /** Controlled value. Omit to let the slider hold its own. */
  readonly value?: number;
  readonly defaultValue?: number;
  readonly onValueChange?: (value: number) => void;
  /**
   * Called when a gesture that changed the value finishes: once on pointer
   * release with the value the drag ended on, or immediately after a keyboard
   * step. A gesture that ends on its starting value — or a refused press —
   * reports no commit; `onValueChange` is the continuous stream.
   */
  readonly onValueCommit?: (value: number) => void;
  /** Defaults to 0. */
  readonly min?: number;
  /** Defaults to 100. */
  readonly max?: number;
  /** Defaults to 1. `0` makes the slider continuous. */
  readonly step?: number;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  /**
   * Shows the value as something to review.
   *
   * A read-only slider keeps its tab stop, name, announced value and thumb
   * ring while every change path is refused: a press focuses the track but
   * moves nothing, the keys step nothing and neither callback runs. It paints
   * full contrast with a `default` cursor and no hover/press wash; `disabled`
   * is the stronger state (half opacity, no tab stop). 0.10.0 has no
   * `aria-readonly`, so the difference is behavioural and visual (plan `802`).
   */
  readonly readOnly?: boolean;
  /** A failed validation paints the destructive role, like a field. */
  readonly invalid?: boolean;
  /** Accessible name. */
  readonly label?: string;
  /**
   * Puts the keyboard on the track — the slider's only focusable root — on
   * mount, including a later mount. A disabled slider never focuses; a
   * read-only one still does, because it keeps its tab stop (plan `808`).
   */
  readonly autoFocus?: boolean;
  /** How the value is announced. Defaults to `String(value)`. */
  readonly formatValue?: (value: number) => string;
  /** Extra description announced after the name. A slot (a `Tooltip`) writes the tip here. */
  readonly "aria-description"?: string;
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
  readonly onValueChange?: (value: readonly [number, number]) => void;
  /**
   * Called when a gesture that changed the pair finishes: once on pointer
   * release with the ordered pair it ended on, or immediately after a keyboard
   * step. An unchanged or refused gesture reports no commit.
   */
  readonly onValueCommit?: (value: readonly [number, number]) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  /**
   * Shows both ends as something to review.
   *
   * Both thumbs keep their tab stops, names, announced values and rings; a
   * press focuses the nearest thumb but moves neither end, the keys step
   * nothing and neither callback runs. Full contrast, `default` cursor, no
   * hover/press wash; `disabled` wins. 0.10.0 has no `aria-readonly`
   * (plan `802`).
   */
  readonly readOnly?: boolean;
  readonly invalid?: boolean;
  /** The group's name; each thumb becomes "<label> minimum"/"<label> maximum". */
  readonly label?: string;
  /**
   * Puts the keyboard on the **start** thumb, which keeps its tab stop beside
   * the end thumb — on mount, including a later mount.
   *
   * A disabled slider never focuses; a read-only one still does, because both
   * thumbs keep their stops and rings (plans `802`, `808`).
   */
  readonly autoFocus?: boolean;
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
): string => valueText(value, formatValue?.(value));

/** What a rendered slider needs from the component that owns its state. */
export interface SliderHandlers {
  readonly onValueChange: (next: number) => void;
  /** Report a completed keyboard step, which is a whole gesture. */
  readonly onCommit: (next: number) => void;
  readonly registerTrack: (instance: PublicInstance | null) => void;
  readonly onPointerDown: (event: EventPayload) => void;
  readonly onPointerMove: (event: EventPayload) => void;
  readonly onPointerUp: () => void;
}

/** The element tree `Slider` renders from its normalised value and gesture state. */
export const renderSlider = (
  props: SliderProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  focus: FocusState,
  handlers: SliderHandlers,
): ReactElement => {
  const range = sliderRange(props);
  const value = clampValue(state.current, range);
  const inert = props.disabled === true || props.readOnly === true;
  const spec: SliderSpec = {
    size: props.size ?? "md",
    invalid: props.invalid,
    disabled: props.disabled,
    readOnly: props.readOnly,
    focused: focus.focused,
  };
  return (
    <div
      ref={composeRef(props.ref, handlers.registerTrack)}
      role="slider"
      aria-label={ariaName(props.label)}
      aria-description={ariaName(props["aria-description"])}
      aria-valuetext={sliderValueText(value, props.formatValue)}
      tabIndex={props.disabled === true ? undefined : 0}
      autoFocus={props.disabled === true ? undefined : props.autoFocus}
      testId={props.testId}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      onMouseDown={(event) => {
        props.onMouseDown?.(event);
        handlers.onPointerDown(event);
      }}
      onMouseMove={(event) => {
        props.onMouseMove?.(event);
        handlers.onPointerMove(event);
      }}
      onMouseUp={(event) => {
        props.onMouseUp?.(event);
        handlers.onPointerUp();
      }}
      onMouseDownOutside={props.onMouseDownOutside}
      onAuxClick={props.onAuxClick}
      onScroll={props.onScroll}
      onKeyDown={(event) => {
        if (!inert) {
          Option.match(decideValueKey(value, range, event.key ?? ""), {
            onNone: () => {},
            onSome: (next) => {
              handlers.onValueChange(next);
              if (next !== value) handlers.onCommit(next);
            },
          });
        }
        props.onKeyDown?.(event);
      }}
      onKeyUp={props.onKeyUp}
      onFocus={composeHandler(focus.onFocus, props.onFocus)}
      onBlur={composeHandler(focus.onBlur, props.onBlur)}
      style={resolvePartStyle(sliderTrackStyle(spec, theme), props.style, {
        disabled: props.disabled === true,
        readOnly: props.readOnly === true,
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
              readOnly: props.readOnly === true,
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
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: 0 | 1) => void;
  readonly onBlur: (index: 0 | 1) => void;
}

export interface RangeSliderHandlers {
  readonly onSpanChange: (next: readonly [number, number]) => void;
  /** Report a completed keyboard step, which is a whole gesture. */
  readonly onSpanCommit: (next: readonly [number, number]) => void;
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
  const inert = props.disabled === true || props.readOnly === true;
  const base: SliderSpec = {
    size: props.size ?? "md",
    invalid: props.invalid,
    disabled: props.disabled,
    readOnly: props.readOnly,
  };
  const labels = pipe(
    usableLabel(props.label),
    Option.match({
      onNone: () => [undefined, undefined] as const,
      onSome: (label) => [`${label} minimum`, `${label} maximum`] as const,
    }),
  );
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
        autoFocus={
          props.disabled === true || index !== 0 ? undefined : props.autoFocus
        }
        onFocus={() => focus.onFocus(index)}
        onBlur={() => focus.onBlur(index)}
        onKeyDown={(event) => {
          if (inert) return;
          Option.match(decideValueKey(value, range, event.key ?? ""), {
            onNone: () => {},
            onSome: (next) => {
              const moved = spanAfterMove(state.current, end, next, range);
              handlers.onSpanChange(moved);
              if (moved !== state.current) handlers.onSpanCommit(moved);
            },
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
            readOnly: props.readOnly === true,
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
      aria-label={ariaName(props.label)}
      testId={props.testId}
      onMouseDown={handlers.onPointerDown}
      onMouseMove={handlers.onPointerMove}
      onMouseUp={handlers.onPointerUp}
      style={resolvePartStyle(sliderTrackStyle(base, theme), props.style, {
        disabled: props.disabled === true,
        readOnly: props.readOnly === true,
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
  const reported = renderer?.getElementBounds?.(trackId);
  if (reported === null || reported === undefined) return Option.none();
  // The track reports from its content origin, which is already inside the
  // padding the rail fills; `pointerValue` expects the painted track and
  // subtracts that inset itself (plan `597`).
  const box = paintedBox(reported, {
    paddingLeft: inset,
    paddingRight: inset,
  });
  return Option.some(
    clampValue(pointerValue(event.x ?? 0, box, range, inset), range),
  );
};

/** The value a pointer gesture started from, and the last value it resolved. */
interface SliderGesture {
  readonly start: number;
  readonly last: number;
}

/** A value on a track, by click, drag or keyboard. */
export const Slider = (props: SliderProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const trackId = useRef<number | null>(null);
  const focus = useFocus(false, () => trackId.current ?? undefined);
  const range = sliderRange(props);
  const dragging = useRef(false);
  const gesture = useRef<Option.Option<SliderGesture>>(Option.none());
  const state = useControlState(
    props.value,
    clampValue(props.defaultValue ?? range.min, range),
    props.onValueChange,
  );
  const inset = sliderInset(props.size ?? "md", theme);
  const apply = (event: EventPayload): void =>
    Option.match(pointerOf(event, renderer, trackId.current, range, inset), {
      onNone: () => {},
      onSome: (value) => {
        gesture.current = Option.map(gesture.current, (current) => ({
          start: current.start,
          last: value,
        }));
        state.set(value);
      },
    });
  /**
   * A released drag is one finished gesture. The value reported is the one the
   * gesture resolved, not a re-read of possibly deferred state, and a gesture
   * that ends where it began is not an edit (plan `646`).
   */
  const endGesture = (): void => {
    const current = Option.getOrUndefined(gesture.current);
    gesture.current = Option.none();
    if (current !== undefined && current.last !== current.start)
      props.onValueCommit?.(current.last);
  };
  return renderSlider(props, theme, state.value, focus, {
    onValueChange: state.set,
    onCommit: (next) => props.onValueCommit?.(next),
    registerTrack: (instance) => {
      trackId.current = instance?.id ?? null;
    },
    onPointerDown: (event) => {
      if (props.disabled === true || event.button !== 0) return;
      // The track is a tab stop, so the runtime focuses it on the press while
      // no gesture starts and nothing changes (measured, plan `802`).
      if (props.readOnly === true) return;
      dragging.current = true;
      Option.match(pointerOf(event, renderer, trackId.current, range, inset), {
        onNone: () => {},
        onSome: (value) => {
          gesture.current = Option.some({
            start: clampValue(state.value.current, range),
            last: value,
          });
          state.set(value);
        },
      });
    },
    onPointerMove: (event) => {
      if (
        props.disabled === true ||
        props.readOnly === true ||
        !dragging.current
      )
        return;
      if (event.pressedButton !== 0) {
        dragging.current = false;
        endGesture();
        return;
      }
      apply(event);
    },
    onPointerUp: () => {
      dragging.current = false;
      endGesture();
    },
  });
};

/** The ordered pair a range gesture started from, and the last pair it resolved. */
interface RangeGesture {
  readonly start: readonly [number, number];
  readonly last: readonly [number, number];
}

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
  const activeEnd = useRef<"start" | "end">("start");
  const dragging = useRef(false);
  const gesture = useRef<Option.Option<RangeGesture>>(Option.none());
  const focus = useRovingFocus();
  const state = useControlState<readonly [number, number]>(
    props.value,
    [initial.start, initial.end],
    props.onValueChange,
  );
  const inset = sliderInset(props.size ?? "md", theme);
  const focusThumb = (index: 0 | 1): void => {
    Option.match(focus.idOf(index), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
    focus.onFocus(index);
  };
  const change = (
    end: "start" | "end",
    value: number,
  ): readonly [number, number] => {
    const next = spanAfterMove(state.value.current, end, value, range);
    state.set(next);
    return next;
  };
  /** One released drag reports its final pair; an unchanged gesture is not an edit. */
  const endGesture = (): void => {
    const current = Option.getOrUndefined(gesture.current);
    gesture.current = Option.none();
    if (
      current !== undefined &&
      (current.last[0] !== current.start[0] ||
        current.last[1] !== current.start[1])
    )
      props.onValueCommit?.(current.last);
  };
  return renderRangeSlider(
    props,
    theme,
    state.value,
    {
      focusedIndex: focus.focusedIndex,
      onFocus: focus.onFocus,
      onBlur: focus.onBlur,
    },
    {
      onSpanChange: state.set,
      onSpanCommit: (next) => props.onValueCommit?.(next),
      registerTrack: (instance) => {
        trackId.current = instance?.id ?? null;
      },
      registerThumb: focus.registerItem,
      onPointerDown: (event) => {
        if (props.disabled === true || event.button !== 0) return;
        const span = spanOf(state.value.current, range);
        if (props.readOnly === true) {
          // Focus the thumb a press lands nearest to; neither end moves, and
          // no gesture exists to commit (plan `802`).
          Option.match(
            pointerOf(event, renderer, trackId.current, range, inset),
            {
              onNone: () => {},
              onSome: (value) =>
                focusThumb(nearestEnd(value, span) === "start" ? 0 : 1),
            },
          );
          return;
        }
        Option.match(
          pointerOf(event, renderer, trackId.current, range, inset),
          {
            onNone: () => {},
            onSome: (value) => {
              const end = nearestEnd(value, span);
              activeEnd.current = end;
              dragging.current = true;
              const next = change(end, value);
              gesture.current = Option.some({
                start: [span.start, span.end] as const,
                last: next,
              });
              focusThumb(end === "start" ? 0 : 1);
            },
          },
        );
      },
      onPointerMove: (event) => {
        if (
          props.disabled === true ||
          props.readOnly === true ||
          !dragging.current
        )
          return;
        if (event.pressedButton !== 0) {
          dragging.current = false;
          endGesture();
          return;
        }
        Option.match(
          pointerOf(event, renderer, trackId.current, range, inset),
          {
            onNone: () => {},
            onSome: (value) => {
              const next = change(activeEnd.current, value);
              gesture.current = Option.map(gesture.current, (current) => ({
                start: current.start,
                last: next,
              }));
            },
          },
        );
      },
      onPointerUp: () => {
        dragging.current = false;
        endGesture();
      },
    },
  );
};

/**
 * `Slider` and `RangeSlider` — a value on a track.
 *
 * GPUix publishes **no slider** (plan 020 §1.5): there is a `div`, a style
 * object and real mouse/key events, and the rest is this package's. The
 * arithmetic lives in `core/value.ts`, the paint in `core/style.ts`, and this
 * file owns only what is irreducible here — reading the track's box from the
 * renderer so a pointer becomes a value, the drag flag, and focus.
 *
 * **Two runtime limits are structural, not defects:**
 *
 * - there is no pointer capture, so a drag only tracks while the pointer is
 *   over the track (a click anywhere on it and the keyboard always work);
 * - there is no `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, so the value
 *   reaches assistive technology through `aria-valuetext` only.
 *
 * `RangeSlider` is a different ARIA contract from `Slider` — two sliders in one
 * group rather than one slider with an array value — so it is a second
 * component, not a mode of the first.
 */

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type {
  EventPayload,
  KeyEvent,
  NativeRenderer,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { accessibleName } from "../core/a11y.js";
import { controlRing } from "../core/focus.js";
import * as Option from "effect/Option";
import { cn } from "@gpuixui/tw";
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
import { sliderInset } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  sliderFillClass,
  sliderRailClass,
  sliderThumbClass,
  sliderTrackClass,
} from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  composeEvent,
  mergeStyle,
  useControlState,
  useFocus,
  valueChange,
  type FocusState,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** A single value on a track. */
export interface SliderProps
  extends ValueChangeProps<number>, InteractionProps {
  /** Controlled value. Omit to let the slider hold its own. */
  readonly value?: number;
  readonly defaultValue?: number;
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
  /** Extra style, resolved against the slider's live state and merged last. */
  readonly style?: StateStyle<SliderState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** The parts to draw. Omit for the default composition. */
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** Two values on one track. */
export interface RangeSliderProps
  extends ValueChangeProps<readonly [number, number]>, InteractionProps {
  readonly value?: readonly [number, number];
  readonly defaultValue?: readonly [number, number];
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** The group's name; each thumb becomes "<label> minimum"/"<label> maximum". */
  readonly label?: string;
  readonly formatValue?: (value: number) => string;
  /** Extra style, resolved against the range's live state and merged last. */
  readonly style?: StateStyle<SliderState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** The parts to draw. Omit for the default composition. */
  readonly children?: ReactNode;
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

/**
 * What a slider tells a `style` callback.
 *
 * A range slider reports `focused` when either thumb holds focus: the callback
 * styles the track both components share, not an individual thumb.
 */
export interface SliderState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

/** The state a slider is in, from its props and its focus. */
const sliderState = (
  props: { readonly disabled?: boolean; readonly invalid?: boolean },
  focused: boolean,
): SliderState => ({
  disabled: props.disabled === true,
  focused,
  invalid: props.invalid === true,
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

/** The resolved fill for a fraction: the recipe plus its data-driven width. */
const fillStyle = (
  fraction: number,
  invalid: boolean,
  theme: PrimitiveTheme,
): StyleDesc =>
  mergeStyle(recipeTw.classesToStyle(sliderFillClass(invalid), theme).style, {
    width: `${fraction * 100}%`,
  });

/** The resolved thumb. The track is the focus target, so it declares the ring. */
const thumbStyle = (
  size: ControlSize,
  invalid: boolean,
  theme: PrimitiveTheme,
): StyleDesc =>
  recipeTw.classesToStyle(sliderThumbClass(size, invalid), theme).style;

/** The interaction a thumb owns when it is its own tab stop (the range case). */
interface ThumbPart {
  readonly label: string | undefined;
  readonly valueText: string;
  readonly tabIndex: number | undefined;
  readonly ring: boolean;
  readonly ref: (instance: PublicInstance | null) => void;
  readonly onClick: ((event: EventPayload) => void) | undefined;
  readonly onFocus: ((event: EventPayload) => void) | undefined;
  readonly onBlur: ((event: EventPayload) => void) | undefined;
  readonly onKeyDown: ((event: KeyEvent) => void) | undefined;
}

/** What a slider's parts read from the slider that owns them. */
interface SliderPart {
  readonly theme: PrimitiveTheme;
  readonly size: ControlSize;
  readonly invalid: boolean;
  /** The fraction each thumb sits at — one entry for a slider, two for a range. */
  readonly fractions: ReadonlyArray<number>;
  /** Per-thumb interaction; `null` where the root owns it (a single slider). */
  readonly thumbs: ReadonlyArray<ThumbPart | null>;
  /** The caller's press, installed where a press inside the control lands. */
  readonly press: ((event: EventPayload) => void) | undefined;
}

const SliderPartContext = createContext<SliderPart | null>(null);

const useSliderPart = (name: string): SliderPart => {
  const part = useContext(SliderPartContext);
  if (part === null) {
    throw new Error(`${name} must be used inside Slider or RangeSlider`);
  }
  return part;
};

/** {@link SliderTrack} props. */
export interface SliderTrackProps {
  /** The indicators and thumbs. Omit for an empty rail. */
  readonly children?: ReactNode;
}

/** The rail a slider's parts sit in. The slider paints nothing else. */
export const renderSliderTrack = (
  props: SliderTrackProps,
  part: SliderPart,
): ReactElement => (
  <div style={recipeTw.classesToStyle(sliderRailClass, part.theme).style}>
    {props.children}
  </div>
);

/** The rail, inside a slider. */
export const SliderTrack = (props: SliderTrackProps): ReactElement =>
  renderSliderTrack(props, useSliderPart("SliderTrack"));

/** {@link SliderIndicator} props. */
export interface SliderIndicatorProps {
  /** The thumb segment to paint: `0` fills from the start to the first thumb. */
  readonly index?: number;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/**
 * The filled span that leads to a thumb.
 *
 * `index` names the thumb, not the segment, so a range slider's two fills are
 * `index={0}` (start → first thumb) and `index={1}` (first thumb → second).
 */
export const renderSliderIndicator = (
  { index = 0, className, style }: SliderIndicatorProps,
  part: SliderPart,
): ReactElement => {
  const to = part.fractions[index] ?? 0;
  const from = index === 0 ? 0 : (part.fractions[index - 1] ?? 0);
  return (
    <div
      style={mergeStyle(
        mergeStyle(
          fillStyle(to - from, part.invalid, part.theme),
          recipeTw.classesToStyle(className, part.theme).style,
        ),
        style,
      )}
    />
  );
};

/** The filled span, inside a slider. */
export const SliderIndicator = (props: SliderIndicatorProps): ReactElement =>
  renderSliderIndicator(props, useSliderPart("SliderIndicator"));

/** {@link SliderThumb} props. */
export interface SliderThumbProps {
  /** Which thumb to draw. Defaults to `0`. */
  readonly index?: 0 | 1;
  /** A custom glyph inside the thumb. It cannot swallow the press. */
  readonly children?: ReactNode;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/**
 * A thumb.
 *
 * In a range slider each thumb is its own `role="slider"` tab stop, so the part
 * carries that interaction; in a single slider the root is the slider and the
 * thumb is its paint.
 */
export const renderSliderThumb = (
  { index = 0, children, className, style }: SliderThumbProps,
  part: SliderPart,
): ReactElement => {
  const thumb = part.thumbs[index] ?? null;
  let resolved = thumbStyle(part.size, part.invalid, part.theme);
  if (thumb?.ring === true) {
    resolved = mergeStyle(
      resolved,
      controlRing(part.theme, { invalid: part.invalid }),
    );
  }
  resolved = mergeStyle(
    resolved,
    recipeTw.classesToStyle(className, part.theme).style,
  );
  resolved = mergeStyle(resolved, style);
  if (thumb === null) {
    return (
      <div onClick={part.press} style={resolved}>
        {children}
      </div>
    );
  }
  return (
    <div
      ref={thumb.ref}
      role="slider"
      aria-label={thumb.label}
      aria-valuetext={thumb.valueText}
      tabIndex={thumb.tabIndex}
      onClick={thumb.onClick}
      onFocus={thumb.onFocus}
      onBlur={thumb.onBlur}
      onKeyDown={thumb.onKeyDown}
      style={resolved}
    >
      {children}
    </div>
  );
};

/** A thumb, inside a slider. */
export const SliderThumb = (props: SliderThumbProps): ReactElement =>
  renderSliderThumb(props, useSliderPart("SliderThumb"));

export const renderSlider = (
  props: SliderProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  focus: FocusState,
  handlers: SliderHandlers,
): ReactElement => {
  const range = sliderRange(props);
  const value = clampValue(state.current, range);
  const size = props.size ?? "md";
  const invalid = props.invalid === true;
  const resolved = recipeTw.classesToStyle(
    cn(sliderTrackClass(size), props.className),
    theme,
  );
  let track = resolved.style;
  if (props.disabled === true) track = mergeStyle(track, resolved.disabled);
  track = mergeStyle(
    track,
    controlRing(theme, { disabled: props.disabled, invalid }),
  );
  track = mergeStyle(
    track,
    resolveStyle(props.style, sliderState(props, focus.focused)),
  );
  const part: SliderPart = {
    theme,
    size,
    invalid,
    fractions: [valueFraction(value, range)],
    thumbs: [null],
    press: props.disabled === true ? undefined : props.onClick,
  };
  return (
    <div
      ref={handlers.registerTrack}
      role="slider"
      aria-label={accessibleName(props.label)}
      aria-valuetext={sliderValueText(value, props.formatValue)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={props.disabled === true ? undefined : props.onClick}
      onMouseDown={handlers.onPointerDown}
      onMouseMove={handlers.onPointerMove}
      onMouseUp={handlers.onPointerUp}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, (event) => {
        if (props.disabled === true) return;
        Option.match(decideValueKey(value, range, event.key ?? ""), {
          onNone: () => {},
          onSome: handlers.onValueChange,
        });
      })}
      onKeyUp={props.onKeyUp}
      onFocus={composeEvent<EventPayload>(props.onFocus, focus.onFocus)}
      onBlur={composeEvent<EventPayload>(props.onBlur, focus.onBlur)}
      style={track}
    >
      <SliderPartContext.Provider value={part}>
        {props.children ??
          renderSliderTrack(
            {
              children: (
                <>
                  {renderSliderIndicator({}, part)}
                  {renderSliderThumb({}, part)}
                </>
              ),
            },
            part,
          )}
      </SliderPartContext.Provider>
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
  const size = props.size ?? "md";
  const invalid = props.invalid === true;
  const labels =
    props.label === undefined
      ? ([undefined, undefined] as const)
      : ([`${props.label} minimum`, `${props.label} maximum`] as const);
  const thumbPart = (index: 0 | 1): ThumbPart => {
    const value = index === 0 ? span.start : span.end;
    return {
      label: labels[index],
      valueText: sliderValueText(value, props.formatValue),
      tabIndex: props.disabled === true ? undefined : 0,
      ring: props.disabled !== true,
      ref: handlers.registerThumb(index),
      onClick: props.disabled === true ? undefined : props.onClick,
      onFocus: composeEvent<EventPayload>(props.onFocus, () =>
        focus.onFocus(index),
      ),
      onBlur: composeEvent<EventPayload>(props.onBlur, () =>
        focus.onBlur(index),
      ),
      onKeyDown: composeEvent<KeyEvent>(props.onKeyDown, (event) => {
        if (props.disabled === true) return;
        const end = index === 0 ? "start" : "end";
        Option.match(decideValueKey(value, range, event.key ?? ""), {
          onNone: () => {},
          onSome: (next) =>
            handlers.onSpanChange(
              spanTuple(moveSpanEnd(span, end, next, range)),
            ),
        });
      }),
    };
  };
  const resolved = recipeTw.classesToStyle(
    cn(sliderTrackClass(size), props.className),
    theme,
  );
  let track = resolved.style;
  if (props.disabled === true) track = mergeStyle(track, resolved.disabled);
  track = mergeStyle(
    track,
    resolveStyle(
      props.style,
      sliderState(props, Option.isSome(focus.focusedIndex)),
    ),
  );
  const part: SliderPart = {
    theme,
    size,
    invalid,
    fractions: [
      valueFraction(span.start, range),
      valueFraction(span.end, range),
    ],
    thumbs: [thumbPart(0), thumbPart(1)],
    press: props.disabled === true ? undefined : props.onClick,
  };
  return (
    <div
      ref={handlers.registerTrack}
      role="group"
      aria-label={accessibleName(props.label)}
      testId={props.testId}
      onClick={props.disabled === true ? undefined : props.onClick}
      onMouseDown={handlers.onPointerDown}
      onMouseMove={handlers.onPointerMove}
      onMouseUp={handlers.onPointerUp}
      style={track}
    >
      <SliderPartContext.Provider value={part}>
        {props.children ??
          renderSliderTrack(
            {
              children: (
                <>
                  {renderSliderIndicator({ index: 0 }, part)}
                  {renderSliderThumb({ index: 0 }, part)}
                  {renderSliderIndicator({ index: 1 }, part)}
                  {renderSliderThumb({ index: 1 }, part)}
                </>
              ),
            },
            part,
          )}
      </SliderPartContext.Provider>
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
    valueChange(props),
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
      if (props.disabled === true) return;
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
    valueChange(props),
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
        if (props.disabled === true) return;
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

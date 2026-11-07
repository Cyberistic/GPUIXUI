/** @jsxImportSource @gpuix/react */
import {
  Children,
  Fragment,
  createContext,
  isValidElement,
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
import * as Arr from "effect/Array";
import { accessibleName, spokenText } from "../core/a11y.js";
import {
  defaultMessages,
  rangeThumbNames,
  type PrimitiveMessages,
} from "../core/messages.js";
import { controlRing } from "../core/focus.js";
import { isPlainKey } from "../core/keyboard.js";
import { primaryButton } from "../core/pointer.js";
import * as Option from "effect/Option";
import { cn } from "@gpuixui/tw";
import {
  clampValue,
  decideValueKey,
  moveSpanEnd,
  nearestEnd,
  normalizeSpan,
  pointerValue,
  spanFrom,
  storedRange,
  valueFraction,
  verticalPointerValue,
  type ValueRange,
  type ValueSpan,
} from "../core/value.js";
import { sliderInset, type SliderOrientation } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import { controlSize } from "../core/theme.js";
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
  mergeRefs,
  mergeStyle,
  useControlState,
  useFocus,
  valueChange,
  type FieldHostProps,
  type FocusState,
  type HelpProps,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

export interface SliderProps
  extends
    ValueChangeProps<number>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  readonly value?: number;
  readonly defaultValue?: number;

  readonly min?: number;

  readonly max?: number;

  readonly step?: number;

  readonly size?: ControlSize;
  readonly disabled?: boolean;

  readonly invalid?: boolean;

  readonly label?: string;

  readonly formatValue?: (value: number) => string;

  readonly onValueCommit?: (value: number) => void;

  readonly orientation?: SliderOrientation;

  readonly style?: StateStyle<SliderState>;

  readonly className?: string;

  readonly children?: ReactNode;
  readonly testId?: string;
}

export interface RangeSliderProps
  extends
    ValueChangeProps<readonly [number, number]>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  readonly value?: readonly [number, number];
  readonly defaultValue?: readonly [number, number];

  readonly min?: number;

  readonly max?: number;

  readonly step?: number;
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly invalid?: boolean;

  readonly label?: string;

  readonly formatValue?: (value: number) => string;

  readonly onValueCommit?: (span: readonly [number, number]) => void;

  readonly orientation?: SliderOrientation;

  readonly style?: StateStyle<SliderState>;

  readonly className?: string;

  readonly children?: ReactNode;
  readonly testId?: string;
}

export const sliderRange = (props: {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}): ValueRange =>
  storedRange(props, {
    min: 0,
    max: 100,
    step: 1,
  });

export interface SliderState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

const sliderState = (
  props: { readonly disabled?: boolean; readonly invalid?: boolean },
  focused: boolean,
): SliderState => ({
  disabled: props.disabled === true,
  focused,
  invalid: props.invalid === true,
});

export const sliderValueText = (
  value: number,
  formatValue?: (value: number) => string,
): string =>
  spokenText(Option.fromNullishOr(formatValue?.(value)), String(value));

export interface SliderHandlers {
  readonly onValueChange: (next: number) => void;
  readonly registerTrack: (instance: PublicInstance | null) => void;
  readonly onPointerDown: (event: EventPayload) => void;
  readonly onPointerMove: (event: EventPayload) => void;
  readonly onPointerUp: () => void;
}

const fillStyle = (
  fraction: number,
  invalid: boolean,
  theme: PrimitiveTheme,
  orientation: SliderOrientation,
): StyleDesc => {
  const share = `${fraction * 100}%`;
  return mergeStyle(
    recipeTw.classesToStyle(sliderFillClass(invalid, orientation), theme).style,
    orientation === "vertical" ? { height: share } : { width: share },
  );
};

const thumbStyle = (
  size: ControlSize,
  invalid: boolean,
  theme: PrimitiveTheme,
  orientation: SliderOrientation,
): StyleDesc =>
  recipeTw.classesToStyle(sliderThumbClass(size, invalid, orientation), theme)
    .style;

interface ThumbPart {
  readonly label: string | undefined;
  readonly valueText: string;
  readonly tabIndex: number | undefined;
  readonly ring: boolean;
  readonly ref: (instance: PublicInstance | null) => void;
  readonly "aria-id"?: string;
  readonly onLayout?: ((event: EventPayload) => void) | undefined;
  readonly onClick: ((event: EventPayload) => void) | undefined;
  readonly onFocus: ((event: EventPayload) => void) | undefined;
  readonly onBlur: ((event: EventPayload) => void) | undefined;
  readonly onKeyDown: ((event: KeyEvent) => void) | undefined;
  readonly onKeyUp: ((event: KeyEvent) => void) | undefined;
}

interface SliderPart {
  readonly theme: PrimitiveTheme;
  readonly size: ControlSize;
  readonly invalid: boolean;

  readonly orientation: SliderOrientation;

  readonly fractions: ReadonlyArray<number>;

  readonly thumbs: ReadonlyArray<ThumbPart | null>;

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

export interface SliderTrackProps {
  readonly children?: ReactNode;
  readonly style?: StyleDesc;

  readonly className?: string;

  readonly testId?: string;
}

const flattenParts = (children: ReactNode): ReadonlyArray<ReactNode> =>
  Arr.flatMap(Children.toArray(children), (child) =>
    isValidElement<{ readonly children?: ReactNode }>(child) &&
    child.type === Fragment
      ? flattenParts(child.props.children)
      : [child],
  );

export const renderSliderTrack = (
  { children, className, style, testId }: SliderTrackProps,
  part: SliderPart,
): ReactElement => (
  <div
    testId={testId}
    style={mergeStyle(
      recipeTw.classesToStyle(
        cn(sliderRailClass(part.orientation), className),
        part.theme,
      ).style,
      style,
    )}
  >
    {part.orientation === "vertical"
      ? Arr.reverse(flattenParts(children))
      : children}
  </div>
);

export const SliderTrack = (props: SliderTrackProps): ReactElement =>
  renderSliderTrack(props, useSliderPart("SliderTrack"));

export interface SliderIndicatorProps {
  readonly index?: number;
  readonly style?: StyleDesc;

  readonly className?: string;
}

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
          fillStyle(to - from, part.invalid, part.theme, part.orientation),
          recipeTw.classesToStyle(className, part.theme).style,
        ),
        style,
      )}
    />
  );
};

export const SliderIndicator = (props: SliderIndicatorProps): ReactElement =>
  renderSliderIndicator(props, useSliderPart("SliderIndicator"));

export interface SliderThumbProps {
  readonly index?: 0 | 1;

  readonly children?: ReactNode;
  readonly style?: StyleDesc;

  readonly className?: string;
}

export const renderSliderThumb = (
  { index = 0, children, className, style }: SliderThumbProps,
  part: SliderPart,
): ReactElement => {
  const thumb = part.thumbs[index] ?? null;
  let resolved = thumbStyle(
    part.size,
    part.invalid,
    part.theme,
    part.orientation,
  );
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
      aria-id={thumb["aria-id"]}
      aria-valuetext={thumb.valueText}
      tabIndex={thumb.tabIndex}
      onClick={thumb.onClick}
      onLayout={thumb.onLayout}
      onFocus={thumb.onFocus}
      onBlur={thumb.onBlur}
      onKeyDown={thumb.onKeyDown}
      onKeyUp={thumb.onKeyUp}
      style={resolved}
    >
      {children}
    </div>
  );
};

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
  const size = controlSize(props.size);
  const invalid = props.invalid === true;
  const orientation = props.orientation ?? "horizontal";
  const resolved = recipeTw.classesToStyle(
    cn(sliderTrackClass(size, orientation), props.className),
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
    orientation,
    fractions: [valueFraction(value, range)],
    thumbs: [null],
    press: props.disabled === true ? undefined : props.onClick,
  };
  return (
    <div
      ref={mergeRefs(handlers.registerTrack, props.ref)}
      role="slider"
      aria-label={accessibleName(props.label)}
      aria-description={accessibleName(props.description)}
      aria-id={props["aria-id"]}
      aria-valuetext={sliderValueText(value, props.formatValue)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onLayout={props.onLayout}
      onClick={props.disabled === true ? undefined : props.onClick}
      onMouseDown={handlers.onPointerDown}
      onMouseMove={handlers.onPointerMove}
      onMouseUp={handlers.onPointerUp}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, (event) => {
        if (props.disabled === true || !isPlainKey(event.modifiers)) return;
        Option.match(decideValueKey(value, range, event.key ?? ""), {
          onNone: () => {},

          onSome: (next) => {
            if (next !== value) handlers.onValueChange(next);
          },
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

export const renderRangeSlider = (
  props: RangeSliderProps,
  theme: PrimitiveTheme,
  state: ValueState<readonly [number, number]>,
  focus: RangeSliderFocus,
  handlers: RangeSliderHandlers,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const range = sliderRange(props);
  const span = spanOf(state.current, range);
  const size = controlSize(props.size);
  const invalid = props.invalid === true;
  const orientation = props.orientation ?? "horizontal";

  const labels = rangeThumbNames(
    accessibleName(props.label),
    messages.rangeEnd,
  );

  const addressedIndex = Option.getOrElse(focus.focusedIndex, () => 0);
  const thumbPart = (index: 0 | 1): ThumbPart => {
    const value = index === 0 ? span.start : span.end;
    const addressed = index === addressedIndex;
    const register = handlers.registerThumb(index);
    return {
      label: labels[index],
      valueText: sliderValueText(value, props.formatValue),
      tabIndex: props.disabled === true ? undefined : 0,
      ring: props.disabled !== true,
      ref: addressed ? mergeRefs(register, props.ref) : register,
      "aria-id": addressed ? props["aria-id"] : undefined,
      onLayout: addressed ? props.onLayout : undefined,
      onClick: props.disabled === true ? undefined : props.onClick,
      onFocus: composeEvent<EventPayload>(props.onFocus, () =>
        focus.onFocus(index),
      ),
      onBlur: composeEvent<EventPayload>(props.onBlur, () =>
        focus.onBlur(index),
      ),
      onKeyDown: composeEvent<KeyEvent>(props.onKeyDown, (event) => {
        if (props.disabled === true || !isPlainKey(event.modifiers)) return;
        const end = index === 0 ? "start" : "end";
        Option.match(decideValueKey(value, range, event.key ?? ""), {
          onNone: () => {},
          onSome: (next) => {
            const moved = moveSpanEnd(span, end, next, range);
            if (moved.start !== span.start || moved.end !== span.end) {
              handlers.onSpanChange(spanTuple(moved));
            }
          },
        });
      }),
      onKeyUp: props.onKeyUp,
    };
  };
  const resolved = recipeTw.classesToStyle(
    cn(sliderTrackClass(size, orientation), props.className),
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
    orientation,
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
      aria-description={accessibleName(props.description)}
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

const pointerOf = (
  event: EventPayload,
  renderer: NativeRenderer | null,
  trackId: number | null,
  range: ValueRange,
  inset: number,
  orientation: SliderOrientation,
): Option.Option<number> => {
  if (trackId === null) return Option.none();
  const box = renderer?.getElementBounds?.(trackId);
  if (box === null || box === undefined) return Option.none();
  return Option.some(
    clampValue(
      orientation === "vertical"
        ? verticalPointerValue(event.y ?? 0, box, range, inset)
        : pointerValue(event.x ?? 0, box, range, inset),
      range,
    ),
  );
};

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
  const inset = sliderInset(controlSize(props.size), theme);
  const orientation = props.orientation ?? "horizontal";

  const gesture = useRef<Option.Option<number>>(Option.none());
  const report = (next: number): void => {
    gesture.current = Option.some(next);
    state.set(next);
  };
  const endGesture = (): void => {
    Option.match(gesture.current, {
      onNone: () => {},
      onSome: (value) => props.onValueCommit?.(value),
    });
    gesture.current = Option.none();
  };
  const apply = (event: EventPayload): void =>
    Option.match(
      pointerOf(event, renderer, trackId.current, range, inset, orientation),
      {
        onNone: () => {},
        onSome: report,
      },
    );
  return renderSlider(props, theme, state.value, focus, {
    onValueChange: (next) => {
      state.set(next);
      props.onValueCommit?.(next);
    },
    registerTrack: (instance) => {
      trackId.current = instance?.id ?? null;
    },
    onPointerDown: (event) => {
      if (props.disabled === true || !primaryButton(event)) return;
      dragging.current = true;
      apply(event);
    },
    onPointerMove: (event) => {
      if (props.disabled === true || !dragging.current) return;
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

  const anchor = useRef<Option.Option<number>>(Option.none());

  const followedEnd = useRef<"start" | "end">("start");
  const dragging = useRef(false);
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<0 | 1>>(
    Option.none(),
  );
  const state = useControlState<readonly [number, number]>(
    props.value,
    [initial.start, initial.end],
    valueChange(props),
  );
  const inset = sliderInset(controlSize(props.size), theme);
  const orientation = props.orientation ?? "horizontal";
  const focusThumb = (index: 0 | 1): void => {
    Option.match(Option.fromNullishOr(thumbIds.current.get(index)), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
    setFocusedIndex(Option.some(index));
  };

  const gesture = useRef<Option.Option<readonly [number, number]>>(
    Option.none(),
  );
  const endGesture = (): void => {
    Option.match(gesture.current, {
      onNone: () => {},
      onSome: (span) => props.onValueCommit?.(span),
    });
    gesture.current = Option.none();
  };
  const change = (next: ValueSpan): void => {
    const span = spanOf(state.value.current, range);
    if (next.start !== span.start || next.end !== span.end) {
      gesture.current = Option.some(spanTuple(next));
      state.set(spanTuple(next));
    }
  };
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
      onSpanChange: (next) => {
        state.set(next);
        props.onValueCommit?.(next);
      },
      registerTrack: (instance) => {
        trackId.current = instance?.id ?? null;
      },
      registerThumb: (index) => (instance) => {
        if (instance === null) thumbIds.current.delete(index);
        else thumbIds.current.set(index, instance.id);
      },
      onPointerDown: (event) => {
        if (props.disabled === true || !primaryButton(event)) return;
        const span = spanOf(state.value.current, range);
        Option.match(
          pointerOf(
            event,
            renderer,
            trackId.current,
            range,
            inset,
            orientation,
          ),
          {
            onNone: () => {},
            onSome: (value) => {
              const end = nearestEnd(value, span);
              const held =
                span.start === span.end
                  ? span.start
                  : span[end === "start" ? "end" : "start"];
              anchor.current = Option.some(held);
              followedEnd.current = end;
              dragging.current = true;
              change(spanFrom(held, value, range));
              focusThumb(end === "start" ? 0 : 1);
            },
          },
        );
      },
      onPointerMove: (event) => {
        if (props.disabled === true || !dragging.current) return;
        if (event.pressedButton !== 0) {
          dragging.current = false;
          anchor.current = Option.none();
          endGesture();
          return;
        }
        Option.match(
          pointerOf(
            event,
            renderer,
            trackId.current,
            range,
            inset,
            orientation,
          ),
          {
            onNone: () => {},
            onSome: (value) =>
              Option.match(anchor.current, {
                onNone: () => {},
                onSome: (held) => {
                  change(spanFrom(held, value, range));

                  const target = clampValue(value, range);
                  if (target === held) return;
                  const end = target < held ? "start" : "end";
                  if (end === followedEnd.current) return;
                  followedEnd.current = end;
                  focusThumb(end === "start" ? 0 : 1);
                },
              }),
          },
        );
      },
      onPointerUp: () => {
        dragging.current = false;
        anchor.current = Option.none();
        endGesture();
      },
    },
    useMessages(),
  );
};

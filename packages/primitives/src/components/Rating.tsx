/** @jsxImportSource @gpuix/react */
import { useRef, useState, type ReactElement } from "react";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, KeyEvent, PublicInstance } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { cn } from "@gpuixui/tw";
import { Icon } from "@gpuixui/icons";
import { accessibleName, spokenSentence } from "../core/a11y.js";
import {
  decideActivation,
  isPlainKey,
  swallowKeyDefault,
} from "../core/keyboard.js";
import {
  defaultMessages,
  starWord,
  type PrimitiveMessages,
} from "../core/messages.js";
import {
  clampRating,
  decideRating,
  pointerRating,
  ratingTabStop,
  starCount,
  starFill,
  starState,
  type StarBox,
} from "../core/rating.js";
import {
  ratingPartialCellStyle,
  ratingPartialStyle,
  ratingStarColor,
} from "../core/style.js";
import type { ValueState } from "../core/state.js";
import { controlSize } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { ratingGroupClass, ratingStarClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { controlRing } from "../core/focus.js";
import {
  composeEvent,
  composePress,
  mergeRefs,
  mergeStyle,
  useControlState,
  valueChange,
  type FieldHostProps,
  type HelpProps,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";
import { useMessages } from "./MessagesProvider.js";

export interface RatingProps
  extends
    ValueChangeProps<number>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  readonly value?: number;
  readonly defaultValue?: number;

  readonly max?: number;

  readonly allowHalf?: boolean;

  readonly size?: ControlSize;
  readonly disabled?: boolean;

  readonly readOnly?: boolean;

  readonly label?: string;

  readonly invalid?: boolean;

  readonly style?: StateStyle<RatingState>;

  readonly className?: string;
  readonly testId?: string;
}

export interface RatingState {
  readonly disabled: boolean;
  readonly readOnly: boolean;

  readonly focused: boolean;
  readonly invalid: boolean;
}

export interface RatingFocus {
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;
  readonly onBlur: (index: number) => void;
}

export interface RatingHover {
  readonly hovered: Option.Option<number>;
  readonly onHover: (score: number) => void;

  readonly onHoverEnd: () => void;
}

export interface RatingHandlers {
  readonly onSelect: (value: number) => void;

  readonly onMove: (value: number) => void;
  readonly registerItem: (
    index: number,
  ) => (instance: PublicInstance | null) => void;

  readonly scoreAt?: (index: number, event: EventPayload) => number;
}

export const ratingMax = (max: unknown): number =>
  Option.match(Option.fromNullishOr(max), {
    onNone: () => 5,
    onSome: (count) => starCount(count),
  });

const NO_POINTER: RatingHover = {
  hovered: Option.none(),
  onHover: () => {},
  onHoverEnd: () => {},
};

export const renderRating = (
  props: RatingProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  focus: RatingFocus,
  handlers: RatingHandlers,
  hover: RatingHover = NO_POINTER,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const max = ratingMax(props.max);
  const half = props.allowHalf === true;
  const value = clampRating(state.current, max, half);
  const tabStop = ratingTabStop(value, max, half);

  const starName = (index: number): string =>
    spokenSentence(
      messages.starName(index, max),
      defaultMessages.starName(index, max),
    );

  const focusedIndex = Option.filter(
    focus.focusedIndex,
    (index) => index >= 1 && index <= max,
  );
  const interactive = props.disabled !== true && props.readOnly !== true;

  const lit = interactive
    ? clampRating(
        Option.getOrElse(hover.hovered, () => value),
        max,
        half,
      )
    : value;

  const focusedStar = clampRating(
    Option.getOrElse(focusedIndex, () => tabStop),
    max,
  );
  const selectFocused = (): void => {
    handlers.onSelect(focusedStar);
  };
  const scoreAt = handlers.scoreAt ?? ((index: number) => index);
  const resolved = recipeTw.classesToStyle(
    ratingStarClass({ disabled: props.disabled, readOnly: props.readOnly }),
    theme,
  );
  let starStyle = resolved.style;
  if (props.disabled === true) {
    starStyle = mergeStyle(starStyle, resolved.disabled);
  } else if (interactive) {
    starStyle = mergeStyle(
      starStyle,
      controlRing(theme, { invalid: props.invalid }),
    );
  }

  const glyph = (filled: boolean): ReactElement | null => {
    const color = ratingStarColor(filled, theme, props.invalid);
    return color === undefined ? null : (
      <Icon
        name={filled ? "star-filled" : "star"}
        size={controlSize(props.size)}
        color={color}
      />
    );
  };
  const star = (index: number): ReactElement => {
    const fill = starFill(index, lit);
    return (
      <div
        key={index}
        ref={
          index === tabStop
            ? mergeRefs(handlers.registerItem(index), props.ref)
            : handlers.registerItem(index)
        }
        role="radio"
        aria-label={starName(index)}
        aria-id={index === tabStop ? props["aria-id"] : undefined}
        aria-valuetext={starWord(starState(index, value), messages.star)}
        tabIndex={interactive ? (index === tabStop ? 0 : -1) : undefined}
        onLayout={index === tabStop ? props.onLayout : undefined}
        onClick={composePress(!interactive, props.onClick, (event) => {
          handlers.onSelect(scoreAt(index, event));
        })}
        onMouseEnter={interactive ? () => hover.onHover(index) : undefined}
        onMouseMove={
          interactive && half
            ? (event: EventPayload) => hover.onHover(scoreAt(index, event))
            : undefined
        }
        onFocus={composeEvent<EventPayload>(props.onFocus, () =>
          focus.onFocus(index),
        )}
        onBlur={composeEvent<EventPayload>(props.onBlur, () =>
          focus.onBlur(index),
        )}
        style={starStyle}
      >
        {fill >= 1 ? (
          glyph(true)
        ) : (
          <>
            {glyph(false)}
            {fill > 0 ? (
              <div style={ratingPartialStyle(fill)}>
                <div style={ratingPartialCellStyle(theme)}>{glyph(true)}</div>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  };
  return (
    <div
      role="radiogroup"
      aria-label={accessibleName(props.label)}
      aria-description={accessibleName(props.description)}
      testId={props.testId}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, (event) => {
        if (!interactive || !isPlainKey(event.modifiers)) return;
        const key = event.key ?? "";
        if (swallowKeyDefault(key, "down")) event.preventDefault();
        Option.match(decideRating(value, max, key, half), {
          onNone: () => {},
          onSome: handlers.onMove,
        });
        if (decideActivation(key, "down", event.isHeld === true))
          selectFocused();
      })}
      onKeyUp={composeEvent<KeyEvent>(props.onKeyUp, (event) => {
        if (!interactive || !isPlainKey(event.modifiers)) return;
        if (decideActivation(event.key ?? "", "up", false)) selectFocused();
      })}
      onMouseLeave={interactive ? hover.onHoverEnd : undefined}
      style={mergeStyle(
        recipeTw.classesToStyle(cn(ratingGroupClass, props.className), theme)
          .style,
        resolveStyle(props.style, {
          disabled: props.disabled === true,
          readOnly: props.readOnly === true,
          focused: Option.isSome(focusedIndex),
          invalid: props.invalid === true,
        }),
      )}
    >
      {Arr.map(Arr.range(1, max), star)}
    </div>
  );
};

export const Rating = (props: RatingProps): ReactElement => {
  const theme = useTheme();
  const messages = useMessages();
  const { renderer } = useGpuix();
  const itemIds = useRef<Map<number, number>>(new Map());
  const half = props.allowHalf === true;
  const max = ratingMax(props.max);
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    Option.none(),
  );

  const [hovered, setHovered] = useState<Option.Option<number>>(Option.none());
  const state = useControlState(
    props.value,
    clampRating(props.defaultValue ?? 0, max, half),
    valueChange(props),
  );

  const boxOf = (index: number): Option.Option<StarBox> =>
    Option.flatMap(Option.fromNullishOr(itemIds.current.get(index)), (id) =>
      Option.fromNullishOr(renderer?.getElementBounds?.(id)),
    );
  const scoreAt = (index: number, event: EventPayload): number =>
    pointerRating(index, Option.fromNullishOr(event.x), boxOf(index), half);
  return renderRating(
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
      onSelect: state.set,
      onMove: (value) => {
        state.set(value);
        const star = ratingTabStop(value, max, half);
        Option.match(Option.fromNullishOr(itemIds.current.get(star)), {
          onNone: () => {},
          onSome: (id) => renderer?.focusElement?.(id),
        });
        setFocusedIndex(Option.some(star));
      },
      registerItem: (index) => (instance) => {
        if (instance === null) itemIds.current.delete(index);
        else itemIds.current.set(index, instance.id);
      },
      scoreAt,
    },
    {
      hovered,
      onHover: (score) =>
        setHovered((current) =>
          Option.contains(current, score) ? current : Option.some(score),
        ),
      onHoverEnd: () => setHovered(Option.none()),
    },
    messages,
  );
};

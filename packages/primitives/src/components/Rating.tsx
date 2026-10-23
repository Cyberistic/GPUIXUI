/**
 * `Rating` — a score in stars, or none.
 *
 * A rating is shaped like a radio group: one tab stop, arrows move the
 * selection and native focus with it, and Space selects the star holding focus
 * on the **release** (Enter on the press), the way a platform radio does. It is
 * **not** a radio group in one respect: the arrows clamp at the ends instead of
 * wrapping, and Delete clears it back to zero (`core/rating.ts` owns both rules).
 *
 * The paint uses two icons of the same geometry — an outline star and a filled
 * one — tinted with the brand and muted roles, because GPUix's `<svg>` is
 * monochrome and cannot be filled by a style. A **half** star is the same two
 * icons in a clipped box: the runtime has no transform, but a box with
 * `overflow: hidden` clips what it holds (`docs/gpuix-capabilities.md`), so the
 * filled glyph is painted whole and cut at the star's midpoint.
 *
 * The resting appearance is a Tailwind recipe (`recipe/ratingStarClass` and
 * `recipe/ratingGroupClass`), compiled through `@gpuixui/tw`; the caller's
 * `className` is joined last so it wins conflicts exactly as `cn` resolves them.
 */

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
  /** Controlled rating, `0..max` (0 is unrated). */
  readonly value?: number;
  readonly defaultValue?: number;
  /**
   * How many stars to paint; defaults to five. A count that cannot be laid out
   * — `NaN`, an infinity, zero or a negative number — paints one star, the same
   * answer the value clamp, the keys and the tab stop read (`starCount`).
   */
  readonly max?: number;
  /**
   * Score in halves as well as whole stars. The left half of a star is the
   * half below it, so a press can say `3.5`; the arrows step by half and Home
   * lands on the half star. Off by default: a rating is a whole number of
   * stars unless the caller says a finer score is wanted.
   */
  readonly allowHalf?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  /** Shows the value but takes no input and no tab stop. */
  readonly readOnly?: boolean;
  /** The group's name; each star is named from the provider's `starName`. */
  readonly label?: string;
  /** A failed validation: the chosen stars paint the destructive role. */
  readonly invalid?: boolean;
  /** Extra style, resolved against the rating's live state and merged last. */
  readonly style?: StateStyle<RatingState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** What a `Rating` tells a `style` callback. */
export interface RatingState {
  readonly disabled: boolean;
  readonly readOnly: boolean;
  /** True while any star holds native focus. */
  readonly focused: boolean;
  readonly invalid: boolean;
}

/** Which star holds focus, and how the group learns that it moved. */
export interface RatingFocus {
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;
  readonly onBlur: (index: number) => void;
}

/**
 * Where the pointer is, so a rating can preview the score it would choose.
 *
 * A hovered half star previews the half, so the paint answers the pointer
 * exactly as a press would. The preview is **paint only**: the value, the
 * announced state and the tab stop keep reading the rating, because a preview
 * is a hint about the next press, not a change of the answer.
 */
export interface RatingHover {
  /** The score a press would choose, or `None` while the pointer is elsewhere. */
  readonly hovered: Option.Option<number>;
  readonly onHover: (score: number) => void;
  /** The pointer left the group: the paint returns to the value. */
  readonly onHoverEnd: () => void;
}

export interface RatingHandlers {
  readonly onSelect: (value: number) => void;
  /** Select, then move native focus to the star the change landed on. */
  readonly onMove: (value: number) => void;
  readonly registerItem: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
  /**
   * The score a press or a move on `index` at this event aims at.
   *
   * The component owns it because only it can measure the star the event landed
   * on; the pure renderer falls back to the star's whole score.
   */
  readonly scoreAt?: (index: number, event: EventPayload) => number;
}

/**
 * A usable star count for the paint.
 *
 * `max` is caller arithmetic (a measured total, a stored preference), so it
 * goes through the same rule the value, the keys and the tab stop read
 * (`starCount`): a count that cannot be laid out is one star rather than an
 * `Arr.range` bound — `new Array(Infinity)` throws. No `max` is the documented
 * five.
 */
export const ratingMax = (max: number | undefined): number =>
  max === undefined ? 5 : starCount(max);

/** A pointer that is nowhere: the idle state a render helper starts from. */
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
  // A star's name is the provider's sentence over its position. A table with a
  // missing row answers nothing, so the shipped sentence names it rather than an
  // empty `aria-label` on a radio (see `spokenSentence`).
  const starName = (index: number): string =>
    spokenSentence(
      messages.starName(index, max),
      defaultMessages.starName(index, max),
    );
  // A star the rating no longer draws cannot hold focus: `max` is caller
  // arithmetic, so a list that shrank would otherwise leave the group painting
  // itself focused over stars nobody focused and send the next key to the
  // clamped tail.
  const focusedIndex = Option.filter(
    focus.focusedIndex,
    (index) => index >= 1 && index <= max,
  );
  const interactive = props.disabled !== true && props.readOnly !== true;
  /** The score the paint reaches: the pointer's while it is inside, else the value. */
  const lit = interactive
    ? clampRating(
        Option.getOrElse(hover.hovered, () => value),
        max,
        half,
      )
    : value;
  /** The star an activating key chooses: the one holding focus, else the tab stop. */
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
  /** One glyph, in the role its fill carries. */
  const glyph = (filled: boolean): ReactElement => (
    <Icon
      name={filled ? "star-filled" : "star"}
      size={controlSize(props.size)}
      color={ratingStarColor(filled, theme, props.invalid)}
    />
  );
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
        // The state stays the rating's: a previewed star is filled, not chosen.
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

/** A score in stars, or none. */
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
  // Paint-only: the preview is discarded when the pointer leaves, so it never
  // reaches the value, the name or the tab stop.
  const [hovered, setHovered] = useState<Option.Option<number>>(Option.none());
  const state = useControlState(
    props.value,
    clampRating(props.defaultValue ?? 0, max, half),
    valueChange(props),
  );
  /** The star a press or a move landed on, in window pixels. */
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

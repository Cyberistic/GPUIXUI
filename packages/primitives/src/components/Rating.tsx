/**
 * `Rating` — a whole number of stars, or none.
 *
 * A rating is shaped like a radio group: one tab stop, arrows move the cursor
 * (the ring) and commit the star it lands on, and Enter/Space commit the star
 * the ring is already on. It is **not** a radio group in one respect: the arrows
 * clamp at the ends instead of wrapping, and Delete clears it back to zero
 * (`core/rating.ts` owns both rules).
 *
 * The paint uses two icons of the same geometry — an outline star and a filled
 * one — tinted with the brand and muted roles, because GPUix's `<svg>` is
 * monochrome and cannot be filled by a style.
 */

import { useEffect, useState, type ReactElement } from "react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import {
  clampRating,
  decideRating,
  previewRating,
  ratingLimit,
  ratingTabStop,
} from "../core/rating.js";
import { decideActivation, moveFrom } from "../core/keyboard.js";
import { ratingStarColor, ratingStarStyle } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  ariaName,
  resolvePartStyle,
  useControlState,
  useRovingFocus,
  type StateStyle,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `Rating` style callback receives. */
export interface RatingState {
  readonly disabled: boolean;
  /** Shows the value and keeps its tab stop, but takes no input (plan `800`). */
  readonly readOnly: boolean;
  readonly invalid: boolean;
}

/** The public state a `Rating` star callback receives. */
export interface RatingStarState {
  /** 1-based, matching the star's announced "N of max". */
  readonly index: number;
  readonly filled: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly invalid: boolean;
  readonly focused: boolean;
}

export interface RatingProps {
  /** Controlled rating, `0..max` (0 is unrated). */
  readonly value?: number;
  readonly defaultValue?: number;
  readonly onValueChange?: (value: number) => void;
  /** Defaults to 5. */
  readonly max?: number;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  /** Shows the value and keeps its tab stop, but takes no input (plan `800`). */
  readonly readOnly?: boolean;
  /** Validation failed: the empty stars take the destructive role. */
  readonly invalid?: boolean;
  /** The group's name; each star is announced as "N of max". */
  readonly label?: string;
  /** An object, or a callback over the rating's public state. */
  readonly style?: StateStyle<RatingState>;
  /**
   * An object, or a callback over each star's own state. Merged last on the
   * star that holds its own focus and announces "N of max".
   */
  readonly starStyle?: StateStyle<RatingStarState>;
  readonly testId?: string;
}

/**
 * The star under the pointer, and how the group learns it moved.
 *
 * A preview is paint only: the committed value and its `aria-valuetext` are the
 * component's state, and a hovered star never changes them.
 */
export interface RatingHover {
  readonly preview: Option.Option<number>;
  readonly onEnter: (index: number) => void;
  readonly onLeave: () => void;
}

/** Which star holds focus, and how the group learns that it moved. */
export interface RatingFocus {
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;
  readonly onBlur: (index: number) => void;
}

export interface RatingHandlers {
  readonly onSelect: (value: number) => void;
  /** Select, then move native focus to the star the change landed on. */
  readonly onMove: (value: number) => void;
  readonly registerItem: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
}

/** A usable star count: at least one, whole. A non-finite count reads as one. */
export const ratingMax = (max: number | undefined): number =>
  ratingLimit(max ?? 5);

/** The element tree `Rating` renders from its value and any hovered star. */
export const renderRating = (
  props: RatingProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  focus: RatingFocus,
  hover: RatingHover,
  handlers: RatingHandlers,
): ReactElement => {
  const max = ratingMax(props.max);
  const value = clampRating(state.current, max);
  const tabStop = ratingTabStop(value, max);
  const interactive = props.disabled !== true && props.readOnly !== true;
  /**
   * A read-only rating is a display state, not a disabled one: it keeps the
   * group's single tab stop so a keyboard user can reach the value it shows
   * (plan `800`, the rule plan `786` gave every field).
   */
  const focusable = props.disabled !== true;
  /**
   * Where the keyboard is: the focused star, else the committed value.
   *
   * A controlled parent that defers or rejects the value leaves the ring ahead
   * of the paint, so an arrow must continue from the ring (plan `359`). The
   * unrated tab stop is star 1, which is *not* selected: the arrows move the
   * ring, and Enter/Space commits the star it is on.
   */
  const cursor = moveFrom(value, focus.focusedIndex);
  // A preview is an input affordance: an inert rating never paints one, and a
  // pending preview is ignored the moment the control becomes inert.
  const painted = interactive
    ? previewRating(value, hover.preview, max)
    : value;
  const star = (index: number): ReactElement => {
    const focused = Option.exists(
      focus.focusedIndex,
      (focusedIndex) => focusedIndex === index,
    );
    return (
      <div
        key={index}
        ref={handlers.registerItem(index)}
        role="radio"
        aria-label={`${index} of ${max}`}
        aria-valuetext={index <= value ? "checked" : "unchecked"}
        tabIndex={focusable ? (index === tabStop ? 0 : -1) : undefined}
        testId={
          props.testId === undefined
            ? undefined
            : `${props.testId}-star-${index}`
        }
        onClick={() => {
          if (interactive) handlers.onSelect(index);
        }}
        onFocus={() => focus.onFocus(index)}
        onBlur={() => focus.onBlur(index)}
        onMouseEnter={interactive ? () => hover.onEnter(index) : undefined}
        style={resolvePartStyle(
          ratingStarStyle(
            {
              size: props.size ?? "md",
              disabled: props.disabled,
              readOnly: props.readOnly,
              focused,
            },
            theme,
          ),
          props.starStyle,
          {
            index,
            filled: index <= painted,
            disabled: props.disabled === true,
            readOnly: props.readOnly === true,
            invalid: props.invalid === true,
            focused,
          },
        )}
      >
        <Icon
          name={index <= painted ? "star-filled" : "star"}
          size={props.size ?? "md"}
          color={ratingStarColor(
            index <= painted,
            theme,
            props.invalid === true,
          )}
        />
      </div>
    );
  };
  return (
    <div
      role="radiogroup"
      aria-label={ariaName(props.label)}
      testId={props.testId}
      onMouseLeave={interactive ? hover.onLeave : undefined}
      onKeyDown={(event) => {
        if (!interactive) return;
        const key = event.key ?? "";
        Option.match(decideRating(cursor, max, key), {
          onNone: () => {},
          onSome: handlers.onMove,
        });
        if (decideActivation(key, "down", event.isHeld === true))
          handlers.onSelect(cursor);
      }}
      onKeyUp={(event) => {
        if (!interactive) return;
        if (decideActivation(event.key ?? "", "up", event.isHeld === true))
          handlers.onSelect(cursor);
      }}
      style={resolvePartStyle(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing["2xs"],
        },
        props.style,
        {
          disabled: props.disabled === true,
          readOnly: props.readOnly === true,
          invalid: props.invalid === true,
        },
      )}
    >
      {Arr.map(Arr.range(1, max), star)}
    </div>
  );
};

/** A whole number of stars, or none. */
export const Rating = (props: RatingProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const focus = useRovingFocus();
  const [preview, setPreview] = useState<Option.Option<number>>(Option.none());
  const inert = props.disabled === true || props.readOnly === true;
  /**
   * A preview is an input affordance, and an inert control never receives the
   * pointer leave that would clear it: measured, a rating hovered on star 4 and
   * then made read-only painted 2 while inert and 4 again the moment it became
   * interactive, with the pointer never back on star 4 (plan `801`).
   */
  useEffect(() => {
    if (inert) setPreview(Option.none());
  }, [inert]);
  const state = useControlState(
    props.value,
    clampRating(props.defaultValue ?? 0, ratingMax(props.max)),
    props.onValueChange,
  );
  return renderRating(
    props,
    theme,
    state.value,
    {
      focusedIndex: focus.focusedIndex,
      onFocus: focus.onFocus,
      onBlur: focus.onBlur,
    },
    {
      preview,
      onEnter: (index) => setPreview(Option.some(index)),
      onLeave: () => setPreview(Option.none()),
    },
    {
      onSelect: state.set,
      onMove: (value) => {
        state.set(value);
        // A rating has no star 0: a clear lands on the tab stop, star 1.
        // Resolve one target for the native call and the paint so the ring
        // and the keyboard can never name different stars (plan 334).
        const target = ratingTabStop(value, ratingMax(props.max));
        Option.match(focus.idOf(target), {
          onNone: () => {},
          onSome: (id) => renderer?.focusElement?.(id),
        });
        focus.onFocus(target);
      },
      registerItem: focus.registerItem,
    },
  );
};

/**
 * `Rating` — a whole number of stars, or none.
 *
 * A rating is shaped like a radio group: one tab stop, arrows move the
 * selection and native focus with it. It is **not** a radio group in one
 * respect: the arrows clamp at the ends instead of wrapping, and Delete clears
 * it back to zero (`core/rating.ts` owns both rules).
 *
 * The paint uses two icons of the same geometry — an outline star and a filled
 * one — tinted with the brand and muted roles, because GPUix's `<svg>` is
 * monochrome and cannot be filled by a style.
 */

import { useRef, useState, type ReactElement } from "react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { clampRating, decideRating, ratingTabStop } from "../core/rating.js";
import { ratingStarColor, ratingStarStyle } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { mergeStyle, useControlState } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface RatingProps {
  /** Controlled rating, `0..max` (0 is unrated). */
  readonly value?: number;
  readonly defaultValue?: number;
  readonly onChange?: (value: number) => void;
  /** Defaults to 5. */
  readonly max?: number;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  /** Shows the value but takes no input and no tab stop. */
  readonly readOnly?: boolean;
  /** Validation failed: the empty stars take the destructive role. */
  readonly invalid?: boolean;
  /** The group's name; each star is announced as "N of max". */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
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

/** A usable star count: at least one, whole. */
export const ratingMax = (max: number | undefined): number =>
  Math.max(1, Math.trunc(max ?? 5));

export const renderRating = (
  props: RatingProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  focus: RatingFocus,
  handlers: RatingHandlers,
): ReactElement => {
  const max = ratingMax(props.max);
  const value = clampRating(state.current, max);
  const tabStop = ratingTabStop(value, max);
  const interactive = props.disabled !== true && props.readOnly !== true;
  const star = (index: number): ReactElement => (
    <div
      key={index}
      ref={handlers.registerItem(index)}
      role="radio"
      aria-label={`${index} of ${max}`}
      aria-valuetext={index <= value ? "checked" : "unchecked"}
      tabIndex={interactive ? (index === tabStop ? 0 : -1) : undefined}
      onClick={() => {
        if (interactive) handlers.onSelect(index);
      }}
      onFocus={() => focus.onFocus(index)}
      onBlur={() => focus.onBlur(index)}
      style={ratingStarStyle(
        {
          size: props.size ?? "md",
          disabled: props.disabled,
          readOnly: props.readOnly,
          focused: Option.exists(
            focus.focusedIndex,
            (focused) => focused === index,
          ),
        },
        theme,
      )}
    >
      <Icon
        name={index <= value ? "star-filled" : "star"}
        size={props.size ?? "md"}
        color={ratingStarColor(index <= value, theme, props.invalid === true)}
      />
    </div>
  );
  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      testId={props.testId}
      onKeyDown={(event) => {
        if (!interactive) return;
        Option.match(decideRating(value, max, event.key ?? ""), {
          onNone: () => {},
          onSome: handlers.onMove,
        });
      }}
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing["2xs"],
        },
        props.style,
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
  const itemIds = useRef<Map<number, number>>(new Map());
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    Option.none(),
  );
  const state = useControlState(
    props.value,
    clampRating(props.defaultValue ?? 0, ratingMax(props.max)),
    props.onChange,
  );
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
        Option.match(Option.fromNullishOr(itemIds.current.get(value)), {
          onNone: () => {},
          onSome: (id) => renderer?.focusElement?.(id),
        });
        setFocusedIndex(Option.some(value === 0 ? 1 : value));
      },
      registerItem: (index) => (instance) => {
        if (instance === null) itemIds.current.delete(index);
        else itemIds.current.set(index, instance.id);
      },
    },
  );
};

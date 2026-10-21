/**
 * `Rating` — a whole number of stars, or none.
 *
 * A rating is shaped like a radio group: one tab stop, arrows move the
 * selection and native focus with it, and Space selects the star holding focus
 * on the **release** (Enter on the press), the way a platform radio does. It is
 * **not** a radio group in one respect: the arrows clamp at the ends instead of
 * wrapping, and Delete clears it back to zero (`core/rating.ts` owns both rules).
 *
 * The paint uses two icons of the same geometry — an outline star and a filled
 * one — tinted with the brand and muted roles, because GPUix's `<svg>` is
 * monochrome and cannot be filled by a style.
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
import { accessibleName } from "../core/a11y.js";
import { decideActivation, swallowKeyDefault } from "../core/keyboard.js";
import { clampRating, decideRating, ratingTabStop } from "../core/rating.js";
import { ratingStarColor } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { ratingGroupClass, ratingStarClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { controlRing } from "../core/focus.js";
import {
  composeEvent,
  composePress,
  mergeStyle,
  useControlState,
  valueChange,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface RatingProps
  extends ValueChangeProps<number>, InteractionProps {
  /** Controlled rating, `0..max` (0 is unrated). */
  readonly value?: number;
  readonly defaultValue?: number;
  /** Defaults to 5. */
  readonly max?: number;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  /** Shows the value but takes no input and no tab stop. */
  readonly readOnly?: boolean;
  /** The group's name; each star is announced as "N of max". */
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
  /** The star an activating key chooses: the one holding focus, else the tab stop. */
  const focusedStar = clampRating(
    Option.getOrElse(focus.focusedIndex, () => tabStop),
    max,
  );
  const selectFocused = (): void => {
    handlers.onSelect(focusedStar);
  };
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
  const star = (index: number): ReactElement => (
    <div
      key={index}
      ref={handlers.registerItem(index)}
      role="radio"
      aria-label={`${index} of ${max}`}
      aria-valuetext={index <= value ? "checked" : "unchecked"}
      tabIndex={interactive ? (index === tabStop ? 0 : -1) : undefined}
      onClick={composePress(!interactive, props.onClick, () => {
        handlers.onSelect(index);
      })}
      onFocus={composeEvent<EventPayload>(props.onFocus, () =>
        focus.onFocus(index),
      )}
      onBlur={composeEvent<EventPayload>(props.onBlur, () =>
        focus.onBlur(index),
      )}
      style={starStyle}
    >
      <Icon
        name={index <= value ? "star-filled" : "star"}
        size={props.size ?? "md"}
        color={ratingStarColor(index <= value, theme, props.invalid)}
      />
    </div>
  );
  return (
    <div
      role="radiogroup"
      aria-label={accessibleName(props.label)}
      testId={props.testId}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, (event) => {
        if (!interactive) return;
        const key = event.key ?? "";
        if (swallowKeyDefault(key, "down")) event.preventDefault();
        Option.match(decideRating(value, max, key), {
          onNone: () => {},
          onSome: handlers.onMove,
        });
        if (decideActivation(key, "down", event.isHeld === true))
          selectFocused();
      })}
      onKeyUp={composeEvent<KeyEvent>(props.onKeyUp, (event) => {
        if (!interactive) return;
        if (decideActivation(event.key ?? "", "up", false)) selectFocused();
      })}
      style={mergeStyle(
        recipeTw.classesToStyle(cn(ratingGroupClass, props.className), theme)
          .style,
        resolveStyle(props.style, {
          disabled: props.disabled === true,
          readOnly: props.readOnly === true,
          focused: Option.isSome(focus.focusedIndex),
          invalid: props.invalid === true,
        }),
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
    valueChange(props),
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

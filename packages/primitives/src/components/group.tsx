/**
 * The pieces a group of controls shares: its option shape, the body each row
 * paints, and the reader that turns item children into the same option list the
 * data prop produces.
 *
 * A radio, checkbox and toggle group differ in what picking an option means,
 * not in how an option reads. Keeping the row body here is what stops the three
 * from drifting: an option's visible name and the name it announces are always
 * the same string.
 */

import {
  Children,
  Fragment,
  isValidElement,
  useRef,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { targetSize } from "@gpuixui/tokens";
import { controlRing } from "../core/focus.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { Text } from "./Text.js";

/** One option in a group control. */
export interface GroupOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
  /** Rich content — an icon, a price — drawn in place of the name and description. */
  readonly content?: ReactNode;
}

/** The props an item element carries, whether it is data or rich content. */
export interface GroupItemProps {
  readonly value: string;
  /** The accessible name, and the visible text unless `children` replaces it. */
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
  /** Rich content drawn instead of `label`/`description`. */
  readonly children?: ReactNode;
}

/**
 * The option list a group renders: the data prop, or its item children.
 *
 * Fragments and arrays are transparent, so a caller can group items without
 * changing what the group sees. The item component is the one that draws
 * nothing; the group renders every row itself so the roving index and the key
 * contract have a single path.
 */
export const optionItems = <Props extends GroupItemProps>(
  children: ReactNode,
  Item: ComponentType<Props>,
): ReadonlyArray<GroupOption> =>
  Arr.flatMap(Children.toArray(children), (child) => {
    if (!isValidElement<Props>(child)) return [];
    if (child.type === Fragment) return optionItems(child.props.children, Item);
    if (child.type !== Item) return [];
    return [
      {
        value: child.props.value,
        label: child.props.label,
        description: child.props.description,
        disabled: child.props.disabled,
        content: child.props.children,
      },
    ];
  });

/**
 * The body of one row: the name pair, or the option's rich content.
 *
 * Keep the content non-interactive — GPUix hit-tests the deepest element and
 * does not bubble, so content that accepts the press takes it from the row.
 */
export const optionBody = (
  option: GroupOption,
  disabled: boolean,
  theme: PrimitiveTheme,
): ReactElement => (
  <div
    style={
      recipeTw.classesToStyle("flex flex-row items-center gap-sm", theme).style
    }
  >
    {option.content === undefined ? (
      <>
        <Text role="label" tone={disabled ? "muted" : "default"}>
          {option.label}
        </Text>
        {option.description === undefined ? null : (
          <Text role="caption" tone="muted">
            {option.description}
          </Text>
        )}
      </>
    ) : (
      option.content
    )}
  </div>
);

/** The row container a group paints: one line, and the press cursor it earns. */
export const optionRowClass = (disabled: boolean): string =>
  `flex flex-row items-center gap-sm ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`;

/**
 * The style every group option row paints.
 *
 * The row is the control, so it owns the two things a child cannot: the
 * pressable floor — a single-line option row measured 17px tall on 0.11.0, under
 * WCAG 2.2 SC 2.5.8's 24px — and the keyboard ring, because `focusVisible` is a
 * refinement the runtime applies only to an element it tracks focus for, so a
 * ring declared on the box a row draws never painted.
 */
export const optionRowStyle = (
  state: { readonly disabled: boolean; readonly invalid?: boolean },
  theme: PrimitiveTheme,
): StyleDesc =>
  mergeStyle(
    mergeStyle(
      recipeTw.classesToStyle(optionRowClass(state.disabled), theme).style,
      controlRing(theme, {
        disabled: state.disabled,
        invalid: state.invalid,
      }),
    ),
    { minHeight: targetSize.minimum },
  );

/**
 * A box a row draws inside itself: painted, hoverable, and never the press
 * target.
 *
 * A painted element owns a mouse-blocking hitbox in this runtime
 * (`should_occlude`), so a filled box swallowed the press before the row's
 * handler ran — measured: a checked option could not be unchecked by pressing
 * its own box. `pointerEvents: "none"` leaves it painted while the press falls
 * through to the row.
 */
export const optionBoxStyle = (style: StyleDesc): StyleDesc =>
  mergeStyle(style, { pointerEvents: "none" });

/** Which option holds native focus, and how the group learns that it moved. */
export interface GroupFocus {
  /** The focused option, or `None` while focus is outside the group. */
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;
  /** Reports the index that lost focus, so a stale blur cannot clear the ring. */
  readonly onBlur: (index: number) => void;
}

/** What a group asks its owner to do with focus. */
export interface GroupHandlers {
  /** Move native focus to the option a keyboard move landed on. */
  readonly onFocusMove: (index: number) => void;
  /** Register an option's host instance, so the group can call `focusElement`. */
  readonly registerItem: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
}

/** The state a group tracks for its roving tab stop. */
export interface RovingFocus extends GroupFocus, GroupHandlers {}

/**
 * Track which option holds focus, and move native focus between options.
 *
 * Focus is tracked **per option**, not on the wrapper: GPUix dispatches an
 * event to the element that owns the handler, so a wrapper never sees a child's
 * focus. The group needs this because the focused row paints the ring.
 */
export const useRovingFocus = (): RovingFocus => {
  const { renderer } = useGpuix();
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    Option.none(),
  );
  const ids = useRef<Map<number, number>>(new Map());
  return {
    focusedIndex,
    onFocus: (index) => setFocusedIndex(Option.some(index)),
    onBlur: (index) =>
      setFocusedIndex((current) =>
        Option.filter(current, (focused) => focused !== index),
      ),
    registerItem: (index) => (instance) => {
      if (instance === null) ids.current.delete(index);
      else ids.current.set(index, instance.id);
    },
    onFocusMove: (index) =>
      Option.match(
        Option.all({
          id: Option.fromNullishOr(ids.current.get(index)),
          target: Option.fromNullishOr(renderer),
        }),
        {
          onNone: () => {},
          // Paint where focus is going in the same commit: the focus event
          // follows the native call, and waiting for it would paint the ring a
          // frame late. The call keeps its receiver — `focusElement` is a
          // method on the renderer, not a free function.
          onSome: ({ id, target }) => {
            target.focusElement?.(id);
            setFocusedIndex(Option.some(index));
          },
        },
      ),
  };
};

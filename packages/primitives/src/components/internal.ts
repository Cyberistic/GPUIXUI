/**
 * Small pieces every component needs.
 *
 * `mergeStyle` is how a caller's `style` prop wins over a resolved one without
 * each component re-implementing a spread. `useStep` is the one animation the
 * runtime allows: a discrete step advanced on a timer, because `motion` cannot
 * rotate or interpolate a colour (see `docs/gpuix-capabilities.md`).
 */

import { Children, useEffect, useState, type ReactNode, type Ref } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type {
  EventPayload,
  KeyEvent,
  Props,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import {
  initValueState,
  setValue,
  withValue,
  type ValueState,
} from "../core/state.js";
import type { Density, PrimitiveTheme } from "../core/theme.js";

/**
 * The name a button-shaped control's plain text children carry.
 *
 * A `<div role="button">Save</div>` has no accessible name unless the wrapper
 * publishes the text it paints; rich (`Text`) children get no derived name, so
 * an icon-only or composed control still needs an explicit `label`.
 */
export const childrenName = (children: ReactNode): string | undefined => {
  const text = Children.toArray(children)
    .filter(
      (child): child is string | number =>
        typeof child === "string" || typeof child === "number",
    )
    .join(" ")
    .trim();
  return text === "" ? undefined : text;
};

/** The caller's style wins, property by property. */
export const mergeStyle = (
  base: StyleDesc,
  override: StyleDesc | undefined,
): StyleDesc => (override === undefined ? base : { ...base, ...override });

/**
 * The host events an interactive part accepts.
 *
 * A part owns behaviour a caller must not be able to replace — activation,
 * focus tracking, the key contract — so these handlers are **composed** with it
 * rather than handed the element: the caller sees the event first and the part
 * still acts afterwards. A consumer that needs to stop the runtime's own
 * default (a Tab, a text edit) calls `preventDefault()` on the event it is
 * given; that flag is the runtime's, not this package's.
 *
 * A part with more than one interactive element installs the caller's handler
 * on every element it gives that handler to — each option row, each cell — so
 * the caller observes the interaction wherever it landed. A blocked press (a
 * disabled option, a stepper at its bound) installs no handler on that element
 * at all; a field's disabled state is an observation surface and keeps them.
 */
export interface InteractionProps {
  readonly onClick?: (event: EventPayload) => void;
  readonly onKeyDown?: (event: KeyEvent) => void;
  readonly onKeyUp?: (event: KeyEvent) => void;
  readonly onFocus?: (event: EventPayload) => void;
  readonly onBlur?: (event: EventPayload) => void;
}

/**
 * The host props a text field hands to its native element.
 *
 * A field's value, name, editing state and chrome are the field's, but its
 * element still has to be addressable from outside: a form focuses the field
 * that failed, an automation host addresses it by `aria-id`, and a layout
 * measures its box. Those are the runtime's own host props, so they pass
 * through instead of becoming a second vocabulary.
 *
 * This is deliberately narrower than {@link ActionHostProps}: a text host owns
 * no disclosure state, so there is no `aria-expanded`/`aria-selected` to
 * forward, and its tab stop belongs to the field because a disabled field
 * leaves the order whatever the caller asks for.
 */
export interface FieldHostProps {
  /** The element a form focuses, measures or anchors to. */
  readonly ref?: Ref<PublicInstance>;
  /** Author id exposed as `AXIdentifier` / UIA AutomationId. */
  readonly "aria-id"?: string;
  /** The addressed element's painted box after the first paint and each resize. */
  readonly onLayout?: (event: EventPayload) => void;
}

/**
 * The announced help a control carries.
 *
 * A `Label` beside a control paints its description; there is no
 * `aria-describedby`, so the control also carries the words itself as
 * `aria-description`. A blank one publishes nothing — the same rule as a blank
 * name.
 */
export interface HelpProps {
  /**
   * Announced help after the name — a format hint, or the message for an
   * `invalid` control. The words a visible `Label`'s `description` paints.
   */
  readonly description?: string;
}

/**
 * Compose a caller's ref with a part's own.
 *
 * A control that owns an element for its own behaviour (a field focusing
 * itself, a group's roving tab stop) still has to hand the same element to the
 * caller, so both refs are written rather than one replacing the other.
 */
export const mergeRefs = <Instance>(
  ...refs: ReadonlyArray<Ref<Instance> | undefined>
): ((instance: Instance | null) => void) => {
  return (instance) => {
    Arr.forEach(refs, (ref) => {
      if (ref === undefined || ref === null) return;
      if (typeof ref === "function") ref(instance);
      else ref.current = instance;
    });
  };
};

/**
 * The host props an action hands to its element unchanged.
 *
 * A control that opens something has to be addressable itself: a popover's
 * trigger takes a `ref` so the surface can be anchored to it, a menu trigger
 * writes `aria-expanded`/`aria-selected` so its state is announced, and a
 * hover-opened surface needs the pointer pair. Those are the runtime's own host
 * props, so this type forwards them rather than inventing a second vocabulary.
 *
 * Everything the control **owns** is removed here instead of from the element:
 * the role, the tab stop, the accessible name, the style, the test id and every
 * handler the activation contract composes. A caller therefore cannot replace
 * the behaviour by passing a host prop of the same name — the component writes
 * its own copy after the spread.
 */
export type ActionHostProps = Omit<
  Props,
  | "key"
  | "children"
  | "style"
  | "role"
  | "tabIndex"
  | "aria-label"
  | "aria-description"
  | "motion"
  | "testId"
  | "onClick"
  | "onKeyDown"
  | "onKeyUp"
  | "onFocus"
  | "onBlur"
  | "onMouseEnter"
  | "onMouseLeave"
>;

/**
 * The host props an `asChild` tooltip trigger forwards.
 *
 * GPUix's `TooltipTrigger` merges its handlers into the child element, and the
 * runtime delivers a hover only to the element that registered the listener —
 * an ancestor never hears a child's hover — so a control has to carry this pair
 * itself to open a tip on hover. `aria-description` is the description channel
 * 0.11.0 publishes (`aria-describedby` does not exist): the tip arrives there
 * and a control hands it to its host like any other attribute. The button-shaped
 * controls (`Button`, `IconButton`, `Toggle`) are the ones that declare it.
 */
export interface TooltipTriggerProps {
  readonly onMouseEnter?: (event: EventPayload) => void;
  readonly onMouseLeave?: (event: EventPayload) => void;
  readonly "aria-description"?: string;
}

/**
 * Compose a caller's handler with a part's own.
 *
 * The caller runs first, then the part. Either may be absent: with no caller
 * the part's handler is returned unchanged (no extra closure per render), and
 * with neither the host gets no handler at all.
 */
export const composeEvent = <Event>(
  caller: ((event: Event) => void) | undefined,
  internal: ((event: Event) => void) | undefined,
): ((event: Event) => void) | undefined =>
  caller === undefined
    ? internal
    : internal === undefined
      ? caller
      : (event) => {
          caller(event);
          internal(event);
        };

/**
 * A press a blocked part refuses entirely.
 *
 * A disabled control installs no press handler at all, so neither the caller's
 * `onClick` nor the action runs — the same rule the components package's list
 * rows use. Keys and focus stay observable: a control disabled while focused
 * must still report the focus it holds.
 */
export const composePress = (
  blocked: boolean,
  caller: ((event: EventPayload) => void) | undefined,
  action: () => void,
): ((event: EventPayload) => void) | undefined =>
  blocked
    ? undefined
    : (event) => {
        caller?.(event);
        action();
      };

/** A disabled control keeps its resting fill and drops hover/active feedback. */
export const suppressFeedback = (style: StyleDesc): StyleDesc => ({
  ...style,
  hover: { backgroundColor: style.backgroundColor },
  active: { backgroundColor: style.backgroundColor },
});

/**
 * A disabled selection control (checkbox, radio, switch) keeps its resting
 * fill **and border**, and drops the press response entirely — unlike a field,
 * whose disabled hover still lifts the fill. Matches `selectionBoxStyle`'s and
 * `switchTrackStyle`'s disabled branch.
 */
export const suppressSelectionFeedback = (style: StyleDesc): StyleDesc => ({
  ...style,
  hover: {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
  },
  active: {},
});

/**
 * A drawing inside a control: painted and hoverable, never the press target.
 *
 * Two measured rules meet here. A painted element owns a mouse-blocking hitbox
 * in this runtime (`should_occlude`), so a fill drawn inside a row or a target
 * swallowed the press before the control's own handler ran; and
 * `pointerEvents: "none"` removes only the *blocking*, not the element's
 * hitbox, so its `hover` refinement still paints while the press falls through
 * to the target. A wheel over it still reaches the scroller behind it — forcing
 * the press with `pointerEvents: "auto"` would instead make the drawing
 * `occlude()`, which stops the wheel too.
 */
export const decorative = (style: StyleDesc): StyleDesc =>
  mergeStyle(style, { pointerEvents: "none" });

/**
 * The theme a provider hands down.
 *
 * Density moves numbers and never colour, so the override swaps the `density`
 * group and nothing else — and an absent override returns the theme *itself*,
 * so a re-render cannot silently clone a palette.
 */
export const withDensity = (
  theme: PrimitiveTheme,
  density: Density | undefined,
): PrimitiveTheme => (density === undefined ? theme : { ...theme, density });

/** Whether a control holds focus, and the handlers that track it. */
export interface FocusState {
  readonly focused: boolean;
  readonly onFocus: () => void;
  readonly onBlur: () => void;
}

/**
 * Track focus for a control.
 *
 * The ring is no longer painted from this state — it is `keyboardRing`, declared
 * at rest and painted by the runtime after keyboard input (`core/focus.ts`). What
 * remains is the public `focused` flag a `StateStyle` callback may branch on.
 * React-local render state with no other reader, so a hook — not a shared Atom —
 * is right.
 */
export const useFocus = (): FocusState => {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
};

/**
 * The change props a boolean control accepts.
 *
 * `onCheckedChange` is the contract's name for a boolean part
 * (`docs/component-api.md` §2, base-gpui's `on_checked_change`). `onChange` is
 * the deprecated alias kept for one release; when a caller passes both, the new
 * name is the one that runs, so migrating cannot double-fire a handler.
 */
export interface CheckedChangeProps {
  readonly onCheckedChange?: (next: boolean) => void;
  /** @deprecated use `onCheckedChange`; removed in the next release. */
  readonly onChange?: (next: boolean) => void;
}

/** The one change callback a boolean control calls. */
export const checkedChange = (
  props: CheckedChangeProps,
): ((next: boolean) => void) | undefined =>
  props.onCheckedChange ?? props.onChange;

/**
 * The change props a value control accepts.
 *
 * `onValueChange` is the contract's name (`docs/component-api.md` §2). `onChange`
 * is the deprecated alias kept for one release; when a caller passes both, the
 * new name runs, so migrating cannot double-fire a handler.
 */
export interface ValueChangeProps<Value> {
  readonly onValueChange?: (next: Value) => void;
  /** @deprecated use `onValueChange`; removed in the next release. */
  readonly onChange?: (next: Value) => void;
}

/** The one change callback a value control calls. */
export const valueChange = <Value>(
  props: ValueChangeProps<Value>,
): ((next: Value) => void) | undefined => props.onValueChange ?? props.onChange;

/** A control's controlled/uncontrolled value, and the setter that respects it. */
export interface ControlState<Value> {
  readonly value: ValueState<Value>;
  readonly set: (next: Value) => void;
}

/**
 * The shared controlled/uncontrolled behaviour for any control.
 *
 * `value` present means the parent owns the value; absent means the control
 * keeps its own copy. `onChange` is only called when the value actually changed,
 * so a parent is not woken by an interaction that changed nothing.
 */
export const useControlState = <Value>(
  value: Value | undefined,
  defaultValue: Value,
  onChange: ((next: Value) => void) | undefined,
): ControlState<Value> => {
  const [state, setState] = useState(() =>
    initValueState(Option.fromNullishOr(value), defaultValue),
  );
  const current = withValue(state, Option.fromNullishOr(value));
  return {
    value: current,
    set: (next) => {
      const applied = setValue(current, next);
      setState(applied.state);
      if (applied.notify) onChange?.(next);
    },
  };
};

/**
 * A counter that advances every `intervalMs` and wraps at `steps`.
 *
 * Used only by the loading indicators, which have no other way to move. It is
 * React-local animation state — nothing else reads it and it is discarded when
 * the indicator unmounts — so a `useState`/`useEffect` pair is the right tool;
 * an Atom would make a private frame counter shared, global state. The step
 * *maths* stays in `core/loading.ts` where it is provable.
 *
 * `running` is false for a control that has nothing to animate: a determinate
 * progress bar draws a fixed fill, so its timer would wake the tree every
 * interval for a segment it never paints.
 */
export const useStep = (
  steps: number,
  intervalMs: number,
  running = true,
): number => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(
      () => setStep((current) => (current + 1) % steps),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [steps, intervalMs, running]);
  return step;
};

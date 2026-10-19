/**
 * Small pieces every component needs.
 *
 * `mergeStyle` is how a caller's `style` prop wins over a resolved one without
 * each component re-implementing a spread. `useStep` is the loading family's
 * animation: a discrete step on a timer, because a looping indicator cannot use
 * `motion` (it has no `repeat`) and `motion` cannot rotate or interpolate a
 * colour (plan 020 §1.2, plan 329).
 */

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Str from "effect/String";
import type { Props, PublicInstance, StyleDesc } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import {
  initValueState,
  setValue,
  withValue,
  type ValueState,
} from "../core/state.js";
import { usableText } from "../core/text.js";
import type { Density, PrimitiveTheme } from "../core/theme.js";
import { isTrackedFocus, useNativeFocus } from "./native-focus.js";

/** The caller's style wins, property by property. */
export const mergeStyle = (
  base: StyleDesc,
  override: StyleDesc | undefined,
): StyleDesc => (override === undefined ? base : { ...base, ...override });

/**
 * The interaction handlers a slot (`asChild`) injects into its trigger.
 *
 * GPUix's `Tooltip`, `FloatingLayer` slots and this package's future overlays
 * clone a trigger element with these props. A component that can be a trigger
 * accepts them and forwards them to its one host element; the events it
 * already owns (`onFocus`, `onBlur`, `onKeyDown`, `onKeyUp` and `onClick`) are
 * composed, not replaced. Without this the props stop at the component
 * boundary and the tooltip never hears the hover (plan 341).
 */
export type TriggerHandlers = Pick<
  Props,
  | "ref"
  | "onMouseEnter"
  | "onMouseLeave"
  | "onMouseMove"
  | "onMouseDown"
  | "onMouseUp"
  | "onMouseDownOutside"
  | "onAuxClick"
  | "onScroll"
  | "onFocus"
  | "onBlur"
  | "onKeyDown"
  | "onKeyUp"
>;

/**
 * Assign a host instance to every ref, for a control that owns its own ref.
 *
 * `TooltipTrigger asChild` merges the slot's ref into the child's `ref` prop; a
 * component boundary only forwards it if it is declared and passed to the host.
 * The host may already be held by the component (a ring, a text host, a slider
 * track), so this composes rather than replaces (plans `341`, `596`).
 */
export const composeRef =
  <Instance>(
    ...refs: ReadonlyArray<Ref<Instance> | undefined>
  ): Ref<Instance> =>
  (instance) => {
    Arr.forEach(refs, (ref) => {
      if (ref === undefined || ref === null) return;
      if (typeof ref === "function") ref(instance);
      else ref.current = instance;
    });
  };

/**
 * The handlers a trigger forwards unchanged.
 *
 * Focus, blur and the key events stay out: the component owns them and composes
 * the injected handler with its own rule, so the ring and the activation
 * contract cannot be skipped by a slot.
 */
export const passiveTriggerHandlers = (
  props: Omit<TriggerHandlers, "ref">,
): TriggerHandlers => ({
  onMouseEnter: props.onMouseEnter,
  onMouseLeave: props.onMouseLeave,
  onMouseMove: props.onMouseMove,
  onMouseDown: props.onMouseDown,
  onMouseUp: props.onMouseUp,
  onMouseDownOutside: props.onMouseDownOutside,
  onAuxClick: props.onAuxClick,
  onScroll: props.onScroll,
});

/** Call both handlers for one event, in order, when either exists. */
export const composeHandler = <Event>(
  first: ((event: Event) => void) | undefined,
  second: ((event: Event) => void) | undefined,
): ((event: Event) => void) | undefined =>
  first === undefined || second === undefined
    ? (first ?? second)
    : (event) => {
        first(event);
        second(event);
      };

/**
 * A part's `style`: an object, or a callback that reads its public state.
 *
 * The type is the runtime's own (`@gpuix/react/floating`), the same one GPUix's
 * headless `SelectItem` and `ComboboxItem` expose — not a local lookalike.
 */
export type { StateStyle } from "@gpuix/react/floating";

/**
 * Resolve a part's `style` against its state and merge the result last.
 *
 * The one merge rule the library uses: a callback wins exactly where an object
 * style wins today, property by property, and nested `hover`/`active` rules in
 * the base keep working unless the callback supplies its own.
 */
export const resolvePartStyle = <State>(
  base: StyleDesc,
  style: StateStyle<State> | undefined,
  state: State,
): StyleDesc => mergeStyle(base, resolveStyle(style, state));

export { isTrackedFocus, useNativeFocusId } from "./native-focus.js";

/**
 * The accessible name a text-only child list gives a control.
 *
 * GPUix does not derive a button's name from painted text (measured: plan `058`
 * §0), so a `Button`/`Toggle` must carry the name itself. This is the only
 * honest source: every child is a string or number. An icon, an element or a
 * mixed list returns `None` — the caller owns the name then, and the library
 * does not invent one.
 */
export const textOf = (children: ReactNode): Option.Option<string> => {
  const parts = Children.toArray(children);
  const textOnly = Arr.every(
    parts,
    (part) => P.isString(part) || P.isNumber(part),
  );
  if (!textOnly || Arr.isReadonlyArrayEmpty(parts)) return Option.none();
  return pipe(
    Arr.join(
      Arr.map(parts, (part) => `${part}`),
      "",
    ),
    Str.trim,
    (name) => (Str.isEmpty(name) ? Option.none() : Option.some(name)),
  );
};

/**
 * A caller's explicit name, when it says anything.
 *
 * A label is often computed (`label={record.name}`) and can arrive empty or as
 * whitespace. That is not a name: treating it as one either erases the name a
 * control already derives from its content or creates a focus stop nothing can
 * announce. The value is trimmed, so padding cannot make a blank name look
 * present (plan `396`). The rule itself lives in `core/text.ts`, because the
 * list model needs the same test (plan `579`).
 */
export const usableLabel = usableText;

/**
 * A caller's text as an accessible name **or description**: trimmed, or absent
 * when blank.
 *
 * The prop shape every named surface forwards, so a computed empty or padded
 * label cannot create an empty name (plan `026`) — and the same rule governs the
 * `aria-description` a slot trigger adds, so a blank translation cannot become
 * an empty description or a dangling `"Loading. "` (plan `586`).
 */
export const ariaName = (label: string | undefined): string | undefined =>
  Option.getOrUndefined(usableLabel(label));

/**
 * A name whose documentation promises a default when the caller's label is
 * blank, such as `Spinner`'s "Loading" and an OTP cell's "Code" (plan `026`).
 */
export const ariaNameOr = (
  label: string | undefined,
  fallback: string,
): string =>
  pipe(
    usableLabel(label),
    Option.getOrElse(() => fallback),
  );

/**
 * Whether a string says something: non-blank after trimming.
 *
 * The caption rule for a visible description or a separator's label. A caller
 * often computes one (`description={row.help}`), and a conditional that only
 * tests `undefined` paints an empty caption line — or, on a `Separator`, splits
 * the rule around a hole (plan `577`). It is `core/text.ts`'s rule, re-exported
 * here so a component has one import for its text helpers.
 */
export { hasText, optionText } from "../core/text.js";

/**
 * A control's name: an explicit label that says something, else its text
 * children.
 *
 * The fallback is the rule `Button`/`Toggle` already document; a blank explicit
 * label must not beat it (plan `396`).
 */
export const controlName = (
  label: string | undefined,
  children: ReactNode,
): Option.Option<string> =>
  pipe(
    usableLabel(label),
    Option.orElse(() => textOf(children)),
  );

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

/**
 * Whether a control holds focus, and the handlers that track it.
 *
 * The runtime has no `focusVisible` state (plan 020 §1.2), so a focus ring has
 * to be drawn by the component; this is where it learns it should be. The
 * event state is local render state with no other reader, so a hook — not a
 * shared Atom — is right; the `ref` is the second source plan `590` added.
 */
export interface FocusState {
  readonly focused: boolean;
  readonly onFocus: () => void;
  readonly onBlur: () => void;
  /**
   * Attach to the element that takes native focus, so the provider's tracked
   * id can be compared with it. Absent on an element-tree render.
   */
  readonly ref?: (instance: PublicInstance | null) => void;
}

/**
 * Track native focus, so a control that owns its chrome can paint the ring.
 *
 * The event path is primary and immediate on a runtime that dispatches focus.
 * On the pinned 0.10.0 release build no `onFocus`/`onBlur` is delivered, so the
 * ring would never paint (plan `583`); `NativeFocusProvider` polls
 * `getFocusedElementId()` and this hook also compares that id with the element
 * the returned `ref` saw (plan `590`). `ownId` lets a control use an id it
 * already keeps (a trigger, a track, a text host) instead of the internal ref.
 *
 * `initiallyFocused` exists for one runtime fact: `autoFocus` takes native focus
 * **without dispatching `onFocus`** (plan 041 §9), so a field that mounts
 * focused would otherwise paint no ring until the next focus change. A field
 * passes its `autoFocus` prop; `onBlur` still clears the state normally.
 */
export const useFocus = (
  initiallyFocused = false,
  ownId?: () => number | undefined,
): FocusState => {
  const [eventFocused, setEventFocused] = useState(initiallyFocused);
  const own = useRef<number | null>(null);
  const sample = useNativeFocus();
  const ref = useCallback((instance: PublicInstance | null) => {
    own.current = instance?.id ?? null;
  }, []);
  const hostId = ownId?.() ?? own.current ?? undefined;
  /**
   * The seeded/event state can only be *cleared* by an event, and published
   * 0.10.0 dispatches none (plan `583`). An `autoFocus` field therefore stayed
   * focused forever once the tracker named another host: its ring never
   * cleared and its blur action never ran (plan `591`). When the provider has
   * sampled and the sample does not name this host, the event state is stale;
   * the tracker only ever clears it, never sets it, so the event path stays
   * immediate on a runtime that dispatches.
   */
  useEffect(() => {
    if (sample === undefined || !sample.sampled) return;
    const id = ownId?.() ?? own.current ?? undefined;
    if (id === undefined) return;
    if (!isTrackedFocus(sample.focused, id)) setEventFocused(false);
  }, [sample, ownId]);
  return {
    focused: eventFocused || isTrackedFocus(sample?.focused, hostId),
    onFocus: () => setEventFocused(true),
    onBlur: () => setEventFocused(false),
    ref,
  };
};

/**
 * The index of the element whose host id is the runtime's focused id.
 *
 * The roving composites keep their item ids in a ref map for
 * `renderer.focusElement`. The tracked id turns that map back into the index
 * the ring paints from, so a focus change the runtime never reports still moves
 * the paint (plan `590`).
 */
export const trackedFocusIndex = (
  ids: ReadonlyMap<number, number>,
  tracked: Option.Option<number> | undefined,
): Option.Option<number> =>
  tracked === undefined
    ? Option.none()
    : Option.flatMap(tracked, (trackedId) =>
        Option.map(
          Arr.findFirst(Arr.fromIterable(ids), ([, id]) => id === trackedId),
          ([index]) => index,
        ),
      );

/** A control's controlled/uncontrolled value, and the setter that respects it. */
export interface ControlState<Value> {
  readonly value: ValueState<Value>;
  readonly set: (next: Value) => void;
}

/**
 * The shared controlled/uncontrolled behaviour for any control.
 *
 * `value` present means the parent owns the value; absent means the control
 * keeps its own copy. `onValueChange` is only called when the value actually changed,
 * so a parent is not woken by an interaction that changed nothing.
 */
export const useControlState = <Value>(
  value: Value | undefined,
  defaultValue: Value,
  onValueChange: ((next: Value) => void) | undefined,
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
      if (applied.notify) onValueChange?.(next);
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
 * `active` is false for an indicator with nothing to animate (a determinate
 * progress bar): it then holds one render and schedules no timer at all. Making
 * it a dependency is what starts and stops the interval when a bar changes mode.
 */
export const useStep = (
  steps: number,
  intervalMs: number,
  active = true,
): number => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(
      () => setStep((current) => (current + 1) % steps),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [steps, intervalMs, active]);
  return step;
};

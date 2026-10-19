/**
 * Event claims for nested surfaces.
 *
 * A single runtime event travels from the focused node through every enclosing
 * surface, and 0.10.0 hands **each handler its own payload copy** (measured: plan
 * `187` §9). Identity therefore cannot carry a claim across levels; the event's
 * fields can. An inner surface claims the event it handled and **every**
 * enclosing surface ignores the same event for the rest of the task (a submenu,
 * its menu and the dialog around both — plan `669`).
 *
 * The claim covers keys and pointer events: the dismiss stack uses it for
 * Escape and for outside presses, the menus for the keys they act on.
 *
 * The claim lives **one task**, not one microtask: a live window delivers the
 * enclosing surface's handler for one propagation across a microtask (measured,
 * playground plan `558`), so a microtask reset let one Escape close two nested
 * layers. A later event — even one with the same key at the same coordinates —
 * is a new task and gets its own claim.
 */

import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";

/** The fields that identify one event across the runtime's payload copies. */
interface EventClaim {
  readonly eventType: string;
  readonly key: string | undefined;
  readonly keyChar: string | undefined;
  readonly x: number | undefined;
  readonly y: number | undefined;
  readonly button: number | undefined;
  readonly modifiers: string;
}

let claim: Option.Option<EventClaim> = Option.none();

const modifiersOf = (event: EventPayload): string => {
  const modifiers = event.modifiers;
  return [
    modifiers?.cmd === true ? "cmd" : "",
    modifiers?.ctrl === true ? "ctrl" : "",
    modifiers?.alt === true ? "alt" : "",
    modifiers?.shift === true ? "shift" : "",
  ].join("+");
};

const claimOf = (event: EventPayload): EventClaim => ({
  eventType: event.eventType,
  key: event.key,
  keyChar: event.keyChar,
  x: event.x,
  y: event.y,
  button: event.button,
  modifiers: modifiersOf(event),
});

const sameClaim = (left: EventClaim, right: EventClaim): boolean =>
  left.eventType === right.eventType &&
  left.key === right.key &&
  left.keyChar === right.keyChar &&
  left.x === right.x &&
  left.y === right.y &&
  left.button === right.button &&
  left.modifiers === right.modifiers;

/** Mark `event` as handled by the surface it happened in. */
export const claimEvent = (event: EventPayload): void => {
  const claimed: EventClaim = claimOf(event);
  claim = Option.some(claimed);
  // Clear only this claim: a newer event may already own the slot. The task
  // boundary is what a live window's propagation needs (plan 558).
  setTimeout(() => {
    claim = Option.filter(claim, (current) => current !== claimed);
  }, 0);
};

/**
 * Whether an enclosing surface must leave the same event alone.
 *
 * The claim is not consumed: one native event reaches **every** enclosing
 * handler (a submenu, its menu, the dialog around both), and all of them have to
 * skip it. The task-long cleanup in `claimEvent` bounds it; a genuinely new
 * event is a new task. Plan 669 measured the defect the consumption caused.
 */
export const isEventClaimed = (event: EventPayload): boolean =>
  Option.exists(claim, (current) => sameClaim(current, claimOf(event)));

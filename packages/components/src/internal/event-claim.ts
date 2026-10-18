/**
 * Event claims for nested surfaces.
 *
 * A key event travels from the focused row through every enclosing menu. The
 * runtime delivers one payload copy per handler, so object identity cannot carry
 * a claim across levels; the key fields can. An inner surface claims the key it
 * handled and the enclosing menu ignores the same key for the rest of the tick.
 *
 * The claim is cleared in a microtask, after the synchronous event propagation
 * has finished, so a later key with the same name is a new event.
 */

import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";

/** The fields that identify one key event across the runtime's payload copies. */
interface KeyClaim {
  readonly eventType: string;
  readonly key: string | undefined;
  readonly keyChar: string | undefined;
  readonly modifiers: string;
}

let claim: Option.Option<KeyClaim> = Option.none();

const modifiersOf = (event: EventPayload): string => {
  const modifiers = event.modifiers;
  return [
    modifiers?.cmd === true ? "cmd" : "",
    modifiers?.ctrl === true ? "ctrl" : "",
    modifiers?.alt === true ? "alt" : "",
    modifiers?.shift === true ? "shift" : "",
  ].join("+");
};

const claimOf = (event: EventPayload): KeyClaim => ({
  eventType: event.eventType,
  key: event.key,
  keyChar: event.keyChar,
  modifiers: modifiersOf(event),
});

const sameClaim = (left: KeyClaim, right: KeyClaim): boolean =>
  left.eventType === right.eventType &&
  left.key === right.key &&
  left.keyChar === right.keyChar &&
  left.modifiers === right.modifiers;

/** Mark `event` as handled by the surface it happened in. */
export const claimEvent = (event: EventPayload): void => {
  claim = Option.some(claimOf(event));
  queueMicrotask(() => {
    claim = Option.none();
  });
};

/** Whether an enclosing surface must leave the same key event alone. */
export const isEventClaimed = (event: EventPayload): boolean =>
  Option.match(claim, {
    onNone: () => false,
    onSome: (current) => {
      if (!sameClaim(current, claimOf(event))) return false;
      // Consume: the enclosing surface is the claim's one reader. A later key
      // with the same name is a new event even if the microtask has not run.
      claim = Option.none();
      return true;
    },
  });

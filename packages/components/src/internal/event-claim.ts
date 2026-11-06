import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";

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

export const claimEvent = (event: EventPayload): void => {
  claim = Option.some(claimOf(event));
  queueMicrotask(() => {
    claim = Option.none();
  });
};

export const isEventClaimed = (event: EventPayload): boolean =>
  Option.match(claim, {
    onNone: () => false,
    onSome: (current) => {
      if (!sameClaim(current, claimOf(event))) return false;

      claim = Option.none();
      return true;
    },
  });

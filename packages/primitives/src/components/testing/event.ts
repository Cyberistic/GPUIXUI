/**
 * Event fixtures for component tests.
 *
 * GPUix delivers an `EventPayload` whose `key` and `isHeld` are optional, so a
 * test has to supply what the runtime would: a key name during a key event, and
 * `isHeld` only when it is repeating.
 */

import type { EventPayload } from "@gpuix/react";

/** A key event as the runtime reports it. */
export const keyEvent = (
  key: string,
  extra: Partial<EventPayload> = {},
): EventPayload => ({
  elementId: 0,
  eventType: "keyDown",
  key,
  ...extra,
});

/** A key-up event: the channel an `<input>` delivers for editor keys. */
export const keyUpEvent = (
  key: string,
  extra: Partial<EventPayload> = {},
): EventPayload => ({ ...keyEvent(key, extra), eventType: "keyUp" });

/** An input change event carrying `event.value`. */
export const changeEvent = (value: string): EventPayload => ({
  elementId: 0,
  eventType: "change",
  value,
});

/** A single-line field's Enter, which the runtime reports as a submit. */
export const submitEvent = (): EventPayload => ({
  elementId: 0,
  eventType: "submit",
});

/** The underline of a full report: exercise a handler the way the runtime would. */
export const clickEvent: EventPayload = { elementId: 0, eventType: "click" };

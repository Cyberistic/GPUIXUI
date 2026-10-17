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

/** An input change event carrying `event.value`. */
export const changeEvent = (value: string): EventPayload => ({
  elementId: 0,
  eventType: "change",
  value,
});

/** The underline of a full report: exercise a handler the way the runtime would. */
export const clickEvent: EventPayload = { elementId: 0, eventType: "click" };

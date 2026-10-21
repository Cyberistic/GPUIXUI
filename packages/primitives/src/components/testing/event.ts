/**
 * Event fixtures for component tests.
 *
 * GPUix delivers a `KeyEvent` whose `key` and `isHeld` are optional, so a test
 * has to supply what the runtime would: a key name during a key event, and
 * `isHeld` only when it is repeating. The event also carries `preventDefault` /
 * `stopPropagation` (0.11.0); the fixture records whether a handler swallowed
 * the platform default, which is how a test observes `swallowKeyDefault`.
 */

import type { EventPayload, KeyEvent } from "@gpuix/react";

/** A key event as the runtime reports it, with the swallow observable. */
export interface KeyEventFixture extends KeyEvent {
  /** True once a handler called `preventDefault`. */
  readonly prevented: boolean;
}

/** A key event as the runtime reports it. */
export const keyEvent = (
  key: string,
  extra: Partial<KeyEvent> = {},
): KeyEventFixture => {
  let prevented = false;
  return {
    elementId: 0,
    eventType: "keyDown",
    key,
    ...extra,
    get defaultPrevented(): boolean {
      return prevented;
    },
    preventDefault: () => {
      prevented = true;
    },
    stopPropagation: () => {},
    get prevented(): boolean {
      return prevented;
    },
  };
};

/** A key-up event: the channel an `<input>` delivers for editor keys. */
export const keyUpEvent = (
  key: string,
  extra: Partial<KeyEvent> = {},
): KeyEventFixture => ({ ...keyEvent(key, extra), eventType: "keyUp" });

/** An input change event carrying `event.value`. */
export const changeEvent = (value: string): EventPayload => ({
  elementId: 0,
  eventType: "change",
  value,
});

/** The underline of a full report: exercise a handler the way the runtime would. */
export const clickEvent: EventPayload = { elementId: 0, eventType: "click" };

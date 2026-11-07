import type { EventPayload, KeyEvent } from "@gpuix/react";

export interface KeyEventFixture extends KeyEvent {
  readonly prevented: boolean;
}

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

export const keyUpEvent = (
  key: string,
  extra: Partial<KeyEvent> = {},
): KeyEventFixture => ({ ...keyEvent(key, extra), eventType: "keyUp" });

export const changeEvent = (value: string): EventPayload => ({
  elementId: 0,
  eventType: "change",
  value,
});

export const clickEvent: EventPayload = { elementId: 0, eventType: "click" };

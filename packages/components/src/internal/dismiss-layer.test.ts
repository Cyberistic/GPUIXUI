import type { EventPayload } from "@gpuix/react";
import * as Duration from "effect/Duration";
import { describe, expect, it, vi } from "vitest";
import {
  dismissLayerCount,
  dismissTopLayer,
  pointerGestureWindow,
  pushDismissLayer,
} from "./dismiss-layer.js";

const frame = BigInt(Duration.toMillis(pointerGestureWindow)) * 1_000_000n;

let clock = 0n;
const gesture = (): bigint => (clock += frame + 1n);

const press = (elementId: number, at = { x: 40, y: 40 }): EventPayload => ({
  elementId,
  eventType: "mouseDownOutside",
  x: at.x,
  y: at.y,
  button: 0,
  clickCount: 1,
});

const keystroke = (keystrokeId: number): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  keystrokeId,
});

describe("dismiss layer stack", () => {
  it("reports no consumer when nothing is open", () => {
    expect(dismissTopLayer(press(1), gesture())).toBe(false);
    expect(dismissLayerCount()).toBe(0);
  });

  it("dismisses the topmost layer only", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer, 1);
    const removeInner = pushDismissLayer(inner, 2);

    expect(dismissTopLayer(press(1), gesture())).toBe(true);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
    expect(dismissLayerCount()).toBe(0);
  });

  it("puts the deeper surface on top even when it pushed first", () => {
    const dialog = vi.fn();
    const popover = vi.fn();
    const removePopover = pushDismissLayer(popover, 2);
    const removeDialog = pushDismissLayer(dialog, 1);

    expect(dismissTopLayer(press(1), gesture())).toBe(true);
    expect(popover).toHaveBeenCalledTimes(1);
    expect(dialog).not.toHaveBeenCalled();

    removePopover();
    removeDialog();
  });

  it("lets the deeper layer close before its container, then reaches it", () => {
    const dialog = vi.fn();
    const popover = vi.fn();
    const removePopover = pushDismissLayer(popover, 2);
    const removeDialog = pushDismissLayer(dialog, 1);

    dismissTopLayer(press(1), gesture());
    removePopover();
    dismissTopLayer(press(1), gesture());

    expect(popover).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveBeenCalledTimes(1);

    removeDialog();
  });

  it("keeps push order between layers at the same depth", () => {
    const first = vi.fn();
    const second = vi.fn();
    const removeFirst = pushDismissLayer(first, 1);
    const removeSecond = pushDismissLayer(second, 1);

    expect(dismissTopLayer(press(1), gesture())).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    removeSecond();
    removeFirst();
  });

  it("closes one overlay for one outside press, however many handlers it reaches", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer, 1);
    const removeInner = pushDismissLayer(inner, 2);
    const now = gesture();

    expect(dismissTopLayer(press(2), now)).toBe(true);
    expect(dismissTopLayer(press(1), now)).toBe(false);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
  });

  it("treats one press delivered after a frame's re-render as one gesture", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer, 1);
    const removeInner = pushDismissLayer(inner, 2);
    const now = gesture();

    expect(dismissTopLayer(press(2), now)).toBe(true);
    expect(dismissTopLayer(press(1), now + 40_000_000n)).toBe(false);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
  });

  it("lets the next press reach the layer that is now topmost", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer, 1);
    const removeInner = pushDismissLayer(inner, 2);

    dismissTopLayer(press(1), gesture());
    removeInner();
    dismissTopLayer(press(1), gesture());

    expect(outer).toHaveBeenCalledTimes(1);

    removeOuter();
  });

  it("treats a press at another point as a new press", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer, 1);
    const removeInner = pushDismissLayer(inner, 2);
    const now = gesture();

    expect(dismissTopLayer(press(1, { x: 40, y: 40 }), now)).toBe(true);
    removeInner();
    expect(dismissTopLayer(press(1, { x: 120, y: 90 }), now)).toBe(true);

    expect(outer).toHaveBeenCalledTimes(1);

    removeOuter();
  });

  it("treats the same point after the gesture window as a new press", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer, 1);
    const removeInner = pushDismissLayer(inner, 2);

    expect(dismissTopLayer(press(1), gesture())).toBe(true);
    removeInner();
    expect(dismissTopLayer(press(1), gesture())).toBe(true);

    expect(outer).toHaveBeenCalledTimes(1);

    removeOuter();
  });

  it("treats one key dispatch as one event across handlers' payloads", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer, 1);
    const removeInner = pushDismissLayer(inner, 2);

    expect(dismissTopLayer(keystroke(7), gesture())).toBe(true);
    expect(dismissTopLayer(keystroke(7), gesture())).toBe(false);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
  });

  it("counts the next dispatch separately, even with the same key payload shape", () => {
    const first = vi.fn();
    const second = vi.fn();
    const removeFirst = pushDismissLayer(first, 1);
    const removeSecond = pushDismissLayer(second, 2);

    expect(dismissTopLayer(keystroke(1), gesture())).toBe(true);
    removeSecond();
    expect(dismissTopLayer(keystroke(2), gesture())).toBe(true);

    expect(first).toHaveBeenCalledTimes(1);

    removeFirst();
  });

  it("forgets the last dispatch once the stack empties", () => {
    const closed = vi.fn();
    const remove = pushDismissLayer(closed, 1);
    const now = gesture();

    expect(dismissTopLayer(keystroke(1), now)).toBe(true);
    remove();

    const next = vi.fn();
    const removeNext = pushDismissLayer(next, 1);
    expect(dismissTopLayer(keystroke(1), now)).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);

    removeNext();
  });

  it("forgets the last press once the stack empties", () => {
    const closed = vi.fn();
    const remove = pushDismissLayer(closed, 1);
    const now = gesture();

    expect(dismissTopLayer(press(1), now)).toBe(true);
    remove();

    const reopened = vi.fn();
    const removeReopened = pushDismissLayer(reopened, 1);
    expect(dismissTopLayer(press(1), now)).toBe(true);
    expect(reopened).toHaveBeenCalledTimes(1);

    removeReopened();
  });

  it("drops a removed layer instead of dismissing it later", () => {
    const closed = vi.fn();
    const open = vi.fn();
    const removeClosed = pushDismissLayer(closed, 1);
    const removeOpen = pushDismissLayer(open, 1);

    removeClosed();
    dismissTopLayer(press(1), gesture());

    expect(closed).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);

    removeOpen();
  });
});

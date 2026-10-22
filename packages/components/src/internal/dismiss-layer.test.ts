/**
 * The dismiss stack's rules, without a renderer.
 *
 * The bugs these guard: two Escape handlers firing on one keystroke (a popover
 * inside a dialog closing both layers), one outside press closing two overlays,
 * an outside press closing an overlay that is not topmost, a nested surface
 * losing the first Escape because React ran the child's effect before the
 * parent's, and a closed overlay leaving its handler on the stack to be
 * dismissed later. One key dispatch and one press are each counted once, because
 * the runtime rebuilds the payload per handler: a key shares `keystrokeId`, a
 * press shares its type, point, button and click count.
 */

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

/**
 * A reading a full gesture after every earlier one in this suite. Two calls to
 * `dismissTopLayer` with the same reading are the handlers of one press; two
 * readings are two presses.
 */
let clock = 0n;
const gesture = (): bigint => (clock += frame + 1n);

/** An outside press at one point, as one overlay's handler receives it. */
const press = (elementId: number, at = { x: 40, y: 40 }): EventPayload => ({
  elementId,
  eventType: "mouseDownOutside",
  x: at.x,
  y: at.y,
  button: 0,
  clickCount: 1,
});

/** The key dispatch a renderer numbers; every handler's payload shares it. */
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
    // Both open in one first render: React runs the popover's layout effect
    // before the dialog's, so the depth — not the push — must order them.
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
    // Siblings: neither contains the other, so the later one is on top.
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
    // The bug this guards: an outside press raises every open overlay's
    // `onMouseDownOutside`, each with its own payload object, so both layers
    // dismissed the topmost one and the app saw the same overlay close twice.
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
    // A reader pressing the same pixel twice: the deliveries of one press all
    // arrive inside a frame, so a later reading is the next gesture.
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

    // The same Escape reaches the input and the dialog as two objects that share
    // the dispatch id; only the first call may dismiss a layer.
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

    // A fresh renderer numbers its keystrokes from its own start; a stale id
    // must not swallow the first Escape of the next stack.
    const next = vi.fn();
    const removeNext = pushDismissLayer(next, 1);
    expect(dismissTopLayer(keystroke(1), now)).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);

    removeNext();
  });

  it("forgets the last press once the stack empties", () => {
    // A surface re-opened by the press that dismissed its predecessor must not
    // be dismissed by the same gesture surviving on an empty stack.
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

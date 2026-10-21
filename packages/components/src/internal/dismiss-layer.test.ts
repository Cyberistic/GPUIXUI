/**
 * The dismiss stack's rules, without a renderer.
 *
 * The bugs these guard: two Escape handlers firing on one keystroke (a popover
 * inside a dialog closing both layers), an outside press closing an overlay that
 * is not topmost, a closed overlay leaving its handler on the stack to be
 * dismissed later, and one key dispatch counted twice because the runtime builds
 * a payload per handler.
 */

import type { EventPayload } from "@gpuix/react";
import { describe, expect, it, vi } from "vitest";
import {
  dismissLayerCount,
  dismissTopLayer,
  pushDismissLayer,
} from "./dismiss-layer.js";

/** A syntactically complete event; only its identity matters here. */
const event = (): EventPayload => ({ elementId: 1, eventType: "keyDown" });

/** The key dispatch a renderer numbers; every handler's payload shares it. */
const keystroke = (keystrokeId: number): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  keystrokeId,
});

describe("dismiss layer stack", () => {
  it("reports no consumer when nothing is open", () => {
    expect(dismissTopLayer(event())).toBe(false);
    expect(dismissLayerCount()).toBe(0);
  });

  it("dismisses the topmost layer only", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);

    expect(dismissTopLayer(event())).toBe(true);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
    expect(dismissLayerCount()).toBe(0);
  });

  it("consumes an event once, so one keystroke cannot close two layers", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);
    const press = event();

    expect(dismissTopLayer(press)).toBe(true);
    expect(dismissTopLayer(press)).toBe(false);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
  });

  it("lets the next event reach the layer that is now topmost", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);

    dismissTopLayer(event());
    removeInner();
    dismissTopLayer(event());

    expect(outer).toHaveBeenCalledTimes(1);

    removeOuter();
  });

  it("treats one key dispatch as one event across handlers' payloads", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);

    // The same Escape reaches the input and the dialog as two objects that share
    // the dispatch id; only the first call may dismiss a layer.
    expect(dismissTopLayer(keystroke(7))).toBe(true);
    expect(dismissTopLayer(keystroke(7))).toBe(false);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
  });

  it("counts the next dispatch separately, even with the same key payload shape", () => {
    const first = vi.fn();
    const second = vi.fn();
    const removeFirst = pushDismissLayer(first);
    const removeSecond = pushDismissLayer(second);

    expect(dismissTopLayer(keystroke(1))).toBe(true);
    removeSecond();
    expect(dismissTopLayer(keystroke(2))).toBe(true);

    expect(first).toHaveBeenCalledTimes(1);

    removeFirst();
  });

  it("forgets the last dispatch once the stack empties", () => {
    const closed = vi.fn();
    const remove = pushDismissLayer(closed);

    expect(dismissTopLayer(keystroke(1))).toBe(true);
    remove();

    // A fresh renderer numbers its keystrokes from its own start; a stale id
    // must not swallow the first Escape of the next stack.
    const next = vi.fn();
    const removeNext = pushDismissLayer(next);
    expect(dismissTopLayer(keystroke(1))).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);

    removeNext();
  });

  it("drops a removed layer instead of dismissing it later", () => {
    const closed = vi.fn();
    const open = vi.fn();
    const removeClosed = pushDismissLayer(closed);
    const removeOpen = pushDismissLayer(open);

    removeClosed();
    dismissTopLayer(event());

    expect(closed).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);

    removeOpen();
  });
});

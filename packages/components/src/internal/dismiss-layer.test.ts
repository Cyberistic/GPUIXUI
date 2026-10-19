/**
 * The dismiss stack's rules, without a renderer.
 *
 * The bugs these guard: two Escape handlers firing on one keystroke (a popover
 * inside a dialog closing both layers — the runtime hands each handler its own
 * payload copy, so identity cannot consume an event), an outside press closing
 * an overlay that is not topmost, and a closed overlay leaving its handler on
 * the stack to be dismissed later.
 *
 * The claim lives one task, not one microtask: a live window delivers a nested
 * layer's handler and its parent's across a microtask (playground plan 558), so
 * the microtask reset closed both layers on one Escape. Both orderings are
 * pinned below.
 */

import type { EventPayload } from "@gpuix/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dismissLayerCount,
  dismissTopLayer,
  pushDismissLayer,
} from "./dismiss-layer.js";

/** A syntactically complete Escape; only its fields matter across copies. */
const escape = (): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key: "escape",
});

/** The claim is module state; each test starts as a new task. */
afterEach(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

describe("dismiss layer stack", () => {
  it("reports no consumer when nothing is open", () => {
    expect(dismissTopLayer(escape())).toBe(false);
    expect(dismissLayerCount()).toBe(0);
  });

  it("dismisses the topmost layer only", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);

    expect(dismissTopLayer(escape())).toBe(true);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
    expect(dismissLayerCount()).toBe(0);
  });

  it("keeps one Escape to one layer across a microtask, as a live window does", async () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);

    const first = escape();
    const copy: EventPayload = { ...first };

    expect(dismissTopLayer(first)).toBe(true);
    // Plan 558 measured a live window delivering the enclosing handler across a
    // microtask. The old microtask reset cleared the claim before that copy.
    await Promise.resolve();
    expect(dismissTopLayer(copy)).toBe(false);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
  });

  it("consumes one keystroke even when the runtime copies the payload", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);
    const first = escape();
    const copy: EventPayload = { ...first };

    expect(first).not.toBe(copy);
    expect(dismissTopLayer(first)).toBe(true);
    expect(dismissTopLayer(copy)).toBe(false);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
  });

  it("consumes an event once, so one keystroke cannot close two layers", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);
    const press = escape();

    expect(dismissTopLayer(press)).toBe(true);
    expect(dismissTopLayer(press)).toBe(false);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeOuter();
  });

  it("lets the next event reach the layer that is now topmost", async () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeInner = pushDismissLayer(inner);

    dismissTopLayer(escape());
    removeInner();
    // A real second Escape is a new task; the claim lives one task (plan 558).
    await new Promise((resolve) => setTimeout(resolve, 0));
    dismissTopLayer(escape());

    expect(outer).toHaveBeenCalledTimes(1);

    removeOuter();
  });

  it("drops a removed layer instead of dismissing it later", () => {
    const closed = vi.fn();
    const open = vi.fn();
    const removeClosed = pushDismissLayer(closed);
    const removeOpen = pushDismissLayer(open);

    removeClosed();
    dismissTopLayer(escape());

    expect(closed).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);

    removeOpen();
  });
});

/**
 * The dismiss stack's rules, without a renderer.
 *
 * The bugs these guard: two Escape handlers firing on one keystroke (a popover
 * inside a dialog closing both layers — the runtime hands each handler its own
 * payload copy, so identity cannot consume an event), an outside press closing
 * an overlay that is not topmost, and a closed overlay leaving its handler on
 * the stack to be dismissed later.
 */

import type { EventPayload } from "@gpuix/react";
import { describe, expect, it, vi } from "vitest";
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
    // A real second Escape is a new task; the claim resets in a microtask.
    await Promise.resolve();
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

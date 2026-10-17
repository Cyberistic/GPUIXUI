/**
 * The dismiss stack's rules, without a renderer.
 *
 * The bugs these guard: two Escape handlers firing on one keystroke (a popover
 * inside a dialog closing both layers), an outside press closing an overlay that
 * is not topmost, and a closed overlay leaving its handler on the stack to be
 * dismissed later.
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

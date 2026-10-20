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
 *
 * Plan 669 measured the depth defect: the claim was consumed by the first
 * enclosing reader, so a third reader (a menu around a submenu, inside a dialog)
 * saw no claim and closed a second layer. A claim now stays readable for every
 * reader in its task.
 *
 * Plan 730 measured the ordering defect: a confirmation mounted together with
 * its dialog pushed its layer first (React runs a child's effects before its
 * parent's) and one Escape closed the dialog **and** the confirmation. Layer
 * order is now the nesting depth, with open order breaking ties between
 * siblings.
 */

import type { EventPayload } from "@gpuix/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dismissLayerCount,
  dismissTopLayer,
  hasDeeperLayer,
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

  it("keeps one event to one layer with three layers nested", () => {
    const outer = vi.fn();
    const middle = vi.fn();
    const inner = vi.fn();
    const removeOuter = pushDismissLayer(outer);
    const removeMiddle = pushDismissLayer(middle);
    const removeInner = pushDismissLayer(inner);

    // One native event reaches all three handlers (a submenu, its menu, the
    // dialog). The claim must survive every reader, not only the first.
    expect(dismissTopLayer(escape())).toBe(true);
    expect(dismissTopLayer(escape())).toBe(false);
    expect(dismissTopLayer(escape())).toBe(false);

    expect(inner).toHaveBeenCalledTimes(1);
    expect(middle).not.toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalled();

    removeInner();
    removeMiddle();
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

  it("puts a deeper layer above a shallower one, whatever the push order", () => {
    const dialog = vi.fn();
    const confirmation = vi.fn();
    // A modal nested in the dialog's content pushes first, because React runs a
    // child's layout effects before its parent's. The confirmation is painted on
    // top, so it must be the one Escape reaches.
    const removeConfirmation = pushDismissLayer(confirmation, 1);
    const removeDialog = pushDismissLayer(dialog, 0);

    expect(dismissTopLayer(escape())).toBe(true);
    expect(confirmation).toHaveBeenCalledTimes(1);
    expect(dialog).not.toHaveBeenCalled();

    removeDialog();
    removeConfirmation();
  });

  it("keeps open order between layers at the same depth", () => {
    const first = vi.fn();
    const second = vi.fn();
    const removeFirst = pushDismissLayer(first);
    const removeSecond = pushDismissLayer(second);

    dismissTopLayer(escape());

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    removeSecond();
    removeFirst();
  });

  it("never dismisses a layer by a press inside its own surface", () => {
    // Plan 816 measured this: 0.10.0 reports `mouseDownOutside` by bounds, so a
    // picker popup hanging below a dialog arrived as an outside press for the
    // dialog, which dismissed the popup under the user's pointer. The topmost
    // layer answers for its own surface, and a press inside it is no dismissal.
    const popup = vi.fn();
    const dialog = vi.fn();
    const removeDialog = pushDismissLayer(dialog, 0);
    const removePopup = pushDismissLayer(popup, 1, () => true);

    expect(dismissTopLayer({ ...escape(), x: 500, y: 510 })).toBe(false);
    expect(popup).not.toHaveBeenCalled();
    expect(dialog).not.toHaveBeenCalled();

    removePopup();
    removeDialog();
  });

  it("dismisses a layer by a press outside its own surface", () => {
    const popup = vi.fn();
    const removePopup = pushDismissLayer(popup, 0, () => false);

    expect(dismissTopLayer({ ...escape(), x: 10, y: 10 })).toBe(true);
    expect(popup).toHaveBeenCalledTimes(1);

    removePopup();
  });

  it("leaves an owned press unclaimed for the enclosing layers", () => {
    // The click that follows the press must reach the row, and an enclosing
    // handler in the same task must not read the event as consumed: the owned
    // press claims nothing, so the same event still reaches the next layer.
    const popup = vi.fn();
    const dialog = vi.fn();
    const removeDialog = pushDismissLayer(dialog, 0);
    const removePopup = pushDismissLayer(popup, 1, () => true);
    const press = escape();

    expect(dismissTopLayer(press)).toBe(false);
    expect(popup).not.toHaveBeenCalled();

    removePopup();
    expect(dismissTopLayer(press)).toBe(true);
    expect(dialog).toHaveBeenCalledTimes(1);

    removeDialog();
  });

  it("reports whether a deeper layer is open", () => {
    expect(hasDeeperLayer(0)).toBe(false);
    const removeDialog = pushDismissLayer(vi.fn(), 0);
    expect(hasDeeperLayer(0)).toBe(false);

    const removeConfirmation = pushDismissLayer(vi.fn(), 1);
    expect(hasDeeperLayer(0)).toBe(true);
    expect(hasDeeperLayer(1)).toBe(false);

    removeConfirmation();
    expect(hasDeeperLayer(0)).toBe(false);

    removeDialog();
  });
});

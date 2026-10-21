/**
 * Driving a rendered tree the way a person does: real hit-testing, real focus.
 *
 * Only behaviour suites import this. Every helper locates its target by
 * `testId`, never by index, so a suite keeps testing the same part when a
 * component's internal order changes (plan 110 §10).
 */

import type { TestRenderer } from "@gpuix/react/testing";
import * as Option from "effect/Option";
import type { ComponentTestRoot } from "./test-root.js";

/** The bounds the renderer measures, taken from its own return type. */
type Bounds = NonNullable<ReturnType<TestRenderer["getElementBounds"]>>;

/** The measured bounds of `testId`, `None` when the tree has no such element. */
export const boundsOf = (
  root: ComponentTestRoot,
  testId: string,
): Option.Option<Bounds> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.findByTestId(testId)),
    (element) =>
      Option.fromNullishOr(root.renderer.getElementBounds(element.id)),
  );

/** The bounds of `testId`, or throws: a missing element is a broken suite. */
export const requireBounds = (
  root: ComponentTestRoot,
  testId: string,
): Bounds =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  });

/** Click the centre of `testId` through the runtime's real hit testing.
 *  `modifiers` is the native keystroke syntax (`"shift"`, `"cmd"`), forwarded so
 *  a suite can prove the modifier branches rather than calling them directly. */
export const clickCentreOf = (
  root: ComponentTestRoot,
  testId: string,
  modifiers?: string,
): void => {
  const { x, y, width, height } = requireBounds(root, testId);
  root.renderer.nativeSimulateClick(
    x + width / 2,
    y + height / 2,
    0,
    modifiers,
  );
};

/** Move the mouse to the centre of `testId`, for hover states. */
export const hoverCentreOf = (
  root: ComponentTestRoot,
  testId: string,
): void => {
  const { x, y, width, height } = requireBounds(root, testId);
  root.renderer.nativeSimulateMouseMove(x + width / 2, y + height / 2);
};

/** The width and height `testId` measured, for size assertions. */
export const sizeOf = (
  root: ComponentTestRoot,
  testId: string,
): Option.Option<{ readonly width: number; readonly height: number }> =>
  Option.map(boundsOf(root, testId), ({ width, height }) => ({
    width,
    height,
  }));

/** The `testId` of whatever holds focus, `None` when nothing does. */
export const focusedTestId = (root: ComponentTestRoot): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

/**
 * Deliver the paint-driven events a render queued (`onLayout`) and paint what
 * they changed. `renderComponent` flushes the tree but never dispatches those
 * events, because most parts do not listen for them; a part that measures itself
 * needs one round of settle before its measured children exist in the tree.
 */
export const settle = (root: ComponentTestRoot): void => {
  root.renderer.dispatchNativeEvents();
  root.renderer.flush();
};

/** Let real time pass, for a claim that something has *not* happened yet. */
export const after = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Poll `check` until it passes or the deadline elapses. */
const poll = async (check: () => void, deadline: number): Promise<void> => {
  try {
    check();
  } catch (error) {
    if (performance.now() >= deadline) throw error;
    await after(5);
    return poll(check, deadline);
  }
};

/**
 * Wait until `check` passes, rethrowing its last failure when it never does.
 *
 * A component timer is real time, so a fixed sleep that is barely longer than
 * the delay passes or fails on how busy the machine is. Polling keeps the claim
 * — the state must arrive — while a state that never arrives still fails with
 * the check's own message. Use {@link after} only to prove something did *not*
 * happen within a window.
 */
export const waitFor = (check: () => void, timeoutMs = 2_000): Promise<void> =>
  poll(check, performance.now() + timeoutMs);

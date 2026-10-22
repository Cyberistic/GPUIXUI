/**
 * Driving a rendered tree the way a person does: real hit-testing, real focus.
 *
 * Only behaviour suites import this. Every helper locates its target by
 * `testId`, never by index, so a suite keeps testing the same part when a
 * component's internal order changes.
 */

import type { TestRenderer } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { DataTestRoot } from "./test-root.js";

/** The bounds the renderer measures, taken from its own return type. */
type Bounds = NonNullable<ReturnType<TestRenderer["getElementBounds"]>>;

/** The measured bounds of `testId`, `None` when the tree has no such element. */
export const boundsOf = (
  root: DataTestRoot,
  testId: string,
): Option.Option<Bounds> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.findByTestId(testId)),
    (element) =>
      Option.fromNullishOr(root.renderer.getElementBounds(element.id)),
  );

/** The bounds of `testId`, or the suite fails with the id it looked for. */
export const requireBounds = (root: DataTestRoot, testId: string): Bounds =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  });

/** The resolved style of `testId`, or the suite fails with the id it looked for. */
export const requireStyle = (
  root: DataTestRoot,
  testId: string,
): Record<string, unknown> =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(root.renderer.findByTestId(testId)),
      (element) => element.style,
    ),
    () => {
      throw new Error(`behaviour: no element with testId "${testId}"`);
    },
  );

/** Click the centre of `testId` through the runtime's real hit testing. */
export const clickCentreOf = (root: DataTestRoot, testId: string): void => {
  const { x, y, width, height } = requireBounds(root, testId);
  root.renderer.nativeSimulateClick(x + width / 2, y + height / 2, 0);
};

/** Focus `testId`, then send each character as a real key press. */
export const typeInto = (
  root: DataTestRoot,
  testId: string,
  text: string,
): void => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  root.renderer.focusElement(element.id);
  Arr.forEach(text.split(""), (key) => root.renderer.simulateKeystrokes(key));
};

/** Every painted string, joined by a space. */
export const paintedText = (root: DataTestRoot): string =>
  Arr.join(root.renderer.getAllText(), " ");

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
 * A debounce is real time, so a fixed sleep that is barely longer than the
 * delay passes or fails on how busy the machine is. Polling keeps the claim —
 * the state must arrive — while a state that never arrives still fails with
 * the check's own message.
 */
export const waitFor = (check: () => void, timeoutMs = 2_000): Promise<void> =>
  poll(check, performance.now() + timeoutMs);

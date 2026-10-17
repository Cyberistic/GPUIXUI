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

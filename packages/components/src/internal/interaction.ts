import type { TestRenderer } from "@gpuix/react/testing";
import * as Option from "effect/Option";
import type { ComponentTestRoot } from "./test-root.js";

type Bounds = NonNullable<ReturnType<TestRenderer["getElementBounds"]>>;

export const boundsOf = (
  root: ComponentTestRoot,
  testId: string,
): Option.Option<Bounds> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.findByTestId(testId)),
    (element) =>
      Option.fromNullishOr(root.renderer.getElementBounds(element.id)),
  );

export const requireBounds = (
  root: ComponentTestRoot,
  testId: string,
): Bounds =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  });

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

export const hoverCentreOf = (
  root: ComponentTestRoot,
  testId: string,
): void => {
  const { x, y, width, height } = requireBounds(root, testId);
  root.renderer.nativeSimulateMouseMove(x + width / 2, y + height / 2);
};

export const sizeOf = (
  root: ComponentTestRoot,
  testId: string,
): Option.Option<{ readonly width: number; readonly height: number }> =>
  Option.map(boundsOf(root, testId), ({ width, height }) => ({
    width,
    height,
  }));

export const pressKey = (root: ComponentTestRoot, key: string): void => {
  const focused = root.renderer.getFocusedElementId();
  if (focused === null) {
    throw new Error("behaviour: no focused element to press a key on");
  }
  root.renderer.nativeSimulateKeyDown(focused, key);
  root.renderer.nativeSimulateKeyUp(focused, key);
};

export const focusedTestId = (root: ComponentTestRoot): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

export const settle = (root: ComponentTestRoot): void => {
  root.renderer.dispatchNativeEvents();
  root.renderer.flush();
};

export const settleMotion = (root: ComponentTestRoot): void => {
  root.renderer.clockFastForward(1_000);
  settle(root);
};

export const after = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const poll = async (check: () => void, deadline: number): Promise<void> => {
  try {
    check();
  } catch (error) {
    if (performance.now() >= deadline) throw error;
    await after(5);
    return poll(check, deadline);
  }
};

export const waitFor = (check: () => void, timeoutMs = 2_000): Promise<void> =>
  poll(check, performance.now() + timeoutMs);

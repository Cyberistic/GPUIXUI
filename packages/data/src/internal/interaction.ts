import type { TestRenderer } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { chartIdOf, markupOf } from "./markup.js";
import type { DataTestRoot } from "./test-root.js";

type Bounds = NonNullable<ReturnType<TestRenderer["getElementBounds"]>>;

export const boundsOf = (
  root: DataTestRoot,
  testId: string,
): Option.Option<Bounds> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.findByTestId(testId)),
    (element) =>
      Option.fromNullishOr(root.renderer.getElementBounds(element.id)),
  );

export const requireBounds = (root: DataTestRoot, testId: string): Bounds =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  });

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

export const chartMarkupOf = (root: DataTestRoot, testId: string): string => {
  const chartId = chartIdOf(testId);
  const document = root.renderer.findByTestId(`${chartId}-document`);
  return Option.getOrElse(
    Option.orElse(markupOf(document), () =>
      markupOf(root.renderer.findByTestId(testId)),
    ),
    () => {
      throw new Error(`behaviour: no markup on "${testId}"`);
    },
  );
};

export const seriesMarkupOf = (
  root: DataTestRoot,
  testId: string,
  key: string,
  colour: string,
): string => {
  const chartId = chartIdOf(testId);
  const document = root.renderer.findByTestId(`${chartId}-document`);
  if (document === undefined) {
    return Option.getOrElse(
      markupOf(root.renderer.findByTestId(`${chartId}-layer-${key}`)),
      () => {
        throw new Error(`behaviour: no markup for the "${key}" series`);
      },
    );
  }
  const source = Option.getOrElse(markupOf(document), () => {
    throw new Error(`behaviour: no markup on "${chartId}-document"`);
  });

  return source.includes(colour) ? source : "";
};

export const seriesShapesOf = (
  root: DataTestRoot,
  testId: string,
  key: string,
  colour: string,
): ReadonlyArray<string> => {
  const chartId = chartIdOf(testId);
  const document = root.renderer.findByTestId(`${chartId}-document`);
  if (document === undefined) {
    const layer = root.renderer.findByTestId(`${chartId}-layer-${key}`);
    return Option.match(markupOf(layer), {
      onNone: () => [],
      onSome: (source) => shapesIn(source),
    });
  }
  const source = Option.getOrElse(markupOf(document), () => {
    throw new Error(`behaviour: no markup on "${chartId}-document"`);
  });
  return Arr.filter(shapesIn(source), (shape) => shape.includes(colour));
};

const shapesIn = (source: string): ReadonlyArray<string> =>
  Arr.map(
    [...source.matchAll(/<(rect|path|circle|ellipse|line|polyline)\b[^>]*>/g)],
    (match) => match[0],
  ).filter((shape): shape is string => shape !== undefined);

export const clickCentreOf = (root: DataTestRoot, testId: string): void => {
  const { x, y, width, height } = requireBounds(root, testId);
  root.renderer.nativeSimulateClick(x + width / 2, y + height / 2, 0);
};

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

export const pressKey = (
  root: DataTestRoot,
  testId: string,
  keystroke: string,
): void => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  root.renderer.focusElement(element.id);
  root.renderer.nativeSimulateKeystrokes(element.id, keystroke);
};

export const focusedTestId = (root: DataTestRoot): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

export const paintedText = (root: DataTestRoot): string =>
  Arr.join(root.renderer.getAllText(), " ");

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

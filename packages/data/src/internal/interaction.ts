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
import { chartIdOf, markupOf } from "./markup.js";
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

/**
 * The markup a chart painted, in whichever route it took.
 *
 * A chart draws its marks either as **one document** — every series' colour
 * in one element, which is the route the runtime's own SVG decoder takes —
 * or as **one mask per series**, which is the route a host that cannot
 * decode an image takes. A suite that asks "what did this chart draw?" must
 * not care which route it took, so this reads the document when there is one
 * and the layer's own source when there is not.
 */
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

/**
 * The markup one series painted, by the series' key.
 *
 * The document is one string carrying every series, so a series' marks are
 * the ones painted in **its own colour** — the one thing that tells them
 * apart in the document. The markup returned is the document's, and a suite
 * that counts a series' shapes counts the ones in its colour.
 */
export const seriesMarkupOf = (
  root: DataTestRoot,
  testId: string,
  key: string,
  colour: string,
): string => {
  const chartId = chartIdOf(testId);
  const document = root.renderer.findByTestId(`${chartId}-document`);
  if (document === undefined) {
    // The mask route: the series is its own element.
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
  // A series that paints nothing has no mark in the document, which is the
  // truth the suite wants.
  return source.includes(colour) ? source : "";
};

/**
 * The shapes one series painted: the elements in the document that carry its
 * colour.
 *
 * The document is one string, so a shape is read by the element it is in.
 * Every shape carries a `fill` or a `stroke`, and the series' own colour is
 * the one that tells its shapes from the grid's and from another series'.
 */
export const seriesShapesOf = (
  root: DataTestRoot,
  testId: string,
  key: string,
  colour: string,
): ReadonlyArray<string> => {
  const chartId = chartIdOf(testId);
  const document = root.renderer.findByTestId(`${chartId}-document`);
  if (document === undefined) {
    // The mask route: the series is its own element.
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

/** The shapes a markup carries, one string each. */
const shapesIn = (source: string): ReadonlyArray<string> =>
  Arr.map(
    [...source.matchAll(/<(rect|path|circle|ellipse|line|polyline)\b[^>]*>/g)],
    (match) => match[0],
  ).filter((shape): shape is string => shape !== undefined);

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

/**
 * Focus `testId`, then send one keystroke: a character or a named key
 * (`"down"`, `"right"`, `"enter"`, `"space"`).
 */
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

/** The test id of the element holding native focus, when it carries one. */
export const focusedTestId = (root: DataTestRoot): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

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

/**
 * Adapts a real GPUix `TestRenderer` to the platform-free `SmokeHost`.
 *
 * This is the **only** module in the app that names a `@gpuix/*` type, and it
 * is type-only: the renderer is passed in, so nothing here loads the binding
 * before the CLI's preflight (plan 120 §2).
 *
 * The adapter is synchronous by design — every `TestRenderer` input and
 * inspection method is synchronous, and the smoke host contract is synchronous.
 * The async `automation` `Locator`/`App` is not used: it would force every
 * scenario to await, for no capability the renderer does not already expose.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { TestElement, TestRenderer } from "@gpuix/native/testing";
import { Smoke } from "@gpuixui/testing";

/** A point, or `None` when the `testId` is not in the painted tree. */
interface Point {
  readonly x: number;
  readonly y: number;
}

const elementId = (
  renderer: TestRenderer,
  testId: string,
): Option.Option<number> =>
  Option.map(
    Option.fromNullishOr(renderer.findByTestId(testId)),
    (element: TestElement) => element.id,
  );

const center = (renderer: TestRenderer, testId: string): Option.Option<Point> =>
  pipe(
    elementId(renderer, testId),
    Option.flatMap((id) =>
      Option.map(boundsOf(renderer, id), (bounds) => ({
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      })),
    ),
  );

/**
 * An element's painted bounds, or the nearest ancestor's.
 *
 * A `<virtual-list>` and an `<anchored>` layer paint no surface of their own, so
 * `getElementBounds` is `null` for them even though they occupy space. Input
 * targeting (`center`) walks up to the first ancestor that does have bounds, so
 * a wheel or click aimed at such an element lands inside it instead of nowhere.
 */
const boundsOf = (
  renderer: TestRenderer,
  id: number,
): Option.Option<Smoke.Bounds> =>
  Option.match(Option.fromNullishOr(renderer.getElementBounds(id)), {
    onSome: Option.some,
    onNone: () =>
      Option.flatMap(
        Option.fromNullishOr(renderer.getElement(id)?.parentId ?? null),
        (parentId) => boundsOf(renderer, parentId),
      ),
  });

/** Own text plus every descendant's, concatenated like DOM `textContent`. */
const subtreeText = (renderer: TestRenderer, id: number): string =>
  Option.match(Option.fromNullishOr(renderer.getElement(id)), {
    onNone: () => "",
    onSome: (element) =>
      `${element.text ?? ""}${Arr.join(
        Arr.map(element.children, (child) => subtreeText(renderer, child)),
        "",
      )}`,
  });

const dragSteps = 8;

/**
 * A `SmokeHost` over `renderer`.
 *
 * A missing `testId` is a scenario bug, not a host failure: input methods do
 * nothing and the scenario's own `expectSome`/readout check fails with a label
 * naming the id.
 */
export const createNativeHost = (renderer: TestRenderer): Smoke.SmokeHost => ({
  text: (testId) =>
    Option.match(elementId(renderer, testId), {
      onNone: () => null,
      onSome: (id) => subtreeText(renderer, id),
    }),
  paintedText: () => renderer.getPaintedText(),
  bounds: (testId) =>
    Option.match(elementId(renderer, testId), {
      onNone: () => null,
      onSome: (id) => renderer.getElementBounds(id),
    }),
  // The renderer reports `style` as an untyped record; decoding it here is the
  // boundary. A value it reports with an unexpected type makes the decode fail,
  // which `StyleSnapshot` documents as a defect a scenario must see.
  paintedStyle: (testId) =>
    Option.getOrNull(
      Option.flatMap(elementId(renderer, testId), (id) =>
        Option.flatMap(
          Option.fromNullishOr(renderer.getElement(id)?.style),
          Schema.decodeUnknownOption(Smoke.StyleSnapshot),
        ),
      ),
    ),
  focused: () =>
    Option.match(
      Option.flatMap(
        Option.fromNullishOr(renderer.getFocusedElementId()),
        (id) => Option.fromNullishOr(renderer.getElement(id)),
      ),
      { onNone: () => null, onSome: (element) => element.testId ?? null },
    ),
  click: (testId) =>
    Option.match(center(renderer, testId), {
      onNone: () => {},
      onSome: (point) => renderer.nativeSimulateClick(point.x, point.y),
    }),
  clickWindow: (x, y) => renderer.nativeSimulateClick(x, y),
  key: (keystroke) => renderer.simulateKeystrokes(keystroke),
  // `focusNext`/`focusPrevious` are raw native calls: unlike the `simulate*`
  // helpers they do not drain and dispatch the resulting focus events, so the
  // React `onFocus`/`onBlur` handlers would never run (plan `140` §4).
  focusNext: () => {
    renderer.focusNext();
    renderer.dispatchNativeEvents();
    renderer.flush();
  },
  focusPrevious: () => {
    renderer.focusPrevious();
    renderer.dispatchNativeEvents();
    renderer.flush();
  },
  wheel: (testId, deltaX, deltaY) =>
    Option.match(center(renderer, testId), {
      onNone: () => {},
      onSome: (point) =>
        renderer.nativeSimulateScrollWheel(point.x, point.y, deltaX, deltaY),
    }),
  drag: (testId, deltaX, deltaY, steps) =>
    Option.match(center(renderer, testId), {
      onNone: () => {},
      onSome: (point) => {
        const total = steps ?? dragSteps;
        renderer.nativeSimulateMouseDown(point.x, point.y);
        Arr.forEach(Arr.range(1, total), (step) =>
          renderer.nativeSimulateMouseMove(
            point.x + (deltaX * step) / total,
            point.y + (deltaY * step) / total,
            0,
          ),
        );
        renderer.nativeSimulateMouseUp(point.x + deltaX, point.y + deltaY);
      },
    }),
  scrollOffset: (testId) =>
    Option.match(elementId(renderer, testId), {
      onNone: () => null,
      onSome: (id) => {
        const offset = renderer.getScrollOffset(id);
        return offset === null ? null : { x: offset[0], y: offset[1] };
      },
    }),
  screenshot: (absolutePath) => renderer.captureScreenshot(absolutePath),
  advance: (ms) => renderer.advanceTime(ms),
});

/**
 * The renderer port and the offscreen host: the one place a renderer's methods
 * become the `SmokeHost` a scenario drives.
 *
 * The port is **structural** — a handful of method signatures, not a GPUix type
 * — so this package stays platform-free, a fake renderer can stand in for a real
 * one in a unit test, and a renderer that gains methods still satisfies it. What
 * lives here is the part worth testing without a window: the `testId` → element
 * lookups, the ancestor-bounds fallback, the subtree text join, the style decode
 * at the boundary, and the drag that has to emit down → moves → up.
 *
 * The **live** window host is a different adapter on purpose: a window's
 * automation API is promise-based and its errors are typed, so it reports through
 * `AsyncSmokeHost` instead. Only the synchronous `TestRenderer` fits this port.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type {
  Bounds,
  HighlightWash,
  Offset,
  SmokeHost,
  StyleSnapshot,
} from "./smoke.js";
import { StyleSnapshot as Snapshot } from "./smoke.js";

/** One element in the renderer's retained tree, as this port reads it. */
export interface NativeElement {
  readonly id: number;
  readonly text?: string | null;
  readonly style?: Record<string, unknown> | null;
  readonly children: ReadonlyArray<number>;
  readonly parentId?: number | null;
  readonly testId?: string | null;
}

/**
 * The renderer methods the offscreen host drives.
 *
 * A real `TestRenderer` satisfies this structurally; a test supplies an object
 * literal. Everything is synchronous because every one of these is.
 */
export interface NativeRenderer {
  readonly findByTestId: (testId: string) => NativeElement | null | undefined;
  readonly getElement: (id: number) => NativeElement | null | undefined;
  readonly getElementBounds: (id: number) => Bounds | null;
  readonly getPaintedText: () => ReadonlyArray<string>;
  readonly getFocusedElementId: () => number | null;
  readonly nativeSimulateClick: (x: number, y: number) => void;
  readonly nativeSimulateMouseDown: (x: number, y: number) => void;
  readonly nativeSimulateMouseMove: (x: number, y: number) => void;
  readonly nativeSimulateMouseUp: (x: number, y: number) => void;
  readonly nativeSimulateScrollWheel: (
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
  ) => void;
  readonly simulateKeystrokes: (keystrokes: string) => void;
  readonly focusNext: () => void;
  readonly focusPrevious: () => void;
  /** Drain the events the native layer collected into the framework. */
  readonly dispatchNativeEvents: () => void;
  /** Run the renderer's own paint pipeline. */
  readonly flush: () => void;
  readonly dragSelect: (x1: number, y1: number, x2: number, y2: number) => void;
  readonly getSelectedText: () => string | null;
  readonly clearSelection: () => void;
  readonly getScrollOffset: (id: number) => readonly [number, number] | null;
  readonly getPaintedHighlights: () => ReadonlyArray<RawHighlight>;
  readonly captureScreenshot: (absolutePath: string) => void;
  readonly advanceTime: (milliseconds: number) => void;
}

/** One wash as the renderer reports it, before this port narrows it. */
export interface RawHighlight {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly active: boolean;
  readonly rects: ReadonlyArray<Bounds>;
}

/** A point, or `None` when the `testId` is not in the painted tree. */
interface Point {
  readonly x: number;
  readonly y: number;
}

const elementId = (
  renderer: NativeRenderer,
  testId: string,
): Option.Option<number> =>
  Option.map(
    Option.fromNullishOr(renderer.findByTestId(testId)),
    (element) => element.id,
  );

/**
 * An element's painted bounds, or the nearest ancestor's.
 *
 * A `<virtual-list>` and an `<anchored>` layer paint no surface of their own, so
 * `getElementBounds` is `null` for them even though they occupy space. Input
 * targeting walks up to the first ancestor that does have bounds, so a wheel or
 * click aimed at such an element lands inside it instead of nowhere.
 */
const boundsOf = (
  renderer: NativeRenderer,
  id: number,
): Option.Option<Bounds> =>
  Option.match(Option.fromNullishOr(renderer.getElementBounds(id)), {
    onSome: Option.some,
    onNone: () =>
      Option.flatMap(
        Option.fromNullishOr(renderer.getElement(id)?.parentId ?? null),
        (parentId) => boundsOf(renderer, parentId),
      ),
  });

const center = (
  renderer: NativeRenderer,
  testId: string,
): Option.Option<Point> =>
  pipe(
    elementId(renderer, testId),
    Option.flatMap((id) =>
      Option.map(boundsOf(renderer, id), (bounds) => ({
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      })),
    ),
  );

/** Own text plus every descendant's, concatenated like DOM `textContent`. */
const subtreeText = (renderer: NativeRenderer, id: number): string =>
  Option.match(Option.fromNullishOr(renderer.getElement(id)), {
    onNone: () => "",
    onSome: (element) =>
      `${element.text ?? ""}${Arr.join(
        Arr.map(element.children, (child) => subtreeText(renderer, child)),
        "",
      )}`,
  });

/** The pointer path a drag synthesises when a scenario does not name a count. */
const dragSteps = 8;

/** Runs `act` at the centre of `testId`, or nothing when it is not painted. */
const atCenter = (
  renderer: NativeRenderer,
  testId: string,
  act: (point: Point) => void,
): void =>
  Option.match(center(renderer, testId), { onNone: () => {}, onSome: act });

/**
 * A `SmokeHost` over `renderer`.
 *
 * A missing `testId` is a scenario bug, not a host failure: input methods do
 * nothing and the scenario's own `expectSome`/readout check fails with a label
 * naming the id.
 */
export const createTestHost = (renderer: NativeRenderer): SmokeHost => ({
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
  paintedStyle: (testId): StyleSnapshot | null =>
    Option.getOrNull(
      Option.flatMap(elementId(renderer, testId), (id) =>
        Option.flatMap(
          Option.fromNullishOr(renderer.getElement(id)?.style),
          Schema.decodeUnknownOption(Snapshot),
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
    atCenter(renderer, testId, (point) =>
      renderer.nativeSimulateClick(point.x, point.y),
    ),
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
    atCenter(renderer, testId, (point) =>
      renderer.nativeSimulateScrollWheel(point.x, point.y, deltaX, deltaY),
    ),
  dragSelect: (from, to) => {
    renderer.dragSelect(from.x, from.y, to.x, to.y);
  },
  selectedText: () => renderer.getSelectedText(),
  clearSelection: () => {
    renderer.clearSelection();
  },
  drag: (testId, deltaX, deltaY, steps) =>
    atCenter(renderer, testId, (point) => {
      const total = steps ?? dragSteps;
      renderer.nativeSimulateMouseDown(point.x, point.y);
      Arr.forEach(Arr.range(1, total), (step) =>
        renderer.nativeSimulateMouseMove(
          point.x + (deltaX * step) / total,
          point.y + (deltaY * step) / total,
        ),
      );
      renderer.nativeSimulateMouseUp(point.x + deltaX, point.y + deltaY);
    }),
  // The wash's rects are already the shape `Bounds` names; copying them keeps
  // the port's value independent of the renderer's array, which it reuses.
  highlights: (): ReadonlyArray<HighlightWash> =>
    Arr.map(renderer.getPaintedHighlights(), (wash) => ({
      text: wash.text,
      start: wash.start,
      end: wash.end,
      active: wash.active,
      rects: Arr.map(wash.rects, (rect) => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })),
    })),
  scrollOffset: (testId): Offset | null =>
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

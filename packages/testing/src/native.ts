import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import type {
  Bounds,
  HighlightWash,
  Offset,
  SmokeHost,
  StyleSnapshot,
} from "./smoke.js";
import { A11yNode, A11yTree, StyleSnapshot as Snapshot } from "./smoke.js";

export interface NativeElement {
  readonly id: number;
  readonly text?: string | null;
  readonly style?: Record<string, unknown> | null;
  readonly children: ReadonlyArray<number>;
  readonly parentId?: number | null;
  readonly testId?: string | null;
}

export interface NativeRenderer {
  readonly findByTestId: (testId: string) => NativeElement | null | undefined;
  readonly getElement: (id: number) => NativeElement | null | undefined;
  readonly getElementBounds: (id: number) => Bounds | null;
  readonly getPaintedText: () => ReadonlyArray<string>;

  readonly getA11yTree: () => unknown;
  readonly getFocusedElementId: () => number | null;
  readonly nativeSimulateClick: (x: number, y: number) => void;
  readonly nativeSimulateMouseDown: (x: number, y: number) => void;

  readonly nativeSimulateMouseMove: (
    x: number,
    y: number,
    pressedButton?: number,
  ) => void;
  readonly nativeSimulateMouseUp: (x: number, y: number) => void;
  readonly nativeSimulateScrollWheel: (
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
  ) => void;
  readonly nativeSimulateFileDrop: (
    x: number,
    y: number,
    paths: Array<string>,
  ) => void;
  readonly simulateKeystrokes: (keystrokes: string) => void;
  readonly focusNext: () => void;
  readonly focusPrevious: () => void;

  readonly dispatchNativeEvents: () => void;

  readonly flush: () => void;
  readonly dragSelect: (x1: number, y1: number, x2: number, y2: number) => void;
  readonly getSelectedText: () => string | null;
  readonly clearSelection: () => void;
  readonly getScrollOffset: (id: number) => readonly [number, number] | null;
  readonly getPaintedHighlights: () => ReadonlyArray<RawHighlight>;
  readonly captureScreenshot: (absolutePath: string) => void;
  readonly advanceTime: (milliseconds: number) => void;
}

const A11yDump = Schema.Struct({
  root: Schema.OptionFromOptionalKey(Schema.String),
  nodes: Schema.OptionFromOptionalKey(
    Schema.Record(
      Schema.String,
      Schema.Struct({ aria: Schema.OptionFromOptionalKey(A11yNode) }),
    ),
  ),
});

const a11yTreeOf = (dump: unknown): A11yTree | null =>
  Option.match(Schema.decodeUnknownOption(A11yDump)(dump), {
    onNone: () => null,
    onSome: (decoded) =>
      A11yTree.make({
        root: decoded.root,
        nodes: Arr.getSomes(
          Arr.map(
            R.values(Option.getOrElse(decoded.nodes, () => ({}))),
            (node) => node.aria,
          ),
        ),
      }),
  });

export interface RawHighlight {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly active: boolean;
  readonly rects: ReadonlyArray<Bounds>;
}

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

const subtreeText = (renderer: NativeRenderer, id: number): string =>
  Option.match(Option.fromNullishOr(renderer.getElement(id)), {
    onNone: () => "",
    onSome: (element) =>
      `${element.text ?? ""}${Arr.join(
        Arr.map(element.children, (child) => subtreeText(renderer, child)),
        "",
      )}`,
  });

const dragSteps = 8;

const atCenter = (
  renderer: NativeRenderer,
  testId: string,
  act: (point: Point) => void,
): void =>
  Option.match(center(renderer, testId), { onNone: () => {}, onSome: act });

export const createTestHost = (renderer: NativeRenderer): SmokeHost => ({
  text: (testId) =>
    Option.match(elementId(renderer, testId), {
      onNone: () => null,
      onSome: (id) => subtreeText(renderer, id),
    }),
  paintedText: () => renderer.getPaintedText(),
  a11yTree: () => a11yTreeOf(renderer.getA11yTree()),
  bounds: (testId) =>
    Option.match(elementId(renderer, testId), {
      onNone: () => null,
      onSome: (id) => renderer.getElementBounds(id),
    }),

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

          0,
        ),
      );
      renderer.nativeSimulateMouseUp(point.x + deltaX, point.y + deltaY);
    }),
  fileDrop: (testId, paths) => {
    renderer.flush();
    atCenter(renderer, testId, (point) => {
      renderer.nativeSimulateFileDrop(
        point.x,
        point.y,
        Arr.fromIterable(paths),
      );

      renderer.dispatchNativeEvents();
      renderer.flush();
    });
  },

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

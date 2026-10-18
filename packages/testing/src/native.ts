/**
 * The native half of `@gpuixui/testing`: a GPUix `TestRenderer` adapted to
 * `Smoke.SmokeHost`, and the lookups both native suites need.
 *
 * The renderer is typed **structurally** (`NativeRenderer`), never imported:
 * `@gpuixui/testing` must stay loadable on a host with no binding (plan `100`),
 * and the real `TestRenderer` satisfies the port where a consumer constructs
 * the host. That also makes every rule below testable against a fake.
 *
 * Two bounds rules are deliberately separate. `boundsOf` is what the element
 * itself painted — `None` for `<canvas>`, `<anchored>` and `<virtual-list>`,
 * which scenarios assert. `hitBoundsOf` walks to the nearest ancestor with
 * bounds and is the only rule input targeting may use, or a click aimed inside
 * such a layer lands at the origin.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  A11yTree,
  type Bounds,
  decodeHighlights,
  FrameOverlayMode,
  FrameStats,
  type Offset,
  type SmokeHost,
  StyleSnapshot,
  SyntaxCacheStats,
  WindowSize,
} from "./smoke.js";

/** The renderer's element shape, as much of it as the adapter reads. */
export interface NativeElement {
  readonly id: number;
  readonly testId?: string | null;
  readonly type: string;
  readonly text: string | null;
  readonly children: ReadonlyArray<number>;
  readonly parentId: number | null;
  /** The runtime's own style report, decoded by the adapter, never trusted. */
  readonly style?: unknown;
}

/**
 * The `TestRenderer` verbs this package calls.
 *
 * Method syntax is intentional: the real renderer accepts extra optional
 * arguments (`modifiers`) and a mutable `string[]` for file drops, and method
 * parameters are checked bivariantly.
 */
export interface NativeRenderer {
  findByTestId(testId: string): NativeElement | undefined;
  getElement(id: number): NativeElement | undefined;
  getRoot(): NativeElement | undefined;
  getElementBounds(id: number): Bounds | null;
  /** The window's paintable size; `useWindowSize()` reads this same value. */
  getWindowSize(): { readonly width: number; readonly height: number };
  getFocusedElementId(): number | null;
  getAllText(): ReadonlyArray<string>;
  getPaintedText(): ReadonlyArray<string>;
  getA11yTree(): unknown;
  getPaintedHighlights(): ReadonlyArray<unknown>;
  getScrollOffset(id: number): readonly [number, number] | null;
  getListScrollTop(id: number): readonly [number, number, number] | null;
  simulateKeystrokes(keystrokes: string): void;
  nativeSimulateKeyDown(id: number, key: string, held?: boolean): void;
  nativeSimulateKeyUp(id: number, key: string): void;
  nativeSimulateClick(
    x: number,
    y: number,
    button?: number,
    modifiers?: string,
  ): void;
  nativeSimulateMouseDown(x: number, y: number): void;
  nativeSimulateMouseMove(x: number, y: number, pressedButton?: number): void;
  nativeSimulateMouseUp(x: number, y: number): void;
  nativeSimulateScrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
  ): void;
  nativeSimulateFileDrop(x: number, y: number, paths: string[]): void;
  focusNext(): void;
  focusPrevious(): void;
  dispatchNativeEvents(): void;
  flush(): void;
  scrollIntoView(id: number): void;
  scrollToItem(id: number, index: number, offsetInItem?: number): void;
  dragSelect(x1: number, y1: number, x2: number, y2: number): string | null;
  getSelectedText(): string | null;
  clearSelection(): void;
  captureScreenshot(path: string): void;
  advanceTime(milliseconds: number): void;
  clockPause(): number;
  clockFastForward(deltaMs: number): number;
  getRetainedElementCount(): number;
  getSyntaxCacheStats(): ReadonlyArray<number>;
  flush(): void;
  getDebugFrameOverlayStats(): unknown;
  resetDebugFrameOverlayStats(): void;
  getDebugFrameOverlay(): string;
  setDebugFrameOverlay(mode: string): string;
  cycleDebugFrameOverlay(): string;
}

/** The element carrying `testId`, or `None` when the runtime holds no such node. */
export const find = (
  renderer: NativeRenderer,
  testId: string,
): Option.Option<NativeElement> =>
  Option.fromNullishOr(renderer.findByTestId(testId));

/** The element with `id`, or `None`. */
export const findById = (
  renderer: NativeRenderer,
  id: number,
): Option.Option<NativeElement> =>
  Option.fromNullishOr(renderer.getElement(id));

/** Every retained element, depth-first — the route to a node with no `testId`. */
export const allElements = (
  renderer: NativeRenderer,
): ReadonlyArray<NativeElement> => {
  const collect = (id: number): ReadonlyArray<NativeElement> =>
    Option.match(findById(renderer, id), {
      onNone: () => [],
      onSome: (element) => [
        element,
        ...Arr.flatMap(element.children, (child) => collect(child)),
      ],
    });
  return Option.match(Option.fromNullishOr(renderer.getRoot()), {
    onNone: () => [],
    onSome: (root) => collect(root.id),
  });
};

/** What the element itself painted — `None` for a node that paints no surface. */
export const boundsOf = (
  renderer: NativeRenderer,
  id: number,
): Option.Option<Bounds> => Option.fromNullishOr(renderer.getElementBounds(id));

/**
 * The element's bounds, or the nearest ancestor's.
 *
 * `<anchored>` and `<virtual-list>` occupy space but paint no surface, so their
 * own bounds are `None`; a click or wheel aimed by centre must land inside the
 * nearest painted ancestor instead of at the origin.
 */
export const hitBoundsOf = (
  renderer: NativeRenderer,
  id: number,
): Option.Option<Bounds> =>
  Option.match(boundsOf(renderer, id), {
    onSome: Option.some,
    onNone: () =>
      Option.flatMap(
        Option.flatMap(findById(renderer, id), (element) =>
          Option.fromNullishOr(element.parentId),
        ),
        (parentId) => hitBoundsOf(renderer, parentId),
      ),
  });

/** The point input targeting uses for `testId`. */
export const centerOf = (
  renderer: NativeRenderer,
  testId: string,
): Option.Option<Offset> =>
  Option.flatMap(find(renderer, testId), (element) =>
    Option.map(hitBoundsOf(renderer, element.id), (bounds) => ({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    })),
  );

/** Own text plus every descendant's, concatenated like DOM `textContent`. */
export const subtreeText = (renderer: NativeRenderer, id: number): string =>
  Option.match(findById(renderer, id), {
    onNone: () => "",
    onSome: (element) =>
      `${element.text ?? ""}${Arr.join(
        Arr.map(element.children, (child) => subtreeText(renderer, child)),
        "",
      )}`,
  });

/** The node holding native focus — the only way to observe one with no `testId`. */
export const focusedElement = (
  renderer: NativeRenderer,
): Option.Option<NativeElement> =>
  Option.flatMap(Option.fromNullishOr(renderer.getFocusedElementId()), (id) =>
    findById(renderer, id),
  );

const DRAG_STEPS = 8;

/** The runtime reports the cache counters as `[hits, misses, documents]`. */
const SyntaxCacheTuple = Schema.Tuple([
  Schema.Number,
  Schema.Number,
  Schema.Number,
]);

const withCenter = (
  renderer: NativeRenderer,
  testId: string,
  act: (point: Offset) => void,
): void =>
  Option.match(centerOf(renderer, testId), { onNone: () => {}, onSome: act });

const withId = (
  renderer: NativeRenderer,
  testId: string,
  act: (id: number) => void,
): void =>
  Option.match(find(renderer, testId), {
    onNone: () => {},
    onSome: (element) => act(element.id),
  });

/**
 * A `SmokeHost` over `renderer`.
 *
 * A missing `testId` is a scenario bug, not a host failure: input methods do
 * nothing and the scenario's own `expectSome`/readout check fails with a label
 * naming the id.
 */
export const createHost = (renderer: NativeRenderer): SmokeHost => ({
  text: (testId) =>
    Option.getOrNull(
      Option.map(find(renderer, testId), (element) =>
        subtreeText(renderer, element.id),
      ),
    ),
  paintedText: () => renderer.getPaintedText(),
  elementType: (testId) =>
    Option.getOrNull(
      Option.map(find(renderer, testId), (element) => element.type),
    ),
  bounds: (testId) =>
    Option.getOrNull(
      Option.flatMap(find(renderer, testId), (element) =>
        boundsOf(renderer, element.id),
      ),
    ),
  windowSize: () => {
    const size = renderer.getWindowSize();
    return new WindowSize({ width: size.width, height: size.height });
  },
  // The runtime reports `style` as an untyped record; decoding it here is the
  // boundary. A value it reports with an unexpected type makes the decode fail,
  // which `StyleSnapshot` documents as a defect a scenario must see.
  paintedStyle: (testId) =>
    Option.getOrNull(
      Option.flatMap(find(renderer, testId), (element) =>
        Option.flatMap(
          Option.fromNullishOr(element.style),
          Schema.decodeUnknownOption(StyleSnapshot),
        ),
      ),
    ),
  // The published `A11yTreeDump` type omits the `frame` counters the runtime
  // prints, so the dump is decoded as unknown input instead of trusted.
  a11y: () =>
    Option.getOrNull(
      Schema.decodeUnknownOption(A11yTree)(renderer.getA11yTree()),
    ),
  highlights: () => decodeHighlights(renderer.getPaintedHighlights()),
  focused: () =>
    Option.getOrNull(
      Option.flatMap(focusedElement(renderer), (element) =>
        Option.fromNullishOr(element.testId),
      ),
    ),
  click: (testId, modifiers) =>
    withCenter(renderer, testId, (point) =>
      renderer.nativeSimulateClick(point.x, point.y, 0, modifiers),
    ),
  clickWindow: (x, y, modifiers) =>
    renderer.nativeSimulateClick(x, y, 0, modifiers),
  press: (testId) =>
    withCenter(renderer, testId, (point) =>
      renderer.nativeSimulateMouseDown(point.x, point.y),
    ),
  pressWindow: (x, y) => renderer.nativeSimulateMouseDown(x, y),
  movePointer: (x, y) => renderer.nativeSimulateMouseMove(x, y, 0),
  releasePointer: (x, y) => renderer.nativeSimulateMouseUp(x, y),
  rightClick: (testId) =>
    withCenter(renderer, testId, (point) =>
      renderer.nativeSimulateClick(point.x, point.y, 2),
    ),
  hover: (testId) =>
    withCenter(renderer, testId, (point) =>
      renderer.nativeSimulateMouseMove(point.x, point.y),
    ),
  key: (keystroke) => renderer.simulateKeystrokes(keystroke),
  // The two halves matter for a control whose contract is "activate on Space
  // up": `key` is a parser for typed text and named keys, not a key pair.
  keyDown: (testId, key, isHeld) =>
    withId(renderer, testId, (id) =>
      renderer.nativeSimulateKeyDown(id, key, isHeld),
    ),
  keyUp: (testId, key) =>
    withId(renderer, testId, (id) => renderer.nativeSimulateKeyUp(id, key)),
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
    withCenter(renderer, testId, (point) =>
      renderer.nativeSimulateScrollWheel(point.x, point.y, deltaX, deltaY),
    ),
  drag: (testId, deltaX, deltaY, steps) =>
    withCenter(renderer, testId, (point) => {
      const total = steps ?? DRAG_STEPS;
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
  fileDrop: (testId, paths) =>
    withCenter(renderer, testId, (point) =>
      renderer.nativeSimulateFileDrop(point.x, point.y, [...paths]),
    ),
  selectText: (fromTestId, toTestId) =>
    Option.getOrNull(
      Option.flatMap(
        Option.flatMap(find(renderer, fromTestId), (element) =>
          hitBoundsOf(renderer, element.id),
        ),
        (from) =>
          Option.flatMap(
            Option.flatMap(find(renderer, toTestId), (element) =>
              hitBoundsOf(renderer, element.id),
            ),
            (to) =>
              Option.fromNullishOr(
                renderer.dragSelect(
                  from.x + 2,
                  from.y + 2,
                  to.x + to.width,
                  to.y + to.height - 2,
                ),
              ),
          ),
      ),
    ),
  selectedText: () => renderer.getSelectedText(),
  clearSelection: () => renderer.clearSelection(),
  scrollOffset: (testId) =>
    Option.getOrNull(
      Option.flatMap(find(renderer, testId), (element) =>
        Option.map(
          Option.fromNullishOr(renderer.getScrollOffset(element.id)),
          ([x, y]) => ({ x, y }),
        ),
      ),
    ),
  scrollIntoView: (testId) =>
    withId(renderer, testId, (id) => renderer.scrollIntoView(id)),
  scrollToItem: (testId, index, offsetInItem) =>
    withId(renderer, testId, (id) =>
      offsetInItem === undefined
        ? renderer.scrollToItem(id, index)
        : renderer.scrollToItem(id, index, offsetInItem),
    ),
  listScrollTop: (testId) =>
    Option.getOrNull(
      Option.flatMap(find(renderer, testId), (element) =>
        Option.map(
          Option.fromNullishOr(renderer.getListScrollTop(element.id)),
          ([index, offset, height]) => [index, offset, height] as const,
        ),
      ),
    ),
  screenshot: (absolutePath) => renderer.captureScreenshot(absolutePath),
  advance: (ms) => renderer.advanceTime(ms),
  pauseMotion: () => renderer.clockPause(),
  fastForwardMotion: (ms) => {
    const now = renderer.clockFastForward(ms);
    renderer.dispatchNativeEvents();
    renderer.flush();
    return now;
  },
  retainedElements: () => renderer.getRetainedElementCount(),
  syntaxCache: () =>
    Option.getOrNull(
      Option.map(
        Schema.decodeUnknownOption(SyntaxCacheTuple)(
          renderer.getSyntaxCacheStats(),
        ),
        ([hits, misses, documents]) =>
          new SyntaxCacheStats({ hits, misses, documents }),
      ),
    ),
  paint: () => renderer.flush(),
  // A malformed stats record is a defect, not a scenario difference: the
  // published `DebugFrameOverlayStats` shape is the contract the probe asserts.
  frameStats: () =>
    Schema.decodeUnknownSync(FrameStats)(renderer.getDebugFrameOverlayStats()),
  resetFrameStats: () => renderer.resetDebugFrameOverlayStats(),
  // A mode outside the published three is surfaced as `None`, never guessed.
  overlayMode: () =>
    Schema.decodeUnknownOption(FrameOverlayMode)(
      renderer.getDebugFrameOverlay(),
    ),
  setOverlayMode: (mode) =>
    Schema.decodeUnknownOption(FrameOverlayMode)(
      renderer.setDebugFrameOverlay(mode),
    ),
  cycleOverlayMode: () =>
    Schema.decodeUnknownOption(FrameOverlayMode)(
      renderer.cycleDebugFrameOverlay(),
    ),
});

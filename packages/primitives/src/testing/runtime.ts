/**
 * The GPUix `TestRenderer`, adapted to the verbs a component runtime test needs.
 *
 * It lives at `src/testing/` and ships as `@gpuixui/primitives/testing` because
 * it has two consumers: this package's `runtime/` suites and
 * `examples/basic-app`'s workflow suite. Two consumers is the repo's rule for
 * hoisting a shared module (plan `327`); the package root does not re-export it.
 *
 * These suites are the only place in this workstream that loads the native
 * binding (`@gpuix/react/testing` → `@gpuix/native`). Plan 020 §3 measured that
 * no `darwin-x64` binary is published, and plan 140 (playground) built one from
 * source on this host; the import therefore *can* fail, on a host where the
 * binding is absent, and it fails at load time rather than in an assertion.
 *
 * That failure is fatal on purpose. `test:runtime` is an opt-in command whose
 * whole output is native evidence; skipping it on a host without a binding would
 * report a green tick over nothing, which is the one thing `AGENTS.md` §3
 * forbids. So the import is lifted with `Effect.tryPromise` and its failure is
 * one typed, actionable error instead of a stack trace.
 *
 * The adapter is deliberately thinner than `@gpuixui/testing`'s `SmokeHost`
 * (playground workstream): it returns `Option` instead of `null`, names things
 * after the component API (`testId`) rather than the capability, and asserts
 * nothing itself. See plan 041 §2.2 for why the two exist for now.
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import type {
  A11yTreeDump,
  A11yTreeNode,
  TestElement,
  TestRenderer,
} from "@gpuix/react/testing";
import type { ReactNode } from "react";
import { paintedBox, viewportBox } from "../core/bounds.js";

/**
 * An element's painted box, in window pixels.
 *
 * Structural, not imported: `@gpuix/native`'s `ElementBounds` is only published
 * from `@gpuix/native/host`, which this package cannot resolve (it is
 * `@gpuix/react`'s dependency, not ours), and the runtime suites already depend
 * on it through `@gpuix/react/testing`.
 */
export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** No GPUix native binding is loadable, so there is no runtime to test against. */
export class MissingNativeBindingError extends Schema.TaggedError<MissingNativeBindingError>()(
  "MissingNativeBindingError",
  { cause: Schema.Unknown },
  {
    description:
      "A runtime suite could not load @gpuix/react/testing because no Darwin " +
      "x64 binding is installed. Plan 140 §5 builds one from source.",
  },
) {
  override get message(): string {
    return (
      "the runtime suites need a GPUix native binding, and importing " +
      "@gpuix/react/testing failed. On darwin-x64 no binding is published; " +
      "build one from source with gpui_macos/runtime_shaders " +
      "(.agents/slop/plans/140-gpuix-native-darwin-x64-build.md §5). " +
      `Cause: ${String(this.cause)}`
    );
  }
}

/** The renderer plus the lookups a component test makes against it. */
export interface Runtime {
  readonly renderer: TestRenderer;
  /** Mount a tree, replacing whatever was mounted before. */
  readonly render: (node: ReactNode) => void;
  /** Unmount the React root and release the window (the test fixture does this). */
  readonly unmount: () => void;
  /** The element carrying `testId`. */
  readonly element: (testId: string) => Option.Option<TestElement>;
  /** Every element the runtime retained, depth-first — how a test finds one with no `testId`. */
  readonly all: () => ReadonlyArray<TestElement>;
  /**
   * An element's bounds **as the runtime reports them**, or the nearest
   * ancestor's. See `paintBounds` for the box it paints (plan `597`).
   */
  readonly bounds: (testId: string) => Option.Option<Bounds>;
  /** An element's reported bounds, or the nearest ancestor's, by element id. */
  readonly boundsOfId: (id: number) => Option.Option<Bounds>;
  /**
   * An element's **painted** box, or the nearest ancestor's, corrected from the
   * runtime's reported box and the element's authored border and padding.
   *
   * Opt-in: the runtime reports a plain `div` from its content origin and a
   * `Button` from its border box, so a call site uses this only where the
   * element is known to report the content origin (plan `597`). A scroll
   * container is also corrected by its own offset, so here it is the **visible**
   * box (plan `598`).
   */
  readonly paintBounds: (testId: string) => Option.Option<Bounds>;
  /**
   * An element's painted box by id — a scroller's visible box, per
   * `paintBounds`.
   */
  readonly paintBoundsOfId: (id: number) => Option.Option<Bounds>;
  /** Own text plus every descendant's, concatenated like DOM `textContent`. */
  readonly text: (testId: string) => Option.Option<string>;
  /** Every string painted in the last frame, in paint order (native text like `<code>` only). */
  readonly paintedText: () => ReadonlyArray<string>;
  /** Every `<text>` node's string, depth-first — how this runtime reports a `Text`. */
  readonly allText: () => ReadonlyArray<string>;
  /** The last painted frame's accessibility tree. */
  readonly a11y: () => A11yTreeDump;
  /** The `testId` of whatever holds native focus. */
  readonly focused: () => Option.Option<string>;
  /** Whatever holds native focus — the only way to observe an element with no `testId`. */
  readonly focusedElement: () => Option.Option<TestElement>;
  /** Move the pointer over an element's centre — how a tooltip opens. */
  readonly hover: (testId: string) => void;
  /** A real hit-tested click at the element's centre. */
  readonly click: (testId: string) => void;
  /** A real click at window coordinates, for a target with no `testId`. */
  readonly clickAt: (x: number, y: number) => void;
  /** A native mouse press at window coordinates — the start of a drag. */
  readonly mouseDownAt: (x: number, y: number) => void;
  /**
   * A native mouse move at window coordinates.
   *
   * A move with no `pressedButton` goes to whatever is under the pointer; a
   * press arms GPUI's capture, so a move with a held button is routed to the
   * pressed element **even outside its bounds** — that is how a drag keeps
   * tracking (measured, plan 063 §0). `pressedButton` is the button it holds
   * (0 is the primary button).
   */
  readonly mouseMoveAt: (x: number, y: number, pressedButton?: number) => void;
  /** A native mouse release at window coordinates — the end of a drag. */
  readonly mouseUpAt: (x: number, y: number) => void;
  /**
   * A key down delivered to `testId` through GPUI's own dispatch.
   *
   * Unlike `type`, this focuses `testId` first, so it is the tool for proving a
   * key contract; use `type` (or `focused`) to prove focus moved on its own.
   */
  readonly keyDown: (testId: string, key: string, held?: boolean) => void;
  /** A key up delivered to `testId`. Pairs with `keyDown`. */
  readonly keyUp: (testId: string, key: string) => void;
  /** Type into whatever already holds focus, as a keyboard would. */
  readonly type: (keystrokes: string) => void;
  /** Move native focus forward (the Tab contract), dispatching the focus events. */
  readonly focusNext: () => void;
  /** A wheel event over the element's centre. GPUI's `deltaY` is negative to scroll down. */
  readonly wheel: (testId: string, deltaX: number, deltaY: number) => void;
  /** A scroll container's offset, if it is scrollable. */
  readonly scrollOffset: (
    testId: string,
  ) => Option.Option<{ readonly x: number; readonly y: number }>;
  /** Run due timers (the dispatcher's clock) and let the runtime settle. */
  readonly advance: (milliseconds: number) => void;
  /**
   * Move the **motion clock** — what `motion` animations run on — and repaint.
   *
   * `advance` moves the test dispatcher's timers, which is not the same clock:
   * a `motion` target does not move under `advance` (measured, plan `329`).
   */
  readonly advanceMotion: (milliseconds: number) => void;
  /** Re-run the layout and paint pipeline over what is mounted. */
  readonly flush: () => void;
  /** A real hit-tested click on an element found by `all()`. */
  readonly clickElement: (element: TestElement) => void;
  /**
   * What the window has selected, or `None` when nothing is.
   *
   * Selection listeners are registered during **paint**, so a drag that is
   * stepped without flushing selects nothing — the renderer's own drag helper
   * flushes between steps (plan `385`).
   */
  readonly selection: () => Option.Option<string>;
  /**
   * Drag-select from one window point to another and return what was selected.
   *
   * This is the only honest way to prove `Text`'s `selectable`: a `userSelect`
   * style assertion says the prop reached the host, not that the user can take
   * the text (plan `385`).
   */
  readonly dragSelection: (
    from: { readonly x: number; readonly y: number },
    to: { readonly x: number; readonly y: number },
  ) => Option.Option<string>;
}

const elementOf = (
  renderer: TestRenderer,
  testId: string,
): Option.Option<TestElement> =>
  Option.fromNullishOr(renderer.findByTestId(testId));

const idOf = (renderer: TestRenderer, testId: string): Option.Option<number> =>
  Option.map(elementOf(renderer, testId), (element) => element.id);

/**
 * An element's painted bounds, or the nearest ancestor's.
 *
 * A node that paints no surface of its own — `<svg>`, an overlay layer — reports
 * `null` even though it occupies space, so walking up to the first ancestor with
 * bounds keeps a click aimed inside it instead of nowhere (plan 140 §4).
 */
const boundsOf = (renderer: TestRenderer, id: number): Option.Option<Bounds> =>
  Option.match(Option.fromNullishOr(renderer.getElementBounds(id)), {
    onSome: Option.some,
    onNone: () =>
      Option.flatMap(
        Option.fromNullishOr(renderer.getElement(id)?.parentId ?? null),
        (parentId) => boundsOf(renderer, parentId),
      ),
  });

/**
 * The box an element paints, or the nearest ancestor's.
 *
 * Opt-in, because the runtime's report is not one model: a plain `div` reports
 * its **content** origin (inside its padding), while a `Button` reports its
 * border box, so the authored style alone cannot say which shape a given host
 * took. Call this only where the element is known to report the content origin
 * — the floating surfaces and raw `div` triggers in these suites (plan `597`).
 *
 * A scroll container is the one host whose **own** report also slides by its
 * scroll offset (measured: a 552-high region at `y 91` reports `y -18` at offset
 * `-109`) while its children report painted positions, so its offset is
 * subtracted here. That makes `paintBounds` a scroller's visible box and gives
 * `centerOf` an aim point that stays inside the window after a scroll — the
 * second wheel on a scroller used to dispatch at a negative `y` and report
 * nothing (plan `598`).
 */
const paintedBoundsOf = (
  renderer: TestRenderer,
  id: number,
): Option.Option<Bounds> =>
  Option.match(
    Option.all({
      element: Option.fromNullishOr(renderer.getElement(id)),
      reported: Option.fromNullishOr(renderer.getElementBounds(id)),
    }),
    {
      onSome: ({ element, reported }) => {
        const painted = paintedBox(reported, element.style);
        return Option.some(
          Option.match(Option.fromNullishOr(renderer.getScrollOffset?.(id)), {
            onNone: () => painted,
            onSome: ([x, y]) => viewportBox(painted, { x, y }),
          }),
        );
      },
      onNone: () =>
        Option.flatMap(
          Option.fromNullishOr(renderer.getElement(id)?.parentId ?? null),
          (parentId) => paintedBoundsOf(renderer, parentId),
        ),
    },
  );

/**
 * The centre of an element's **painted** box.
 *
 * A component that maps a pointer to a value reads the painted rail (the
 * slider's track), and the report's centre sits inside its padding, so aiming
 * at the reported centre put a 50 % click at 52 % (measured, plan `597`).
 */
const centerOf = (
  renderer: TestRenderer,
  testId: string,
): Option.Option<{ readonly x: number; readonly y: number }> =>
  Option.flatMap(idOf(renderer, testId), (id) =>
    Option.map(paintedBoundsOf(renderer, id), (bounds) => ({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    })),
  );

const subtreeText = (renderer: TestRenderer, element: TestElement): string => {
  const children = element.children.map((child) =>
    Option.match(Option.fromNullishOr(renderer.getElement(child)), {
      onNone: () => "",
      onSome: (child) => subtreeText(renderer, child),
    }),
  );
  return `${element.text ?? ""}${children.join("")}`;
};

/** Every node of a dump, keyed by AccessKit's ephemeral id. */
export const a11yNodes = (dump: A11yTreeDump): ReadonlyArray<A11yTreeNode> =>
  R.values(dump.nodes ?? {});
/**
 * Whether `element` is `rootId` or a descendant of it.
 *
 * The runtime gives a composite no single focusable id — a roving group focuses
 * one of its items — so "the focus is inside the control" is an ancestry
 * question, not an equality one (plans `084`, `089`).
 */
export const isWithin = (
  runtime: Runtime,
  element: TestElement,
  rootId: number,
): boolean =>
  element.id === rootId ||
  Option.exists(Option.fromNullishOr(element.parentId), (parentId) =>
    Option.exists(
      Option.fromNullishOr(runtime.renderer.getElement(parentId)),
      (parent) => isWithin(runtime, parent, rootId),
    ),
  ); /**
 * The first accessibility node whose present `aria` fields match `match`.
 *
 * The dump has no stable ids across frames, so a test finds a node by who it
 * says it is — role and label — which is exactly what an assistive technology
 * does.
 */
export const a11yNode = (
  dump: A11yTreeDump,
  match: { readonly role?: string; readonly label?: string },
): Option.Option<A11yTreeNode> =>
  Option.fromNullishOr(
    a11yNodes(dump).find(
      (node) =>
        (match.role === undefined || node.aria?.role === match.role) &&
        (match.label === undefined || node.aria?.label === match.label),
    ),
  );

/** The value the accessibility node matching `match` reports — `aria-valuetext` here. */
export const a11yValueOf = (
  dump: A11yTreeDump,
  match: { readonly role?: string; readonly label?: string },
): Option.Option<string> =>
  Option.flatMap(a11yNode(dump, match), (node) =>
    Option.fromNullishOr(node.aria?.value),
  );

/**
 * The renderer's selection as an `Option`, with the empty selection as `None`.
 *
 * The renderer reports `null` (or an empty string) for "nothing selected"; both
 * mean the same thing to a test, and neither should have to be checked by hand
 * (plan `385`).
 */
const selectedText = (selected: string | null): Option.Option<string> =>
  Option.filter(Option.fromNullishOr(selected), Str.isNonEmpty);

/**
 * A fresh 1280x800 offscreen window and the lookups over it.
 *
 * One per test file: mounting a tree replaces the previous one, and every input
 * helper focuses its target first, so nothing leaks between tests. Run it at the
 * module boundary with `Effect.runPromise` (EF-21: tests may execute effects).
 */
export const createRuntime = (
  options: { readonly width?: number; readonly height?: number } = {},
): Effect.Effect<Runtime, MissingNativeBindingError> =>
  Effect.gen(function* () {
    const testing = yield* Effect.tryPromise({
      try: () => import("@gpuix/react/testing"),
      catch: (cause) => new MissingNativeBindingError({ cause }),
    });
    const root = testing.createTestRoot({
      width: options.width ?? 1280,
      height: options.height ?? 800,
    });
    const { renderer } = root;
    const pointAt = (
      testId: string,
    ): Option.Option<{ readonly x: number; readonly y: number }> =>
      centerOf(renderer, testId);
    return {
      renderer,
      render: (node) => root.render(node),
      unmount: () => root.unmount(),
      element: (testId) => elementOf(renderer, testId),
      all: () => {
        const collect = (id: number): ReadonlyArray<TestElement> =>
          Option.match(Option.fromNullishOr(renderer.getElement(id)), {
            onNone: () => [],
            onSome: (element) => [
              element,
              ...element.children.flatMap((child) => collect(child)),
            ],
          });
        return Option.match(Option.fromNullishOr(renderer.getRoot()), {
          onNone: () => [],
          onSome: (root) => collect(root.id),
        });
      },
      bounds: (testId) =>
        Option.flatMap(idOf(renderer, testId), (id) => boundsOf(renderer, id)),
      boundsOfId: (id) => boundsOf(renderer, id),
      paintBounds: (testId) =>
        Option.flatMap(idOf(renderer, testId), (id) =>
          paintedBoundsOf(renderer, id),
        ),
      paintBoundsOfId: (id) => paintedBoundsOf(renderer, id),
      text: (testId) =>
        Option.map(elementOf(renderer, testId), (element) =>
          subtreeText(renderer, element),
        ),
      paintedText: () => renderer.getPaintedText(),
      allText: () => renderer.getAllText(),
      a11y: () => renderer.getA11yTree(),
      focused: () =>
        Option.flatMap(
          Option.fromNullishOr(renderer.getFocusedElementId()),
          (id) => Option.fromNullishOr(renderer.getElement(id)?.testId ?? null),
        ),
      focusedElement: () =>
        Option.flatMap(
          Option.fromNullishOr(renderer.getFocusedElementId()),
          (id) => Option.fromNullishOr(renderer.getElement(id)),
        ),
      hover: (testId) =>
        Option.match(pointAt(testId), {
          onNone: () => {},
          onSome: (point) => renderer.nativeSimulateMouseMove(point.x, point.y),
        }),
      click: (testId) =>
        Option.match(pointAt(testId), {
          onNone: () => {},
          onSome: (point) => renderer.nativeSimulateClick(point.x, point.y),
        }),
      clickAt: (x, y) => renderer.nativeSimulateClick(x, y),
      mouseDownAt: (x, y) => renderer.nativeSimulateMouseDown(x, y),
      mouseMoveAt: (x, y, pressedButton = 0) =>
        renderer.nativeSimulateMouseMove(x, y, pressedButton),
      mouseUpAt: (x, y) => renderer.nativeSimulateMouseUp(x, y),
      keyDown: (testId, key, held = false) =>
        Option.match(idOf(renderer, testId), {
          onNone: () => {},
          onSome: (id) => renderer.nativeSimulateKeyDown(id, key, held),
        }),
      keyUp: (testId, key) =>
        Option.match(idOf(renderer, testId), {
          onNone: () => {},
          onSome: (id) => renderer.nativeSimulateKeyUp(id, key),
        }),
      type: (keystrokes) => renderer.simulateKeystrokes(keystrokes),
      // `focusNext` is a raw native call: it does not drain and dispatch the
      // resulting focus events, so React's `onFocus` would never run (plan 140 §4).
      focusNext: () => {
        renderer.focusNext();
        renderer.dispatchNativeEvents();
        renderer.flush();
      },
      wheel: (testId, deltaX, deltaY) =>
        Option.match(pointAt(testId), {
          onNone: () => {},
          onSome: (point) =>
            renderer.nativeSimulateScrollWheel(
              point.x,
              point.y,
              deltaX,
              deltaY,
            ),
        }),
      scrollOffset: (testId) =>
        Option.flatMap(idOf(renderer, testId), (id) =>
          Option.map(
            Option.fromNullishOr(renderer.getScrollOffset(id)),
            ([x, y]) => ({ x, y }),
          ),
        ),
      advance: (milliseconds) => renderer.advanceTime(milliseconds),
      advanceMotion: (milliseconds) => {
        renderer.clockFastForward(milliseconds);
        renderer.flush();
      },
      flush: () => renderer.flush(),
      clickElement: (element) =>
        Option.match(boundsOf(renderer, element.id), {
          onNone: () => {},
          onSome: (bounds) =>
            renderer.nativeSimulateClick(
              bounds.x + bounds.width / 2,
              bounds.y + bounds.height / 2,
            ),
        }),
      selection: () => selectedText(renderer.getSelectedText()),
      dragSelection: (from, to) =>
        selectedText(renderer.dragSelect(from.x, from.y, to.x, to.y)),
    };
  });

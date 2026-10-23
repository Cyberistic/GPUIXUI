/**
 * The GPUix `TestRenderer`, adapted to the verbs a component runtime test needs.
 *
 * These suites are the only place in this workstream that loads the native
 * binding (`@gpuix/react/testing` → `@gpuix/native`). No `darwin-x64` binary is
 * published, and the playground builds one from source on this host (its README,
 * §The binding on this host); the import therefore *can* fail, on a host where
 * the binding is absent, and it fails at load time rather than in an assertion.
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
 * nothing itself. The two adapters exist for now because this one is scoped to
 * the component API while the playground's is scoped to capabilities.
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import type {
  A11yTreeDump,
  A11yTreeNode,
  TestElement,
  TestRenderer,
} from "@gpuix/react/testing";
import type { ReactNode } from "react";

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
      "build one from source with the recipe in " +
      "`apps/playground/README.md` §The binding on this host. " +
      `Cause: ${String(this.cause)}`
    );
  }
}

/** The renderer plus the lookups a component test makes against it. */
export interface Runtime {
  readonly renderer: TestRenderer;
  /** Mount a tree, replacing whatever was mounted before. */
  readonly render: (node: ReactNode) => void;
  /** The element carrying `testId`. */
  readonly element: (testId: string) => Option.Option<TestElement>;
  /** Every element the runtime retained, depth-first — how a test finds one with no `testId`. */
  readonly all: () => ReadonlyArray<TestElement>;
  /** An element's painted bounds, or the nearest ancestor's. */
  readonly bounds: (testId: string) => Option.Option<Bounds>;
  /** An element's painted bounds, or the nearest ancestor's, by element id. */
  readonly boundsOfId: (id: number) => Option.Option<Bounds>;
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
  /**
   * Move native focus to an element from code, the way an app calls
   * `focusElement` — the route a `tabIndex: -1` element is reachable by.
   */
  readonly focus: (testId: string) => void;
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
   * GPUI delivers a move to whatever is under the pointer; `pressedButton` is
   * how a drag reports the button it is holding (0 is the primary button).
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
  /** Run due timers and the test dispatcher. This is not the motion clock. */
  readonly advance: (milliseconds: number) => void;
  /**
   * Let a tween finish: move the motion clock and paint the settled frame.
   *
   * `advance` runs the dispatcher and timers, which is what a JS interval needs;
   * the motion clock is separate, so a surface's entry or exit is settled here
   * before its painted box is read.
   */
  readonly settleMotion: (milliseconds?: number) => void;
  /** Re-run the layout and paint pipeline over what is mounted. */
  readonly flush: () => void;
  /** A real hit-tested click on an element found by `all()`. */
  readonly clickElement: (element: TestElement) => void;
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
 * bounds keeps a click aimed inside it instead of nowhere (measured on 0.11.0).
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

const centerOf = (
  renderer: TestRenderer,
  testId: string,
): Option.Option<{ readonly x: number; readonly y: number }> =>
  Option.flatMap(idOf(renderer, testId), (id) =>
    Option.map(boundsOf(renderer, id), (bounds) => ({
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
 * The help the accessibility node matching `match` announces.
 *
 * `aria-description` is the runtime's one help channel (`aria-describedby` does
 * not exist in 0.11.0), so this is what a reader hears after the name.
 */
export const a11yDescriptionOf = (
  dump: A11yTreeDump,
  match: { readonly role?: string; readonly label?: string },
): Option.Option<string> =>
  Option.flatMap(a11yNode(dump, match), (node) =>
    Option.fromNullishOr(node.aria?.description),
  );

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
      // `focusElement` is a raw native call like `focusNext`, so the resulting
      // focus event has to be drained and dispatched before React sees it.
      focus: (testId) =>
        Option.match(idOf(renderer, testId), {
          onNone: () => {},
          onSome: (id) => {
            renderer.focusElement(id);
            renderer.dispatchNativeEvents();
            renderer.flush();
          },
        }),
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
      // resulting focus events, so React's `onFocus` would never run (measured on 0.11.0).
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
      settleMotion: (milliseconds = 1_000) => {
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
    };
  });

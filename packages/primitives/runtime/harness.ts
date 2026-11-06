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

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

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

export interface Runtime {
  readonly renderer: TestRenderer;

  readonly render: (node: ReactNode) => void;

  readonly element: (testId: string) => Option.Option<TestElement>;

  readonly all: () => ReadonlyArray<TestElement>;

  readonly bounds: (testId: string) => Option.Option<Bounds>;

  readonly boundsOfId: (id: number) => Option.Option<Bounds>;

  readonly text: (testId: string) => Option.Option<string>;

  readonly paintedText: () => ReadonlyArray<string>;

  readonly allText: () => ReadonlyArray<string>;

  readonly a11y: () => A11yTreeDump;

  readonly focused: () => Option.Option<string>;

  readonly focusedElement: () => Option.Option<TestElement>;

  readonly focus: (testId: string) => void;

  readonly hover: (testId: string) => void;

  readonly click: (testId: string) => void;

  readonly clickAt: (x: number, y: number) => void;

  readonly mouseDownAt: (x: number, y: number) => void;

  readonly mouseMoveAt: (x: number, y: number, pressedButton?: number) => void;

  readonly mouseUpAt: (x: number, y: number) => void;

  readonly keyDown: (testId: string, key: string, held?: boolean) => void;

  readonly keyUp: (testId: string, key: string) => void;

  readonly type: (keystrokes: string) => void;

  readonly focusNext: () => void;

  readonly wheel: (testId: string, deltaX: number, deltaY: number) => void;

  readonly scrollOffset: (
    testId: string,
  ) => Option.Option<{ readonly x: number; readonly y: number }>;

  readonly advance: (milliseconds: number) => void;

  readonly settleMotion: (milliseconds?: number) => void;

  readonly flush: () => void;

  readonly clickElement: (element: TestElement) => void;
}

const elementOf = (
  renderer: TestRenderer,
  testId: string,
): Option.Option<TestElement> =>
  Option.fromNullishOr(renderer.findByTestId(testId));

const idOf = (renderer: TestRenderer, testId: string): Option.Option<number> =>
  Option.map(elementOf(renderer, testId), (element) => element.id);

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

export const a11yNodes = (dump: A11yTreeDump): ReadonlyArray<A11yTreeNode> =>
  R.values(dump.nodes ?? {});

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

export const a11yValueOf = (
  dump: A11yTreeDump,
  match: { readonly role?: string; readonly label?: string },
): Option.Option<string> =>
  Option.flatMap(a11yNode(dump, match), (node) =>
    Option.fromNullishOr(node.aria?.value),
  );

export const a11yDescriptionOf = (
  dump: A11yTreeDump,
  match: { readonly role?: string; readonly label?: string },
): Option.Option<string> =>
  Option.flatMap(a11yNode(dump, match), (node) =>
    Option.fromNullishOr(node.aria?.description),
  );

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

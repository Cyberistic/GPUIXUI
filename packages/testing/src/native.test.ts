/**
 * The native adapter's own rules, proven against a fake renderer.
 *
 * Every assertion here is about a rule the real `TestRenderer` cannot teach
 * cheaply: bounds fall back to the nearest painted ancestor for input but not
 * for `SmokeHost.bounds`, focus traversal must dispatch before React sees it,
 * and the runtime's untyped style/a11y payloads are decoded at the boundary.
 * The 46-scenario suite proves the same rules end to end; this file says which
 * one broke when it does.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Option from "effect/Option";
import {
  type NativeElement,
  type NativeRenderer,
  allElements,
  boundsOf,
  createHost,
  find,
  focusedElement,
  hitBoundsOf,
  subtreeText,
} from "./native.js";

const bounds = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
});

/** A renderer over one small tree: `layer` paints no surface of its own. */
class FakeRenderer implements NativeRenderer {
  readonly elements: Readonly<Record<number, NativeElement>> = {
    1: {
      id: 1,
      type: "div",
      text: null,
      parentId: null,
      children: [2, 3],
    },
    2: {
      id: 2,
      testId: "panel",
      type: "div",
      text: "hi ",
      parentId: 1,
      children: [4],
      style: { backgroundColor: "#101010", fontSize: 13 },
    },
    3: {
      id: 3,
      testId: "layer",
      type: "div",
      text: null,
      parentId: 1,
      children: [5],
    },
    4: {
      id: 4,
      testId: "label",
      type: "text",
      text: "hello ",
      parentId: 2,
      children: [],
    },
    5: {
      id: 5,
      testId: "inner",
      type: "text",
      text: "world",
      parentId: 3,
      children: [],
    },
  };

  readonly painted = new Map<number, ReturnType<typeof bounds>>([
    [1, bounds(0, 0, 400, 300)],
    [2, bounds(10, 10, 200, 100)],
    [4, bounds(12, 12, 50, 10)],
    [5, bounds(50, 60, 20, 10)],
  ]);

  focusedId: number | null = null;
  scroll: readonly [number, number] | null = null;
  anchor: readonly [number, number, number] | null = null;
  selection: string | null = null;
  a11yDump: unknown = {
    frame: { node_count: 1, tab_stop_count: 0 },
    nodes: { a: { aria: { role: "Button" } } },
  };
  style: unknown = {
    backgroundColor: "#101010",
    fontSize: 13,
    borderColor: "#abcdef",
  };
  retained = 0;
  syntax: ReadonlyArray<number> = [0, 0, 0];
  readonly calls: Array<string> = [];

  findByTestId(testId: string): NativeElement | undefined {
    const element = Object.values(this.elements).find(
      (candidate) => candidate.testId === testId,
    );
    return element === undefined ? undefined : this.getElement(element.id);
  }
  getElement(id: number): NativeElement | undefined {
    const element = this.elements[id];
    return element === undefined
      ? undefined
      : { ...element, style: this.style };
  }
  getRoot(): NativeElement | undefined {
    return this.elements[1];
  }
  getElementBounds(id: number) {
    return this.painted.get(id) ?? null;
  }
  getFocusedElementId(): number | null {
    return this.focusedId;
  }
  getAllText(): ReadonlyArray<string> {
    return [];
  }
  getPaintedText(): ReadonlyArray<string> {
    return [];
  }
  getA11yTree(): unknown {
    return this.a11yDump;
  }
  getPaintedHighlights(): ReadonlyArray<unknown> {
    return [];
  }
  getScrollOffset(): readonly [number, number] | null {
    return this.scroll;
  }
  getListScrollTop(): readonly [number, number, number] | null {
    return this.anchor;
  }
  simulateKeystrokes(keystrokes: string): void {
    this.calls.push(`type:${keystrokes}`);
  }
  nativeSimulateKeyDown(id: number, key: string, held = false): void {
    this.calls.push(`keyDown:${id}:${key}:${held}`);
  }
  nativeSimulateKeyUp(id: number, key: string): void {
    this.calls.push(`keyUp:${id}:${key}`);
  }
  nativeSimulateClick(
    x: number,
    y: number,
    button = 0,
    modifiers?: string,
  ): void {
    const held = modifiers === undefined ? "" : `:${modifiers}`;
    this.calls.push(`click:${x},${y}:${button}${held}`);
  }
  nativeSimulateMouseDown(x: number, y: number): void {
    this.calls.push(`down:${x},${y}`);
  }
  nativeSimulateMouseMove(x: number, y: number, pressedButton = 0): void {
    this.calls.push(`move:${x},${y}:${pressedButton}`);
  }
  nativeSimulateMouseUp(x: number, y: number): void {
    this.calls.push(`up:${x},${y}`);
  }
  nativeSimulateScrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
  ): void {
    this.calls.push(`wheel:${x},${y}:${deltaX}:${deltaY}`);
  }
  nativeSimulateFileDrop(x: number, y: number, paths: string[]): void {
    this.calls.push(`drop:${x},${y}:${paths.join("|")}`);
  }
  focusNext(): void {
    this.calls.push("focusNext");
  }
  focusPrevious(): void {
    this.calls.push("focusPrevious");
  }
  dispatchNativeEvents(): void {
    this.calls.push("dispatchNativeEvents");
  }
  flush(): void {
    this.calls.push("flush");
  }
  scrollIntoView(id: number): void {
    this.calls.push(`scrollIntoView:${id}`);
  }
  scrollToItem(id: number, index: number, offsetInItem?: number): void {
    this.calls.push(`scrollToItem:${id}:${index}:${offsetInItem ?? "none"}`);
  }
  dragSelect(x1: number, y1: number, x2: number, y2: number): string | null {
    this.calls.push(`select:${x1},${y1}->${x2},${y2}`);
    return this.selection;
  }
  getSelectedText(): string | null {
    return this.selection;
  }
  clearSelection(): void {
    this.calls.push("clearSelection");
  }
  captureScreenshot(path: string): void {
    this.calls.push(`screenshot:${path}`);
  }
  advanceTime(milliseconds: number): void {
    this.calls.push(`advance:${milliseconds}`);
  }
  clockPause(): number {
    return 0;
  }
  clockFastForward(deltaMs: number): number {
    return deltaMs;
  }
  getRetainedElementCount(): number {
    return this.retained;
  }
  getSyntaxCacheStats(): ReadonlyArray<number> {
    return this.syntax;
  }
}

const rendererOf = () => new FakeRenderer();

describe("lookups", () => {
  it("walks the retained tree depth-first from the root", () => {
    const renderer = rendererOf();
    expect(allElements(renderer).map((element) => element.id)).toEqual([
      1, 2, 4, 3, 5,
    ]);
  });

  it("reports a missing test id as None rather than an empty element", () => {
    const renderer = rendererOf();
    expect(Option.isNone(find(renderer, "missing"))).toBe(true);
    expect(Option.isSome(find(renderer, "panel"))).toBe(true);
  });

  it("joins an element's own text with every descendant's", () => {
    const renderer = rendererOf();
    expect(subtreeText(renderer, 2)).toBe("hi hello ");
    expect(subtreeText(renderer, 99)).toBe("");
  });

  it("resolves focus to the element, not to the raw renderer id", () => {
    const renderer = rendererOf();
    renderer.focusedId = 2;
    expect(Option.map(focusedElement(renderer), (node) => node.testId)).toEqual(
      Option.some("panel"),
    );
  });
});

describe("bounds", () => {
  it("keeps the element's own bounds separate from the ancestor fallback", () => {
    const renderer = rendererOf();
    expect(Option.isNone(boundsOf(renderer, 3))).toBe(true);
    expect(Option.getOrNull(hitBoundsOf(renderer, 3))).toEqual(
      bounds(0, 0, 400, 300),
    );
  });

  it("clicks a surface-less layer at its painted ancestor's centre", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    host.click("layer");
    expect(renderer.calls).toEqual(["click:200,150:0"]);
    expect(host.bounds("layer")).toBeNull();
  });

  it("forwards held modifiers and presses window coordinates", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    host.click("layer", "shift");
    host.clickWindow(12, 34, "cmd-shift");
    host.pressWindow(56, 78);
    expect(renderer.calls).toEqual([
      "click:200,150:0:shift",
      "click:12,34:0:cmd-shift",
      "down:56,78",
    ]);
  });

  it("simulates nothing for a test id the runtime does not hold", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    host.click("missing");
    host.wheel("missing", 0, -100);
    expect(renderer.calls).toEqual([]);
  });

  it("aims hover, wheel and a file drop at the hit point", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    host.hover("layer");
    host.wheel("layer", 0, -100);
    host.fileDrop("layer", ["/tmp/a.txt"]);
    expect(renderer.calls).toEqual([
      "move:200,150:0",
      "wheel:200,150:0:-100",
      "drop:200,150:/tmp/a.txt",
    ]);
  });
});

describe("input", () => {
  it("right-clicks with button 2", () => {
    const renderer = rendererOf();
    createHost(renderer).rightClick("panel");
    expect(renderer.calls).toEqual(["click:110,60:2"]);
  });

  it("sends a drag as down, interpolated moves and up", () => {
    const renderer = rendererOf();
    createHost(renderer).drag("panel", 16, 8, 2);
    expect(renderer.calls).toEqual([
      "down:110,60",
      "move:118,64:0",
      "move:126,68:0",
      "up:126,68",
    ]);
  });

  it("delivers key halves to the addressed element", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    host.keyDown("panel", "space");
    host.keyUp("panel", "space");
    expect(renderer.calls).toEqual(["keyDown:2:space:false", "keyUp:2:space"]);
  });

  it("dispatches focus events before repainting on traversal", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    host.focusNext();
    host.focusPrevious();
    expect(renderer.calls).toEqual([
      "focusNext",
      "dispatchNativeEvents",
      "flush",
      "focusPrevious",
      "dispatchNativeEvents",
      "flush",
    ]);
  });

  it("selects from the first endpoint's corner to the second's", () => {
    const renderer = rendererOf();
    renderer.selection = "hello world";
    const host = createHost(renderer);
    expect(host.selectText("label", "inner")).toBe("hello world");
    expect(renderer.calls).toEqual(["select:14,14->70,68"]);
  });

  it("returns no selection when an endpoint is missing", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    expect(host.selectText("label", "missing")).toBeNull();
    expect(renderer.calls).toEqual([]);
  });
});

describe("runtime reports", () => {
  it("decodes the painted style and refuses one whose type changed", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    expect(host.paintedStyle("panel")?.backgroundColor).toEqual(
      Option.some("#101010"),
    );
    expect(host.paintedStyle("panel")?.borderColor).toEqual(
      Option.some("#abcdef"),
    );
    renderer.style = { backgroundColor: "#101010", fontSize: "big" };
    expect(host.paintedStyle("panel")).toBeNull();
  });

  it("decodes the accessibility dump and rejects a dump without a frame", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    expect(host.a11y()?.frame.node_count).toBe(1);
    renderer.a11yDump = { nodes: {} };
    expect(host.a11y()).toBeNull();
  });

  it("maps scroll tuples into the documented shapes", () => {
    const renderer = rendererOf();
    renderer.scroll = [0, -40];
    renderer.anchor = [120, 16, 280];
    const host = createHost(renderer);
    expect(host.scrollOffset("panel")).toEqual({ x: 0, y: -40 });
    expect(host.listScrollTop("panel")).toEqual([120, 16, 280]);
    renderer.scroll = null;
    renderer.anchor = null;
    expect(host.scrollOffset("panel")).toBeNull();
    expect(host.listScrollTop("panel")).toBeNull();
  });

  it("passes an optional in-row offset through to the list", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    host.scrollToItem("panel", 120);
    host.scrollToItem("panel", 120, 16);
    expect(renderer.calls).toEqual([
      "scrollToItem:2:120:none",
      "scrollToItem:2:120:16",
    ]);
  });

  it("maps focus to the focused element's test id, or null without one", () => {
    const renderer = rendererOf();
    const host = createHost(renderer);
    expect(host.focused()).toBeNull();
    renderer.focusedId = 2;
    expect(host.focused()).toBe("panel");
    renderer.focusedId = 1;
    expect(host.focused()).toBeNull();
  });

  it("forwards the retained count and decodes the syntax counters", () => {
    const renderer = rendererOf();
    renderer.retained = 42;
    renderer.syntax = [3, 1, 2];
    const host = createHost(renderer);
    expect(host.retainedElements()).toBe(42);
    expect(host.syntaxCache()?.hits).toBe(3);
    expect(host.syntaxCache()?.misses).toBe(1);
    expect(host.syntaxCache()?.documents).toBe(2);
    renderer.syntax = [3, 1];
    expect(host.syntaxCache()).toBeNull();
  });
});

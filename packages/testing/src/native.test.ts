/**
 * The offscreen host's own rules, measured against a fake renderer.
 *
 * A real `TestRenderer` can only tell you that a scenario passed, not *why*: a
 * click aimed at a `<virtual-list>` paints bounds nowhere, a subtree's text is a
 * join, and a style the runtime reports with the wrong type must fail the
 * scenario rather than be coerced. Those are this adapter's decisions, so they
 * are tested on a renderer a test can inspect — the real renderer is exercised by
 * the playground's smoke suite.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Option from "effect/Option";
import type { Bounds } from "./smoke.js";
import {
  createTestHost,
  type NativeElement,
  type NativeRenderer,
} from "./native.js";

/** The tree every case shares: a painted ancestor, an unpainted list, a row. */
const elements: ReadonlyArray<NativeElement> = [
  { id: 1, children: [2] },
  { id: 2, children: [3, 4], parentId: 1, testId: "list" },
  { id: 3, children: [], parentId: 2, testId: "row", text: "row text" },
  {
    id: 4,
    children: [],
    parentId: 2,
    testId: "styled",
    style: { backgroundColor: "#ff0000", borderRadius: 4 },
  },
  {
    id: 5,
    children: [],
    parentId: 2,
    testId: "malformed",
    style: { borderRadius: "round" },
  },
  { id: 6, children: [], parentId: 1, testId: "focused" },
];

/** Only the root paints: the list and its rows report no bounds of their own. */
const painted: Readonly<Record<number, Bounds>> = {
  1: { x: 0, y: 0, width: 200, height: 100 },
};

const fake = (focusedId: number | null = 6) => {
  const calls: Array<string> = [];
  const byId = new Map(elements.map((element) => [element.id, element]));
  const renderer: NativeRenderer = {
    findByTestId: (testId) => elements.find((e) => e.testId === testId),
    getElement: (id) => byId.get(id),
    getElementBounds: (id) => painted[id] ?? null,
    getPaintedText: () => ["painted"],
    getFocusedElementId: () => focusedId,
    nativeSimulateClick: (x, y) => calls.push(`click ${x},${y}`),
    nativeSimulateMouseDown: (x, y) => calls.push(`down ${x},${y}`),
    nativeSimulateMouseMove: (x, y) => calls.push(`move ${x},${y}`),
    nativeSimulateMouseUp: (x, y) => calls.push(`up ${x},${y}`),
    nativeSimulateScrollWheel: (x, y, deltaX, deltaY) =>
      calls.push(`wheel ${x},${y} ${deltaX},${deltaY}`),
    nativeSimulateFileDrop: (x, y, paths) =>
      calls.push(`drop ${x},${y} ${paths.join(",")}`),
    simulateKeystrokes: (keystrokes) => calls.push(`key ${keystrokes}`),
    focusNext: () => calls.push("focusNext"),
    focusPrevious: () => calls.push("focusPrevious"),
    dispatchNativeEvents: () => calls.push("dispatch"),
    flush: () => calls.push("flush"),
    dragSelect: (x1, y1, x2, y2) =>
      calls.push(`select ${x1},${y1} ${x2},${y2}`),
    getSelectedText: () => "selected",
    clearSelection: () => calls.push("clear"),
    getScrollOffset: (id) => (id === 2 ? [-10, -20] : null),
    getPaintedHighlights: () => [
      {
        text: "alpha beta",
        start: 0,
        end: 5,
        active: true,
        rects: [{ x: 1, y: 2, width: 3, height: 4 }],
      },
    ],
    captureScreenshot: (absolutePath) => calls.push(`shot ${absolutePath}`),
    advanceTime: (milliseconds) => calls.push(`advance ${milliseconds}`),
  };
  return { host: createTestHost(renderer), calls };
};

describe("createTestHost", () => {
  it("reports a highlight wash with the run and the boxes it painted", () => {
    const { host } = fake();
    expect(host.highlights()).toEqual([
      {
        text: "alpha beta",
        start: 0,
        end: 5,
        active: true,
        rects: [{ x: 1, y: 2, width: 3, height: 4 }],
      },
    ]);
  });

  it("joins a subtree's text and reports an unknown id as null", () => {
    const { host } = fake();
    expect(host.text("row")).toBe("row text");
    expect(host.text("list")).toBe("row text");
    expect(host.text("no-such-id")).toBeNull();
  });

  it("reports an element's own bounds, not its ancestor's", () => {
    const { host } = fake();
    expect(host.bounds("row")).toBeNull();
    expect(host.bounds("no-such-id")).toBeNull();
  });

  it("aims input at the nearest ancestor that paints", () => {
    const { host, calls } = fake();
    host.click("row");
    host.wheel("row", 0, -40);
    expect(calls).toEqual(["click 100,50", "wheel 100,50 0,-40"]);
  });

  it("drops files at the nearest painted ancestor with every path", () => {
    const { host, calls } = fake();
    host.fileDrop("row", ["/tmp/alpha.txt", "/tmp/beta.txt"]);
    // Flush first: the drop hit-tests the painted layout, which a scenario that
    // just replaced the view has not painted yet. Dispatch and flush after: the
    // raw native call queues its event.
    expect(calls).toEqual([
      "flush",
      "drop 100,50 /tmp/alpha.txt,/tmp/beta.txt",
      "dispatch",
      "flush",
    ]);
  });

  it("does nothing when the target is not painted", () => {
    const { host, calls } = fake();
    host.click("no-such-id");
    host.wheel("no-such-id", 1, 1);
    host.drag("no-such-id", 10, 0);
    expect(calls).toEqual([]);
  });

  it("decodes the style the renderer reports, and refuses a wrong-typed one", () => {
    const { host } = fake();
    const background = Option.flatMap(
      Option.fromNullishOr(host.paintedStyle("styled")),
      (style) => style.backgroundColor,
    );
    expect(background).toEqual(Option.some("#ff0000"));
    // A value the runtime reported with an unexpected type is a defect a
    // scenario must see, so the snapshot is absent rather than coerced.
    expect(host.paintedStyle("malformed")).toBeNull();
    expect(host.paintedStyle("row")).toBeNull();
  });

  it("names the focused element by testId", () => {
    expect(fake().host.focused()).toBe("focused");
    expect(fake(null).host.focused()).toBeNull();
    expect(fake(999).host.focused()).toBeNull();
  });

  it("dispatches native focus traversal, then flushes", () => {
    const { host, calls } = fake();
    host.focusNext();
    host.focusPrevious();
    expect(calls).toEqual([
      "focusNext",
      "dispatch",
      "flush",
      "focusPrevious",
      "dispatch",
      "flush",
    ]);
  });

  it("drags down, moves by the step count, then up at the full delta", () => {
    const { host, calls } = fake();
    host.drag("row", 40, 0);
    expect(calls[0]).toBe("down 100,50");
    expect(calls).toHaveLength(10);
    expect(calls[1]).toBe("move 105,50");
    expect(calls[9]).toBe("up 140,50");

    const stepped = fake();
    stepped.host.drag("row", 40, 0, 2);
    expect(stepped.calls).toEqual([
      "down 100,50",
      "move 120,50",
      "move 140,50",
      "up 140,50",
    ]);
  });

  it("maps the renderer's scroll tuple to an offset", () => {
    const { host } = fake();
    expect(host.scrollOffset("list")).toEqual({ x: -10, y: -20 });
    expect(host.scrollOffset("row")).toBeNull();
  });

  it("passes the verbs with no translation through", () => {
    const { host, calls } = fake();
    host.key("tab");
    host.clickWindow(5, 6);
    host.dragSelect({ x: 1, y: 2 }, { x: 3, y: 4 });
    host.clearSelection();
    host.screenshot("/tmp/shot.png");
    host.advance(120);
    expect(calls).toEqual([
      "key tab",
      "click 5,6",
      "select 1,2 3,4",
      "clear",
      "shot /tmp/shot.png",
      "advance 120",
    ]);
    expect(host.selectedText()).toBe("selected");
    expect(host.paintedText()).toEqual(["painted"]);
  });
});

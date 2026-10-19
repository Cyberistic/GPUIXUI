/**
 * MessageScroller behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a new row that yanks a reader who scrolled up; an
 * unread count that increments while pinned; a "jump to latest" that does not
 * reach the end or leaves the count behind; a short history that offers a
 * pointless control; a streamed row that grows without keeping its bottom
 * visible; and an affordance that takes a row beneath the transcript instead of
 * floating in its bottom-right corner. The scroll position is read from the
 * renderer, not inferred from the component's own state, so a wrong pin decision
 * fails here.
 *
 * Visible box (plan 582): on this binding a scroll container reports its own
 * position in scrolled content space (viewport `y: -1080` at offset `-1080`)
 * while its rows are in window space. The helpers therefore wheel and measure
 * at the unscrolled **scroller root**, and the component measures its pin there
 * too; using the container's own box left nine cases red and made a scroll back
 * to the end impossible to detect.
 */

import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import { clickCentreOf, requireBounds } from "../internal/interaction.js";
import {
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "../message-scroller.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

interface TranscriptProps {
  readonly count: number;
  /** Give the last row extra height, as a streamed reply would gain. */
  readonly grown?: boolean;
  /** The pin distance; a malformed value must still follow the end. */
  readonly threshold?: number;
  readonly onPinnedChange?: (pinned: boolean) => void;
}

/** A bounded transcript: 26px-ish rows in a 200px viewport. */
const Transcript = ({
  count,
  grown = false,
  threshold,
  onPinnedChange,
}: TranscriptProps) => (
  <div style={{ width: 480 }}>
    <MessageScroller
      testId="scroller"
      label="Conversation"
      threshold={threshold}
      onPinnedChange={onPinnedChange}
    >
      <MessageScrollerViewport testId="viewport" style={{ height: 200 }}>
        {Array.from({ length: count }, (_, index) => (
          <MessageScrollerItem
            key={index}
            testId={`row-${index}`}
            style={grown && index === count - 1 ? { height: 80 } : undefined}
          >
            <text>{`message ${index}`}</text>
          </MessageScrollerItem>
        ))}
      </MessageScrollerViewport>
      <MessageScrollerJumpToLatest testId="jump" />
    </MessageScroller>
  </div>
);

/** The viewport's vertical scroll offset; `0` when it has not rendered. */
const offsetOf = (root: ComponentTestRoot): number =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(root.renderer.findByTestId("viewport")),
      (viewport) =>
        Option.fromNullishOr(root.renderer.getScrollOffset(viewport.id)?.[1]),
    ),
    () => 0,
  );

/** Wheel over the viewport. Positive scrolls up (toward older rows).
 *
 * The scroller **root** is the reliable box: on this binding the scroll
 * container reports its own position in scrolled content space (plan 582), so a
 * wheel at the viewport's centre would land off-screen. */
const wheel = (root: ComponentTestRoot, deltaY: number): void => {
  const { x, y, width, height } = requireBounds(root, "scroller");
  root.renderer.nativeSimulateScrollWheel(
    x + width / 2,
    y + height / 2,
    0,
    deltaY,
  );
};

/** Whether the last row sits inside the visible scroller, i.e. the end is. */
const endIsVisible = (root: ComponentTestRoot, last: number): boolean => {
  const visible = requireBounds(root, "scroller");
  const row = requireBounds(root, `row-${last}`);
  return row.y + row.height <= visible.y + visible.height + 1;
};

const text = (root: ComponentTestRoot): ReadonlyArray<string> =>
  root.renderer.getAllText();

describe("MessageScroller", () => {
  it("starts pinned at the end of a long history", () => {
    const root = renderComponent(<Transcript count={40} />);

    expect(offsetOf(root)).toBeLessThan(0);
    expect(endIsVisible(root, 39)).toBe(true);
    expect(root.renderer.findByTestId("jump")).toBeUndefined();

    root.unmount();
  });

  it("keeps a short history still and hides the affordance", () => {
    const root = renderComponent(<Transcript count={2} />);

    expect(offsetOf(root)).toBe(0);
    expect(root.renderer.findByTestId("jump")).toBeUndefined();

    root.unmount();
  });

  it("follows a row appended while pinned", () => {
    const root = renderComponent(<Transcript count={40} />);
    const before = offsetOf(root);

    root.rerender(<Transcript count={41} />);

    expect(offsetOf(root)).toBeLessThan(before);
    expect(endIsVisible(root, 40)).toBe(true);
    expect(root.renderer.findByTestId("jump")).toBeUndefined();
    expect(text(root)).toContain("message 40");

    root.unmount();
  });

  it("does not yank a reader who scrolled up", () => {
    const root = renderComponent(<Transcript count={40} />);
    wheel(root, 120);
    const before = offsetOf(root);
    expect(root.renderer.findByTestId("jump")).toBeDefined();

    root.rerender(<Transcript count={41} />);

    expect(offsetOf(root)).toBe(before);
    expect(endIsVisible(root, 40)).toBe(false);
    expect(root.renderer.findByTestId("jump")).toBeDefined();
    expect(text(root)).toContain("1 new message");

    root.unmount();
  });

  it("counts every row that arrives while unpinned", () => {
    const root = renderComponent(<Transcript count={40} />);
    wheel(root, 120);

    root.rerender(<Transcript count={43} />);

    expect(text(root)).toContain("3 new messages");

    root.unmount();
  });

  it("jump to latest returns to the end, clears the count and re-pins", () => {
    const onPinnedChange = vi.fn();
    const root = renderComponent(
      <Transcript count={40} onPinnedChange={onPinnedChange} />,
    );
    wheel(root, 120);
    root.rerender(<Transcript count={43} onPinnedChange={onPinnedChange} />);
    expect(text(root)).toContain("3 new messages");

    clickCentreOf(root, "jump");

    expect(endIsVisible(root, 42)).toBe(true);
    expect(root.renderer.findByTestId("jump")).toBeUndefined();
    expect(onPinnedChange).toHaveBeenCalledWith(true);

    root.unmount();
  });

  it("re-pins when the reader wheels back to the end", () => {
    const root = renderComponent(<Transcript count={40} />);
    wheel(root, 120);
    root.rerender(<Transcript count={41} />);
    expect(root.renderer.findByTestId("jump")).toBeDefined();

    wheel(root, -2000);

    expect(endIsVisible(root, 40)).toBe(true);
    expect(root.renderer.findByTestId("jump")).toBeUndefined();

    root.unmount();
  });

  it("keeps the pin when a scroll returns exactly to the end", () => {
    const root = renderComponent(<Transcript count={40} />);

    wheel(root, 120);
    expect(root.renderer.findByTestId("jump")).toBeDefined();

    // Back to the end in one move. The old viewport-box rule read the tail as
    // 1000+ px below the visible bottom (the container's box is content-space)
    // and could never re-pin (plan 582).
    wheel(root, -120);
    expect(endIsVisible(root, 39)).toBe(true);
    expect(root.renderer.findByTestId("jump")).toBeUndefined();

    root.unmount();
  });

  it("re-pins at the end when the threshold is not a number", () => {
    const root = renderComponent(
      <Transcript count={40} threshold={Number.NaN} />,
    );

    wheel(root, 120);
    expect(root.renderer.findByTestId("jump")).toBeDefined();

    // `distanceFromEnd <= NaN` is false, so the old threshold could never
    // re-pin and every arrival counted as unread (plan 652).
    wheel(root, -120);
    expect(endIsVisible(root, 39)).toBe(true);
    expect(root.renderer.findByTestId("jump")).toBeUndefined();

    root.unmount();
  });

  it("keeps the bottom visible when a streamed row grows while pinned", () => {
    const root = renderComponent(<Transcript count={40} />);

    root.rerender(<Transcript count={40} grown />);

    expect(endIsVisible(root, 39)).toBe(true);
    expect(root.renderer.findByTestId("jump")).toBeUndefined();

    root.unmount();
  });

  it("leaves the reader in place when a row grows while unpinned", () => {
    const root = renderComponent(<Transcript count={40} />);
    wheel(root, 120);
    const before = offsetOf(root);

    root.rerender(<Transcript count={40} grown />);

    expect(offsetOf(root)).toBe(before);
    expect(root.renderer.findByTestId("jump")).toBeDefined();

    root.unmount();
  });

  it("reports the pin becoming false", () => {
    const onPinnedChange = vi.fn();
    const root = renderComponent(
      <Transcript count={40} onPinnedChange={onPinnedChange} />,
    );

    wheel(root, 120);

    expect(onPinnedChange).toHaveBeenCalledWith(false);

    root.unmount();
  });

  it("floats the jump affordance inside the transcript's bottom-right corner", () => {
    const root = renderComponent(
      <MessageScroller label="Conversation" pinned={false}>
        <MessageScrollerViewport testId="viewport" style={{ height: 200 }}>
          <MessageScrollerItem>
            <text>First</text>
          </MessageScrollerItem>
        </MessageScrollerViewport>
        <MessageScrollerJumpToLatest testId="jump" />
      </MessageScroller>,
    );

    const viewport = requireBounds(root, "viewport");
    const jump = requireBounds(root, "jump");

    // The affordance overlaps the transcript instead of taking a row beneath it.
    expect(jump.y).toBeGreaterThanOrEqual(viewport.y);
    expect(jump.y + jump.height).toBeLessThanOrEqual(
      viewport.y + viewport.height,
    );
    // Anchored to the right side.
    expect(jump.x).toBeGreaterThan(viewport.x + viewport.width / 2);

    root.unmount();
  });
});

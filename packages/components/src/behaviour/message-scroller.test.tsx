/**
 * MessageScroller behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a new row that yanks a reader who scrolled up; an
 * unread count that increments while pinned; a "jump to latest" that does not
 * reach the end or leaves the count behind; a short history that offers a
 * pointless control; a streamed row that grows without keeping its bottom
 * visible; and a threshold that measured `NaN`, which used to read as "away
 * from the end" so a reader at the bottom stopped following new rows. The
 * scroll position is read from the renderer, not inferred from the component's
 * own state, so a wrong pin decision fails here.
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
  readonly onPinnedChange?: (pinned: boolean) => void;
  readonly threshold?: number;
}

/** A bounded transcript: 26px-ish rows in a 200px viewport. */
const Transcript = ({
  count,
  grown = false,
  onPinnedChange,
  threshold,
}: TranscriptProps) => (
  <div style={{ width: 480 }}>
    <MessageScroller
      testId="scroller"
      label="Conversation"
      onPinnedChange={onPinnedChange}
      {...(threshold === undefined ? {} : { threshold })}
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

/** Wheel over the viewport. Positive scrolls up (toward older rows). */
const wheel = (root: ComponentTestRoot, deltaY: number): void => {
  const { x, y, width, height } = requireBounds(root, "viewport");
  root.renderer.nativeSimulateScrollWheel(
    x + width / 2,
    y + height / 2,
    0,
    deltaY,
  );
};

/** Whether the last row sits inside the viewport, i.e. the end is visible. */
const endIsVisible = (root: ComponentTestRoot, last: number): boolean => {
  const viewport = requireBounds(root, "viewport");
  const row = requireBounds(root, `row-${last}`);
  return row.y + row.height <= viewport.y + viewport.height + 1;
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

  it("keeps following rows when its threshold cannot be measured", () => {
    // The threshold is a layout token, often arithmetic over a measured inset,
    // and `NaN` failed every comparison: a reader who moved 10px — inside the
    // default 24px — was read as away from the end, so the next row stopped
    // following and the affordance offered a jump the reader did not need.
    const unreadable = Number.NaN;
    const root = renderComponent(
      <Transcript count={40} threshold={unreadable} />,
    );
    wheel(root, 10);
    const before = offsetOf(root);

    root.rerender(<Transcript count={41} threshold={unreadable} />);

    const after = offsetOf(root);
    const endVisible = endIsVisible(root, 40);
    const jump = root.renderer.findByTestId("jump");
    const painted = text(root);
    root.unmount();

    expect(after).toBeLessThan(before);
    expect(endVisible).toBe(true);
    expect(jump).toBeUndefined();
    expect(painted).not.toContain("1 new message");
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
});

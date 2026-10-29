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
import { Profiler } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  clickCentreOf,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import {
  MessageScroller,
  MessageScrollerContent,
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

/** Whether the jump control is painted and reachable, or only reserving rail. */
const jumpActive = (root: ComponentTestRoot): boolean =>
  root.renderer.findByTestId("jump")?.customProps?.tabIndex === 0;

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
    expect(jumpActive(root)).toBe(false);

    root.unmount();
  });

  it("keeps a short history still and hides the affordance", () => {
    const root = renderComponent(<Transcript count={2} />);

    expect(offsetOf(root)).toBe(0);
    expect(jumpActive(root)).toBe(false);

    root.unmount();
  });

  it("follows a row appended while pinned", () => {
    const root = renderComponent(<Transcript count={40} />);
    const before = offsetOf(root);

    root.rerender(<Transcript count={41} />);

    expect(offsetOf(root)).toBeLessThan(before);
    expect(endIsVisible(root, 40)).toBe(true);
    expect(jumpActive(root)).toBe(false);
    expect(text(root)).toContain("message 40");

    root.unmount();
  });

  it("does not yank a reader who scrolled up", () => {
    const root = renderComponent(<Transcript count={40} />);
    wheel(root, 120);
    const before = offsetOf(root);
    expect(jumpActive(root)).toBe(true);

    root.rerender(<Transcript count={41} />);

    expect(offsetOf(root)).toBe(before);
    expect(endIsVisible(root, 40)).toBe(false);
    expect(jumpActive(root)).toBe(true);
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
    const jump = jumpActive(root);
    const painted = text(root);
    root.unmount();

    expect(after).toBeLessThan(before);
    expect(endVisible).toBe(true);
    expect(jump).toBe(false);
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
    expect(jumpActive(root)).toBe(false);
    expect(onPinnedChange).toHaveBeenCalledWith(true);

    root.unmount();
  });

  it("re-pins when the reader wheels back to the end", () => {
    const root = renderComponent(<Transcript count={40} />);
    wheel(root, 120);
    root.rerender(<Transcript count={41} />);
    expect(jumpActive(root)).toBe(true);

    wheel(root, -2000);

    expect(endIsVisible(root, 40)).toBe(true);
    expect(jumpActive(root)).toBe(false);

    root.unmount();
  });

  it("keeps the bottom visible when a streamed row grows while pinned", () => {
    const root = renderComponent(<Transcript count={40} />);

    root.rerender(<Transcript count={40} grown />);
    // A growing row reports its new size on the next layout, which is when the
    // scroller follows it.
    settle(root);

    expect(endIsVisible(root, 39)).toBe(true);
    expect(jumpActive(root)).toBe(false);

    root.unmount();
  });

  it("leaves the reader in place when a row grows while unpinned", () => {
    const root = renderComponent(<Transcript count={40} />);
    wheel(root, 120);
    const before = offsetOf(root);

    root.rerender(<Transcript count={40} grown />);
    settle(root);

    expect(offsetOf(root)).toBe(before);
    expect(jumpActive(root)).toBe(true);

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

/**
 * The jump control floats over the transcript's bottom edge, the way shadcn's
 * button does. The bug this guards: it used to sit in a rail below the viewport,
 * taking its own row of height from the scroller.
 */
describe("MessageScroller's jump control", () => {
  it("floats centred over the viewport's bottom edge", () => {
    const root = renderComponent(<Transcript count={40} />);
    wheel(root, 120);

    const viewport = requireBounds(root, "viewport");
    const jump = requireBounds(root, "jump");
    root.unmount();

    expect(jump.y + jump.height).toBeLessThanOrEqual(
      viewport.y + viewport.height,
    );
    expect(jump.y + jump.height).toBeGreaterThan(
      viewport.y + viewport.height - 48,
    );
    expect(
      Math.abs(jump.x + jump.width / 2 - (viewport.x + viewport.width / 2)),
    ).toBeLessThanOrEqual(1);
  });
});

/** The documented composition: rows live inside the content part. */
const ContentTranscript = ({ count }: { readonly count: number }) => (
  <div style={{ width: 480 }}>
    <MessageScroller testId="scroller" label="Conversation">
      <MessageScrollerViewport testId="viewport" style={{ height: 200 }}>
        <MessageScrollerContent>
          {Array.from({ length: count }, (_, index) => (
            <MessageScrollerItem key={index} testId={`row-${index}`}>
              <text>{`message ${index}`}</text>
            </MessageScrollerItem>
          ))}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerJumpToLatest testId="jump" />
    </MessageScroller>
  </div>
);

/** A transcript beside a sibling whose text changes, as a composer's draft would. */
const WithSibling = ({ draft }: { readonly draft: string }) => (
  <div style={{ width: 480 }}>
    <text testId="draft">{draft}</text>
    <MessageScroller testId="scroller" label="Conversation">
      <MessageScrollerViewport testId="viewport" style={{ height: 200 }}>
        {Array.from({ length: 40 }, (_, index) => (
          <MessageScrollerItem key={index} testId={`row-${index}`}>
            <text>{`message ${index}`}</text>
          </MessageScrollerItem>
        ))}
      </MessageScrollerViewport>
      <MessageScrollerJumpToLatest testId="jump" />
    </MessageScroller>
  </div>
);

/**
 * A sibling's keystroke is not a transcript change. The bug this guards: the
 * viewport re-scrolled the tail on every render, so typing in a composer beside
 * it forced a layout per character.
 */
describe("MessageScroller's measurements", () => {
  it("follows a row appended inside the content part", () => {
    const root = renderComponent(<ContentTranscript count={40} />);
    const before = offsetOf(root);

    root.rerender(<ContentTranscript count={41} />);

    expect(offsetOf(root)).toBeLessThan(before);
    expect(endIsVisible(root, 40)).toBe(true);

    root.unmount();
  });

  it("does not scroll or measure when a sibling re-renders", () => {
    const root = renderComponent(<WithSibling draft="a" />);
    const scrollIntoView = vi.spyOn(root.renderer, "scrollIntoView");
    const getElementBounds = vi.spyOn(root.renderer, "getElementBounds");
    scrollIntoView.mockClear();
    getElementBounds.mockClear();

    root.rerender(<WithSibling draft="ab" />);

    const scrolled = scrollIntoView.mock.calls.length;
    const measured = getElementBounds.mock.calls.length;
    root.unmount();

    expect(scrolled).toBe(0);
    expect(measured).toBe(0);
  });
});

/** A transcript whose rows count their own commits, one profiler per row. */
const Profiled = ({
  count,
  commits,
}: {
  readonly count: number;
  readonly commits: Map<string, number>;
}) => (
  <div style={{ width: 480 }}>
    <MessageScroller testId="scroller" label="Conversation">
      <MessageScrollerViewport testId="viewport" style={{ height: 200 }}>
        {Array.from({ length: count }, (_, index) => (
          <Profiler
            id={`row-${index}`}
            key={index}
            onRender={(id) => commits.set(id, (commits.get(id) ?? 0) + 1)}
          >
            <MessageScrollerItem testId={`row-${index}`}>
              <text>{`message ${index}`}</text>
            </MessageScrollerItem>
          </Profiler>
        ))}
      </MessageScrollerViewport>
      <MessageScrollerJumpToLatest testId="jump" />
    </MessageScroller>
  </div>
);

/**
 * The scroller's state is not what every row reads. The bug this guards: the
 * shared context carried `pinned`/`unread`, so one store write rebuilt the value
 * and every row repainted — `n` arrivals cost `n` repaints.
 */
describe("MessageScroller's repaints", () => {
  it("repaints no rows for a jump that only moves the store", () => {
    const commits = new Map<string, number>();
    const root = renderComponent(<Profiled count={40} commits={commits} />);
    wheel(root, 120);
    commits.clear();

    clickCentreOf(root, "jump");

    const repainted = [...commits.entries()].filter(([, n]) => n > 0);
    root.unmount();

    expect(repainted).toEqual([]);
  });
});

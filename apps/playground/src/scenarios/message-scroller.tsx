/**
 * `message-scroller` — the chat/stream scroller contract in the real runtime.
 *
 * Plan `206` defines the behaviour: follow new content while the reader is at
 * the end, leave them alone when they are not, and offer a jump back. The
 * runtime makes that narrower than the browser version:
 *
 * - `<virtual-list>` has **no `onScroll`**;
 * - `onVisibleRange`'s payload is a built-window range (it includes overdraw and
 *   lags one gesture), so `endIndex >= count` is a yank waiting to happen;
 * - the exact source is `renderer.getListScrollTop(id)` read **inside** the
 *   range handler, which reports the post-scroll anchor;
 * - `scrollToItem(list, count)` is the at-end sentinel a jump uses;
 * - the runtime does not follow an append or a growing row — the component
 *   scrolls, and only while pinned.
 *
 * Measured facts and the component recipe: plan `300` §1/§7.
 */
import { useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { isPinned, type ScrollerAnchor } from "./scroller-state.js";

const ROW = 30;
const VIEWPORT = 300;
const WIDTH = 320;
const INITIAL = 60;
const THRESHOLD = 24;
const STREAM_STEP = 10;
const STREAM_MAX = 90;

interface Message {
  readonly id: number;
  readonly height: number;
}

const messagesFrom = (count: number): ReadonlyArray<Message> =>
  Arr.map(Arr.range(1, count), (id) => ({ id, height: ROW }));

const heightsOf = (messages: ReadonlyArray<Message>): ReadonlyArray<number> =>
  Arr.map(messages, (message) => message.height);

const anchorOf = (
  values: ReadonlyArray<number>,
): Option.Option<ScrollerAnchor> =>
  Option.map(
    Option.all([
      Option.fromNullishOr(values[0]),
      Option.fromNullishOr(values[1]),
      Option.fromNullishOr(values[2]),
    ]),
    ([index, offsetInItem, viewportHeight]) => ({
      index,
      offsetInItem,
      viewportHeight,
    }),
  );

const MessageScrollerProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const messagesRef = useRef<ReadonlyArray<Message>>(messagesFrom(INITIAL));
  const pinnedRef = useRef(true);
  const previousCount = useRef(messagesRef.current.length);
  const [messages, setMessages] = useState<ReadonlyArray<Message>>(
    messagesFrom(INITIAL),
  );
  const [pinned, setPinned] = useState(true);
  const [unread, setUnread] = useState(0);
  const [anchorText, setAnchorText] = useState("none");

  messagesRef.current = messages;
  const lastHeight = messages[Arr.length(messages) - 1]?.height ?? ROW;
  const previousLastHeight = useRef(lastHeight);

  /** The runtime's at-end sentinel: `itemIndex === item count`. */
  const scrollToEnd = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollToItem?.(id, messagesRef.current.length),
    });
  };

  /** The exact pin source: the live anchor, never the range payload. */
  const syncPinned = (): void => {
    Option.match(
      Option.flatMap(Option.fromNullishOr(list.current?.id), (id) =>
        Option.flatMap(
          Option.fromNullishOr(renderer?.getListScrollTop?.(id)),
          anchorOf,
        ),
      ),
      {
        onNone: () => {},
        onSome: (anchor) => {
          const next = isPinned(
            heightsOf(messagesRef.current),
            anchor,
            THRESHOLD,
          );
          pinnedRef.current = next;
          setPinned(next);
          setAnchorText(`${anchor.index},${anchor.offsetInItem}`);
        },
      },
    );
  };

  useEffect(() => {
    scrollToEnd();
  }, []);

  useEffect(() => {
    const grew = messages.length > previousCount.current;
    previousCount.current = messages.length;
    if (grew && pinnedRef.current) scrollToEnd();
  }, [messages.length]);

  useEffect(() => {
    const grew = lastHeight > previousLastHeight.current;
    previousLastHeight.current = lastHeight;
    if (grew && pinnedRef.current) scrollToEnd();
  }, [lastHeight]);

  const append = (): void => {
    if (!pinnedRef.current) setUnread((current) => current + 1);
    setMessages((current) =>
      Arr.append(current, { id: Arr.length(current) + 1, height: ROW }),
    );
  };

  const stream = (): void => {
    setMessages((current) =>
      Arr.map(current, (message, index) =>
        index === Arr.length(current) - 1
          ? {
              id: message.id,
              height: Math.min(message.height + STREAM_STEP, STREAM_MAX),
            }
          : message,
      ),
    );
  };

  const jump = (): void => {
    pinnedRef.current = true;
    setPinned(true);
    setUnread(0);
    scrollToEnd();
  };

  const reset = (): void => {
    pinnedRef.current = true;
    setPinned(true);
    setUnread(0);
    setMessages(messagesFrom(3));
    scrollToEnd();
  };

  return (
    <div
      testId="message-scroller-view"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 820,
        height: 440,
        padding: 16,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <Pressable testId="ms-append" onClick={append}>
          <text style={{ color: theme.colors.foreground }}>append</text>
        </Pressable>
        <Pressable testId="ms-stream" onClick={stream}>
          <text style={{ color: theme.colors.foreground }}>stream</text>
        </Pressable>
        <Pressable testId="ms-reset" onClick={reset}>
          <text style={{ color: theme.colors.foreground }}>short history</text>
        </Pressable>
      </div>
      <Readout testId="ms-count">{`${messages.length}`}</Readout>
      <Readout testId="ms-pin">{`${pinned}`}</Readout>
      <Readout testId="ms-unread">{`${unread}`}</Readout>
      <Readout testId="ms-anchor">{anchorText}</Readout>
      <Readout testId="ms-last-height">{`${lastHeight}`}</Readout>
      <div
        testId="ms-viewport"
        style={{ display: "flex", width: WIDTH, height: VIEWPORT }}
      >
        <virtual-list
          testId="ms-list"
          ref={list}
          estimatedItemHeight={ROW}
          style={{ width: WIDTH, height: VIEWPORT }}
          onVisibleRange={() => syncPinned()}
        >
          {Arr.map(messages, (message) => (
            <div
              key={message.id}
              testId={`ms-row-${message.id}`}
              style={{ height: message.height, flexShrink: 0 }}
            >
              <text style={{ color: theme.colors.foreground }}>
                {`message ${message.id}`}
              </text>
            </div>
          ))}
        </virtual-list>
      </div>
      {pinned ? null : (
        <Pressable testId="ms-jump" onClick={jump}>
          <text style={{ color: theme.colors.foreground }}>
            {`jump to latest (${unread})`}
          </text>
        </Pressable>
      )}
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(id)), () => "");

const painted = (ctx: Smoke.SmokeContext, id: number): boolean =>
  Arr.contains(ctx.host.paintedText(), `message ${id}`);

export const messageScrollerScenario: PlaygroundScenario = {
  id: "message-scroller",
  title: "Message scroller: pinned follow, no yank, streaming and jump",
  capability: "scroller",
  view: () => <MessageScrollerProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const list = yield* ctx.expectSome(
        "the list viewport is painted",
        Option.fromNullishOr(ctx.host.bounds("ms-viewport")),
      );
      const anchor = yield* ctx.expectSome(
        "the list reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );

      // 1. A chat opens at the latest message, without a followTail prop.
      yield* ctx.expectEqual(
        "the scroller starts pinned",
        readout(ctx, "ms-pin"),
        "true",
      );
      yield* ctx.expectEqual(
        "the scroller starts at the max scroll",
        `${anchor[0]},${anchor[1]}`,
        "50,0",
      );
      yield* ctx.expectEqual(
        "the latest message is painted",
        painted(ctx, 60),
        true,
      );
      yield* ctx.expectEqual(
        "the first message is outside the window",
        painted(ctx, 1),
        false,
      );
      yield* ctx.expectEqual(
        "the affordance is absent while pinned",
        ctx.host.bounds("ms-jump") === null,
        true,
      );

      // 2. While pinned the component follows an append.
      ctx.host.click("ms-append");
      ctx.host.advance(50);
      const afterAppend = yield* ctx.expectSome(
        "the appended list reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );
      yield* ctx.expectEqual(
        "the append reached React",
        readout(ctx, "ms-count"),
        "61",
      );
      yield* ctx.expectEqual(
        "a pinned append follows to the new max scroll",
        `${afterAppend[0]},${afterAppend[1]}`,
        "51,0",
      );
      yield* ctx.expectEqual(
        "the appended message is painted",
        painted(ctx, 61),
        true,
      );

      // 3. One gesture up unpins, and the affordance appears.
      ctx.host.wheel("ms-list", 0, 400);
      ctx.host.advance(50);
      const scrolled = yield* ctx.expectSome(
        "the scrolled list reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );
      yield* ctx.expectEqual(
        "a single 400 px scroll up unpins the reader",
        readout(ctx, "ms-pin"),
        "false",
      );
      yield* ctx.expectEqual(
        "the live anchor records the scroll",
        `${scrolled[0]},${scrolled[1]}`,
        "37,20",
      );
      yield* ctx.expectEqual(
        "the affordance is painted while unpinned",
        ctx.host.bounds("ms-jump") === null,
        false,
      );
      yield* ctx.expectEqual(
        "the old tail left the window",
        painted(ctx, 53),
        false,
      );

      // 4. An append while unpinned must not move the reader.
      ctx.host.click("ms-append");
      ctx.host.advance(50);
      const afterUnpinnedAppend = yield* ctx.expectSome(
        "the unpinned list still reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );
      yield* ctx.expectEqual(
        "the unpinned append reached React",
        readout(ctx, "ms-count"),
        "62",
      );
      yield* ctx.expectEqual(
        "an unpinned append leaves the anchor untouched",
        `${afterUnpinnedAppend[0]},${afterUnpinnedAppend[1]}`,
        "37,20",
      );
      yield* ctx.expectEqual(
        "an unpinned append increments unread",
        readout(ctx, "ms-unread"),
        "1",
      );
      yield* ctx.expectEqual(
        "the new tail is not painted",
        painted(ctx, 62),
        false,
      );

      // 5. Jump to latest re-pins and clears unread.
      ctx.host.click("ms-jump");
      ctx.host.advance(50);
      const jumped = yield* ctx.expectSome(
        "the jumped list reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );
      yield* ctx.expectEqual(
        "the jump re-pins",
        readout(ctx, "ms-pin"),
        "true",
      );
      yield* ctx.expectEqual(
        "the jump clears unread",
        readout(ctx, "ms-unread"),
        "0",
      );
      yield* ctx.expectEqual(
        "the jump lands on the new max scroll",
        `${jumped[0]},${jumped[1]}`,
        "52,0",
      );
      yield* ctx.expectEqual(
        "the jumped tail is painted",
        painted(ctx, 62),
        true,
      );
      yield* ctx.expectEqual(
        "the affordance disappears after the jump",
        ctx.host.bounds("ms-jump") === null,
        true,
      );

      // 6. A streamed last row keeps the tail visible while pinned.
      ctx.host.click("ms-stream");
      ctx.host.advance(50);
      ctx.host.click("ms-stream");
      ctx.host.advance(50);
      const streamed = yield* ctx.expectSome(
        "the streamed list reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );
      yield* ctx.expectEqual(
        "the streamed row grew",
        readout(ctx, "ms-last-height"),
        "50",
      );
      yield* ctx.expectEqual(
        "the pinned stream moves the anchor with the row",
        `${streamed[0]},${streamed[1]}`,
        "52,20",
      );
      const tail = yield* ctx.expectSome(
        "the streamed last row is painted",
        Option.fromNullishOr(ctx.host.bounds("ms-row-62")),
      );
      yield* ctx.expectNear(
        "the streamed tail stays at the viewport bottom",
        tail.y + tail.height,
        list.y + list.height,
        1,
      );
      yield* ctx.expectEqual(
        "the stream stays pinned",
        readout(ctx, "ms-pin"),
        "true",
      );

      // 7. A small scroll is still inside the pin threshold.
      ctx.host.wheel("ms-list", 0, 10);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "a 10 px scroll up stays pinned",
        readout(ctx, "ms-pin"),
        "true",
      );
      ctx.host.click("ms-append");
      ctx.host.advance(50);
      const thresholdAppend = yield* ctx.expectSome(
        "the threshold append reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );
      yield* ctx.expectEqual(
        "the threshold append reached React",
        readout(ctx, "ms-count"),
        "63",
      );
      yield* ctx.expectEqual(
        "an append inside the threshold still follows",
        `${thresholdAppend[0]},${thresholdAppend[1]}`,
        "53,20",
      );
      yield* ctx.expectEqual(
        "the threshold tail is painted",
        painted(ctx, 63),
        true,
      );

      // 8. A stream while unpinned must not move the reader.
      ctx.host.wheel("ms-list", 0, 400);
      ctx.host.advance(50);
      const beforeStream = yield* ctx.expectSome(
        "the unpinned stream reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );
      yield* ctx.expectEqual(
        "the deep scroll unpins",
        readout(ctx, "ms-pin"),
        "false",
      );
      ctx.host.click("ms-stream");
      ctx.host.advance(50);
      const afterStream = yield* ctx.expectSome(
        "the unpinned stream still reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );
      yield* ctx.expectEqual(
        "an unpinned stream leaves the anchor untouched",
        `${afterStream[0]},${afterStream[1]}`,
        `${beforeStream[0]},${beforeStream[1]}`,
      );

      // 9. A short history paints everything and offers nothing.
      ctx.host.click("ms-reset");
      ctx.host.advance(50);
      const short = yield* ctx.expectSome(
        "the short history reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("ms-list")),
      );
      yield* ctx.expectEqual(
        "the short history reached React",
        readout(ctx, "ms-count"),
        "3",
      );
      yield* ctx.expectEqual(
        "the short history is pinned",
        readout(ctx, "ms-pin"),
        "true",
      );
      yield* ctx.expectEqual(
        "the short history has nowhere to scroll",
        `${short[0]},${short[1]}`,
        "0,0",
      );
      yield* ctx.expectEqual(
        "every short-history row is painted",
        painted(ctx, 3),
        true,
      );
      yield* ctx.expectEqual(
        "the first short-history row is painted",
        painted(ctx, 1),
        true,
      );
      yield* ctx.expectEqual(
        "a short history offers no jump",
        ctx.host.bounds("ms-jump") === null,
        true,
      );
      ctx.host.click("ms-append");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the short append reached React",
        readout(ctx, "ms-count"),
        "4",
      );
      yield* ctx.expectEqual(
        "the appended short row is painted",
        painted(ctx, 4),
        true,
      );

      ctx.host.screenshot(
        "apps/playground/.artifacts/screenshots/message-scroller.png",
      );
    }),
};

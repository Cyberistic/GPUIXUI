/**
 * `tier2-scroller` — the shipped `MessageScroller` from `@gpuixui/components`,
 * mounted by a consumer and driven natively.
 *
 * `message-scroller` (plan `300`) measured the contract on a local probe built
 * over `<virtual-list>`. This scenario proves the **shipped** compound parts on
 * the consumer path: the published root import through `vendor/`, the token
 * theme, a plain scroll viewport and the tail sentinel the component uses for
 * its pin decision. Plan `581`.
 *
 * The component's own rule is what is asserted: while pinned an append or a
 * taller last row keeps the tail in view; wheeling up unpins and leaves the
 * reader's offset untouched for later arrivals; the affordance counts them;
 * activating it re-pins and returns to the tail. **Measured defect:** wheeling
 * back to the end does *not* re-pin on 0.10.0, because the component measures
 * the tail distance from the viewport's reported box and this runtime shifts
 * that box by the scroller's own offset (plan `529` §6.3). The scenario asserts
 * the measured behaviour and records the defect cross-team (`TODO.md`).
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
// Compiled by `tsconfig.vendor.json`; see the note in `tier2-dialog.tsx`.
import {
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "../../vendor/packages/components/src/index.js";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { painted, read } from "./probes.js";

const VIEWPORT = "tier2-scroller-viewport";
const JUMP = "tier2-scroller-jump";
const INITIAL = 40;
/** 40 rows of one line each overflow the 240 px viewport. */
const VIEWPORT_HEIGHT = 240;

interface Message {
  readonly id: number;
  readonly body: string;
  readonly height: number;
}

const messagesFrom = (count: number): ReadonlyArray<Message> =>
  Arr.map(Arr.range(1, count), (id) => ({
    id,
    body: `message ${id}`,
    height: 26,
  }));

/** Scroll offset of `testId`, failing with its name when it never scrolled. */
const offsetOf = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} reports a scroll offset`,
    Option.fromNullishOr(ctx.host.scrollOffset(testId)),
  );

/** Painted box of `testId`, failing with its name when it never painted. */
const boxOf = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(`${testId} is painted`, painted(ctx, testId));

/** Whether the last row's bottom sits inside the viewport (the component's rule). */
const endVisible = (row: Smoke.Bounds, viewport: Smoke.Bounds): boolean =>
  row.y + row.height <= viewport.y + viewport.height + 1;

/** The transcript body: one shipped `MessageScroller` with consumer controls. */
const ConversationProbe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [messages, setMessages] = useState<ReadonlyArray<Message>>(
    messagesFrom(INITIAL),
  );
  const [pinned, setPinned] = useState(true);

  const append = (): void =>
    setMessages((current) => [
      ...current,
      {
        id: current.length + 1,
        body: `message ${current.length + 1}`,
        height: 26,
      },
    ]);

  const stream = (): void =>
    setMessages((current) =>
      Arr.map(current, (message, index) =>
        index === current.length - 1 ? { ...message, height: 80 } : message,
      ),
    );

  return (
    <div
      testId="tier2-scroller-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Pressable testId="scroller-append" onClick={append}>
        Append message
      </Pressable>
      <Pressable testId="scroller-stream" onClick={stream}>
        Grow the last row
      </Pressable>
      <Readout testId="tier2-scroller-readout">
        {`count=${messages.length} pinned=${pinned}`}
      </Readout>
      <MessageScroller
        testId="tier2-scroller"
        label="Conversation"
        onPinnedChange={setPinned}
        style={{ width: 480 }}
      >
        <MessageScrollerViewport
          testId={VIEWPORT}
          style={{
            width: 480,
            height: VIEWPORT_HEIGHT,
            padding: theme.spacing.md,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.card,
          }}
        >
          {Arr.map(messages, (message) => (
            <MessageScrollerItem
              key={message.id}
              testId={`tier2-scroller-row-${message.id}`}
              style={{ height: message.height }}
            >
              <text style={{ color: theme.colors.foreground }}>
                {message.body}
              </text>
            </MessageScrollerItem>
          ))}
        </MessageScrollerViewport>
        <MessageScrollerJumpToLatest testId={JUMP} />
      </MessageScroller>

      {/* A short history has nothing to follow, so it must offer no affordance. */}
      <MessageScroller label="Short conversation" style={{ width: 480 }}>
        <MessageScrollerViewport
          testId="tier2-scroller-short-viewport"
          style={{ width: 480, height: VIEWPORT_HEIGHT }}
        >
          {Arr.map(Arr.range(1, 3), (id) => (
            <MessageScrollerItem key={id} testId={`tier2-scroller-short-${id}`}>
              <text style={{ color: theme.colors.foreground }}>
                {`short ${id}`}
              </text>
            </MessageScrollerItem>
          ))}
        </MessageScrollerViewport>
        <MessageScrollerJumpToLatest testId="tier2-scroller-short-jump" />
      </MessageScroller>
    </div>
  );
};

export const tier2ScrollerScenario: PlaygroundScenario = {
  id: "tier2-scroller",
  title: "Tier 2 Message scroller: pin, no yank, unread count and jump",
  capability: "tier2",
  view: () => <ConversationProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the consumer body rendered",
        ctx.host.paintedText().join("\n"),
        "Append message",
      );
      yield* ctx.expectContains(
        "the transcript starts with its history",
        read(ctx, "tier2-scroller-readout"),
        "count=40",
      );

      // 1. A fresh scroller starts at the end of its history.
      const start = yield* offsetOf(ctx, VIEWPORT);
      yield* ctx.expectEqual("the scroller starts scrolled", start.y < 0, true);
      const tail = yield* boxOf(ctx, "tier2-scroller-row-40");
      // 0.10.0 reports a scroller's own box shifted by its scroll offset
      // (plan 529 §6.3), so the frame comes from the non-scrolling root and its
      // declared height. The rows report their true screen position.
      const frame = {
        ...(yield* boxOf(ctx, "tier2-scroller")),
        height: VIEWPORT_HEIGHT,
      };
      yield* ctx.expectEqual(
        "the last row starts visible",
        endVisible(tail, frame),
        true,
      );
      yield* ctx.expectEqual(
        "a pinned reader sees no affordance",
        Option.isNone(painted(ctx, JUMP)),
        true,
      );

      // 2. An append while pinned follows the tail.
      ctx.host.click("scroller-append");
      yield* ctx.expectContains(
        "the append joined the history",
        read(ctx, "tier2-scroller-readout"),
        "count=41",
      );
      const appended = yield* boxOf(ctx, "tier2-scroller-row-41");
      yield* ctx.expectEqual(
        "a pinned append keeps the tail visible",
        endVisible(appended, frame),
        true,
      );
      yield* ctx.expectEqual(
        "a pinned append offers no affordance",
        Option.isNone(painted(ctx, JUMP)),
        true,
      );

      // 3. A taller last row (a stream) follows too, without a new child.
      ctx.host.click("scroller-stream");
      const grown = yield* boxOf(ctx, "tier2-scroller-row-41");
      yield* ctx.expectEqual(
        "the streamed row grew",
        grown.height > appended.height,
        true,
      );
      yield* ctx.expectEqual(
        "a pinned stream keeps the tail visible",
        endVisible(grown, frame),
        true,
      );

      // 4. Wheeling up unpins; the reader's offset is the reader's.
      ctx.host.wheel("tier2-scroller", 0, 120);
      const unpinned = yield* offsetOf(ctx, VIEWPORT);
      yield* ctx.expectEqual(
        "a wheel up moves toward older rows",
        unpinned.y > start.y,
        true,
      );
      yield* ctx.expectContains(
        "the consumer sees the pin change",
        read(ctx, "tier2-scroller-readout"),
        "pinned=false",
      );
      const jump = yield* boxOf(ctx, JUMP);

      // 5. An append while unpinned must not move the reader.
      ctx.host.click("scroller-append");
      yield* ctx.expectContains(
        "the unpinned append joined the history",
        read(ctx, "tier2-scroller-readout"),
        "count=42",
      );
      const afterAppend = yield* offsetOf(ctx, VIEWPORT);
      yield* ctx.expectNear(
        "an unpinned append does not yank the reader",
        afterAppend.y,
        unpinned.y,
        1,
      );
      const late = yield* boxOf(ctx, "tier2-scroller-row-42");
      yield* ctx.expectEqual(
        "the unpinned arrival stays below the viewport",
        endVisible(late, frame),
        false,
      );
      yield* ctx.expectContains(
        "the affordance counts the arrival",
        read(ctx, JUMP),
        "1 new message",
      );
      yield* ctx.expectSome("the affordance is painted", Option.some(jump));

      // 6. A second arrival counts again.
      ctx.host.click("scroller-append");
      yield* ctx.expectContains(
        "the affordance counts every arrival",
        read(ctx, JUMP),
        "2 new messages",
      );

      // 7. A streamed row below the viewport leaves the offset alone.
      ctx.host.click("scroller-stream");
      const afterStream = yield* offsetOf(ctx, VIEWPORT);
      yield* ctx.expectNear(
        "an unpinned stream leaves the reader in place",
        afterStream.y,
        unpinned.y,
        1,
      );

      // 8. Jump returns to the end, clears the count and re-pins.
      ctx.host.click(JUMP);
      const resumed = yield* offsetOf(ctx, VIEWPORT);
      yield* ctx.expectEqual(
        "jump moves the viewport to the tail",
        resumed.y < afterStream.y,
        true,
      );
      yield* ctx.expectEqual(
        "jump hides the affordance",
        Option.isNone(painted(ctx, JUMP)),
        true,
      );
      yield* ctx.expectContains(
        "jump re-pins the consumer",
        read(ctx, "tier2-scroller-readout"),
        "pinned=true",
      );
      const resumedTail = yield* boxOf(ctx, "tier2-scroller-row-43");
      yield* ctx.expectEqual(
        "the latest row is visible after jump",
        endVisible(resumedTail, frame),
        true,
      );

      // 9. Wheeling back to the end moves the offset to the bottom but — measured
      // on 0.10.0 — does **not** re-pin: the component's distance rule reads the
      // viewport's reported box, which this runtime shifts by its own scroll
      // offset (plan `529` §6.3), so the distance never falls below the
      // threshold. Recorded as a cross-team defect in `TODO.md`.
      ctx.host.wheel("tier2-scroller", 0, 120);
      yield* ctx.expectSome("the wheel unpinned again", painted(ctx, JUMP));
      ctx.host.wheel("tier2-scroller", 0, -2000);
      const endAgain = yield* offsetOf(ctx, VIEWPORT);
      yield* ctx.expectEqual(
        "the wheel reaches the bottom of the history",
        endAgain.y < afterStream.y,
        true,
      );
      yield* ctx.expectContains(
        "wheeling to the end does not re-pin on this runtime (measured defect)",
        read(ctx, "tier2-scroller-readout"),
        "pinned=false",
      );
      yield* ctx.expectSome(
        "the affordance stays painted after the reader returns to the end",
        painted(ctx, JUMP),
      );

      // 10. A short history never scrolls and never offers the control.
      const short = yield* offsetOf(ctx, "tier2-scroller-short-viewport");
      yield* ctx.expectEqual("a short history does not scroll", short.y, 0);
      yield* ctx.expectEqual(
        "a short history offers no affordance",
        Option.isNone(painted(ctx, "tier2-scroller-short-jump")),
        true,
      );
    }),
};

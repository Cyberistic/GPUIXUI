/**
 * Input/overlay probe: `preview-card` — an interactive hover card.
 *
 * A tooltip (`tooltip-open`) closes when its trigger is left and cannot be
 * clicked. A **preview card** — a hover card with a button, a navigation menu's
 * content panel, a mention list the pointer can enter — needs the opposite: the
 * pointer must reach the floating card without the trigger's leave destroying
 * it. This probe measures whether that is possible and what it costs.
 *
 * The card is a `FloatingLayer`, which renders **inside** its anchor (plan
 * `156`), so the card is a descendant of the trigger. Measured (plan `196` §7):
 *
 * - the card's enter is delivered **before** the trigger's leave, so
 *   cancelling a close on enter does not work — the leave schedules one after;
 * - a leave is delivered **per element** (the body's leave does not fire when
 *   the pointer moves from a child control to empty space), so every hoverable
 *   child of the card needs the handler;
 * - the leave payload carries **no coordinates**, so intent cannot be computed
 *   from the event; the card keeps an `inside` ref and the delayed close
 *   re-checks it when the timer fires;
 * - ancestors do receive enter/leave (`preview-root`), but a child-to-child
 *   move can leave an ancestor, so the card root is an observation, not the
 *   grace area.
 *
 * Measured facts: plan `196` §7.
 */
import { useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { FloatingLayer } from "@gpuix/react/floating";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import { awaitReadout } from "./await-readout.js";
import type { PlaygroundScenario } from "../types.js";

/** The grace period after a leave; the steps wait 300 ms on the real clock. */
const CLOSE_DELAY_MS = 200;

/** One hover event, as the readouts record it. */
type Event =
  | "trigger:enter"
  | "trigger:leave"
  | "body:enter"
  | "body:leave"
  | "action:leave";

const PreviewProbe = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [closes, setCloses] = useState(0);
  const [reason, setReason] = useState("none");
  const [prev, setPrev] = useState("none");
  const [last, setLast] = useState("none");
  const [rootIn, setRootIn] = useState(0);
  const [rootOut, setRootOut] = useState(0);
  const [actions, setActions] = useState(0);
  const [log, setLog] = useState<ReadonlyArray<string>>([]);
  const timer = useRef<Option.Option<ReturnType<typeof setTimeout>>>(
    Option.none(),
  );

  /**
   * Whether the pointer is inside the card right now.
   *
   * A ref, not state, because the timer closure must read the value at fire
   * time — the trigger's leave arrives after the card's enter, so the decision
   * cannot be made when the leave is handled.
   */
  const inside = useRef(false);

  const cancel = () =>
    Option.match(timer.current, {
      onNone: () => {},
      onSome: (handle) => {
        clearTimeout(handle);
        timer.current = Option.none();
      },
    });

  useEffect(() => () => cancel(), []);

  const record = (entry: Event, event?: { x?: number | null }) => {
    setPrev(last);
    setLast(entry);
    setLog((current) =>
      Arr.take(
        Arr.append(
          current,
          entry === "trigger:leave"
            ? `${entry}:${typeof event?.x === "number" ? "xy" : "none"}`
            : entry,
        ),
        12,
      ),
    );
  };

  const enter = (entry: Event) => {
    cancel();
    setOpen(true);
    record(entry);
  };

  const leave = (entry: Event, event?: { x?: number | null }) => {
    record(entry, event);
    cancel();
    timer.current = Option.some(
      setTimeout(() => {
        timer.current = Option.none();
        if (inside.current) return;
        setOpen(false);
        setCloses((count) => count + 1);
        setReason(
          Option.getOrElse(Arr.head(Str.split(entry, ":")), () => "none"),
        );
      }, CLOSE_DELAY_MS),
    );
  };

  return (
    <div
      style={{
        width: 720,
        height: 420,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Readout testId="preview-state">{`open=${open} closes=${closes} reason=${reason}`}</Readout>
        <Readout testId="preview-order">{`prev=${prev} last=${last}`}</Readout>
        <Readout testId="preview-root">{`in=${rootIn} out=${rootOut}`}</Readout>
        <Readout testId="preview-actions">{`actions=${actions}`}</Readout>
        <Readout testId="preview-log">{Arr.join(log, " ")}</Readout>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div
          testId="preview-trigger"
          role="button"
          aria-label="Preview trigger"
          onMouseEnter={() => enter("trigger:enter")}
          onMouseLeave={(event) => leave("trigger:leave", event)}
          style={{
            width: 160,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backgroundColor: theme.colors.muted,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>hover me</text>
          {open ? (
            <FloatingLayer side="bottom" align="start" sideOffset={8}>
              <div
                testId="preview-card"
                role="dialog"
                aria-label="Preview card"
                onMouseEnter={() => setRootIn((count) => count + 1)}
                onMouseLeave={() => setRootOut((count) => count + 1)}
                style={{
                  width: 280,
                  height: 170,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: theme.colors.popover,
                  borderWidth: theme.borderWidth.thin,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                }}
              >
                <div
                  testId="preview-card-body"
                  onMouseEnter={() => {
                    inside.current = true;
                    enter("body:enter");
                  }}
                  onMouseLeave={(event) => {
                    inside.current = false;
                    leave("body:leave", event);
                  }}
                  style={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: 8,
                  }}
                >
                  <text style={{ color: theme.colors.foreground }}>
                    Preview title
                  </text>
                  <div
                    testId="preview-card-action"
                    role="button"
                    tabIndex={0}
                    onMouseEnter={() => {
                      inside.current = true;
                    }}
                    onMouseLeave={(event) => {
                      inside.current = false;
                      leave("action:leave", event);
                    }}
                    onClick={() => setActions((count) => count + 1)}
                    style={{
                      padding: 6,
                      cursor: "pointer",
                      backgroundColor: theme.colors.muted,
                    }}
                  >
                    <text style={{ color: theme.colors.foreground }}>Open</text>
                  </div>
                </div>
              </div>
            </FloatingLayer>
          ) : null}
        </div>
        <div
          testId="preview-away"
          style={{
            width: 160,
            height: 120,
            backgroundColor: theme.colors.card,
          }}
        />
      </div>
    </div>
  );
};

export const previewScenario: PlaygroundScenario = {
  id: "preview-card",
  title: "Hover card: entering the card, the grace close and a card click",
  capability: "preview",
  view: () => <PreviewProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const read = (testId: string): string =>
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text(testId)),
          () => "none",
        );
      const focused = () =>
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        );
      const wait = Effect.gen(function* () {
        yield* Effect.sleep("300 millis");
        ctx.host.advance(0);
      });

      yield* ctx.expectContains(
        "the card starts closed",
        read("preview-state"),
        "open=false",
      );
      yield* ctx.expectEqual(
        "the closed card is not painted",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("preview-card"))),
        true,
      );

      ctx.host.hover("preview-trigger");
      yield* ctx.expectContains(
        "hovering the trigger opens the card",
        read("preview-state"),
        "open=true",
      );
      yield* ctx.expectContains(
        "the trigger enter is recorded",
        read("preview-log"),
        "trigger:enter",
      );
      yield* ctx.expectEqual(
        "hovering does not focus the trigger",
        focused(),
        "none",
      );

      ctx.host.hover("preview-card-body");
      yield* wait;
      yield* ctx.expectContains(
        "the pointer enters the card and the grace close is cancelled",
        read("preview-state"),
        "open=true",
      );
      yield* ctx.expectContains(
        "no close fired while the pointer is in the card",
        read("preview-state"),
        "closes=0",
      );
      yield* ctx.expectContains(
        "the card enter is recorded before the trigger leave",
        read("preview-order"),
        "prev=body:enter",
      );

      ctx.host.click("preview-card-action");
      yield* ctx.expectContains(
        "a card control runs while hover-opened",
        read("preview-actions"),
        "actions=1",
      );
      yield* ctx.expectContains(
        "a card click does not close it",
        read("preview-state"),
        "open=true",
      );

      ctx.host.hover("preview-away");
      yield* wait;
      yield* awaitReadout(ctx, "preview-state", "open=false");
      yield* ctx.expectContains(
        "leaving the card closes it",
        read("preview-state"),
        "open=false",
      );
      yield* ctx.expectContains(
        "one close was counted",
        read("preview-state"),
        "closes=1",
      );

      ctx.host.hover("preview-trigger");
      ctx.host.hover("preview-away");
      ctx.host.hover("preview-trigger");
      yield* wait;
      yield* ctx.expectContains(
        "a re-enter within the delay keeps the card open",
        read("preview-state"),
        "open=true",
      );
      yield* ctx.expectContains(
        "the cancelled close was not counted",
        read("preview-state"),
        "closes=1",
      );

      ctx.host.hover("preview-away");
      yield* wait;
      yield* awaitReadout(ctx, "preview-state", "open=false");
      yield* ctx.expectContains(
        "leaving the trigger closes it",
        read("preview-state"),
        "open=false",
      );
      yield* ctx.expectContains(
        "the close reason is the trigger",
        read("preview-state"),
        "reason=trigger",
      );
      yield* ctx.expectContains(
        "two closes were counted",
        read("preview-state"),
        "closes=2",
      );

      const leaveEntry = Option.getOrElse(
        Arr.findFirst(
          Str.split(read("preview-log"), " "),
          Str.startsWith("trigger:leave"),
        ),
        () => "trigger:leave:absent",
      );
      yield* ctx.expectContains(
        "the trigger leave records its coordinate shape",
        leaveEntry,
        "trigger:leave:none",
      );

      ctx.host.screenshot(
        "apps/playground/.artifacts/screenshots/preview-card.png",
      );
    }),
};

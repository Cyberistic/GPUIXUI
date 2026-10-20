/**
 * `click-routing` — which element receives a click, and what happens above it.
 *
 * Three recorded facts disagreed (plan `724`): moving the notification bell's
 * toggle to its **transparent** wrapper made the click **inert** (plan `381`),
 * a click on `<code>` reaches the viewport's `onClick` (plan `376`), and a live
 * context menu records "child bubbling" (plan `193`).
 *
 * The measured rule — see the checks below — is neither bubbling nor a
 * nearest-handler walk: **GPUI hit-testing follows paint.** Exactly one handler
 * runs, and it belongs to the painted element under the pointer:
 *
 * - a painted child with its own handler takes the click; no ancestor runs;
 * - a painted child with no handler swallows it;
 * - a **transparent** element with a handler is not a hit target, so the click
 *   falls through to the nearest painted ancestor that has one (the bell
 *   wrapper's case);
 * - a click on a non-focusable element does not move focus, and 0.10.0
 *   synthesizes no click from Enter or Space.
 *
 * Plan `734` measured the inline half that plan `724` left open:
 *
 * - an **in-flow** `<text>` is not a hit target — the click reaches the painted
 *   ancestor's handler (the shipped `Button` shape), and a focusable ancestor
 *   takes native focus;
 * - a `<text>` with its own `onClick` **is** a hit target and runs alone;
 *   painting it changes nothing (measured as a null mutation);
 * - an **absolutely positioned** `<text>` is a hit target: with no handler it
 *   swallows the click, which is why a positioned label kills a button;
 * - a `<code>` surface is not a hit target — the box behind it runs;
 * - a label inside a painted handler-less child is swallowed by that child,
 *   exactly as plan 724 measured for boxes.
 *
 * `cr-reset` remounts the counters through a `key`, so every case starts from
 * zero (a keyed remount is a real restart, plan `167`).
 */
import { useState } from "react";
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

/** The levels that own a click handler. */
const LEVELS = ["outer", "mid", "deep", "plainbox", "clear"] as const;

type Level = (typeof LEVELS)[number];

type Counts = Readonly<Record<Level, number>>;

const ZERO: Counts = {
  outer: 0,
  mid: 0,
  deep: 0,
  plainbox: 0,
  clear: 0,
};

/** `outer=0 mid=0 deep=1 plainbox=0 clear=0` — the readout's one line. */
const formatCounts = (counts: Counts): string =>
  LEVELS.map((level) => `${level}=${counts[level]}`).join(" ");

/** A counts line with exactly one handler at `level`. */
const only = (level: Level): string => formatCounts({ ...ZERO, [level]: 1 });

const NOTHING = formatCounts(ZERO);

/** The inline cases plan `724` left open: text and code inside a clickable box. */
const INLINE_LEVELS = [
  "label",
  "abs",
  "code",
  "badgebox",
  "row",
  "textbtn",
] as const;

type InlineLevel = (typeof INLINE_LEVELS)[number];

type InlineCounts = Readonly<Record<InlineLevel, number>>;

const INLINE_ZERO: InlineCounts = {
  label: 0,
  abs: 0,
  code: 0,
  badgebox: 0,
  row: 0,
  textbtn: 0,
};

/** `label=0 abs=0 code=0 badgebox=0 row=0 textbtn=0` — the inline readout. */
const formatInline = (counts: InlineCounts): string =>
  INLINE_LEVELS.map((level) => `${level}=${counts[level]}`).join(" ");

const inlineOnly = (level: InlineLevel): string =>
  formatInline({ ...INLINE_ZERO, [level]: 1 });

const INLINE_NOTHING = formatInline(INLINE_ZERO);

const ClickRoutingProbe = () => {
  const theme = useTheme();
  const [nonce, setNonce] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        testId="cr-reset"
        role="button"
        tabIndex={0}
        onClick={() => setNonce((current) => current + 1)}
        style={{ width: 80, height: 24, backgroundColor: theme.colors.muted }}
      >
        <text style={{ fontSize: 11, color: theme.colors.foreground }}>
          reset
        </text>
      </div>
      <ClickTree key={nonce} />
    </div>
  );
};

/** The counted tree; a new `key` resets every counter with the mount. */
const ClickTree = () => {
  const theme = useTheme();
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [last, setLast] = useState("none");

  const hit = (level: Level) => (): void => {
    setCounts((current) => ({ ...current, [level]: current[level] + 1 }));
    setLast(level);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        testId="cr-outer"
        tabIndex={0}
        role="group"
        aria-label="Outer"
        onClick={hit("outer")}
        style={{
          width: 320,
          height: 250,
          padding: 12,
          gap: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <text style={{ fontSize: 12, color: theme.colors.foreground }}>
          outer
        </text>
        <div
          testId="cr-mid"
          onClick={hit("mid")}
          style={{
            width: 280,
            height: 190,
            padding: 10,
            gap: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            backgroundColor: theme.colors.muted,
          }}
        >
          <div
            testId="cr-deep"
            onClick={hit("deep")}
            style={{
              width: 120,
              height: 40,
              backgroundColor: theme.colors.accent,
            }}
          />
          <div
            testId="cr-plainbox"
            onClick={hit("plainbox")}
            style={{
              width: 200,
              height: 40,
              backgroundColor: theme.colors.card,
            }}
          >
            <div
              testId="cr-plain"
              style={{
                width: 80,
                height: 20,
                backgroundColor: theme.colors.foreground,
              }}
            />
          </div>
          <div
            testId="cr-clear"
            onClick={hit("clear")}
            style={{ width: 200, height: 30 }}
          />
        </div>
      </div>
      <Readout testId="cr-counts">{formatCounts(counts)}</Readout>
      <Readout testId="cr-last">{last}</Readout>
      <InlineTree />
    </div>
  );
};

/**
 * Inline content inside a clickable box.
 *
 * Plan `724` left this unmeasured: an in-flow `<text>` label on the shipped
 * `Button` activates it, while an **absolutely positioned** label swallowed the
 * click. The cases below isolate position, element type, a painted child with no
 * handler, keyboard focus, and a `<text>` that owns its own handler.
 */
const InlineTree = () => {
  const theme = useTheme();
  const [counts, setCounts] = useState<InlineCounts>(INLINE_ZERO);
  const [last, setLast] = useState("none");

  const hit = (level: InlineLevel) => (): void => {
    setCounts((current) => ({ ...current, [level]: current[level] + 1 }));
    setLast(level);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        testId="cr-labelbox"
        onClick={hit("label")}
        style={{
          width: 220,
          height: 36,
          padding: 4,
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <text
          testId="cr-label"
          style={{ fontSize: 12, color: theme.colors.foreground }}
        >
          Label
        </text>
      </div>
      <div
        testId="cr-absbox"
        onClick={hit("abs")}
        style={{
          width: 220,
          height: 36,
          position: "relative",
          backgroundColor: theme.colors.card,
        }}
      >
        <text
          testId="cr-abs"
          style={{
            position: "absolute",
            left: 4,
            top: 10,
            fontSize: 12,
            color: theme.colors.foreground,
          }}
        >
          Absolute
        </text>
      </div>
      <div
        testId="cr-codebox"
        onClick={hit("code")}
        style={{
          width: 240,
          height: 76,
          backgroundColor: theme.colors.card,
        }}
      >
        <code testId="cr-code" language="ts" code="const x = 1" />
      </div>
      <div
        testId="cr-badgebox"
        onClick={hit("badgebox")}
        style={{
          width: 240,
          height: 44,
          padding: 8,
          backgroundColor: theme.colors.card,
        }}
      >
        <div
          testId="cr-badge"
          style={{
            width: 120,
            height: 28,
            backgroundColor: theme.colors.accent,
          }}
        >
          <text
            testId="cr-badge-label"
            style={{ fontSize: 11, color: theme.colors.foreground }}
          >
            Badge
          </text>
        </div>
      </div>
      <div
        testId="cr-row"
        tabIndex={0}
        role="button"
        aria-label="Row"
        onClick={hit("row")}
        style={{
          width: 220,
          height: 36,
          padding: 4,
          backgroundColor: theme.colors.card,
        }}
      >
        <text
          testId="cr-rowlabel"
          style={{ fontSize: 12, color: theme.colors.foreground }}
        >
          row
        </text>
      </div>
      <div
        testId="cr-textbtnbox"
        style={{
          width: 160,
          height: 28,
          backgroundColor: theme.colors.card,
        }}
      >
        <text
          testId="cr-textbtn"
          onClick={hit("textbtn")}
          style={{ fontSize: 12, color: theme.colors.foreground }}
        >
          tap
        </text>
      </div>
      <Readout testId="cr-inline-counts">{formatInline(counts)}</Readout>
      <Readout testId="cr-inline-last">{last}</Readout>
    </div>
  );
};

type SmokeContext = Parameters<PlaygroundScenario["steps"]>[0];

/** The counts line, failing by name when the view did not mount it. */
const countsOf = (ctx: SmokeContext) =>
  ctx.expectSome(
    "the counts are painted",
    Option.fromNullishOr(ctx.host.text("cr-counts")),
  );

/** The focused `testId`, or `"none"`. */
const focusedOf = (ctx: SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

/** One click, then a frame, so the commit and the next listener are settled. */
const click = (ctx: SmokeContext, testId: string) =>
  Effect.gen(function* () {
    ctx.host.click(testId);
    yield* Effect.sleep(Duration.millis(80));
    ctx.host.paint();
    yield* Effect.sleep(Duration.millis(16));
  });

/** Resets the counters through the keyed remount, then clicks `testId`. */
const caseOf = (ctx: SmokeContext, testId: string) =>
  Effect.gen(function* () {
    yield* click(ctx, "cr-reset");
    // The remount repaints before its fresh bounds are the ones a click reads.
    yield* Effect.sleep(Duration.millis(120));
    ctx.host.paint();
    yield* Effect.sleep(Duration.millis(16));
    yield* click(ctx, testId);
    return yield* countsOf(ctx);
  });

/** The inline counter line, failing by name when the view did not mount it. */
const inlineOf = (ctx: SmokeContext) =>
  ctx.expectSome(
    "the inline counts are painted",
    Option.fromNullishOr(ctx.host.text("cr-inline-counts")),
  );

/** The same reset, returning the inline counts after clicking `testId`. */
const inlineCaseOf = (ctx: SmokeContext, testId: string) =>
  Effect.gen(function* () {
    yield* click(ctx, "cr-reset");
    yield* Effect.sleep(Duration.millis(120));
    ctx.host.paint();
    yield* Effect.sleep(Duration.millis(16));
    yield* click(ctx, testId);
    return yield* inlineOf(ctx);
  });

export const clickRoutingScenario: PlaygroundScenario = {
  id: "click-routing",
  title:
    "Click routing: the painted element takes it, and nothing above it runs",
  capability: "input",
  view: () => <ClickRoutingProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const outer = yield* ctx.expectSome(
        "the outer box paints",
        Option.fromNullishOr(ctx.host.bounds("cr-outer")),
      );

      // 1. A painted child with its own handler takes the click alone.
      yield* ctx.expectEqual(
        "a painted child handles its own click and no ancestor runs",
        yield* caseOf(ctx, "cr-deep"),
        only("deep"),
      );
      yield* ctx.expectEqual(
        "the last target is the element that handled it",
        yield* ctx.expectSome(
          "the last target is painted",
          Option.fromNullishOr(ctx.host.text("cr-last")),
        ),
        "deep",
      );
      yield* ctx.expectEqual(
        "a click on a non-focusable element does not move focus",
        focusedOf(ctx),
        "cr-reset",
      );

      // 2. A painted child with no handler swallows the click.
      yield* ctx.expectEqual(
        "a painted handler-less child swallows the click",
        yield* caseOf(ctx, "cr-plain"),
        NOTHING,
      );

      // 3. A painted box with a handler takes its own click.
      yield* ctx.expectEqual(
        "a painted box handles its own click and no ancestor runs",
        yield* caseOf(ctx, "cr-plainbox"),
        only("plainbox"),
      );

      // 5. A transparent element with a handler is not a hit target: the
      //    painted ancestor takes the click (the plan-381 wrapper case).
      yield* ctx.expectEqual(
        "a transparent handler and the painted ancestor both run",
        yield* caseOf(ctx, "cr-clear"),
        formatCounts({ ...ZERO, mid: 1, clear: 1 }),
      );

      // 5. The painted middle level takes its own click.
      yield* ctx.expectEqual(
        "the painted middle level handles its own click",
        yield* caseOf(ctx, "cr-mid"),
        only("mid"),
      );

      // 6. The painted outer level's empty area.
      yield* click(ctx, "cr-reset");
      ctx.host.clickWindow(outer.x + 20, outer.y + 232);
      yield* Effect.sleep(Duration.millis(80));
      ctx.host.paint();
      yield* ctx.expectEqual(
        "the outer empty area clicks outer alone",
        yield* countsOf(ctx),
        only("outer"),
      );

      // 7. Enter and Space synthesize no click.
      yield* click(ctx, "cr-reset");
      ctx.host.keyDown("cr-outer", "enter");
      ctx.host.keyUp("cr-outer", "enter");
      ctx.host.keyDown("cr-outer", "space");
      ctx.host.keyUp("cr-outer", "space");
      yield* Effect.sleep(Duration.millis(80));
      ctx.host.paint();
      yield* ctx.expectEqual(
        "neither Enter nor Space synthesizes a click",
        yield* countsOf(ctx),
        NOTHING,
      );

      // 8. Inline content: plan 724 left text and `<code>` unmeasured.
      yield* ctx.expectEqual(
        "an in-flow label inside a handler box routes to the box",
        yield* inlineCaseOf(ctx, "cr-label"),
        inlineOnly("label"),
      );
      yield* ctx.expectEqual(
        "the inline last target is the box that ran",
        yield* ctx.expectSome(
          "the inline last target is painted",
          Option.fromNullishOr(ctx.host.text("cr-inline-last")),
        ),
        "label",
      );
      yield* ctx.expectEqual(
        "an absolutely positioned label does not reach its handler box",
        yield* inlineCaseOf(ctx, "cr-abs"),
        INLINE_NOTHING,
      );
      yield* ctx.expectEqual(
        "a code surface inside a handler box routes to the box",
        yield* inlineCaseOf(ctx, "cr-code"),
        inlineOnly("code"),
      );
      yield* ctx.expectEqual(
        "a label inside a painted handler-less child is swallowed",
        yield* inlineCaseOf(ctx, "cr-badge-label"),
        INLINE_NOTHING,
      );
      yield* ctx.expectEqual(
        "a label inside a focusable clickable row routes to the row",
        yield* inlineCaseOf(ctx, "cr-rowlabel"),
        inlineOnly("row"),
      );
      yield* ctx.expectEqual(
        "a label inside a focusable clickable row focuses the row",
        focusedOf(ctx),
        "cr-row",
      );
      yield* ctx.expectEqual(
        "a text element can own a click handler",
        yield* inlineCaseOf(ctx, "cr-textbtn"),
        inlineOnly("textbtn"),
      );
    }),
};

/**
 * `tab-strip-overflow` — the first x-axis measurement in the suite.
 *
 * Every scroll claim so far is vertical. A tab strip, a wide data grid and
 * `<code>` all need the other axis, and a Tabs component needs two things a
 * vertical probe cannot answer: does `overflowX: "scroll"` pan, and does
 * `scrollIntoView` reveal a tab that starts outside the viewport?
 *
 * The strip is the component a Tabs implementation would ship: ten 72 px tabs
 * in a 300 px scroller, click to select, arrows/Home/End to move selection and
 * native focus, and a component-owned reveal. The steps read the runtime's own
 * scroll offset, bounds and focus; only the wheel axes come from the view's
 * readout, because the host does not expose `onScroll` otherwise.
 *
 * Measured facts: plan `173` §8.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const TABS = 10;
const TAB_WIDTH = 72;
const STRIP_WIDTH = 300;
const STRIP_PADDING = 4;
const GAP = 4;

type Registry = Record<string, PublicInstance | null>;

/** Parses the readout's `active=<n>`; a missing readout is `-1`, never a guess. */
const activeTab = (ctx: Smoke.SmokeContext): number =>
  Option.getOrElse(
    Option.map(Option.fromNullishOr(ctx.host.text("tab-active")), (readout) =>
      Number.parseInt(readout.slice("active=".length), 10),
    ),
    () => -1,
  );

/** The strip's painted offset on each axis; a missing container is `0`. */
const offset = (ctx: Smoke.SmokeContext, axis: "x" | "y"): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.scrollOffset("tab-strip")),
      (value) => value[axis],
    ),
    () => 0,
  );

/** 0.10.0 reports a content origin and a borderless size (plan 529 §6.3), so a
 * tab revealed against the strip's inner box can report 1 px past its edge. */
const insideStrip = (bounds: Smoke.Bounds, strip: Smoke.Bounds): boolean =>
  bounds.x >= strip.x - 1 && bounds.x <= strip.x + strip.width + 1;

const TabOverflowProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const strip = useRef<PublicInstance | null>(null);
  const tabs = useRef<Registry>({});
  const [active, setActive] = useState(0);
  const [wheel, setWheel] = useState({ dx: 0, dy: 0 });

  /** Selects, focuses and reveals `index` — the contract a Tabs strip needs. */
  const select = (index: number) => {
    setActive(index);
    const tab = tabs.current[String(index)];
    Option.match(Option.fromNullishOr(tab?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
    tab?.scrollIntoView?.();
  };

  const step = (event: { key?: string }, index: number) => {
    if (event.key === "right") return select(Math.min(index + 1, TABS - 1));
    if (event.key === "left") return select(Math.max(index - 1, 0));
    if (event.key === "home") return select(0);
    if (event.key === "end") return select(TABS - 1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        ref={strip}
        testId="tab-strip"
        style={{
          width: STRIP_WIDTH,
          padding: STRIP_PADDING,
          display: "flex",
          gap: GAP,
          overflowX: "scroll",
          overflowY: "hidden",
          backgroundColor: theme.colors.muted,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
        onScroll={(event) =>
          setWheel((current) => ({
            dx: current.dx + (event.deltaX ?? 0),
            dy: current.dy + (event.deltaY ?? 0),
          }))
        }
      >
        {Arr.map(Arr.range(0, TABS - 1), (index) => (
          <div
            key={index}
            ref={(instance) => {
              tabs.current[String(index)] = instance;
            }}
            testId={`tab-${index}`}
            role="tab"
            aria-selected={active === index}
            tabIndex={0}
            onClick={() => select(index)}
            onKeyDown={(event) => step(event, index)}
            style={{
              width: TAB_WIDTH,
              height: 32,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.sm,
              cursor: "pointer",
              backgroundColor:
                active === index ? theme.colors.card : theme.colors.background,
              hover: { backgroundColor: theme.colors.card },
            }}
          >
            <text style={{ color: theme.colors.foreground }}>
              {`tab ${index}`}
            </text>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Readout testId="tab-active">{`active=${active}`}</Readout>
        <Readout testId="tab-wheel">{`dx=${wheel.dx} dy=${wheel.dy}`}</Readout>
        <Pressable
          testId="tab-pan-end"
          onClick={() =>
            Option.match(Option.fromNullishOr(strip.current?.id), {
              onNone: () => {},
              onSome: (id) => renderer?.scrollTo?.(id, -400, 0),
            })
          }
        >
          <text>pan to -400</text>
        </Pressable>
        <Pressable
          testId="tab-reveal-last"
          onClick={() => tabs.current[String(TABS - 1)]?.scrollIntoView?.()}
        >
          <text>reveal last</text>
        </Pressable>
      </div>
    </div>
  );
};

export const tabOverflowScenario: PlaygroundScenario = {
  id: "tab-strip-overflow",
  title: "Scroll: horizontal pan, tab-strip overflow and reveal",
  capability: "scroll",
  view: () => <TabOverflowProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const strip = yield* ctx.expectSome(
        "the strip paints",
        Option.fromNullishOr(ctx.host.bounds("tab-strip")),
      );

      yield* ctx.expectEqual(
        "the strip starts at the left",
        offset(ctx, "x"),
        0,
      );
      yield* ctx.expectEqual(
        "the strip starts at the top",
        offset(ctx, "y"),
        0,
      );

      const first = yield* ctx.expectSome(
        "the first tab paints",
        Option.fromNullishOr(ctx.host.bounds("tab-0")),
      );
      yield* ctx.expectEqual(
        "the first tab starts inside the strip",
        insideStrip(first, strip),
        true,
      );

      // Whether a clipped child keeps bounds or is dropped from the tree is
      // itself the measurement; `lastPosition` puts the answer in the report.
      const last = Option.fromNullishOr(ctx.host.bounds("tab-9"));
      const lastPosition = Option.match(last, {
        onNone: () => "absent from the painted tree",
        onSome: (bounds) => `painted at x=${Math.round(bounds.x)}`,
      });
      yield* ctx.expectEqual(
        `the last tab is outside the viewport (${lastPosition})`,
        Option.match(last, {
          onNone: () => true,
          onSome: (bounds) =>
            bounds.x >= strip.x + strip.width - 1 ||
            bounds.x + bounds.width <= strip.x + 1,
        }),
        true,
      );

      ctx.host.wheel("tab-strip", -240, 0);
      const afterWheel = offset(ctx, "x");
      yield* ctx.expectNear(
        `a horizontal wheel pans right (x=${afterWheel})`,
        afterWheel,
        -240,
        12,
      );
      yield* ctx.expectEqual(
        "a horizontal wheel leaves y alone",
        offset(ctx, "y"),
        0,
      );
      yield* ctx.expectEqual(
        "the horizontal wheel moved past one tab",
        afterWheel < -TAB_WIDTH,
        true,
      );

      const wheelReadout = yield* ctx.expectSome(
        "onScroll reports the wheel axes",
        Option.fromNullishOr(ctx.host.text("tab-wheel")),
      );
      yield* ctx.expectEqual(
        "onScroll carries deltaX",
        wheelReadout === "dx=0 dy=0",
        false,
      );

      const panned = offset(ctx, "x");
      ctx.host.wheel("tab-strip", 0, -240);
      yield* ctx.expectEqual(
        `a vertical wheel does not pan the strip (x=${offset(ctx, "x")})`,
        offset(ctx, "x"),
        panned,
      );
      yield* ctx.expectEqual(
        "a vertical wheel leaves y at zero",
        offset(ctx, "y"),
        0,
      );

      ctx.host.scrollIntoView("tab-9");
      const revealX = offset(ctx, "x");
      yield* ctx.expectEqual(
        `scrollIntoView pans further left (x=${revealX})`,
        revealX < panned,
        true,
      );
      const revealed = yield* ctx.expectSome(
        "the revealed last tab paints",
        Option.fromNullishOr(ctx.host.bounds("tab-9")),
      );
      yield* ctx.expectEqual(
        `the revealed last tab is inside the strip (x=${revealed.x} strip=${strip.x}..${strip.x + strip.width} revealX=${revealX})`,
        insideStrip(revealed, strip),
        true,
      );

      // The reveal stops with the last tab at the viewport's edge (its reported
      // box starts 1 px past it) — a rounding of the strip's own padding, not a
      // reserved scrollbar: plan `801` measured that 0.10.0 reserves no gutter
      // and paints no thumb. The neighbour is the one the reader can click
      // (plan 529 §6.3).
      ctx.host.click("tab-8");
      yield* ctx.expectEqual("a revealed tab is clickable", activeTab(ctx), 8);
      const focused = yield* ctx.expectSome(
        "the click focused a tab",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "the click focused the revealed tab",
        focused,
        "tab-8",
      );

      ctx.host.scrollIntoView("tab-0");
      ctx.host.click("tab-0");
      yield* ctx.expectEqual(
        "the first tab is selected again",
        activeTab(ctx),
        0,
      );

      ctx.host.key("end");
      yield* ctx.expectEqual(
        "End selects the last tab",
        activeTab(ctx),
        TABS - 1,
      );
      const keyboardFocus = yield* ctx.expectSome(
        "the keyboard move focused a tab",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "the keyboard move focuses the last tab",
        keyboardFocus,
        "tab-9",
      );
      const keyboardReveal = yield* ctx.expectSome(
        "the keyboard-revealed tab paints",
        Option.fromNullishOr(ctx.host.bounds("tab-9")),
      );
      yield* ctx.expectEqual(
        "the keyboard reveal puts the last tab inside the strip",
        insideStrip(keyboardReveal, strip),
        true,
      );

      ctx.host.click("tab-pan-end");
      const exactPan = offset(ctx, "x");
      yield* ctx.expectNear(
        `component code pans to an exact offset (x=${exactPan})`,
        exactPan,
        -400,
        2,
      );
      ctx.host.scrollIntoView("tab-0");
      const back = yield* ctx.expectSome(
        "the first tab paints after the return",
        Option.fromNullishOr(ctx.host.bounds("tab-0")),
      );
      // The runtime clamps the near end a few pixels short of zero (plan 173
      // measured -5); the first tab is back within one tab of the origin
      // (plan 529 §6.3).
      yield* ctx.expectEqual(
        "scrollIntoView returns to the first tab",
        back.x >= strip.x - TAB_WIDTH,
        true,
      );
      yield* ctx.expectEqual(
        `the return offset is at the start (x=${offset(ctx, "x")})`,
        offset(ctx, "x") > -TAB_WIDTH,
        true,
      );
    }),
};

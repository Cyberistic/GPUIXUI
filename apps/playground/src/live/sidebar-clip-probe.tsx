/**
 * The `sidebar-clip-lifecycle` probe: does a collapsing sidebar's **outer
 * clipping box** hide its content in the paint and in the hit test, or only in
 * the layout report?
 *
 * Tier 4's *Collapsible sidebars* row names the mechanism — `motion` width on an
 * outer clipping container rather than an inner reflow — and the evidence behind
 * it is layout arithmetic: `motion-geometry` sampled a raw box's size and
 * `docking-nested` collapsed a caller-owned width to 0. A layout read cannot
 * answer the question, because a clipped child still **reports** its full box
 * (`dock-focus-lifecycle` measured a control keeping its 12pt box inside a
 * zero-width parent). The paint is what a sidebar depends on: a 120pt sidebar
 * that still paints its 240pt content covers the document it is collapsing next
 * to, and if the hit test follows the paint, every control in the hidden half
 * keeps taking presses from the pane beside it.
 *
 * The fixture: a fixed 240pt content (a 200pt spacer then a 40pt **marker**)
 * inside a width-tweened box, beside a document pane. The document is an
 * **absolutely positioned** pane painted *before* the sidebar and filling the
 * row, so the sidebar's overflow would land on top of it. That is what makes the
 * negative control honest: with the row laid out document-after-sidebar, an
 * overflowing marker is simply covered by the next sibling's opaque fill — the
 * probe would pass with no clipping at all. Here the marker can only be invisible
 * because the clip hides it.
 *
 * The travelling frame is found on the renderer's **motion clock**: frozen
 * before the press, stepped until the sidebar sits below the marker's start,
 * then captured. `duration` is seconds in the runtime's grammar, but the probe
 * **finds** a frame rather than assuming an offset from the number.
 */
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { motion, useWindowSize } from "@gpuix/react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import { Pressable, Readout } from "../ui.js";
import { countPaint, isColour } from "./box-paint.js";
import { captureScale, colourAt } from "./frame.js";
import { settleNumber, settleUntil } from "./settle.js";
import {
  SIDEBAR_CONTENT_WIDTH,
  SIDEBAR_FILLS,
  SIDEBAR_IDS,
  SIDEBAR_MARKER_WIDTH,
  SIDEBAR_MARKER_X,
  SIDEBAR_MID_MAX,
  SIDEBAR_REST,
  SIDEBAR_ROW_HEIGHT,
  SIDEBAR_STEPS,
  SIDEBAR_STEP_MS,
  SIDEBAR_TWEEN,
  SIDEBAR_WIDTHS,
  hiddenMarkerBand,
  insideClipPoint,
  isTravelling,
  markerBand,
  outsideClipPoint,
  sidebarReadout,
  type SidebarBox,
} from "./sidebar-clip.js";

/** The margin a sample keeps from the clip's edge. */
const SAMPLE_MARGIN = 6;

/** The captures a reader can look at, one per measured state. */
const OPEN = "sidebar-open";
const MID = "sidebar-mid";
const CLOSED = "sidebar-closed";
const AGAIN = "sidebar-again";

/** The view: one clipping sidebar over one document pane. */
export const SidebarClipProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [open, setOpen] = useState(true);
  const [markerPresses, setMarkerPresses] = useState(0);
  const [mainPresses, setMainPresses] = useState(0);
  const rowWidth = window.width - theme.spacing.xl * 2;
  const row = {
    position: "relative" as const,
    width: rowWidth,
    height: SIDEBAR_ROW_HEIGHT,
    display: "flex" as const,
    flexDirection: "row" as const,
  };
  /** The document is painted first and fills the row, so overflow lands on it. */
  const document = {
    position: "absolute" as const,
    left: 0,
    top: 0,
    width: rowWidth,
    height: SIDEBAR_ROW_HEIGHT,
    backgroundColor: SIDEBAR_FILLS.main,
  };
  /** The fixed content, so a clip hides it instead of reflowing it. */
  const content = {
    width: SIDEBAR_CONTENT_WIDTH,
    height: SIDEBAR_ROW_HEIGHT,
    flexShrink: 0,
    display: "flex" as const,
    flexDirection: "row" as const,
    backgroundColor: SIDEBAR_FILLS.content,
  };
  const label = open ? "Collapse the sidebar" : "Expand the sidebar";
  return (
    <div
      testId={SIDEBAR_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        A collapsible sidebar is an outer clipping box: does the width tween
        hide its content in the paint and in the press, or only re-lay it out?
        The red marker sits at the content&apos;s trailing edge, over the
        document at every width below 200.
      </text>
      <div testId={SIDEBAR_IDS.row} style={row}>
        <div
          testId={SIDEBAR_IDS.main}
          onClick={() => setMainPresses((count) => count + 1)}
          style={document}
        />
        {/* The wrapper shrink-wraps the animated box, so its own box is the
            animated width; `motion.div` takes no `testId`. */}
        <div
          testId={SIDEBAR_IDS.clip}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <motion.div
            initial={{ width: SIDEBAR_WIDTHS.open }}
            animate={{
              width: open ? SIDEBAR_WIDTHS.open : SIDEBAR_WIDTHS.closed,
            }}
            transition={SIDEBAR_TWEEN}
            style={{
              height: SIDEBAR_ROW_HEIGHT,
              overflow: "hidden",
              display: "flex",
              flexDirection: "row",
            }}
          >
            <div testId={SIDEBAR_IDS.content} style={content}>
              <div
                style={{
                  width: SIDEBAR_MARKER_X,
                  height: SIDEBAR_ROW_HEIGHT,
                  flexShrink: 0,
                }}
              />
              <div
                testId={SIDEBAR_IDS.marker}
                onClick={() => setMarkerPresses((count) => count + 1)}
                style={{
                  width: SIDEBAR_MARKER_WIDTH,
                  height: SIDEBAR_ROW_HEIGHT,
                  flexShrink: 0,
                  backgroundColor: SIDEBAR_FILLS.marker,
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
      <Pressable
        testId={SIDEBAR_IDS.toggle}
        onClick={() => setOpen((current) => !current)}
      >
        <text
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.foreground,
          }}
        >
          {label}
        </text>
      </Pressable>
      <Readout testId={SIDEBAR_IDS.readout}>
        {sidebarReadout({ open, markerPresses, mainPresses })}
      </Readout>
    </div>
  );
};

/** The probe's steps: open, a frozen tween, the travelling frame, closed. */
export const sidebarClipSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(SIDEBAR_IDS.toggle);
    // A previous probe's screenshot stalls the animation clock, so the window is
    // settled before the first press — the rule `motion-geometry` records.
    yield* Effect.sleep(Duration.millis(600));

    /** The box `testId` paints, failing by name when it paints nothing. */
    const box = (
      testId: string,
    ): Effect.Effect<
      SidebarBox,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `the runtime paints ${testId}`,
          Option.fromNullishOr(yield* ctx.host.bounds(testId)),
        );
      });

    // The row never moves, so its left edge is read once; the search below then
    // polls one box and asserts nothing until it has a frame to measure.
    const row = yield* box(SIDEBAR_IDS.row);

    /**
     * The clip's width, read from the wrapper that shrink-wraps the animated
     * box. It is the one box that follows the tween without the content
     * reporting the clip's own limit.
     */
    const widthNow = (): Effect.Effect<number, Smoke.SmokeHostError> =>
      Effect.map(
        Effect.map(ctx.host.bounds(SIDEBAR_IDS.clip), Option.fromNullishOr),
        Option.match({
          onNone: () => Number.NaN,
          onSome: (clip) => clip.width,
        }),
      );

    /** The readout once it names `expected`, which a press reports by a frame. */
    const expectState = (
      label: string,
      expected: string,
    ): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
      Effect.gen(function* () {
        yield* ctx.expectContains(
          `${label} reports its state`,
          yield* settleUntil(ctx.host.text(SIDEBAR_IDS.readout), (line) =>
            line.includes(expected),
          ),
          expected,
        );
      });

    /** Captures `name` and hands back the frame with its device scale. */
    const captureFrame = (
      name: string,
    ): Effect.Effect<
      { readonly frame: Pixels.Pixels; readonly scale: number },
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        yield* ctx.host.capture(name);
        const frame = yield* ctx.host.pixels(name);
        const size = yield* ctx.host.windowSize();
        const scale = yield* ctx.expectSome(
          `the ${name} capture is the window at a whole device scale`,
          captureScale(frame, size),
        );
        return { frame, scale };
      });

    /** A logical point's exact colour, failing by name when it lies outside. */
    const sample = (
      frame: Pixels.Pixels,
      scale: number,
      point: { readonly x: number; readonly y: number },
      label: string,
    ): Effect.Effect<
      Pixels.Rgba,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > => ctx.expectSome(label, colourAt(frame, point, scale));

    /** How many pixels of the marker paint inside `region`. */
    const markerPaint = (
      frame: Pixels.Pixels,
      scale: number,
      region: SidebarBox,
    ): Effect.Effect<
      number,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      ctx.expectSome(
        "the marker's crop lies inside the capture",
        countPaint(frame, region, scale, SIDEBAR_FILLS.marker),
      );

    /** The point at the marker's own centre, over a given clip edge. */
    const markerCentre = (): { readonly x: number; readonly y: number } => ({
      x: row.x + SIDEBAR_MARKER_X + SIDEBAR_MARKER_WIDTH / 2,
      y: row.y + SIDEBAR_ROW_HEIGHT / 2,
    });

    // ── Open: the control the hidden band is read against ────────────────────
    yield* ctx.expectNear(
      "the sidebar rests on the open width",
      yield* settleNumber(widthNow()),
      SIDEBAR_WIDTHS.open,
      1,
    );
    yield* ctx.expectNear(
      "the content keeps the width the caller declared",
      (yield* box(SIDEBAR_IDS.content)).width,
      SIDEBAR_CONTENT_WIDTH,
      1,
    );
    const openFrame = yield* captureFrame(OPEN);
    yield* ctx.expectEqual(
      "the marker paints its own colour at its centre while the clip covers it",
      isColour(
        yield* sample(
          openFrame.frame,
          openFrame.scale,
          markerCentre(),
          "the marker's centre lies inside the open capture",
        ),
        SIDEBAR_FILLS.marker,
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the marker's whole band paints while the clip covers it",
      (yield* markerPaint(openFrame.frame, openFrame.scale, markerBand(row))) >
        0,
      true,
    );
    yield* ctx.expectEqual(
      "the document pane paints its own fill beside the sidebar",
      isColour(
        yield* sample(
          openFrame.frame,
          openFrame.scale,
          {
            x: row.x + SIDEBAR_WIDTHS.open + 40,
            y: row.y + SIDEBAR_ROW_HEIGHT / 2,
          },
          "the document lies inside the open capture",
        ),
        SIDEBAR_FILLS.main,
      ),
      true,
    );
    yield* expectState("the open sidebar", sidebarReadout(SIDEBAR_REST));
    const toggle = yield* box(SIDEBAR_IDS.toggle);
    yield* ctx.expectEqual(
      "the toggle paints a box of its own",
      toggle.width > 0 && toggle.height > 0,
      true,
    );

    // ── The tween, on the renderer's motion clock ────────────────────────────
    const pauseClock = yield* ctx.expectSome(
      "the window exposes a motion clock",
      Option.fromNullishOr(ctx.host.clockPause),
    );
    const fastForward = yield* ctx.expectSome(
      "the clock can be advanced",
      Option.fromNullishOr(ctx.host.clockFastForward),
    );
    const resumeClock = yield* ctx.expectSome(
      "the clock can be resumed",
      Option.fromNullishOr(ctx.host.clockResume),
    );
    yield* pauseClock();
    yield* ctx.host.click(SIDEBAR_IDS.toggle);
    yield* expectState(
      "the collapsed sidebar",
      sidebarReadout({ ...SIDEBAR_REST, open: false }),
    );
    // The clock is frozen, so the press changes the target and not the frame:
    // a width that moved here would be a tween no clock controls.
    yield* ctx.expectNear(
      "a frozen clock leaves the tween at the width it started from",
      yield* widthNow(),
      SIDEBAR_WIDTHS.open,
      1,
    );

    /** Steps the frozen clock until a frame lies below the marker's start. */
    const travel = (
      left: number,
    ): Effect.Effect<number, Smoke.SmokeHostError> =>
      Effect.gen(function* () {
        const width = yield* widthNow();
        const sampled = isTravelling(width) && width <= SIDEBAR_MID_MAX;
        if (sampled || left <= 0) return width;
        yield* fastForward(SIDEBAR_STEP_MS);
        return yield* travel(left - 1);
      });
    const midWidth = yield* travel(SIDEBAR_STEPS);
    yield* ctx.expectEqual(
      "the tween paints a frame narrow enough that the clip hides the marker",
      isTravelling(midWidth) && midWidth <= SIDEBAR_MID_MAX,
      true,
    );
    yield* ctx.expectNear(
      "the content keeps its declared width while the clip is smaller",
      (yield* box(SIDEBAR_IDS.content)).width,
      SIDEBAR_CONTENT_WIDTH,
      1,
    );
    const midFrame = yield* captureFrame(MID);
    const midEdge = row.x + midWidth;
    yield* ctx.expectEqual(
      "the band the clip hides paints none of the marker over the document",
      yield* markerPaint(
        midFrame.frame,
        midFrame.scale,
        hiddenMarkerBand(row, midEdge),
      ),
      0,
    );
    yield* ctx.expectEqual(
      "the content fills the part of the clip it still occupies",
      isColour(
        yield* sample(
          midFrame.frame,
          midFrame.scale,
          insideClipPoint(midEdge, SAMPLE_MARGIN, row.y),
          "a point inside the travelling clip lies in the capture",
        ),
        SIDEBAR_FILLS.content,
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the document starts where the clip ends",
      isColour(
        yield* sample(
          midFrame.frame,
          midFrame.scale,
          outsideClipPoint(midEdge, SAMPLE_MARGIN, row.y),
          "a point just past the travelling clip lies in the capture",
        ),
        SIDEBAR_FILLS.main,
      ),
      true,
    );
    // A press aimed at the marker's centre is a press over the document at this
    // width: the hit test either follows the paint or it does not.
    yield* ctx.host.click(SIDEBAR_IDS.marker);
    yield* expectState(
      "a press at the clipped marker",
      sidebarReadout({ open: false, markerPresses: 0, mainPresses: 1 }),
    );

    // ── Closed: the width the row is left with ───────────────────────────────
    yield* resumeClock();
    const closedWidth = yield* settleNumber(widthNow());
    yield* ctx.expectNear(
      "the collapsed sidebar leaves the document the whole row",
      closedWidth,
      SIDEBAR_WIDTHS.closed,
      1,
    );
    yield* ctx.expectNear(
      "the content keeps its declared width while the sidebar is closed",
      (yield* box(SIDEBAR_IDS.content)).width,
      SIDEBAR_CONTENT_WIDTH,
      1,
    );
    const closedFrame = yield* captureFrame(CLOSED);
    yield* ctx.expectEqual(
      "a closed sidebar paints no marker over the document",
      yield* markerPaint(
        closedFrame.frame,
        closedFrame.scale,
        hiddenMarkerBand(row, row.x + closedWidth),
      ),
      0,
    );
    yield* ctx.expectEqual(
      "the marker's old place is the document's fill",
      isColour(
        yield* sample(
          closedFrame.frame,
          closedFrame.scale,
          markerCentre(),
          "the marker's centre lies inside the closed capture",
        ),
        SIDEBAR_FILLS.main,
      ),
      true,
    );
    yield* ctx.host.click(SIDEBAR_IDS.marker);
    yield* expectState(
      "a press at a closed sidebar",
      sidebarReadout({ open: false, markerPresses: 0, mainPresses: 2 }),
    );

    // ── Reopened: the box returns, and the marker answers its own press ──────
    yield* ctx.host.click(SIDEBAR_IDS.toggle);
    yield* expectState(
      "the reopened sidebar",
      sidebarReadout({ open: true, markerPresses: 0, mainPresses: 2 }),
    );
    yield* ctx.expectNear(
      "the reopened sidebar holds the width it collapsed from",
      yield* settleNumber(widthNow()),
      SIDEBAR_WIDTHS.open,
      1,
    );
    const againFrame = yield* captureFrame(AGAIN);
    yield* ctx.expectEqual(
      "the marker paints again once the clip covers it",
      isColour(
        yield* sample(
          againFrame.frame,
          againFrame.scale,
          markerCentre(),
          "the marker's centre lies inside the reopened capture",
        ),
        SIDEBAR_FILLS.marker,
      ),
      true,
    );
    yield* ctx.host.click(SIDEBAR_IDS.marker);
    yield* expectState(
      "a press at a visible marker",
      sidebarReadout({ open: true, markerPresses: 1, mainPresses: 2 }),
    );
    yield* ctx.expectNear(
      "the content still holds its declared width after the round trip",
      (yield* box(SIDEBAR_IDS.content)).width,
      SIDEBAR_CONTENT_WIDTH,
      1,
    );
  });

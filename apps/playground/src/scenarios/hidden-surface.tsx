/**
 * `hidden-surface` / `live-hidden-surface`: the recipe a tabbed pane, a
 * carousel slide and a multi-step form copy, measured in the frame.
 *
 * `workspace-panes` (plan `177`) states it in **text and geometry**: an
 * inactive surface stays mounted in an absolute slot with
 * `visibility: "hidden"` plus `pointerEvents: "none"`, and `display: "none"` is
 * a no-op. It never isolates the two mechanisms, and `getPaintedText` cannot
 * see a fill — so a hidden pane that still paints its background, or one that
 * still takes the press with `pointerEvents` dropped, passes every check.
 *
 * This probe isolates all four facts: a `display: "none"` fill (measured on
 * paint, not text), a hidden fill (paint gone, box and space kept), each
 * mechanism on its own hit path, and the full recipe across a switch (paint
 * moves, the hidden pane's press falls through, its draft survives). Two
 * decoded frames per host, plus a third after the switch back.
 *
 * The recipe itself is `hiddenSlot`/`slotProblems` in `hidden-slot.ts`; the
 * capture and scale chain is `frames.ts`.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useState, type ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import { Pressable, Readout } from "../ui.js";
import {
  TOLERANCE,
  captureHeadless,
  captureLive,
  expectColour,
  expectPixel,
  paintedBox,
  parseColour,
  pixelAtPoint,
  readAsync,
  readSync,
  type FrameReader,
} from "./frames.js";
import { hiddenSlot, slotProblems } from "./hidden-slot.js";

const STAGE_WIDTH = 640;
const STAGE_HEIGHT = 500;
const ROW_ONE = 40;
const ROW_TWO = 130;
const ROW_THREE = 230;
const HIT_READOUT = 300;
const TABS = 340;
const SLOTS = 380;
const BOX = 64;
const HALF = 140;
const HIT_WIDTH = 180;
const SLOT_WIDTH = 400;
const SLOT_HEIGHT = 100;
const TAB_WIDTH = 80;
const TAB_HEIGHT = 28;

/** The slot sample: bottom-right, away from both panes' children. */
const SLOT_SAMPLE = { x: 320, y: 80 } as const;

/**
 * What a press on a `visibility: "hidden"` overlay does, measured by this probe.
 *
 * `none` means the invisible overlay still **blocks** the hitbox but its own
 * handler never runs, so neither layer takes the press — which is exactly why
 * the recipe needs `pointerEvents: "none"`, and why "hidden" alone is not
 * "click-through". `base` would instead mean visibility removes the hitbox too
 * and `pointerEvents` is stated intent, like the toast card's redundant
 * `pointerEvents: "auto"` (plan `623`).
 */
const HIT_UNDER_VISIBILITY_ONLY = "none" as const;

const boxStyle = (left: number, top: number, width: number, fill: string) => ({
  position: "absolute" as const,
  left,
  top,
  width,
  height: BOX,
  backgroundColor: fill,
});

const fillStyle = (fill: string) => ({
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: fill,
});

/** Pane A owns its own hit count, so a remount would lose it. */
const PaneA = ({ active }: { readonly active: boolean }) => {
  const theme = useTheme();
  const [hits, setHits] = useState(0);
  return (
    <div
      testId="hs-pane-a"
      style={{
        ...hiddenSlot(active),
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: 8,
        backgroundColor: theme.colors.card,
      }}
    >
      <Pressable
        testId="hs-a-action"
        onClick={() => setHits((previous) => previous + 1)}
        style={{ width: 120, height: 32 }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.cardForeground,
          }}
        >
          A action
        </text>
      </Pressable>
      <Readout testId="hs-a-hits">hits={hits}</Readout>
      <Readout testId="hs-a-marker">pane-a-marker</Readout>
    </div>
  );
};

/** Pane B owns its own draft, so a remount would lose it. */
const PaneB = ({ active }: { readonly active: boolean }) => {
  const theme = useTheme();
  const [draft, setDraft] = useState("");
  return (
    <div
      testId="hs-pane-b"
      style={{
        ...hiddenSlot(active),
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: 8,
        backgroundColor: theme.colors.popover,
      }}
    >
      <input
        testId="hs-b-input"
        value={draft}
        aria-label="draft"
        placeholder="draft"
        onChange={(event) => setDraft(event.value ?? "")}
        style={{
          color: theme.colors.inputForeground,
          backgroundColor: theme.colors.input,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 4,
        }}
      />
      <Readout testId="hs-b-draft">draft={draft}</Readout>
      <Readout testId="hs-b-marker">pane-b-marker</Readout>
    </div>
  );
};

const HiddenSurfaceProbe = () => {
  const theme = useTheme();
  const [active, setActive] = useState<"a" | "b">("b");
  const [hit, setHit] = useState("none");
  return (
    <div
      testId="hs-stage"
      style={{
        position: "relative",
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="hs-display"
        style={{
          ...boxStyle(ROW_ONE, ROW_ONE, HALF, theme.colors.card),
          display: "none",
        }}
      />
      <div
        testId="hs-row"
        style={{
          position: "absolute",
          left: 40,
          top: ROW_TWO,
          width: HALF * 2,
          height: BOX,
          display: "flex",
        }}
      >
        <div
          testId="hs-hidden"
          style={{
            width: HALF,
            height: BOX,
            backgroundColor: theme.colors.card,
            visibility: "hidden",
          }}
        />
        <div
          testId="hs-after"
          style={{
            width: HALF,
            height: BOX,
            backgroundColor: theme.colors.card,
          }}
        />
      </div>
      <div
        testId="hs-hit-plain"
        onClick={() => setHit("base")}
        style={boxStyle(40, ROW_THREE, HIT_WIDTH, theme.colors.card)}
      />
      <div
        testId="hs-hit-base"
        onClick={() => setHit("base")}
        style={boxStyle(250, ROW_THREE, HIT_WIDTH, theme.colors.card)}
      >
        <div
          testId="hs-hit-overlay"
          onClick={() => setHit("overlay")}
          style={{
            ...fillStyle(theme.colors.accent),
            visibility: "hidden",
          }}
        />
      </div>
      <div
        testId="hs-hit-none-base"
        onClick={() => setHit("base")}
        style={boxStyle(460, ROW_THREE, HIT_WIDTH, theme.colors.card)}
      >
        <div
          testId="hs-hit-none-overlay"
          onClick={() => setHit("overlay")}
          style={{
            ...fillStyle(theme.colors.accent),
            visibility: "hidden",
            pointerEvents: "none",
          }}
        />
      </div>
      <Pressable
        testId="hs-hit-reset"
        onClick={() => setHit("none")}
        style={{
          position: "absolute",
          left: 200,
          top: HIT_READOUT - 8,
          width: 64,
          height: 24,
          padding: 2,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          reset
        </text>
      </Pressable>
      <text
        testId="hs-hit"
        style={{
          position: "absolute",
          left: 40,
          top: HIT_READOUT,
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        hit={hit}
      </text>
      <div
        style={{
          position: "absolute",
          left: 40,
          top: TABS,
          display: "flex",
          gap: 8,
        }}
      >
        <Pressable
          testId="hs-tab-a"
          onClick={() => setActive("a")}
          style={{ width: TAB_WIDTH, height: TAB_HEIGHT, padding: 4 }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            pane A
          </text>
        </Pressable>
        <Pressable
          testId="hs-tab-b"
          onClick={() => setActive("b")}
          style={{ width: TAB_WIDTH, height: TAB_HEIGHT, padding: 4 }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            pane B
          </text>
        </Pressable>
      </div>
      <div
        testId="hs-slots"
        style={{
          position: "absolute",
          left: 40,
          top: SLOTS,
          width: SLOT_WIDTH,
          height: SLOT_HEIGHT,
          backgroundColor: theme.colors.background,
        }}
      >
        <PaneA active={active === "a"} />
        <PaneB active={active === "b"} />
      </div>
    </div>
  );
};

export const hiddenSurfaceView = (): ReactNode => <HiddenSurfaceProbe />;

/** The one difference between the hosts: plain values or Effects, and a settle. */
interface HiddenDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
  readonly click: (testId: string) => Effect.Effect<void, E>;
  readonly clickPoint: (x: number, y: number) => Effect.Effect<void, E>;
  readonly keys: (keys: ReadonlyArray<string>) => Effect.Effect<void, E>;
  readonly read: (testId: string) => Effect.Effect<string | null, E>;
  readonly paintedText: () => Effect.Effect<ReadonlyArray<string>, E>;
}

const hasRun = (runs: ReadonlyArray<string>, needle: string): boolean =>
  Arr.some(runs, (run) => Str.includes(needle)(run));

/** A readout's text, or a failure naming the missing id (the host boundary is nullish). */
const readoutOf = <E,>(
  ctx: Pick<Smoke.SmokeContext, "expectSome">,
  driver: HiddenDriver<E>,
  testId: string,
): Effect.Effect<string, Smoke.SmokeAssertionError | E> =>
  Effect.flatMap(driver.read(testId), (value) =>
    ctx.expectSome(`${testId} is painted`, Option.fromNullishOr(value)),
  );

const hiddenSurfaceChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: HiddenDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const colors = palettes.dark.colors;
    const background = yield* parseColour(
      "the stage role parses",
      colors.background,
    );
    const card = yield* parseColour("the card role parses", colors.card);
    const popover = yield* parseColour(
      "the popover role parses",
      colors.popover,
    );

    yield* ctx.expectEqual(
      "the two pane fills are distinguishable",
      Pixels.rgbaNear(card, popover, TOLERANCE),
      false,
    );
    yield* ctx.expectEqual(
      "the recipe has no missing half",
      Arr.length(slotProblems(hiddenSlot(false), false)),
      0,
    );
    yield* ctx.expectContains(
      "a slot that keeps its paint is named",
      Arr.join(", ")(
        slotProblems({ ...hiddenSlot(false), visibility: "visible" }, false),
      ),
      "must be hidden",
    );
    yield* ctx.expectContains(
      "a slot that keeps its hits is named",
      Arr.join(", ")(
        slotProblems({ ...hiddenSlot(false), pointerEvents: "auto" }, false),
      ),
      "must not take hits",
    );

    const window = yield* driver.reader.windowSize();
    const atRest = yield* driver.capture();
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(atRest, window),
    );
    const sample = (
      frame: Pixels.Pixels,
      x: number,
      y: number,
      label: string,
    ) => pixelAtPoint(ctx, frame, window, x, y, label);

    yield* expectPixel(
      ctx,
      "display: none still paints its fill",
      driver.reader,
      atRest,
      "hs-display",
      card,
    );
    yield* expectColour(
      ctx,
      "a hidden fill does not paint",
      yield* sample(
        atRest,
        40 + HALF / 2,
        ROW_TWO + BOX / 2,
        "the hidden box's centre",
      ),
      background,
    );
    const hiddenBounds = yield* driver.reader.bounds("hs-hidden");
    yield* ctx.expectEqual(
      "a hidden element reports no painted bounds",
      Option.isNone(Option.fromNullishOr(hiddenBounds)),
      true,
    );
    const row = yield* paintedBox(ctx, driver.reader, "hs-row");
    const after = yield* paintedBox(ctx, driver.reader, "hs-after");
    yield* ctx.expectNear(
      "the hidden box still occupies its space",
      after.x - row.x,
      HALF,
      1,
    );
    yield* ctx.expectNear(
      "the row still lays out both boxes",
      row.width,
      HALF * 2,
      1,
    );
    yield* ctx.expectEqual(
      "the hidden sample would see its fill if it painted",
      Pixels.rgbaNear(background, card, TOLERANCE),
      false,
    );
    yield* expectPixel(
      ctx,
      "the plain hit fixture paints its fill",
      driver.reader,
      atRest,
      "hs-hit-plain",
      card,
    );
    yield* expectPixel(
      ctx,
      "the first hit fixture paints its base fill",
      driver.reader,
      atRest,
      "hs-hit-base",
      card,
    );
    yield* expectPixel(
      ctx,
      "the second hit fixture paints its base fill",
      driver.reader,
      atRest,
      "hs-hit-none-base",
      card,
    );

    const slots = yield* paintedBox(ctx, driver.reader, "hs-slots");
    const slotPoint = {
      x: slots.x + SLOT_SAMPLE.x,
      y: slots.y + SLOT_SAMPLE.y,
    };
    yield* expectColour(
      ctx,
      "the active pane's fill paints the slot",
      yield* sample(atRest, slotPoint.x, slotPoint.y, "the slot point"),
      popover,
    );
    const atRestText = yield* driver.paintedText();
    yield* ctx.expectEqual(
      "the hidden pane's text leaves the paint",
      hasRun(atRestText, "pane-a-marker"),
      false,
    );
    yield* ctx.expectEqual(
      "the active pane's text paints",
      hasRun(atRestText, "pane-b-marker"),
      true,
    );

    yield* driver.click("hs-b-input");
    yield* driver.keys(["h", "i"]);
    yield* ctx.expectContains(
      "the active pane records its draft",
      yield* readoutOf(ctx, driver, "hs-b-draft"),
      "draft=hi",
    );

    yield* driver.click("hs-hit-reset");
    const plainHit = yield* paintedBox(ctx, driver.reader, "hs-hit-plain");
    yield* driver.clickPoint(plainHit.x + HIT_WIDTH / 2, plainHit.y + BOX / 2);
    yield* ctx.expectEqual(
      "a plain fill takes the press",
      yield* readoutOf(ctx, driver, "hs-hit"),
      "hit=base",
    );
    yield* driver.click("hs-hit-reset");
    const firstHit = yield* paintedBox(ctx, driver.reader, "hs-hit-base");
    yield* driver.clickPoint(firstHit.x + HIT_WIDTH / 2, firstHit.y + BOX / 2);
    yield* ctx.expectEqual(
      "a visibility-only overlay's press",
      yield* readoutOf(ctx, driver, "hs-hit"),
      `hit=${HIT_UNDER_VISIBILITY_ONLY}`,
    );
    yield* driver.click("hs-hit-reset");
    const secondHit = yield* paintedBox(ctx, driver.reader, "hs-hit-none-base");
    yield* driver.clickPoint(
      secondHit.x + HIT_WIDTH / 2,
      secondHit.y + BOX / 2,
    );
    yield* ctx.expectEqual(
      "pointerEvents: none hands the press to the base",
      yield* readoutOf(ctx, driver, "hs-hit"),
      "hit=base",
    );

    yield* driver.click("hs-tab-a");
    const onA = yield* driver.capture();
    yield* expectColour(
      ctx,
      "the active pane's fill moves with the switch",
      yield* sample(onA, slotPoint.x, slotPoint.y, "the slot point"),
      card,
    );
    const onAText = yield* driver.paintedText();
    yield* ctx.expectEqual(
      "the newly active pane's text paints",
      hasRun(onAText, "pane-a-marker"),
      true,
    );
    yield* ctx.expectEqual(
      "the newly hidden pane's text leaves the paint",
      hasRun(onAText, "pane-b-marker"),
      false,
    );

    const action = yield* paintedBox(ctx, driver.reader, "hs-a-action");
    yield* driver.clickPoint(
      action.x + action.width / 2,
      action.y + action.height / 2,
    );
    yield* ctx.expectEqual(
      "a press through the hidden pane reaches the active pane",
      yield* readoutOf(ctx, driver, "hs-a-hits"),
      "hits=1",
    );

    yield* driver.click("hs-tab-b");
    yield* ctx.expectEqual(
      "the hidden pane keeps its draft across a switch",
      yield* readoutOf(ctx, driver, "hs-b-draft"),
      "draft=hi",
    );
    const back = yield* driver.capture();
    yield* expectColour(
      ctx,
      "the restored pane paints its own fill",
      yield* sample(back, slotPoint.x, slotPoint.y, "the slot point"),
      popover,
    );
  });

/** One interaction, then the paint the next read needs. */
const headlessAct = (
  host: Smoke.SmokeHost,
  act: () => void,
): Effect.Effect<void> =>
  Effect.sync(() => {
    act();
    host.paint();
  });

const headlessDriver = (host: Smoke.SmokeHost): HiddenDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
  click: (testId) => headlessAct(host, () => host.click(testId)),
  clickPoint: (x, y) => headlessAct(host, () => host.clickWindow(x, y)),
  keys: (keys) =>
    Effect.forEach(keys, (key) => Effect.sync(() => host.key(key)), {
      concurrency: 1,
    }).pipe(Effect.andThen(Effect.sync(host.paint))),
  read: (testId) => Effect.sync(() => host.text(testId)),
  paintedText: () => Effect.sync(host.paintedText),
});

/** A window needs its mount and each input committed before it is read. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): HiddenDriver<Smoke.SmokeHostError> => {
  const settle = Effect.sleep(Duration.millis(120));
  return {
    reader: readAsync(host),
    capture: () => Effect.andThen(settle, captureLive(host)),
    click: (testId) => Effect.andThen(host.click(testId), settle),
    clickPoint: (x, y) => Effect.andThen(host.clickWindow(x, y), settle),
    keys: (keys) =>
      Effect.forEach(keys, host.key, { concurrency: 1 }).pipe(
        Effect.andThen(settle),
      ),
    read: host.text,
    paintedText: host.paintedText,
  };
};

export const hiddenSurfaceScenario: PlaygroundScenario = {
  id: "hidden-surface",
  title: "Hidden surfaces: the paint, the hit and the slot recipe",
  capability: "states",
  view: hiddenSurfaceView,
  steps: (ctx) => hiddenSurfaceChecks(ctx, headlessDriver(ctx.host)),
};

export const hiddenSurfaceLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-hidden-surface",
  title: "Live hidden surfaces: a hidden fill, a press-through and the recipe",
  capability: "states",
  steps: (ctx) => hiddenSurfaceChecks(ctx, liveDriver(ctx.host)),
};

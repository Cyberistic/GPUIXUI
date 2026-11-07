import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import { PinnedList } from "@gpuixui/components/pinned-list";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import { Readout } from "../ui.js";
import { palettes } from "../palettes.js";
import { isColour } from "./box-paint.js";
import { captureScale, colourAt, type Point } from "./frame.js";
import {
  PINNED_END_WHEEL,
  PINNED_HEADER,
  PINNED_IDS,
  PINNED_RETURN_WHEEL,
  PINNED_ROW_FILL,
  PINNED_ROW_HEIGHT,
  PINNED_VIEWPORT,
  PINNED_WHEEL,
  pinnedReadout,
} from "./pinned-list.js";
import { settleUntil } from "./settle.js";

const REST = "pinned-list-rest";
const SCROLLED = "pinned-list-scrolled";
const END = "pinned-list-end";

export const PinnedListProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [offsetY, setOffsetY] = useState(0);
  const [today, setToday] = useState(0);
  const [yesterday, setYesterday] = useState(0);
  const [covered, setCovered] = useState(0);
  const [cover, setCover] = useState(0);

  const row = (testId: string, presses: () => void): ReactNode => (
    <div
      testId={testId}
      onClick={presses}
      style={{ height: PINNED_ROW_HEIGHT, backgroundColor: PINNED_ROW_FILL }}
    />
  );

  return (
    <div
      testId={PINNED_IDS.probe}
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
        A pinned list has no sticky child: the title is a layer repositioned
        from the measured offset. Does it paint over the rows it holds above,
        and does a press on the row beneath it still reach the row? The second
        pair is the control: a filled cover over a row takes the press aimed at
        it.
      </text>
      <PinnedList
        testId={PINNED_IDS.list}
        aria-label="Pinned list"
        surfaceColor={theme.colors.card}
        style={{ width: PINNED_VIEWPORT.width, height: PINNED_VIEWPORT.height }}
        onScrollChange={(event) => setOffsetY(event.scrollY ?? 0)}
        sections={[
          {
            title: "Today",
            children: row(PINNED_IDS.rowToday, () =>
              setToday((count) => count + 1),
            ),
          },
          {
            title: "Yesterday",
            children: row(PINNED_IDS.rowYesterday, () =>
              setYesterday((count) => count + 1),
            ),
          },
        ]}
      />
      <div
        style={{ position: "relative", width: 160, height: 40, flexShrink: 0 }}
      >
        <div
          testId={PINNED_IDS.controlRow}
          onClick={() => setCovered((count) => count + 1)}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <div
          testId={PINNED_IDS.controlCover}
          onClick={() => setCover((count) => count + 1)}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: theme.colors.muted,
          }}
        />
      </div>
      <Readout testId={PINNED_IDS.readout}>
        {pinnedReadout({ offsetY, today, yesterday, covered, cover })}
      </Readout>
    </div>
  );
};

export const pinnedSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(PINNED_IDS.list);

    yield* Effect.sleep(Duration.millis(200));

    type Failure = Smoke.SmokeAssertionError | Smoke.SmokeHostError;

    const box = (testId: string): Effect.Effect<Smoke.Bounds, Failure> =>
      Effect.gen(function* () {
        const painted = yield* settleUntil(
          ctx.host.bounds(testId),
          (value) => value !== null,
        );
        return yield* ctx.expectSome(
          `the runtime paints ${testId}`,
          Option.fromNullishOr(painted),
        );
      });

    const offsetY = (): Effect.Effect<number, Smoke.SmokeHostError> =>
      Effect.map(
        Effect.map(
          ctx.host.scrollOffset(PINNED_IDS.list),
          Option.fromNullishOr,
        ),
        Option.match({
          onNone: () => Number.NaN,
          onSome: (offset) => offset.y,
        }),
      );

    const readout = (
      label: string,
      expected: string,
    ): Effect.Effect<void, Failure> =>
      Effect.gen(function* () {
        yield* ctx.expectContains(
          label,
          yield* settleUntil(ctx.host.text(PINNED_IDS.readout), (line) =>
            line.includes(expected),
          ),
          expected,
        );
      });

    const capture = (
      name: string,
    ): Effect.Effect<
      { readonly frame: Pixels.Pixels; readonly scale: number },
      Failure
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

    const sample = (
      frame: Pixels.Pixels,
      scale: number,
      point: Point,
      label: string,
    ): Effect.Effect<Pixels.Rgba, Failure> =>
      ctx.expectSome(label, colourAt(frame, point, scale));

    const centre = (painted: Smoke.Bounds): Point => ({
      x: painted.x + painted.width / 2,
      y: painted.y + painted.height / 2,
    });

    const rowPoint = (painted: Smoke.Bounds): Point => ({
      x: painted.x + painted.width / 2,
      y: painted.y + 60,
    });

    const viewport = yield* box(PINNED_IDS.list);
    const headerToday = yield* box(PINNED_IDS.headerToday);

    yield* ctx.expectNear(
      "the list paints the viewport its caller declared",
      viewport.height,
      PINNED_VIEWPORT.height,
      1,
    );
    yield* ctx.expectEqual(
      "the list is a scroller, not a plain box",
      Number.isNaN(yield* offsetY()),
      false,
    );
    yield* ctx.expectEqual("the list starts at the top", yield* offsetY(), 0);
    yield* ctx.expectEqual(
      "the reserved title row is the header height the caller did not name",
      headerToday.height,
      PINNED_HEADER,
    );
    yield* ctx.expectNear(
      "the first title rests at the viewport's top",
      headerToday.y,
      viewport.y,
      1,
    );
    yield* ctx.expectEqual(
      "the readout starts empty",
      yield* ctx.host.text(PINNED_IDS.readout),
      pinnedReadout({
        offsetY: 0,
        today: 0,
        yesterday: 0,
        covered: 0,
        cover: 0,
      }),
    );

    const rest = yield* capture(REST);
    yield* ctx.expectEqual(
      "a travelling title paints the surface role its caller handed it",
      isColour(
        yield* sample(
          rest.frame,
          rest.scale,
          centre(headerToday),
          "the title's centre is in the capture",
        ),
        palettes.dark.colors.card,
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the first row paints its own fill below the title",
      isColour(
        yield* sample(
          rest.frame,
          rest.scale,
          rowPoint(viewport),
          "the row's band is in the capture",
        ),
        PINNED_ROW_FILL,
      ),
      true,
    );

    yield* ctx.host.click(PINNED_IDS.controlRow);
    yield* readout(
      "a filled cover takes a press aimed at the row under it",
      pinnedReadout({
        offsetY: 0,
        today: 0,
        yesterday: 0,
        covered: 0,
        cover: 1,
      }),
    );
    yield* ctx.host.click(PINNED_IDS.rowToday);
    yield* readout(
      "the first row takes a press while its title travels with it",
      pinnedReadout({
        offsetY: 0,
        today: 1,
        yesterday: 0,
        covered: 0,
        cover: 1,
      }),
    );

    yield* ctx.host.wheel(PINNED_IDS.list, 0, PINNED_WHEEL);
    const scrolled = yield* offsetY();
    yield* ctx.expectNear(
      "a wheel over the list moves it",
      scrolled,
      PINNED_WHEEL,
      1,
    );
    yield* readout(
      "the readout reports the offset the list moved to",
      pinnedReadout({
        offsetY: scrolled,
        today: 1,
        yesterday: 0,
        covered: 0,
        cover: 1,
      }),
    );
    const heldToday = yield* box(PINNED_IDS.headerToday);
    const movedYesterday = yield* box(PINNED_IDS.headerYesterday);
    yield* ctx.expectNear(
      "the held title stays where it was",
      heldToday.y,
      headerToday.y,
      1,
    );
    yield* ctx.expectNear(
      "the second title travels with its section",
      movedYesterday.y,
      viewport.y + PINNED_HEADER + PINNED_ROW_HEIGHT + scrolled,
      1,
    );
    yield* ctx.expectNear(
      "the held title still spans its reserved row",
      heldToday.height,
      PINNED_HEADER,
      1,
    );

    const rowNow = yield* box(PINNED_IDS.rowToday);
    const rowCentreY = rowNow.y + rowNow.height / 2;
    yield* ctx.expectEqual(
      "the pressed row's centre lies under the held title",
      rowCentreY > heldToday.y + 2 &&
        rowCentreY < heldToday.y + PINNED_HEADER - 2,
      true,
    );

    const scrolledFrame = yield* capture(SCROLLED);
    yield* ctx.expectEqual(
      "the held title paints its surface over the row, not the row's fill",
      isColour(
        yield* sample(
          scrolledFrame.frame,
          scrolledFrame.scale,
          { x: heldToday.x + heldToday.width / 2, y: rowCentreY },
          "the held title's centre is in the capture",
        ),
        palettes.dark.colors.card,
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the row still paints its own fill below the held title",
      isColour(
        yield* sample(
          scrolledFrame.frame,
          scrolledFrame.scale,
          rowPoint(viewport),
          "the row's band is in the capture",
        ),
        PINNED_ROW_FILL,
      ),
      true,
    );

    yield* ctx.host.click(PINNED_IDS.rowToday);
    yield* readout(
      "a press through the held title reaches the row beneath it",
      pinnedReadout({
        offsetY: scrolled,
        today: 2,
        yesterday: 0,
        covered: 0,
        cover: 1,
      }),
    );

    yield* ctx.host.wheel(PINNED_IDS.list, 0, PINNED_END_WHEEL);
    const atEnd = yield* offsetY();
    yield* ctx.expectNear(
      "a wheel past the end clamps at the list's own content",
      atEnd,
      -((PINNED_HEADER + PINNED_ROW_HEIGHT) * 2 - PINNED_VIEWPORT.height),
      1,
    );
    const retired = yield* settleUntil(
      ctx.host.bounds(PINNED_IDS.headerToday),
      (value) => value === null,
    );
    yield* ctx.expectEqual(
      "the retired title paints nothing",
      retired === null,
      true,
    );
    const heldYesterday = yield* box(PINNED_IDS.headerYesterday);
    yield* ctx.expectNear(
      "the next title takes the viewport's top",
      heldYesterday.y,
      viewport.y,
      1,
    );
    yield* capture(END);

    yield* ctx.host.wheel(PINNED_IDS.list, 0, PINNED_RETURN_WHEEL);
    yield* ctx.expectNear(
      "a wheel back returns the list to the top",
      yield* offsetY(),
      0,
      1,
    );
    yield* ctx.expectNear(
      "the first title paints at its rest place again",
      (yield* box(PINNED_IDS.headerToday)).y,
      headerToday.y,
      1,
    );
    yield* readout(
      "the readout reports the presses each element took",
      pinnedReadout({
        offsetY: 0,
        today: 2,
        yesterday: 0,
        covered: 0,
        cover: 1,
      }),
    );
  });

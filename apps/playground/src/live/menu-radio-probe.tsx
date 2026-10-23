/**
 * The `menu-radio-lifecycle` probe: an exclusive-choice menu in a real window.
 *
 * A radio row's visible state is one check mark in a fixed leading slot, so a
 * renderer suite can read `aria-selected` and the mark's accessible name but
 * says nothing about whether the mark's **ink** reached the frame — the slot is
 * the same width marked or not, so no layout read can tell a checked row from an
 * unchecked one. The probe paints the shipped `DropdownMenu` with the shipped
 * radio rows and counts the theme's `primary` ink inside each row's own box: on
 * the row the group chose, and nowhere else; then it chooses another row and
 * reads the mark move. It also measures the two rules a radio row has that a
 * checkbox row does not: a choice closes the surface and reports once, and
 * choosing the row already chosen reports nothing.
 *
 * The view and the steps live here so the measurement is one module; the
 * registry and `liveProbeBodies` name it.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@gpuixui/components";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale } from "./frame.js";
import {
  isMarkInk,
  MENU_RADIO_IDS,
  MENU_RADIO_INITIAL,
  MENU_RADIO_LABEL,
  MENU_RADIO_NEXT,
  MENU_RADIO_NEXT_ID,
  MENU_RADIO_OPTIONS,
  markInk,
  menuRadioReadout,
  type MenuRadioState,
} from "./menu-radio.js";

/** A press, the surface's entry fade and the dismissal it starts need a frame. */
const SETTLE = Duration.millis(260);

/** How long a poll waits for a transition, in 20ms samples. */
const POLLS = 100;

/** The capture a reader can look at. */
const CHOSEN = "menu-radio";

/** The probe's window: one exclusive-choice menu and its own readout. */
export const MenuRadioProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState<string>(MENU_RADIO_INITIAL);
  const [reports, setReports] = useState(0);
  const [opens, setOpens] = useState(0);
  const [closes, setCloses] = useState(0);
  const state: MenuRadioState = { value, reports, opens, closes };

  return (
    <div
      testId={MENU_RADIO_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        An exclusive-choice menu: the chosen row&apos;s check mark is the
        theme&apos;s primary ink, a choice closes the surface, and choosing the
        row already chosen reports nothing.
      </text>
      <Readout testId={MENU_RADIO_IDS.readout}>
        {menuRadioReadout(state)}
      </Readout>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) setOpens((count) => count + 1);
          else setCloses((count) => count + 1);
        }}
      >
        <DropdownMenuTrigger testId={MENU_RADIO_IDS.trigger}>
          Appearance
        </DropdownMenuTrigger>
        <DropdownMenuContent
          testId={MENU_RADIO_IDS.menu}
          label={MENU_RADIO_LABEL}
          style={{ width: 200 }}
        >
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => {
              setValue(next);
              setReports((count) => count + 1);
            }}
            label={MENU_RADIO_LABEL}
          >
            {Arr.map(MENU_RADIO_OPTIONS, (option) => (
              <DropdownMenuRadioItem
                key={option.value}
                testId={option.testId}
                value={option.value}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/** Waits until `testId` paints, and reports whether it did. */
const settlePainted = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> => {
  const attempt = (
    remaining: number,
  ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
    Effect.gen(function* () {
      const box = yield* ctx.host.bounds(testId);
      if (Option.isSome(Option.fromNullishOr(box))) return true;
      if (remaining <= 0) return false;
      yield* Effect.sleep(Duration.millis(20));
      return yield* attempt(remaining - 1);
    });
  return attempt(POLLS);
};

/** Waits until `testId` paints nothing, and reports whether it stopped. */
const settleGone = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> => {
  const attempt = (
    remaining: number,
  ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
    Effect.gen(function* () {
      const box = yield* ctx.host.bounds(testId);
      if (Option.isNone(Option.fromNullishOr(box))) return true;
      if (remaining <= 0) return false;
      yield* Effect.sleep(Duration.millis(20));
      return yield* attempt(remaining - 1);
    });
  return attempt(POLLS);
};

/** A painted box, as the runtime's layout report gives it. */
interface RowBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The painted box of `testId`, failing by name when the runtime omitted it. */
const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<RowBox, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

/** A capture and the scale its logical points convert by. */
const capture = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<
  { readonly pixels: Pixels.Pixels; readonly scale: number },
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    yield* ctx.host.capture(name);
    const pixels = yield* ctx.host.pixels(name);
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      `${name} is the window at a whole device scale`,
      captureScale(pixels, size),
    );
    return { pixels, scale } as const;
  });

/**
 * The `primary` ink inside each row's own box.
 *
 * One capture, one count per row: the slot a mark paints is inside its row, so
 * a mark on another row cannot read as this row's.
 */
const countsByRow = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  scale: number,
  boxes: ReadonlyArray<{ readonly testId: string; readonly box: RowBox }>,
  ink: Pixels.Rgba,
): Effect.Effect<
  ReadonlyArray<number>,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.forEach(
    boxes,
    (row) =>
      Effect.gen(function* () {
        const region = yield* ctx.expectSome(
          `the frame holds ${row.testId}`,
          Option.fromNullishOr(
            Pixels.crop(
              frame,
              new Pixels.PixelRegion({
                x: Math.round(row.box.x * scale),
                y: Math.round(row.box.y * scale),
                width: Math.round(row.box.width * scale),
                height: Math.round(row.box.height * scale),
              }),
            ),
          ),
        );
        return countMarkPixels(region, ink);
      }),
    { concurrency: 1 },
  );

/** How many pixels of `region` are the mark's ink. */
const countMarkPixels = (region: Pixels.Pixels, ink: Pixels.Rgba): number =>
  Arr.reduce(
    Arr.range(0, Math.floor(region.data.length / 4) - 1),
    0,
    (count, index) =>
      isMarkInk(
        region.data[index * 4] ?? 0,
        region.data[index * 4 + 1] ?? 0,
        region.data[index * 4 + 2] ?? 0,
        ink,
      )
        ? count + 1
        : count,
  );

/** The box of every choice, in menu order. */
const rowBoxes = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<
  ReadonlyArray<{ readonly testId: string; readonly box: RowBox }>,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.forEach(
    MENU_RADIO_OPTIONS,
    (option) =>
      Effect.map(paintedBox(ctx, option.testId), (box) => ({
        testId: option.testId,
        box,
      })),
    { concurrency: 1 },
  );

/** The index of the row whose box holds marks, or `-1` when none does. */
export const markedRow = (counts: ReadonlyArray<number>): number =>
  Option.getOrElse(
    Arr.findFirstIndex(counts, (count) => count > 0),
    () => -1,
  );

/** Waits until `testId` holds the native focus, and reports whether it did. */
const settleFocused = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> => {
  const attempt = (
    remaining: number,
  ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
    Effect.gen(function* () {
      if ((yield* ctx.host.focused()) === testId) return true;
      if (remaining <= 0) return false;
      yield* Effect.sleep(Duration.millis(20));
      return yield* attempt(remaining - 1);
    });
  return attempt(POLLS);
};

export const menuRadioSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(MENU_RADIO_IDS.trigger);
    yield* Effect.sleep(SETTLE);
    const readout = () => ctx.host.text(MENU_RADIO_IDS.readout);
    const ink = yield* ctx.expectSome(
      "the theme's primary role is paintable",
      Option.fromNullishOr(
        Pixels.hexToRgba(markInk(palettes.dark.colors.primary)),
      ),
    );

    // 1. The menu starts closed on the first choice, and a press opens it.
    yield* ctx.expectEqual(
      "the menu starts closed on the first choice",
      yield* readout(),
      menuRadioReadout({
        value: MENU_RADIO_INITIAL,
        reports: 0,
        opens: 0,
        closes: 0,
      }),
    );
    yield* ctx.host.click(MENU_RADIO_IDS.trigger);
    yield* ctx.expectEqual(
      "a press on the trigger opens the surface",
      yield* settlePainted(ctx, MENU_RADIO_IDS.menu),
      true,
    );
    yield* Effect.sleep(SETTLE);

    // 2. The mark is the primary ink, on the chosen row and nowhere else.
    const first = yield* capture(ctx, CHOSEN);
    const firstCounts = yield* countsByRow(
      ctx,
      first.pixels,
      first.scale,
      yield* rowBoxes(ctx),
      ink,
    );
    yield* ctx.expectEqual(
      "the chosen row paints the mark",
      Option.getOrElse(Arr.head(firstCounts), () => 0) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "no other row paints the mark",
      markedRow(firstCounts),
      0,
    );

    // 3. Choosing another row moves the mark, reports once and closes.
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "Escape dismisses the surface",
      yield* settleGone(ctx, MENU_RADIO_IDS.menu),
      true,
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(MENU_RADIO_IDS.trigger);
    yield* ctx.expectEqual(
      "the surface opens again",
      yield* settlePainted(ctx, MENU_RADIO_IDS.menu),
      true,
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(MENU_RADIO_NEXT_ID);
    yield* ctx.expectEqual(
      "a choice dismisses the surface",
      yield* settleGone(ctx, MENU_RADIO_IDS.menu),
      true,
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a choice reports once",
      yield* readout(),
      menuRadioReadout({
        value: MENU_RADIO_NEXT,
        reports: 1,
        opens: 2,
        closes: 2,
      }),
    );
    yield* ctx.expectEqual(
      "a choice returns the focus to the trigger",
      yield* settleFocused(ctx, MENU_RADIO_IDS.trigger),
      true,
    );

    // 4. The next open paints the mark on the row now chosen.
    yield* ctx.host.click(MENU_RADIO_IDS.trigger);
    yield* ctx.expectEqual(
      "the surface opens on the new value",
      yield* settlePainted(ctx, MENU_RADIO_IDS.menu),
      true,
    );
    yield* Effect.sleep(SETTLE);
    const second = yield* capture(ctx, `${CHOSEN}-next`);
    const secondCounts = yield* countsByRow(
      ctx,
      second.pixels,
      second.scale,
      yield* rowBoxes(ctx),
      ink,
    );
    yield* ctx.expectEqual(
      "the mark follows the value to the next row",
      markedRow(secondCounts),
      Option.getOrElse(
        Arr.findFirstIndex(
          MENU_RADIO_OPTIONS,
          (option) => option.value === MENU_RADIO_NEXT,
        ),
        () => -1,
      ),
    );
    yield* ctx.expectEqual(
      "the first row keeps no mark once it is no longer chosen",
      Option.getOrElse(Arr.head(secondCounts), () => 0),
      0,
    );

    // 5. Choosing the row already chosen reports nothing.
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "Escape dismisses the surface a second time",
      yield* settleGone(ctx, MENU_RADIO_IDS.menu),
      true,
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(MENU_RADIO_IDS.trigger);
    yield* ctx.expectEqual(
      "the surface opens for the chosen-row press",
      yield* settlePainted(ctx, MENU_RADIO_IDS.menu),
      true,
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(MENU_RADIO_OPTIONS[2]?.testId ?? MENU_RADIO_IDS.dark);
    yield* ctx.expectEqual(
      "the chosen row's own press dismisses the surface",
      yield* settleGone(ctx, MENU_RADIO_IDS.menu),
      true,
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "choosing the chosen row reports nothing",
      yield* readout(),
      menuRadioReadout({
        value: MENU_RADIO_NEXT,
        reports: 1,
        opens: 4,
        closes: 4,
      }),
    );
  });

/**
 * The `rating-lifecycle` probe: the shipped `Rating` in a real window.
 *
 * `Rating`'s paint is a claim in roles: a filled star is the theme's `primary`,
 * an empty one `mutedForeground`, a failure's filled star `destructive`, and a
 * **half** star is the filled glyph painted whole inside a box clipped at the
 * star's midpoint. The package's window suite reads each icon's `style.color`
 * and its `star-filled` markup, which says what was asked for; only a capture
 * says the ink reached the glass, and only the two halves of a star's own box
 * say the clip cut it where the component claims.
 *
 * The probe gives each static reading a `max={1}` rating — the group's box is
 * then exactly one star, so a count confined to it cannot borrow another row's
 * ink — and drives a five-star group with a press at its centre, the arrow
 * contract, `Home`/`End`, the clamp at five and `Delete`'s clear. A disabled
 * group proves a press it refuses reports nothing.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { Rating } from "@gpuixui/primitives";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale } from "./frame.js";
import {
  counterOf,
  disabledInk,
  emptyInk,
  filledInk,
  halfSplit,
  invalidInk,
  isStarInk,
  RATING_IDS,
  RATING_INITIAL,
  RATING_STARS,
  ratingReadout,
  type RatingState,
} from "./rating.js";

/** A rating's paint is one render behind the press that changed it. */
const SETTLE = Duration.millis(80);

/** The captures a reader can look at. */
const REST = "rating-rest";
const CHOSEN = "rating-chosen";

/** One labelled rating row. */
const Row = ({
  label,
  testId,
  children,
}: {
  readonly label: string;
  readonly testId: string;
  readonly children: ReactNode;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          width: 120,
          color: theme.colors.mutedForeground,
        }}
      >
        {label}
      </text>
      <div testId={testId}>{children}</div>
    </div>
  );
};

/** The probe's window: one star per paint role, and the group it drives. */
export const RatingProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState<number>(RATING_INITIAL);
  const [reports, setReports] = useState(0);
  const [disabled, setDisabled] = useState(0);
  const state: RatingState = { value, reports, disabled };

  return (
    <div
      testId={RATING_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        A rating paints a filled star in the primary role, an empty one muted, a
        half star as a clipped fill, and steps with the arrows; Delete clears
        it.
      </text>
      <Readout testId={RATING_IDS.readout}>{ratingReadout(state)}</Readout>
      <Row label="Unrated" testId={RATING_IDS.empty}>
        <Rating max={1} label="Unrated" />
      </Row>
      <Row label="Rated" testId={RATING_IDS.full}>
        <Rating max={1} defaultValue={1} label="Rated" />
      </Row>
      <Row label="Half" testId={RATING_IDS.half}>
        <Rating max={1} allowHalf defaultValue={0.5} label="Half" />
      </Row>
      <Row label="Invalid" testId={RATING_IDS.invalid}>
        <Rating max={1} defaultValue={1} invalid label="Invalid" />
      </Row>
      <Row label="Disabled" testId={RATING_IDS.disabled}>
        <Rating
          max={1}
          value={1}
          disabled
          label="Disabled"
          onChange={() => setDisabled((count) => count + 1)}
        />
      </Row>
      <Row label="Interactive" testId={RATING_IDS.interactive}>
        <Rating
          max={RATING_STARS}
          allowHalf
          label="Interactive"
          value={value}
          onChange={(next) => {
            setValue(next);
            setReports((count) => count + 1);
          }}
        />
      </Row>
    </div>
  );
};

/** A rating's painted box, as the runtime's layout report gives it. */
interface StarBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The painted box of `testId`, failing by name when the runtime omitted it. */
const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<StarBox, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
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

/** How many pixels of `region` are `ink`. */
const countInk = (region: Pixels.Pixels, ink: Pixels.Rgba): number =>
  Arr.reduce(
    Arr.range(0, Math.floor(region.data.length / 4) - 1),
    0,
    (count, index) =>
      isStarInk(
        region.data[index * 4] ?? 0,
        region.data[index * 4 + 1] ?? 0,
        region.data[index * 4 + 2] ?? 0,
        ink,
      )
        ? count + 1
        : count,
  );

/** A rectangle of a logical box, in the capture's own device pixels. */
const regionOf = (
  box: StarBox,
  scale: number,
  from = 0,
  to = 1,
): Pixels.PixelRegion => {
  const left = Math.round(box.x * scale);
  const top = Math.round(box.y * scale);
  const width = Math.round(box.width * scale);
  const start = left + Math.round(width * from);
  const end = left + Math.round(width * to);
  return new Pixels.PixelRegion({
    x: start,
    y: top,
    width: end - start,
    height: Math.round(box.height * scale),
  });
};

/** The ink count inside one crop of a box, failing by name off the frame. */
const inkIn = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  region: Pixels.PixelRegion,
  ink: Pixels.Rgba,
): Effect.Effect<number, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const crop = yield* ctx.expectSome(
      "the frame holds the rating's box",
      Option.fromNullishOr(Pixels.crop(frame, region)),
    );
    return countInk(crop, ink);
  });

/** The two halves of a `max={1}` rating's box, in capture pixels. */
const splitOf = (
  box: StarBox,
  scale: number,
): {
  readonly left: Pixels.PixelRegion;
  readonly right: Pixels.PixelRegion;
} => {
  const width = Math.round(box.width * scale);
  const middle = halfSplit(width);
  return {
    left: regionOf(box, scale, 0, middle / width),
    right: regionOf(box, scale, middle / width, 1),
  };
};

export const ratingSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(RATING_IDS.probe);
    yield* Effect.sleep(SETTLE);
    const readout = () => ctx.host.text(RATING_IDS.readout);
    const primary = yield* ctx.expectSome(
      "the theme's primary role is paintable",
      Option.fromNullishOr(
        Pixels.hexToRgba(filledInk(palettes.dark.colors.primary)),
      ),
    );
    const muted = yield* ctx.expectSome(
      "the theme's muted foreground is paintable",
      Option.fromNullishOr(
        Pixels.hexToRgba(emptyInk(palettes.dark.colors.mutedForeground)),
      ),
    );
    const destructive = yield* ctx.expectSome(
      "the theme's destructive role is paintable",
      Option.fromNullishOr(
        Pixels.hexToRgba(invalidInk(palettes.dark.colors.destructive)),
      ),
    );
    const dimmed = yield* ctx.expectSome(
      "a disabled star's half-opacity fill is paintable",
      Option.fromNullishOr(
        Pixels.hexToRgba(
          disabledInk(
            palettes.dark.colors.primary,
            palettes.dark.colors.background,
          ),
        ),
      ),
    );

    // 1. The controlled group starts unrated.
    yield* ctx.expectEqual(
      "the interactive rating starts unrated",
      yield* readout(),
      ratingReadout({ value: RATING_INITIAL, reports: 0, disabled: 0 }),
    );

    // 2. Each paint role is read from one star's own box.
    const empty = yield* paintedBox(ctx, RATING_IDS.empty);
    const full = yield* paintedBox(ctx, RATING_IDS.full);
    const half = yield* paintedBox(ctx, RATING_IDS.half);
    const invalid = yield* paintedBox(ctx, RATING_IDS.invalid);
    const disabled = yield* paintedBox(ctx, RATING_IDS.disabled);
    const interactive = yield* paintedBox(ctx, RATING_IDS.interactive);
    const rest = yield* capture(ctx, REST);
    const counts = (
      box: StarBox,
      ink: Pixels.Rgba,
      from = 0,
      to = 1,
    ): Effect.Effect<number, Smoke.SmokeAssertionError> =>
      inkIn(ctx, rest.pixels, regionOf(box, rest.scale, from, to), ink);

    yield* ctx.expectEqual(
      "an unrated star paints none of the primary ink",
      yield* counts(empty, primary),
      0,
    );
    yield* ctx.expectEqual(
      "an unrated star draws its outline in the muted role",
      (yield* counts(empty, muted)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a rated star paints the primary ink",
      (yield* counts(full, primary)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a rated star paints no outline",
      yield* counts(full, muted),
      0,
    );
    const halves = splitOf(half, rest.scale);
    yield* ctx.expectEqual(
      "a half star paints the primary ink in its left half",
      (yield* inkIn(ctx, rest.pixels, halves.left, primary)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a half star paints none of the primary ink in its right half",
      yield* inkIn(ctx, rest.pixels, halves.right, primary),
      0,
    );
    yield* ctx.expectEqual(
      "a half star keeps the outline in its right half",
      (yield* inkIn(ctx, rest.pixels, halves.right, muted)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "an invalid star paints the destructive ink",
      (yield* counts(invalid, destructive)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "an invalid star paints none of the primary ink",
      yield* counts(invalid, primary),
      0,
    );
    yield* ctx.expectEqual(
      "a disabled rating keeps the paint it was given, at half opacity",
      (yield* counts(disabled, dimmed)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a disabled rating paints none of the undimmed primary ink",
      yield* counts(disabled, primary),
      0,
    );
    yield* ctx.expectEqual(
      "an unrated group paints no primary ink",
      yield* counts(interactive, primary),
      0,
    );

    // 3. A press at the group's centre lands on its middle star.
    yield* ctx.host.click(RATING_IDS.interactive);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on the middle star chooses three",
      yield* readout(),
      ratingReadout({ value: 3, reports: 1, disabled: 0 }),
    );

    // 4. The arrow contract: halves, both ends clamps and the clear key.
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Right steps a half star",
      yield* readout(),
      ratingReadout({ value: 3.5, reports: 2, disabled: 0 }),
    );
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Left steps back the half",
      yield* readout(),
      ratingReadout({ value: 3, reports: 3, disabled: 0 }),
    );
    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home lands on the first half star",
      yield* readout(),
      ratingReadout({ value: 0.5, reports: 4, disabled: 0 }),
    );
    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End lands on the last star",
      yield* readout(),
      ratingReadout({ value: 5, reports: 5, disabled: 0 }),
    );

    // 5. The paint follows the value.
    const chosen = yield* capture(ctx, CHOSEN);
    yield* ctx.expectEqual(
      "the chosen group paints the primary ink",
      (yield* inkIn(
        ctx,
        chosen.pixels,
        regionOf(interactive, chosen.scale),
        primary,
      )) > 0,
      true,
    );

    // 6. A step past the end changes nothing, and Delete clears the rating.
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Right at the last star clamps without reporting",
      yield* readout(),
      ratingReadout({ value: 5, reports: 5, disabled: 0 }),
    );
    yield* ctx.host.key("delete");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Delete clears the rating",
      yield* readout(),
      ratingReadout({ value: 0, reports: 6, disabled: 0 }),
    );

    // 7. A press a disabled group refuses reports nothing.
    yield* ctx.host.click(RATING_IDS.disabled);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a disabled rating reports nothing",
      Option.getOrElse(counterOf(yield* readout(), "disabled"), () => -1),
      0,
    );
  });

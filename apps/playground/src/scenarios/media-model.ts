/**
 * The media surface's seek and envelope model (plan `520`).
 *
 * 0.10.0 has no media element and no transport, so a player is an app-owned
 * platform integration. What a component can own honestly is the waveform and
 * the seek: a pixel ↔ time scale, a clamped time, a bar envelope and the
 * accessible label. Every rule is pure so the view, the steps and the unit
 * tests share one definition.
 */
import * as Arr from "effect/Array";
import * as Match from "effect/Match";
import * as Number from "effect/Number";

/** The waveform stage: the coordinate space of the seek. */
export const STAGE = { width: 480, height: 96 } as const;

/** The clip's length; with `STAGE.width` this gives exactly 4 px per second. */
export const DURATION = 120;

/** The rendered envelope's bar count. */
export const BARS = 64;

/** One bar's horizontal slot; `width / BARS` is exactly `7.5`. */
export const SLOT = STAGE.width / BARS;

/** One bar's painted width. */
export const BAR_WIDTH = 6;

/** An arrow key's seek step, in seconds. */
export const KEY_STEP = 1;

/** An arrow key's seek step while shift is held, in seconds. */
export const SHIFT_STEP = 5;

const PX_PER_S = STAGE.width / DURATION;

/** Keeps a time inside the clip. */
export const clampTime = (seconds: number): number =>
  Number.clamp(seconds, { minimum: 0, maximum: DURATION });

/** A stage-relative x in pixels as a clip time, clamped at both ends. */
export const timeAt = (px: number): number => clampTime(px / PX_PER_S);

/** A clip time as a stage-relative x in pixels. */
export const xAt = (seconds: number): number => seconds * PX_PER_S;

/**
 * A key press as the next time: arrows step, shift makes the step large, Home
 * and End are the ends, and any other key changes nothing. Always clamped.
 */
export const stepTime = (seconds: number, key: string, shift = false): number =>
  clampTime(
    seconds +
      Match.value(key).pipe(
        Match.when("left", () => -(shift ? SHIFT_STEP : KEY_STEP)),
        Match.when("right", () => (shift ? SHIFT_STEP : KEY_STEP)),
        Match.when("home", () => -DURATION),
        Match.when("end", () => DURATION),
        Match.orElse(() => 0),
      ),
  );

/**
 * The fixture amplitude of bar `index`, in pixels: deterministic, `12…59` so
 * every bar is visible and none exceeds the stage.
 */
export const amplitudeAt = (index: number): number => 12 + ((index * 29) % 48);

/** The fixture's bar heights, one per bar. */
export const levels: ReadonlyArray<number> = Arr.map(
  Arr.range(0, BARS - 1),
  amplitudeAt,
);

/** One bottom-aligned bar in the stage's coordinate space. */
export const barFor = (
  height: number,
  index: number,
): { readonly x: number; readonly top: number; readonly height: number } => ({
  x: index * SLOT,
  top: STAGE.height - height,
  height,
});

/** The fixture's bar `index`, bottom-aligned. */
export const barRect = (index: number) => barFor(amplitudeAt(index), index);

/** `36s of 120s` — the slider's accessible value. */
export const positionLabel = (seconds: number): string =>
  `${seconds}s of ${DURATION}s`;

/** The static envelope as an SVG document, one rect per bar. */
export const envelopeSvg = (
  fill: string,
  heights: ReadonlyArray<number> = levels,
): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${STAGE.width}" height="${STAGE.height}" viewBox="0 0 ${STAGE.width} ${STAGE.height}">${Arr.join(
    Arr.map(
      heights,
      (height, index) =>
        `<rect x="${barFor(height, index).x}" y="${barFor(height, index).top}" width="${BAR_WIDTH}" height="${height}" fill="${fill}"/>`,
    ),
    "",
  )}</svg>`;

/** The same envelope as one `<img>` source: the full-colour route. */
export const envelopeDataUrl = (fill: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(envelopeSvg(fill))}`;

/**
 * Where the seek plane sits relative to the painted envelope. `over` is the
 * recommended route, `under` the failing one (the envelope takes the press),
 * and `pass` the second working route (`pointerEvents: "none"` on the layer).
 */
export type PlaneMode = "over" | "under" | "pass";

/** The plane mode a `media-plane` press cycles to. */
export const nextPlane = (plane: PlaneMode): PlaneMode =>
  Match.value(plane).pipe(
    Match.when("over", () => "under" as const),
    Match.when("under", () => "pass" as const),
    Match.when("pass", () => "over" as const),
    Match.exhaustive,
  );

/** `pos=30 duration=120 plane=over route=bars` */
export const describeMedia = (
  seconds: number,
  plane: PlaneMode,
  route: "bars" | "image",
): string =>
  `pos=${seconds} duration=${DURATION} plane=${plane} route=${route}`;

/**
 * The window-backdrop measurement — what `windowBackground` does to the pixels
 * the app does not paint.
 *
 * `@gpuix/native` 0.11.0 declares `WindowOptions.windowBackground` as
 * `"opaque" | "transparent" | "blurred"`, and no probe on this host had opened a
 * window with one, so a workspace plan could not tell a translucent window from
 * an option the runtime ignores. A window reports neither its options nor its
 * style, so the evidence is the frame: the probe paints one box and leaves the
 * rest of the window to the window server, and the capture carries that area's
 * alpha.
 *
 * One window per process — a second `init` fails with "A GPUI application
 * already exists on this thread" — so each mode is its own CLI run, and the
 * probe asserts the paint against the mode the runner actually passed to `init`.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Pixels } from "@gpuixui/testing";
import type { Point } from "./frame.js";

/** The `windowBackground` values the binding declares, in its own order. */
export const windowBackgrounds = ["opaque", "transparent", "blurred"] as const;

/** A `windowBackground` value. */
export const WindowBackground = Schema.Literals(windowBackgrounds);
/** A `windowBackground` value. */
export type WindowBackground = typeof WindowBackground.Type;

/** The mode a window opens with when the CLI is not told otherwise. */
export const defaultWindowBackground: WindowBackground = "opaque";

/**
 * The alpha a window's own surface carries in `mode`.
 *
 * `transparent` and `blurred` leave the app's unpainted area empty, and the
 * window server composites the vibrancy behind it — which the app's own capture
 * cannot see — so both measure `0` and only the transparency is proved.
 */
export const surfaceAlpha = (mode: WindowBackground): number =>
  Match.value(mode).pipe(
    Match.when("opaque", () => 255),
    Match.when("transparent", () => 0),
    Match.when("blurred", () => 0),
    Match.exhaustive,
  );

/** The one surface the probe paints, in logical pixels from the window's corner. */
export const BACKDROP_BOX = { x: 40, y: 40, width: 120, height: 80 } as const;

/** The box's fill: a colour no theme carries, so an exact match is the fixture. */
export const BACKDROP_FILL = "#D9432B";

/** The fill as the frame reports it; `backdrop.test.ts` holds the two together. */
export const BACKDROP_FILL_RGBA = new Pixels.Rgba({
  r: 0xd9,
  g: 0x43,
  b: 0x2b,
  a: 255,
});

/** Where the painted box's centre sits: the surface proof. */
export const contentPoint: Point = {
  x: BACKDROP_BOX.x + BACKDROP_BOX.width / 2,
  y: BACKDROP_BOX.y + BACKDROP_BOX.height / 2,
};

/**
 * A point in the corner the app leaves unpainted, in logical pixels.
 *
 * Sixty pixels in from the right edge and forty up from the bottom keep it clear
 * of the box and of the mode readout at every window size the runner opens.
 */
export const backdropPoint = (size: {
  readonly width: number;
  readonly height: number;
}): Point => ({ x: size.width - 60, y: size.height - 40 });

/**
 * The mode a probe's readout names.
 *
 * A painted readout is unknown input like any other, so it is decoded rather
 * than compared: a readout that renders something else fails the probe with
 * `None` instead of matching nothing silently.
 */
export const decodeWindowBackground = (
  text: string,
): Option.Option<WindowBackground> =>
  Schema.decodeUnknownOption(WindowBackground)(text.trim());

/** What the live CLI's own `--window-background` flag asks for. */
export interface WindowBackgroundArgs {
  readonly background: WindowBackground;
  /** The tokens the shared CLI parser still owns. */
  readonly rest: ReadonlyArray<string>;
  /** A flag that names no mode, reported like any other bad argument. */
  readonly unknown: ReadonlyArray<string>;
}

/**
 * Splits `--window-background <mode>` out of the live CLI's argv.
 *
 * The flag is live-only: the headless suite mounts a `TestRenderer`, which has
 * no window, so this parses in the live CLI and the headless one keeps rejecting
 * the flag as unknown. A value that is not a mode is collected rather than
 * ignored, so `--window-background glassy` cannot silently open an opaque
 * window and pass the probe.
 */
export const splitWindowBackground = (
  argv: ReadonlyArray<string>,
): WindowBackgroundArgs => {
  const step = (
    rest: ReadonlyArray<string>,
    kept: ReadonlyArray<string>,
    background: WindowBackground,
    unknown: ReadonlyArray<string>,
  ): WindowBackgroundArgs =>
    Option.match(Arr.head(rest), {
      onNone: () => ({ background, rest: kept, unknown }),
      onSome: (token) =>
        token === "--window-background"
          ? Option.match(Arr.head(Arr.drop(rest, 1)), {
              onNone: () =>
                step(
                  [],
                  kept,
                  background,
                  Arr.append(unknown, "--window-background needs a mode"),
                ),
              onSome: (value) =>
                Option.match(
                  Schema.decodeUnknownOption(WindowBackground)(value),
                  {
                    onNone: () =>
                      step(
                        Arr.drop(rest, 2),
                        kept,
                        background,
                        Arr.append(
                          unknown,
                          `--window-background ${value} is not a mode: ${Arr.join(windowBackgrounds, ", ")}`,
                        ),
                      ),
                    onSome: (mode) =>
                      step(Arr.drop(rest, 2), kept, mode, unknown),
                  },
                ),
            })
          : step(
              Arr.drop(rest, 1),
              Arr.append(kept, token),
              background,
              unknown,
            ),
    });

  return step(argv, [], defaultWindowBackground, []);
};

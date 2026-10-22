/**
 * The window-chrome measurement: where the app's own layout starts, and what a
 * window reports as its safe area.
 *
 * A Tier 4 toolbar, status bar or titlebar-integrated workspace has to know two
 * things the capability record never measured: whether the runtime already
 * reserves the titlebar (so an app's `y = 0` is below the traffic lights), and
 * what `getWindowInsets()` answers — the number an app insets its own chrome by.
 * `WindowOptions.titlebarTransparent` is the switch that asks for the other
 * case ("draw chrome under the traffic lights"), so the runner passes it and the
 * probe asserts the frame against the mode the window actually opened with.
 *
 * Two window facts are modelled here because the renderer reports neither: the
 * mode the runner asked `init` for, and the insets readout's shape, which the
 * probe paints and then decodes rather than trusting — a readout that renders
 * something else fails with `None` instead of matching nothing silently.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The titlebar modes the CLI can open a window with, in its own order. */
export const titlebarChromes = ["default", "transparent"] as const;

/** A titlebar mode. */
export const TitlebarChrome = Schema.Literals(titlebarChromes);
/** A titlebar mode. */
export type TitlebarChrome = typeof TitlebarChrome.Type;

/** The mode a window opens with when the CLI is not told otherwise. */
export const defaultTitlebarChrome: TitlebarChrome = "default";

/** The `WindowOptions` a mode adds, so the option cannot drift from the readout. */
export const titlebarOptions = (chrome: TitlebarChrome) =>
  Match.value(chrome).pipe(
    Match.when("default", () => ({})),
    Match.when("transparent", () => ({ titlebarTransparent: true })),
    Match.exhaustive,
  );

/** One edge set, as a window reports it. */
const Edges = Schema.Struct({
  top: Schema.Finite,
  right: Schema.Finite,
  bottom: Schema.Finite,
  left: Schema.Finite,
});

/** The edges a probe read back. */
export interface Edges extends Schema.Schema.Type<typeof Edges> {}

/** The readout for one edge set: `top,right,bottom,left`. */
export const formatEdges = (edges: {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}): string =>
  Arr.join(
    Arr.map([edges.top, edges.right, edges.bottom, edges.left], String),
    ",",
  );

/** What the probe read back, or `None` when the readout is not four numbers. */
export const decodeEdges = (text: string): Option.Option<Edges> => {
  const parts = text.trim().split(",");
  return parts.length === 4
    ? Schema.decodeUnknownOption(Edges)({
        top: Number(parts[0]),
        right: Number(parts[1]),
        bottom: Number(parts[2]),
        left: Number(parts[3]),
      })
    : Option.none();
};

/** What the live CLI's own `--titlebar` flag asks for. */
export interface TitlebarArgs {
  readonly chrome: TitlebarChrome;
  /** The tokens the shared CLI parser still owns. */
  readonly rest: ReadonlyArray<string>;
  /** A flag that names no mode, reported like any other bad argument. */
  readonly unknown: ReadonlyArray<string>;
}

/**
 * Splits `--titlebar <mode>` out of the live CLI's argv.
 *
 * The flag is live-only, as `--window-background` is: a headless suite mounts a
 * `TestRenderer`, which has no window. A value that is not a mode is collected
 * rather than ignored, so `--titlebar glassy` cannot silently open the default
 * titlebar and pass the probe.
 */
export const splitTitlebarChrome = (
  argv: ReadonlyArray<string>,
): TitlebarArgs => {
  const step = (
    rest: ReadonlyArray<string>,
    kept: ReadonlyArray<string>,
    chrome: TitlebarChrome,
    unknown: ReadonlyArray<string>,
  ): TitlebarArgs =>
    Option.match(Arr.head(rest), {
      onNone: () => ({ chrome, rest: kept, unknown }),
      onSome: (token) =>
        token === "--titlebar"
          ? Option.match(Arr.head(Arr.drop(rest, 1)), {
              onNone: () =>
                step(
                  [],
                  kept,
                  chrome,
                  Arr.append(unknown, "--titlebar needs a mode"),
                ),
              onSome: (value) =>
                Option.match(
                  Schema.decodeUnknownOption(TitlebarChrome)(value),
                  {
                    onNone: () =>
                      step(
                        Arr.drop(rest, 2),
                        kept,
                        chrome,
                        Arr.append(
                          unknown,
                          `--titlebar ${value} is not a mode: ${Arr.join(titlebarChromes, ", ")}`,
                        ),
                      ),
                    onSome: (mode) =>
                      step(Arr.drop(rest, 2), kept, mode, unknown),
                  },
                ),
            })
          : step(Arr.drop(rest, 1), Arr.append(kept, token), chrome, unknown),
    });

  return step(argv, [], defaultTitlebarChrome, []);
};

/** The bar the probe paints at the window's own top edge: a colour nothing else uses. */
export const CHROME_FILL = { r: 0x2d, g: 0x6b, b: 0xe0 } as const;

/** The bar the probe paints below the insets: a colour the top bar does not share. */
export const SAFE_FILL = { r: 0xe0, g: 0x6b, b: 0x2d } as const;

/** The height of each bar; a toolbar's own height, not the safe area's. */
export const BAR_HEIGHT = 24;

/** How far into a bar a sample reads, clear of the frame's own edge. */
export const BAR_SAMPLE = { x: 40, y: 8 } as const;

/**
 * Where the inset bar starts on the x axis.
 *
 * The two bars must not cover the same pixels: in a default window the safe
 * area's top is `0`, so a full-width inset bar would paint over the app's own
 * top bar and a capture could not tell which one it read.
 */
export const SAFE_BAR_X = 240;

/** A logical point inside the app's own bar, painted at the window's top edge. */
export const barPoint = (top: number): { x: number; y: number } => ({
  x: BAR_SAMPLE.x,
  y: top + BAR_SAMPLE.y,
});

/** A logical point inside the inset bar, clear of the app's own bar. */
export const insetBarPoint = (top: number): { x: number; y: number } => ({
  x: SAFE_BAR_X + BAR_SAMPLE.x,
  y: top + BAR_SAMPLE.y,
});

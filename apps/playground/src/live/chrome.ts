import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const titlebarChromes = ["default", "transparent"] as const;

export const TitlebarChrome = Schema.Literals(titlebarChromes);

export type TitlebarChrome = typeof TitlebarChrome.Type;

export const defaultTitlebarChrome: TitlebarChrome = "default";

export const titlebarOptions = (chrome: TitlebarChrome) =>
  Match.value(chrome).pipe(
    Match.when("default", () => ({})),
    Match.when("transparent", () => ({ titlebarTransparent: true })),
    Match.exhaustive,
  );

const Edges = Schema.Struct({
  top: Schema.Finite,
  right: Schema.Finite,
  bottom: Schema.Finite,
  left: Schema.Finite,
});

export interface Edges extends Schema.Schema.Type<typeof Edges> {}

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

export interface TitlebarArgs {
  readonly chrome: TitlebarChrome;

  readonly rest: ReadonlyArray<string>;

  readonly unknown: ReadonlyArray<string>;
}

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

export const CHROME_FILL = { r: 0x2d, g: 0x6b, b: 0xe0 } as const;

export const SAFE_FILL = { r: 0xe0, g: 0x6b, b: 0x2d } as const;

export const BAR_HEIGHT = 24;

export const BAR_SAMPLE = { x: 40, y: 8 } as const;

export const SAFE_BAR_X = 240;

export const barPoint = (top: number): { x: number; y: number } => ({
  x: BAR_SAMPLE.x,
  y: top + BAR_SAMPLE.y,
});

export const insetBarPoint = (top: number): { x: number; y: number } => ({
  x: SAFE_BAR_X + BAR_SAMPLE.x,
  y: top + BAR_SAMPLE.y,
});

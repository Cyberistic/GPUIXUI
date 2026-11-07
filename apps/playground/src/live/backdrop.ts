import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Pixels } from "@gpuixui/testing";
import type { Point } from "./frame.js";

export const windowBackgrounds = ["opaque", "transparent", "blurred"] as const;

export const WindowBackground = Schema.Literals(windowBackgrounds);

export type WindowBackground = typeof WindowBackground.Type;

export const defaultWindowBackground: WindowBackground = "opaque";

export const surfaceAlpha = (mode: WindowBackground): number =>
  Match.value(mode).pipe(
    Match.when("opaque", () => 255),
    Match.when("transparent", () => 0),
    Match.when("blurred", () => 0),
    Match.exhaustive,
  );

export const BACKDROP_BOX = { x: 40, y: 40, width: 120, height: 80 } as const;

export const BACKDROP_FILL = "#D9432B";

export const BACKDROP_FILL_RGBA = new Pixels.Rgba({
  r: 0xd9,
  g: 0x43,
  b: 0x2b,
  a: 255,
});

export const TRANSLUCENT_BOX = {
  x: 200,
  y: 40,
  width: 120,
  height: 80,
} as const;

export const TRANSLUCENT_FILL = "#FFFFFF66";

export const translucentFill = (mode: WindowBackground): Pixels.Rgba =>
  new Pixels.Rgba({
    r: 102,
    g: 102,
    b: 102,
    a: mode === "opaque" ? 255 : 102,
  });

export const translucentPoint: Point = {
  x: TRANSLUCENT_BOX.x + TRANSLUCENT_BOX.width / 2,
  y: TRANSLUCENT_BOX.y + TRANSLUCENT_BOX.height / 2,
};

export const contentPoint: Point = {
  x: BACKDROP_BOX.x + BACKDROP_BOX.width / 2,
  y: BACKDROP_BOX.y + BACKDROP_BOX.height / 2,
};

export const backdropPoint = (size: {
  readonly width: number;
  readonly height: number;
}): Point => ({ x: size.width - 60, y: size.height - 40 });

export const decodeWindowBackground = (
  text: string,
): Option.Option<WindowBackground> =>
  Schema.decodeUnknownOption(WindowBackground)(text.trim());

export interface WindowBackgroundArgs {
  readonly background: WindowBackground;

  readonly rest: ReadonlyArray<string>;

  readonly unknown: ReadonlyArray<string>;
}

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

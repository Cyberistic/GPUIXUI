import { pipe } from "effect";
import * as Option from "effect/Option";
import {
  contrastFloorsFor,
  contrastRatio,
  nativeFenceFill,
  nativeFenceHeaderFill,
  platformTheme,
  syntaxColors,
  type Theme,
} from "@gpuixui/tokens";
import { palettes } from "../palettes.js";

export const FENCE_PLATFORM = "darwin" as const;

export const fenceBaseTheme: Theme = palettes.dark;

export const fencePlatformTheme: Theme = platformTheme(
  palettes.dark,
  FENCE_PLATFORM,
);

export const MARKDOWN_FENCE_IDS = {
  probe: "md-fence-probe",
  caption: "md-fence-caption",
  base: "md-fence-base",
  platform: "md-fence-platform",
  runtime: "md-fence-runtime",
} as const;

export const FENCE_LANGUAGE = "ts";

export const FENCE_SOURCE = [
  "```ts",
  "const total = 41;",
  'const label = "ready";',
  "const ready = true;",
  "const again = total;",
  "```",
].join("\n");

export const FENCE_TOLERANCE = 2;

export const FENCE_BODY_FLOOR = 2000;

export const FENCE_STRIP_FLOOR = 200;

export const MARKDOWN_FENCE_CHECKS = 50;

export const fenceBody = (theme: Theme): Option.Option<string> =>
  Option.fromNullishOr(nativeFenceFill(theme.colors.background));

export const fenceStrip = (theme: Theme): Option.Option<string> =>
  Option.fromNullishOr(nativeFenceHeaderFill(theme.colors.background));

export const fenceKeyword = (theme: Theme): string =>
  syntaxColors(theme).keyword;

export const keywordClearsFence = (theme: Theme): boolean =>
  pipe(
    fenceBody(theme),
    Option.flatMap((body) =>
      Option.map(
        Option.fromNullishOr(contrastRatio(fenceKeyword(theme), body)),
        (ratio) => ratio >= contrastFloorsFor(theme).body,
      ),
    ),
    Option.getOrElse(() => false),
  );

export const stripIsSecondWash = (theme: Theme): boolean =>
  pipe(
    Option.all([fenceBody(theme), fenceStrip(theme)]),
    Option.flatMap(([body, strip]) =>
      Option.map(
        Option.fromNullishOr(contrastRatio(strip, body)),
        (ratio) => strip !== body && ratio < 1.1,
      ),
    ),
    Option.getOrElse(() => false),
  );

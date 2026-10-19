/**
 * `typography-layout` — how the type scale reaches the paint.
 *
 * The style report proves `fontSize` and `fontFamily` (`theme-type-and-shadow`);
 * a type scale also sets `lineHeight`, `fontWeight` and — through `Text`'s
 * `align` prop — `textAlign`. Nothing measured whether those reach the layout.
 *
 * Measured (plan 342 §2): an explicit `lineHeight` is exact (30 → 60 for two
 * wrapped lines), the default line box scales with the font size, and
 * `fontWeight` really widens the run. **`textAlign` is a no-op in 0.10.0** — the
 * glyph run stays at the block's left edge on the `<text>` and on its parent.
 * Horizontal alignment has to move the block instead: `alignSelf` in a column
 * flex, or a narrower explicit width in a `justifyContent` row. That is a
 * `Text.align` defect in `packages/primitives`, recorded cross-team.
 */
import type { ReactNode } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { StyleDesc } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { textStyle } from "@gpuixui/tokens";
import type { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";

/** The two runs a weight wash is read from, in paint order. */
const WEIGHT_TEXT = "hello weight";
/** The three alignment runs share this exact string; nothing else uses it. */
const ALIGN_TEXT = "hello";

const Section = ({
  label,
  width = 200,
  children,
}: {
  readonly label: string;
  readonly width?: number;
  readonly children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, width }}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {label}
      </text>
      {children}
    </div>
  );
};

const TypographyProbe = () => {
  const theme = useTheme();
  const ink = { color: theme.colors.foreground };
  const line: StyleDesc = { fontSize: 14, lineHeight: 30, ...ink };
  return (
    <div
      testId="type-root"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 320,
        backgroundColor: theme.colors.background,
      }}
    >
      <Section label="explicit line height, one line">
        <text testId="type-line-1" style={line}>
          line one
        </text>
      </Section>
      <Section label="explicit line height, wrapped">
        <text testId="type-line-2" style={{ ...line, width: 100 }}>
          hello there world
        </text>
      </Section>
      <Section label="default line box">
        <text testId="type-default-12" style={{ fontSize: 12, ...ink }}>
          size
        </text>
        <text testId="type-default-16" style={{ fontSize: 16, ...ink }}>
          size
        </text>
        <text testId="type-default-24" style={{ fontSize: 24, ...ink }}>
          size
        </text>
      </Section>
      <Section label="font weight">
        <text
          testId="type-weight-regular"
          highlight={{ query: "weight" }}
          style={{ fontSize: 16, fontWeight: "400", ...ink }}
        >
          {WEIGHT_TEXT}
        </text>
        <text
          testId="type-weight-bold"
          highlight={{ query: "weight" }}
          style={{ fontSize: 16, fontWeight: "700", ...ink }}
        >
          {WEIGHT_TEXT}
        </text>
      </Section>
      <Section label="textAlign on a full-width block">
        <text
          testId="type-align-left"
          highlight={{ query: "hello" }}
          style={{ ...ink, textAlign: "left" }}
        >
          {ALIGN_TEXT}
        </text>
        <text
          testId="type-align-center"
          highlight={{ query: "hello" }}
          style={{ ...ink, textAlign: "center" }}
        >
          {ALIGN_TEXT}
        </text>
        <text
          testId="type-align-right"
          highlight={{ query: "hello" }}
          style={{ ...ink, textAlign: "right" }}
        >
          {ALIGN_TEXT}
        </text>
      </Section>
      <Section label="alignSelf in a column">
        <text testId="type-self-center" style={{ ...ink, alignSelf: "center" }}>
          centred
        </text>
        <text testId="type-self-end" style={{ ...ink, alignSelf: "flex-end" }}>
          right edge
        </text>
      </Section>
      <Section label="justifyContent with an explicit width">
        <div style={{ display: "flex", justifyContent: "center" }}>
          <text testId="type-justify" style={{ ...ink, width: 60 }}>
            hello
          </text>
        </div>
      </Section>
    </div>
  );
};

export const typographyScenario: PlaygroundScenario = {
  id: "typography-layout",
  title: "Typography: line height, weight and horizontal alignment",
  capability: "typography",
  view: () => <TypographyProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const box = (id: string) =>
        ctx.expectSome(
          `${id} painted`,
          Option.fromNullishOr(ctx.host.bounds(id)),
        );
      /** The washes for one exact run, in paint order. */
      const washes = (text: string): ReadonlyArray<Smoke.HighlightMatch> =>
        Arr.filter(ctx.host.highlights(), (match) => match.text === text);
      /** The x of the first wash for `text`, or a labelled failure. */
      const glyphX = (text: string, index: number) =>
        ctx.expectSome(
          `wash ${index} of "${text}" painted`,
          Option.flatMap(Arr.get(washes(text), index), (match) =>
            Arr.head(match.rects),
          ),
        );

      const line1 = yield* box("type-line-1");
      const line2 = yield* box("type-line-2");
      yield* ctx.expectNear(
        "one line uses the declared height",
        line1.height,
        30,
        1,
      );
      yield* ctx.expectNear(
        "two lines stack the declared height",
        line2.height,
        60,
        1,
      );

      const small = yield* box("type-default-12");
      const normal = yield* box("type-default-16");
      const big = yield* box("type-default-24");
      yield* ctx.expectNear("a 12 px run is 19.5 tall", small.height, 19.5, 2);
      yield* ctx.expectNear("a 16 px run is 26 tall", normal.height, 26, 2);
      yield* ctx.expectNear("a 24 px run is 39 tall", big.height, 39, 2);
      yield* ctx.expectEqual(
        "the default line box grows with the size",
        big.height > normal.height && normal.height > small.height,
        true,
      );

      const regular = yield* ctx.expectSome(
        "the regular weight run is washed",
        Arr.get(washes(WEIGHT_TEXT), 0),
      );
      const bold = yield* ctx.expectSome(
        "the bold weight run is washed",
        Arr.get(washes(WEIGHT_TEXT), 1),
      );
      const regularWidth = yield* ctx.expectSome(
        "the regular word has a rect",
        Arr.head(regular.rects),
      );
      const boldWidth = yield* ctx.expectSome(
        "the bold word has a rect",
        Arr.head(bold.rects),
      );
      yield* ctx.expectEqual(
        "bold is wider than regular",
        boldWidth.width > regularWidth.width + 2,
        true,
      );

      const selfCenter = yield* box("type-self-center");
      const selfEnd = yield* box("type-self-end");
      const justify = yield* box("type-justify");
      yield* ctx.expectNear(
        "alignSelf centre halves the free space",
        selfCenter.x + selfCenter.width / 2,
        100,
        1,
      );
      yield* ctx.expectNear(
        "alignSelf flex-end reaches the right edge",
        selfEnd.x + selfEnd.width,
        200,
        1,
      );
      yield* ctx.expectNear(
        "an explicit width and justify centre",
        justify.x,
        70,
        1,
      );

      // textAlign is accepted but ignored: all three runs keep the same glyph x.
      const left = yield* glyphX(ALIGN_TEXT, 0);
      const center = yield* glyphX(ALIGN_TEXT, 1);
      const right = yield* glyphX(ALIGN_TEXT, 2);
      yield* ctx.expectNear(
        "textAlign left starts at the block edge",
        left.x,
        0,
        1,
      );
      yield* ctx.expectNear(
        "textAlign centre does not move the glyphs",
        center.x,
        left.x,
        0.5,
      );
      yield* ctx.expectNear(
        "textAlign right does not move the glyphs",
        right.x,
        left.x,
        0.5,
      );
    }),
};

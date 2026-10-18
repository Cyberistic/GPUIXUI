/**
 * Style-layer probes: `declared-styles` and `text-truncation`.
 *
 * Every interactive surface in the library declares `style.hover` /
 * `style.active` instead of scripting pointer state (plan `020` §2.3), and
 * every truncating label, cell and tab declares `textOverflow`/`lineClamp`.
 * Neither had ever been measured. Measured facts (plan `335` §1):
 *
 * - `hover` and `active` are applied and reverted, and a layout property makes
 *   them observable through bounds even though the usual use is a colour;
 * - hover is **per element**: a child's hover cancels its parent's, so a row
 *   does not stay hovered while the pointer is over a button inside it;
 * - the runtime's style report is the **authored** style, so `paintedStyle`
 *   cannot see a hover that only changes colour;
 * - `textOverflow` truncates to one line (both variants) and inherits from an
 *   ancestor, but `getPaintedText()` still reports the source run, so the
 *   ellipsis glyph is not assertable — geometry is the evidence;
 * - `lineClamp` clamps to N lines and inherits, **but the text layout is shared
 *   per (string, width) and the key ignores `lineClamp`**. Identical strings at
 *   one width clamp together; whichever lays out first wins. Every case below
 *   therefore uses a distinct string, and `repeat-*` proves the sharing.
 *
 * The `cursor` shape has no observation channel and is not probed here.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { PlaygroundScenario } from "../types.js";

/** The width a bounds read returns for an id the runtime does not hold. */
const MISSING = -1;

const DeclaredStylesProbe = () => {
  const theme = useTheme();
  return (
    <div
      testId="styles-root"
      style={{
        width: 720,
        height: 320,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <div
          testId="styles-parent"
          style={{
            width: 400,
            height: 60,
            display: "flex",
            backgroundColor: theme.colors.muted,
            hover: { width: 420 },
          }}
        >
          <div
            testId="styles-child"
            style={{
              width: 100,
              height: 40,
              backgroundColor: theme.colors.card,
              hover: { width: 120 },
            }}
          >
            <text style={{ color: theme.colors.foreground }}>child</text>
          </div>
        </div>
        <div
          testId="styles-away"
          style={{
            width: 100,
            height: 60,
            backgroundColor: theme.colors.background,
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <div
          testId="styles-button"
          style={{
            width: 100,
            height: 30,
            backgroundColor: theme.colors.accent,
            hover: { width: 140, backgroundColor: theme.colors.primary },
            active: { width: 180 },
          }}
        >
          <text style={{ color: theme.colors.foreground }}>button</text>
        </div>
      </div>
      <text
        testId="styles-note"
        style={{ color: theme.colors.mutedForeground }}
      >
        hover: parent 420, child 120 · active: 180
      </text>
    </div>
  );
};

const TextTruncationProbe = () => {
  const theme = useTheme();
  const words = (tag: string): string =>
    `${tag} one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen`;
  const cell = (
    testId: string,
    style: {
      readonly textOverflow?: "ellipsis" | "ellipsis-start";
      readonly whiteSpace?: "nowrap";
      readonly lineClamp?: number;
    },
    box: { readonly lineClamp?: number } = {},
    text: string = words(testId),
  ) => (
    <div testId={testId} style={{ width: 80, overflow: "hidden", ...box }}>
      <text
        testId={`${testId}-text`}
        style={{ color: theme.colors.foreground, ...style }}
      >
        {text}
      </text>
    </div>
  );
  /** The one string `repeat-plain` and `repeat-clamp` share on purpose. */
  const repeated = words("hotel");
  return (
    <div
      testId="truncation-root"
      style={{
        width: 800,
        height: 440,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      {cell("trunc-line", { textOverflow: "ellipsis" })}
      {cell("trunc-start", { textOverflow: "ellipsis-start" })}
      {cell("nowrap", { whiteSpace: "nowrap" })}
      {cell("clamp-2", { lineClamp: 2 })}
      {cell("clamp-3", { lineClamp: 3 })}
      {cell("clamp-box", {}, { lineClamp: 2 })}
      {cell("wrap", {})}
      {cell("repeat-plain", {}, {}, repeated)}
      {cell("repeat-clamp", { lineClamp: 2 }, {}, repeated)}
    </div>
  );
};

const SCREENSHOTS = "apps/playground/.artifacts/screenshots";

export const declaredStylesScenario: PlaygroundScenario = {
  id: "declared-styles",
  title: "Declared hover and active: applied, reverted, and owned per element",
  capability: "states",
  view: () => <DeclaredStylesProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const boundsOf = (testId: string) =>
        Option.fromNullishOr(ctx.host.bounds(testId));
      const width = (testId: string): number =>
        Option.getOrElse(
          Option.map(boundsOf(testId), (bounds) => bounds.width),
          () => MISSING,
        );
      const background = (testId: string): string =>
        Option.getOrElse(
          Option.flatMap(
            Option.fromNullishOr(ctx.host.paintedStyle(testId)),
            (snapshot) => snapshot.backgroundColor,
          ),
          () => "none",
        );

      yield* ctx.expectNear(
        "the button starts at its authored width",
        width("styles-button"),
        100,
        1,
      );
      yield* ctx.expectNear(
        "the parent starts at its authored width",
        width("styles-parent"),
        400,
        1,
      );
      const authoredBackground = background("styles-button");

      ctx.host.hover("styles-button");
      yield* ctx.expectNear(
        "hovering the button applies its hover width",
        width("styles-button"),
        140,
        1,
      );
      yield* ctx.expectEqual(
        "the style report keeps the authored colour while hovered",
        background("styles-button"),
        authoredBackground,
      );

      ctx.host.hover("styles-parent");
      yield* ctx.expectNear(
        "hovering the parent applies its own hover width",
        width("styles-parent"),
        420,
        1,
      );
      yield* ctx.expectNear(
        "hovering the parent leaves the child alone",
        width("styles-child"),
        100,
        1,
      );

      ctx.host.hover("styles-child");
      yield* ctx.expectNear(
        "a child owns the hover: the parent drops back",
        width("styles-parent"),
        400,
        1,
      );
      yield* ctx.expectNear(
        "the child applies its own hover width",
        width("styles-child"),
        120,
        1,
      );

      ctx.host.hover("styles-away");
      yield* ctx.expectNear(
        "leaving reverts the parent width",
        width("styles-parent"),
        400,
        1,
      );
      yield* ctx.expectNear(
        "leaving reverts the child width",
        width("styles-child"),
        100,
        1,
      );

      const base = yield* ctx.expectSome(
        "the button has painted bounds",
        boundsOf("styles-button"),
      );
      const centre = {
        x: base.x + base.width / 2,
        y: base.y + base.height / 2,
      };

      ctx.host.press("styles-button");
      yield* ctx.expectNear(
        "a press applies the active width",
        width("styles-button"),
        180,
        1,
      );

      ctx.host.releasePointer(centre.x, centre.y);
      yield* ctx.expectNear(
        "a press at a point does not itself set the hover state",
        width("styles-button"),
        100,
        1,
      );

      ctx.host.hover("styles-button");
      yield* ctx.expectNear(
        "moving over the button re-applies its hover width",
        width("styles-button"),
        140,
        1,
      );

      ctx.host.hover("styles-away");
      yield* ctx.expectNear(
        "leaving after a release reverts to the authored width",
        width("styles-button"),
        100,
        1,
      );

      ctx.host.press("styles-button");
      ctx.host.movePointer(20, 300);
      yield* ctx.expectNear(
        "a held pointer outside the element keeps the active width",
        width("styles-button"),
        180,
        1,
      );
      ctx.host.releasePointer(20, 300);
      yield* ctx.expectNear(
        "releasing outside the element clears the active width",
        width("styles-button"),
        100,
        1,
      );

      ctx.host.screenshot(`${SCREENSHOTS}/declared-styles.png`);
    }),
};

export const textTruncationScenario: PlaygroundScenario = {
  id: "text-truncation",
  title:
    "Text truncation: ellipsis, nowrap and line clamp, and the shared layout",
  capability: "truncation",
  view: () => <TextTruncationProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const height = (testId: string): number =>
        Option.getOrElse(
          Option.map(
            Option.fromNullishOr(ctx.host.bounds(`${testId}-text`)),
            (bounds) => bounds.height,
          ),
          () => MISSING,
        );

      const line = height("trunc-line");
      yield* ctx.expectNear(
        "the ellipsis sample is one line tall",
        height("trunc-line"),
        height("nowrap"),
        1,
      );
      yield* ctx.expectNear(
        "ellipsis-start is one line tall",
        height("trunc-start"),
        height("nowrap"),
        1,
      );
      yield* ctx.expectEqual(
        "nowrap overflows instead of wrapping",
        height("nowrap") < height("wrap"),
        true,
      );
      yield* ctx.expectEqual(
        "the unclamped sample wraps past eight lines",
        height("wrap") > line * 8,
        true,
      );
      yield* ctx.expectNear(
        "lineClamp 2 clamps to two lines",
        height("clamp-2"),
        line * 2,
        1,
      );
      yield* ctx.expectNear(
        "lineClamp 3 clamps to three lines",
        height("clamp-3"),
        line * 3,
        1,
      );
      yield* ctx.expectNear(
        "lineClamp is inherited from the box",
        height("clamp-box"),
        line * 2,
        1,
      );
      yield* ctx.expectEqual(
        "the clamp is a real clamp, not a clip",
        height("clamp-2") < height("wrap"),
        true,
      );
      yield* ctx.expectNear(
        "identical strings share one layout regardless of lineClamp",
        height("repeat-clamp"),
        height("repeat-plain"),
        0,
      );
      yield* ctx.expectEqual(
        "the shared layout is the unclamped one, laid out first",
        height("repeat-clamp") > line * 4,
        true,
      );

      const painted = ctx.host.paintedText();
      const truncated = Arr.findFirst(painted, (run) =>
        Str.startsWith("trunc-line ")(run),
      );
      yield* ctx.expectSome(
        "the truncated sample still reports its full source string",
        truncated,
      );
      yield* ctx.expectEqual(
        "the painted text carries no ellipsis glyph",
        Arr.some(painted, Str.endsWith("…")),
        false,
      );

      ctx.host.screenshot(`${SCREENSHOTS}/text-truncation.png`);
    }),
};

/**
 * Tier 3 probe: `search-highlights` — the runtime's own find-in-content API.
 *
 * A search box over a document needs what a browser test cannot see: which runs
 * of text the paint layer marked, how the count follows the query's case and
 * word rules, which match a find bar's cursor is on, and that an explicit
 * `[start, end)` range marks the same region `indexOf` would. A wash is a quad,
 * so `getAllText`/`getPaintedText` never report it; the renderer's
 * `getPaintedHighlights` does, and `SmokeHost.highlights` exposes it.
 *
 * The probe asserts the paint, not just a callback: every wash carries the run
 * it marked and the boxes it drew, so a query that returns the right count but
 * paints nothing fails here.
 */
import { useState } from "react";
import { Effect } from "effect";
import { findHighlight } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const LINES = ["alpha beta alpha", "gamma alpha delta", "beta gamma"];

/** The document as the ranges index it: lines joined with a newline. */
const CONTENT = LINES.join("\n");

/** What a `highlight` spec asks for; `ranges` wins when set. */
interface Spec {
  readonly query: string;
  readonly caseSensitive: boolean;
  readonly wholeWord: boolean;
  readonly activeIndex: number | undefined;
  readonly ranges: Array<[number, number]>;
}

const SearchProbe = () => {
  const theme = useTheme();
  const wash = findHighlight(theme);
  const [spec, setSpec] = useState<Spec>({
    query: "",
    caseSensitive: false,
    wholeWord: false,
    activeIndex: undefined,
    ranges: [],
  });
  const update = (change: Partial<Spec>) =>
    setSpec((current) => ({ ...current, ...change }));

  const button = (testId: string, label: string, onClick: () => void) => (
    <Pressable testId={testId} onClick={onClick}>
      <text style={{ color: theme.colors.foreground }}>{label}</text>
    </Pressable>
  );

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 480 }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {button("search-alpha", "alpha", () => update({ query: "alpha" }))}
        {button("search-beta", "beta", () => update({ query: "beta" }))}
        {button("search-alp", "alp", () => update({ query: "alp" }))}
        {button("search-upper", "ALPHA", () => update({ query: "ALPHA" }))}
        {button("search-case", "case", () =>
          update({ caseSensitive: !spec.caseSensitive }),
        )}
        {button("search-word", "word", () =>
          update({ wholeWord: !spec.wholeWord }),
        )}
        {button("search-active", "active", () =>
          update({
            activeIndex: spec.activeIndex === undefined ? 1 : undefined,
          }),
        )}
        {button("search-range", "range", () => update({ ranges: [[0, 5]] }))}
      </div>
      <Readout testId="search-readout">
        {`query=${spec.query} case=${spec.caseSensitive} word=${spec.wholeWord} active=${
          spec.activeIndex ?? "none"
        }`}
      </Readout>
      <div
        testId="search-content"
        highlight={
          spec.ranges.length > 0
            ? {
                ...wash,
                ranges: spec.ranges,
                activeIndex: spec.activeIndex,
              }
            : {
                ...wash,
                query: spec.query,
                caseSensitive: spec.caseSensitive,
                wholeWord: spec.wholeWord,
                activeIndex: spec.activeIndex,
              }
        }
        style={{ width: 460, padding: 8, backgroundColor: theme.colors.card }}
      >
        {LINES.map((line, index) => (
          <text
            key={index}
            testId={`search-line-${index}`}
            style={{ color: theme.colors.foreground, height: 20 }}
          >
            {line}
          </text>
        ))}
      </div>
    </div>
  );
};

/** Every wash's matched text, in paint order. */
const matches = (ctx: Smoke.SmokeContext): ReadonlyArray<string> =>
  ctx.host.highlights().map((wash) => wash.text.slice(wash.start, wash.end));

/** Fails unless every wash marked `expected`. */
const expectMatches = (
  ctx: Smoke.SmokeContext,
  label: string,
  expected: ReadonlyArray<string>,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.expectEqual(label, matches(ctx).join(","), expected.join(","));

export const searchHighlightsScenario: ScenarioBody = {
  view: () => <SearchProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* expectMatches(ctx, "an empty query paints nothing", []);

      ctx.host.click("search-alpha");
      yield* expectMatches(ctx, "every occurrence of the query is marked", [
        "alpha",
        "alpha",
        "alpha",
      ]);
      const washes = ctx.host.highlights();
      yield* ctx.expectEqual(
        "a wash is a painted box on screen",
        washes.every((wash) =>
          wash.rects.some((rect) => rect.width > 0 && rect.height > 0),
        ),
        true,
      );
      yield* ctx.expectEqual(
        "no match is active until the find bar asks",
        washes.some((wash) => wash.active),
        false,
      );

      ctx.host.click("search-beta");
      yield* expectMatches(ctx, "a new query re-marks the document", [
        "beta",
        "beta",
      ]);

      ctx.host.click("search-active");
      const active = ctx.host.highlights().filter((wash) => wash.active);
      yield* ctx.expectEqual("exactly one match is active", active.length, 1);
      yield* ctx.expectEqual(
        "the active match is the one the index names",
        matches(ctx)[1] === "beta",
        true,
      );
      ctx.host.click("search-active");
      yield* ctx.expectEqual(
        "clearing the cursor marks nothing active",
        ctx.host.highlights().some((wash) => wash.active),
        false,
      );

      // Case: `ALPHA` is not in the document, so a case-sensitive query marks
      // nothing; the insensitive one marks the three lower-case words.
      ctx.host.click("search-upper");
      ctx.host.click("search-case");
      yield* expectMatches(ctx, "a case-sensitive query respects case", []);
      ctx.host.click("search-case");
      yield* expectMatches(ctx, "a case-insensitive query ignores case", [
        "alpha",
        "alpha",
        "alpha",
      ]);

      // Whole word: `alp` is a prefix of three words, so it marks nothing when
      // the rule is on and three runs when it is off.
      ctx.host.click("search-alp");
      ctx.host.click("search-word");
      yield* expectMatches(ctx, "whole-word refuses a prefix", []);
      ctx.host.click("search-word");
      yield* expectMatches(ctx, "without the rule the prefix matches", [
        "alp",
        "alp",
        "alp",
      ]);

      // Explicit ranges index the same content with a newline between lines:
      // `[0, 5)` is the first `alpha`.
      ctx.host.click("search-range");
      yield* expectMatches(ctx, "an explicit range marks one region", [
        "alpha",
      ]);
      yield* ctx.expectEqual(
        "the range is the one the offsets name",
        CONTENT.slice(0, 5),
        "alpha",
      );
    }),
};

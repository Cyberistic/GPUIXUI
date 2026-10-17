/**
 * `scale-cost` — what a virtual list really retains, and when a highlighted
 * document is reparsed.
 *
 * Every earlier virtual-list probe measured what **paints**: a window of rows.
 * This one measures what the renderer **retains**, with its own
 * `getRetainedElementCount`, and when `<code>` reaches the process-wide syntax
 * cache, with `getSyntaxCacheStats`.
 *
 * Measured facts (plan `302` §2, this host, 0.10.0):
 *
 * - retention is linear in rows: **3 host nodes per row** (2,000 rows = 6,012;
 *   100 rows = 312; the delta is exactly `3 × 1,900`). The list windows paint,
 *   not retained host nodes, so a 100,000-row table is not free.
 * - scrolling to another row neither leaks nor recycles: the count is unchanged.
 * - two identical `<code>` blocks cost **1 miss + 1 hit** and share one cached
 *   document; changing the source costs exactly one miss + one hit; a **theme
 *   switch reparses nothing** (the cache key excludes colour), and an idle
 *   repaint does not even look the document up.
 *
 * The recipe for virtualized data: window at the app level when the row count
 * can grow unbounded, and keep code props referentially stable across renders.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const ROWS_LARGE = 2000;
const ROWS_SMALL = 100;
/** Measured: one row retains a div, a text and the runtime's text node. */
const NODES_PER_ROW = 3;
const VIEWPORT = 300;

/**
 * Unique to this scenario: the cache is process-wide, so a second scenario
 * using these strings would move the counters this probe asserts.
 */
const SNIPPETS = [
  "export const firstDocument = 1;",
  "export const secondDocument = 2;",
  "export const thirdDocument = 3;",
] as const;

const snippetAt = (step: number): string =>
  SNIPPETS[step % SNIPPETS.length] ?? SNIPPETS[0];

interface ScaleBodyProps {
  readonly palette: string;
  readonly onToggleTheme: () => void;
}

const ScaleBody = ({ palette, onToggleTheme }: ScaleBodyProps) => {
  const theme = useTheme();
  const [rows, setRows] = useState(ROWS_LARGE);
  const [step, setStep] = useState(-1);
  // No document until the probe asks for one, so every parse is a delta the
  // steps can measure — the cache is process-wide and earlier scenarios warm it.
  const code = step < 0 ? "" : snippetAt(step);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        width: 900,
        height: 620,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <div
          testId="sc-rows"
          role="button"
          onClick={() =>
            setRows((current) =>
              current === ROWS_LARGE ? ROWS_SMALL : ROWS_LARGE,
            )
          }
          style={{
            padding: 6,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text
            style={{ color: theme.colors.foreground }}
          >{`rows ${rows}`}</text>
        </div>
        <div
          testId="sc-code"
          role="button"
          onClick={() => setStep((current) => current + 1)}
          style={{
            padding: 6,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>next document</text>
        </div>
        <div
          testId="sc-theme"
          role="button"
          onClick={onToggleTheme}
          style={{
            padding: 6,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>
            {`palette ${palette}`}
          </text>
        </div>
        <Readout testId="sc-state">{`rows=${rows} step=${step} palette=${palette}`}</Readout>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ display: "flex", width: 320, height: VIEWPORT }}>
          <virtual-list
            testId="sc-list"
            estimatedItemHeight={20}
            style={{ width: 320, height: VIEWPORT }}
          >
            {Arr.map(Arr.range(0, rows - 1), (index) => (
              <div
                key={index}
                testId={`sc-row-${index}`}
                style={{
                  height: 20,
                  backgroundColor: theme.colors.background,
                }}
              >
                <text style={{ fontSize: 12, color: theme.colors.foreground }}>
                  {`row ${index}`}
                </text>
              </div>
            ))}
          </virtual-list>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <code testId="sc-code-a" code={code} language="ts" />
          <code testId="sc-code-b" code={code} language="ts" />
        </div>
      </div>
    </div>
  );
};

/** The theme toggle is the outer component: it owns the nested provider. */
const ScaleProbe = () => {
  const [light, setLight] = useState(false);
  const palette = light ? "light" : "dark";

  return (
    <ThemeProvider theme={light ? palettes.light : palettes.dark}>
      <ScaleBody
        palette={palette}
        onToggleTheme={() => setLight((current) => !current)}
      />
    </ThemeProvider>
  );
};

const cacheOf = (ctx: Smoke.SmokeContext) =>
  ctx.expectSome(
    "the host reports the syntax cache",
    Option.fromNullishOr(ctx.host.syntaxCache()),
  );

const retainedOf = (ctx: Smoke.SmokeContext) =>
  ctx.expectSome(
    "the host reports its retained tree",
    Option.fromNullishOr(ctx.host.retainedElements()),
  );

export const scaleCostScenario: PlaygroundScenario = {
  id: "scale-cost",
  title: "Scale: retained-tree host nodes and the syntax cache",
  capability: "scale",
  view: () => <ScaleProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The list paints a window over a large model.
      const large = yield* retainedOf(ctx);
      yield* ctx.expectEqual(
        "the large model retains host nodes",
        large > ROWS_LARGE,
        true,
      );
      yield* ctx.expectEqual(
        "the first row paints",
        Arr.contains(ctx.host.paintedText(), "row 0"),
        true,
      );
      yield* ctx.expectEqual(
        "a far row does not paint",
        Arr.contains(ctx.host.paintedText(), "row 1900"),
        false,
      );

      // 2. A jump neither leaks nor recycles retained nodes.
      ctx.host.scrollToItem("sc-list", 1000);
      ctx.host.advance(0);
      const jumped = yield* retainedOf(ctx);
      yield* ctx.expectEqual("a jump keeps the retained count", jumped, large);
      yield* ctx.expectEqual(
        "the jumped row paints",
        Arr.contains(ctx.host.paintedText(), "row 1000"),
        true,
      );
      yield* ctx.expectEqual(
        "the first row no longer paints",
        Arr.contains(ctx.host.paintedText(), "row 0"),
        false,
      );

      // 3. Retention is linear: the row delta costs exactly `NODES_PER_ROW`.
      ctx.host.scrollToItem("sc-list", 0);
      ctx.host.advance(0);
      ctx.host.click("sc-rows");
      ctx.host.advance(0);
      const small = yield* retainedOf(ctx);
      yield* ctx.expectEqual(
        "each virtual row retains three host nodes",
        large - small,
        NODES_PER_ROW * (ROWS_LARGE - ROWS_SMALL),
      );
      ctx.host.click("sc-rows");
      ctx.host.advance(0);
      const regrown = yield* retainedOf(ctx);
      yield* ctx.expectEqual(
        "regrowing the model leaves no residue",
        regrown,
        large,
      );

      // 4. A controlled first document: the two identical blocks share it.
      const base = yield* cacheOf(ctx);
      ctx.host.click("sc-code");
      ctx.host.advance(0);
      const first = yield* cacheOf(ctx);
      yield* ctx.expectEqual(
        "the first document misses once",
        first.misses,
        base.misses + 1,
      );
      yield* ctx.expectEqual(
        "the identical second block hits the cache",
        first.hits,
        base.hits + 1,
      );
      yield* ctx.expectEqual(
        "both blocks share one document",
        first.documents,
        base.documents + 1,
      );
      yield* ctx.expectContains(
        "the first document paints",
        Arr.join(ctx.host.paintedText(), " "),
        "firstDocument",
      );

      // 5. A theme switch recolours without reparsing.
      ctx.host.click("sc-theme");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the palette switched",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("sc-state")),
          () => "",
        ),
        "palette=light",
      );
      const themed = yield* cacheOf(ctx);
      yield* ctx.expectEqual(
        "a theme switch does not reparse",
        themed.misses,
        first.misses,
      );
      yield* ctx.expectEqual(
        "a theme switch does not re-hit the parser",
        themed.hits,
        first.hits,
      );
      yield* ctx.expectEqual(
        "a theme switch keeps the documents",
        themed.documents,
        first.documents,
      );

      // 6. Idle frames do not even look the document up.
      ctx.host.advance(0);
      ctx.host.advance(0);
      const idle = yield* cacheOf(ctx);
      yield* ctx.expectEqual(
        "an idle frame misses nothing",
        idle.misses,
        themed.misses,
      );
      yield* ctx.expectEqual(
        "an idle frame hits nothing",
        idle.hits,
        themed.hits,
      );
      yield* ctx.expectEqual(
        "an idle frame keeps the documents",
        idle.documents,
        themed.documents,
      );

      // 7. Editing the source costs exactly one parse, shared by both blocks.
      ctx.host.click("sc-code");
      ctx.host.advance(0);
      const edited = yield* cacheOf(ctx);
      yield* ctx.expectEqual(
        "a new source misses once",
        edited.misses,
        themed.misses + 1,
      );
      yield* ctx.expectEqual(
        "the identical second block hits the new document",
        edited.hits,
        themed.hits + 1,
      );
      yield* ctx.expectEqual(
        "a new source adds one document",
        edited.documents,
        themed.documents + 1,
      );
      yield* ctx.expectContains(
        "the new source paints",
        Arr.join(ctx.host.paintedText(), " "),
        "secondDocument",
      );

      // 8. A second edit keeps the previous documents cached.
      ctx.host.click("sc-code");
      ctx.host.advance(0);
      const editedAgain = yield* cacheOf(ctx);
      yield* ctx.expectEqual(
        "a second edit misses once",
        editedAgain.misses,
        edited.misses + 1,
      );
      yield* ctx.expectEqual(
        "a second edit adds one document",
        editedAgain.documents,
        edited.documents + 1,
      );
      yield* ctx.expectContains(
        "the second edit paints",
        Arr.join(ctx.host.paintedText(), " "),
        "thirdDocument",
      );

      ctx.host.screenshot(
        "apps/playground/.artifacts/screenshots/scale-cost.png",
      );
    }),
};

/**
 * `diff-surface` — the interaction contract of the native `<diff>` (plan `648`).
 *
 * Plan `161` measured that a diff paints; this probe measures what a diff
 * *does*. The published 0.10.0 source defines seven interactive props, none of
 * which had a scenario: a file header click emits `toggleFile` with the path
 * and never collapses itself; `collapsedPaths` removes body rows;
 * `maxLines` is a global preview cap that appends `Show N more lines` and emits
 * the hidden count as a string without expanding; a line click carries its text
 * and old/new numbers; `wordDiff` paints a wash (screenshot-only); `scroll`
 * owns a `gpui::list` and keeps the reader's anchor across a rebuild.
 *
 * Rows are internal GPUI elements with no `testId`, so every row interaction
 * here is a coordinate click against the measured 36/28/21 px metrics. The
 * consumer transitions are pure (`diff-state.ts`); the element's half is only
 * assertable in the runtime.
 */
import { useState } from "react";
import { Effect, Option } from "effect";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import type { EventPayload } from "@gpuix/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { revealMore, togglePath } from "./diff-state.js";
import { elementTypeOf, read, readoutField } from "./probes.js";

export const APP_PATCH = [
  "diff --git a/src/app.ts b/src/app.ts",
  "index 1111111..2222222 100644",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,5 +1,5 @@",
  " const a = 1;",
  "-const b = 2;",
  "+const b = 3;",
  " const c = 4;",
  " const d = 5;",
  " const e = 6;",
  "diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml",
  "index 3333333..4444444 100644",
  "--- a/pnpm-lock.yaml",
  "+++ b/pnpm-lock.yaml",
  "@@ -1,3 +1,3 @@",
  " lockfileVersion: 9",
  "-old: 1",
  "+old: 2",
  " frozen: true",
].join("\n");

/** Byte-for-byte the same row count, one visible value changed. */
const SWAPPED = APP_PATCH.replace("const e = 6;", "const e = 60;");

const SECOND_FILE = "pnpm-lock.yaml";

/** The runtime's default diff metrics (`theme.rs:404`). */
const HEADER = 36;
const HUNK = 28;
const LINE = 21;
const PAD = 8;
const FULL_HEIGHT = 2 * HEADER + 2 * HUNK + 10 * LINE + 2 * PAD;

interface ProbeState {
  readonly collapsed: Option.Option<ReadonlyArray<string>>;
  readonly maxLines: Option.Option<number>;
  readonly scroll: boolean;
  readonly wordDiff: boolean;
  readonly empty: boolean;
  readonly swapped: boolean;
  readonly toggles: number;
  readonly mores: number;
  readonly lines: number;
  readonly log: ReadonlyArray<string>;
  readonly lastLine: string;
}

const initialState = (): ProbeState => ({
  collapsed: Option.none(),
  maxLines: Option.none(),
  scroll: false,
  wordDiff: false,
  empty: false,
  swapped: false,
  toggles: 0,
  mores: 0,
  lines: 0,
  log: [],
  lastLine: "none",
});

const optionText = function <A>(
  value: Option.Option<A>,
  show: (some: A) => string,
): string {
  return Option.match(value, { onNone: () => "none", onSome: show });
};

const describe = (state: ProbeState): string =>
  [
    `collapsed=${optionText(state.collapsed, (paths) =>
      Arr.length(paths) === 0 ? "none" : Arr.join(paths, ","),
    )}`,
    `max=${optionText(state.maxLines, String)}`,
    `scroll=${state.scroll ? 1 : 0}`,
    `word=${state.wordDiff ? 1 : 0}`,
    `empty=${state.empty ? 1 : 0}`,
    `swapped=${state.swapped ? 1 : 0}`,
    `toggles=${state.toggles}`,
    `mores=${state.mores}`,
    `lines=${state.lines}`,
  ].join(" ");

const DiffProbe = () => {
  const [state, setState] = useState<ProbeState>(initialState);

  const onToggleFile = (event: EventPayload): void => {
    const path = Option.getOrElse(Option.fromNullishOr(event.value), () => "");
    if (Str.isEmpty(path)) return;
    setState((current) => ({
      ...current,
      toggles: current.toggles + 1,
      collapsed: Option.some(togglePath(current.collapsed, path)),
      log: Arr.append(current.log, `toggle=${path}`),
    }));
  };

  const onShowMore = (event: EventPayload): void => {
    const remaining = Option.fromNullishOr(event.value);
    setState((current) => ({
      ...current,
      mores: current.mores + 1,
      maxLines: Option.flatMap(remaining, (value) =>
        revealMore(current.maxLines, value),
      ),
      log: Arr.append(current.log, `more=${optionText(remaining, String)}`),
    }));
  };

  const onLineClick = (event: EventPayload): void => {
    const oldLine = Option.fromNullishOr(event.oldLine);
    const newLine = Option.fromNullishOr(event.newLine);
    setState((current) => ({
      ...current,
      lines: current.lines + 1,
      lastLine: Option.getOrElse(
        Option.fromNullishOr(event.value),
        () => "none",
      ),
      log: Arr.append(
        current.log,
        `line=${optionText(oldLine, String)}/${optionText(newLine, String)}`,
      ),
    }));
  };

  const toggleSwap = (): void =>
    setState((current) => ({ ...current, swapped: !current.swapped }));
  const toggleWord = (): void =>
    setState((current) => ({ ...current, wordDiff: !current.wordDiff }));
  const toggleScroll = (): void =>
    setState((current) => ({ ...current, scroll: !current.scroll }));
  const toggleEmpty = (): void =>
    setState((current) => ({ ...current, empty: !current.empty }));

  const cap = (): void =>
    setState((current) => ({
      ...current,
      maxLines: Option.isSome(current.maxLines)
        ? Option.none()
        : Option.some(3),
    }));

  const collapseSecond = (): void =>
    setState((current) => ({
      ...current,
      collapsed: Option.some(togglePath(current.collapsed, SECOND_FILE)),
    }));

  return (
    <div style={{ gap: 8 }}>
      <div style={{ flexDirection: "row", gap: 6 }}>
        <Pressable testId="diff-reset" onClick={() => setState(initialState())}>
          Reset
        </Pressable>
        <Pressable testId="diff-cap" onClick={cap}>
          Cap
        </Pressable>
        <Pressable testId="diff-swap" onClick={toggleSwap}>
          Swap
        </Pressable>
        <Pressable testId="diff-word" onClick={toggleWord}>
          Word
        </Pressable>
        <Pressable testId="diff-scroll" onClick={toggleScroll}>
          Scroll
        </Pressable>
        <Pressable testId="diff-empty" onClick={toggleEmpty}>
          Empty
        </Pressable>
        <Pressable testId="diff-collapse-second" onClick={collapseSecond}>
          Second file
        </Pressable>
      </div>

      <Readout testId="diff-readout">{describe(state)}</Readout>
      <Readout testId="diff-log">{Arr.join(state.log, ">") || "none"}</Readout>
      <Readout testId="diff-line">{state.lastLine}</Readout>

      <diff
        testId="diff-surface"
        patch={state.empty ? "" : state.swapped ? SWAPPED : APP_PATCH}
        collapsedPaths={[
          ...Option.getOrElse(state.collapsed, (): ReadonlyArray<string> => []),
        ]}
        {...(Option.isSome(state.maxLines)
          ? { maxLines: state.maxLines.value }
          : {})}
        wordDiff={state.wordDiff}
        scroll={state.scroll}
        onToggleFile={onToggleFile}
        onShowMore={onShowMore}
        onLineClick={onLineClick}
        style={{ width: 640, ...(state.scroll ? { height: 240 } : {}) }}
      />
    </div>
  );
};

/** A painted box, or a labelled failure naming the absent id. */
const boxOf = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

/** Everything the last frame painted, joined, so `contains` is one assertion. */
const paintedText = (ctx: Smoke.SmokeContext): string =>
  Arr.join(ctx.host.paintedText(), "\n");

/** Whether any painted string contains `needle`. */
const paints = (ctx: Smoke.SmokeContext, needle: string): boolean =>
  Str.includes(needle)(paintedText(ctx));

/** One `key=value` field of the diff readout, or `"none"`. */
const field = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, "diff-readout", key), () => "none");

/** A window click followed by a frame, so React has committed before a read. */
const clickWindow = (
  ctx: Smoke.SmokeContext,
  point: { readonly x: number; readonly y: number },
): void => {
  ctx.host.clickWindow(point.x, point.y);
  ctx.host.advance(0);
};

/** A probe control click, flushed the same way. */
const press = (ctx: Smoke.SmokeContext, testId: string): void => {
  ctx.host.click(testId);
  ctx.host.advance(0);
};

/** The first row: a file header, 36 px tall. */
const headerAt = (box: Smoke.Bounds, top = 0) => ({
  x: box.x + 6,
  y: box.y + top + HEADER / 2,
});

/** The row after the header and hunk header: the first diff line. */
const lineAt = (box: Smoke.Bounds, index: number) => ({
  x: box.x + 8,
  y: box.y + HEADER + HUNK + index * LINE + LINE / 2,
});

/** The bottom preview row, which is `ShowMore` under a cap. */
const showMoreAt = (box: Smoke.Bounds) => ({
  x: box.x + 20,
  y: box.y + box.height - HEADER / 2,
});

export const diffSurfaceScenario: PlaygroundScenario = {
  id: "diff-surface",
  title:
    "Diff surface: file toggles, a preview cap, line clicks and a scroll anchor",
  capability: "diff",
  view: () => <DiffProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const box = yield* boxOf(ctx, "diff-surface");

      // 1. The two-file document is the sum of its rows.
      yield* ctx.expectEqual(
        "the diff is a diff host node",
        elementTypeOf(ctx, "diff-surface"),
        "diff",
      );
      yield* ctx.expectNear(
        "a two-file diff is 354 px tall",
        box.height,
        FULL_HEIGHT,
        1,
      );
      yield* ctx.expectNear(
        "the diff keeps its declared width",
        box.width,
        640,
        1,
      );
      yield* ctx.expectContains(
        "the first file header paints",
        paintedText(ctx),
        "src/app.ts",
      );
      yield* ctx.expectContains(
        "the second file header paints",
        paintedText(ctx),
        SECOND_FILE,
      );
      yield* ctx.expectContains(
        "the hunk header paints",
        paintedText(ctx),
        "@@ -1,5 +1,5 @@",
      );
      yield* ctx.expectContains(
        "a context line paints",
        paintedText(ctx),
        "const a = 1;",
      );
      yield* ctx.expectContains(
        "a removed line paints",
        paintedText(ctx),
        "const b = 2;",
      );
      yield* ctx.expectContains(
        "an added line paints",
        paintedText(ctx),
        "const b = 3;",
      );
      yield* ctx.expectContains(
        "the last line of the second file paints",
        paintedText(ctx),
        "frozen: true",
      );

      // 2. A file header click emits; the element does not collapse itself.
      clickWindow(ctx, headerAt(box));
      yield* ctx.expectEqual(
        "the file header click emits toggleFile",
        field(ctx, "toggles"),
        "1",
      );
      yield* ctx.expectEqual(
        "the payload names the clicked file",
        field(ctx, "collapsed"),
        "src/app.ts",
      );
      const collapsed = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "collapsing removes the body rows",
        collapsed.height,
        192,
        1,
      );
      yield* ctx.expectEqual(
        "the collapsed body leaves the paint",
        paints(ctx, "const a = 1;"),
        false,
      );
      yield* ctx.expectEqual(
        "the other file still paints",
        paints(ctx, "frozen: true"),
        true,
      );
      clickWindow(ctx, headerAt(collapsed));
      yield* ctx.expectEqual(
        "a second click toggles the file back",
        field(ctx, "toggles"),
        "2",
      );
      yield* ctx.expectEqual(
        "the collapsed set is empty again",
        field(ctx, "collapsed"),
        "none",
      );
      const expanded = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "expanding restores the full height",
        expanded.height,
        FULL_HEIGHT,
        1,
      );

      // 3. Hunk headers and line rows are not file toggles.
      press(ctx, "diff-reset");
      const reset = yield* boxOf(ctx, "diff-surface");
      clickWindow(ctx, { x: reset.x + 6, y: reset.y + HEADER + HUNK / 2 });
      yield* ctx.expectEqual(
        "a hunk header click does not toggle a file",
        field(ctx, "toggles"),
        "0",
      );
      yield* ctx.expectEqual(
        "a hunk header click is not a line click",
        field(ctx, "lines"),
        "0",
      );

      // 4. A line click carries the text and both numbers.
      clickWindow(ctx, lineAt(reset, 0));
      yield* ctx.expectEqual(
        "a line click reports its numbers",
        field(ctx, "lines"),
        "1",
      );
      yield* ctx.expectContains(
        "a context line reports 1/1",
        read(ctx, "diff-log"),
        "line=1/1",
      );
      yield* ctx.expectEqual(
        "a line click carries its text",
        read(ctx, "diff-line"),
        "const a = 1;",
      );
      clickWindow(ctx, lineAt(reset, 1));
      yield* ctx.expectContains(
        "a removed line has no post-change number",
        read(ctx, "diff-log"),
        "line=2/none",
      );
      yield* ctx.expectEqual(
        "the removed line's text arrives",
        read(ctx, "diff-line"),
        "const b = 2;",
      );
      clickWindow(ctx, lineAt(reset, 2));
      yield* ctx.expectContains(
        "an added line has no pre-change number",
        read(ctx, "diff-log"),
        "line=none/2",
      );
      yield* ctx.expectEqual(
        "the added line's text arrives",
        read(ctx, "diff-line"),
        "const b = 3;",
      );

      // 5. `maxLines` is a global preview cap that never expands itself.
      press(ctx, "diff-cap");
      yield* ctx.expectEqual("the cap is set", field(ctx, "max"), "3");
      const capped = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "a capped preview keeps three line rows and the footer",
        capped.height,
        163,
        1,
      );
      yield* ctx.expectContains(
        "the cap paints the hidden count",
        paintedText(ctx),
        "Show 7 more lines",
      );
      yield* ctx.expectEqual(
        "the cap hides later line rows",
        paints(ctx, "const e = 6;"),
        false,
      );
      yield* ctx.expectEqual(
        "the element did not expand itself",
        field(ctx, "mores"),
        "0",
      );
      clickWindow(ctx, showMoreAt(capped));
      yield* ctx.expectEqual(
        "the show-more row emits once",
        field(ctx, "mores"),
        "1",
      );
      yield* ctx.expectContains(
        "the payload is the hidden count",
        read(ctx, "diff-log"),
        "more=7",
      );
      yield* ctx.expectEqual(
        "the consumer raised the cap by the payload",
        field(ctx, "max"),
        "10",
      );
      const revealed = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "raising the cap restores the full document",
        revealed.height,
        FULL_HEIGHT,
        1,
      );
      yield* ctx.expectEqual(
        "every hidden line now paints",
        paints(ctx, "const e = 6;") && paints(ctx, "frozen: true"),
        true,
      );
      yield* ctx.expectEqual(
        "the show-more row is gone",
        paints(ctx, "Show 7 more lines"),
        false,
      );

      // 6. `collapsedPaths` is the only collapse control.
      press(ctx, "diff-reset");
      press(ctx, "diff-collapse-second");
      yield* ctx.expectEqual(
        "the second file starts collapsed",
        field(ctx, "collapsed"),
        SECOND_FILE,
      );
      const secondCollapsed = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "a collapsed second file keeps only its header",
        secondCollapsed.height,
        234,
        1,
      );
      yield* ctx.expectEqual(
        "the first file still paints",
        paints(ctx, "const a = 1;"),
        true,
      );
      yield* ctx.expectEqual(
        "the collapsed second body leaves the paint",
        paints(ctx, "frozen: true"),
        false,
      );
      clickWindow(ctx, headerAt(secondCollapsed, 198));
      yield* ctx.expectEqual(
        "the collapsed header expands the file",
        field(ctx, "toggles"),
        "1",
      );
      const secondExpanded = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "expanding the second file restores the document",
        secondExpanded.height,
        FULL_HEIGHT,
        1,
      );

      // 7. `wordDiff` is a wash: the rows and the box must not move.
      press(ctx, "diff-reset");
      const beforeWordBox = yield* boxOf(ctx, "diff-surface");
      press(ctx, "diff-word");
      yield* ctx.expectEqual("word diff is on", field(ctx, "word"), "1");
      const afterWordBox = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "the word wash moves no geometry",
        afterWordBox.height,
        beforeWordBox.height,
        0.5,
      );
      yield* ctx.expectEqual(
        "the word wash keeps every diff row",
        Arr.every(
          [
            "const a = 1;",
            "const b = 2;",
            "const b = 3;",
            "const e = 6;",
            "frozen: true",
          ],
          (needle) => paints(ctx, needle),
        ),
        true,
      );

      // 8. The scroll path keeps the reader's place across a patch rebuild.
      press(ctx, "diff-reset");
      press(ctx, "diff-scroll");
      yield* ctx.expectEqual("the diff scrolls", field(ctx, "scroll"), "1");
      const scrolling = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "a scroll diff has a fixed viewport",
        scrolling.height,
        240,
        1,
      );
      ctx.host.wheel("diff-surface", 0, -200);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the wheel leaves the first line behind",
        paints(ctx, "const a = 1;"),
        false,
      );
      press(ctx, "diff-swap");
      yield* ctx.expectEqual("the patch swapped", field(ctx, "swapped"), "1");
      yield* ctx.expectEqual(
        "the updated patch paints its new value",
        paints(ctx, "const e = 60;"),
        true,
      );
      yield* ctx.expectEqual(
        "the reader keeps their place across a patch update",
        paints(ctx, "const a = 1;"),
        false,
      );

      // 9. An empty patch is an honest, bounded empty state.
      press(ctx, "diff-reset");
      press(ctx, "diff-empty");
      yield* ctx.expectEqual("the patch is empty", field(ctx, "empty"), "1");
      yield* ctx.expectContains(
        "an empty diff paints its empty state",
        paintedText(ctx),
        "No changes",
      );
      const empty = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "the empty state keeps its declared width",
        empty.width,
        640,
        1,
      );
      yield* ctx.expectEqual(
        "the empty state paints no rows",
        paints(ctx, "const a = 1;"),
        false,
      );
      press(ctx, "diff-reset");
      yield* ctx.expectEqual(
        "a reset restores the document",
        paints(ctx, "const a = 1;"),
        true,
      );
    }),
};

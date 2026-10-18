/**
 * `multi-pane-editor` — a two-pane editing layout (plan `375`).
 *
 * The Tier 4 row "Multi-pane editing layouts" had no runtime evidence. Every
 * ingredient was measured alone — a pointer-captured split (`panel-nested`),
 * independently scrolling panes (`workspace-panes`, `app-chrome`), a read-only
 * `<code>` that copies without its line-number chrome (`text-selection`) — but
 * no probe had composed two tabbed panes each holding a scrolling code surface
 * around one live split. This measures:
 *
 * - a `<code>` surface panning inside an `overflowY: "scroll"` viewport (the
 *   painted box moves with the offset, the height does not change);
 * - independent pane offsets, and a click that makes a pane active and gives it
 *   native focus;
 * - an in-place tab swap that keeps the other pane's document and offset, and
 *   starts the new document at its own top;
 * - a split drag that re-widths both code surfaces without touching the offsets;
 * - a selection inside one pane, and across both panes with the tab chrome
 *   excluded by `userSelect: "none"`.
 *
 * `<code>` is read-only; 0.10.0 has no editable syntax surface (plan `333`).
 * The probe measures the layout contract, not an editor's text model.
 */
import { useRef, useState, type RefObject } from "react";
import { Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { SplitPane } from "../panels/split-pane.js";
import { ariaOf, readoutField, text } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const FRAME_WIDTH = 860;
const SPLIT_HEIGHT = 400;
const TAB_STRIP = 28;
const VIEWPORT_HEIGHT = 372;
const PANE_INITIAL = 420;
const PANE_MIN = 260;
const PANE_MAX = 560;
const DIVIDER = 6;
const WHEEL = -200;
const DRAG = 80;

/** A pane id, used for test ids and the readout. */
type PaneId = "a" | "b";

/** The lines of one document: unique, so a failure names the missing line. */
const lines = (prefix: string, count: number): string =>
  Arr.join(
    Arr.map(
      Arr.range(0, count - 1),
      (index) => `const ${prefix}${index} = ${index};`,
    ),
    "\n",
  );

const ALPHA = lines("alpha", 80);
const HELPER = lines("helper", 30);
const BETA = lines("beta", 60);
const NOTES = lines("note", 20);

const codeOf = (pane: PaneId, document: string): string =>
  Match.value(pane).pipe(
    Match.when("a", () =>
      Match.value(document).pipe(
        Match.when("util", () => HELPER),
        Match.orElse(() => ALPHA),
      ),
    ),
    Match.when("b", () =>
      Match.value(document).pipe(
        Match.when("notes", () => NOTES),
        Match.orElse(() => BETA),
      ),
    ),
    Match.exhaustive,
  );

interface EditorPaneProps {
  readonly id: PaneId;
  readonly tabs: ReadonlyArray<string>;
  readonly document: string;
  readonly viewportRef: RefObject<PublicInstance | null>;
  readonly onSelectTab: (document: string) => void;
  readonly onActivate: () => void;
  readonly onScrollY: (y: number) => void;
}

/** One pane: a tab strip over a scrolling, read-only code surface. */
const EditorPane = ({
  id,
  tabs,
  document,
  viewportRef,
  onSelectTab,
  onActivate,
  onScrollY,
}: EditorPaneProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const label = `Editor ${id.toUpperCase()}`;

  /** The viewport's post-scroll offset; `onScroll` is the only writer. */
  const syncScroll = (): void => {
    Option.match(Option.fromNullishOr(viewportRef.current?.id), {
      onNone: () => {},
      onSome: (elementId) =>
        Option.match(
          Option.fromNullishOr(renderer?.getScrollOffset?.(elementId)),
          {
            onNone: () => {},
            onSome: (offset) => onScrollY(offset[1] ?? 0),
          },
        ),
    });
  };

  /**
   * A tab swap starts the new document at the top.
   *
   * The runtime silently clamps a shorter document's offset and fires no
   * `onScroll` for it (measured in plan `375` §8), so keeping the old offset
   * would leave both the scroller and the readout disagreeing. A per-tab
   * restore needs a post-layout pass; this probe owns the simple policy.
   */
  const selectTab = (tab: string): void => {
    onSelectTab(tab);
    onActivate();
    Option.match(Option.fromNullishOr(viewportRef.current?.id), {
      onNone: () => {},
      onSome: (elementId) => renderer?.scrollTo?.(elementId, 0, 0),
    });
    onScrollY(0);
  };

  return (
    <div
      testId={`editor-${id}-pane`}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: theme.colors.card,
      }}
    >
      <div
        testId={`editor-${id}-strip`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          height: TAB_STRIP,
          flexShrink: 0,
          paddingLeft: 4,
          userSelect: "none",
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
        }}
      >
        {Arr.map(tabs, (tab) => (
          <Pressable
            key={tab}
            testId={`editor-${id}-tab-${tab}`}
            onClick={() => selectTab(tab)}
            style={{
              height: 22,
              padding: 0,
              paddingLeft: 8,
              paddingRight: 8,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor:
                document === tab ? theme.colors.background : theme.colors.muted,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              {tab}
            </text>
          </Pressable>
        ))}
      </div>
      <div
        ref={viewportRef}
        testId={`editor-${id}-viewport`}
        aria-id={`editor-surface-${id}`}
        aria-label={label}
        role="textbox"
        tabIndex={0}
        onClick={onActivate}
        onScroll={syncScroll}
        style={{
          width: "100%",
          height: VIEWPORT_HEIGHT,
          overflowY: "scroll",
          overflowX: "hidden",
          backgroundColor: theme.colors.background,
        }}
      >
        <code
          testId={`editor-${id}-code`}
          code={codeOf(id, document)}
          language="ts"
          showLineNumbers
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
};

const MultiPaneEditorProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const viewportA = useRef<PublicInstance | null>(null);
  const viewportB = useRef<PublicInstance | null>(null);
  const [active, setActive] = useState<PaneId>("a");
  const [split, setSplit] = useState(PANE_INITIAL);
  const [aDocument, setADocument] = useState("main");
  const [bDocument, setBDocument] = useState("main");
  const [aY, setAY] = useState(0);
  const [bY, setBY] = useState(0);

  /** Focus a viewport by its runtime id, or nothing when it never painted. */
  const focus = (instance: PublicInstance | null): void => {
    Option.match(Option.fromNullishOr(instance?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
  };

  /** A programmatic scroll of pane A, mirrored into the readout. */
  const scrollHomeA = (): void => {
    Option.match(Option.fromNullishOr(viewportA.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollTo?.(id, 0, 0),
    });
    setAY(0);
  };

  return (
    <div
      testId="editor-frame"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: FRAME_WIDTH,
      }}
    >
      <div
        testId="editor-split-surface"
        style={{
          width: FRAME_WIDTH,
          height: SPLIT_HEIGHT,
          backgroundColor: theme.colors.background,
        }}
      >
        <SplitPane
          id="editor"
          initial={PANE_INITIAL}
          min={PANE_MIN}
          max={PANE_MAX}
          label="Resize editors"
          onResize={setSplit}
          primary={
            <EditorPane
              id="a"
              tabs={["main", "util"]}
              document={aDocument}
              viewportRef={viewportA}
              onSelectTab={setADocument}
              onActivate={() => setActive("a")}
              onScrollY={setAY}
            />
          }
          secondary={
            <EditorPane
              id="b"
              tabs={["main", "notes"]}
              document={bDocument}
              viewportRef={viewportB}
              onSelectTab={setBDocument}
              onActivate={() => setActive("b")}
              onScrollY={setBY}
            />
          }
        />
      </div>

      <Readout testId="editor-state">
        {`active=${active} split=${split} aY=${aY} bY=${bY} aTab=${aDocument} bTab=${bDocument}`}
      </Readout>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Pressable
          testId="editor-focus-a"
          onClick={() => {
            setActive("a");
            focus(viewportA.current);
          }}
        >
          <text style={{ color: theme.colors.foreground }}>focus a</text>
        </Pressable>
        <Pressable
          testId="editor-focus-b"
          onClick={() => {
            setActive("b");
            focus(viewportB.current);
          }}
        >
          <text style={{ color: theme.colors.foreground }}>focus b</text>
        </Pressable>
        <Pressable testId="editor-scroll-home-a" onClick={scrollHomeA}>
          <text style={{ color: theme.colors.foreground }}>home a</text>
        </Pressable>
      </div>
    </div>
  );
};

/** A `key=value` field of the state readout, or `"none"`. */
const stateField = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, "editor-state", key), () => "none");

/** A viewport's vertical offset, or `0` when it never reported one. */
const offsetY = (ctx: Smoke.SmokeContext, testId: string): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.scrollOffset(testId)),
      (offset) => offset.y,
    ),
    () => 0,
  );

/** The selected text, treating `null` as empty. */
const selection = (ctx: Smoke.SmokeContext, from: string, to: string): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.selectText(from, to)),
    () => "",
  );

/** Whether the painted text contains `needle` on any line. */
const paints = (ctx: Smoke.SmokeContext, needle: string): boolean =>
  Arr.some(ctx.host.paintedText(), Str.includes(needle));

const boundsOrFail = (ctx: Smoke.SmokeContext, testId: string, label: string) =>
  ctx.expectSome(label, Option.fromNullishOr(ctx.host.bounds(testId)));

export const multiPaneEditorScenario: PlaygroundScenario = {
  id: "multi-pane-editor",
  title: "Multi-pane editor: tabs, scrolling code and a live split",
  capability: "editor",
  view: () => <MultiPaneEditorProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // Geometry: two panes around one divider, a strip over each viewport.
      const paneA = yield* boundsOrFail(ctx, "editor-pane-a", "pane A paints");
      const paneB = yield* boundsOrFail(ctx, "editor-pane-b", "pane B paints");
      const divider = yield* boundsOrFail(
        ctx,
        "editor-divider",
        "the divider paints",
      );
      const viewportA = yield* boundsOrFail(
        ctx,
        "editor-a-viewport",
        "pane A's viewport paints",
      );
      yield* ctx.expectNear("pane A starts at 420 px", paneA.width, 420, 1);
      yield* ctx.expectNear("the divider is 6 px wide", divider.width, 6, 1);
      yield* ctx.expectNear(
        "pane B starts after the divider",
        paneB.x,
        paneA.x + 420 + DIVIDER,
        1,
      );
      yield* ctx.expectNear(
        "the viewport sits under the tab strip",
        viewportA.y,
        paneA.y + TAB_STRIP,
        1,
      );
      yield* ctx.expectNear(
        "the viewport is the pane's remaining height",
        viewportA.height,
        372,
        1,
      );
      yield* ctx.expectEqual(
        "the editor starts on pane A, tab one",
        stateField(ctx, "active") + ":" + stateField(ctx, "aTab"),
        "a:main",
      );

      // Documents: both code surfaces paint, and the strip names both tabs.
      yield* boundsOrFail(ctx, "editor-a-code", "pane A's code paints");
      yield* boundsOrFail(ctx, "editor-b-code", "pane B's code paints");
      yield* ctx.expectEqual(
        "both documents paint their first line",
        paints(ctx, "alpha0") && paints(ctx, "beta0"),
        true,
      );
      yield* ctx.expectEqual(
        "both tab strips paint their tabs",
        paints(ctx, "util") && paints(ctx, "notes"),
        true,
      );

      // Selection stays in one pane, and crossing the split joins both.
      const inside = selection(ctx, "editor-a-code", "editor-a-code");
      yield* ctx.expectContains(
        "a drag inside pane A copies its code",
        inside,
        "alpha0",
      );
      yield* ctx.expectEqual(
        "a drag inside pane A leaves pane B out",
        Str.includes("beta0")(inside),
        false,
      );
      const crossing = selection(ctx, "editor-a-code", "editor-b-code");
      yield* ctx.expectContains(
        "a cross-pane drag copies pane A",
        crossing,
        "alpha0",
      );
      yield* ctx.expectContains(
        "a cross-pane drag copies pane B",
        crossing,
        "beta0",
      );
      yield* ctx.expectEqual(
        "the tab chrome stays out of the drag",
        Str.includes("notes")(crossing) || Str.includes("util")(crossing),
        false,
      );

      // A click focuses a pane and makes it the active one.
      ctx.host.click("editor-b-viewport");
      yield* ctx.expectEqual(
        "a click on pane B makes it active",
        stateField(ctx, "active"),
        "b",
      );
      yield* ctx.expectEqual(
        "a click gives the viewport native focus",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "editor-b-viewport",
      );

      // The wheel pans the code, and only pane A.
      const codeABefore = yield* boundsOrFail(
        ctx,
        "editor-a-code",
        "pane A's code paints before the wheel",
      );
      const codeAHeight = codeABefore.height;
      ctx.host.wheel("editor-a-viewport", 0, WHEEL);
      yield* ctx.expectNear(
        "the wheel scrolls pane A",
        offsetY(ctx, "editor-a-viewport"),
        WHEEL,
        2,
      );
      yield* ctx.expectNear(
        "the wheel leaves pane B alone",
        offsetY(ctx, "editor-b-viewport"),
        0,
        2,
      );
      yield* ctx.expectEqual(
        "the readout reports the A offset",
        stateField(ctx, "aY"),
        "-200",
      );
      yield* ctx.expectEqual(
        "the readout keeps the B offset at zero",
        stateField(ctx, "bY"),
        "0",
      );
      const codeAAfter = yield* boundsOrFail(
        ctx,
        "editor-a-code",
        "pane A's code paints after the wheel",
      );
      yield* ctx.expectNear(
        "the code box moves with the offset",
        codeAAfter.y,
        codeABefore.y + WHEEL,
        1,
      );
      yield* ctx.expectNear(
        "the code keeps its height while it pans",
        codeAAfter.height,
        codeAHeight,
        1,
      );

      // A tab swap is in place: the other pane and both offsets survive.
      ctx.host.click("editor-a-tab-util");
      yield* ctx.expectEqual(
        "the util tab swaps pane A's document",
        paints(ctx, "helper0") && !paints(ctx, "alpha0"),
        true,
      );
      yield* ctx.expectEqual(
        "the swap leaves pane B's document painted",
        paints(ctx, "beta0"),
        true,
      );
      yield* ctx.expectEqual(
        "the swap makes its pane active",
        stateField(ctx, "active"),
        "a",
      );
      yield* ctx.expectEqual(
        "the tab takes native focus",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "editor-a-tab-util",
      );
      yield* ctx.expectNear(
        "the swap starts the shorter document at the top",
        offsetY(ctx, "editor-a-viewport"),
        0,
        2,
      );
      yield* ctx.expectEqual(
        "the reset reaches the readout",
        stateField(ctx, "aY"),
        "0",
      );
      yield* ctx.expectNear(
        "the swap keeps pane B's offset",
        offsetY(ctx, "editor-b-viewport"),
        0,
        2,
      );
      ctx.host.click("editor-a-tab-main");
      yield* ctx.expectEqual(
        "switching back restores the first document",
        paints(ctx, "alpha0"),
        true,
      );
      yield* ctx.expectNear(
        "switching back starts the long document at the top too",
        offsetY(ctx, "editor-a-viewport"),
        0,
        2,
      );

      // A live split re-widths both code surfaces and moves no offset.
      ctx.host.drag("editor-divider", DRAG, 0, 6);
      yield* ctx.expectEqual(
        "the divider drag sets the split to 500",
        stateField(ctx, "split"),
        "500",
      );
      const grown = yield* boundsOrFail(
        ctx,
        "editor-pane-a",
        "pane A paints after the resize",
      );
      yield* ctx.expectNear("pane A grew to 500 px", grown.width, 500, 1);
      const codeAGrown = yield* boundsOrFail(
        ctx,
        "editor-a-code",
        "pane A's code paints after the resize",
      );
      yield* ctx.expectNear(
        "the code follows its pane",
        codeAGrown.width,
        500,
        1,
      );
      const codeBGrown = yield* boundsOrFail(
        ctx,
        "editor-b-code",
        "pane B's code paints after the resize",
      );
      yield* ctx.expectNear(
        "pane B's code follows its narrower pane",
        codeBGrown.width,
        FRAME_WIDTH - 500 - DIVIDER,
        1,
      );
      yield* ctx.expectNear(
        "the resize keeps pane A's offset",
        offsetY(ctx, "editor-a-viewport"),
        0,
        2,
      );
      yield* ctx.expectNear(
        "the resize keeps pane B's offset",
        offsetY(ctx, "editor-b-viewport"),
        0,
        2,
      );

      // The divider is a focused keyboard splitter, and the panes are named.
      ctx.host.click("editor-divider");
      ctx.host.key("end");
      yield* ctx.expectEqual(
        "End clamps the split at its maximum",
        stateField(ctx, "split"),
        "560",
      );
      const surfaceA = yield* ctx.expectSome(
        "pane A is exposed to assistive technology",
        ariaOf(ctx, "editor-surface-a"),
      );
      yield* ctx.expectEqual(
        "pane A is a named TextInput",
        `${text(surfaceA.role)}:${text(surfaceA.label)}`,
        "TextInput:Editor A",
      );
      const surfaceB = yield* ctx.expectSome(
        "pane B is exposed to assistive technology",
        ariaOf(ctx, "editor-surface-b"),
      );
      yield* ctx.expectEqual(
        "pane B is a named TextInput",
        `${text(surfaceB.role)}:${text(surfaceB.label)}`,
        "TextInput:Editor B",
      );
      const splitter = yield* ctx.expectSome(
        "the divider is exposed to assistive technology",
        ariaOf(ctx, "editor-divider"),
      );
      yield* ctx.expectEqual(
        "the divider is a Splitter",
        text(splitter.role),
        "Splitter",
      );
      yield* ctx.expectEqual(
        "the divider carries the split size",
        text(splitter.value),
        "560px",
      );
    }),
};

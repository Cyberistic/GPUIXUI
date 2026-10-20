/**
 * The live scenarios: the shipped playground driven in a real window.
 *
 * They are deliberately few. A live window proves that the core mechanisms
 * transfer out of the offscreen `TestRenderer`; it does not repeat the headless
 * suite. It cannot assert colour or the accessibility dump — the live renderer
 * exposes no style or a11y method (plan `197`). Focus, selection, painted
 * highlights and virtual-list anchors *are* asserted: the runner owns the
 * renderer, so it reads them there even where the automation protocol has no
 * verb (plans `190`, `191`, `197`). The terminal twin (plan `532`) also proves
 * that real keystrokes reach a focused text grid, and the tree twin (plan
 * `559`) that a real wheel, click and arrows drive a changing virtual window.
 *
 * Each scenario provides its own view, which the runner mounts in the real
 * window under a keyed `Fragment` — the live twin of plan `182`'s isolation.
 */
import type { ReactNode } from "react";
import { Duration, Effect, Schedule } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { Pixels, type Smoke } from "@gpuixui/testing";
import { App } from "../app.js";
import { contextMenuScenario } from "../scenarios/context-menu.js";
import { dragAutoscrollScenario } from "../scenarios/drag-autoscroll.js";
import { dragTargetsScenario } from "../scenarios/drag-targets.js";
import { markdownScenario } from "../scenarios/markdown.js";
import { liveSurfacesView } from "../scenarios/surfaces.js";
import { diffSurfaceScenario, wordWashChecks } from "../scenarios/diff.js";
import { nestedLayerScenario } from "../scenarios/layers.js";
import { dockingScenario } from "../scenarios/docking.js";
import { floatScenario } from "../scenarios/float.js";
import { inputScenario } from "../scenarios/input.js";
import { collapsibleHeightScenario } from "../scenarios/collapsible.js";
import { layoutScenario } from "../scenarios/layout.js";
import { layoutGridScenario } from "../scenarios/layout-grid.js";
import { typographyScenario } from "../scenarios/typography.js";
import { chartScenario } from "../scenarios/chart.js";
import { qrScenario } from "../scenarios/qr-code.js";
import { QR_V1 } from "../scenarios/qr-fixtures.js";
import { inputPayloadScenario } from "../scenarios/input-payload.js";
import { modalScenario, MODAL_FOCUS_IDS } from "../scenarios/modal.js";
import { motionScenario } from "../scenarios/motion.js";
import { floatingScenario } from "../scenarios/floating.js";
import { panelScenario } from "../scenarios/panel.js";
import { panelNestedScenario } from "../scenarios/panel-nested.js";
import { previewScenario } from "../scenarios/preview.js";
import {
  primitivesActionsScenario,
  primitivesDisplayScenario,
  primitivesFieldsScenario,
} from "../scenarios/primitives.js";
import {
  primitivesChoiceScenario,
  primitivesEntryScenario,
} from "../scenarios/primitives-advanced.js";
import {
  comboboxScenario,
  selectScenario,
  tooltipScenario,
} from "../scenarios/popups.js";
import { scrollScenario } from "../scenarios/scroll.js";
import { scrollIntoViewScenario } from "../scenarios/scroll-into-view.js";
import { highlightColourChecks, searchScenario } from "../scenarios/search.js";
import { textSelectionScenario } from "../scenarios/text-selection.js";
import { selectionSignalScenario } from "../scenarios/selection-signal.js";
import { virtualizedTableScenario } from "../scenarios/virtual-table.js";
import { variableRowsScenario } from "../scenarios/variable-rows.js";
import { pointerEntryScenario } from "../scenarios/pointer-entry.js";
import { tableSelectSortScenario } from "../scenarios/table.js";
import { messageScrollerScenario } from "../scenarios/message-scroller.js";
import { logViewerScenario } from "../scenarios/log-viewer.js";
import { workspaceRestoreScenario } from "../scenarios/workspace-restore.js";
import { workspacePanesScenario } from "../scenarios/workspace-panes.js";
import { replaceScenario } from "../scenarios/replace.js";
import {
  inLine,
  inside,
  searchReplaceScenario,
} from "../scenarios/search-replace.js";
import { matchText } from "../scenarios/replace-state.js";
import { tier2DialogScenario } from "../scenarios/tier2-dialog.js";
import { tier2FoundationScenario } from "../scenarios/tier2-foundation.js";
import { tier2MenuScenario } from "../scenarios/tier2-menu.js";
import { tier2NavigationScenario } from "../scenarios/tier2-navigation.js";
import { tier2ToastScenario } from "../scenarios/tier2-toast.js";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  EXIT_MS,
  GAP,
  INSET,
  toastScenario,
} from "../scenarios/toast.js";
import { tier2ChoiceScenario } from "../scenarios/tier2-choice.js";
import { EMAIL_MESSAGE, tier2FormsScenario } from "../scenarios/tier2-forms.js";
import { tier2EditingScenario } from "../scenarios/tier2-editing.js";
import { tier2FlowScenario } from "../scenarios/tier2-flow.js";
import { tier2ScrollerScenario } from "../scenarios/tier2-scroller.js";
import { tier2CommandScenario } from "../scenarios/tier2-command.js";
import { propertyPanelScenario } from "../scenarios/property-panel.js";
import { dataGridScenario } from "../scenarios/data-grid.js";
import { dataGridColumnsScenario } from "../scenarios/data-grid-columns.js";
import { gridScenario } from "../scenarios/grid.js";
import {
  declaredStylesScenario,
  textTruncationScenario,
} from "../scenarios/styles.js";
import { columnConfigScenario } from "../scenarios/column-config.js";
import { cropScenario } from "../scenarios/crop.js";
import { mediaScenario } from "../scenarios/media.js";
import { themeColorRolesView, platformThemeView } from "../scenarios/theme.js";
import {
  pixelColourLiveScenario,
  pixelColourView,
} from "../scenarios/pixels.js";
import {
  captureLive,
  expectColour,
  expectPixel,
  pixelAtId,
  pixelAtPoint,
  readAsync,
  TOLERANCE,
} from "../scenarios/frames.js";
import { palettePixels } from "../scenarios/palette-pixels.js";
import { qrFrameChecks } from "../scenarios/qr-pixels.js";
import { palettes, type PaletteId } from "../palettes.js";
import { appChromeScenario } from "../scenarios/app-chrome.js";
import { menuBarScenario } from "../scenarios/menu-bar.js";
import { commandPaletteScenario } from "../scenarios/command-palette.js";
import { multiPaneEditorScenario } from "../scenarios/multi-pane-editor.js";
import { dataToolbarScenario } from "../scenarios/data-toolbar.js";
import { queryBuilderScenario } from "../scenarios/query-builder.js";
import { rootSingleChildScenario } from "../scenarios/root.js";
import { frameStatsScenario } from "../scenarios/frame-stats.js";
import { windowLayoutScenario } from "../scenarios/window-layout.js";
import { notificationCentreScenario } from "../scenarios/notification-centre.js";
import { wizardScenario } from "../scenarios/wizard.js";
import { gridCellEditingScenario } from "../scenarios/grid-editor.js";
import { listReorderScenario } from "../scenarios/reorder.js";
import { treeReorderScenario } from "../scenarios/tree-reorder.js";
import { tabOverflowScenario } from "../scenarios/tab-overflow.js";
import { tabFocusScenario } from "../scenarios/tab-focus.js";
import { textEntryScenario } from "../scenarios/text-entry.js";
import { virtualizedTreeScenario } from "../scenarios/virtual-tree.js";
import { rovingFocusScenario } from "../scenarios/roving-focus.js";
import { scaleCostScenario } from "../scenarios/scale.js";
import { terminalScenario } from "../scenarios/terminal.js";
import { fieldOf } from "../scenarios/probes.js";
import { KeyRoutingView } from "./key-routing.js";
import { scenarios } from "../scenarios/index.js";

/** Window size the runner opens. A check compares the shell against it. */
export const WINDOW = { width: 1100, height: 720 } as const;

/** Where the live run writes its screenshots, relative to the repo root. */
export const LIVE_ARTIFACTS = "apps/playground/.artifacts/live";

/** A live scenario: the async smoke scenario plus the view the window mounts. */
export interface LiveScenario extends Smoke.AsyncSmokeScenario {
  readonly view: () => ReactNode;
  /** The `testId` that proves the mount committed, when one does. */
  readonly ready?: string;
}

/**
 * Waits for the frame loop to commit the last input.
 *
 * The automation protocol has no frame boundary: `simulateClick` returns after
 * a tick, while React's commit lands on a later frame. Every live step settles
 * before reading, exactly as a human glance would.
 */
export const settle: Effect.Effect<void> = Effect.sleep(Duration.millis(120));

/** The registry title for `id`, so a live check never restates it. */
const titleOf = (id: string): string =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(scenarios, (candidate) => candidate.id === id),
      (candidate) => candidate.title,
    ),
    () => "none",
  );

type LiveContext = Smoke.SmokeContext<Smoke.AsyncSmokeHost>;

/** The text `testId` paints, or a failure naming the missing id. */
const textOf = (ctx: LiveContext, testId: string) =>
  Effect.gen(function* () {
    const text = yield* ctx.host.text(testId);
    return yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(text),
    );
  });

/** The change count the selection view reports. */
const countOf = (ctx: LiveContext) =>
  Effect.map(textOf(ctx, "sig-changes"), (text) =>
    Number(Str.replace("changes=", "")(text)),
  );

/** The offset `testId` reports, or a failure naming the missing id. */
const offsetOf = (ctx: LiveContext, testId: string) =>
  Effect.gen(function* () {
    const offset = yield* ctx.host.scrollOffset(testId);
    return yield* ctx.expectSome(
      `${testId} reports an offset`,
      Option.fromNullishOr(offset),
    );
  });

/** The focused `testId`, or `"none"` when nothing has focus. */
const focusedOf = (ctx: LiveContext) =>
  Effect.map(ctx.host.focused(), (id) =>
    Option.getOrElse(Option.fromNullishOr(id), () => "none"),
  );

/** Presses `key` `times` times, returning the focused id after each press. */
const walkFocus = (ctx: LiveContext, key: string, times: number) =>
  Effect.forEach(
    Arr.range(1, times),
    () =>
      Effect.gen(function* () {
        yield* ctx.host.key(key);
        yield* settle;
        return yield* ctx.host.focused();
      }),
    { concurrency: 1 },
  );

/** Walks the renderer's own focus traversal, settling after each step. */
const walkRendererFocus = (ctx: LiveContext, times: number) =>
  Effect.forEach(
    Arr.range(1, times),
    () =>
      Effect.gen(function* () {
        yield* ctx.host.focusNext();
        yield* settle;
        return yield* ctx.host.focused();
      }),
    { concurrency: 1 },
  );

/** The selection as a string, treating `null` as empty. */
const selectionText = (value: string | null): string =>
  Option.getOrElse(Option.fromNullishOr(value), () => "");

/** The painted box of `testId`, or a failure naming the missing id. */
const boxOf = (ctx: LiveContext, testId: string) =>
  Effect.gen(function* () {
    const bounds = yield* ctx.host.bounds(testId);
    return yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(bounds),
    );
  });

/** The centre of a painted box. */
const centreOf = (bounds: Smoke.Bounds) => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

/** The first index of `needle` in `text`, or `-1`. */
const indexOf = (text: string, needle: string): number =>
  Option.getOrElse(Str.indexOf(needle)(text), () => -1);

/** How many painted strings contain `needle`. */
const paintedCount = (ctx: LiveContext, needle: string) =>
  Effect.map(ctx.host.paintedText(), (lines) =>
    Arr.length(Arr.filter(lines, (entry) => Str.includes(needle)(entry))),
  );

/** Waits up to three seconds for `testId`'s painted text to contain `needle`. */
const waitForText = (ctx: LiveContext, testId: string, needle: string) =>
  ctx.host.text(testId).pipe(
    Effect.flatMap((text) =>
      text !== null && Str.includes(needle)(text)
        ? Effect.void
        : Effect.fail("not yet"),
    ),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/** Waits up to three seconds for `testId`'s painted text to stop being `value`. */
const waitForTextNot = (ctx: LiveContext, testId: string, value: string) =>
  ctx.host.text(testId).pipe(
    Effect.flatMap((text) =>
      text !== null && text !== value ? Effect.void : Effect.fail("not yet"),
    ),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/** Waits up to three seconds for `testId`'s painted text to drop `needle`. */
const waitForTextLacking = (ctx: LiveContext, testId: string, needle: string) =>
  ctx.host.text(testId).pipe(
    Effect.flatMap((text) =>
      text !== null && !Str.includes(needle)(text)
        ? Effect.void
        : Effect.fail("not yet"),
    ),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/** Waits up to three seconds for the window to paint `needle`. */
const waitForPainted = (ctx: LiveContext, needle: string) =>
  ctx.host.paintedText().pipe(
    Effect.flatMap((lines) =>
      Option.isSome(Arr.findFirst(lines, Str.includes(needle)))
        ? Effect.void
        : Effect.fail("not yet"),
    ),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/** Waits up to three seconds for `testId` to hold native focus. */
const waitForFocus = (ctx: LiveContext, testId: string) =>
  ctx.host.focused().pipe(
    Effect.flatMap((id) =>
      id === testId ? Effect.void : Effect.fail("not yet"),
    ),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/** The text once `testId` paints `needle` — a read that never races the commit. */
const awaitedTextOf = (ctx: LiveContext, testId: string, needle: string) =>
  Effect.andThen(waitForText(ctx, testId, needle), () => textOf(ctx, testId));

/** Waits up to three seconds for `testId`'s list anchor to reach `expected`. */
const waitForAnchor = (ctx: LiveContext, testId: string, expected: string) =>
  ctx.host.listScrollTop(testId).pipe(
    Effect.flatMap((anchor) =>
      anchor !== null && `${anchor[0]},${anchor[1]}` === expected
        ? Effect.void
        : Effect.fail("not yet"),
    ),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/** Waits up to three seconds for `testId`'s scroll offset on `axis` to reach `expected`. */
const waitForOffset = (
  ctx: LiveContext,
  testId: string,
  axis: "x" | "y",
  expected: number,
) =>
  ctx.host.scrollOffset(testId).pipe(
    Effect.flatMap((offset) =>
      offset !== null && offset[axis] === expected
        ? Effect.void
        : Effect.fail("not yet"),
    ),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/** Waits up to three seconds for `testId`'s painted box to satisfy `within`. */
const waitForBounds = (
  ctx: LiveContext,
  testId: string,
  within: (box: Smoke.Bounds) => boolean,
) =>
  ctx.host.bounds(testId).pipe(
    Effect.flatMap((box) =>
      box !== null && within(box) ? Effect.void : Effect.fail("not yet"),
    ),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/** The painted left edge of `testId`, or a failure naming the missing id. */
const leftOf = (ctx: LiveContext, testId: string) =>
  Effect.gen(function* () {
    const bounds = yield* ctx.host.bounds(testId);
    const box = yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(bounds),
    );
    return box.x;
  });

/** The painted width of `testId`, or a failure naming the missing id. */
const widthOf = (ctx: LiveContext, testId: string) =>
  Effect.gen(function* () {
    const bounds = yield* ctx.host.bounds(testId);
    const box = yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(bounds),
    );
    return box.width;
  });

/** Drag-selects `from` through `to` and returns the selection. */
const select = (ctx: LiveContext, from: string, to: string) =>
  Effect.map(ctx.host.selectText(from, to), selectionText);

const shell: LiveScenario = {
  id: "live-shell",
  title: "Live shell: window, navigation and keyboard",
  capability: "layout",
  view: () => <App list={scenarios} />,
  ready: "app-shell",
  steps: (ctx) =>
    Effect.gen(function* () {
      const bounds = yield* ctx.host.bounds("app-shell");
      const box = yield* ctx.expectSome(
        "the shell is painted",
        Option.fromNullishOr(bounds),
      );
      yield* ctx.expectNear(
        "the shell fills the window width",
        box.width,
        WINDOW.width,
        1,
      );
      yield* ctx.expectNear(
        "the shell fills the window height",
        box.height,
        WINDOW.height,
        1,
      );

      yield* ctx.host.click("nav-text-native");
      yield* ctx.host.waitFor("text-plain");
      yield* settle;
      const clicked = yield* textOf(ctx, "stage-title");
      yield* ctx.expectEqual(
        "clicking an entry mounts its view",
        clicked,
        titleOf("text-native"),
      );
      const stage = yield* textOf(ctx, "app-shell");
      yield* ctx.expectContains(
        "the mounted view paints its own content",
        stage,
        "hello gpuix",
      );

      yield* ctx.host.keyDown("nav-input-edit", "enter");
      yield* ctx.host.waitFor("input-field");
      yield* settle;
      const entered = yield* textOf(ctx, "stage-title");
      yield* ctx.expectEqual(
        "Enter on a focused entry switches the stage",
        entered,
        titleOf("input-edit"),
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${shell.id}.png`);
    }),
};

/**
 * The scenario filter in a real window (plan `528`).
 *
 * Headless proves the rule; this proves the path a reader takes: a controlled
 * native editor receives real keys, the sidebar unmounts the non-matches, and
 * Escape — bubbling from the filter or a focused row — restores the list
 * without losing the pick.
 */
const liveShellFilter: LiveScenario = {
  id: "live-shell-filter",
  title: "Live shell: the scenario filter in a real window",
  capability: "layout",
  // The registry is the single source of truth: looking the view up here also
  // avoids a second import edge into the shell scenario's own module (which
  // imports the registry), which would put `scenarios` in a temporal dead zone
  // while the live module evaluates.
  view: () =>
    Option.match(
      Arr.findFirst(scenarios, (scenario) => scenario.id === "shell-filter"),
      { onNone: () => null, onSome: (scenario) => scenario.view() },
    ),
  ready: "app-shell",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("shell-filter");
      yield* ctx.host.key("c r o p");
      yield* settle;
      yield* ctx.expectEqual(
        "the live filter counts only its match",
        yield* textOf(ctx, "shell-filter-count"),
        `1 of ${Arr.length(scenarios)}`,
      );
      const match = yield* ctx.host.bounds("nav-crop-area");
      yield* ctx.expectEqual(
        "the matching live entry is painted",
        match !== null,
        true,
      );
      const hidden = yield* ctx.host.bounds("nav-window-layout");
      yield* ctx.expectEqual(
        "a filtered-out live entry leaves the sidebar",
        hidden === null,
        true,
      );
      yield* ctx.expectEqual(
        "the live stage follows the first match",
        yield* textOf(ctx, "stage-title"),
        titleOf("crop-area"),
      );

      yield* ctx.host.click("nav-crop-area");
      yield* settle;
      yield* ctx.expectEqual(
        "clicking a filtered live entry mounts it",
        yield* textOf(ctx, "stage-title"),
        titleOf("crop-area"),
      );

      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectEqual(
        "Escape clears the live filter from the focused row",
        yield* textOf(ctx, "shell-filter-count"),
        `${Arr.length(scenarios)} of ${Arr.length(scenarios)}`,
      );
      const restored = yield* ctx.host.bounds("nav-window-layout");
      yield* ctx.expectEqual(
        "clearing restores the live list",
        restored !== null,
        true,
      );
      yield* ctx.expectEqual(
        "clearing keeps the live pick",
        yield* textOf(ctx, "stage-title"),
        titleOf("crop-area"),
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveShellFilter.id}.png`);
    }),
};

const input: LiveScenario = {
  id: "live-input",
  title: "Live input: typing and submit in a real editor",
  capability: "input",
  view: inputScenario.view,
  ready: "input-field",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("input-field");
      yield* ctx.host.key("h i");
      yield* settle;
      const typed = yield* textOf(ctx, "input-readout");
      yield* ctx.expectContains(
        "typing reaches onChange in the live editor",
        typed,
        "value=hi",
      );

      yield* ctx.host.key("enter");
      yield* settle;
      const submitted = yield* textOf(ctx, "input-readout");
      yield* ctx.expectContains(
        "Enter reaches onSubmit",
        submitted,
        "submits=1",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${input.id}.png`);
    }),
};

const inputPayload: LiveScenario = {
  id: "live-input-payload",
  title: "Live input payloads: click counts, key chars and precise scroll",
  capability: "input",
  view: inputPayloadScenario.view,
  ready: "payload-target",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("payload-target");
      yield* Effect.sleep(Duration.millis(80));
      yield* ctx.host.click("payload-target");
      yield* settle;
      yield* ctx.expectEqual(
        "two live clicks are two clicks",
        yield* textOf(ctx, "payload-clicks"),
        "2",
      );
      yield* ctx.expectEqual(
        "no live click is a double click",
        yield* textOf(ctx, "payload-counts"),
        "1,1",
      );

      yield* ctx.host.click("payload-field");
      yield* settle;
      yield* ctx.host.key("é");
      yield* settle;
      yield* ctx.host.key("日");
      yield* settle;
      yield* ctx.expectEqual(
        "the live editor receives non-ASCII text",
        yield* textOf(ctx, "payload-value"),
        "é日",
      );
      yield* ctx.expectEqual(
        "the live field reports each produced character",
        yield* textOf(ctx, "payload-keys"),
        "é:é|日:日",
      );

      yield* ctx.host.key("cmd-a");
      yield* settle;
      yield* ctx.host.key("space");
      yield* settle;
      yield* ctx.expectEqual(
        "the live native editor consumes select-all",
        yield* textOf(ctx, "payload-value"),
        " ",
      );

      yield* ctx.host.wheel("payload-target", 0, 40);
      yield* settle;
      yield* ctx.expectEqual(
        "a live wheel is a precise gesture",
        yield* textOf(ctx, "payload-wheel"),
        "40/true/moved",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${inputPayload.id}.png`);
    }),
};

const pointerEntry: LiveScenario = {
  id: "live-pointer-entry",
  title: "Live pointer entry: caret placement and drag selection",
  capability: "input",
  view: pointerEntryScenario.view,
  ready: "pointer-field",
  steps: (ctx) =>
    Effect.gen(function* () {
      // A click places the caret at the nearest glyph: middle, end, start.
      const field = yield* boxOf(ctx, "pointer-field");
      const mid = field.y + field.height / 2;
      yield* ctx.host.clickWindow(field.x + 25, mid);
      yield* settle;
      yield* ctx.host.key("m");
      yield* settle;
      const middle = yield* textOf(ctx, "pointer-field-readout");
      yield* ctx.expectNear(
        "a live middle click puts the caret inside the run",
        middle.indexOf("m"),
        3,
        2,
      );

      yield* ctx.host.clickWindow(field.x + field.width - 4, mid);
      yield* settle;
      yield* ctx.host.key("2");
      yield* settle;
      yield* ctx.expectEqual(
        "a live right-edge click appends",
        Str.endsWith("2")(yield* textOf(ctx, "pointer-field-readout")),
        true,
      );

      yield* ctx.host.clickWindow(field.x + 3, mid);
      yield* settle;
      yield* ctx.host.key("1");
      yield* settle;
      yield* ctx.expectEqual(
        "a live left-edge click prepends",
        Str.startsWith("1")(yield* textOf(ctx, "pointer-field-readout")),
        true,
      );

      // A press-move-release selects the run; typing replaces it. A later
      // plain click clears it, and shift-click extends from the first caret.
      const drag = yield* boxOf(ctx, "pointer-drag-field");
      const dragMid = drag.y + drag.height / 2;
      yield* ctx.host.pressWindow(drag.x + 3, dragMid);
      yield* settle;
      yield* ctx.host.movePointer(drag.x + 120, dragMid);
      yield* settle;
      yield* ctx.host.releasePointer(drag.x + 120, dragMid);
      yield* settle;
      yield* ctx.host.key("z");
      yield* settle;
      yield* ctx.expectEqual(
        "a live drag selects the whole run",
        yield* textOf(ctx, "pointer-drag-field-readout"),
        "z",
      );

      yield* ctx.host.clickWindow(drag.x + drag.width - 4, dragMid);
      yield* settle;
      yield* ctx.host.key("y");
      yield* settle;
      yield* ctx.expectEqual(
        "a plain live click clears the drag selection",
        yield* textOf(ctx, "pointer-drag-field-readout"),
        "zy",
      );

      const shiftField = yield* boxOf(ctx, "pointer-shift-field");
      const shiftMid = shiftField.y + shiftField.height / 2;
      yield* ctx.host.clickWindow(shiftField.x + 3, shiftMid);
      yield* settle;
      yield* ctx.host.clickWindow(shiftField.x + 120, shiftMid, "shift");
      yield* settle;
      yield* ctx.host.key("s");
      yield* settle;
      yield* ctx.expectEqual(
        "shift-click extends the live selection",
        yield* textOf(ctx, "pointer-shift-field-readout"),
        "s",
      );

      // A textarea takes a newline and Up returns to the previous line.
      const area = yield* boxOf(ctx, "pointer-area");
      yield* ctx.host.clickWindow(area.x + 3, area.y + 12);
      yield* settle;
      yield* ctx.host.key("x");
      yield* ctx.host.key("enter");
      yield* ctx.host.key("y");
      yield* settle;
      yield* ctx.expectEqual(
        "Enter inserts a newline in a live textarea",
        yield* textOf(ctx, "pointer-area-readout"),
        "x\ny",
      );
      const grown = yield* boxOf(ctx, "pointer-area");
      yield* ctx.expectNear(
        "a two-line live textarea autosizes",
        grown.height,
        64,
        2,
      );

      yield* ctx.host.key("up");
      yield* settle;
      yield* ctx.host.key("z");
      yield* settle;
      yield* ctx.expectEqual(
        "Up returns to the previous line live",
        yield* textOf(ctx, "pointer-area-readout"),
        "xz\ny",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${pointerEntry.id}.png`);
    }),
};

/** The placeholder authored by the `text-entry` view. */
const TEXT_ENTRY_PLACEHOLDER = "enter name";

/** One `key=value` token of the `text-entry` readout, or `""` when absent. */
const entryField = (line: string, key: string): string =>
  Option.getOrElse(fieldOf(line, key), () => "");

/** Waits until the probe's measured textarea height satisfies `within`. */
const waitForAreaHeight = (
  ctx: LiveContext,
  within: (height: number) => boolean,
) =>
  textOf(ctx, "entry-readout").pipe(
    Effect.flatMap((line) => {
      const height = Number.parseFloat(entryField(line, "areaH"));
      return Number.isFinite(height) && within(height)
        ? Effect.void
        : Effect.fail("not yet");
    }),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/**
 * Waits until the readout's `key` token is exactly `expected`.
 *
 * A substring wait is wrong for a shrinking value: `native=0axbc` is a prefix
 * of `native=0axbc9`, so a delete would appear to have landed before it did.
 */
const waitForEntryField = (ctx: LiveContext, key: string, expected: string) =>
  textOf(ctx, "entry-readout").pipe(
    Effect.flatMap((line) =>
      entryField(line, key) === expected ? Effect.void : Effect.fail("not yet"),
    ),
    Effect.retry(
      Schedule.spaced("50 millis").pipe(
        Schedule.upTo({ duration: "3 seconds" }),
      ),
    ),
    Effect.orElseSucceed(() => undefined),
  );

/**
 * `live-text-entry` — the native editor contract in a real window.
 *
 * `live-input` proves a keystroke reaches `onChange`; this twin proves what the
 * editor does inside the value: caret keys, a selection replaced by typing,
 * deletion, `readOnly`, the placeholder's paint, a clipped fixed width and a
 * `minRows`/`maxRows` autosize. The value is read from the probe's React
 * readout because the live tree carries no accessibility `value` (plan `197`);
 * focus comes from the renderer the runner owns (plan `190`).
 */
const liveTextEntry: LiveScenario = {
  id: "live-text-entry",
  title: "Live text entry: caret, selection, readOnly and autosize",
  capability: "input",
  view: textEntryScenario.view,
  ready: "entry-native",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* boxOf(ctx, "entry-native");
      yield* ctx.expectEqual(
        "the live placeholder is painted while the field is empty",
        Arr.some(
          yield* ctx.host.paintedText(),
          Str.includes(TEXT_ENTRY_PLACEHOLDER),
        ),
        true,
      );

      yield* ctx.host.click("entry-native");
      yield* settle;
      yield* ctx.host.key("a b c");
      yield* waitForEntryField(ctx, "native", "abc");
      const typed = yield* textOf(ctx, "entry-readout");
      yield* ctx.expectEqual(
        "typing reaches the live editor",
        entryField(typed, "native"),
        "abc",
      );
      yield* ctx.expectEqual(
        "one live change per character",
        entryField(typed, "events"),
        "3",
      );
      yield* ctx.expectEqual(
        "the live placeholder stops painting once text exists",
        Arr.some(
          yield* ctx.host.paintedText(),
          Str.includes(TEXT_ENTRY_PLACEHOLDER),
        ),
        false,
      );

      yield* ctx.host.key("left left x");
      yield* waitForEntryField(ctx, "native", "axbc");
      yield* ctx.expectEqual(
        "Left moves the live caret and typing inserts at it",
        entryField(yield* textOf(ctx, "entry-readout"), "native"),
        "axbc",
      );

      yield* ctx.host.key("home 0");
      yield* waitForEntryField(ctx, "native", "0axbc");
      yield* ctx.expectEqual(
        "Home moves the live caret to the start",
        entryField(yield* textOf(ctx, "entry-readout"), "native"),
        "0axbc",
      );

      yield* ctx.host.key("end 9");
      yield* waitForEntryField(ctx, "native", "0axbc9");
      yield* ctx.expectEqual(
        "End moves the live caret to the end",
        entryField(yield* textOf(ctx, "entry-readout"), "native"),
        "0axbc9",
      );

      yield* ctx.host.key("backspace");
      yield* waitForEntryField(ctx, "native", "0axbc");
      yield* ctx.expectEqual(
        "Backspace deletes one live character",
        entryField(yield* textOf(ctx, "entry-readout"), "native"),
        "0axbc",
      );

      yield* ctx.host.key("shift-left shift-left q");
      yield* waitForEntryField(ctx, "native", "0axq");
      yield* ctx.expectEqual(
        "typing replaces exactly the selected live run",
        entryField(yield* textOf(ctx, "entry-readout"), "native"),
        "0axq",
      );

      yield* ctx.host.key("cmd-a");
      yield* settle;
      yield* ctx.host.key("w");
      yield* waitForEntryField(ctx, "native", "w");
      yield* ctx.expectEqual(
        "the live editor consumes select-all, and typing replaces the value",
        entryField(yield* textOf(ctx, "entry-readout"), "native"),
        "w",
      );

      yield* ctx.host.key("backspace");
      yield* ctx.host.key("backspace");
      yield* waitForEntryField(ctx, "native", "");
      yield* ctx.expectEqual(
        "Backspace on the last character leaves a working empty field",
        entryField(yield* textOf(ctx, "entry-readout"), "native"),
        "",
      );

      yield* ctx.host.click("entry-readonly");
      yield* settle;
      yield* ctx.host.key("n o");
      yield* settle;
      yield* ctx.expectEqual(
        "the live read-only field keeps native focus",
        yield* focusedOf(ctx),
        "entry-readonly",
      );
      yield* ctx.expectEqual(
        "a live read-only field keeps its painted value",
        Arr.contains(yield* ctx.host.paintedText(), "locked"),
        true,
      );
      yield* ctx.expectEqual(
        "a live read-only field refuses the typed edit",
        Arr.some(yield* ctx.host.paintedText(), Str.includes("lockedno")),
        false,
      );
      yield* ctx.expectEqual(
        "readOnly reports no change live",
        entryField(yield* textOf(ctx, "entry-readout"), "lockedEdits"),
        "0",
      );

      yield* ctx.host.click("entry-secret");
      yield* settle;
      yield* ctx.host.key("s 3 c r 3 t 9");
      yield* waitForEntryField(ctx, "secretLen", "7");
      yield* ctx.expectEqual(
        "the live editor holds the typed secret",
        entryField(yield* textOf(ctx, "entry-readout"), "secretLen"),
        "7",
      );
      yield* ctx.expectEqual(
        "the live secret is painted in clear",
        Arr.some(yield* ctx.host.paintedText(), Str.includes("s3cr3t9")),
        true,
      );

      const wideBefore = yield* boxOf(ctx, "entry-wide");
      yield* ctx.host.click("entry-wide");
      yield* waitForFocus(ctx, "entry-wide");
      // One key per call, each followed by a frame. A long batch can paint its
      // text without committing the value in this window (measured), and a real
      // user types one key at a time anyway.
      yield* Effect.forEach(
        Arr.range(1, 40),
        () =>
          Effect.gen(function* () {
            yield* ctx.host.key("a");
            yield* settle;
          }),
        { concurrency: 1, discard: true },
      );
      yield* waitForEntryField(ctx, "wideLen", "40");
      const wideAfter = yield* boxOf(ctx, "entry-wide");
      yield* ctx.expectEqual(
        "a live fixed-width field keeps the long value",
        entryField(yield* textOf(ctx, "entry-readout"), "wideLen"),
        "40",
      );
      yield* ctx.expectNear(
        "a live fixed-width field clips a long value instead of growing",
        wideAfter.width,
        wideBefore.width,
        1,
      );

      yield* ctx.host.click("entry-area");
      yield* settle;
      yield* ctx.host.key("o n e");
      yield* waitForAreaHeight(ctx, (height) => height >= 64);
      yield* waitForEntryField(ctx, "note", "one");
      yield* settle;
      const minHeight = Number.parseFloat(
        entryField(yield* textOf(ctx, "entry-readout"), "areaH"),
      );
      yield* ctx.expectNear(
        "a live textarea starts at its minRows height",
        minHeight,
        64,
        1,
      );

      yield* ctx.host.key("enter t w o enter t h r e e enter f o u r");
      yield* waitForAreaHeight(ctx, (height) => height > minHeight);
      yield* settle;
      const fourLines = Number.parseFloat(
        entryField(yield* textOf(ctx, "entry-readout"), "areaH"),
      );
      yield* ctx.expectNear(
        "a live textarea grows with its content",
        fourLines,
        116,
        1,
      );

      yield* ctx.host.key("enter f i v e enter s i x");
      yield* waitForAreaHeight(ctx, (height) => height > fourLines);
      yield* settle;
      const sixLines = Number.parseFloat(
        entryField(yield* textOf(ctx, "entry-readout"), "areaH"),
      );
      yield* ctx.expectNear(
        "a live textarea keeps growing toward maxRows",
        sixLines,
        168,
        1,
      );

      yield* ctx.host.key("enter s e v e n");
      yield* waitForEntryField(
        ctx,
        "note",
        "one|two|three|four|five|six|seven",
      );
      const sevenLines = Number.parseFloat(
        entryField(yield* textOf(ctx, "entry-readout"), "areaH"),
      );
      yield* ctx.expectEqual(
        "a live textarea stops growing at maxRows",
        sevenLines,
        sixLines,
      );
      yield* ctx.expectEqual(
        "every entered line reaches the live editor",
        entryField(yield* textOf(ctx, "entry-readout"), "note"),
        "one|two|three|four|five|six|seven",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveTextEntry.id}.png`);
    }),
};

const scroll: LiveScenario = {
  id: "live-scroll",
  title: "Live scroll: the wheel moves a live container",
  capability: "scroll",
  view: scrollScenario.view,
  ready: "scroll-view",
  steps: (ctx) =>
    Effect.gen(function* () {
      const before = yield* offsetOf(ctx, "scroll-view");
      yield* ctx.expectEqual("the container starts at the top", before.y, 0);

      yield* ctx.host.wheel("scroll-view", 0, -200);
      yield* settle;
      const after = yield* offsetOf(ctx, "scroll-view");
      yield* ctx.expectEqual(
        "a negative deltaY scrolls down",
        after.y < 0,
        true,
      );
      const readout = yield* textOf(ctx, "scroll-readout");
      yield* ctx.expectContains(
        "onScroll reports the delta",
        readout,
        "delta=-200",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${scroll.id}.png`);
    }),
};

const panel: LiveScenario = {
  id: "live-panel",
  title: "Live panel: pointer capture holds through a divider drag",
  capability: "panel",
  view: panelScenario.view,
  ready: "panel-divider",
  steps: (ctx) =>
    Effect.gen(function* () {
      const before = yield* textOf(ctx, "panel-readout");
      yield* ctx.expectContains("the split starts at 320", before, "split=320");

      yield* ctx.host.drag("panel-divider", 80, 0, 6);
      yield* settle;
      const grown = yield* textOf(ctx, "panel-readout");
      yield* ctx.expectContains(
        "the drag grew the pane by 80",
        grown,
        "split=400",
      );

      const pane = yield* ctx.host.bounds("panel-pane-a");
      const box = yield* ctx.expectSome(
        "pane A is painted",
        Option.fromNullishOr(pane),
      );
      yield* ctx.expectNear(
        "the measured pane matches the readout",
        box.width,
        400,
        2,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${panel.id}.png`);
    }),
};

/**
 * The nested workspace in a window.
 *
 * A live click focuses the divider natively (plan `190`), so the keyboard half
 * is driven by the focused element rather than a synthetic dispatch. The
 * divider's `role` and `aria-valuetext` stay headless: the live tree carries no
 * accessibility report (plan `197`).
 */
const livePanelNested: LiveScenario = {
  id: "live-panel-nested",
  title: "Live panels: a vertical split, nested isolation and a collapse",
  capability: "panel",
  view: panelNestedScenario.view,
  ready: "panel-state",
  steps: (ctx) =>
    Effect.gen(function* () {
      const state = () => textOf(ctx, "panel-state");
      const sidebarWidth = Effect.gen(function* () {
        const bounds = yield* ctx.host.bounds("panel-sidebar");
        return Option.match(Option.fromNullishOr(bounds), {
          onNone: () => 0,
          onSome: (box) => box.width,
        });
      });

      yield* waitForText(ctx, "panel-state", "outer=180 inner=300 sidebar=160");
      yield* ctx.expectContains(
        "the live workspace starts at its defaults",
        yield* state(),
        "outer=180 inner=300 sidebar=160",
      );
      yield* ctx.expectNear(
        "the top live pane paints its initial height",
        (yield* boxOf(ctx, "outer-pane-a")).height,
        180,
        2,
      );
      yield* ctx.expectNear(
        "the inner live pane paints its initial width",
        (yield* boxOf(ctx, "inner-pane-a")).width,
        300,
        2,
      );

      yield* ctx.host.drag("outer-divider", 0, 48, 6);
      yield* waitForText(ctx, "panel-state", "outer=228");
      yield* ctx.expectContains(
        "the live vertical drag grew the top pane",
        yield* state(),
        "outer=228",
      );
      yield* ctx.expectNear(
        "the vertical pane repainted at its new height live",
        (yield* boxOf(ctx, "outer-pane-a")).height,
        228,
        2,
      );
      yield* ctx.expectContains(
        "the live vertical drag left the nested split alone",
        yield* state(),
        "inner=300",
      );

      yield* ctx.host.drag("inner-divider", 60, 0, 6);
      yield* waitForText(ctx, "panel-state", "inner=360");
      yield* ctx.expectContains(
        "the live nested drag grew the inner pane",
        yield* state(),
        "inner=360",
      );
      yield* ctx.expectNear(
        "the nested pane repainted at its new width live",
        (yield* boxOf(ctx, "inner-pane-a")).width,
        360,
        2,
      );
      yield* ctx.expectContains(
        "the live nested drag left its parent alone",
        yield* state(),
        "outer=228",
      );

      yield* ctx.host.click("panel-sidebar-toggle");
      yield* waitForText(ctx, "panel-state", "sidebar=0");
      const collapsed = yield* sidebarWidth;
      yield* ctx.expectEqual(
        `the collapsed live sidebar leaves the paint [width ${collapsed}]`,
        collapsed <= 1,
        true,
      );
      yield* ctx.expectContains(
        "the live collapse left the nested split alone",
        yield* state(),
        "inner=360",
      );

      yield* ctx.host.click("panel-sidebar-toggle");
      yield* waitForText(ctx, "panel-state", "sidebar=160");
      yield* ctx.expectNear(
        "the expanded live sidebar paints its width",
        yield* sidebarWidth,
        160,
        2,
      );

      yield* ctx.host.click("inner-divider");
      yield* settle;
      yield* ctx.expectEqual(
        "the live divider takes native focus",
        yield* focusedOf(ctx),
        "inner-divider",
      );

      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForText(ctx, "panel-state", "inner=376");
      yield* ctx.expectContains(
        "ArrowRight grows the focused live divider's pane",
        yield* state(),
        "inner=376",
      );
      yield* ctx.expectNear(
        "the live keyboard resize repaints",
        (yield* boxOf(ctx, "inner-pane-a")).width,
        376,
        2,
      );

      yield* ctx.host.key("left");
      yield* settle;
      yield* waitForText(ctx, "panel-state", "inner=360");
      yield* ctx.expectContains(
        "ArrowLeft shrinks it back live",
        yield* state(),
        "inner=360",
      );

      yield* ctx.host.focusNext();
      yield* settle;
      const afterDivider = yield* focusedOf(ctx);
      yield* ctx.expectEqual(
        `live traversal leaves the divider (to ${afterDivider})`,
        afterDivider === "inner-divider",
        false,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${livePanelNested.id}.png`);
    }),
};

/**
 * The placement engine in a window.
 *
 * The probe sizes itself from `useWindowSize()`, so `float-window` is the
 * window frame and every offset below is window-relative. `align="center"`
 * keeps the measured 0.10.0 defect here: it ends the panel at the anchor's
 * centre line instead of centring it.
 */
const liveFloating: LiveScenario = {
  id: "live-floating",
  title:
    "Live floating layer: side, align, the centre defect and the edge snap",
  capability: "floating",
  view: floatingScenario.view,
  ready: "float-window",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForBounds(
        ctx,
        "float-window",
        (box) =>
          Math.abs(box.width - WINDOW.width) <= 1 &&
          Math.abs(box.height - WINDOW.height) <= 1,
      );
      const frame = yield* boxOf(ctx, "float-window");
      yield* ctx.expectNear(
        "the live probe takes the window width",
        frame.width,
        WINDOW.width,
        1,
      );
      yield* ctx.expectNear(
        "the live probe takes the window height",
        frame.height,
        WINDOW.height,
        1,
      );

      yield* ctx.host.click("float-anchor");
      yield* waitForText(
        ctx,
        "float-readout",
        "open=true side=bottom align=start",
      );
      const anchor = yield* boxOf(ctx, "float-anchor");
      const below = yield* boxOf(ctx, "float-panel");
      // 9 px: 1 px border + 8 px padding — the 0.10.0 content-origin box.
      yield* ctx.expectNear(
        "side=bottom sits one gap below the live anchor",
        below.y,
        anchor.y + anchor.height + 6 + 9,
        1,
      );
      yield* ctx.expectNear(
        "align=start puts the live panel on the anchor's left edge",
        below.x,
        anchor.x + 9,
        1,
      );

      yield* ctx.host.click("float-switch");
      yield* waitForText(
        ctx,
        "float-readout",
        "open=true side=right align=start",
      );
      const right = yield* boxOf(ctx, "float-panel");
      yield* ctx.expectNear(
        "side=right sits one gap right of the live anchor",
        right.x,
        anchor.x + anchor.width + 6 + 9,
        1,
      );
      yield* ctx.expectNear(
        "align=start keeps the live panel at the anchor's top edge",
        right.y,
        anchor.y + 9,
        1,
      );

      yield* ctx.host.click("float-align");
      yield* waitForText(ctx, "float-readout", "align=center");
      const centre = yield* boxOf(ctx, "float-panel");
      yield* ctx.expectNear(
        "align=center still ends at the live anchor's centre line",
        centre.y + centre.height,
        anchor.y + anchor.height / 2 + 7,
        1,
      );

      yield* ctx.host.click("float-anchor");
      yield* waitForText(ctx, "float-readout", "open=false");
      yield* ctx.host.click("float-edge-anchor");
      yield* waitForText(ctx, "float-readout", "edge=true");
      const edgeAnchor = yield* boxOf(ctx, "float-edge-anchor");
      const edgePanel = yield* boxOf(ctx, "float-panel");
      yield* ctx.expectEqual(
        `the live layer snapped inside the window [panel bottom ${edgePanel.y + edgePanel.height}, window bottom ${frame.y + frame.height}]`,
        edgePanel.y + edgePanel.height <= frame.y + frame.height + 1,
        true,
      );
      yield* ctx.expectEqual(
        `the live layer stayed past the top margin [panel top ${edgePanel.y}]`,
        edgePanel.y >= 8,
        true,
      );
      yield* ctx.expectEqual(
        `0.10.0 snaps above the live anchor instead of flipping [panel ${Math.round(edgePanel.y)}..${Math.round(edgePanel.y + edgePanel.height)}, anchor ${Math.round(edgeAnchor.y)}..${Math.round(edgeAnchor.y + edgeAnchor.height)}]`,
        edgePanel.y + edgePanel.height > edgeAnchor.y,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveFloating.id}.png`);
    }),
};

const overlay: LiveScenario = {
  id: "live-overlay",
  title: "Live overlay: a modal opens, centres and closes on Escape",
  capability: "overlay",
  view: modalScenario.view,
  ready: "modal-trigger",
  steps: (ctx) =>
    Effect.gen(function* () {
      const closed = yield* textOf(ctx, "modal-readout");
      yield* ctx.expectContains(
        "the modal starts closed",
        closed,
        "open=false",
      );

      yield* ctx.host.click("modal-trigger");
      yield* ctx.host.waitFor("modal-content");
      yield* settle;
      const opened = yield* textOf(ctx, "modal-readout");
      yield* ctx.expectContains(
        "the trigger opens the modal",
        opened,
        "open=true",
      );

      const content = yield* ctx.host.bounds("modal-content");
      const box = yield* ctx.expectSome(
        "the modal surface is painted",
        Option.fromNullishOr(content),
      );
      // The modal's content box is inset 16 px per side (plan 529 §6.3).
      yield* ctx.expectNear(
        "the surface is centred horizontally",
        box.x + box.width / 2,
        WINDOW.width / 2 + 16,
        2,
      );
      yield* ctx.expectNear(
        "the surface is centred vertically",
        box.y + box.height / 2,
        WINDOW.height / 2 + 16,
        2,
      );

      yield* ctx.host.key("escape");
      yield* settle;
      const dismissed = yield* awaitedTextOf(
        ctx,
        "modal-readout",
        "open=false",
      );
      yield* ctx.expectContains(
        "Escape closes the focused surface",
        dismissed,
        "open=false",
      );
      yield* ctx.expectContains(
        "the close names Escape",
        dismissed,
        "last=escape",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${overlay.id}.png`);
    }),
};

const focus: LiveScenario = {
  id: "live-focus",
  title: "Live focus: entry, the modal Tab trap and focus return",
  capability: "focus",
  view: modalScenario.view,
  ready: "modal-trigger",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("modal-trigger");
      yield* ctx.host.waitFor("modal-content");
      yield* settle;
      const opened = yield* textOf(ctx, "modal-readout");
      yield* ctx.expectContains(
        "the trigger opened the modal",
        opened,
        "open=true",
      );
      yield* waitForFocus(ctx, "modal-content");
      yield* ctx.expectEqual(
        "focus entered the modal",
        yield* focusedOf(ctx),
        "modal-content",
      );

      const tabbed = yield* walkFocus(ctx, "tab", 4);
      const tabIds = Arr.getSomes(Arr.map(tabbed, Option.fromNullishOr));
      yield* ctx.expectEqual(
        `Tab moved focus [${Arr.join(tabIds, ",")}]`,
        Arr.length(Arr.dedupe(tabIds)) > 1,
        true,
      );
      yield* ctx.expectEqual(
        `Tab stayed inside the modal [${Arr.join(tabIds, ",")}]`,
        Arr.every(tabIds, (id) => Arr.contains(MODAL_FOCUS_IDS, id)),
        true,
      );
      yield* ctx.host.key("tab");
      yield* settle;
      yield* ctx.expectEqual(
        "Tab wrapped back to the content",
        yield* focusedOf(ctx),
        "modal-content",
      );

      const shifted = yield* walkFocus(ctx, "shift-tab", 4);
      const shiftIds = Arr.getSomes(Arr.map(shifted, Option.fromNullishOr));
      yield* ctx.expectEqual(
        `Shift-Tab moved focus [${Arr.join(shiftIds, ",")}]`,
        Arr.length(Arr.dedupe(shiftIds)) > 1,
        true,
      );
      yield* ctx.expectEqual(
        `Shift-Tab stayed inside the modal [${Arr.join(shiftIds, ",")}]`,
        Arr.every(shiftIds, (id) => Arr.contains(MODAL_FOCUS_IDS, id)),
        true,
      );
      yield* ctx.host.key("shift-tab");
      yield* settle;
      yield* ctx.expectEqual(
        "Shift-Tab wrapped back to the content",
        yield* focusedOf(ctx),
        "modal-content",
      );

      yield* ctx.host.key("escape");
      yield* settle;
      const dismissed = yield* awaitedTextOf(
        ctx,
        "modal-readout",
        "open=false popover=false last=escape",
      );
      yield* ctx.expectContains(
        "Escape closed the modal",
        dismissed,
        "open=false popover=false last=escape",
      );
      yield* waitForFocus(ctx, "modal-trigger");
      yield* ctx.expectEqual(
        "focus returned to the trigger",
        yield* focusedOf(ctx),
        "modal-trigger",
      );

      yield* ctx.host.click("modal-trigger");
      yield* ctx.host.waitFor("modal-content");
      yield* settle;
      yield* ctx.host.click("modal-open-popover");
      yield* ctx.host.waitFor("nested-content");
      yield* settle;
      yield* waitForFocus(ctx, "nested-content");
      yield* ctx.expectEqual(
        "focus entered the nested popover",
        yield* focusedOf(ctx),
        "nested-content",
      );

      yield* ctx.host.key("escape");
      yield* settle;
      const nested = yield* awaitedTextOf(
        ctx,
        "modal-readout",
        "open=true popover=false last=popover-escape",
      );
      yield* ctx.expectContains(
        "Escape closed only the popover",
        nested,
        "open=true popover=false last=popover-escape",
      );
      yield* waitForFocus(ctx, "modal-open-popover");
      yield* ctx.expectEqual(
        "focus returned from the popover",
        yield* focusedOf(ctx),
        "modal-open-popover",
      );

      yield* ctx.host.key("escape");
      yield* settle;
      const closed = yield* awaitedTextOf(ctx, "modal-readout", "open=false");
      yield* ctx.expectContains(
        "the second Escape closed the modal",
        closed,
        "open=false",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${focus.id}.png`);
    }),
};

const selection: LiveScenario = {
  id: "live-selection",
  title: "Live selection: a real drag copies text and skips chrome",
  capability: "selection",
  view: textSelectionScenario.view,
  ready: "select-heading",
  steps: (ctx) =>
    Effect.gen(function* () {
      const copied = yield* select(ctx, "select-heading", "select-body-2");
      yield* ctx.expectContains(
        "a live drag selects the heading",
        copied,
        "Selection heading",
      );
      yield* ctx.expectContains(
        "a live drag selects the first body line",
        copied,
        "first line",
      );
      yield* ctx.expectContains(
        "a live drag selects the second body line",
        copied,
        "second line",
      );

      const anchoredInChrome = yield* select(
        ctx,
        "select-toolbar",
        "select-after",
      );
      yield* ctx.expectEqual(
        "a drag anchored in userSelect none selects nothing",
        anchoredInChrome,
        "",
      );

      const crossing = yield* select(ctx, "select-body-2", "select-after");
      yield* ctx.expectContains(
        "the text before the chrome is selected",
        crossing,
        "second line",
      );
      yield* ctx.expectContains(
        "the text after the chrome is selected",
        crossing,
        "after toolbar",
      );
      yield* ctx.expectEqual(
        "userSelect none is excluded from the crossing drag",
        Str.includes("toolbar chrome")(crossing),
        false,
      );

      yield* ctx.host.clearSelection();
      yield* settle;
      const cleared = yield* Effect.map(ctx.host.selectedText(), selectionText);
      yield* ctx.expectEqual(
        "clearSelection empties the live selection",
        cleared,
        "",
      );

      yield* ctx.host.click("select-body-1");
      yield* settle;
      const clicked = yield* Effect.map(ctx.host.selectedText(), selectionText);
      yield* ctx.expectEqual("a click does not select", clicked, "");

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${selection.id}.png`);
    }),
};

const selectionSignal: LiveScenario = {
  id: "live-selection-signal",
  title: "Live selection signal: the event, the text and a copy action",
  capability: "selection",
  view: selectionSignalScenario.view,
  ready: "sig-line-1",
  steps: (ctx) =>
    Effect.gen(function* () {
      const dragged = yield* select(ctx, "sig-line-1", "sig-line-3");
      yield* ctx.expectContains(
        "the live drag selects the first line",
        dragged,
        "sig one",
      );
      yield* ctx.expectContains(
        "the live drag selects the last line",
        dragged,
        "sig three",
      );

      yield* settle;
      const first = yield* countOf(ctx);
      yield* ctx.expectEqual(
        "the live drag reported a change",
        first >= 1,
        true,
      );
      const echo = yield* textOf(ctx, "sig-echo");
      yield* ctx.expectContains(
        "the live event delivered the selected text",
        echo,
        "sig one",
      );
      yield* ctx.expectEqual(
        "the live event and the renderer agree",
        Option.getOrElse(
          Option.fromNullishOr(Str.replaceAll("\n", " ")(echo)),
          () => "",
        ),
        Option.getOrElse(
          Option.fromNullishOr(
            Str.replaceAll(
              "\n",
              " ",
            )(selectionText(yield* ctx.host.selectedText())),
          ),
          () => "",
        ),
      );

      yield* select(ctx, "sig-line-2", "sig-line-2");
      yield* settle;
      const second = yield* countOf(ctx);
      yield* ctx.expectEqual(
        "a second live drag reports another change",
        second > first,
        true,
      );
      const secondEcho = yield* textOf(ctx, "sig-echo");
      yield* ctx.expectContains(
        "a second live drag replaces the selected text",
        secondEcho,
        "sig two",
      );
      yield* ctx.expectEqual(
        "the earlier live text is gone",
        Str.includes("sig one")(secondEcho),
        false,
      );

      yield* ctx.host.clearSelection();
      yield* settle;
      const cleared = yield* countOf(ctx);
      yield* ctx.expectEqual(
        "a live clear is notified",
        cleared > second,
        true,
      );
      yield* ctx.expectEqual(
        "the live cleared selection is empty",
        yield* textOf(ctx, "sig-echo"),
        "<none>",
      );

      yield* select(ctx, "sig-line-1", "sig-line-3");
      yield* settle;
      const restored = yield* countOf(ctx);
      yield* ctx.expectEqual(
        "a new live drag reports another change",
        restored > cleared,
        true,
      );

      yield* ctx.host.click("sig-copy");
      yield* settle;
      const copied = yield* countOf(ctx);
      yield* ctx.expectContains(
        "the live pointer-down captures the selection",
        yield* textOf(ctx, "sig-log"),
        "D(t)",
      );
      yield* ctx.expectContains(
        "the live copy action uses the event's text",
        yield* textOf(ctx, "sig-copied"),
        "sig one",
      );
      yield* ctx.expectEqual(
        "the live click clears the native selection",
        yield* textOf(ctx, "sig-echo"),
        "<none>",
      );
      yield* ctx.expectEqual(
        "a live click on the affordance does not select",
        selectionText(yield* ctx.host.selectedText()),
        "",
      );
      yield* ctx.expectEqual(
        "the live click's clear is notified",
        copied > restored,
        true,
      );

      yield* ctx.host.click("sig-copy");
      yield* settle;
      yield* ctx.expectContains(
        "a live copy with no selection keeps the previous text",
        yield* textOf(ctx, "sig-copied"),
        "sig one",
      );
      yield* ctx.expectContains(
        "the second live copy captured nothing",
        yield* textOf(ctx, "sig-log"),
        "D(-) C(-)",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${selectionSignal.id}.png`);
    }),
};

const motion: LiveScenario = {
  id: "live-motion",
  title: "Live motion: the paused clock, a mid-tween frame and an exit",
  capability: "motion",
  view: motionScenario.view,
  ready: "motion-toggle",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.pauseMotion();
      const expanded = yield* leftOf(ctx, "motion-content");
      yield* ctx.expectNear(
        "the expanded inner pane is 240 px",
        yield* widthOf(ctx, "motion-inner"),
        240,
        1,
      );

      yield* ctx.host.click("motion-toggle");
      yield* settle;
      yield* ctx.host.fastForwardMotion(80);
      yield* settle;
      yield* ctx.expectNear(
        "the content moved 96 px at 80 ms",
        expanded - (yield* leftOf(ctx, "motion-content")),
        96,
        4,
      );
      yield* ctx.expectNear(
        "the inner pane does not reflow mid-collapse",
        yield* widthOf(ctx, "motion-inner"),
        240,
        1,
      );
      yield* ctx.expectContains(
        "no completion fires mid-tween",
        yield* textOf(ctx, "motion-readout"),
        "complete=0",
      );

      yield* ctx.host.fastForwardMotion(200);
      yield* settle;
      yield* ctx.expectNear(
        "the content reached the collapsed edge",
        expanded - (yield* leftOf(ctx, "motion-content")),
        240,
        1,
      );
      yield* ctx.expectContains(
        "onMotionComplete fires once",
        yield* textOf(ctx, "motion-readout"),
        "complete=1",
      );

      yield* ctx.host.click("motion-toggle");
      yield* settle;
      yield* ctx.host.fastForwardMotion(80);
      yield* settle;
      yield* ctx.expectNear(
        "the content moved 96 px into the expand",
        expanded - (yield* leftOf(ctx, "motion-content")),
        144,
        4,
      );
      yield* ctx.host.fastForwardMotion(200);
      yield* settle;
      yield* ctx.expectNear(
        "the content returned to the expanded edge",
        yield* leftOf(ctx, "motion-content"),
        expanded,
        1,
      );
      yield* ctx.expectContains(
        "the second tween completes once",
        yield* textOf(ctx, "motion-readout"),
        "complete=2",
      );

      yield* ctx.host.click("motion-show-toast");
      yield* settle;
      yield* ctx.expectContains(
        "the toast mounts",
        yield* textOf(ctx, "motion-toast-label"),
        "saved",
      );
      yield* ctx.host.click("motion-hide-toast");
      yield* settle;
      const retained = yield* ctx.host.bounds("motion-toast-label");
      yield* ctx.expectEqual(
        "the toast stays painted while exiting",
        Option.isSome(Option.fromNullishOr(retained)),
        true,
      );

      yield* ctx.host.fastForwardMotion(200);
      yield* settle;
      const removed = yield* ctx.host.bounds("motion-toast-label");
      yield* ctx.expectEqual(
        "the toast is removed after the exit",
        Option.isNone(Option.fromNullishOr(removed)),
        true,
      );
      const exited = yield* textOf(ctx, "motion-readout");
      yield* ctx.expectEqual(
        "the exit completed at least once",
        Str.includes("exited=0")(exited),
        false,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${motion.id}.png`);
    }),
};

const liveCollapsible: LiveScenario = {
  id: "live-collapsible",
  title: "Live collapsible: measured height, the clip and a retained draft",
  capability: "motion",
  view: collapsibleHeightScenario.view,
  ready: "collapse-trigger",
  steps: (ctx) =>
    Effect.gen(function* () {
      const readout = () => textOf(ctx, "collapse-readout");
      yield* ctx.host.pauseMotion();

      // 1. The body is mounted and measured at first layout while clipped.
      const content = yield* boxOf(ctx, "collapse-content");
      yield* ctx.expectEqual(
        "the collapsed live body keeps its content laid out",
        content.height > 0,
        true,
      );
      const header = yield* boxOf(ctx, "collapse-trigger");
      const baseline = (yield* boxOf(ctx, "collapse-after")).y;
      yield* ctx.expectEqual(
        "the collapsed live section leaves the next row above its content",
        baseline > header.y + header.height,
        true,
      );
      const mounted = yield* readout();
      yield* ctx.expectContains(
        "the live first-layout measurement is the painted height",
        mounted,
        "mounted=140",
      );

      // 2. A press aimed at the clipped control reaches nothing.
      yield* ctx.host.click("collapse-button");
      yield* settle;
      yield* ctx.expectContains(
        "the live clip refuses a press in the overflowing content",
        yield* readout(),
        "presses=0",
      );

      // 3. The height tween is exact under the paused live clock.
      yield* ctx.host.click("collapse-trigger");
      yield* settle;
      yield* ctx.expectContains(
        "the live trigger opened the section",
        yield* readout(),
        "open=1",
      );
      yield* ctx.expectContains(
        "no live completion fires before the clock moves",
        yield* readout(),
        "complete=0",
      );
      yield* ctx.host.fastForwardMotion(80);
      yield* settle;
      const mid = yield* boxOf(ctx, "collapse-after");
      yield* ctx.expectNear(
        "the live height tween is mid-flight at 80 ms",
        mid.y - baseline,
        content.height * 0.4,
        4,
      );
      yield* ctx.host.fastForwardMotion(200);
      yield* settle;
      const opened = yield* boxOf(ctx, "collapse-after");
      yield* ctx.expectNear(
        "the live section opened to the measured height",
        opened.y - baseline,
        content.height,
        1,
      );
      yield* ctx.expectContains(
        "the live height tween completed once",
        yield* readout(),
        "complete=1",
      );

      // 4. The open body is interactive and holds a draft.
      yield* ctx.host.click("collapse-button");
      yield* settle;
      yield* ctx.expectContains(
        "the live opened content is interactive",
        yield* readout(),
        "presses=1",
      );
      yield* ctx.host.click("collapse-input");
      yield* settle;
      yield* ctx.host.key("a");
      yield* settle;
      yield* ctx.host.key("b");
      yield* settle;
      yield* ctx.expectContains(
        "typing reaches the live draft",
        yield* readout(),
        "draft=ab",
      );

      // 5. Collapsing keeps the body mounted and the draft intact.
      yield* ctx.host.click("collapse-trigger");
      yield* settle;
      yield* ctx.host.fastForwardMotion(200);
      yield* settle;
      const closed = yield* boxOf(ctx, "collapse-after");
      yield* ctx.expectNear(
        "the live section collapsed to zero",
        closed.y - baseline,
        0,
        1,
      );
      yield* ctx.expectContains(
        "the live collapse tween completed",
        yield* readout(),
        "complete=2",
      );
      yield* ctx.expectContains(
        "the live draft survived the collapse",
        yield* readout(),
        "draft=ab",
      );
      yield* ctx.expectContains(
        "the live body stayed mounted while closed",
        yield* textOf(ctx, "collapse-content"),
        "alpha",
      );

      // 6. Enter re-opens to the same measured height.
      yield* ctx.host.keyDown("collapse-trigger", "enter");
      yield* ctx.host.keyUp("collapse-trigger", "enter");
      yield* settle;
      yield* ctx.host.fastForwardMotion(200);
      yield* settle;
      const reopened = yield* boxOf(ctx, "collapse-after");
      yield* ctx.expectNear(
        "live Enter re-opened to the same measured height",
        reopened.y - baseline,
        content.height,
        1,
      );
      yield* ctx.expectContains(
        "the live second open completed",
        yield* readout(),
        "complete=3",
      );
      yield* ctx.expectContains(
        "the live draft survived the second open",
        yield* readout(),
        "draft=ab",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveCollapsible.id}.png`);
    }),
};

const contextMenu: LiveScenario = {
  id: "live-context-menu",
  title: "Live context menu: right click, pointer placement, dismissal",
  capability: "menu",
  view: contextMenuScenario.view,
  ready: "ctx-target",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.rightClick("ctx-target");
      yield* settle;
      yield* ctx.expectContains(
        "a right click opens the menu",
        yield* textOf(ctx, "ctx-state"),
        "open=true",
      );
      yield* ctx.expectContains(
        "the pointer route keeps the root scope",
        yield* textOf(ctx, "ctx-state"),
        "scope=root",
      );
      yield* ctx.expectContains(
        "the aux click is delivered as a right click",
        yield* textOf(ctx, "ctx-log"),
        "A:aux",
      );

      const target = yield* ctx.expectSome(
        "the target has bounds",
        Option.fromNullishOr(yield* ctx.host.bounds("ctx-target")),
      );
      const menu = yield* ctx.expectSome(
        "the menu has bounds",
        Option.fromNullishOr(yield* ctx.host.bounds("ctx-menu")),
      );
      yield* ctx.expectNear(
        "the menu paints at the pointer's x",
        menu.x,
        target.x + target.width / 2 + 5,
        1,
      );
      yield* ctx.expectNear(
        "the menu paints at the pointer's y",
        menu.y,
        target.y + target.height / 2 + 5,
        1,
      );

      yield* ctx.host.click("ctx-item-disabled");
      yield* settle;
      yield* ctx.expectContains(
        "a disabled item leaves the menu open",
        yield* textOf(ctx, "ctx-state"),
        "open=true",
      );
      yield* ctx.host.click("ctx-item-copy");
      yield* settle;
      yield* ctx.expectContains(
        "an item runs and closes the menu",
        yield* textOf(ctx, "ctx-state"),
        "open=false last=copy",
      );

      yield* ctx.host.rightClick("ctx-target");
      yield* settle;
      yield* ctx.host.click("ctx-outside");
      yield* settle;
      yield* ctx.expectContains(
        "an outside press closes the menu",
        yield* textOf(ctx, "ctx-state"),
        "open=false last=outside",
      );

      yield* ctx.host.rightClick("ctx-target");
      yield* settle;
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectContains(
        "Escape closes the menu",
        yield* textOf(ctx, "ctx-state"),
        "open=false last=escape",
      );

      yield* ctx.host.rightClick("ctx-target-label");
      yield* settle;
      yield* ctx.expectContains(
        "a right click on a child opens the menu",
        yield* textOf(ctx, "ctx-state"),
        "open=true",
      );
      yield* ctx.host.key("escape");
      yield* settle;

      yield* ctx.host.wheel("ctx-scroll", 0, -400);
      yield* settle;
      const offset = yield* ctx.expectSome(
        "the scroller has an offset",
        Option.fromNullishOr(yield* ctx.host.scrollOffset("ctx-scroll")),
      );
      yield* ctx.expectEqual(
        "the wheel scrolled the container down",
        offset.y < 0,
        true,
      );

      const row = yield* ctx.expectSome(
        "the scrolled row has bounds",
        Option.fromNullishOr(yield* ctx.host.bounds("ctx-scroll-target")),
      );
      yield* ctx.host.rightClick("ctx-scroll-target");
      yield* settle;
      yield* ctx.expectContains(
        "a scrolled right click uses the container scope",
        yield* textOf(ctx, "ctx-state"),
        "scope=scroll",
      );
      const inside = yield* ctx.expectSome(
        "the in-container menu has bounds",
        Option.fromNullishOr(yield* ctx.host.bounds("ctx-menu-inside")),
      );
      yield* ctx.expectNear(
        "the scrolled menu paints at the pointer's x",
        inside.x,
        row.x + row.width / 2 + 5,
        1,
      );
      yield* ctx.expectNear(
        "the scrolled menu paints at the pointer's y",
        inside.y,
        row.y + row.height / 2 + 5,
        1,
      );
      yield* ctx.expectContains(
        "an item below the viewport still paints",
        (yield* ctx.host.paintedText()).join("\n"),
        "Row action three",
      );
      yield* ctx.host.click("ctx-item-inside-3");
      yield* settle;
      yield* ctx.expectContains(
        "an item below the viewport is still hittable",
        yield* textOf(ctx, "ctx-state"),
        "open=false last=inside-item-3",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${contextMenu.id}.png`);
    }),
};

const docking: LiveScenario = {
  id: "live-docking",
  title: "Live docking: a tab drag splits a pane in a real window",
  capability: "docking",
  view: dockingScenario.view,
  ready: "dock-surface",
  steps: (ctx) =>
    Effect.gen(function* () {
      const before = yield* textOf(ctx, "dock-signature");
      yield* ctx.expectContains(
        "the tree starts with three tabs on the left",
        before,
        "left=explorer,search,notes@explorer",
      );

      const tab = yield* ctx.host.bounds("dock-tab-notes");
      const tabBox = yield* ctx.expectSome(
        "the Notes tab is painted",
        Option.fromNullishOr(tab),
      );
      const pane = yield* ctx.host.bounds("dock-group-editor");
      const paneBox = yield* ctx.expectSome(
        "the editor pane is painted",
        Option.fromNullishOr(pane),
      );

      // Drop on the editor's right edge: the pointer travels from the tab's
      // centre to the edge band, the gesture `docking-layout` measured.
      const deltaX =
        paneBox.x + paneBox.width - 10 - (tabBox.x + tabBox.width / 2);
      const deltaY =
        paneBox.y + paneBox.height / 2 - (tabBox.y + tabBox.height / 2);
      yield* ctx.host.drag("dock-tab-notes", deltaX, deltaY, 8);
      yield* settle;

      const after = yield* textOf(ctx, "dock-signature");
      yield* ctx.expectContains(
        "the dragged tab left its group",
        after,
        "left=explorer,search@explorer",
      );
      yield* ctx.expectContains(
        "the edge drop created a group for it",
        after,
        "panel-1=notes@notes",
      );
      yield* ctx.expectContains(
        "the drop split the target pane",
        after,
        "split-1=",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${docking.id}.png`);
    }),
};

const float: LiveScenario = {
  id: "live-float",
  title: "Live float: a tab torn out in a real window",
  capability: "float",
  view: floatScenario.view,
  ready: "float-app",
  steps: (ctx) =>
    Effect.gen(function* () {
      const app = yield* boxOf(ctx, "float-app");
      const alpha = yield* boxOf(ctx, "float-tab-alpha");

      yield* ctx.host.drag(
        "float-tab-alpha",
        app.x + 560 - (alpha.x + alpha.width / 2),
        app.y + 320 - (alpha.y + alpha.height / 2),
        8,
      );
      yield* ctx.host.waitFor("float-window");
      yield* settle;

      const dockAfter = yield* textOf(ctx, "float-dock-state");
      yield* ctx.expectContains(
        "the tab left the dock",
        dockAfter,
        "main=beta,gamma@beta",
      );
      const state = yield* textOf(ctx, "float-state");
      yield* ctx.expectContains(
        "the float holds the torn tab",
        state,
        "float=alpha",
      );

      const opened = yield* boxOf(ctx, "float-window");
      yield* ctx.expectNear(
        "the panel paints at the release x",
        opened.x,
        app.x + 560,
        1,
      );
      yield* ctx.expectNear(
        "the panel paints at the release y",
        opened.y,
        app.y + 320,
        1,
      );

      yield* ctx.host.drag("float-title", -360, -260, 8);
      yield* settle;
      const moved = yield* boxOf(ctx, "float-window");
      yield* ctx.expectNear(
        "the title drag moved the window x",
        moved.x,
        app.x + 200,
        1,
      );
      yield* ctx.expectNear(
        "the title drag moved the window y",
        moved.y,
        app.y + 60,
        1,
      );

      yield* ctx.host.click("float-window-tab-alpha");
      yield* settle;
      yield* ctx.expectEqual(
        "the float tab takes native focus",
        yield* focusedOf(ctx),
        "float-window-tab-alpha",
      );

      yield* ctx.host.key("escape");
      yield* settle;
      const closed = yield* textOf(ctx, "float-state");
      yield* ctx.expectContains(
        "Escape closed the float",
        closed,
        "float=none",
      );
      const closedLog = yield* textOf(ctx, "float-log");
      yield* ctx.expectContains(
        "the reason is Escape",
        closedLog,
        "closed=escape",
      );
      yield* ctx.expectEqual(
        "focus returned to the dock's active tab",
        yield* focusedOf(ctx),
        "float-tab-beta",
      );

      const beta = yield* boxOf(ctx, "float-tab-beta");
      yield* ctx.host.drag(
        "float-tab-beta",
        app.x + 540 - (beta.x + beta.width / 2),
        app.y + 320 - (beta.y + beta.height / 2),
        8,
      );
      yield* ctx.host.waitFor("float-window");
      yield* settle;
      const reopened = yield* textOf(ctx, "float-state");
      yield* ctx.expectContains(
        "the second tear-off opened a float",
        reopened,
        "float=beta",
      );

      yield* ctx.host.click("float-close");
      yield* settle;
      const afterClose = yield* textOf(ctx, "float-state");
      yield* ctx.expectContains(
        "the close button closed the float",
        afterClose,
        "float=none",
      );
      const closeLog = yield* textOf(ctx, "float-log");
      yield* ctx.expectContains(
        "the reason is the button",
        closeLog,
        "closed=button",
      );
      const finalDock = yield* textOf(ctx, "float-dock-state");
      yield* ctx.expectContains(
        "the closed float's tab was dropped",
        finalDock,
        "main=gamma@gamma",
      );
      const removed = yield* ctx.host.bounds("float-window");
      yield* ctx.expectEqual(
        "the closed panel is not painted",
        Option.isNone(Option.fromNullishOr(removed)),
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${float.id}.png`);
    }),
};

const primitives: LiveScenario = {
  id: "live-primitives",
  title: "Live primitives: the shipped Button and Toggle in a window",
  capability: "components",
  view: primitivesActionsScenario.view,
  ready: "action-save",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("action-save");
      yield* settle;
      const saved = yield* textOf(ctx, "action-readout");
      yield* ctx.expectContains(
        "the shipped Button activates",
        saved,
        "activations=1",
      );

      yield* ctx.host.click("action-disabled");
      yield* settle;
      const refused = yield* textOf(ctx, "action-readout");
      yield* ctx.expectContains(
        "a disabled Button refuses the click",
        refused,
        "activations=1",
      );

      yield* ctx.host.click("action-toggle");
      yield* settle;
      const toggled = yield* textOf(ctx, "action-readout");
      yield* ctx.expectContains(
        "the Toggle reports pressed",
        toggled,
        "pressed=true",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${primitives.id}.png`);
    }),
};

/**
 * The shipped Tier 1 controls in a real window (plan `570`).
 *
 * Plans `168`/`169` proved these controls in the offscreen `TestRenderer`.
 * Tier 1 is what every other component composes, so its pointer focus, key
 * delivery, popup commit and focus advance deserve the same window evidence as
 * Tier 2. The views are unchanged; only what a window can answer is asserted
 * (style and the a11y dump stay headless, plan `197`).
 */
const livePrimitivesFields: LiveScenario = {
  id: "live-primitives-fields",
  title: "Live Tier 1: the shipped Input, Checkbox, Switch and Select",
  capability: "components",
  view: primitivesFieldsScenario.view,
  ready: "field-name",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("field-name");
      yield* settle;
      yield* ctx.host.key("a t l a s");
      yield* waitForText(ctx, "field-readout", "name=atlas");
      yield* ctx.expectContains(
        "a real click and real keys edit the shipped Input",
        yield* textOf(ctx, "field-readout"),
        "name=atlas",
      );

      yield* ctx.host.key("enter");
      yield* waitForText(ctx, "field-readout", "submits=1");
      yield* ctx.expectContains(
        "Enter commits through onSubmit",
        yield* textOf(ctx, "field-readout"),
        "submits=1",
      );

      yield* ctx.host.click("field-locked");
      yield* settle;
      yield* ctx.host.key("x");
      yield* settle;
      yield* ctx.expectContains(
        "the disabled Input refuses the edit",
        yield* textOf(ctx, "field-readout"),
        "locked=0",
      );
      yield* ctx.expectContains(
        "the refused keystroke reaches no other field",
        yield* textOf(ctx, "field-readout"),
        "name=atlas",
      );

      yield* ctx.host.click("field-check");
      yield* waitForText(ctx, "field-readout", "checked=true");
      yield* ctx.expectContains(
        "a click checks the Checkbox",
        yield* textOf(ctx, "field-readout"),
        "checked=true",
      );
      yield* ctx.host.keyDown("field-check", "space");
      yield* ctx.host.keyUp("field-check", "space");
      yield* waitForText(ctx, "field-readout", "checked=false");
      yield* ctx.expectContains(
        "Space unchecks the Checkbox",
        yield* textOf(ctx, "field-readout"),
        "checked=false",
      );

      yield* ctx.host.click("field-switch");
      yield* waitForText(ctx, "field-readout", "paused=true");
      yield* ctx.expectContains(
        "a click switches the Switch",
        yield* textOf(ctx, "field-readout"),
        "paused=true",
      );

      yield* ctx.host.click("field-region");
      yield* waitForPainted(ctx, "Asia — South");
      yield* settle;
      yield* ctx.expectContains(
        "the shipped Select paints its options",
        Arr.join(yield* ctx.host.paintedText(), "\n"),
        "Asia — South",
      );
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "field-readout", "region=us-east");
      yield* ctx.expectContains(
        "arrow then Enter commits the next option",
        yield* textOf(ctx, "field-readout"),
        "region=us-east",
      );
      yield* ctx.expectContains(
        "the trigger paints the chosen label",
        yield* textOf(ctx, "field-region"),
        "United States — East",
      );

      yield* ctx.host.click("field-region");
      yield* settle;
      yield* ctx.host.key("escape");
      yield* settle;
      const dismissed = Arr.join(yield* ctx.host.paintedText(), "\n");
      yield* ctx.expectEqual(
        "Escape closes the list",
        Str.includes("Asia — South")(dismissed),
        false,
      );
      yield* ctx.expectContains(
        "the dismissed list keeps the value",
        yield* textOf(ctx, "field-readout"),
        "region=us-east",
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${livePrimitivesFields.id}.png`,
      );
    }),
};

/** One `key=value` number of the display probe's range readout. */
const displayRangeNumber = (line: string, key: string): number =>
  Number.parseFloat(Option.getOrElse(fieldOf(line, key), () => "NaN"));

const livePrimitivesDisplay: LiveScenario = {
  id: "live-primitives-display",
  title:
    "Live Tier 1: the shipped Slider, RangeSlider, ButtonGroup, Progress, Meter, Skeleton and loading indicators",
  capability: "components",
  view: primitivesDisplayScenario.view,
  ready: "display-quality",
  steps: (ctx) =>
    Effect.gen(function* () {
      const track = yield* boxOf(ctx, "display-quality");
      yield* ctx.host.clickWindow(
        track.x + track.width / 4,
        track.y + track.height / 2,
      );
      yield* settle;
      const clicked = Number(yield* textOf(ctx, "display-quality-value"));
      yield* ctx.expectEqual(
        "a click at a quarter of the track sets a value below the middle",
        clicked > 0 && clicked < 50,
        true,
      );

      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForText(ctx, "display-readout", `quality=${clicked + 1}`);
      yield* ctx.expectContains(
        "Right steps the slider up by one",
        yield* textOf(ctx, "display-readout"),
        `quality=${clicked + 1}`,
      );
      yield* ctx.host.key("left");
      yield* settle;
      yield* waitForText(ctx, "display-readout", `quality=${clicked}`);
      yield* ctx.expectContains(
        "Left steps it back",
        yield* textOf(ctx, "display-readout"),
        `quality=${clicked}`,
      );

      const skeleton = yield* boxOf(ctx, "display-skeleton");
      yield* ctx.expectNear(
        "the skeleton keeps its 14 px height",
        skeleton.height,
        14,
        1,
      );
      yield* boxOf(ctx, "display-progress");
      yield* boxOf(ctx, "display-meter");

      yield* ctx.host.hover("display-trigger");
      yield* waitForPainted(ctx, "Booked revenue");
      yield* ctx.expectContains(
        "hovering the trigger opens the shipped Tooltip",
        Arr.join(yield* ctx.host.paintedText(), "\n"),
        "Booked revenue",
      );

      // ── RangeSlider: the press focuses the grabbed thumb ──────────────────
      const rangeTrack = yield* boxOf(ctx, "display-range");
      yield* ctx.host.clickWindow(
        rangeTrack.x + rangeTrack.width * 0.1,
        rangeTrack.y + rangeTrack.height / 2,
      );
      yield* settle;
      yield* waitForTextNot(ctx, "display-range-value", "start=20 end=80");
      const rangeAfterStartPress = yield* textOf(ctx, "display-range-value");
      const startPressed = displayRangeNumber(rangeAfterStartPress, "start");
      const endPressed = displayRangeNumber(rangeAfterStartPress, "end");
      yield* ctx.expectEqual(
        "a real press at the start end moves only the start",
        startPressed < 20,
        true,
      );
      yield* ctx.expectEqual(
        "the start press leaves the end alone",
        endPressed,
        80,
      );

      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForText(
        ctx,
        "display-range-value",
        `start=${startPressed + 1}`,
      );
      const rangeAfterRight = yield* textOf(ctx, "display-range-value");
      yield* ctx.expectEqual(
        "Right moves the pressed end, because the press focused its thumb",
        displayRangeNumber(rangeAfterRight, "end"),
        80,
      );

      yield* ctx.host.clickWindow(
        rangeTrack.x + rangeTrack.width * 0.9,
        rangeTrack.y + rangeTrack.height / 2,
      );
      yield* settle;
      yield* waitForTextNot(ctx, "display-range-value", rangeAfterRight);
      const rangeAfterEndPress = yield* textOf(ctx, "display-range-value");
      const startHeld = displayRangeNumber(rangeAfterEndPress, "start");
      const endMoved = displayRangeNumber(rangeAfterEndPress, "end");
      yield* ctx.expectEqual(
        "a real press at the end end moves only the end",
        endMoved > 80,
        true,
      );
      yield* ctx.expectEqual(
        "the end press leaves the start alone",
        startHeld,
        startPressed + 1,
      );

      yield* ctx.host.key("left");
      yield* settle;
      yield* waitForText(ctx, "display-range-value", `end=${endMoved - 1}`);
      const rangeAfterLeft = yield* textOf(ctx, "display-range-value");
      yield* ctx.expectEqual(
        "Left moves the newly pressed end",
        displayRangeNumber(rangeAfterLeft, "start"),
        startHeld,
      );

      // ── ButtonGroup: attached and separated gaps ──────────────────────────
      const zoomOut = yield* boxOf(ctx, "display-zoom-out");
      const zoomIn = yield* boxOf(ctx, "display-zoom-in");
      yield* ctx.expectNear(
        "attached children sit 0 px apart",
        zoomIn.x - (zoomOut.x + zoomOut.width),
        0,
        1,
      );
      const alignLeft = yield* boxOf(ctx, "display-align-left");
      const alignRight = yield* boxOf(ctx, "display-align-right");
      yield* ctx.expectNear(
        "separated children keep the theme's 6 px gap",
        alignRight.x - (alignLeft.x + alignLeft.width),
        6,
        1,
      );

      // ── Loading indicators: paint and geometry ────────────────────────────
      // The step advance itself is not assertable live: this view repaints
      // sporadically without any indicator (measured in plan `658` §8), so a
      // frame-count delta cannot attribute a paint to the interval. The step
      // maths stays headless (`Spinner`/`Progress` runtime suites).
      const spinner = yield* boxOf(ctx, "display-spinner");
      yield* ctx.expectNear(
        "the spinner is three 10 px dots tall",
        spinner.height,
        10,
        1,
      );
      yield* ctx.expectNear(
        "the spinner is three 10 px dots and two 2 px gaps wide",
        spinner.width,
        34,
        1,
      );
      const connecting = yield* boxOf(ctx, "display-connecting");
      yield* ctx.expectNear(
        "the indeterminate bar is one md track tall",
        connecting.height,
        6,
        1,
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${livePrimitivesDisplay.id}.png`,
      );
    }),
};

const livePrimitivesChoice: LiveScenario = {
  id: "live-primitives-choice",
  title: "Live Tier 1: the shipped RadioGroup and Rating",
  capability: "components",
  view: primitivesChoiceScenario.view,
  ready: "choice-radio",
  steps: (ctx) =>
    Effect.gen(function* () {
      const radio = yield* boxOf(ctx, "choice-radio");
      yield* ctx.host.clickWindow(radio.x + 8, radio.y + radio.height / 2);
      yield* settle;
      yield* waitForText(ctx, "choice-readout", "cadence=weekly");
      yield* ctx.expectContains(
        "a real click selects the second radio option",
        yield* textOf(ctx, "choice-readout"),
        "cadence=weekly",
      );

      yield* ctx.host.keyDown("choice-radio", "down");
      yield* ctx.host.keyUp("choice-radio", "down");
      yield* settle;
      yield* waitForText(ctx, "choice-readout", "cadence=never");
      yield* ctx.expectContains(
        "Down moves the selection",
        yield* textOf(ctx, "choice-readout"),
        "cadence=never",
      );
      yield* ctx.host.keyDown("choice-radio", "up");
      yield* ctx.host.keyUp("choice-radio", "up");
      yield* settle;
      yield* waitForText(ctx, "choice-readout", "cadence=weekly");
      yield* ctx.expectContains(
        "Up moves it back",
        yield* textOf(ctx, "choice-readout"),
        "cadence=weekly",
      );

      yield* ctx.host.clickWindow(radio.x + 8, radio.y + radio.height / 6);
      yield* settle;
      yield* waitForText(ctx, "choice-readout", "cadence=daily");
      yield* ctx.expectContains(
        "a click on the first row selects it",
        yield* textOf(ctx, "choice-readout"),
        "cadence=daily",
      );

      const stars = yield* boxOf(ctx, "choice-rating");
      yield* ctx.host.clickWindow(stars.x + 8, stars.y + stars.height / 2);
      yield* settle;
      yield* waitForText(ctx, "choice-readout", "rating=1");
      yield* ctx.expectContains(
        "a click on the first star rates one",
        yield* textOf(ctx, "choice-readout"),
        "rating=1",
      );
      yield* ctx.host.keyDown("choice-rating", "right");
      yield* ctx.host.keyUp("choice-rating", "right");
      yield* settle;
      yield* waitForText(ctx, "choice-readout", "rating=2");
      yield* ctx.expectContains(
        "Right raises the rating",
        yield* textOf(ctx, "choice-readout"),
        "rating=2",
      );
      yield* ctx.host.keyDown("choice-rating", "end");
      yield* ctx.host.keyUp("choice-rating", "end");
      yield* settle;
      yield* waitForText(ctx, "choice-readout", "rating=5");
      yield* ctx.expectContains(
        "End jumps to the last star",
        yield* textOf(ctx, "choice-readout"),
        "rating=5",
      );
      yield* ctx.host.keyDown("choice-rating", "right");
      yield* ctx.host.keyUp("choice-rating", "right");
      yield* settle;
      yield* ctx.expectContains(
        "Right clamps at the last star",
        yield* textOf(ctx, "choice-readout"),
        "rating=5",
      );
      yield* ctx.host.keyDown("choice-rating", "delete");
      yield* ctx.host.keyUp("choice-rating", "delete");
      yield* settle;
      yield* waitForText(ctx, "choice-readout", "rating=0");
      yield* ctx.expectContains(
        "Delete clears the rating",
        yield* textOf(ctx, "choice-readout"),
        "rating=0",
      );
      yield* ctx.host.keyDown("choice-rating", "left");
      yield* ctx.host.keyUp("choice-rating", "left");
      yield* settle;
      yield* ctx.expectContains(
        "Left clamps at zero",
        yield* textOf(ctx, "choice-readout"),
        "rating=0",
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${livePrimitivesChoice.id}.png`,
      );
    }),
};

const livePrimitivesEntry: LiveScenario = {
  id: "live-primitives-entry",
  title: "Live Tier 1: the shipped NumberField and OTPField",
  capability: "components",
  view: primitivesEntryScenario.view,
  ready: "entry-quantity",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("entry-quantity");
      yield* settle;
      yield* ctx.host.key("up");
      yield* settle;
      yield* waitForText(ctx, "entry-readout", "quantity=6");
      yield* ctx.expectContains(
        "Up steps the number field",
        yield* textOf(ctx, "entry-readout"),
        "quantity=6",
      );
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.key("down");
      yield* settle;
      yield* waitForText(ctx, "entry-readout", "quantity=4");
      yield* ctx.expectContains(
        "Down steps it twice",
        yield* textOf(ctx, "entry-readout"),
        "quantity=4",
      );

      yield* ctx.host.key("9 9");
      yield* settle;
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "entry-readout", "quantity=10");
      yield* ctx.expectContains(
        "a committed typed value clamps to the maximum",
        yield* textOf(ctx, "entry-readout"),
        "quantity=10",
      );
      yield* ctx.host.key("down");
      yield* settle;
      yield* waitForText(ctx, "entry-readout", "quantity=9");
      yield* ctx.expectContains(
        "the clamped value still steps",
        yield* textOf(ctx, "entry-readout"),
        "quantity=9",
      );

      yield* ctx.host.click("entry-code-cell-1");
      yield* Effect.forEach(
        ["1", "2", "3", "4", "5", "6"],
        (digit) =>
          Effect.gen(function* () {
            yield* ctx.host.key(digit);
            yield* settle;
          }),
        { concurrency: 1, discard: true },
      );
      yield* waitForText(ctx, "entry-readout", "code=123456 complete=1");
      yield* ctx.expectContains(
        "six real keystrokes complete the code",
        yield* textOf(ctx, "entry-readout"),
        "code=123456 complete=1",
      );
      yield* ctx.expectEqual(
        "focus advanced to the last cell",
        yield* focusedOf(ctx),
        "entry-code-cell-6",
      );

      yield* ctx.host.keyDown("entry-code-cell-6", "backspace");
      yield* ctx.host.keyUp("entry-code-cell-6", "backspace");
      yield* settle;
      yield* waitForText(ctx, "entry-readout", "code=12345");
      yield* ctx.expectContains(
        "Backspace deletes exactly one character",
        yield* textOf(ctx, "entry-readout"),
        "code=12345",
      );

      yield* ctx.host.keyDown("entry-code-cell-6", "left");
      yield* ctx.host.keyUp("entry-code-cell-6", "left");
      yield* settle;
      yield* ctx.expectEqual(
        "Left moves native focus back one cell",
        yield* focusedOf(ctx),
        "entry-code-cell-5",
      );
      yield* ctx.host.key("7");
      yield* settle;
      yield* waitForText(ctx, "entry-readout", "code=12347");
      yield* ctx.expectContains(
        "typing rewrites the focused cell",
        yield* textOf(ctx, "entry-readout"),
        "code=12347",
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${livePrimitivesEntry.id}.png`,
      );
    }),
};

/**
 * The published `Select` in a real window (plan `554`).
 *
 * The view is plan `159`'s probe unchanged, so the headless and live contracts
 * are the same component. The outside press is inside the live 1100×720 window
 * — the headless point `(1200, 700)` is outside it.
 */
const liveSelect: LiveScenario = {
  id: "live-select",
  title: "Live Select: open, commit and focus return in a window",
  capability: "select",
  view: selectScenario.view,
  ready: "select-trigger",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("select-trigger");
      yield* ctx.host.waitFor("select-content");
      yield* settle;
      yield* waitForText(ctx, "select-readout", "open=true");
      yield* ctx.expectContains(
        "a real click opens the list",
        yield* textOf(ctx, "select-readout"),
        "open=true",
      );
      yield* ctx.expectContains(
        "the list paints its items",
        yield* textOf(ctx, "select-content"),
        "Beta",
      );

      yield* ctx.host.click("select-item-Beta");
      yield* waitForText(ctx, "select-readout", "open=false value=Beta");
      yield* ctx.expectContains(
        "choosing an item commits and closes",
        yield* textOf(ctx, "select-readout"),
        "open=false value=Beta",
      );
      yield* ctx.expectEqual(
        "the list unmounted",
        (yield* ctx.host.bounds("select-content")) === null,
        true,
      );
      yield* waitForFocus(ctx, "select-trigger");
      yield* ctx.expectEqual(
        "focus returned to the trigger",
        Option.getOrElse(
          Option.fromNullishOr(yield* ctx.host.focused()),
          () => "none",
        ),
        "select-trigger",
      );

      yield* ctx.host.key("down");
      yield* settle;
      yield* waitForText(ctx, "select-readout", "open=true");
      yield* ctx.expectContains(
        "the focused trigger opens on down",
        yield* textOf(ctx, "select-readout"),
        "open=true",
      );

      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "select-readout", "value=Gamma");
      yield* ctx.expectContains(
        "arrow then enter commits the next item",
        yield* textOf(ctx, "select-readout"),
        "open=false value=Gamma",
      );

      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "select-readout", "open=false");
      yield* ctx.expectContains(
        "escape closes",
        yield* textOf(ctx, "select-readout"),
        "open=false",
      );

      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.clickWindow(1000, 690);
      yield* settle;
      yield* waitForText(ctx, "select-readout", "open=false");
      yield* ctx.expectContains(
        "an outside press dismisses",
        yield* textOf(ctx, "select-readout"),
        "open=false",
      );
      yield* waitForFocus(ctx, "select-trigger");
      yield* ctx.expectEqual(
        "outside dismissal returns focus to the trigger",
        Option.getOrElse(
          Option.fromNullishOr(yield* ctx.host.focused()),
          () => "none",
        ),
        "select-trigger",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveSelect.id}.png`);
    }),
};

/** The published `Combobox` in a real window (plan `554`). */
const liveCombobox: LiveScenario = {
  id: "live-combobox",
  title: "Live Combobox: type to filter and Enter to choose in a window",
  capability: "combobox",
  view: comboboxScenario.view,
  ready: "combo-input",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("combo-input");
      yield* ctx.host.waitFor("combo-content");
      yield* settle;
      yield* waitForText(ctx, "combo-readout", "open=true");
      yield* ctx.expectContains(
        "focusing the input opens the list",
        yield* textOf(ctx, "combo-readout"),
        "open=true",
      );
      yield* ctx.expectContains(
        "the unfiltered list paints every item",
        yield* textOf(ctx, "combo-content"),
        "Alpha",
      );

      yield* ctx.host.key("b");
      yield* ctx.host.key("e");
      yield* settle;
      yield* waitForText(ctx, "combo-readout", "query=be");
      yield* ctx.expectContains(
        "typing reaches the query",
        yield* textOf(ctx, "combo-readout"),
        "query=be",
      );
      yield* ctx.expectEqual(
        "the non-matching item unmounted",
        (yield* ctx.host.bounds("combo-item-Alpha")) === null,
        true,
      );
      yield* ctx.expectContains(
        "the matching item is painted",
        yield* textOf(ctx, "combo-item-Beta"),
        "Beta",
      );

      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "combo-readout", "open=false value=Beta");
      yield* ctx.expectContains(
        "enter commits the highlighted item and closes",
        yield* textOf(ctx, "combo-readout"),
        "open=false value=Beta",
      );
      yield* ctx.expectEqual(
        "the list unmounted after the commit",
        (yield* ctx.host.bounds("combo-content")) === null,
        true,
      );

      yield* ctx.host.click("combo-input");
      yield* ctx.host.waitFor("combo-content");
      yield* settle;
      yield* ctx.host.key("z");
      yield* ctx.host.key("z");
      yield* settle;
      yield* ctx.host.waitFor("combo-empty");
      yield* ctx.expectContains(
        "the empty state mounts",
        yield* textOf(ctx, "combo-empty"),
        "no matches",
      );
      yield* ctx.expectEqual(
        "no item matches",
        (yield* ctx.host.bounds("combo-item-Beta")) === null,
        true,
      );

      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "combo-readout", "open=false");
      yield* ctx.expectContains(
        "escape closes",
        yield* textOf(ctx, "combo-readout"),
        "open=false",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveCombobox.id}.png`);
    }),
};

/**
 * The published `Tooltip` in a real window (plan `554`).
 *
 * The close is the component's 80 ms JS timer, so the check uses the bounded
 * wait rather than assuming a frame.
 */
const liveTooltip: LiveScenario = {
  id: "live-tooltip",
  title: "Live Tooltip: a real hover opens and the leave closes",
  capability: "tooltip",
  view: tooltipScenario.view,
  ready: "tooltip-trigger",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.hover("tooltip-elsewhere");
      yield* settle;
      yield* ctx.expectContains(
        "no tooltip before the pointer reaches it",
        yield* textOf(ctx, "tooltip-readout"),
        "open=false",
      );

      yield* ctx.host.hover("tooltip-trigger");
      yield* settle;
      yield* waitForText(ctx, "tooltip-readout", "open=true");
      yield* ctx.expectContains(
        "a real mouse enter opens the tooltip",
        yield* textOf(ctx, "tooltip-readout"),
        "open=true",
      );
      yield* ctx.host.waitFor("tooltip-content");
      yield* ctx.expectContains(
        "the content paints",
        yield* textOf(ctx, "tooltip-content"),
        "tip text",
      );
      yield* boxOf(ctx, "tooltip-content");
      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveTooltip.id}.png`);

      yield* ctx.host.hover("tooltip-elsewhere");
      yield* settle;
      yield* waitForText(ctx, "tooltip-readout", "open=false");
      yield* ctx.expectContains(
        "the delayed close fires after leaving",
        yield* textOf(ctx, "tooltip-readout"),
        "open=false",
      );
    }),
};

/** The rows the plan-302 scale fixture declares. */
const SCALE_ROWS_LARGE = 2000;
const SCALE_ROWS_SMALL = 100;
/** The scale list's declared viewport height. */
const SCALE_VIEWPORT = 300;
/**
 * The live tree's nodes per virtual row.
 *
 * The headless renderer counter reports three *host* nodes per row; the
 * protocol tree is a different view, so this is measured rather than copied —
 * it also reports **three** (2,000 rows = 6,019 nodes, 100 = 319; the delta is
 * 5,700 and the tree adds a constant 7 chrome nodes) (plan `620`).
 */
const SCALE_NODES_PER_ROW = 3;

const liveScale: LiveScenario = {
  id: "live-scale",
  title: "Live scale: the retained tree is not windowed",
  capability: "scale",
  view: scaleCostScenario.view,
  ready: "sc-row-0",
  steps: (ctx) =>
    Effect.gen(function* () {
      const anchor = yield* ctx.expectSome(
        "the live scale list reports an anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("sc-list")),
      );
      yield* ctx.expectEqual("the scale list starts on row 0", anchor[0], 0);
      yield* ctx.expectEqual("the scale list starts at offset 0", anchor[1], 0);
      yield* ctx.expectEqual(
        "the scale list has its declared viewport",
        anchor[2],
        SCALE_VIEWPORT,
      );

      const atRest = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the first row paints",
        Arr.contains(atRest, "row 0"),
        true,
      );
      yield* ctx.expectEqual(
        "a far row does not paint",
        Arr.contains(atRest, "row 1900"),
        false,
      );

      const large = yield* ctx.host.retainedNodes();
      yield* ctx.expectEqual(
        "the live tree retains a node per row",
        large > SCALE_ROWS_LARGE,
        true,
      );
      yield* ctx.expectEqual(
        "the live tree count is bounded",
        large < 20_000,
        true,
      );

      // Paint moves with the anchor; retention does not.
      yield* ctx.host.scrollToItem("sc-list", 1000);
      yield* settle;
      const jumped = yield* ctx.expectSome(
        "the live scale list reports a new anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("sc-list")),
      );
      yield* ctx.expectEqual("the jump anchors row 1000", jumped[0], 1000);
      const afterJumpText = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the jumped row paints",
        Arr.contains(afterJumpText, "row 1000"),
        true,
      );
      yield* ctx.expectEqual(
        "the first row no longer paints",
        Arr.contains(afterJumpText, "row 0"),
        false,
      );
      const afterJump = yield* ctx.host.retainedNodes();
      yield* ctx.expectEqual(
        "a jump keeps the retained count",
        afterJump,
        large,
      );

      // A smaller model removes exactly its rows' nodes, and regrowing restores.
      yield* ctx.host.scrollToItem("sc-list", 0);
      yield* settle;
      yield* ctx.host.click("sc-rows");
      yield* settle;
      yield* ctx.expectContains(
        "the live model shrinks",
        yield* textOf(ctx, "sc-state"),
        "rows=100",
      );
      const small = yield* ctx.host.retainedNodes();
      yield* ctx.expectEqual(
        "each removed virtual row removes its live nodes",
        large - small,
        SCALE_NODES_PER_ROW * (SCALE_ROWS_LARGE - SCALE_ROWS_SMALL),
      );

      yield* ctx.host.click("sc-rows");
      yield* settle;
      const regrown = yield* ctx.host.retainedNodes();
      yield* ctx.expectEqual("regrowing leaves no residue", regrown, large);

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveScale.id}.png`);
    }),
};

const table: LiveScenario = {
  id: "live-table",
  title: "Live table: a virtualized row click and a live scroll",
  capability: "table",
  view: virtualizedTableScenario.view,
  ready: "vtable-row-0",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("vtable-row-3");
      yield* settle;
      const picked = yield* textOf(ctx, "vtable-selected");
      yield* ctx.expectContains(
        "a painted virtual row is hit-testable",
        picked,
        "r3",
      );

      const anchor = yield* ctx.expectSome(
        "the virtual list reports a logical anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("vtable")),
      );
      yield* ctx.expectEqual("the anchor starts on row 0", anchor[0], 0);
      yield* ctx.expectEqual("the anchor starts at row offset 0", anchor[1], 0);
      yield* ctx.expectEqual("the list has a viewport", anchor[2] > 0, true);
      const viewport = anchor[2];

      const before = yield* ctx.expectSome(
        "the virtual list reports an offset",
        Option.fromNullishOr(yield* ctx.host.scrollOffset("vtable")),
      );
      yield* ctx.expectEqual("the list starts at the top", before.y, 0);

      yield* ctx.host.wheel("vtable-viewport", 0, -300);
      yield* settle;
      const after = yield* ctx.expectSome(
        "the virtual list still reports an offset",
        Option.fromNullishOr(yield* ctx.host.scrollOffset("vtable")),
      );
      yield* ctx.expectEqual(
        "the wheel moves a virtual list in a live window",
        after.y < 0,
        true,
      );
      const kept = yield* textOf(ctx, "vtable-selected");
      yield* ctx.expectContains(
        "the selection survives the scroll",
        kept,
        "r3",
      );

      yield* ctx.host.scrollToItem("vtable", 120);
      yield* settle;
      const jumped = yield* ctx.expectSome(
        "the live list reports an anchor after a jump",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("vtable")),
      );
      yield* ctx.expectEqual("scrollToItem anchors the row", jumped[0], 120);
      yield* ctx.expectEqual("the jump lands at offset 0", jumped[1], 0);
      yield* ctx.expectEqual(
        "the viewport height is unchanged by a jump",
        jumped[2],
        viewport,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${table.id}.png`);
    }),
};

/** The row height the `scroll-into-view` view declares. */
const SIV_ROW_HEIGHT = 32;

/** The `scroll-into-view` probe in a real window (plan `601`). */
const liveScrollIntoView: LiveScenario = {
  id: "live-scroll-into-view",
  title: "Live scrollIntoView: the element route beside scrollToItem",
  capability: "scroll",
  view: scrollIntoViewScenario.view,
  ready: "siv-row-0",
  steps: (ctx) =>
    Effect.gen(function* () {
      /** Whether `row N`'s painted text is in the window (an exact line). */
      const paintedRow = (row: number) =>
        Effect.map(ctx.host.paintedText(), (lines) =>
          Arr.some(lines, (line) => line === `row ${row}`),
        );

      yield* ctx.expectContains(
        "the probe mounts at the first row",
        yield* textOf(ctx, "siv-readout"),
        "active=0",
      );
      yield* ctx.expectEqual(
        "row 0 paints at rest",
        yield* paintedRow(0),
        true,
      );
      yield* ctx.expectEqual(
        "the last row is off the paint at rest",
        yield* paintedRow(199),
        false,
      );
      const atRest = yield* offsetOf(ctx, "siv-list");
      yield* ctx.expectNear("the list starts at the top", atRest.y, 0, 1);

      // Focus alone: does a real window reveal a clipped virtual row?
      yield* ctx.host.click("siv-row-0");
      yield* settle;
      yield* ctx.host.key("end");
      yield* settle;
      yield* waitForFocus(ctx, "siv-row-199");
      yield* ctx.expectContains(
        "End selects the last row",
        yield* textOf(ctx, "siv-readout"),
        "active=199",
      );
      yield* ctx.expectEqual(
        "End focuses the last row",
        yield* focusedOf(ctx),
        "siv-row-199",
      );
      const atEnd = yield* offsetOf(ctx, "siv-list");
      yield* ctx.expectEqual("End scrolled the list", atEnd.y < -500, true);
      const endAnchor = yield* ctx.expectSome(
        "the list reports a logical anchor after End",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("siv-list")),
      );
      yield* ctx.expectEqual(
        "the logical anchor is near the last row",
        endAnchor[0] + Math.floor(endAnchor[2] / SIV_ROW_HEIGHT) >= 199,
        true,
      );
      yield* ctx.expectEqual(
        "the raw offset saturates before the last row",
        atEnd.y > -2000,
        true,
      );
      yield* ctx.expectEqual(
        "End paints the last row",
        yield* paintedRow(199),
        true,
      );

      yield* ctx.host.key("home");
      yield* settle;
      const atHome = yield* offsetOf(ctx, "siv-list");
      yield* ctx.expectNear("Home returned to the top", atHome.y, 0, 1);
      yield* ctx.expectEqual(
        "Home focuses the first row",
        yield* focusedOf(ctx),
        "siv-row-0",
      );
      yield* ctx.expectEqual(
        "Home paints the first row",
        yield* paintedRow(0),
        true,
      );
      const homeAnchor = yield* ctx.expectSome(
        "the list reports a logical anchor after Home",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("siv-list")),
      );
      yield* ctx.expectEqual(
        "Home returns the anchor to the first row",
        homeAnchor[0],
        0,
      );

      // The list route.
      yield* ctx.host.scrollToItem("siv-list", 120);
      yield* settle;
      const atItem = yield* offsetOf(ctx, "siv-list");
      yield* ctx.expectEqual(
        "scrollToItem scrolled the list",
        atItem.y < 0,
        true,
      );
      yield* ctx.expectEqual(
        "scrollToItem paints the indexed row",
        yield* paintedRow(120),
        true,
      );
      const itemAnchor = yield* ctx.expectSome(
        "the list reports a logical anchor after scrollToItem",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("siv-list")),
      );
      yield* ctx.expectEqual(
        "the logical anchor is at the indexed row",
        Math.abs(itemAnchor[0] - 120) <= 5,
        true,
      );
      yield* ctx.expectContains(
        "scrollToItem does not change the selection",
        yield* textOf(ctx, "siv-readout"),
        "active=0",
      );

      // The element route, from a deep window back toward row 10.
      yield* ctx.host.scrollIntoView("siv-row-10");
      yield* settle;
      const atRow = yield* offsetOf(ctx, "siv-list");
      yield* ctx.expectEqual(
        "scrollIntoView scrolled back toward the target",
        atRow.y > atItem.y,
        true,
      );
      yield* ctx.expectEqual(
        "scrollIntoView paints the target row",
        yield* paintedRow(10),
        true,
      );
      const rowAnchor = yield* ctx.expectSome(
        "the list reports a logical anchor after scrollIntoView",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("siv-list")),
      );
      yield* ctx.expectEqual(
        "the logical anchor is at the target row",
        rowAnchor[0] <= 12,
        true,
      );

      // Keyboard follow: the next moves stay visible.
      yield* ctx.host.click("siv-row-10");
      yield* settle;
      yield* walkFocus(ctx, "down", 3);
      yield* ctx.expectContains(
        "three downs move the active row",
        yield* textOf(ctx, "siv-readout"),
        "active=13",
      );
      yield* ctx.expectEqual(
        "the keyboard move focuses the new row",
        yield* focusedOf(ctx),
        "siv-row-13",
      );
      yield* ctx.expectEqual(
        "the keyboard move keeps the row painted",
        yield* paintedRow(13),
        true,
      );

      // A scroll is not a focus change.
      yield* ctx.host.scrollIntoView("siv-row-199");
      yield* settle;
      yield* ctx.expectEqual(
        "scrollIntoView paints the far row",
        yield* paintedRow(199),
        true,
      );
      yield* ctx.expectEqual(
        "scrolling does not move focus",
        yield* focusedOf(ctx),
        "siv-row-13",
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${liveScrollIntoView.id}.png`,
      );
    }),
};

/**
 * `variable-rows`: the declared heights the view paints (20/40/60 by parity),
 * written here as literals — a check derived from the view's own helper would
 * move with a mutation (plan `350`).
 */
const vrHeightOf = (index: number): number => 20 + (index % 3) * 20;

/** The `y` a row starts at relative to the viewport when nothing is expanded. */
const vrBaseYOf = (index: number): number =>
  Arr.reduce(Arr.range(0, index), 0, (sum, row) => sum + vrHeightOf(row)) -
  vrHeightOf(index);

/** The viewport and expansion the view declares. */
const VR_VIEWPORT = 300;
const VR_EXPAND_BY = 60;

const variableRows: LiveScenario = {
  id: "live-variable-rows",
  title: "Live variable rows: heights, an expansion and an exact jump",
  capability: "virtual-list",
  view: variableRowsScenario.view,
  ready: "vr-row-0",
  steps: (ctx) =>
    Effect.gen(function* () {
      const origin = yield* boxOf(ctx, "vr-viewport");

      // 1. Declared heights stack in a real window.
      yield* Effect.forEach(
        Arr.range(0, 5),
        (index) =>
          Effect.gen(function* () {
            const box = yield* boxOf(ctx, `vr-row-${index}`);
            yield* ctx.expectNear(
              `live row ${index} stacks at its declared height`,
              box.y - origin.y,
              vrBaseYOf(index),
              1,
            );
            yield* ctx.expectNear(
              `live row ${index} declares its own height`,
              box.height,
              vrHeightOf(index),
              1,
            );
          }),
        { concurrency: 1, discard: true },
      );

      const start = yield* ctx.expectSome(
        "the live list reports an anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("vr-list")),
      );
      yield* ctx.expectEqual("the live list starts on row 0", start[0], 0);
      yield* ctx.expectEqual("the live list starts at offset 0", start[1], 0);
      yield* ctx.expectEqual(
        "the live list has its declared viewport",
        start[2],
        VR_VIEWPORT,
      );

      // 2. A real click expands the row and reflows the rows below.
      yield* ctx.host.click("vr-row-2");
      yield* settle;
      const expanded = yield* awaitedTextOf(ctx, "vr-state", "expanded=2");
      yield* ctx.expectContains(
        "a real click expands the row",
        expanded,
        "expanded=2",
      );
      const grown = yield* boxOf(ctx, "vr-row-2");
      yield* ctx.expectNear(
        "the live expanded row grows by exactly 60",
        grown.height,
        vrHeightOf(2) + VR_EXPAND_BY,
        1,
      );
      yield* Effect.forEach(
        Arr.range(3, 5),
        (index) =>
          Effect.gen(function* () {
            const box = yield* boxOf(ctx, `vr-row-${index}`);
            yield* ctx.expectNear(
              `live row ${index} moves down by the expansion`,
              box.y - origin.y,
              vrBaseYOf(index) + VR_EXPAND_BY,
              1,
            );
          }),
        { concurrency: 1, discard: true },
      );
      const expandedAnchor = yield* ctx.expectSome(
        "the expanded live list still reports an anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("vr-list")),
      );
      yield* ctx.expectEqual(
        "the live expansion does not move the anchor",
        `[${Arr.join(Arr.map(expandedAnchor, String), ",")}]`,
        `[0,0,${VR_VIEWPORT}]`,
      );
      yield* ctx.expectEqual(
        "the taller live rows shrink the painted window",
        Arr.contains(yield* ctx.host.paintedText(), "row 6"),
        false,
      );

      // 3. Collapsing restores the arithmetic.
      yield* ctx.host.click("vr-row-2");
      yield* settle;
      const collapsed = yield* awaitedTextOf(ctx, "vr-state", "expanded=none");
      yield* ctx.expectContains(
        "a second real click collapses the row",
        collapsed,
        "expanded=none",
      );
      const back = yield* boxOf(ctx, "vr-row-3");
      yield* ctx.expectNear(
        "collapsing moves the live rows back",
        back.y - origin.y,
        vrBaseYOf(3),
        1,
      );

      // 4. A jump is exact with mixed heights.
      yield* ctx.host.scrollToItem("vr-list", 30);
      yield* settle;
      const jumped = yield* ctx.expectSome(
        "the jumped live list reports an anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("vr-list")),
      );
      yield* ctx.expectEqual("the live jump anchors the row", jumped[0], 30);
      yield* ctx.expectEqual("the live jump lands at offset 0", jumped[1], 0);
      const jumpedRow = yield* boxOf(ctx, "vr-row-30");
      yield* ctx.expectNear(
        "the jumped live row sits at the viewport top",
        jumpedRow.y,
        origin.y,
        1,
      );
      yield* ctx.expectEqual(
        "the live jump unpaints the rows above it",
        Arr.contains(yield* ctx.host.paintedText(), "row 29"),
        false,
      );

      // 5. A real wheel names a row and keeps its offset inside it.
      yield* ctx.host.scrollToItem("vr-list", 0);
      yield* settle;
      yield* ctx.host.wheel("vr-viewport", 0, -120);
      yield* settle;
      const wheeled = yield* ctx.expectSome(
        "the wheeled live list reports an anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("vr-list")),
      );
      yield* ctx.expectEqual(
        "the live wheel moves past row 0",
        wheeled[0] > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the live in-row offset is inside that row",
        wheeled[1] >= 0 && wheeled[1] < vrHeightOf(wheeled[0]),
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${variableRows.id}.png`);
    }),
};

/** Waits out the preview card's 200 ms grace close on the real clock. */
const graceClose = Effect.sleep(Duration.millis(300));

const preview: LiveScenario = {
  id: "live-preview",
  title: "Live hover: enter/leave and a grace close in a window",
  capability: "preview",
  view: previewScenario.view,
  ready: "preview-trigger",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the card starts closed",
        yield* textOf(ctx, "preview-state"),
        "open=false",
      );

      yield* ctx.host.hover("preview-trigger");
      yield* settle;
      const opened = yield* textOf(ctx, "preview-state");
      yield* ctx.expectContains(
        "a real mouse move opens the card",
        opened,
        "open=true",
      );
      yield* ctx.expectContains(
        "the trigger reports the enter",
        yield* textOf(ctx, "preview-order"),
        "last=trigger:enter",
      );
      yield* ctx.expectEqual(
        "hover does not move focus",
        yield* focusedOf(ctx),
        "none",
      );

      yield* ctx.host.hover("preview-card-body");
      yield* graceClose;
      const held = yield* textOf(ctx, "preview-state");
      yield* ctx.expectContains(
        "the card survives the trigger's leave",
        held,
        "open=true",
      );
      yield* ctx.expectContains(
        "the fire-time presence check kept it open",
        held,
        "closes=0",
      );
      // The card's enter and the trigger's leave arrive in **one** batch live,
      // so the `prev`/`last` readout collapses them; the append-only log is the
      // honest record of the order (plan `199` §7).
      yield* ctx.expectContains(
        "the pointer reached the card",
        yield* textOf(ctx, "preview-log"),
        "body:enter",
      );

      yield* ctx.host.click("preview-card-action");
      yield* settle;
      yield* ctx.expectContains(
        "a control inside a hover-opened card works",
        yield* textOf(ctx, "preview-actions"),
        "actions=1",
      );
      yield* ctx.expectContains(
        "the click does not close the card",
        yield* textOf(ctx, "preview-state"),
        "open=true",
      );

      yield* ctx.host.hover("preview-away");
      yield* graceClose;
      // The close is a real JS timer: under load it can land after 300 ms, so
      // wait for the state a close should produce (plan `391`'s flake fix).
      yield* waitForText(ctx, "preview-state", "open=false");
      const left = yield* textOf(ctx, "preview-state");
      yield* ctx.expectContains(
        "leaving the card closes it",
        left,
        "open=false",
      );
      // Enter/leave are per element (plan `196`): the pointer last sat on the
      // card's action, so that is the leave which schedules the close.
      yield* ctx.expectContains(
        "the close came from the last hovered child",
        left,
        "reason=action",
      );
      yield* ctx.expectContains("one close happened", left, "closes=1");

      yield* ctx.host.hover("preview-trigger");
      yield* ctx.host.hover("preview-away");
      yield* ctx.host.hover("preview-trigger");
      yield* graceClose;
      const cancelled = yield* textOf(ctx, "preview-state");
      yield* ctx.expectContains(
        "a re-enter inside the delay cancels the close",
        cancelled,
        "open=true",
      );
      yield* ctx.expectContains(
        "the cancelled close never counted",
        cancelled,
        "closes=1",
      );

      yield* ctx.host.hover("preview-away");
      yield* graceClose;
      yield* waitForText(ctx, "preview-state", "open=false");
      const closed = yield* textOf(ctx, "preview-state");
      yield* ctx.expectContains(
        "a leave with no return closes",
        closed,
        "open=false",
      );
      yield* ctx.expectContains(
        "the second close came from the trigger",
        closed,
        "reason=trigger",
      );
      yield* ctx.expectContains("two closes happened", closed, "closes=2");

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${preview.id}.png`);
    }),
};

/** The two document lines whose washes the find query must paint. */
const SEARCH_LINES = [
  "The error handler logs an error.",
  "An Error is not the same as errors.",
];

/** The substring a wash actually covers. */
const matched = (match: Smoke.HighlightMatch): string =>
  match.text.slice(match.start, match.end);

const inDocument = (
  washes: ReadonlyArray<Smoke.HighlightMatch>,
): ReadonlyArray<Smoke.HighlightMatch> =>
  Arr.filter(washes, (match) => Arr.contains(SEARCH_LINES, match.text));

const highlights: LiveScenario = {
  id: "live-highlights",
  title: "Live search: painted washes and list match numbering",
  capability: "search",
  view: searchScenario.view,
  ready: "search-doc",
  steps: (ctx) =>
    Effect.gen(function* () {
      const doc = inDocument(yield* ctx.host.highlights());
      yield* ctx.expectEqual(
        "the document paints one wash per match in a live window",
        Arr.length(doc),
        4,
      );
      yield* ctx.expectEqual(
        "every document wash is the queried word",
        Arr.every(doc, (match) => Str.toLowerCase(matched(match)) === "error"),
        true,
      );

      const line = yield* boxOf(ctx, "search-line-1");
      const firstLine = Arr.filter(
        doc,
        (match) => match.text === SEARCH_LINES[0],
      );
      yield* ctx.expectEqual(
        "the first line paints both of its matches",
        Arr.length(firstLine),
        2,
      );
      yield* Effect.forEach(
        firstLine,
        (match) =>
          Effect.forEach(
            match.rects,
            (rect) =>
              ctx.expectEqual(
                "a wash is a visible box inside its line",
                rect.height > 0 &&
                  rect.x >= line.x - 1 &&
                  rect.y >= line.y - 1 &&
                  rect.x + rect.width <= line.x + line.width + 1 &&
                  rect.y + rect.height <= line.y + line.height + 1,
                true,
              ),
            { concurrency: 1, discard: true },
          ),
        { concurrency: 1, discard: true },
      );

      yield* ctx.host.click("search-clear");
      yield* settle;
      yield* ctx.expectEqual(
        "clearing the query removes the paint",
        Arr.length(inDocument(yield* ctx.host.highlights())),
        0,
      );
      yield* ctx.host.click("search-restore");
      yield* settle;
      yield* ctx.expectEqual(
        "restoring the query repaints the document",
        Arr.length(inDocument(yield* ctx.host.highlights())),
        4,
      );

      yield* ctx.host.click("search-next");
      yield* settle;
      const stepped = inDocument(yield* ctx.host.highlights());
      yield* ctx.expectEqual(
        "the find cursor moves to the second match",
        Option.getOrElse(
          Arr.findFirstIndex(stepped, (match) => match.active),
          () => -1,
        ),
        1,
      );

      yield* ctx.host.scrollToItem("search-list", 90);
      yield* settle;
      const rows = Arr.filter(yield* ctx.host.highlights(), (match) =>
        Str.startsWith("error at row")(match.text),
      );
      yield* ctx.expectEqual(
        "the visible window paints row washes",
        Arr.length(rows) > 0,
        true,
      );
      const activeRow = Arr.filter(rows, (match) => match.active);
      yield* ctx.expectEqual(
        "exactly one row is the active match",
        Arr.length(activeRow),
        1,
      );
      yield* ctx.expectEqual(
        "matchIndexOffset numbers matches document-wide",
        Option.getOrElse(
          Option.map(Arr.head(activeRow), (match) =>
            Str.includes("row 90")(match.text),
          ),
          () => false,
        ),
        true,
      );

      // The wash colours, from the window's own frame (plan `701`). The
      // capture is also this scenario's run artifact.
      yield* settle;
      const frame = yield* captureLive(
        ctx.host,
        `${LIVE_ARTIFACTS}/${highlights.id}.png`,
      );
      yield* highlightColourChecks(
        ctx,
        readAsync(ctx.host),
        frame,
        yield* ctx.host.highlights(),
      );
    }),
};

const scroller: LiveScenario = {
  id: "live-scroller",
  title: "Live scroller: pin, no-yank and jump in a window",
  capability: "scroller",
  view: messageScrollerScenario.view,
  ready: "ms-count",
  steps: (ctx) =>
    Effect.gen(function* () {
      const anchor = (label: string) =>
        Effect.gen(function* () {
          return yield* ctx.expectSome(
            label,
            Option.fromNullishOr(yield* ctx.host.listScrollTop("ms-list")),
          );
        });
      const painted = (message: number) =>
        Effect.map(ctx.host.paintedText(), (lines) =>
          Arr.contains(lines, `message ${message}`),
        );

      // 1. A real window opens the chat at its latest message.
      yield* waitForAnchor(ctx, "ms-list", "50,0");
      const opening = yield* anchor("the live list reports an anchor");
      yield* ctx.expectEqual(
        "the live scroller opens at the max scroll",
        `${opening[0]},${opening[1]}`,
        "50,0",
      );
      yield* ctx.expectEqual(
        "the live scroller opens pinned",
        yield* textOf(ctx, "ms-pin"),
        "true",
      );
      yield* ctx.expectEqual(
        "the live tail is painted",
        yield* painted(60),
        true,
      );
      yield* ctx.expectEqual(
        "the live affordance is absent while pinned",
        (yield* ctx.host.bounds("ms-jump")) === null,
        true,
      );

      // 2. A pinned append follows through the automation input path.
      yield* ctx.host.click("ms-append");
      yield* settle;
      yield* waitForText(ctx, "ms-count", "61");
      yield* waitForAnchor(ctx, "ms-list", "51,0");
      const appended = yield* anchor(
        "the appended live list reports an anchor",
      );
      yield* ctx.expectEqual(
        "the live append reached React",
        yield* textOf(ctx, "ms-count"),
        "61",
      );
      yield* ctx.expectEqual(
        "the live pinned append follows",
        `${appended[0]},${appended[1]}`,
        "51,0",
      );
      yield* ctx.expectEqual(
        "the live appended row is painted",
        yield* painted(61),
        true,
      );

      // 3. A real wheel unpins.
      yield* ctx.host.wheel("ms-viewport", 0, 400);
      yield* settle;
      yield* waitForText(ctx, "ms-pin", "false");
      yield* waitForAnchor(ctx, "ms-list", "37,20");
      const scrolled = yield* anchor(
        "the scrolled live list reports an anchor",
      );
      yield* ctx.expectEqual(
        "the live wheel unpins the reader",
        yield* textOf(ctx, "ms-pin"),
        "false",
      );
      yield* ctx.expectEqual(
        "the live anchor records the wheel",
        `${scrolled[0]},${scrolled[1]}`,
        "37,20",
      );
      yield* ctx.expectEqual(
        "the live affordance is painted while unpinned",
        (yield* ctx.host.bounds("ms-jump")) === null,
        false,
      );

      // 4. An append while unpinned must not move the reader.
      yield* ctx.host.click("ms-append");
      yield* settle;
      yield* waitForAnchor(ctx, "ms-list", "37,20");
      yield* waitForText(ctx, "ms-unread", "1");
      const held = yield* anchor("the unpinned live list reports an anchor");
      yield* ctx.expectEqual(
        "the live unpinned append leaves the anchor untouched",
        `${held[0]},${held[1]}`,
        "37,20",
      );
      yield* ctx.expectEqual(
        "the live unpinned append increments unread",
        yield* textOf(ctx, "ms-unread"),
        "1",
      );
      yield* ctx.expectEqual(
        "the live new tail is not painted",
        (yield* ctx.host.bounds("ms-row-62")) === null,
        true,
      );

      // 5. Jump to latest re-pins in a real window.
      yield* ctx.host.click("ms-jump");
      yield* settle;
      yield* waitForText(ctx, "ms-pin", "true");
      yield* waitForText(ctx, "ms-unread", "0");
      yield* waitForAnchor(ctx, "ms-list", "52,0");
      const jumped = yield* anchor("the jumped live list reports an anchor");
      yield* ctx.expectEqual(
        "the live jump re-pins",
        yield* textOf(ctx, "ms-pin"),
        "true",
      );
      yield* ctx.expectEqual(
        "the live jump clears unread",
        yield* textOf(ctx, "ms-unread"),
        "0",
      );
      yield* ctx.expectEqual(
        "the live jump lands on the new max scroll",
        `${jumped[0]},${jumped[1]}`,
        "52,0",
      );
      yield* ctx.expectEqual(
        "the live jumped tail is painted",
        yield* painted(62),
        true,
      );

      // 6. A streamed last row keeps the tail on the viewport bottom.
      yield* ctx.host.click("ms-stream");
      yield* settle;
      yield* ctx.host.click("ms-stream");
      yield* settle;
      yield* waitForText(ctx, "ms-last-height", "50");
      yield* waitForAnchor(ctx, "ms-list", "52,20");
      const streamed = yield* anchor(
        "the streamed live list reports an anchor",
      );
      yield* ctx.expectEqual(
        "the live streamed row grew",
        yield* textOf(ctx, "ms-last-height"),
        "50",
      );
      yield* ctx.expectEqual(
        "the live stream moves the anchor with the row",
        `${streamed[0]},${streamed[1]}`,
        "52,20",
      );
      const tail = yield* boxOf(ctx, "ms-row-62");
      const viewport = yield* boxOf(ctx, "ms-viewport");
      yield* ctx.expectNear(
        "the live streamed tail stays on the viewport bottom",
        tail.y + tail.height,
        viewport.y + viewport.height,
        1,
      );
      yield* ctx.expectEqual(
        "the live stream stays pinned",
        yield* textOf(ctx, "ms-pin"),
        "true",
      );

      // 7. A short history paints everything and offers nothing.
      yield* ctx.host.click("ms-reset");
      yield* settle;
      yield* waitForText(ctx, "ms-count", "3");
      yield* waitForAnchor(ctx, "ms-list", "0,0");
      const short = yield* anchor("the short live history reports an anchor");
      yield* ctx.expectEqual(
        "the short live history reached React",
        yield* textOf(ctx, "ms-count"),
        "3",
      );
      yield* ctx.expectEqual(
        "the short live history has nowhere to scroll",
        `${short[0]},${short[1]}`,
        "0,0",
      );
      yield* ctx.expectEqual(
        "the short live history is pinned",
        yield* textOf(ctx, "ms-pin"),
        "true",
      );
      yield* ctx.expectEqual(
        "every short live row is painted",
        yield* painted(3),
        true,
      );
      yield* ctx.expectEqual(
        "a short live history offers no jump",
        (yield* ctx.host.bounds("ms-jump")) === null,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${scroller.id}.png`);
    }),
};

const log: LiveScenario = {
  id: "live-log",
  title: "Live log viewer: tail, wheel and no snap-back",
  capability: "log",
  view: logViewerScenario.view,
  ready: "log-count",
  steps: (ctx) =>
    Effect.gen(function* () {
      const anchor = (label: string) =>
        Effect.gen(function* () {
          const value = yield* ctx.expectSome(
            label,
            Option.fromNullishOr(yield* ctx.host.listScrollTop("log-list")),
          );
          return `${value[0]},${value[1]}`;
        });
      const painted = (line: number) =>
        Effect.map(ctx.host.paintedText(), (lines) =>
          Arr.contains(lines, `line ${line}`),
        );

      // 1. A real window opens the log at its tail.
      yield* waitForAnchor(ctx, "log-list", "30,0");
      yield* ctx.expectEqual(
        "the live log opens at the tail anchor",
        yield* anchor("the live log reports an anchor"),
        "30,0",
      );
      yield* ctx.expectEqual(
        "the live tail is painted",
        yield* painted(29),
        true,
      );
      yield* ctx.expectEqual(
        "the live head is outside the window",
        yield* painted(0),
        false,
      );

      // 2. A pinned append follows through the real click path.
      yield* ctx.host.click("log-append");
      yield* settle;
      yield* waitForText(ctx, "log-count", "50");
      yield* waitForAnchor(ctx, "log-list", "50,0");
      yield* ctx.expectEqual(
        "the live append reached React",
        yield* textOf(ctx, "log-count"),
        "50",
      );
      yield* ctx.expectEqual(
        "the live pinned append follows to the tail",
        yield* anchor("the appended live log reports an anchor"),
        "50,0",
      );
      yield* ctx.expectEqual(
        "the appended live tail is painted",
        yield* painted(49),
        true,
      );
      yield* ctx.expectEqual(
        "the old live tail left the window",
        yield* painted(29),
        false,
      );

      // 3. A real wheel over the wrapper moves the reader off the tail.
      yield* ctx.host.wheel("log-viewport", 0, 100);
      yield* settle;
      yield* waitForAnchor(ctx, "log-list", "31,0");
      const scrolled = yield* anchor("the scrolled live log reports an anchor");
      yield* ctx.expectEqual(
        "the live wheel leaves the tail",
        scrolled,
        "31,0",
      );
      yield* ctx.expectEqual(
        "the live tail leaves the window",
        yield* painted(49),
        false,
      );
      yield* ctx.expectEqual(
        "an earlier live line is inside the window",
        yield* painted(40),
        true,
      );

      // 4. An append while scrolled up must not yank the reader.
      yield* ctx.host.click("log-append");
      yield* settle;
      yield* waitForText(ctx, "log-count", "70");
      yield* waitForAnchor(ctx, "log-list", "31,0");
      yield* ctx.expectEqual(
        "the live append while scrolled up reached React",
        yield* textOf(ctx, "log-count"),
        "70",
      );
      yield* ctx.expectEqual(
        "the live append while scrolled up does not snap back",
        yield* anchor("the unpinned live log reports an anchor"),
        scrolled,
      );
      yield* ctx.expectEqual(
        "the live appended tail stays out of the reader's window",
        yield* painted(69),
        false,
      );

      // 5. The at-end sentinel returns to the tail.
      yield* ctx.host.scrollToItem("log-list", 70);
      yield* settle;
      yield* waitForAnchor(ctx, "log-list", "70,0");
      yield* ctx.expectEqual(
        "the live sentinel returns to the tail",
        yield* anchor("the returned live log reports an anchor"),
        "70,0",
      );
      yield* ctx.expectEqual(
        "the returned live tail is painted",
        yield* painted(69),
        true,
      );

      // 6. An append at the tail follows again.
      yield* ctx.host.click("log-append");
      yield* settle;
      yield* waitForText(ctx, "log-count", "90");
      yield* waitForAnchor(ctx, "log-list", "90,0");
      yield* ctx.expectEqual(
        "the live append at the tail follows again",
        yield* anchor("the following live log reports an anchor"),
        "90,0",
      );
      yield* ctx.expectEqual(
        "the following live tail is painted",
        yield* painted(89),
        true,
      );
      yield* ctx.expectEqual(
        "the previous live tail leaves the window",
        yield* painted(69),
        false,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${log.id}.png`);
    }),
};

/** Every element the shipped dialogs may focus (the headless view's contract). */
const TIER2_FOCUSABLE: ReadonlyArray<string> = [
  "dialog-content",
  "dialog-field",
  "dialog-field-2",
  "dialog-cancel",
  "dialog-save",
  "dialog-close",
  "confirm-cancel",
  "confirm-accept",
];

/** Waits up to 3 s for the toast readout to report `count`. */
const waitForToastCount = (ctx: LiveContext, count: number) =>
  waitForText(ctx, "tier2-toast-readout", `count=${count}`);

const tier2Dialog: LiveScenario = {
  id: "live-tier2-dialog",
  title: "Live Tier 2: the shipped Dialog and ConfirmDialog",
  capability: "tier2",
  view: tier2DialogScenario.view,
  ready: "dialog-open",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the dialog starts closed",
        yield* textOf(ctx, "tier2-dialog-readout"),
        "open=false",
      );

      yield* ctx.host.click("dialog-open");
      yield* ctx.host.waitFor("dialog-content");
      yield* settle;
      yield* ctx.expectContains(
        "the trigger opens the dialog",
        yield* textOf(ctx, "tier2-dialog-readout"),
        "open=true",
      );
      const surface = yield* boxOf(ctx, "dialog-content");
      // The dialog's content box is inset 24 px per side (plan 529 §6.3).
      yield* ctx.expectNear(
        "the surface is centred horizontally",
        surface.x + surface.width / 2,
        WINDOW.width / 2 + 24,
        2,
      );
      yield* ctx.expectNear(
        "the surface is centred vertically",
        surface.y + surface.height / 2,
        WINDOW.height / 2 + 24,
        2,
      );
      yield* ctx.expectEqual(
        "focus entered the surface",
        yield* focusedOf(ctx),
        "dialog-content",
      );

      const walk = yield* walkFocus(ctx, "tab", 5);
      const inside = Arr.every(
        Arr.filter(walk, (id): id is string => id !== null),
        (id) => Arr.contains(TIER2_FOCUSABLE, id),
      );
      yield* ctx.expectEqual(
        "Tab stays inside the dialog in a real window",
        inside,
        true,
      );
      yield* ctx.expectEqual(
        "Tab moved the focus",
        Arr.length(Arr.dedupe(walk)) > 1,
        true,
      );

      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectContains(
        "Escape closed the dialog",
        yield* textOf(ctx, "tier2-dialog-readout"),
        "open=false",
      );
      yield* ctx.expectEqual(
        "focus returned to the trigger",
        yield* focusedOf(ctx),
        "dialog-open",
      );

      yield* ctx.host.click("confirm-open");
      yield* ctx.host.waitFor("dialog-content");
      yield* settle;
      yield* ctx.expectEqual(
        "Cancel holds initial focus in a real window",
        yield* focusedOf(ctx),
        "confirm-cancel",
      );
      yield* ctx.host.key("enter");
      yield* settle;
      yield* ctx.expectContains(
        "Enter on Cancel cancels",
        yield* textOf(ctx, "tier2-dialog-readout"),
        "confirm=false",
      );
      yield* ctx.expectContains(
        "cancelling confirmed nothing",
        yield* textOf(ctx, "tier2-dialog-readout"),
        "confirms=0",
      );

      yield* ctx.host.click("confirm-open");
      yield* settle;
      yield* ctx.host.click("confirm-accept");
      yield* settle;
      yield* ctx.expectContains(
        "confirm ran once",
        yield* textOf(ctx, "tier2-dialog-readout"),
        "confirms=1",
      );
      yield* ctx.expectContains(
        "confirm left the dialog open",
        yield* textOf(ctx, "tier2-dialog-readout"),
        "confirm=true",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectContains(
        "Escape closed the confirmed dialog",
        yield* textOf(ctx, "tier2-dialog-readout"),
        "confirm=false",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tier2Dialog.id}.png`);
    }),
};

const tier2Menu: LiveScenario = {
  id: "live-tier2-menu",
  title: "Live Tier 2: the shipped DropdownMenu and ContextMenu",
  capability: "tier2",
  view: tier2MenuScenario.view,
  ready: "menu-open",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("menu-open");
      yield* ctx.host.waitFor("menu-content");
      yield* settle;
      yield* ctx.expectEqual(
        "the menu surface owns focus",
        yield* focusedOf(ctx),
        "menu-content",
      );

      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.expectEqual(
        "the first arrow lands on the first row",
        yield* focusedOf(ctx),
        "menu-rename",
      );
      yield* ctx.host.key("enter");
      yield* settle;
      yield* ctx.expectContains(
        "Enter ran the row once",
        yield* textOf(ctx, "tier2-menu-readout"),
        "selected=Rename",
      );
      yield* ctx.expectEqual(
        "the menu closed after activation",
        (yield* ctx.host.bounds("menu-content")) === null,
        true,
      );
      yield* ctx.expectEqual(
        "focus returned to the trigger",
        yield* focusedOf(ctx),
        "menu-open",
      );

      yield* ctx.host.click("menu-open");
      yield* settle;
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.expectEqual(
        "the second arrow skipped the disabled row",
        yield* focusedOf(ctx),
        "menu-delete",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectEqual(
        "Escape closed the menu",
        (yield* ctx.host.bounds("menu-content")) === null,
        true,
      );

      const target = yield* boxOf(ctx, "menu-target");
      yield* ctx.host.rightClick("menu-target");
      yield* ctx.host.waitFor("context-content");
      yield* settle;
      const menu = yield* boxOf(ctx, "context-content");
      yield* ctx.expectNear(
        "the context menu opens at the pointer's x",
        menu.x,
        target.x + target.width / 2,
        12,
      );
      yield* ctx.expectNear(
        "the context menu opens at the pointer's y",
        menu.y,
        target.y + target.height / 2,
        12,
      );
      yield* ctx.host.click("context-copy");
      yield* settle;
      yield* ctx.expectContains(
        "a pressed row ran once",
        yield* textOf(ctx, "tier2-menu-readout"),
        "copies=1",
      );

      yield* ctx.host.rightClick("menu-target");
      yield* settle;
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectEqual(
        "Escape closed the context menu",
        (yield* ctx.host.bounds("context-content")) === null,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tier2Menu.id}.png`);
    }),
};

const tier2Toast: LiveScenario = {
  id: "live-tier2-toast",
  title: "Live Tier 2: the shipped Toast provider and viewport",
  capability: "tier2",
  view: tier2ToastScenario.view,
  ready: "toast-push",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "tier2-toast-readout", "count=0");
      yield* ctx.expectContains(
        "the queue starts empty",
        yield* textOf(ctx, "tier2-toast-readout"),
        "count=0",
      );

      yield* ctx.host.click("toast-push");
      yield* ctx.host.waitFor("toast-1");
      yield* settle;
      const card = yield* boxOf(ctx, "toast-1");
      yield* ctx.expectNear(
        "the card is inset from the right",
        WINDOW.width - (card.x + card.width),
        16,
        1,
      );
      yield* ctx.expectNear(
        "the card is inset from the bottom",
        WINDOW.height - (card.y + card.height),
        16,
        1,
      );
      yield* ctx.expectNear(
        "the card is 378 px wide inside its borders",
        card.width,
        378,
        1,
      );

      yield* ctx.host.click("toast-dismiss");
      yield* settle;
      yield* waitForToastCount(ctx, 0);
      yield* ctx.expectContains(
        "the dismiss control removed its card",
        yield* textOf(ctx, "tier2-toast-readout"),
        "count=0",
      );

      yield* ctx.host.click("toast-push-action");
      yield* ctx.host.waitFor("toast-2");
      yield* ctx.host.waitFor("toast-action");
      yield* settle;
      yield* ctx.host.click("toast-action");
      yield* settle;
      yield* waitForText(ctx, "tier2-toast-readout", "actions=1");
      yield* waitForToastCount(ctx, 0);
      yield* ctx.expectContains(
        "the action ran exactly once",
        yield* textOf(ctx, "tier2-toast-readout"),
        "actions=1",
      );
      yield* ctx.expectContains(
        "the action dismissed its card",
        yield* textOf(ctx, "tier2-toast-readout"),
        "count=0",
      );

      yield* ctx.host.click("toast-push");
      yield* settle;
      yield* ctx.host.click("toast-push");
      yield* settle;
      yield* ctx.host.waitFor("toast-3");
      yield* ctx.host.waitFor("toast-4");
      yield* waitForToastCount(ctx, 2);
      const older = yield* boxOf(ctx, "toast-3");
      const newest = yield* boxOf(ctx, "toast-4");
      yield* ctx.expectEqual(
        "the older card sits above the newest",
        older.y + older.height <= newest.y,
        true,
      );
      yield* ctx.expectNear(
        "the newest card owns the bottom inset",
        WINDOW.height - (newest.y + newest.height),
        16,
        1,
      );

      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectContains(
        "Escape is not a toast shortcut",
        yield* textOf(ctx, "tier2-toast-readout"),
        "count=2",
      );

      yield* ctx.host.click("toast-push-short");
      yield* waitForToastCount(ctx, 3);
      yield* waitForToastCount(ctx, 2);
      yield* ctx.expectContains(
        "the short toast dismissed itself in real time",
        yield* textOf(ctx, "tier2-toast-readout"),
        "count=2",
      );
      yield* ctx.expectEqual(
        "the short toast left the tree",
        (yield* ctx.host.bounds("toast-5")) === null,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tier2Toast.id}.png`);
    }),
};

const liveToast: LiveScenario = {
  id: "live-toast",
  title: "Live toast viewport: layering, hit-testing and focus",
  capability: "toast",
  view: toastScenario.view,
  ready: "toast-root",
  steps: (ctx) =>
    Effect.gen(function* () {
      // The exit tween is driven by the clock, never by a race with a paint.
      yield* ctx.host.pauseMotion();

      yield* waitForBounds(
        ctx,
        "toast-root",
        (box) =>
          Math.abs(box.width - WINDOW.width) <= 1 &&
          Math.abs(box.height - WINDOW.height) <= 1,
      );
      const frame = yield* boxOf(ctx, "toast-root");
      yield* ctx.expectNear(
        "the live probe takes the window width",
        frame.width,
        WINDOW.width,
        1,
      );
      yield* ctx.expectNear(
        "the live probe takes the window height",
        frame.height,
        WINDOW.height,
        1,
      );
      yield* waitForText(ctx, "toast-readout", "count=0");

      // One card: right/bottom placement and the 0.10.0 content box.
      yield* ctx.host.click("toast-show");
      yield* ctx.host.waitFor("toast-1");
      yield* settle;
      const first = yield* boxOf(ctx, "toast-1");
      yield* ctx.expectNear(
        "the card's content is inset from the right",
        frame.x + frame.width - (first.x + first.width),
        INSET + 9,
        1,
      );
      yield* ctx.expectNear(
        "the card's content is inset from the bottom",
        frame.y + frame.height - (first.y + first.height),
        INSET + 17,
        1,
      );
      yield* ctx.expectNear(
        "the card keeps its fixed content width",
        first.width,
        CARD_WIDTH - 2,
        1,
      );
      yield* ctx.expectContains(
        "the card paints its title",
        yield* textOf(ctx, "toast-1"),
        "Toast 1",
      );

      // Two cards: the stack grows upward with one gap; the newest owns the
      // bottom inset.
      yield* ctx.host.click("toast-show");
      yield* ctx.host.waitFor("toast-2");
      yield* settle;
      const firstLifted = yield* boxOf(ctx, "toast-1");
      const second = yield* boxOf(ctx, "toast-2");
      yield* ctx.expectNear(
        "the second card sits one gap above the first",
        second.y - (firstLifted.y + CARD_HEIGHT),
        GAP,
        1,
      );
      yield* ctx.expectNear(
        "the newest card owns the bottom inset",
        frame.y + frame.height - (second.y + second.height),
        INSET + 17,
        1,
      );

      // Three cards, then the two hit-testing claims. `toast-under` sits inside
      // the viewport's painted strip, left of the cards: `pointerEvents: "none"`
      // is what lets the click through in a window.
      yield* ctx.host.click("toast-show");
      yield* ctx.host.waitFor("toast-3");
      yield* settle;
      yield* ctx.host.click("toast-under");
      yield* settle;
      yield* ctx.expectContains(
        "the viewport's empty strip does not block the page",
        yield* textOf(ctx, "toast-readout"),
        "under=1",
      );
      yield* ctx.host.click("toast-action");
      yield* settle;
      yield* ctx.expectContains(
        "a click beside the stack reaches the page",
        yield* textOf(ctx, "toast-readout"),
        "action=1",
      );

      // A painted card owns its box: the surface below it never sees the click.
      // Click the bottom card, whose box overlaps `toast-behind`.
      yield* ctx.host.click("toast-3");
      yield* settle;
      yield* ctx.expectContains(
        "the page under a card never sees the click",
        yield* textOf(ctx, "toast-readout"),
        "behind=0",
      );

      // Dismiss through the card's own control: a real click, a frozen exit, then
      // one clock jump. A timer racing a paint is not a deterministic exit point
      // (plans 336 and 597).
      yield* ctx.host.click("toast-dismiss-3");
      yield* settle;
      yield* ctx.expectContains(
        "dismissing removes exactly the clicked card",
        yield* textOf(ctx, "toast-readout"),
        "count=2",
      );
      yield* ctx.expectContains(
        "the dismiss click did not reach the page below",
        yield* textOf(ctx, "toast-readout"),
        "behind=0",
      );
      yield* ctx.expectSome(
        "the dismissed card is still laid out while its exit is frozen",
        Option.fromNullishOr(yield* ctx.host.bounds("toast-3")),
      );
      yield* ctx.host.fastForwardMotion(EXIT_MS);
      yield* settle;
      yield* ctx.expectEqual(
        "the dismissed card left the tree after its exit",
        (yield* ctx.host.bounds("toast-3")) === null,
        true,
      );
      const oneAfter = yield* boxOf(ctx, "toast-1");
      const twoAfter = yield* boxOf(ctx, "toast-2");
      yield* ctx.expectNear(
        "the survivors reflow with the same gap",
        twoAfter.y - (oneAfter.y + CARD_HEIGHT),
        GAP,
        1,
      );

      // Focus: the field keeps focus when its submit pushes a toast, and that
      // toast's dismiss control is the next Tab stop.
      yield* ctx.host.click("toast-field");
      yield* waitForFocus(ctx, "toast-field");
      yield* ctx.host.key("enter");
      yield* waitForText(ctx, "toast-readout", "count=3");
      yield* ctx.expectEqual(
        "showing a toast does not steal focus",
        yield* focusedOf(ctx),
        "toast-field",
      );
      yield* ctx.host.focusNext();
      yield* settle;
      yield* ctx.expectContains(
        "Tab reaches a toast dismiss control",
        yield* focusedOf(ctx),
        "toast-dismiss-",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectContains(
        "Escape leaves the stack alone",
        yield* textOf(ctx, "toast-readout"),
        "count=3",
      );

      // Hover is per element and crosses the pointerEvents chain.
      yield* ctx.host.hover("toast-4");
      yield* waitForText(ctx, "toast-readout", "hover=4");
      yield* ctx.host.hover("toast-field");
      yield* waitForText(ctx, "toast-readout", "hover=none");

      // A real timer removes only its own card. Freeze the clock and name both
      // cards before the 250 ms timer starts.
      yield* ctx.host.click("toast-clear");
      yield* waitForText(ctx, "toast-readout", "count=0");
      yield* ctx.host.click("toast-show");
      yield* ctx.host.waitFor("toast-5");
      yield* ctx.host.click("toast-show-short");
      yield* ctx.host.waitFor("toast-6");
      yield* waitForText(ctx, "toast-readout", "dismissed=Short");
      yield* ctx.expectContains(
        "only the long toast remains queued",
        yield* textOf(ctx, "toast-readout"),
        "count=1",
      );
      yield* ctx.expectSome(
        "the long toast survived its sibling's timer",
        Option.fromNullishOr(yield* ctx.host.bounds("toast-5")),
      );
      yield* ctx.host.fastForwardMotion(0);
      yield* ctx.host.fastForwardMotion(EXIT_MS + 1);
      yield* settle;
      yield* ctx.expectEqual(
        "the short toast leaves the layout after its exit",
        (yield* ctx.host.bounds("toast-6")) === null,
        true,
      );
      const survivor = yield* boxOf(ctx, "toast-5");
      yield* ctx.expectNear(
        "the survivor reflows to the bottom inset",
        frame.y + frame.height - (survivor.y + survivor.height),
        INSET + 17,
        1,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveToast.id}.png`);
    }),
};

const keyRouting: LiveScenario = {
  id: "live-key-routing",
  title: "Live key routing: the focused element, its ancestor and the window",
  capability: "focus",
  view: () => <KeyRoutingView />,
  ready: "key-inner",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "key-routing-readout", "inner=0");
      yield* ctx.expectEqual(
        "autoFocus took native focus",
        yield* focusedOf(ctx),
        "key-inner",
      );

      yield* ctx.host.key("x");
      yield* settle;
      yield* waitForText(ctx, "key-routing-readout", "inner=1");
      yield* ctx.expectContains(
        "the focused element and every ancestor receive the key",
        yield* textOf(ctx, "key-routing-readout"),
        "inner=1 middle=1 outer=1",
      );
      yield* ctx.expectContains(
        "the app-level window handler receives it too",
        yield* textOf(ctx, "key-routing-readout"),
        "window=1",
      );
      // Plan `390` retracted the click half of the `onFocus` claim; plan `603`
      // retracts the `autoFocus` half. The same code read `innerFocus=0` and
      // `innerFocus=1` on this host, so the counter stays in the readout and is
      // never asserted. Native focus and key delivery are the stable claims.

      yield* ctx.host.key("down");
      yield* settle;
      yield* waitForText(ctx, "key-routing-readout", "inner=2");
      yield* ctx.expectContains(
        "a named key reaches the focused element and every ancestor",
        yield* textOf(ctx, "key-routing-readout"),
        "inner=2 middle=2 outer=2",
      );

      yield* ctx.host.click("key-outer");
      yield* waitForFocus(ctx, "key-outer");
      yield* settle;
      yield* ctx.host.key("x");
      yield* settle;
      yield* waitForText(ctx, "key-routing-readout", "outer=1");
      yield* ctx.expectContains(
        "delivery follows the new focus",
        yield* textOf(ctx, "key-routing-readout"),
        "inner=2 middle=2 outer=3",
      );
      yield* ctx.expectContains(
        "the window handler sees it again",
        yield* textOf(ctx, "key-routing-readout"),
        "window=2",
      );

      yield* ctx.host.click("key-inner");
      yield* waitForFocus(ctx, "key-inner");
      yield* settle;
      yield* ctx.host.key("x");
      yield* settle;
      yield* waitForText(ctx, "key-routing-readout", "inner=3");
      yield* ctx.expectContains(
        "clicking the child returns delivery to it",
        yield* textOf(ctx, "key-routing-readout"),
        "inner=3 middle=3 outer=4",
      );
      yield* ctx.expectContains(
        "the window sees every key",
        yield* textOf(ctx, "key-routing-readout"),
        "window=3",
      );
      yield* ctx.expectEqual(
        "clicking the child focuses it",
        yield* focusedOf(ctx),
        "key-inner",
      );

      yield* ctx.host.key("cmd-k");
      yield* settle;
      yield* waitForText(ctx, "key-routing-readout", "chords=1");
      yield* ctx.expectContains(
        "a modifier chord reaches the window handler with its modifier",
        yield* textOf(ctx, "key-routing-readout"),
        "window=3",
      );
      yield* ctx.expectContains(
        "the focused element receives the chord too",
        yield* textOf(ctx, "key-routing-readout"),
        "inner=4",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${keyRouting.id}.png`);
    }),
};

/** Waits for the palette readout, then asserts it — a timed-out wait never passes. */
const paletteReadoutHas = (ctx: LiveContext, label: string, needle: string) =>
  Effect.gen(function* () {
    yield* waitForText(ctx, "palette-readout", needle);
    yield* ctx.expectContains(
      label,
      yield* textOf(ctx, "palette-readout"),
      needle,
    );
  });

const commandPalette: LiveScenario = {
  id: "live-command-palette",
  title:
    "Live command palette: the window chord, one focus owner and dismissal",
  capability: "command",
  view: commandPaletteScenario.view,
  ready: "palette-page",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* paletteReadoutHas(ctx, "the palette starts closed", "open=false");

      // 1. The window chord, with nothing focused yet.
      yield* ctx.host.key("cmd-k");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "the window shortcut opens the palette with nothing focused",
        "open=true",
      );
      yield* paletteReadoutHas(
        ctx,
        "the shortcut records its reason",
        "last=cmd-k",
      );
      yield* paletteReadoutHas(ctx, "the shortcut resets the query", "query=-");
      yield* waitForFocus(ctx, "palette-input");
      yield* ctx.expectContains(
        "the app-level handler receives the chord",
        yield* textOf(ctx, "palette-readout"),
        "window=k",
      );
      yield* ctx.expectEqual(
        "opening the palette focuses its input",
        yield* focusedOf(ctx),
        "palette-input",
      );
      const veil = yield* boxOf(ctx, "palette-veil");
      yield* ctx.expectNear(
        "the veil is the window wide",
        veil.width,
        WINDOW.width,
        2,
      );
      yield* ctx.expectNear(
        "the veil is the window tall",
        veil.height,
        WINDOW.height,
        2,
      );

      // 2. Typing filters, and the window handler still sees the keys.
      yield* ctx.host.key("s");
      yield* ctx.host.key("e");
      yield* ctx.host.key("t");
      yield* settle;
      yield* paletteReadoutHas(ctx, "typing filters the palette", "query=set");
      yield* ctx.expectContains(
        "the app-level handler sees typing in the field",
        yield* textOf(ctx, "palette-readout"),
        "window=t",
      );
      yield* ctx.expectEqual(
        "the filter leaves exactly the matching command",
        yield* textOf(ctx, "palette-list"),
        "Open settings",
      );
      yield* ctx.expectEqual(
        "a filtered-out command is not painted",
        Str.includes("New file")(Arr.join(yield* ctx.host.paintedText(), "\n")),
        false,
      );

      // 3. No match: the empty state, and Enter commits nothing.
      yield* ctx.host.key("z");
      yield* settle;
      yield* waitForText(ctx, "palette-empty", "No commands");
      yield* ctx.host.key("enter");
      yield* settle;
      yield* ctx.expectContains(
        "Enter with no match leaves the palette open",
        yield* textOf(ctx, "palette-readout"),
        "open=true",
      );
      yield* ctx.expectContains(
        "Enter with no match commits nothing",
        yield* textOf(ctx, "palette-readout"),
        "committed=none",
      );

      // 4. A fresh open resets the query (no live Backspace dependency).
      yield* ctx.host.key("escape");
      yield* settle;
      yield* paletteReadoutHas(ctx, "Escape closes the palette", "open=false");
      yield* paletteReadoutHas(ctx, "Escape is recorded", "last=escape");
      yield* ctx.host.key("cmd-k");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "the chord reopens the palette",
        "open=true",
      );
      yield* paletteReadoutHas(ctx, "a fresh open resets the query", "query=-");

      // 5. Arrows move the active row, not focus.
      yield* ctx.host.key("down");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "ArrowDown moves the active row",
        "active=1",
      );
      yield* paletteReadoutHas(
        ctx,
        "the arrow is delivered as key down",
        "input=d:down",
      );
      yield* ctx.expectEqual(
        "the arrows keep focus in the input",
        yield* focusedOf(ctx),
        "palette-input",
      );
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.key("down");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "ArrowDown wraps to the first row",
        "active=0",
      );
      yield* ctx.host.key("up");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "ArrowUp wraps to the last row",
        "active=2",
      );

      // 6. Commit: Enter arrives as the field's own submit.
      yield* ctx.host.key("enter");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "Enter commits the active command",
        "committed=Toggle sidebar",
      );
      yield* paletteReadoutHas(
        ctx,
        "committing closes the palette",
        "open=false",
      );
      yield* paletteReadoutHas(
        ctx,
        "the commit reason is recorded",
        "last=commit:toggle-sidebar",
      );
      yield* ctx.expectEqual(
        "the closed palette is unmounted",
        Option.isNone(
          Option.fromNullishOr(yield* ctx.host.bounds("palette-list")),
        ),
        true,
      );

      // 7. The click path, then Escape returns focus to the trigger.
      yield* ctx.host.click("palette-trigger");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "the trigger click opens the palette",
        "open=true",
      );
      yield* paletteReadoutHas(
        ctx,
        "the trigger click records its reason",
        "last=button",
      );
      yield* waitForFocus(ctx, "palette-input");
      yield* ctx.host.key("escape");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "the second Escape closes the palette",
        "open=false",
      );
      yield* ctx.expectContains(
        "the window handler also sees Escape",
        yield* textOf(ctx, "palette-readout"),
        "window=escape",
      );
      yield* waitForFocus(ctx, "palette-trigger");
      yield* ctx.expectEqual(
        "Escape returns focus to the trigger",
        yield* focusedOf(ctx),
        "palette-trigger",
      );

      // 8. A chord while typing must not type.
      yield* ctx.host.key("cmd-k");
      yield* settle;
      yield* paletteReadoutHas(ctx, "the chord reopens it", "open=true");
      yield* ctx.host.key("o");
      yield* ctx.host.key("cmd-k");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "a chord does not type into the field",
        "query=o",
      );
      yield* ctx.expectContains(
        "the window handler sees a chord while the field is focused",
        yield* textOf(ctx, "palette-readout"),
        "window=k",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "the chord-opened palette closes on Escape",
        "open=false",
      );
      yield* waitForFocus(ctx, "palette-trigger");
      yield* ctx.expectEqual(
        "the second Escape returns focus to the trigger",
        yield* focusedOf(ctx),
        "palette-trigger",
      );

      // 9. The veil takes an outside press; the surface does not.
      yield* ctx.host.click("palette-trigger");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "the palette is open before the outside press",
        "open=true",
      );
      yield* ctx.host.click("palette-veil");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "an outside press dismisses the palette",
        "open=false",
      );
      yield* paletteReadoutHas(
        ctx,
        "the outside dismissal is recorded",
        "last=outside",
      );
      yield* ctx.expectEqual(
        "the dismissed overlay is unmounted",
        Option.isNone(
          Option.fromNullishOr(yield* ctx.host.bounds("palette-veil")),
        ),
        true,
      );

      // 10. A row click lands above the veil.
      yield* ctx.host.click("palette-trigger");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "the palette is open before the row click",
        "open=true",
      );
      yield* ctx.host.click("palette-item-new-file");
      yield* settle;
      yield* paletteReadoutHas(
        ctx,
        "a row click lands above the veil",
        "committed=New file",
      );
      yield* paletteReadoutHas(
        ctx,
        "the row click closes the palette",
        "open=false",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${commandPalette.id}.png`);
    }),
};

const tier2Foundation: LiveScenario = {
  id: "live-tier2-foundation",
  title: "Live Tier 2: the foundation parts and the List selection",
  capability: "tier2",
  view: tier2FoundationScenario.view,
  ready: "tier2-foundation-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "tier2-foundation-readout", "selected=inbox");
      yield* ctx.expectEqual(
        "the card title paints in a real window",
        yield* textOf(ctx, "card-title"),
        "Deployment",
      );
      const elevated = yield* boxOf(ctx, "card-elevated");
      const plain = yield* boxOf(ctx, "card-plain");
      yield* ctx.expectEqual(
        "the cards stack in declaration order",
        elevated.y < plain.y,
        true,
      );
      const avatar = yield* boxOf(ctx, "avatar-md");
      yield* ctx.expectEqual("the avatar is 32 px live", avatar.width, 32);

      yield* ctx.host.click("alert-dismiss");
      yield* settle;
      yield* waitForText(ctx, "tier2-foundation-readout", "dismissed=true");
      yield* ctx.expectEqual(
        "the alert left the live tree",
        (yield* ctx.host.bounds("alert-info")) === null,
        true,
      );

      yield* ctx.host.click("empty-action");
      yield* settle;
      yield* waitForText(ctx, "tier2-foundation-readout", "created=1");
      yield* ctx.expectContains(
        "the empty state's action ran live",
        yield* textOf(ctx, "tier2-foundation-readout"),
        "created=1",
      );

      yield* ctx.host.click("list-row-trash");
      yield* settle;
      yield* waitForText(ctx, "tier2-foundation-readout", "selected=trash");
      yield* waitForFocus(ctx, "list-row-trash");

      yield* ctx.host.click("list-row-inbox");
      yield* waitForFocus(ctx, "list-row-inbox");
      yield* settle;
      yield* ctx.expectContains(
        "a click selects the row and makes it the active one",
        yield* textOf(ctx, "tier2-foundation-readout"),
        "selected=inbox",
      );

      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.expectEqual(
        "Down moves native focus one row live",
        yield* focusedOf(ctx),
        "list-row-starred",
      );
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.expectEqual(
        "Down skips the disabled row live",
        yield* focusedOf(ctx),
        "list-row-trash",
      );
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tier2-foundation-readout", "selected=trash");
      yield* ctx.expectContains(
        "Enter selects the focused row live",
        yield* textOf(ctx, "tier2-foundation-readout"),
        "selected=trash",
      );

      yield* ctx.host.click("list-row-spam");
      yield* settle;
      yield* ctx.expectContains(
        "a disabled row changes nothing live",
        yield* textOf(ctx, "tier2-foundation-readout"),
        "selected=trash",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tier2Foundation.id}.png`);
    }),
};

const tier2Navigation: LiveScenario = {
  id: "live-tier2-navigation",
  title: "Live Tier 2: Tabs, Accordion, Collapsible, Breadcrumb and Pagination",
  capability: "tier2",
  view: tier2NavigationScenario.view,
  ready: "tier2-navigation-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "tier2-navigation-readout", "tab=overview");
      yield* boxOf(ctx, "panel-overview");
      yield* ctx.expectEqual(
        "only the selected panel paints",
        (yield* ctx.host.bounds("panel-activity")) === null,
        true,
      );

      yield* ctx.host.click("tab-activity");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "tab=activity");
      yield* ctx.expectEqual(
        "the clicked tab holds focus live",
        yield* focusedOf(ctx),
        "tab-activity",
      );
      yield* boxOf(ctx, "panel-activity");
      yield* ctx.expectEqual(
        "the previous panel left the live tree",
        (yield* ctx.host.bounds("panel-overview")) === null,
        true,
      );

      yield* ctx.host.click("tab-settings");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "tab=settings");
      yield* ctx.expectContains(
        "a click still selects a later tab live",
        yield* textOf(ctx, "tier2-navigation-readout"),
        "tab=settings",
      );

      // The vertical axis: the rail stacks, the panel sits beside it, a real
      // click selects, and the disabled row is inert.
      const liveVtabA = yield* boxOf(ctx, "vtab-a");
      const liveVtabD = yield* boxOf(ctx, "vtab-d");
      yield* ctx.expectEqual(
        "the vertical rail stacks live",
        Math.abs(liveVtabA.x - liveVtabD.x) <= 1 &&
          liveVtabD.y >= liveVtabA.y + liveVtabA.height,
        true,
      );
      const liveOverview = yield* boxOf(ctx, "tab-overview");
      const liveSettings = yield* boxOf(ctx, "tab-settings");
      yield* ctx.expectEqual(
        "the horizontal rail stays a row live",
        Math.abs(liveOverview.y - liveSettings.y) <= 1 &&
          liveSettings.x >= liveOverview.x + liveOverview.width,
        true,
      );
      yield* ctx.host.click("vtab-c");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "vtab=vc");
      const livePanelC = yield* boxOf(ctx, "vpanel-c");
      yield* ctx.expectEqual(
        "the live vertical panel sits beside the rail",
        livePanelC.x >= liveVtabA.x + liveVtabA.width,
        true,
      );
      yield* ctx.expectEqual(
        "the previous vertical panel left the live tree",
        (yield* ctx.host.bounds("vpanel-a")) === null,
        true,
      );
      yield* ctx.expectEqual(
        "the clicked vertical tab holds focus live",
        yield* focusedOf(ctx),
        "vtab-c",
      );
      yield* ctx.host.click("vtab-b");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "vtab=vc");
      yield* ctx.expectEqual(
        "the disabled vertical tab paints no panel live",
        (yield* ctx.host.bounds("vpanel-b")) === null,
        true,
      );

      yield* ctx.host.click("acc-trigger-shipping");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "open=shipping");
      yield* boxOf(ctx, "acc-content-shipping");
      yield* ctx.host.click("acc-trigger-billing");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "open=billing");
      yield* ctx.expectEqual(
        "single mode replaced the open section live",
        (yield* ctx.host.bounds("acc-content-shipping")) === null,
        true,
      );
      yield* boxOf(ctx, "acc-content-billing");
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "open=none");
      yield* ctx.expectEqual(
        "Enter closed the collapsible accordion live",
        (yield* ctx.host.bounds("acc-content-billing")) === null,
        true,
      );

      yield* ctx.host.click("collapse-trigger");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "collapsible=open");
      yield* boxOf(ctx, "collapse-body");
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "collapsible=closed");
      yield* ctx.expectEqual(
        "Enter closed the collapsible body live",
        (yield* ctx.host.bounds("collapse-body")) === null,
        true,
      );

      yield* ctx.host.click("crumb-home");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "path=home");
      yield* ctx.host.click("crumb-projects");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "path=projects");

      yield* ctx.host.click("page-six");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "page=6");
      yield* ctx.host.click("page-next");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "page=7");
      yield* ctx.host.click("page-prev");
      yield* settle;
      yield* waitForText(ctx, "tier2-navigation-readout", "page=6");
      yield* ctx.expectContains(
        "pagination paged forward and back live",
        yield* textOf(ctx, "tier2-navigation-readout"),
        "page=6",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tier2Navigation.id}.png`);
    }),
};

const tier2Choice: LiveScenario = {
  id: "live-tier2-choice",
  title:
    "Live Tier 2: Popover, SearchInput, Combobox, DatePicker and TimePicker",
  capability: "tier2",
  view: tier2ChoiceScenario.view,
  ready: "tier2-choice-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "tier2-choice-readout", "visible=name,status");

      // 1. Popover: a real click opens below, a row toggles, Escape restores.
      yield* ctx.host.click("popover-trigger");
      yield* settle;
      yield* ctx.host.waitFor("popover-panel");
      const trigger = yield* boxOf(ctx, "popover-trigger");
      const panel = yield* boxOf(ctx, "popover-panel");
      yield* ctx.expectEqual(
        "the popover opens below its trigger live",
        panel.y >= trigger.y + trigger.height,
        true,
      );
      yield* ctx.host.click("popover-row-name");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "visible=status");
      yield* ctx.expectEqual(
        "a row click toggles the consumer's selection live",
        (yield* ctx.host.bounds("popover-panel")) !== null,
        true,
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectEqual(
        "Escape closes the popover live",
        (yield* ctx.host.bounds("popover-panel")) === null,
        true,
      );
      yield* waitForFocus(ctx, "popover-trigger");

      // 2. SearchInput: typing, Enter and Escape in a live editor.
      yield* ctx.host.click("search-field");
      yield* settle;
      yield* ctx.host.key("c a r d");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "query=card");
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "submitted=card");
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "query=none");
      yield* ctx.expectContains(
        "Escape clears and reports once live",
        yield* textOf(ctx, "tier2-choice-readout"),
        "cleared=1",
      );
      yield* waitForFocus(ctx, "search-field");

      // 3. Combobox: rank a query, select a value, paint its label.
      yield* ctx.host.click("assign-trigger");
      yield* settle;
      yield* ctx.host.waitFor("combobox-content");
      yield* ctx.host.click("combobox-input");
      yield* settle;
      yield* ctx.host.key("g r a");
      yield* settle;
      yield* ctx.host.waitFor("combobox-option-grace");
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "reviewer=grace");
      yield* ctx.expectEqual(
        "a single selection closes the popup live",
        (yield* ctx.host.bounds("combobox-content")) === null,
        true,
      );
      yield* ctx.expectContains(
        "the trigger paints the selected label live",
        yield* textOf(ctx, "assign-trigger"),
        "Grace Hopper",
      );

      // 4. DatePicker: the live tree, the month head and a pointer choice.
      yield* ctx.host.click("date-picker-trigger");
      yield* settle;
      yield* ctx.host.waitFor("date-picker-content");
      yield* ctx.expectEqual(
        "the calendar focuses the month head live (measured; components task)",
        yield* focusedOf(ctx),
        "date-day-2026-10-01",
      );
      yield* ctx.host.click("date-day-2026-10-19");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "due=2026-10-19");
      yield* ctx.expectEqual(
        "choosing a day closes the calendar live",
        (yield* ctx.host.bounds("date-picker-content")) === null,
        true,
      );
      yield* ctx.host.click("date-picker-trigger");
      yield* settle;
      yield* ctx.host.waitFor("date-clear");
      yield* ctx.host.click("date-clear");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "due=none");

      // 5. TimePicker: both live segments compose one value.
      yield* ctx.host.click("standup-hours");
      yield* settle;
      yield* ctx.host.key("0 9");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "time=09:00");
      yield* ctx.host.click("standup-minutes");
      yield* settle;
      yield* ctx.host.key("3 0");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "time=09:30");
      yield* ctx.host.key("up");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "time=09:45");
      yield* ctx.host.click("standup-clear");
      yield* settle;
      yield* waitForText(ctx, "tier2-choice-readout", "time=none");
      yield* ctx.expectEqual(
        "the time segments cleared live",
        yield* focusedOf(ctx),
        "standup-hours",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tier2Choice.id}.png`);
    }),
};

const tier2Forms: LiveScenario = {
  id: "live-tier2-forms",
  title: "Live Tier 2: Field validation, Fieldset disable and Form submit",
  capability: "tier2",
  view: tier2FormsScenario.view,
  ready: "tier2-forms-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "tier2-forms-readout", "error=none");

      // 1. Field: the consumer triggers validation; the error replaces copy.
      yield* ctx.host.click("slug-fill");
      yield* settle;
      yield* waitForText(ctx, "tier2-forms-readout", "slug=my-workspace");
      yield* ctx.host.click("slug-break");
      yield* settle;
      yield* ctx.expectContains(
        "editing an invalid value does not validate live",
        yield* textOf(ctx, "tier2-forms-readout"),
        "error=none",
      );
      yield* ctx.host.click("slug-validate");
      yield* settle;
      yield* waitForText(ctx, "tier2-forms-readout", "error=set");
      yield* ctx.expectContains(
        "the schema's message paints live",
        yield* textOf(ctx, "slug-field"),
        "Use lowercase words joined by a hyphen",
      );

      // 2. Fieldset: a disabled input refuses a live edit.
      yield* ctx.host.click("shipping-street");
      yield* settle;
      yield* ctx.host.key("x");
      yield* settle;
      yield* ctx.expectContains(
        "a disabled input refuses a live edit",
        yield* textOf(ctx, "tier2-forms-readout"),
        "edits=0",
      );

      // 3. Form: messages, a decoded submit and the pending lock.
      yield* ctx.host.click("form-submit");
      yield* settle;
      yield* ctx.expectContains(
        "an invalid submit paints the schema's message live",
        yield* textOf(ctx, "signup-form"),
        EMAIL_MESSAGE,
      );
      yield* ctx.expectContains(
        "an invalid submit does not reach the consumer live",
        yield* textOf(ctx, "tier2-forms-readout"),
        "submits=0",
      );
      yield* ctx.host.click("form-email");
      yield* settle;
      yield* ctx.host.key("a d a");
      yield* settle;
      yield* ctx.host.click("form-name");
      yield* settle;
      yield* ctx.host.key("g p u i");
      yield* settle;
      yield* waitForText(ctx, "tier2-forms-readout", "email=ada");
      yield* ctx.host.click("form-submit");
      yield* settle;
      yield* waitForText(ctx, "tier2-forms-readout", "submits=1");
      yield* ctx.expectContains(
        "the success line paints the decoded value live",
        yield* textOf(ctx, "form-created"),
        "Created ada",
      );
      yield* ctx.host.click("form-hold");
      yield* settle;
      yield* waitForText(ctx, "tier2-forms-readout", "pending=true");
      yield* ctx.host.click("form-submit");
      yield* settle;
      yield* ctx.expectContains(
        "a pending form refuses a live submit",
        yield* textOf(ctx, "tier2-forms-readout"),
        "submits=1",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tier2Forms.id}.png`);
    }),
};

const tier2Editing: LiveScenario = {
  id: "live-tier2-editing",
  title:
    "Live Tier 2: InlineEdit, TagInput, HotkeyRecorder, MentionInput and Drawer",
  capability: "tier2",
  view: tier2EditingScenario.view,
  ready: "tier2-editing-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "tier2-editing-readout", "name=Docs");

      // 1. InlineEdit: the display→editor swap, a real edit and a cancel.
      //
      // The automation locator's `click(testId)` resolves the display node and
      // starts the edit; the component's own layout effect then moves native
      // focus to the swapped `<input>`, which `waitForFocus` asserts. A
      // coordinate click into the editor is deliberately not used: the plan-599
      // gate found it could land outside a narrow display, leaving the edit
      // unopened and the later blur check vacuous. React's `onBlur` for the
      // replaced editor is host-state dependent (D70; plans `390`, `603`, `605`):
      // focused runs deliver it and the click away commits, while the full gate
      // moves native focus without it and leaves the editor open. The blur block
      // asserts whichever state the window delivers, and in the missed state
      // refocuses the open editor and commits the retained draft with Enter. The
      // headless host delivers no `onBlur` at all (plan `347`).
      yield* ctx.host.click("ws-name");
      yield* settle;
      yield* ctx.expectSome(
        "the live display swaps to an editor",
        Option.fromNullishOr(yield* ctx.host.bounds("ws-name")),
      );
      yield* ctx.expectEqual(
        "the new editor is empty because its text is native",
        yield* textOf(ctx, "ws-name"),
        "",
      );
      yield* waitForFocus(ctx, "ws-name");
      yield* ctx.expectEqual(
        "the swapped editor owns native focus",
        yield* focusedOf(ctx),
        "ws-name",
      );
      yield* ctx.host.key("cmd-a");
      yield* settle;
      yield* ctx.host.key("l i v e");
      yield* settle;
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tier2-editing-readout", "name=live commits=1");
      yield* ctx.expectContains(
        "a live inline edit commits once",
        yield* textOf(ctx, "ws-name"),
        "live",
      );
      yield* ctx.expectEqual(
        "the committed display takes focus back live",
        yield* focusedOf(ctx),
        "ws-name",
      );

      yield* ctx.host.click("ws-name");
      yield* settle;
      yield* waitForFocus(ctx, "ws-name");
      yield* ctx.expectEqual(
        "the second live edit owns native focus",
        yield* focusedOf(ctx),
        "ws-name",
      );
      yield* ctx.host.key("x");
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectContains(
        "Escape discards the live draft",
        yield* textOf(ctx, "tier2-editing-readout"),
        "name=live commits=1",
      );
      yield* ctx.expectContains(
        "Escape returns the live display",
        yield* textOf(ctx, "ws-name"),
        "live",
      );

      // 1b. The blur commit: a live click on a focusable sibling commits the
      // open draft (plan `555`; the headless host delivers no `onBlur`).
      yield* ctx.host.click("ws-name");
      yield* settle;
      yield* waitForFocus(ctx, "ws-name");
      yield* ctx.expectEqual(
        "the blur target edit owns native focus",
        yield* focusedOf(ctx),
        "ws-name",
      );
      yield* ctx.host.key("end");
      yield* settle;
      yield* ctx.host.key("z");
      yield* settle;
      yield* ctx.host.click("ws-elsewhere");
      yield* settle;
      yield* waitForFocus(ctx, "ws-elsewhere");
      yield* ctx.expectEqual(
        "the click away moves native focus",
        yield* focusedOf(ctx),
        "ws-elsewhere",
      );
      // A missed blur is not a skip: the open editor still holds the draft.
      const afterBlur = yield* textOf(ctx, "ws-name");
      if (afterBlur === "livez") {
        yield* ctx.expectContains(
          "a click away commits the open live draft",
          yield* textOf(ctx, "tier2-editing-readout"),
          "name=livez commits=2",
        );
        yield* ctx.expectEqual(
          "the click's focus is not stolen by the commit",
          yield* focusedOf(ctx),
          "ws-elsewhere",
        );
      } else {
        yield* ctx.expectEqual(
          "a missed blur leaves the editor open",
          afterBlur,
          "",
        );
        yield* ctx.host.click("ws-name");
        yield* settle;
        yield* waitForFocus(ctx, "ws-name");
        yield* ctx.host.key("enter");
        yield* settle;
        yield* waitForText(
          ctx,
          "tier2-editing-readout",
          "name=livez commits=2",
        );
        yield* ctx.expectContains(
          "the retained draft commits once the editor is focused again",
          yield* textOf(ctx, "tier2-editing-readout"),
          "name=livez commits=2",
        );
        yield* waitForFocus(ctx, "ws-name");
        yield* ctx.expectEqual(
          "the Enter commit returns focus to the display",
          yield* focusedOf(ctx),
          "ws-name",
        );
      }
      yield* ctx.expectContains(
        "the committed display paints the draft",
        yield* textOf(ctx, "ws-name"),
        "livez",
      );

      // 2. TagInput: a typed comma adds a live token.
      yield* ctx.host.click("tag-field");
      yield* settle;
      yield* ctx.host.key("d o c s ,");
      yield* settle;
      yield* waitForText(ctx, "tier2-editing-readout", "tags=design,docs");
      yield* boxOf(ctx, "chip-docs");

      // 3. HotkeyRecorder: the chord is captured, then cleared.
      yield* ctx.host.click("hotkey");
      yield* settle;
      yield* waitForText(ctx, "hotkey", "Press keys");
      yield* ctx.host.key("ctrl-shift-k");
      yield* settle;
      yield* waitForText(ctx, "tier2-editing-readout", "hotkey=ctrl+shift+k");
      yield* ctx.host.click("hotkey-clear");
      yield* settle;
      yield* waitForText(ctx, "tier2-editing-readout", "hotkey=none");
      yield* ctx.expectContains(
        "clearing the chord returns the placeholder live",
        yield* textOf(ctx, "hotkey"),
        "Click to record",
      );

      // 4. MentionInput: `@` opens, arrows move, Enter inserts.
      yield* ctx.host.click("comment");
      yield* settle;
      yield* ctx.host.key("@");
      yield* settle;
      yield* ctx.host.waitFor("mention-ana");
      yield* ctx.host.key("a n");
      yield* settle;
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tier2-editing-readout", "mentions=anna");
      yield* ctx.expectContains(
        "Enter inserts the highlighted mention live",
        yield* textOf(ctx, "tier2-editing-readout"),
        "mentions=anna",
      );
      yield* ctx.expectEqual(
        "inserting closes the candidate list live",
        (yield* ctx.host.bounds("mention-ana")) === null,
        true,
      );

      // 5. Drawer: edge placement, focus, the trap and dismissal.
      yield* ctx.host.click("drawer-open");
      yield* settle;
      yield* ctx.host.waitFor("drawer-surface");
      const surface = yield* boxOf(ctx, "drawer-surface");
      yield* ctx.expectEqual(
        // The drawer's content box counts its 24 px inset twice at the right
        // edge on 0.10.0 (plan 529 §6.3).
        "the live drawer's content edge is 23 px past the frame",
        surface.x + surface.width,
        1123,
      );
      yield* ctx.expectEqual(
        "the live drawer keeps its md width inside its borders",
        surface.width,
        398,
      );
      yield* ctx.expectEqual(
        "the live drawer spans the window height inside its borders",
        surface.height,
        718,
      );
      yield* waitForFocus(ctx, "drawer-surface");
      yield* ctx.host.key("tab");
      yield* settle;
      yield* ctx.expectEqual(
        "Tab moves focus inside the live drawer",
        yield* focusedOf(ctx),
        "drawer-cancel",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "tier2-editing-readout", "drawer=closed");
      yield* waitForFocus(ctx, "drawer-open");

      yield* ctx.host.click("drawer-open");
      yield* settle;
      yield* ctx.host.waitFor("drawer-surface");
      yield* ctx.host.clickWindow(12, 12);
      yield* settle;
      yield* waitForText(ctx, "tier2-editing-readout", "drawer=closed");
      yield* ctx.expectEqual(
        "a press on the live veil closes the drawer",
        (yield* ctx.host.bounds("drawer-surface")) === null,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tier2Editing.id}.png`);
    }),
};

const tier2Flow: LiveScenario = {
  id: "live-tier2-flow",
  title:
    "Live Tier 2: Stepper, Timeline, Countdown, KeyboardShortcuts, Carousel, ColorPicker and NavigationMenu",
  capability: "tier2",
  view: tier2FlowScenario.view,
  ready: "tier2-flow-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "tier2-flow-readout", "step=2");

      // 1. Stepper: the consumer's control moves the live value.
      yield* ctx.host.click("step-next");
      yield* settle;
      yield* waitForText(ctx, "tier2-flow-readout", "step=3");

      // 2. Timeline: order and the current event's copy.
      const build = yield* boxOf(ctx, "timeline-build");
      const tests = yield* boxOf(ctx, "timeline-tests");
      const deploy = yield* boxOf(ctx, "timeline-deploy");
      yield* ctx.expectEqual(
        "the live events stack in declaration order",
        build.y < tests.y && tests.y < deploy.y,
        true,
      );
      yield* ctx.expectContains(
        "the live timeline paints its description",
        yield* textOf(ctx, "timeline-tests"),
        "412 tests, 0 failures",
      );

      // 3. Countdown: the application's clock drives the display.
      yield* ctx.host.click("countdown-tick");
      yield* settle;
      yield* waitForText(ctx, "tier2-flow-readout", "remaining=29000");
      yield* waitForText(ctx, "countdown", "00:29");
      yield* ctx.host.click("countdown-expire");
      yield* settle;
      yield* waitForText(ctx, "countdown", "00:00");

      // 4. KeyboardShortcuts: the platform glyphs are explicit, not host-dependent.
      yield* ctx.expectContains(
        "the darwin row draws command glyphs live",
        yield* textOf(ctx, "shortcut-palette"),
        "⌘⇧P",
      );
      yield* ctx.expectContains(
        "the linux row draws named modifiers live",
        yield* textOf(ctx, "shortcut-palette-linux"),
        "CtrlShiftP",
      );

      // 5. Carousel: controls, the keyboard contract and the hiding mechanism.
      yield* boxOf(ctx, "slide-0");
      yield* ctx.expectEqual(
        "an inactive slide is still painted live (display: none is a no-op on 0.10.0)",
        (yield* ctx.host.bounds("slide-2")) !== null,
        true,
      );
      yield* ctx.host.click("slide-next");
      yield* settle;
      yield* waitForText(ctx, "tier2-flow-readout", "slide=1");
      yield* ctx.host.click("slide-next");
      yield* settle;
      yield* waitForText(ctx, "tier2-flow-readout", "slide=2");
      yield* ctx.host.click("slide-next");
      yield* settle;
      yield* ctx.expectContains(
        "the live Next control clamps at the last slide",
        yield* textOf(ctx, "tier2-flow-readout"),
        "slide=2",
      );
      yield* ctx.host.key("home");
      yield* settle;
      yield* waitForText(ctx, "tier2-flow-readout", "slide=0");

      // 6. ColorPicker: a swatch, then a normalising hex commit.
      yield* ctx.host.click("picker-swatch-2");
      yield* settle;
      yield* waitForText(ctx, "tier2-flow-readout", "color=#");
      const swatchColor = yield* textOf(ctx, "tier2-flow-readout");
      yield* ctx.expectEqual(
        "a swatch replaces the initial colour live",
        Str.includes("color=#000000")(swatchColor),
        false,
      );
      yield* ctx.host.click("picker-hex");
      yield* settle;
      yield* ctx.host.key("cmd-a");
      yield* ctx.host.key("a b c");
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tier2-flow-readout", "color=#aabbcc");

      // 7. NavigationMenu: one panel, pointer, keyboard and dismissal.
      yield* ctx.host.click("trigger-platform");
      yield* settle;
      yield* ctx.host.waitFor("panel-platform");
      const panel = yield* boxOf(ctx, "panel-platform");
      const trigger = yield* boxOf(ctx, "trigger-platform");
      yield* ctx.expectEqual(
        "the live panel opens below its trigger",
        panel.y >= trigger.y + trigger.height,
        true,
      );
      yield* ctx.host.click("trigger-pricing");
      yield* settle;
      yield* ctx.host.waitFor("panel-pricing");
      yield* ctx.expectEqual(
        "exactly one live panel is open",
        (yield* ctx.host.bounds("panel-platform")) === null,
        true,
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectEqual(
        "Escape closes the live panel",
        (yield* ctx.host.bounds("panel-pricing")) === null,
        true,
      );
      yield* waitForFocus(ctx, "trigger-pricing");
      yield* ctx.host.key("left");
      yield* settle;
      yield* ctx.expectEqual(
        "Left moves focus between live triggers",
        yield* focusedOf(ctx),
        "trigger-platform",
      );
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.waitFor("panel-platform");
      yield* waitForFocus(ctx, "panel-platform");
      yield* ctx.host.click("link-overview");
      yield* settle;
      yield* waitForText(ctx, "tier2-flow-readout", "picked=overview");
      yield* ctx.expectEqual(
        "choosing a live link closes the panel",
        (yield* ctx.host.bounds("panel-platform")) === null,
        true,
      );
      yield* ctx.host.click("trigger-platform");
      yield* settle;
      yield* ctx.host.waitFor("panel-platform");
      yield* ctx.host.click("flow-outside");
      yield* settle;
      yield* ctx.expectEqual(
        "an outside press closes the live nav",
        (yield* ctx.host.bounds("panel-platform")) === null,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tier2Flow.id}.png`);
    }),
};

const replace: LiveScenario = {
  id: "live-replace",
  title: "Live replace: a controlled rewrite, its caret and the washes",
  capability: "replace",
  view: replaceScenario.view,
  ready: "replace-state",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "replace-counts", "doc=2");
      yield* ctx.expectContains(
        "the live preview counts both matches",
        yield* textOf(ctx, "replace-counts"),
        "doc=2",
      );
      yield* ctx.expectContains(
        "the live editor never reports a highlight match",
        yield* textOf(ctx, "replace-counts"),
        "editor=0",
      );

      yield* ctx.host.click("replace-one");
      yield* waitForText(ctx, "replace-state", "replaces=1");
      const replaced = yield* textOf(ctx, "replace-state");
      yield* ctx.expectContains(
        "the live replace rewrites the controlled value",
        replaced,
        "value=The|warning|handler|logs|an|error. replaces=1 last=replace",
      );
      yield* waitForText(ctx, "replace-counts", "doc=1");
      const liveWashes = yield* ctx.host.highlights();
      yield* ctx.expectEqual(
        "one wash is left in the live preview",
        Arr.length(liveWashes),
        1,
      );
      const livePaint = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the editor and the preview both paint the new sentence",
        Arr.length(
          Arr.filter(
            livePaint,
            (run) => run === "The warning handler logs an error.",
          ),
        ),
        2,
      );

      yield* ctx.host.click("replace-editor");
      yield* ctx.host.key("end");
      yield* ctx.host.key("ctrl-r");
      yield* waitForText(ctx, "replace-state", "replaces=2");
      yield* ctx.expectContains(
        "the keyboard replace reaches the focused editor",
        yield* textOf(ctx, "replace-state"),
        "value=The|warning|handler|logs|an|warning.",
      );
      yield* ctx.host.key("z");
      // The value grew by one: the only wait that cannot be satisfied by the
      // pre-keystroke readout.
      yield* waitForText(ctx, "replace-state", "len=37");
      yield* ctx.expectContains(
        "the live caret after a programmatic value lands at the end",
        yield* textOf(ctx, "replace-state"),
        "value=The|warning|handler|logs|an|warning.z",
      );

      yield* ctx.host.click("replace-undo");
      yield* waitForText(ctx, "replace-state", "last=undo");
      yield* waitForText(ctx, "replace-counts", "doc=2");

      yield* ctx.host.click("replace-all");
      yield* waitForText(ctx, "replace-counts", "doc=0");
      yield* ctx.expectContains(
        "the live replace-all changed both occurrences",
        yield* textOf(ctx, "replace-state"),
        "replaces=2",
      );

      yield* ctx.host.click("replace-all");
      yield* waitForText(ctx, "replace-state", "last=noop");

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${replace.id}.png`);
    }),
};

const searchReplace: LiveScenario = {
  id: "live-search-replace",
  title: "Live search and replace: document mutation, washes and the cursor",
  capability: "search",
  view: searchReplaceScenario.view,
  ready: "sr-doc",
  steps: (ctx) =>
    Effect.gen(function* () {
      const docWashes = Effect.gen(function* () {
        const box = yield* boxOf(ctx, "sr-doc");
        return inside(box, yield* ctx.host.highlights());
      });
      const lineWashes = (line: string) =>
        Effect.map(ctx.host.highlights(), (washes) => inLine(washes, line));

      // 1. The baseline document: five matches, the first active.
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* ctx.expectContains(
        "the live find bar counts every document match",
        yield* textOf(ctx, "sr-total"),
        "total=5",
      );
      yield* ctx.expectContains(
        "the live find cursor starts on the first match",
        yield* textOf(ctx, "sr-total"),
        "active=0",
      );
      yield* ctx.expectContains(
        "the live document paints its fixture lines",
        yield* textOf(ctx, "sr-doc-text"),
        "error error here|an error follows|no match|the last error|another error closes",
      );
      const initial = yield* docWashes;
      yield* ctx.expectEqual(
        "the live document paints one wash per match",
        Arr.length(initial),
        5,
      );
      yield* ctx.expectEqual(
        "every live document wash is the queried word",
        Arr.every(
          initial,
          (match) =>
            Str.toLowerCase(matchText(match.text, [match.start, match.end])) ===
            "error",
        ),
        true,
      );

      // 2. Real typing drives the query field, not component-only state.
      yield* ctx.host.click("sr-query");
      yield* settle;
      yield* ctx.host.key("end");
      yield* ctx.host.key("x");
      yield* waitForText(ctx, "sr-total", "total=0");
      yield* ctx.expectContains(
        "a real keystroke rewrites the live query",
        yield* textOf(ctx, "sr-total"),
        "total=0",
      );
      yield* ctx.host.key("backspace");
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* ctx.expectContains(
        "deleting the keystroke restores the live matches",
        yield* textOf(ctx, "sr-total"),
        "total=5",
      );

      // 3. The cursor and one replacement.
      yield* ctx.host.click("sr-next");
      yield* ctx.host.click("sr-next");
      yield* waitForText(ctx, "sr-total", "active=2");
      yield* ctx.expectContains(
        "the live cursor reaches the third match",
        yield* textOf(ctx, "sr-total"),
        "active=2",
      );
      yield* ctx.host.click("sr-replace-one");
      yield* waitForText(ctx, "sr-total", "total=4");
      yield* ctx.expectContains(
        "one live replace decrements the count",
        yield* textOf(ctx, "sr-total"),
        "total=4",
      );
      yield* ctx.expectContains(
        "the live replaced line loses its match",
        yield* textOf(ctx, "sr-doc-text"),
        "an fixed follows",
      );
      const afterOne = yield* lineWashes("an fixed follows");
      yield* ctx.expectEqual(
        "the live replaced line paints no wash",
        Arr.length(afterOne),
        0,
      );
      yield* ctx.expectContains(
        "the live cursor stays on the following match",
        yield* textOf(ctx, "sr-total"),
        "active=2",
      );
      yield* ctx.expectEqual(
        "the live active wash is on the fourth line",
        Arr.length(yield* lineWashes("the last error")),
        1,
      );

      // 4. Replace-all empties the document.
      yield* ctx.host.click("sr-replace-all");
      yield* waitForText(ctx, "sr-total", "total=0");
      yield* ctx.expectContains(
        "live replace-all empties the match count",
        yield* textOf(ctx, "sr-total"),
        "total=0",
      );
      yield* ctx.expectEqual(
        "live replace-all clears every document wash",
        Arr.length(yield* docWashes),
        0,
      );
      yield* ctx.expectEqual(
        "live replace-all rewrites every matching line",
        Str.includes("error")(yield* textOf(ctx, "sr-doc-text")),
        false,
      );
      yield* ctx.host.click("sr-next");
      yield* ctx.host.click("sr-previous");
      yield* settle;
      yield* ctx.expectContains(
        "stepping an empty live result set keeps the cursor at zero",
        yield* textOf(ctx, "sr-total"),
        "total=0 active=0",
      );

      // 5. Reset, then a count-preserving replacement (the wash moves, the
      // count event must not).
      yield* ctx.host.click("sr-reset");
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* waitForText(ctx, "sr-doc-text", "error error here");
      yield* ctx.expectContains(
        "live reset restores every match",
        yield* textOf(ctx, "sr-total"),
        "total=5",
      );
      yield* ctx.expectContains(
        "one live count event paints the restored document",
        yield* textOf(ctx, "sr-events"),
        "fired=1",
      );
      const eventsBefore = yield* textOf(ctx, "sr-events");
      yield* ctx.host.click("sr-uppercase");
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* waitForText(ctx, "sr-doc-text", "ERROR error here");
      yield* ctx.expectEqual(
        "a live count-preserving replace fires no new event",
        yield* textOf(ctx, "sr-events"),
        eventsBefore,
      );
      yield* ctx.expectEqual(
        "the live count-preserving wash follows the rewritten run",
        Arr.join(Arr.map(yield* lineWashes("ERROR error here"), matched), ","),
        "ERROR,error",
      );

      // 6. A longer replacement shifts the survivor by its delta.
      yield* ctx.host.click("sr-reset");
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* waitForText(ctx, "sr-doc-text", "error error here");
      yield* ctx.host.click("sr-longer");
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* waitForText(ctx, "sr-doc-text", "errors error here");
      const longer = yield* lineWashes("errors error here");
      yield* ctx.expectEqual(
        "a live longer replacement paints both matches",
        Arr.length(longer),
        2,
      );
      yield* ctx.expectEqual(
        "a live longer replacement shifts the next match by its delta",
        Option.getOrElse(
          Option.map(Arr.get(longer, 1), (match) => match.start),
          () => -1,
        ),
        7,
      );

      // 7. A shorter replacement shrinks the count and the survivor offset.
      yield* ctx.host.click("sr-reset");
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* waitForText(ctx, "sr-doc-text", "error error here");
      yield* ctx.host.click("sr-shorter");
      yield* waitForText(ctx, "sr-total", "total=4");
      yield* waitForText(ctx, "sr-doc-text", "err error here");
      const shorter = yield* lineWashes("err error here");
      yield* ctx.expectEqual(
        "the live survivor keeps its offset after the shrink",
        Option.getOrElse(
          Option.map(Arr.head(shorter), (match) => match.start),
          () => -1,
        ),
        4,
      );

      // 8. The length-changing replace-all: the fold order is load-bearing.
      yield* ctx.host.click("sr-reset");
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* waitForText(ctx, "sr-doc-text", "error error here");
      yield* ctx.host.click("sr-replace-all-short");
      yield* waitForText(ctx, "sr-total", "total=0");
      yield* ctx.expectEqual(
        "a live length-changing replace-all rewrites every match once",
        yield* textOf(ctx, "sr-doc-text"),
        "err err here|an err follows|no match|the last err|another err closes",
      );

      // 9. A rendered code block replaces by prop and its washes follow.
      yield* ctx.host.click("sr-reset");
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* waitForText(ctx, "sr-doc-text", "error error here");
      const codeBefore = Arr.filter(
        yield* ctx.host.highlights(),
        (match) =>
          Str.startsWith("const error")(match.text) ||
          Str.startsWith("console.log")(match.text),
      );
      yield* ctx.expectEqual(
        "the live code block paints its two matches",
        Arr.length(codeBefore),
        2,
      );
      yield* ctx.host.click("sr-code-replace");
      yield* waitForText(ctx, "sr-code-text", "const value = 1;");
      yield* ctx.expectContains(
        "the live code block's source is replaced",
        yield* textOf(ctx, "sr-code-text"),
        "const value = 1;|console.log(value);",
      );
      yield* ctx.expectEqual(
        "replacing the live source removes its washes",
        Arr.length(
          Arr.filter(
            yield* ctx.host.highlights(),
            (match) =>
              Str.includes("const error")(match.text) ||
              Str.includes("console.log(error)")(match.text),
          ),
        ),
        0,
      );

      yield* ctx.host.click("sr-reset");
      yield* waitForText(ctx, "sr-total", "total=5");
      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${searchReplace.id}.png`);
    }),
};

const restore: LiveScenario = {
  id: "live-restore",
  title: "Live restore: workspace layout, tabs and a virtual-list anchor",
  capability: "workspace",
  view: workspaceRestoreScenario.view,
  ready: "wr-live",
  steps: (ctx) =>
    Effect.gen(function* () {
      const paintedRow = (row: number) =>
        Effect.map(ctx.host.paintedText(), (lines) =>
          Arr.contains(lines, `row ${row}`),
        );

      // 1. The window mounts the shipped probe at its defaults.
      yield* ctx.expectContains(
        "the workspace starts at its defaults",
        yield* textOf(ctx, "wr-live"),
        "split=320 tabsA=one,two tabsB=none active=one",
      );
      yield* ctx.expectContains(
        "nothing is saved yet",
        yield* textOf(ctx, "wr-saved"),
        "saved=false",
      );
      yield* ctx.expectNear(
        "the painted split starts at 320",
        yield* widthOf(ctx, "wr-pane-a"),
        320,
        2,
      );

      // 2. A paced live drag resizes, and the painted box agrees.
      yield* ctx.host.drag("wr-divider", 80, 0, 6);
      yield* settle;
      yield* waitForText(ctx, "wr-live", "split=400");
      yield* ctx.expectNear(
        "the painted split follows the drag",
        yield* widthOf(ctx, "wr-pane-a"),
        400,
        2,
      );

      // 3. A tab activation and a deep scroll are both part of the snapshot.
      yield* ctx.host.click("wr-tab-two");
      yield* settle;
      yield* waitForText(ctx, "wr-live", "active=two");
      yield* ctx.host.scrollToItem("wr-list", 120, 16);
      yield* settle;
      yield* waitForAnchor(ctx, "wr-list", "120,16");
      yield* ctx.host.click("wr-row-120");
      yield* settle;
      yield* waitForFocus(ctx, "wr-row-120");
      yield* ctx.expectEqual(
        "a live row takes native focus",
        yield* focusedOf(ctx),
        "wr-row-120",
      );

      // 4. The app-owned snapshot holds all four facts.
      yield* ctx.host.click("wr-save");
      yield* settle;
      const saved = yield* awaitedTextOf(ctx, "wr-saved", "anchor=120,16");
      yield* ctx.expectContains(
        "the snapshot holds the split",
        saved,
        "split=400",
      );
      yield* ctx.expectContains(
        "the snapshot holds the active tab",
        saved,
        "active=two",
      );

      // 5. A reset is a real restart: the layout and the anchor are gone.
      yield* ctx.host.click("wr-reset");
      yield* settle;
      yield* waitForText(ctx, "wr-live", "split=320");
      yield* waitForAnchor(ctx, "wr-list", "0,0");
      yield* ctx.expectEqual(
        "a reset empties the window",
        yield* paintedRow(120),
        false,
      );

      // 6. Restore re-applies the split, the tab and the exact anchor.
      yield* ctx.host.click("wr-restore");
      yield* settle;
      yield* waitForText(ctx, "wr-live", "active=two");
      yield* waitForAnchor(ctx, "wr-list", "120,16");
      yield* ctx.expectContains(
        "the restored split comes from the snapshot",
        yield* textOf(ctx, "wr-live"),
        "split=400",
      );
      yield* ctx.expectNear(
        "the restored pane is painted at 400",
        yield* widthOf(ctx, "wr-pane-a"),
        400,
        2,
      );
      yield* ctx.expectEqual(
        "the restored row is painted",
        yield* paintedRow(120),
        true,
      );
      yield* ctx.expectEqual(
        "the first row stays out of the window",
        yield* paintedRow(0),
        false,
      );

      // 7. Native focus is not part of the snapshot, and the list still works.
      yield* ctx.expectEqual(
        "native focus is not restored",
        (yield* focusedOf(ctx)) === "wr-row-120",
        false,
      );
      yield* ctx.host.click("wr-row-121");
      yield* settle;
      yield* waitForFocus(ctx, "wr-row-121");
      yield* ctx.expectEqual(
        "the restored list accepts input",
        yield* focusedOf(ctx),
        "wr-row-121",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${restore.id}.png`);
    }),
};

const workspacePanes: LiveScenario = {
  id: "live-workspace-panes",
  title: "Live tabbed panes: hidden state, the wheel guard and a resize",
  capability: "workspace",
  view: workspacePanesScenario.view,
  ready: "ws-readout",
  steps: (ctx) =>
    Effect.gen(function* () {
      const treeRows = () =>
        Effect.map(ctx.host.paintedText(), (lines) =>
          Arr.length(
            Arr.filter(lines, (line) => Str.startsWith("tree row ")(line)),
          ),
        );
      const anchorIndex = (label: string) =>
        Effect.gen(function* () {
          const value = yield* ctx.expectSome(
            label,
            Option.fromNullishOr(yield* ctx.host.listScrollTop("ws-tree")),
          );
          return value[0];
        });
      const yOf = (testId: string) =>
        Effect.map(offsetOf(ctx, testId), (offset) => offset.y);

      // 1. The window mounts the shared probe at its defaults.
      yield* waitForText(ctx, "ws-readout", "active=tree top=240 guard=off");
      yield* ctx.expectEqual(
        "the live workspace opens on the tree tab",
        yield* textOf(ctx, "ws-readout"),
        "active=tree top=240 guard=off",
      );

      // 2. A hidden pane leaves the paint but keeps its React subtree.
      yield* ctx.expectEqual(
        "the live tree paints its virtual rows",
        (yield* treeRows()) > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the hidden live editor does not paint",
        Option.isSome(
          Arr.findFirst(
            yield* ctx.host.paintedText(),
            Str.includes("Editor pane"),
          ),
        ),
        false,
      );
      yield* ctx.expectEqual(
        "the hidden live editor stays mounted",
        yield* textOf(ctx, "ws-editor-marker"),
        "Editor pane",
      );

      // 3. A real click inside a virtual row records the pick.
      yield* ctx.host.click("ws-tree-row-2");
      yield* settle;
      yield* waitForText(ctx, "ws-tree-pick", "pick=2");
      yield* ctx.expectEqual(
        "a live virtual row click records its pick",
        yield* textOf(ctx, "ws-tree-pick"),
        "pick=2",
      );

      // 4. A real wheel over the nested scroller chains to its ancestor.
      yield* ctx.host.wheel("ws-log-inner", 0, -240);
      yield* waitForOffset(ctx, "ws-log-inner", "y", -240);
      yield* waitForOffset(ctx, "ws-log-outer", "y", -240);
      yield* ctx.expectEqual(
        "the live nested scroller takes the wheel",
        yield* yOf("ws-log-inner"),
        -240,
      );
      yield* ctx.expectEqual(
        "the unguarded live nested scroller chains",
        yield* yOf("ws-log-outer"),
        -240,
      );

      // 5. A wheel over a visible outer row returns the outer scroller.
      yield* ctx.host.wheel("ws-log-row-10", 0, 240);
      yield* waitForOffset(ctx, "ws-log-outer", "y", 0);
      yield* ctx.expectEqual(
        "a live wheel on an outer row returns the outer scroller",
        yield* yOf("ws-log-outer"),
        0,
      );
      yield* ctx.expectEqual(
        "the inner keeps its live offset while the outer moves",
        yield* yOf("ws-log-inner"),
        -240,
      );

      // 6. The guard keeps a real wheel inside the inner scroller. The wheel
      // is aimed at a painted inner row: after the ancestor scroll the
      // headless tracker's container box is stale (plan 177 §8).
      yield* ctx.host.click("ws-log-guard");
      yield* settle;
      yield* waitForText(ctx, "ws-readout", "guard=on");
      yield* ctx.host.wheel("ws-inner-row-14", 0, -120);
      yield* waitForOffset(ctx, "ws-log-inner", "y", -360);
      yield* ctx.expectEqual(
        "the guarded live inner scroller takes the wheel",
        yield* yOf("ws-log-inner"),
        -360,
      );
      yield* ctx.expectEqual(
        "the live guard stops the ancestor wheel",
        yield* yOf("ws-log-outer"),
        0,
      );

      // 7. A tab switch hides the tree and shows the editor.
      yield* ctx.host.click("ws-tab-editor");
      yield* settle;
      yield* waitForText(ctx, "ws-readout", "active=editor");
      yield* ctx.expectEqual(
        "the live tab switch activates the editor",
        yield* textOf(ctx, "ws-readout"),
        "active=editor top=240 guard=on",
      );
      yield* ctx.expectEqual(
        "the hidden live tree leaves the paint",
        yield* treeRows(),
        0,
      );
      yield* ctx.host.click("ws-editor");
      yield* settle;
      yield* ctx.host.key("n");
      yield* settle;
      yield* ctx.host.key("o");
      yield* settle;
      yield* ctx.host.key("t");
      yield* waitForText(ctx, "ws-draft", "draft=not");
      yield* ctx.expectEqual(
        "the live editor keeps a local draft",
        yield* textOf(ctx, "ws-draft"),
        "draft=not",
      );

      // 8. Switching back restores the paint and the hidden pane's state.
      yield* ctx.host.click("ws-tab-tree");
      yield* settle;
      yield* waitForText(ctx, "ws-readout", "active=tree");
      yield* ctx.expectEqual(
        "the live tree repaints on its tab",
        (yield* treeRows()) > 0,
        true,
      );
      yield* ctx.expectEqual(
        "a hidden live pane keeps its pick",
        yield* textOf(ctx, "ws-tree-pick"),
        "pick=2",
      );
      yield* ctx.expectEqual(
        "the live tree opens at its first row",
        yield* anchorIndex("the live tree reports an anchor"),
        0,
      );

      yield* ctx.host.scrollToItem("ws-tree", 20);
      yield* settle;
      yield* waitForAnchor(ctx, "ws-tree", "20,0");
      yield* ctx.expectEqual(
        "scrollToItem anchors the live tree",
        yield* anchorIndex("the anchored live tree reports an anchor"),
        20,
      );

      // 9. The hidden pane is not in the native tab order.
      yield* ctx.host.click("ws-tab-editor");
      yield* settle;
      yield* ctx.host.focusNext();
      yield* settle;
      yield* ctx.expectEqual(
        "the hidden live tree leaves the tab order",
        yield* focusedOf(ctx),
        "ws-editor",
      );
      yield* ctx.host.click("ws-tab-tree");
      yield* settle;
      yield* ctx.host.focusNext();
      yield* settle;
      yield* ctx.host.focusNext();
      yield* settle;
      yield* ctx.expectEqual(
        "the visible live pane's control is the next stop",
        yield* focusedOf(ctx),
        "ws-tree-action",
      );

      // 10. A paced live drag re-windows the list and keeps its anchor.
      yield* ctx.host.scrollToItem("ws-tree", 30);
      yield* settle;
      yield* waitForAnchor(ctx, "ws-tree", "30,0");
      const paintedBefore = yield* treeRows();
      yield* ctx.host.drag("workspace-divider", 0, 60);
      yield* waitForText(ctx, "ws-readout", "top=300");
      yield* ctx.expectEqual(
        "the live drag resized the workspace",
        yield* textOf(ctx, "ws-readout"),
        "active=tree top=300 guard=on",
      );
      yield* ctx.expectEqual(
        "a taller live pane paints more rows",
        (yield* treeRows()) > paintedBefore,
        true,
      );
      yield* ctx.expectEqual(
        "the live list anchor survives the resize",
        yield* anchorIndex("the resized live tree reports an anchor"),
        30,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${workspacePanes.id}.png`);
    }),
};

const tableSort: LiveScenario = {
  id: "live-table-sort",
  title: "Live table sort: a reorder, a row click and a surviving selection",
  capability: "table",
  view: tableSelectSortScenario.view,
  ready: "table-readout",
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The window mounts the table in its default ascending order.
      yield* ctx.expectContains(
        "the table starts ascending and unselected",
        yield* textOf(ctx, "table-readout"),
        "rows=200 sorted=name-asc selected=none",
      );
      yield* ctx.expectContains(
        "the first row is the ascending head",
        yield* textOf(ctx, "table-first"),
        "Item 000",
      );

      // 2. A real click selects the first row. It runs before any scroll: on
      // 0.10.0 a row's recorded box is stale after an ancestor scroll, so a
      // later click targets a stale point (plan 529 §6.3).
      yield* ctx.host.click("table-first");
      yield* settle;
      yield* waitForText(ctx, "table-readout", "selected=r0");
      yield* ctx.expectContains(
        "a live row click selects by row id",
        yield* textOf(ctx, "table-readout"),
        "selected=r0",
      );

      // 3. A real wheel moves the body and leaves the first row alone.
      yield* ctx.host.wheel("table-scroll", 0, -200);
      yield* settle;
      const scrolled = yield* offsetOf(ctx, "table-scroll");
      yield* ctx.expectNear(
        `the live body scrolled (y=${scrolled.y})`,
        scrolled.y,
        -200,
        8,
      );
      yield* ctx.expectContains(
        "the first row did not move in the model",
        yield* textOf(ctx, "table-first"),
        "Item 000",
      );
      yield* ctx.host.wheel("table-scroll", 0, 200);
      yield* settle;

      // 3. The sort reorders the row the automation tree points at.
      yield* ctx.host.click("table-sort");
      yield* settle;
      yield* waitForText(ctx, "table-readout", "sorted=name-desc");
      yield* ctx.expectContains(
        "the sorted readout names the descending order",
        yield* textOf(ctx, "table-readout"),
        "sorted=name-desc",
      );
      yield* ctx.expectContains(
        "the first row is now the descending head",
        yield* textOf(ctx, "table-first"),
        "Item 199",
      );

      // 4. Selection is row-id state: the sort reorders the rows but not the
      // selected id. (A click after the sort cannot be aimed: the reset leaves
      // the row's recorded box stale — plan 529 §6.3.)
      yield* ctx.expectContains(
        "the selection survives the sort",
        yield* textOf(ctx, "table-readout"),
        "selected=r0",
      );

      // 5. Selection is row-id state; a re-sort keeps it.
      yield* ctx.host.click("table-sort");
      yield* settle;
      yield* waitForText(ctx, "table-readout", "sorted=name-asc");
      yield* ctx.expectContains(
        "the re-sort restores the ascending head",
        yield* textOf(ctx, "table-first"),
        "Item 000",
      );
      yield* ctx.expectContains(
        "the selection survives the re-sort",
        yield* textOf(ctx, "table-readout"),
        "selected=r0",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tableSort.id}.png`);
    }),
};

const inspector: LiveScenario = {
  id: "live-inspector",
  title:
    "Live inspector: an editor in a virtual list, commit, scroll and reset",
  capability: "inspector",
  view: propertyPanelScenario.view,
  ready: "inspector-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      const paints = (line: string) =>
        Effect.map(ctx.host.paintedText(), (lines) =>
          Arr.contains(lines, line),
        );

      // 1. The probe mounts at its baseline.
      yield* ctx.expectContains(
        "the inspector starts at its baseline",
        yield* textOf(ctx, "inspector-readout"),
        "name=Untitled drafts=0 filter=- commits=0",
      );

      // 2. A live click focuses the editor; typing is a draft.
      yield* ctx.host.click("inspector-input-0");
      yield* settle;
      yield* ctx.expectEqual(
        "a live click focuses the property editor",
        yield* focusedOf(ctx),
        "inspector-input-0",
      );
      yield* ctx.host.key("cmd-a");
      yield* ctx.host.key("r e n a m e d");
      yield* settle;
      yield* waitForText(ctx, "inspector-readout", "drafts=1");
      yield* ctx.expectContains(
        "the draft is not committed before Enter",
        yield* textOf(ctx, "inspector-readout"),
        "name=Untitled drafts=1",
      );

      // 3. Enter commits; the preview reads the model.
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "inspector-readout", "commits=1");
      yield* ctx.expectContains(
        "a live Enter commits the draft",
        yield* textOf(ctx, "inspector-readout"),
        "name=renamed drafts=0",
      );
      yield* ctx.expectContains(
        "the committed value reaches the live preview",
        yield* textOf(ctx, "inspector-preview-name"),
        "renamed",
      );

      // 4. A numeric property drives painted geometry.
      yield* ctx.host.click("inspector-input-1");
      yield* settle;
      yield* ctx.host.key("cmd-a");
      yield* ctx.host.key("4 0");
      yield* ctx.host.key("enter");
      yield* settle;
      yield* ctx.expectNear(
        "a live Opacity edit resizes the preview bar",
        yield* widthOf(ctx, "inspector-preview-bar"),
        48,
        1,
      );

      // 5. Windowing: the row leaves the painted list and comes back edited.
      yield* ctx.host.scrollToItem("inspector-list", 40);
      yield* settle;
      yield* ctx.expectEqual(
        "the edited row leaves the live window",
        yield* paints("Name"),
        false,
      );
      yield* ctx.expectEqual(
        "the window paints the row it scrolled to",
        yield* paints("Property 40"),
        true,
      );
      yield* ctx.host.scrollToItem("inspector-list", 0);
      yield* settle;
      yield* ctx.expectEqual(
        "the committed value survives the live windowing scroll",
        yield* paints("renamed"),
        true,
      );

      // 6. A draft is parent-owned and survives the same scroll.
      yield* ctx.host.click("inspector-input-0");
      yield* settle;
      yield* ctx.host.key("z");
      yield* settle;
      yield* waitForText(ctx, "inspector-readout", "drafts=1");
      yield* ctx.host.scrollToItem("inspector-list", 40);
      yield* settle;
      yield* ctx.host.scrollToItem("inspector-list", 0);
      yield* settle;
      yield* ctx.expectContains(
        "the live draft survives the windowing scroll",
        yield* textOf(ctx, "inspector-readout"),
        "drafts=1",
      );
      yield* ctx.expectEqual(
        "the returned editor paints the surviving draft",
        yield* paints("renamedz"),
        true,
      );

      // 7. Filtering hides rows but keeps the draft; Escape restores them.
      yield* ctx.host.click("inspector-filter");
      yield* settle;
      yield* ctx.host.key("r o l e");
      yield* settle;
      yield* waitForText(ctx, "inspector-readout", "filter=role");
      yield* ctx.expectEqual(
        "the live filter keeps the matching row",
        yield* paints("Role"),
        true,
      );
      yield* ctx.expectEqual(
        "the live filter hides the other rows",
        yield* paints("Name"),
        false,
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "inspector-readout", "filter=-");
      yield* ctx.expectEqual(
        "Escape in the live filter restores the rows",
        yield* paints("Name"),
        true,
      );

      // 8. Reset restores the model, the drafts and the preview.
      yield* ctx.host.click("inspector-reset");
      yield* settle;
      yield* waitForText(ctx, "inspector-readout", "name=Untitled");
      yield* ctx.expectContains(
        "a live reset clears the draft",
        yield* textOf(ctx, "inspector-readout"),
        "drafts=0 filter=- commits=2",
      );
      yield* ctx.expectNear(
        "a live reset restores the preview bar",
        yield* widthOf(ctx, "inspector-preview-bar"),
        96,
        1,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${inspector.id}.png`);
    }),
};

const dataGridColumns: LiveScenario = {
  id: "live-data-grid-columns",
  title:
    "Live data grid: a header drag resizes the rows, the pan and the anchor",
  capability: "columns",
  view: dataGridColumnsScenario.view,
  ready: "columns-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The grid mounts at its default widths.
      const pan = yield* boxOf(ctx, "columns-pan");
      const frozen = yield* boxOf(ctx, "columns-frozen-head");
      yield* ctx.expectNear(
        "the pan starts after the frozen column",
        pan.x,
        frozen.x + 144,
        1,
      );
      yield* ctx.expectNear("the pan is the viewport width", pan.width, 360, 1);
      yield* ctx.expectContains(
        "the grid starts at its default widths",
        yield* textOf(ctx, "columns-state"),
        "name=200 status=120 size=90 notes=150 content=560",
      );

      // 2. A paced real drag grows the name column; the body follows.
      yield* ctx.host.drag("columns-handle-name", 40, 0);
      yield* settle;
      yield* waitForText(ctx, "columns-state", "name=240");
      yield* ctx.expectNear(
        "a live drag grows the header",
        yield* widthOf(ctx, "columns-head-name"),
        240,
        1,
      );
      const grownStatus = yield* boxOf(ctx, "columns-head-status");
      const bodyStatus = yield* boxOf(ctx, "columns-cell-0-status");
      yield* ctx.expectNear(
        "the live body follows the resized header",
        bodyStatus.x,
        grownStatus.x,
        1,
      );
      yield* ctx.expectNear(
        // The body cell is 2 px narrower inside its borders (plan 529 §6.3).
        "the live body shares the resized width",
        bodyStatus.width,
        grownStatus.width - 2,
        1,
      );

      // 3. Reset, then a real click and arrow resize the keyboard path.
      yield* ctx.host.click("columns-reset");
      yield* settle;
      yield* waitForText(ctx, "columns-state", "content=560");
      yield* ctx.host.click("columns-handle-name");
      yield* settle;
      yield* ctx.expectEqual(
        "a live click focuses the resize handle",
        yield* focusedOf(ctx),
        "columns-handle-name",
      );
      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForText(ctx, "columns-state", "name=216");

      // 4. A live pan, then the header and the body still align.
      yield* ctx.host.click("columns-reset");
      yield* settle;
      yield* waitForText(ctx, "columns-state", "content=560");
      yield* ctx.host.click("columns-pan-end");
      yield* settle;
      yield* waitForText(ctx, "columns-state", "x=-200");
      const offset = yield* offsetOf(ctx, "columns-pan");
      yield* ctx.expectNear(
        "a live pan reaches the far edge",
        offset.x,
        -200,
        1,
      );
      const pannedStatus = yield* boxOf(ctx, "columns-head-status");
      const pannedBody = yield* boxOf(ctx, "columns-cell-0-status");
      yield* ctx.expectNear(
        "a panned live header aligns with its body",
        pannedBody.x,
        pannedStatus.x,
        1,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${dataGridColumns.id}.png`);
    }),
};

/** The grid body's scroll offset on one axis, or a failure naming the miss. */
const gridOffset = (ctx: LiveContext, axis: "x" | "y") =>
  Effect.gen(function* () {
    const offset = yield* ctx.expectSome(
      "the grid body reports an offset",
      Option.fromNullishOr(yield* ctx.host.scrollOffset("grid-body")),
    );
    return axis === "x" ? offset.x : offset.y;
  });

/** A `testId` is painted, or absent from the window's tree. */
const expectPainted = (ctx: LiveContext, testId: string, painted: boolean) =>
  Effect.gen(function* () {
    const bounds = yield* ctx.host.bounds(testId);
    yield* ctx.expectEqual(
      `${testId} is ${painted ? "painted" : "not painted"}`,
      Option.isSome(Option.fromNullishOr(bounds)),
      painted,
    );
  });

const grid: LiveScenario = {
  id: "live-grid",
  title: "Live grid: a pinned header, one scroll source and column windowing",
  capability: "grid",
  view: gridScenario.view,
  ready: "grid-root",
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The pinned column and the body share the root's layout.
      const root = yield* boxOf(ctx, "grid-root");
      const pinned = yield* boxOf(ctx, "grid-pinned-header");
      const header = yield* boxOf(ctx, "grid-header");
      yield* ctx.expectNear(
        "the pinned header's content starts at the root",
        pinned.x,
        root.x + 6,
        1,
      );
      yield* ctx.expectNear(
        // The box origin is the content origin but its width keeps the padding
        // (plan 529 §6.5), so the pinned column's 6 px inset is added once.
        "the body starts after the pinned column",
        header.x,
        pinned.x + pinned.width - 6,
        1,
      );
      // Cache the body's box now: a scroller's reported box moves with its own
      // scroll (plan 529 §6.5), so it is not a frame once the pan starts.
      const bodyBox = yield* boxOf(ctx, "grid-body");
      yield* ctx.expectNear(
        "the body shares its column with the header",
        bodyBox.x,
        header.x,
        1,
      );

      // 2. The header sits in the scroller's flow and moves with it. A real
      // window reports a moved box for every child of a scroller, so the
      // position property itself stays a headless claim (plan 556 §9).
      const stickyBefore = yield* boxOf(ctx, "sticky-header");
      yield* ctx.host.wheel("sticky-scroller", 0, -80);
      yield* settle;
      const stickyAfter = yield* boxOf(ctx, "sticky-header");
      yield* ctx.expectNear(
        `the live header scrolls with its container (dy=${stickyAfter.y - stickyBefore.y})`,
        stickyAfter.y,
        stickyBefore.y - 80,
        4,
      );

      // 3. One real wheel moves the body and the frozen column together.
      yield* ctx.host.wheel("grid-body", 0, -280);
      yield* settle;
      const scrolled = yield* gridOffset(ctx, "y");
      yield* ctx.expectNear(
        `a live wheel scrolled ten rows (y=${scrolled})`,
        scrolled,
        -280,
        8,
      );
      const pinnedRow = yield* boxOf(ctx, "grid-pinned-row-11");
      const bodyRow = yield* boxOf(ctx, "grid-row-11");
      yield* ctx.expectNear(
        "the live pinned row aligns with the body row",
        pinnedRow.y,
        bodyRow.y,
        1,
      );
      yield* expectPainted(ctx, "grid-row-0", false);
      const pinnedAfter = yield* boxOf(ctx, "grid-pinned-header");
      yield* ctx.expectNear(
        "the live pinned header does not scroll",
        pinnedAfter.y,
        pinned.y,
        1,
      );

      // 4. A horizontal wheel over the body is swallowed (plan 338).
      yield* ctx.host.wheel("grid-body", -360, 0);
      yield* settle;
      yield* ctx.expectNear(
        "a live deltaX wheel over the body does not pan",
        yield* gridOffset(ctx, "x"),
        0,
        1,
      );

      // 5. The component-owned pan moves the header and the windowed body.
      yield* ctx.host.click("grid-pan-four");
      yield* settle;
      yield* waitForText(ctx, "grid-pan", "x=-360");
      yield* ctx.expectNear(
        "the live pan reaches four columns",
        yield* gridOffset(ctx, "x"),
        -360,
        8,
      );
      const head = yield* boxOf(ctx, "grid-head-5");
      const cell = yield* boxOf(ctx, "grid-cell-11-5");
      yield* ctx.expectNear(
        "the live header cell aligns with its body cell",
        head.x,
        cell.x,
        1,
      );
      yield* expectPainted(ctx, "grid-cell-11-0", false);
      yield* expectPainted(ctx, "grid-cell-11-20", false);

      // 6. The far end is the last viewport, and the column window follows.
      yield* ctx.host.click("grid-end");
      yield* settle;
      yield* waitForText(ctx, "grid-pan", "x=-1700");
      const lastHead = yield* boxOf(ctx, "grid-head-20");
      const lastCell = yield* boxOf(ctx, "grid-cell-11-20");
      yield* ctx.expectNear(
        "the live last header cell aligns",
        lastHead.x,
        lastCell.x,
        1,
      );
      yield* expectPainted(ctx, "grid-cell-11-0", false);

      // 7. The vertical jump keeps the frozen column on the same row.
      yield* ctx.host.click("grid-pan-bottom");
      yield* settle;
      yield* waitForText(ctx, "grid-pan", "y=-820");
      const lastPinned = yield* boxOf(ctx, "grid-pinned-row-39");
      const lastRow = yield* boxOf(ctx, "grid-cell-39-20");
      yield* ctx.expectNear(
        "the live last pinned row follows the bottom",
        lastPinned.y,
        lastRow.y,
        1,
      );
      yield* expectPainted(ctx, "grid-row-0", false);

      // 8. Home restores the first window.
      yield* ctx.host.click("grid-home");
      yield* settle;
      yield* waitForText(ctx, "grid-pan", "x=0 y=0");
      yield* expectPainted(ctx, "grid-cell-0-0", true);
      yield* expectPainted(ctx, "grid-cell-0-20", false);

      // 9. A real click selects and focuses a cell.
      yield* ctx.host.click("grid-cell-0-1");
      yield* settle;
      yield* waitForText(ctx, "grid-selection", "sel=0,1");
      yield* waitForFocus(ctx, "grid-cell-0-1");
      yield* ctx.expectEqual(
        "a live click focuses the cell",
        yield* focusedOf(ctx),
        "grid-cell-0-1",
      );

      // 10. Six Rights reveal column seven by panning the body.
      yield* walkFocus(ctx, "right", 6);
      yield* waitForText(ctx, "grid-selection", "sel=0,7");
      yield* ctx.expectEqual(
        "six live Rights reach column seven",
        yield* textOf(ctx, "grid-selection"),
        "sel=0,7",
      );
      // The focus effect lands a commit after the last key; the bounded wait is
      // the live suite's rule (plan 382), not a tolerance on the result.
      yield* waitForFocus(ctx, "grid-cell-0-7");
      yield* ctx.expectEqual(
        "live focus follows the reveal",
        yield* focusedOf(ctx),
        "grid-cell-0-7",
      );
      const revealX = yield* gridOffset(ctx, "x");
      yield* ctx.expectEqual(
        `the live reveal panned the body (x=${revealX})`,
        revealX < 0,
        true,
      );
      const revealed = yield* boxOf(ctx, "grid-cell-0-7");
      yield* ctx.expectEqual(
        "the revealed live cell is inside the viewport",
        revealed.x >= bodyBox.x - 1 &&
          revealed.x + revealed.width <= bodyBox.x + bodyBox.width + 8,
        true,
      );
      const revealedHead = yield* boxOf(ctx, "grid-head-7");
      yield* ctx.expectNear(
        "the revealed live header aligns",
        revealedHead.x,
        revealed.x,
        1,
      );

      // 11. Downs move the selection with the frozen column.
      yield* walkFocus(ctx, "down", 3);
      yield* waitForText(ctx, "grid-selection", "sel=3,7");
      yield* ctx.expectEqual(
        "three live Downs reach row three",
        yield* textOf(ctx, "grid-selection"),
        "sel=3,7",
      );
      yield* waitForFocus(ctx, "grid-cell-3-7");
      yield* ctx.expectEqual(
        "live focus follows the selection down",
        yield* focusedOf(ctx),
        "grid-cell-3-7",
      );
      const downCell = yield* boxOf(ctx, "grid-cell-3-7");
      const downPinned = yield* boxOf(ctx, "grid-pinned-row-3");
      yield* ctx.expectNear(
        "the live pinned row follows the keyboard move",
        downPinned.y,
        downCell.y,
        1,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${gridScenario.id}.png`);
    }),
};

/** A `dg-state` field, so the twin reads the readout a human does. */
const dataGridField = (ctx: LiveContext, key: string) =>
  Effect.gen(function* () {
    const state = yield* textOf(ctx, "dg-state");
    return Option.getOrElse(
      Option.map(
        Arr.findFirst(Str.split(state, " "), Str.startsWith(`${key}=`)),
        Str.replace(`${key}=`, ""),
      ),
      () => "none",
    );
  });

/** A `dg-state` numeric field, or `-1` so a comparison names the absence. */
const dataGridNumber = (ctx: LiveContext, key: string) =>
  Effect.map(dataGridField(ctx, key), (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : -1;
  });

/** The frozen column's row sits on the body row the readout names first. */
const frozenFollows = (ctx: LiveContext) =>
  Effect.gen(function* () {
    const id = yield* dataGridNumber(ctx, "first");
    const frozen = yield* boxOf(ctx, `dg-frozen-row-${id}`);
    const body = yield* boxOf(ctx, `dg-row-${id}`);
    yield* ctx.expectNear(
      `the frozen row for live row ${id} aligns with its body row`,
      frozen.y,
      body.y,
      1,
    );
  });

/**
 * The virtualized, panned data grid in a real window (plan `606`).
 *
 * `live-grid` drives plain rows and `live-data-grid-columns` asserts a resize;
 * this twin asserts the composition itself: a vertical wheel virtualizes the
 * `<virtual-list>` body, a header `deltaX` wheel pans the header and body
 * together, the frozen column follows the list anchor, a panned cell is a hit
 * target, and a sort/filter from a deep anchor returns to the top.
 */
const liveDataGrid: LiveScenario = {
  id: "live-data-grid",
  title:
    "Live data grid: virtual rows, a pan, a frozen column, sort and filter",
  capability: "data-grid",
  view: dataGridScenario.view,
  ready: "dg-grid",
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The frozen column is outside the pan; row 0 shares its line.
      const grid = yield* boxOf(ctx, "dg-grid");
      yield* ctx.expectNear(
        "the live grid keeps its declared height",
        grid.height,
        328,
        1,
      );
      const frozenHead = yield* boxOf(ctx, "dg-frozen-head");
      const pan = yield* boxOf(ctx, "dg-pan");
      yield* ctx.expectNear(
        "the live pan starts after the frozen column",
        pan.x,
        grid.x + 150,
        1,
      );
      yield* ctx.expectNear(
        "the live pan is the viewport width",
        pan.width,
        500,
        1,
      );
      const row0 = yield* boxOf(ctx, "dg-frozen-row-0");
      const body0 = yield* boxOf(ctx, "dg-row-0");
      yield* ctx.expectNear(
        "live row 0 aligns with the frozen column",
        row0.y,
        body0.y,
        1,
      );
      yield* ctx.expectNear(
        "the live body row keeps its declared height",
        body0.height,
        28,
        1,
      );
      const body1 = yield* boxOf(ctx, "dg-row-1");
      yield* ctx.expectNear(
        "live body rows advance by their height",
        body1.y - body0.y,
        28,
        1,
      );

      // 2. A vertical wheel virtualizes the body, not the header or the pan.
      const headBefore = yield* boxOf(ctx, "dg-headrow");
      yield* ctx.host.hover("dg-pan");
      yield* settle;
      yield* ctx.host.wheel("dg-pan", 0, -280);
      yield* settle;
      yield* waitForTextLacking(ctx, "dg-state", "anchor=0");
      const virtualized = yield* dataGridNumber(ctx, "anchor");
      yield* ctx.expectEqual(
        `the live wheel virtualizes the list (anchor=${virtualized})`,
        virtualized > 0,
        true,
      );
      yield* expectPainted(ctx, "dg-row-0", false);
      const headAfter = yield* boxOf(ctx, "dg-headrow");
      yield* ctx.expectNear(
        "a live vertical wheel leaves the header in place",
        headAfter.y,
        headBefore.y,
        1,
      );
      yield* ctx.expectNear(
        "a live vertical wheel does not pan",
        yield* Effect.map(offsetOf(ctx, "dg-pan"), (offset) => offset.x),
        0,
        1,
      );
      yield* frozenFollows(ctx);

      // 3. A real header deltaX wheel pans the header and the body together.
      yield* ctx.host.click("dg-pan-home");
      yield* settle;
      yield* waitForText(ctx, "dg-state", "x=0");
      yield* ctx.host.hover("dg-head-2");
      yield* settle;
      yield* ctx.host.wheel("dg-head-2", -90, 0);
      yield* settle;
      yield* waitForText(ctx, "dg-state", "x=-");
      yield* ctx.expectNear(
        "a live header wheel pans the body",
        yield* Effect.map(offsetOf(ctx, "dg-pan"), (offset) => offset.x),
        -90,
        8,
      );
      const firstPanned = yield* dataGridNumber(ctx, "first");
      const head3 = yield* boxOf(ctx, "dg-head-3");
      const body3 = yield* boxOf(ctx, `dg-cell-${firstPanned}-3`);
      yield* ctx.expectNear(
        "the live header cell aligns with its body cell",
        head3.x,
        body3.x,
        1,
      );
      const frozenAfterPan = yield* boxOf(ctx, "dg-frozen-head");
      yield* ctx.expectNear(
        "the live frozen column does not pan",
        frozenAfterPan.x,
        frozenHead.x,
        1,
      );

      // 4. The far edge keeps the alignment.
      yield* ctx.host.click("dg-pan-end");
      yield* settle;
      yield* waitForText(ctx, "dg-state", "x=-400");
      yield* ctx.expectNear(
        "the live pan reaches the far edge",
        yield* Effect.map(offsetOf(ctx, "dg-pan"), (offset) => offset.x),
        -400,
        2,
      );
      const firstAtEdge = yield* dataGridNumber(ctx, "first");
      const head8 = yield* boxOf(ctx, "dg-head-8");
      const body8 = yield* boxOf(ctx, `dg-cell-${firstAtEdge}-8`);
      yield* ctx.expectNear(
        "the live far header cell aligns with its body cell",
        head8.x,
        body8.x,
        1,
      );

      // 5. A panned virtual cell hit-tests and takes native focus.
      const cell9 = `dg-cell-${firstAtEdge}-9`;
      yield* ctx.host.click(cell9);
      yield* settle;
      yield* waitForFocus(ctx, cell9);
      yield* ctx.expectEqual(
        "a live panned cell selects its row",
        yield* dataGridNumber(ctx, "sel"),
        firstAtEdge,
      );
      yield* ctx.expectEqual(
        "a live panned cell takes native focus",
        yield* focusedOf(ctx),
        cell9,
      );
      yield* ctx.expectNear(
        "clicking a live cell does not pan",
        yield* Effect.map(offsetOf(ctx, "dg-pan"), (offset) => offset.x),
        -400,
        1,
      );

      // 6. A vertical wheel while panned keeps the pan and realigns the frozen
      //    column with the new first row.
      const anchorBefore = yield* dataGridNumber(ctx, "anchor");
      yield* ctx.host.hover("dg-pan");
      yield* settle;
      yield* ctx.host.wheel("dg-pan", 0, -280);
      yield* settle;
      yield* waitForTextLacking(ctx, "dg-state", `anchor=${anchorBefore}`);
      yield* frozenFollows(ctx);
      yield* ctx.expectNear(
        "a live vertical wheel keeps the horizontal pan",
        yield* Effect.map(offsetOf(ctx, "dg-pan"), (offset) => offset.x),
        -400,
        1,
      );

      // 7. A horizontal wheel over a body **cell** pans the scroller live,
      //    while the offscreen TestRenderer swallows the same verb (plan 338).
      //    That is a harness difference; the live twin asserts what a reader's
      //    pointer does, and the pan affordance still works in both.
      const panBeforeBodyWheel = yield* Effect.map(
        offsetOf(ctx, "dg-pan"),
        (offset) => offset.x,
      );
      const firstNow = yield* dataGridNumber(ctx, "first");
      yield* ctx.host.hover(`dg-cell-${firstNow}-6`);
      yield* settle;
      yield* ctx.host.wheel(`dg-cell-${firstNow}-6`, 90, 0);
      yield* settle;
      yield* ctx.expectNear(
        "a live deltaX wheel over a body cell pans the scroller",
        yield* Effect.map(offsetOf(ctx, "dg-pan"), (offset) => offset.x),
        panBeforeBodyWheel + 90,
        8,
      );

      // 8. An app-owned jump and the runtime anchor agree.
      yield* ctx.host.click("dg-jump");
      yield* settle;
      yield* waitForText(ctx, "dg-state", "anchor=45");
      yield* ctx.expectEqual(
        "the live jump names row 45",
        yield* dataGridNumber(ctx, "first"),
        45,
      );
      const anchored = yield* ctx.expectSome(
        "the live list reports its anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("dg-list")),
      );
      yield* ctx.expectEqual(
        "the runtime anchor is the live jump index",
        anchored[0],
        45,
      );
      yield* frozenFollows(ctx);

      // 9. A filter from a deep anchor resets to the top.
      yield* ctx.host.click("dg-filter");
      yield* settle;
      yield* waitForFocus(ctx, "dg-filter");
      yield* ctx.host.key("0");
      yield* settle;
      yield* ctx.host.key("1");
      yield* settle;
      yield* waitForText(ctx, "dg-state", "count=11");
      yield* ctx.expectEqual(
        "the live filter resets the anchor",
        yield* dataGridNumber(ctx, "anchor"),
        0,
      );
      yield* ctx.expectEqual(
        "the live filtered set starts at row 1",
        yield* dataGridNumber(ctx, "first"),
        1,
      );
      yield* expectPainted(ctx, "dg-row-18", true);
      const filteredPaint = (yield* ctx.host.paintedText()).join(" ");
      yield* ctx.expectContains(
        "the live painted text holds the filtered rows",
        filteredPaint,
        "Item 01",
      );
      yield* ctx.expectEqual(
        "a live filtered-out row is not painted",
        Str.includes("Item 059")(filteredPaint),
        false,
      );
      yield* frozenFollows(ctx);

      // 10. Clearing restores the full set at the top.
      yield* ctx.host.click("dg-clear");
      yield* settle;
      yield* waitForText(ctx, "dg-state", "count=60");
      yield* ctx.expectEqual(
        "clearing keeps the live anchor at the top",
        yield* dataGridNumber(ctx, "anchor"),
        0,
      );

      // 11. A sort from a deep anchor resets and flips the order.
      yield* ctx.host.click("dg-jump");
      yield* settle;
      yield* waitForText(ctx, "dg-state", "anchor=45");
      yield* ctx.host.click("dg-sort");
      yield* settle;
      yield* waitForText(ctx, "dg-state", "sort=desc");
      yield* ctx.expectEqual(
        "the live sort resets the anchor",
        yield* dataGridNumber(ctx, "anchor"),
        0,
      );
      yield* ctx.expectEqual(
        "the live descending order starts at the last row",
        yield* dataGridNumber(ctx, "first"),
        59,
      );
      yield* ctx.expectContains(
        "the live painted text holds the descending top row",
        (yield* ctx.host.paintedText()).join(" "),
        "Item 059",
      );
      yield* ctx.host.click("dg-sort");
      yield* settle;
      yield* waitForText(ctx, "dg-state", "sort=asc");
      yield* ctx.expectEqual(
        "the live ascending order starts at the first row",
        yield* dataGridNumber(ctx, "first"),
        0,
      );
      yield* ctx.expectContains(
        "the live painted text holds the ascending top row",
        (yield* ctx.host.paintedText()).join(" "),
        "Item 000",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveDataGrid.id}.png`);
    }),
};

/** Hovers `testId` and asserts the width the declaration applies. */
const hoverWidth = (
  ctx: LiveContext,
  testId: string,
  expected: number,
  label: string,
) =>
  Effect.gen(function* () {
    yield* ctx.host.hover(testId);
    yield* settle;
    yield* waitForBounds(
      ctx,
      testId,
      (box) => Math.abs(box.width - expected) <= 1,
    );
    yield* ctx.expectNear(label, yield* widthOf(ctx, testId), expected, 1);
  });

const liveStates: LiveScenario = {
  id: "live-states",
  title: "Live declared styles: hover and active applied by real pointer input",
  capability: "states",
  view: declaredStylesScenario.view,
  ready: "styles-root",
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The authored widths.
      yield* ctx.expectNear(
        "the live button starts at its authored width",
        yield* widthOf(ctx, "styles-button"),
        100,
        1,
      );
      yield* ctx.expectNear(
        "the live parent starts at its authored width",
        yield* widthOf(ctx, "styles-parent"),
        400,
        1,
      );

      // 2. A real pointer applies the declared hover.
      yield* hoverWidth(
        ctx,
        "styles-button",
        140,
        "a live hover applies the declared width",
      );

      // 3. Hover is per element: the parent and the child are measured alone.
      yield* hoverWidth(
        ctx,
        "styles-parent",
        420,
        "a live hover on the parent applies its own width",
      );
      yield* ctx.expectNear(
        "the live parent's hover leaves the child alone",
        yield* widthOf(ctx, "styles-child"),
        100,
        1,
      );
      yield* hoverWidth(
        ctx,
        "styles-child",
        120,
        "a live hover on the child applies its own width",
      );
      yield* ctx.expectNear(
        "a live child hover cancels the parent's",
        yield* widthOf(ctx, "styles-parent"),
        400,
        1,
      );
      yield* ctx.host.hover("styles-away");
      yield* settle;
      yield* waitForBounds(
        ctx,
        "styles-parent",
        (box) => Math.abs(box.width - 400) <= 1,
      );
      yield* ctx.expectNear(
        "leaving reverts the live parent",
        yield* widthOf(ctx, "styles-parent"),
        400,
        1,
      );
      yield* ctx.expectNear(
        "leaving reverts the live child",
        yield* widthOf(ctx, "styles-child"),
        100,
        1,
      );

      // 4. A real press applies `active`; it does not enter hover.
      const base = yield* boxOf(ctx, "styles-button");
      const centre = {
        x: base.x + base.width / 2,
        y: base.y + base.height / 2,
      };
      yield* ctx.host.pressWindow(centre.x, centre.y);
      yield* settle;
      yield* waitForBounds(
        ctx,
        "styles-button",
        (box) => Math.abs(box.width - 180) <= 1,
      );
      yield* ctx.expectNear(
        "a live press applies the active width",
        yield* widthOf(ctx, "styles-button"),
        180,
        1,
      );
      yield* ctx.host.releasePointer(centre.x, centre.y);
      yield* settle;
      yield* waitForBounds(
        ctx,
        "styles-button",
        (box) => Math.abs(box.width - 100) <= 1,
      );
      yield* ctx.expectNear(
        "a live press at a point does not set hover",
        yield* widthOf(ctx, "styles-button"),
        100,
        1,
      );

      // 5. Leaving after a release reverts to the authored width.
      yield* hoverWidth(
        ctx,
        "styles-button",
        140,
        "a live move over the button re-applies hover",
      );
      yield* ctx.host.hover("styles-away");
      yield* settle;
      yield* waitForBounds(
        ctx,
        "styles-button",
        (box) => Math.abs(box.width - 100) <= 1,
      );
      yield* ctx.expectNear(
        "leaving after a live release reverts",
        yield* widthOf(ctx, "styles-button"),
        100,
        1,
      );

      // 6. A held pointer outside the element keeps `active`.
      const held = yield* boxOf(ctx, "styles-button");
      yield* ctx.host.pressWindow(
        held.x + held.width / 2,
        held.y + held.height / 2,
      );
      yield* settle;
      yield* waitForBounds(
        ctx,
        "styles-button",
        (box) => Math.abs(box.width - 180) <= 1,
      );
      yield* ctx.host.movePointer(20, 300);
      yield* settle;
      yield* ctx.expectNear(
        "a live held pointer outside keeps the active width",
        yield* widthOf(ctx, "styles-button"),
        180,
        1,
      );
      yield* ctx.host.releasePointer(20, 300);
      yield* settle;
      yield* waitForBounds(
        ctx,
        "styles-button",
        (box) => Math.abs(box.width - 100) <= 1,
      );
      yield* ctx.expectNear(
        "releasing outside clears the live active width",
        yield* widthOf(ctx, "styles-button"),
        100,
        1,
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${declaredStylesScenario.id}.png`,
      );
    }),
};

/** The painted height of a truncation sample's text run. */
const sampleHeight = (ctx: LiveContext, testId: string) =>
  Effect.map(boxOf(ctx, `${testId}-text`), (box) => box.height);

const liveTruncation: LiveScenario = {
  id: "live-truncation",
  title: "Live text truncation: ellipsis, nowrap and line clamp",
  capability: "truncation",
  view: textTruncationScenario.view,
  ready: "truncation-root",
  steps: (ctx) =>
    Effect.gen(function* () {
      const line = yield* sampleHeight(ctx, "trunc-line");
      const nowrap = yield* sampleHeight(ctx, "nowrap");
      const wrap = yield* sampleHeight(ctx, "wrap");
      yield* ctx.expectNear(
        "the live ellipsis sample is one line tall",
        line,
        nowrap,
        1,
      );
      yield* ctx.expectNear(
        "live ellipsis-start is one line tall",
        yield* sampleHeight(ctx, "trunc-start"),
        nowrap,
        1,
      );
      yield* ctx.expectEqual(
        "live nowrap overflows instead of wrapping",
        nowrap < wrap,
        true,
      );
      yield* ctx.expectEqual(
        "the live unclamped sample wraps past eight lines",
        wrap > line * 8,
        true,
      );
      yield* ctx.expectNear(
        "live lineClamp 2 clamps to two lines",
        yield* sampleHeight(ctx, "clamp-2"),
        line * 2,
        1,
      );
      yield* ctx.expectNear(
        "live lineClamp 3 clamps to three lines",
        yield* sampleHeight(ctx, "clamp-3"),
        line * 3,
        1,
      );
      yield* ctx.expectNear(
        "live lineClamp is inherited from the box",
        yield* sampleHeight(ctx, "clamp-box"),
        line * 2,
        1,
      );
      yield* ctx.expectEqual(
        "the live clamp is a real clamp, not a clip",
        (yield* sampleHeight(ctx, "clamp-2")) < wrap,
        true,
      );
      const repeatedClamp = yield* sampleHeight(ctx, "repeat-clamp");
      yield* ctx.expectNear(
        "identical live strings share one layout regardless of lineClamp",
        repeatedClamp,
        yield* sampleHeight(ctx, "repeat-plain"),
        0,
      );
      yield* ctx.expectEqual(
        "the shared live layout is the unclamped one",
        repeatedClamp > line * 4,
        true,
      );

      const painted = yield* ctx.host.paintedText();
      const truncated = yield* ctx.expectSome(
        "the live truncated sample reports its full source string",
        Arr.findFirst(painted, (run) => Str.startsWith("trunc-line ")(run)),
      );
      yield* ctx.expectEqual(
        "the live painted text carries no ellipsis glyph",
        Arr.some(painted, Str.endsWith("…")),
        false,
      );
      yield* ctx.expectEqual(
        "the live truncated run is the source prefix",
        Str.startsWith("trunc-line one two three")(truncated),
        true,
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${textTruncationScenario.id}.png`,
      );
    }),
};

const liveContent: LiveScenario = {
  id: "live-content",
  title: "Live content surfaces: svg, img, diff and the canvas trap",
  capability: "content",
  view: liveSurfacesView,
  ready: "surface-svg",
  steps: (ctx) =>
    Effect.gen(function* () {
      const svg = yield* boxOf(ctx, "surface-svg");
      yield* ctx.expectNear(
        "the live icon keeps its declared width",
        svg.width,
        48,
        1,
      );
      yield* ctx.expectNear(
        "the live icon keeps its declared height",
        svg.height,
        48,
        1,
      );

      // 1. A missing source paints the runtime's own fallback.
      const empty = yield* boxOf(ctx, "surface-img-empty");
      // An <img> loses 1 px per axis in the 0.10.0 tracker (plan 529 §6.3),
      // live as well as offscreen.
      yield* ctx.expectNear("the live no-src box width", empty.width, 94, 0.5);
      yield* ctx.expectNear(
        "the live no-src box height",
        empty.height,
        62,
        0.5,
      );
      yield* ctx.expectEqual(
        "the empty-src and failed-bytes nodes paint the no-src fallback",
        yield* paintedCount(ctx, "img: no src"),
        2,
      );

      // 2. An undecodable data URL paints the load-failure fallback.
      yield* boxOf(ctx, "surface-img-invalid");
      yield* ctx.expectEqual(
        "an undecodable data URL paints the load-failure fallback",
        yield* paintedCount(ctx, "img: load failed"),
        1,
      );

      // 3. A valid data URL and a ref-uploaded bitmap lay out, adding no fallback.
      const data = yield* boxOf(ctx, "surface-img-data");
      yield* ctx.expectNear("the live data-URL box width", data.width, 64, 1);
      yield* ctx.expectNear("the live data-URL box height", data.height, 64, 1);
      yield* ctx.expectEqual(
        "a valid data URL adds no fallback",
        yield* paintedCount(ctx, "img: load failed"),
        1,
      );

      const live = yield* boxOf(ctx, "surface-img-live");
      yield* ctx.expectNear(
        "the live ref-uploaded box width",
        live.width,
        32,
        1,
      );
      yield* ctx.expectNear(
        "the live ref-uploaded box height",
        live.height,
        32,
        1,
      );
      yield* ctx.expectEqual(
        "pixels uploaded through the ref add no fallback",
        yield* paintedCount(ctx, "img: load failed"),
        1,
      );

      // 4. Image sources (plan `586`): bytes are assertable, a path/URL is not.
      const bytes = yield* boxOf(ctx, "surface-img-bytes");
      yield* ctx.expectNear(
        "the live bytes-upload box width",
        bytes.width,
        48,
        1,
      );
      yield* ctx.expectNear(
        "the live bytes-upload box height",
        bytes.height,
        48,
        1,
      );
      yield* waitForText(ctx, "surface-img-bytes-state", "ok");
      yield* ctx.expectEqual(
        "a live byte upload reports success",
        yield* textOf(ctx, "surface-img-bytes-state"),
        "ok",
      );

      const badBytes = yield* boxOf(ctx, "surface-img-bytes-bad");
      yield* ctx.expectNear(
        "the live failed-byte fallback width",
        badBytes.width,
        46,
        1,
      );
      yield* waitForText(
        ctx,
        "surface-img-bytes-bad-state",
        "unrecognized image format",
      );
      yield* ctx.expectContains(
        "a live undecodable byte buffer reports the runtime's throw",
        yield* textOf(ctx, "surface-img-bytes-bad-state"),
        "unrecognized image format",
      );

      const path = yield* boxOf(ctx, "surface-img-path");
      yield* ctx.expectNear("the live path-source width", path.width, 48, 1);
      const missing = yield* boxOf(ctx, "surface-img-path-missing");
      yield* ctx.expectNear(
        "the live missing-path width",
        missing.width,
        48,
        1,
      );
      const refused = yield* boxOf(ctx, "surface-img-url-refused");
      yield* ctx.expectNear("the live refused-URL width", refused.width, 48, 1);
      // The runtime's path/URL fallback is a plain GPUI element: it paints in
      // the screenshot but is absent from `getPaintedText()` and the tree, and
      // there is no load/error event. This count is the recorded limit.
      yield* ctx.expectEqual(
        "a path or URL source paints no fallback text the harness can see",
        yield* paintedCount(ctx, "img: load failed"),
        1,
      );

      // 5. The diff paints its width and every patch line.
      const diff = yield* boxOf(ctx, "surface-diff");
      yield* ctx.expectNear(
        "the live diff keeps its declared width",
        diff.width,
        640,
        1,
      );
      yield* ctx.expectEqual(
        "the live diff has a painted height",
        diff.height > 0,
        true,
      );
      const painted = Arr.join(yield* ctx.host.paintedText(), "\n");
      yield* ctx.expectContains(
        "the live diff paints its file header",
        painted,
        "example.ts",
      );
      yield* ctx.expectContains(
        "the live diff paints its hunk header",
        painted,
        "@@ -1,2 +1,2 @@",
      );
      yield* ctx.expectContains(
        "the live diff paints an added line",
        painted,
        "const added = 1",
      );
      yield* ctx.expectContains(
        "the live diff paints a removed line",
        painted,
        "const removed = 1",
      );

      // 6. The canvas trap: retained, unpainted, and its child stays out of the paint.
      yield* ctx.expectEqual(
        "canvas paints nothing, so it has no bounds",
        Option.isNone(
          Option.fromNullishOr(yield* ctx.host.bounds("surface-canvas")),
        ),
        true,
      );
      yield* ctx.expectEqual(
        "canvas drops its child from the paint log",
        yield* paintedCount(ctx, "canvas-child"),
        0,
      );
      yield* ctx.expectContains(
        "canvas keeps its child in the retained tree",
        yield* textOf(ctx, "surface-canvas"),
        "canvas-child",
      );

      yield* settle;
      const frame = yield* captureLive(
        ctx.host,
        `${LIVE_ARTIFACTS}/${liveContent.id}.png`,
      );
      const reader = readAsync(ctx.host);
      // The fixture is red with alpha 127, so the frame carries the colour
      // blended over the theme background. The data-URL box is the known-good
      // decoded route: the path and byte boxes must paint the same colour.
      const reference = yield* pixelAtId(
        ctx,
        reader,
        frame,
        "surface-img-data",
      );
      yield* ctx.expectEqual(
        "the decoded fixture paints a red-dominant colour",
        reference.r > reference.g + 40 && reference.r > reference.b + 40,
        true,
      );

      const matchesFixture = (testId: string) =>
        Effect.gen(function* () {
          const actual = yield* pixelAtId(ctx, reader, frame, testId);
          yield* ctx.expectEqual(
            `${testId} paints the fixture's colour`,
            Pixels.rgbaNear(actual, reference, TOLERANCE),
            true,
          );
        });

      const differsFromFixture = (testId: string) =>
        Effect.gen(function* () {
          const actual = yield* pixelAtId(ctx, reader, frame, testId);
          yield* ctx.expectEqual(
            `${testId} does not paint the fixture's colour`,
            Pixels.rgbaNear(actual, reference, TOLERANCE),
            false,
          );
        });

      yield* Effect.forEach(
        ["surface-img-path", "surface-img-bytes"] as const,
        matchesFixture,
        { concurrency: 1, discard: true },
      );

      yield* Effect.forEach(
        [
          "surface-img-path-missing",
          "surface-img-url-refused",
          "surface-img-invalid",
        ] as const,
        differsFromFixture,
        { concurrency: 1, discard: true },
      );
    }),
};

const liveMarkdown: LiveScenario = {
  id: "live-markdown",
  title: "Live markdown: blocks paint, links click, text selects",
  capability: "content",
  view: markdownScenario.view,
  ready: "md-doc",
  steps: (ctx) =>
    Effect.gen(function* () {
      const doc = yield* boxOf(ctx, "md-doc");
      yield* ctx.expectNear(
        "the live document fills its container width",
        doc.width,
        560 - 16,
        1,
      );
      yield* ctx.expectEqual(
        "the live document has a painted height",
        doc.height > 0,
        true,
      );

      const painted = Arr.join(yield* ctx.host.paintedText(), "\n");
      yield* ctx.expectContains(
        "a live heading paints",
        painted,
        "Release notes",
      );
      yield* ctx.expectContains(
        "a live list item paints",
        painted,
        "first item",
      );
      yield* ctx.expectContains(
        "a live table header paints",
        painted,
        "Metric",
      );
      yield* ctx.expectContains("a live table cell paints", painted, "500");
      yield* ctx.expectContains(
        "a live fenced code line paints",
        painted,
        "const total = rows * 2;",
      );

      // 1. A real drag across the document selects its text.
      const selected = yield* ctx.host.selectText("md-before", "md-after");
      const selection = yield* ctx.expectSome(
        "a live drag across the document selects text",
        Option.fromNullishOr(selected),
      );
      yield* ctx.expectContains(
        "the live selection crosses the markdown boundary",
        selection,
        "Release notes",
      );
      yield* ctx.expectContains(
        "the live selection reaches the fenced code",
        selection,
        "const total",
      );
      yield* ctx.host.clearSelection();

      // 2. A real coordinate click on the link fires onLinkClick.
      yield* ctx.host.click("md-link-doc");
      yield* waitForText(ctx, "md-link", "url=https://example.test/docs");
      yield* ctx.expectEqual(
        "a live coordinate click on the link fires onLinkClick",
        yield* textOf(ctx, "md-link"),
        "url=https://example.test/docs",
      );

      // 3. Prose without a link fires no second event.
      yield* ctx.host.click("md-doc");
      yield* settle;
      yield* ctx.expectEqual(
        "live prose without a link fires no link event",
        yield* textOf(ctx, "md-link"),
        "url=https://example.test/docs",
      );

      // 4. React children are retained but paint nothing.
      yield* ctx.expectContains(
        "the live markdown source still paints its own content",
        Arr.join(yield* ctx.host.paintedText(), "\n"),
        "Child",
      );
      yield* ctx.expectEqual(
        "live React children are dropped from the paint",
        yield* paintedCount(ctx, "md-child-text"),
        0,
      );
      yield* ctx.expectContains(
        "live React children stay in the retained tree",
        yield* textOf(ctx, "md-child"),
        "md-child-text",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveMarkdown.id}.png`);
    }),
};

const liveDiff: LiveScenario = {
  id: "live-diff",
  title:
    "Live diff: file toggles, the preview cap, a line click and the scroll anchor",
  capability: "diff",
  view: diffSurfaceScenario.view,
  ready: "diff-readout",
  steps: (ctx) =>
    Effect.gen(function* () {
      const box = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "a live two-file diff is 354 px tall",
        box.height,
        354,
        1,
      );
      yield* ctx.expectNear(
        "the live diff keeps its declared width",
        box.width,
        640,
        1,
      );

      // 1. A real header click emits and the consumer collapses the body.
      yield* ctx.host.clickWindow(box.x + 6, box.y + 18);
      yield* settle;
      yield* waitForText(ctx, "diff-readout", "toggles=1");
      const collapsed = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "the live file body collapses",
        collapsed.height,
        192,
        1,
      );
      yield* ctx.expectEqual(
        "the live collapsed body leaves the paint",
        yield* paintedCount(ctx, "const a = 1;"),
        0,
      );
      yield* ctx.expectEqual(
        "the live other file still paints",
        yield* paintedCount(ctx, "frozen: true"),
        1,
      );

      // 2. A second click restores the document.
      yield* ctx.host.clickWindow(collapsed.x + 6, collapsed.y + 18);
      yield* settle;
      yield* waitForText(ctx, "diff-readout", "toggles=2");
      const expanded = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "the live second click restores the height",
        expanded.height,
        354,
        1,
      );

      // 3. The cap paints a ShowMore row; a real click expands by its payload.
      yield* ctx.host.click("diff-cap");
      yield* settle;
      yield* waitForText(ctx, "diff-readout", "max=3");
      const capped = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "the live capped preview is 163 px tall",
        capped.height,
        163,
        1,
      );
      yield* ctx.expectEqual(
        "the live cap paints the hidden count",
        yield* paintedCount(ctx, "Show 7 more lines"),
        1,
      );
      yield* ctx.host.clickWindow(capped.x + 20, capped.y + capped.height - 18);
      yield* settle;
      yield* waitForText(ctx, "diff-readout", "max=10");
      yield* ctx.expectEqual(
        "the live show-more click reveals the rows",
        yield* paintedCount(ctx, "const e = 6;"),
        1,
      );
      yield* ctx.expectEqual(
        "the live show-more row is gone",
        yield* paintedCount(ctx, "Show 7 more lines"),
        0,
      );

      // 4. A real click on a line's gutter reports its numbers.
      yield* ctx.host.click("diff-reset");
      yield* settle;
      const reset = yield* boxOf(ctx, "diff-surface");
      yield* ctx.host.clickWindow(reset.x + 8, reset.y + 36 + 28 + 21 + 10.5);
      yield* settle;
      yield* waitForText(ctx, "diff-readout", "lines=1");
      yield* ctx.expectEqual(
        "the live removed line reports its numbers",
        yield* textOf(ctx, "diff-log"),
        "line=2/none",
      );
      yield* ctx.expectEqual(
        "the live removed line carries its text",
        yield* textOf(ctx, "diff-line"),
        "const b = 2;",
      );

      // 5. The scroll path keeps the reader's place across a patch update.
      yield* ctx.host.click("diff-scroll");
      yield* settle;
      yield* waitForText(ctx, "diff-readout", "scroll=1");
      const scrolling = yield* boxOf(ctx, "diff-surface");
      yield* ctx.expectNear(
        "the live scroll diff has a fixed viewport",
        scrolling.height,
        240,
        1,
      );
      yield* ctx.host.hover("diff-surface");
      yield* settle;
      yield* ctx.host.wheel("diff-surface", 0, -200);
      yield* settle;
      yield* ctx.expectEqual(
        "the live wheel leaves the first line behind",
        yield* paintedCount(ctx, "const a = 1;"),
        0,
      );
      yield* ctx.host.click("diff-swap");
      yield* settle;
      yield* waitForText(ctx, "diff-readout", "swapped=1");
      yield* ctx.expectEqual(
        "the live updated patch paints its new value",
        yield* paintedCount(ctx, "const e = 60;"),
        1,
      );
      yield* ctx.expectEqual(
        "the live reader keeps their place across a patch update",
        yield* paintedCount(ctx, "const a = 1;"),
        0,
      );

      // 6. The word wash: a frame pair proves the tint's direction and extent.
      yield* ctx.host.click("diff-reset");
      yield* settle;
      const offFrame = yield* captureLive(ctx.host);
      yield* ctx.host.click("diff-word");
      yield* settle;
      yield* waitForText(ctx, "diff-readout", "word=1");
      const onFrame = yield* captureLive(
        ctx.host,
        `${LIVE_ARTIFACTS}/${liveDiff.id}.png`,
      );
      yield* wordWashChecks(ctx, readAsync(ctx.host), offFrame, onFrame, box);
    }),
};

/** The three bar values the chart fixture paints, in paint order. */
const CHART_BARS = [96, 64, 32] as const;

const liveChart: LiveScenario = {
  id: "live-chart",
  title: "Live chart: bar geometry, svg layers and the img colour layer",
  capability: "chart",
  view: chartScenario.view,
  ready: "chart-bars-plot",
  steps: (ctx) =>
    Effect.gen(function* () {
      const plot = yield* boxOf(ctx, "chart-bars-plot");
      yield* ctx.expectNear(
        "the live plot keeps its declared width",
        plot.width,
        320,
        0.5,
      );
      yield* ctx.expectNear(
        "the live plot keeps its declared height",
        plot.height,
        148,
        0.5,
      );

      yield* Effect.forEach(
        CHART_BARS,
        (value, index) =>
          Effect.gen(function* () {
            const box = yield* boxOf(ctx, `chart-bar-${index}`);
            yield* ctx.expectNear(
              `live bar ${index} keeps its width`,
              box.width,
              56,
              0.5,
            );
            yield* ctx.expectNear(
              `live bar ${index} paints its value as its height`,
              box.height,
              value,
              0.5,
            );
            yield* ctx.expectNear(
              `live bar ${index} stands on the plot baseline`,
              box.y + box.height,
              plot.y + plot.height,
              0.5,
            );
          }),
        { concurrency: 1 },
      );

      const first = yield* boxOf(ctx, "chart-bar-0");
      const second = yield* boxOf(ctx, "chart-bar-1");
      const third = yield* boxOf(ctx, "chart-bar-2");
      yield* ctx.expectNear(
        "live bars advance by their width plus the gap",
        second.x - first.x,
        72,
        0.5,
      );
      yield* ctx.expectNear(
        "the live third bar follows the same rule",
        third.x - second.x,
        72,
        0.5,
      );

      yield* ctx.host.click("chart-bar-1");
      yield* settle;
      yield* ctx.expectEqual(
        "a live painted bar is hit-testable and selects its series",
        yield* textOf(ctx, "chart-selected"),
        "series=beta value=64",
      );
      yield* ctx.expectEqual(
        "a live value label paints the measurement",
        yield* textOf(ctx, "chart-value-1"),
        "64",
      );
      yield* ctx.expectEqual(
        "live axis labels are real text nodes",
        yield* textOf(ctx, "chart-label-0"),
        "Jan",
      );

      // One <svg> layer per series, both on the same plot box.
      const primary = yield* boxOf(ctx, "chart-series-0");
      const success = yield* boxOf(ctx, "chart-series-1");
      yield* ctx.expectNear(
        "the live primary svg layer keeps the plot width",
        primary.width,
        480,
        0.5,
      );
      yield* ctx.expectNear(
        "the live primary svg layer keeps the plot height",
        primary.height,
        160,
        0.5,
      );
      yield* ctx.expectNear(
        "both live svg layers share their origin",
        success.x,
        primary.x,
        0.5,
      );
      yield* ctx.expectNear(
        "both live svg layers share a top edge",
        success.y,
        primary.y,
        0.5,
      );

      // SVG children are retained, but the rasterizer drops them from the paint.
      yield* ctx.expectContains(
        "the live svg child stays in the retained tree",
        yield* textOf(ctx, "chart-svg-child"),
        "svg-child-text",
      );
      const painted = Arr.join(yield* ctx.host.paintedText(), "\n");
      yield* ctx.expectEqual(
        "live svg children are dropped from the paint",
        Str.includes("svg-child-text")(painted),
        false,
      );
      yield* ctx.expectEqual(
        "live text authored inside the svg is rasterized away",
        Str.includes("svg-internal-label")(painted),
        false,
      );

      // The full-colour layer is an <img>. Unlike the raster data URL in plan
      // `577` (a 1 px per-axis tracker loss), an SVG source keeps its declared
      // box live — measured here as exactly 480 × 120.
      const image = yield* boxOf(ctx, "chart-image");
      yield* ctx.expectNear(
        "the live colour chart keeps its declared width",
        image.width,
        480,
        0.5,
      );
      yield* ctx.expectNear(
        "the live colour chart keeps its declared height",
        image.height,
        120,
        0.5,
      );
      yield* ctx.expectEqual(
        "the live svg data URL decodes as a colour image",
        Str.includes("img: load failed")(painted),
        false,
      );

      // Colour, not only geometry: the frame the runtime wrote is sampled
      // (plan `697`). `chart-tint-*` are solid masks, so their centres are the
      // element `color` exactly; the image box is sampled at SVG coordinates.
      yield* settle;
      const frame = yield* captureLive(
        ctx.host,
        `${LIVE_ARTIFACTS}/${liveChart.id}.png`,
      );
      const reader = readAsync(ctx.host);
      const window = yield* reader.windowSize();

      const tint = (token: string) =>
        ctx.expectSome(`${token} parses`, Pixels.hexToRgba(token));

      yield* expectPixel(
        ctx,
        "a sourced svg is painted in its own colour",
        reader,
        frame,
        "chart-tint-0",
        yield* tint(palettes.dark.colors.primary),
      );
      yield* expectPixel(
        ctx,
        "a second sourced svg is tinted independently",
        reader,
        frame,
        "chart-tint-1",
        yield* tint(palettes.dark.colors.success),
      );

      const sample = (label: string, dx: number, dy: number) =>
        pixelAtPoint(ctx, frame, window, image.x + dx, image.y + dy, label);

      const expectFill = (label: string, dx: number, dy: number, hex: string) =>
        Effect.gen(function* () {
          const colour = yield* sample(label, dx, dy);
          yield* expectColour(ctx, label, colour, yield* tint(hex));
        });

      const expectDominant = (
        label: string,
        dx: number,
        dy: number,
        predicate: (colour: Pixels.Rgba) => boolean,
      ) =>
        Effect.gen(function* () {
          const colour = yield* sample(label, dx, dy);
          yield* ctx.expectEqual(label, predicate(colour), true);
        });

      yield* expectFill(
        "the image keeps its first opaque fill",
        48,
        84,
        "#e5484d",
      );
      yield* expectFill(
        "the image keeps a second opaque fill",
        120,
        70,
        "#30a46c",
      );
      yield* expectFill(
        "the radial gradient's centre is its stop colour",
        270,
        60,
        "#ffd166",
      );
      yield* expectDominant(
        "the linear gradient starts blue",
        8,
        4,
        (colour) => colour.b - colour.r > 60,
      );
      yield* expectDominant(
        "the linear gradient has faded at the bottom",
        8,
        116,
        (colour) => colour.b - colour.r < 25,
      );
      yield* expectDominant(
        "the radial gradient does not cover the left edge",
        160,
        60,
        (colour) => colour.r - colour.b < 20,
      );
    }),
};

/**
 * `live-qr` — plan `518`'s QR recipe in a real window (plan `599`).
 *
 * The headless probe is the only evidence for the three rendering routes: a
 * `div` per dark module, one sourced `<svg>` mask and one SVG data-URL
 * `<img>`. This twin measures what a window can settle — the matrix-relative
 * geometry of the 226-node absolute grid, the absent light module, the module
 * hit target, both single-node routes and the v4 scale. Colour is now sampled
 * from the frame (plan `708`): every module centre on both the module grid and
 * the image route reconstructs the authored matrix. The retained-node cost and
 * the AccessKit `Image` node stay headless: the live renderer exposes neither
 * (plan `197`).
 */
const liveQr: LiveScenario = {
  id: "live-qr",
  title: "Live QR: the module grid, both single-node routes and the v4 scale",
  capability: "qr",
  view: qrScenario.view,
  ready: "qr-state",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectEqual(
        "the live probe mounts the v1 module grid",
        yield* textOf(ctx, "qr-state"),
        "mode=div version=v1 dark=226 size=174 hit=none",
      );

      // Every offset below is measured from the matrix, never the window.
      const matrix = yield* boxOf(ctx, "qr-matrix");
      yield* ctx.expectNear(
        "the live v1 matrix keeps its width",
        matrix.width,
        174,
        0.5,
      );
      yield* ctx.expectNear(
        "the live v1 matrix keeps its height",
        matrix.height,
        174,
        0.5,
      );

      const corner = yield* boxOf(ctx, "qr-dot-0-0");
      yield* ctx.expectNear(
        "the live quiet zone offsets x",
        corner.x - matrix.x,
        24,
        0.5,
      );
      yield* ctx.expectNear(
        "the live quiet zone offsets y",
        corner.y - matrix.y,
        24,
        0.5,
      );
      yield* ctx.expectNear(
        "a live module keeps its size",
        corner.width,
        6,
        0.5,
      );

      const next = yield* boxOf(ctx, "qr-dot-0-1");
      yield* ctx.expectNear(
        "a live module advances by its size on x",
        next.x - corner.x,
        6,
        0.5,
      );
      const rightFinder = yield* boxOf(ctx, "qr-dot-0-6");
      yield* ctx.expectNear(
        "the live top-right finder starts",
        rightFinder.x - matrix.x,
        60,
        0.5,
      );
      const lowerFinder = yield* boxOf(ctx, "qr-dot-6-0");
      yield* ctx.expectNear(
        "the live bottom-left finder starts",
        lowerFinder.y - matrix.y,
        60,
        0.5,
      );
      const centre = yield* boxOf(ctx, "qr-dot-3-3");
      yield* ctx.expectNear(
        "the live finder centre is at (42, 42) on x",
        centre.x - matrix.x,
        42,
        0.5,
      );
      yield* ctx.expectNear(
        "the live finder centre is at (42, 42) on y",
        centre.y - matrix.y,
        42,
        0.5,
      );

      yield* ctx.expectEqual(
        "a live light module paints nothing",
        (yield* ctx.host.bounds("qr-dot-1-1")) === null,
        true,
      );

      yield* ctx.host.click("qr-dot-3-3");
      yield* settle;
      yield* ctx.expectEqual(
        "a live module is a real hit target",
        yield* textOf(ctx, "qr-hit"),
        "hit=r3c3",
      );

      // Pixels: the frame's module centres are the authored matrix (plan 708).
      const divFrame = yield* captureLive(
        ctx.host,
        `${LIVE_ARTIFACTS}/${liveQr.id}.png`,
      );
      const divRows = yield* qrFrameChecks(ctx, readAsync(ctx.host), divFrame, {
        label: "the live module grid",
        matrix: QR_V1.matrix,
        spec: { module: 6, quiet: 4 },
        dark: palettes.dark.colors.foreground,
        light: palettes.dark.colors.background,
      });

      // The single tinted SVG mask: one node, the matrix box, no modules.
      yield* ctx.host.click("qr-mode-svg");
      yield* ctx.host.waitFor("qr-svg");
      yield* settle;
      yield* ctx.expectContains(
        "the live svg route is selected",
        yield* textOf(ctx, "qr-state"),
        "mode=svg",
      );
      const svgBox = yield* boxOf(ctx, "qr-svg");
      yield* ctx.expectNear(
        "the live svg keeps the matrix width",
        svgBox.width,
        174,
        0.5,
      );
      yield* ctx.expectNear(
        "the live svg keeps the matrix height",
        svgBox.height,
        174,
        0.5,
      );
      yield* ctx.expectEqual(
        "the live svg route has no module nodes",
        (yield* ctx.host.bounds("qr-dot-3-3")) === null,
        true,
      );

      // The full-colour image route: one node, and — unlike the raster data
      // URL's 1 px per-axis loss (plan `577`) — an SVG source keeps its box
      // (plan `593`, re-confirmed here at 174 × 174).
      yield* ctx.host.click("qr-mode-img");
      yield* ctx.host.waitFor("qr-img");
      yield* settle;
      yield* ctx.expectContains(
        "the live image route is selected",
        yield* textOf(ctx, "qr-state"),
        "mode=img",
      );
      const imgBox = yield* boxOf(ctx, "qr-img");
      yield* ctx.expectNear(
        "the live image keeps the matrix width",
        imgBox.width,
        174,
        0.5,
      );
      yield* ctx.expectNear(
        "the live image keeps the matrix height",
        imgBox.height,
        174,
        0.5,
      );
      const painted = Arr.join(yield* ctx.host.paintedText(), "\n");
      yield* ctx.expectEqual(
        "the live data URL decodes without a load fallback",
        Str.includes("img: load failed")(painted),
        false,
      );
      yield* ctx.expectEqual(
        "the live data URL has a source",
        Str.includes("img: no src")(painted),
        false,
      );

      // Pixels: the single-node route paints the same code, in its own
      // two colours (`#000` on `#fff`, baked into the SVG).
      const imgFrame = yield* captureLive(ctx.host);
      const imgRows = yield* qrFrameChecks(ctx, readAsync(ctx.host), imgFrame, {
        label: "the live image route",
        matrix: QR_V1.matrix,
        spec: { module: 6, quiet: 4 },
        dark: "#000000",
        light: "#ffffff",
      });
      yield* ctx.expectEqual(
        "the live image route and the module grid paint the same matrix",
        Arr.join(imgRows, "\n"),
        Arr.join(divRows, "\n"),
      );

      // Returning to the grid leaves no residue and no drift.
      yield* ctx.host.click("qr-mode-div");
      yield* ctx.host.waitFor("qr-dot-3-3");
      yield* settle;
      const restored = yield* boxOf(ctx, "qr-dot-3-3");
      yield* ctx.expectNear(
        "the live module grid remounts at the same x",
        restored.x - matrix.x,
        42,
        0.5,
      );
      yield* ctx.expectNear(
        "the live module grid remounts at the same y",
        restored.y - matrix.y,
        42,
        0.5,
      );

      // The version scale: a wider matrix, a smaller module, the same rules.
      yield* ctx.host.click("qr-version");
      yield* waitForText(ctx, "qr-state", "dark=591");
      yield* ctx.expectContains(
        "the live version toggle swaps the fixture",
        yield* textOf(ctx, "qr-state"),
        "dark=591",
      );
      const v4 = yield* boxOf(ctx, "qr-matrix");
      yield* ctx.expectNear(
        "the live v4 matrix keeps its width",
        v4.width,
        164,
        0.5,
      );
      yield* ctx.expectNear(
        "the live v4 matrix keeps its height",
        v4.height,
        164,
        0.5,
      );
      const v4Corner = yield* boxOf(ctx, "qr-dot-0-0");
      yield* ctx.expectNear(
        "the live v4 quiet zone is exact",
        v4Corner.x - v4.x,
        16,
        0.5,
      );
      yield* ctx.expectNear(
        "a live v4 module keeps its size",
        v4Corner.width,
        4,
        0.5,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveQr.id}.png`);
    }),
};

/** Waits for `needle`, then asserts it is in the layers readout. */
const expectLayer = (ctx: LiveContext, needle: string, label: string) =>
  Effect.gen(function* () {
    yield* waitForText(ctx, "layers-readout", needle);
    yield* ctx.expectContains(
      label,
      yield* textOf(ctx, "layers-readout"),
      needle,
    );
  });

const liveLayers: LiveScenario = {
  id: "live-layers",
  title:
    "Live nested layers: payload copies, one Escape per layer and the submenu press",
  capability: "layers",
  view: nestedLayerScenario.view,
  ready: "layers-root",
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The trigger opens the parent layer.
      yield* ctx.host.click("layers-trigger");
      yield* settle;
      yield* expectLayer(
        ctx,
        "parent=1",
        "a live click opens the parent layer",
      );

      // 2. The row opens the submenu, which sits second on the stack.
      yield* ctx.host.click("layers-row-more");
      yield* settle;
      yield* expectLayer(ctx, "sub=1", "a live row opens the submenu");
      yield* expectLayer(ctx, "depth=2", "both live layers are on the stack");

      // 3. A press inside the submenu activates its row and reaches the
      // parent's outside handler with coordinates; the containment guard keeps
      // the submenu open long enough to activate.
      yield* ctx.host.click("layers-sub-a");
      yield* settle;
      yield* expectLayer(
        ctx,
        "last=activate",
        "a live submenu press activates its row",
      );
      yield* expectLayer(
        ctx,
        "subClicks=1",
        "the live submenu row ran exactly once",
      );
      yield* expectLayer(
        ctx,
        "outsideParent=1",
        "the live press reached the parent's outside handler",
      );
      yield* expectLayer(
        ctx,
        "outsideSub=0",
        "the live inside press is not outside the submenu",
      );
      yield* expectLayer(
        ctx,
        "coords=yes",
        "the live outside payload carries coordinates",
      );

      // 4. One live Escape closes only the submenu, and the next the parent.
      yield* ctx.host.click("layers-trigger");
      yield* settle;
      yield* ctx.host.click("layers-row-more");
      yield* settle;
      yield* expectLayer(ctx, "depth=2", "the live layers reopened");
      yield* ctx.expectEqual(
        "the live submenu holds focus after its row opens it",
        yield* focusedOf(ctx),
        "layers-sub",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* expectLayer(
        ctx,
        "last=sub-escape",
        "one live Escape closes the submenu",
      );
      yield* expectLayer(ctx, "sub=0", "the live submenu closed");
      yield* expectLayer(ctx, "parent=1", "the live parent stayed open");
      yield* ctx.host.key("escape");
      yield* settle;
      yield* expectLayer(
        ctx,
        "last=parent-escape",
        "the second live Escape closes the parent",
      );
      yield* expectLayer(ctx, "parent=0", "the live parent closed");

      // 5. One live key reaches two handlers as two payload objects.
      yield* ctx.host.click("layers-trigger");
      yield* settle;
      yield* ctx.host.click("layers-identity-inner");
      yield* settle;
      yield* ctx.host.key("x");
      yield* settle;
      yield* expectLayer(
        ctx,
        "keyHandlers=2",
        "the live key reached the inner and enclosing handler",
      );
      yield* expectLayer(
        ctx,
        "keyObjects=2",
        "the live runtime delivers a separate payload copy per handler",
      );

      // 6. The dismiss stack holds both layers, and outside presses pop one
      // each. The live runner settles between them, which is one task.
      yield* ctx.host.click("layers-row-more");
      yield* settle;
      yield* expectLayer(ctx, "depth=2", "the live stack holds both layers");
      yield* ctx.host.clickWindow(520, 640);
      yield* settle;
      yield* expectLayer(
        ctx,
        "sub=0",
        "a live outside press closes the topmost layer",
      );
      yield* expectLayer(
        ctx,
        "parent=1",
        "the first live outside press leaves the parent open",
      );
      yield* ctx.host.clickWindow(520, 640);
      yield* settle;
      yield* expectLayer(
        ctx,
        "parent=0",
        "the second live outside press closes the parent",
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${nestedLayerScenario.id}.png`,
      );
    }),
};

const columnConfig: LiveScenario = {
  id: "live-column-config",
  title: "Live data grid: hide, show and reorder columns in a window",
  capability: "column-config",
  view: columnConfigScenario.view,
  ready: "config-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The panel anchors under its trigger and names the full order.
      const trigger = yield* boxOf(ctx, "config-open");
      yield* ctx.host.click("config-open");
      yield* ctx.host.waitFor("config-panel");
      yield* settle;
      const panel = yield* boxOf(ctx, "config-panel");
      yield* ctx.expectNear(
        // The panel's content origin is 7 px inside it (plan 529 §6.3).
        "the live panel opens at the trigger's left edge",
        panel.x,
        trigger.x + 7,
        1,
      );
      yield* ctx.expectNear(
        // The panel's content origin is 7 px inside it (plan 529 §6.3).
        "the live panel opens under the trigger",
        panel.y,
        trigger.y + trigger.height + 7,
        1,
      );
      yield* ctx.expectContains(
        "the live panel starts with every column",
        yield* textOf(ctx, "config-state"),
        "hidden=none visible=4 content=560",
      );

      // 2. Hiding a column unpaints it and the gap closes in the body.
      yield* ctx.host.click("config-show-status");
      yield* settle;
      yield* waitForText(
        ctx,
        "config-state",
        "hidden=status visible=3 content=440",
      );
      yield* ctx.expectEqual(
        "the live hidden column leaves no header",
        (yield* ctx.host.bounds("config-head-status")) === null,
        true,
      );
      const nameHead = yield* boxOf(ctx, "config-head-name");
      const sizeHead = yield* boxOf(ctx, "config-head-size");
      const sizeCell = yield* boxOf(ctx, "config-cell-0-size");
      yield* ctx.expectNear(
        "the live next column closes the gap",
        sizeHead.x,
        nameHead.x + nameHead.width,
        1,
      );
      yield* ctx.expectNear(
        "the live body follows the narrowed header",
        sizeCell.x,
        sizeHead.x,
        1,
      );

      // 3. A real pan end follows the visible width; the press also closes the
      //    panel, which is the measured outside-dismissal route.
      yield* ctx.host.click("config-pan-end");
      yield* settle;
      yield* waitForText(ctx, "config-state", "x=-80");
      const offset = yield* offsetOf(ctx, "config-pan");
      yield* ctx.expectNear(
        "the live pan follows the visible width",
        offset.x,
        -80,
        1,
      );
      yield* ctx.expectEqual(
        "the live outside press closed the panel",
        (yield* ctx.host.bounds("config-panel")) === null,
        true,
      );

      // 4. The reader's row survives a hide and the frozen column follows.
      yield* ctx.host.click("config-jump");
      yield* settle;
      yield* waitForText(ctx, "config-state", "anchor=45");
      yield* ctx.host.click("config-open");
      yield* ctx.host.waitFor("config-panel");
      yield* settle;
      yield* ctx.host.click("config-show-size");
      yield* settle;
      yield* waitForText(
        ctx,
        "config-state",
        "hidden=size visible=3 anchor=45",
      );
      const anchor = yield* ctx.expectSome(
        "the live list reports an anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("config-list")),
      );
      yield* ctx.expectEqual(
        "the live hide keeps the reader's row",
        anchor[0],
        45,
      );
      const frozen = yield* boxOf(ctx, "config-frozen-row-45");
      const body = yield* boxOf(ctx, "config-row-45");
      yield* ctx.expectNear(
        "the live frozen row aligns after a hide",
        frozen.y,
        body.y,
        1,
      );

      // 5. A reorder moves a shown column past a hidden neighbour; both stay
      //    addressable where the model puts them.
      yield* ctx.host.click("config-show-size");
      yield* settle;
      yield* ctx.host.click("config-up-notes");
      yield* settle;
      yield* waitForText(
        ctx,
        "config-state",
        "order=name,notes,status,size hidden=status",
      );
      const notesHead = yield* boxOf(ctx, "config-head-notes");
      const notesCell = yield* boxOf(ctx, "config-cell-45-notes");
      yield* ctx.expectNear(
        "the live reordered column takes the second slot",
        notesHead.x,
        nameHead.x + nameHead.width,
        1,
      );
      yield* ctx.expectNear(
        "the live reordered body follows its header",
        notesCell.x,
        notesHead.x,
        1,
      );

      // 6. Showing the last hidden column restores the full width; Escape
      //    closes the panel and returns focus to the trigger.
      yield* ctx.host.click("config-show-status");
      yield* settle;
      yield* waitForText(
        ctx,
        "config-state",
        "order=name,notes,status,size hidden=none visible=4 content=560",
      );
      yield* ctx.expectEqual(
        "the live restore repaints the column",
        (yield* ctx.host.bounds("config-cell-45-status")) === null,
        false,
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.expectEqual(
        "the live Escape closes the panel",
        (yield* ctx.host.bounds("config-panel")) === null,
        true,
      );
      yield* ctx.expectEqual(
        "the live Escape returns focus",
        yield* focusedOf(ctx),
        "config-open",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${columnConfig.id}.png`);
    }),
};

const cropArea: LiveScenario = {
  id: "live-crop-area",
  title: "Live crop area: the image box, masks, a handle drag and a key",
  capability: "crop",
  view: cropScenario.view,
  ready: "crop-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The stage is the coordinate space and the crop starts centred.
      const stage = yield* boxOf(ctx, "crop-stage");
      const box = yield* boxOf(ctx, "crop-box");
      yield* ctx.expectNear(
        "the live crop starts 66 px from the stage's left",
        box.x - stage.x,
        66,
        1,
      );
      yield* ctx.expectNear(
        "the live crop starts 42 px below the stage's top",
        box.y - stage.y,
        42,
        1,
      );
      yield* ctx.expectNear(
        "the live crop starts 188 px wide inside its borders",
        box.width,
        188,
        1,
      );
      yield* ctx.expectNear(
        "the live crop starts 116 px tall inside its borders",
        box.height,
        116,
        1,
      );
      yield* waitForText(ctx, "crop-readout", "w=192 h=120");

      // 2. A real paced drag on the SE handle resizes both edges.
      yield* ctx.host.drag("crop-handle-se", 40, 20);
      yield* settle;
      yield* waitForText(ctx, "crop-readout", "w=232 h=140");
      const resized = yield* boxOf(ctx, "crop-handle-se");
      yield* ctx.expectNear(
        "the live SE handle follows the resized corner",
        resized.x + resized.width / 2,
        box.x + 230,
        1,
      );
      yield* ctx.expectNear(
        "the live SE handle stays on the bottom edge",
        resized.y + resized.height / 2,
        box.y + 138,
        1,
      );

      // 3. Pass-through and blocking, at the stage's top mask.
      yield* ctx.host.clickWindow(stage.x + 160, stage.y + 10);
      yield* settle;
      yield* waitForText(ctx, "crop-readout", "image=1 blocked=0");
      yield* ctx.host.click("crop-mask-mode");
      yield* settle;
      yield* waitForText(ctx, "crop-readout", "mask=auto");
      yield* ctx.host.clickWindow(stage.x + 160, stage.y + 10);
      yield* settle;
      yield* waitForText(ctx, "crop-readout", "image=1 blocked=1");

      // 4. The box takes native focus and an arrow moves it.
      yield* ctx.host.click("crop-box");
      yield* settle;
      yield* ctx.expectEqual(
        "the live click focuses the crop box",
        yield* focusedOf(ctx),
        "crop-box",
      );
      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForText(ctx, "crop-readout", "x=65");

      // 5. A reset restores the initial geometry.
      yield* ctx.host.click("crop-reset");
      yield* settle;
      yield* waitForText(
        ctx,
        "crop-readout",
        "x=64 y=40 w=192 h=120 fit=contain mask=none image=0 blocked=0",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${cropArea.id}.png`);
    }),
};

const menuBar: LiveScenario = {
  id: "live-menu-bar",
  title: "Live application menu bar: switching, roving rows and accelerators",
  capability: "menubar",
  view: menuBarScenario.view,
  ready: "menubar-bar",
  steps: (ctx) =>
    Effect.gen(function* () {
      const bar = yield* boxOf(ctx, "menubar-bar");
      const file = yield* boxOf(ctx, "menubar-file");
      yield* ctx.expectNear(
        "the live bar is 26 px inside its borders",
        bar.height,
        26,
        1,
      );

      // 1. A real click opens File below its title and focuses the first row.
      yield* ctx.host.click("menubar-file");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "open=file");
      yield* ctx.host.waitFor("menubar-file-surface");
      const surface = yield* boxOf(ctx, "menubar-file-surface");
      yield* ctx.expectNear(
        // The surface's content box starts 5 px inside it (plan 529 §6.3).
        "the live surface starts under its title",
        surface.y,
        file.y + file.height + 7,
        3,
      );
      yield* ctx.expectNear(
        "the live surface aligns to the title",
        surface.x,
        file.x,
        3,
      );
      yield* ctx.expectEqual(
        "opening focuses the first row live",
        yield* focusedOf(ctx),
        "menu-file-new",
      );

      // 2. Hover switches the open menu without a press.
      yield* ctx.host.hover("menubar-edit");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "open=edit");
      yield* ctx.expectEqual(
        "hover switches and focuses the new menu live",
        yield* focusedOf(ctx),
        "menu-edit-undo",
      );

      // 3. Right/Left switch and skip the disabled View menu.
      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "open=help");
      yield* ctx.expectEqual(
        "Right skips View and focuses Help live",
        yield* focusedOf(ctx),
        "menu-help-about",
      );
      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "open=file");

      // 4. Down/Up rove, wrap and skip the disabled row.
      yield* ctx.host.key("down");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "item=open");
      yield* ctx.expectEqual(
        "Down roves live",
        yield* focusedOf(ctx),
        "menu-file-open",
      );
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.key("down");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "item=new");
      yield* ctx.expectContains(
        "Down skips the disabled row live",
        yield* textOf(ctx, "menubar-readout"),
        "item=new",
      );

      // 5. Enter runs once, closes, and returns focus to the title.
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "runs=1");
      yield* ctx.expectContains(
        "the live row is the one that ran",
        yield* textOf(ctx, "menubar-readout"),
        "last=new",
      );
      yield* ctx.expectEqual(
        "activation returns focus to the title live",
        yield* focusedOf(ctx),
        "menubar-file",
      );

      // 6. Escape closes and returns focus.
      yield* ctx.host.click("menubar-file");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "open=file");
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "open=none");
      yield* ctx.expectEqual(
        "Escape returns focus to the title live",
        yield* focusedOf(ctx),
        "menubar-file",
      );

      // 7. Accelerators run once, never open, and are inert when disabled.
      yield* ctx.host.key("cmd-s");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "runs=2");
      yield* ctx.expectContains(
        "the live chord runs its command",
        yield* textOf(ctx, "menubar-readout"),
        "last=accel:save",
      );
      yield* ctx.host.key("cmd-shift-s");
      yield* settle;
      yield* ctx.expectContains(
        "a disabled row's chord is inert live",
        yield* textOf(ctx, "menubar-readout"),
        "runs=2",
      );
      yield* ctx.host.click("menubar-file");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "open=file");
      yield* ctx.host.key("cmd-o");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "runs=3");
      yield* ctx.expectContains(
        "a chord with a menu open dismisses it",
        yield* textOf(ctx, "menubar-readout"),
        "open=none",
      );

      // 8. An outside control dismisses without running a row.
      yield* ctx.host.click("menubar-file");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "open=file");
      yield* ctx.host.click("menubar-outside");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "outside=1");
      yield* ctx.expectContains(
        "the live outside press closes the menu",
        yield* textOf(ctx, "menubar-readout"),
        "open=none",
      );
      yield* ctx.expectContains(
        "no live menu row ran",
        yield* textOf(ctx, "menubar-readout"),
        "runs=3",
      );

      // 9. A real click on a row runs once and returns focus to the title.
      yield* ctx.host.click("menubar-file");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "open=file");
      yield* ctx.host.click("menu-file-save");
      yield* settle;
      yield* waitForText(ctx, "menubar-readout", "runs=4");
      yield* ctx.expectContains(
        "the live clicked row is the one that ran",
        yield* textOf(ctx, "menubar-readout"),
        "last=save",
      );
      yield* ctx.expectEqual(
        "a live row click returns focus to the title",
        yield* focusedOf(ctx),
        "menubar-file",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${menuBar.id}.png`);
    }),
};

const appChrome: LiveScenario = {
  id: "live-app-chrome",
  title: "Live application chrome: toolbar, pinned status bar and breadcrumb",
  capability: "chrome",
  view: appChromeScenario.view,
  ready: "chrome-shell",
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The bar is pinned to the shell's bottom.
      const shell = yield* boxOf(ctx, "chrome-shell");
      const status = yield* boxOf(ctx, "chrome-status");
      yield* ctx.expectNear(
        "the live status bar is 22 px inside its borders",
        status.height,
        22,
        1,
      );
      yield* ctx.expectNear(
        "the live status bar sits at the shell's bottom",
        status.y + status.height,
        shell.y + 420,
        1,
      );

      // 2. Two scrollers, one bar that does not move.
      yield* ctx.host.wheel("chrome-sidebar", 0, -100);
      yield* settle;
      const sidebar = yield* offsetOf(ctx, "chrome-sidebar");
      yield* ctx.expectNear(
        "the live sidebar wheel scrolls",
        sidebar.y,
        -100,
        2,
      );
      yield* ctx.expectContains(
        "a live sidebar wheel leaves the list line alone",
        yield* textOf(ctx, "chrome-status-text"),
        "line=0",
      );
      yield* ctx.host.wheel("chrome-main-viewport", 0, -240);
      yield* settle;
      yield* waitForText(ctx, "chrome-status-text", "line=10");
      const sidebarAfter = yield* offsetOf(ctx, "chrome-sidebar");
      yield* ctx.expectNear(
        "the live list wheel leaves the sidebar alone",
        sidebarAfter.y,
        -100,
        2,
      );
      const statusAfter = yield* boxOf(ctx, "chrome-status");
      yield* ctx.expectNear(
        "the live bar stays put while the list scrolls",
        statusAfter.y,
        status.y,
        1,
      );

      // 3. The clipped trailing action is revealed by one pan, then runs.
      yield* ctx.host.click("chrome-pan-end");
      yield* settle;
      yield* waitForText(ctx, "chrome-status-text", "x=-340");
      const toolbar = yield* offsetOf(ctx, "chrome-toolbar");
      yield* ctx.expectNear("the live toolbar pans", toolbar.x, -340, 1);
      yield* ctx.host.click("chrome-sync");
      yield* settle;
      yield* waitForText(ctx, "chrome-status-text", "sync=1");

      // 4. A real click collapses the middle crumb and restores it.
      yield* ctx.host.click("chrome-pan-home");
      yield* settle;
      yield* ctx.host.click("chrome-collapse");
      yield* settle;
      const collapsedText = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "a live collapse hides the middle segment",
        Arr.some(collapsedText, Str.includes("src")),
        false,
      );
      yield* ctx.expectEqual(
        "a live collapse keeps the current page",
        Arr.some(collapsedText, Str.includes("file.ts")),
        true,
      );
      yield* ctx.host.click("chrome-collapse");
      yield* settle;
      const expandedText = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "a live expand restores the middle segment",
        Arr.some(expandedText, Str.includes("src")),
        true,
      );
      yield* ctx.host.click("crumb-1");
      yield* settle;
      yield* waitForText(ctx, "chrome-status-text", "trail=2");

      // 5. Input decides the active pane and the bar reports it.
      yield* ctx.host.click("chrome-item-6");
      yield* settle;
      yield* waitForText(ctx, "chrome-status-text", "sel=6");
      yield* ctx.host.click("chrome-line-12");
      yield* settle;
      yield* waitForText(ctx, "chrome-status-text", "pane=main");
      yield* ctx.expectContains(
        "the live line reaches the bar",
        yield* textOf(ctx, "chrome-status-text"),
        "line=12",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${appChrome.id}.png`);
    }),
};

const liveLayoutFlex: LiveScenario = {
  id: "live-layout-flex",
  title: "Live flex layout: widths, gaps and absolute positioning",
  capability: "layout",
  view: layoutScenario.view,
  ready: "layout-root",
  steps: (ctx) =>
    Effect.gen(function* () {
      const root = yield* boxOf(ctx, "layout-root");
      const a = yield* boxOf(ctx, "layout-a");
      const b = yield* boxOf(ctx, "layout-b");
      const absolute = yield* boxOf(ctx, "layout-abs");
      yield* ctx.expectNear(
        "the live root keeps its width",
        root.width,
        640,
        1,
      );
      yield* ctx.expectNear("the live box keeps its width", a.width, 200, 1);
      yield* ctx.expectNear(
        "the live second box keeps its width",
        b.width,
        320,
        1,
      );
      yield* ctx.expectNear(
        "the live gap between the boxes",
        b.x - (a.x + a.width),
        8,
        1,
      );
      yield* ctx.expectNear(
        "the live absolute box keeps its left inset",
        absolute.x - root.x,
        24,
        1,
      );
      yield* ctx.expectNear(
        "the live absolute box keeps its top inset",
        absolute.y - root.y,
        16,
        1,
      );
      yield* ctx.expectNear("the live boxes share a row", a.y, b.y, 1);

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveLayoutFlex.id}.png`);
    }),
};

/**
 * The headless grid view is 992 px tall — taller than the window — so the live
 * twin mounts it in one scroller and reads it in two batches. Every assertion
 * compares a box with its own container, so the scroll offset never enters one.
 */
const liveLayoutGridView = (): ReactNode => (
  <div
    testId="live-layout-viewport"
    style={{
      height: WINDOW.height - 80,
      overflowY: "scroll",
      paddingBottom: 40,
    }}
  >
    {layoutGridScenario.view()}
  </div>
);

const liveLayoutGrid: LiveScenario = {
  id: "live-layout-grid",
  title: "Live grid: tracks, rows, column minima, overflow and wrapping",
  capability: "grid-layout",
  view: liveLayoutGridView,
  ready: "grid-equal",
  steps: (ctx) =>
    Effect.gen(function* () {
      const gapAfter = (
        first: { readonly x: number; readonly width: number },
        second: { readonly x: number; readonly width: number },
      ) => second.x - (first.x + first.width);
      const endOf = (box: { readonly x: number; readonly width: number }) =>
        box.x + box.width;

      // Batch 1, at rest: the first four wrapped rows.
      const equal = yield* boxOf(ctx, "grid-equal");
      const equal1 = yield* boxOf(ctx, "grid-equal-1");
      const equal2 = yield* boxOf(ctx, "grid-equal-2");
      const equal3 = yield* boxOf(ctx, "grid-equal-3");
      yield* ctx.expectNear(
        "the live grid keeps its width",
        equal.width,
        300,
        1,
      );
      yield* ctx.expectNear("live first track width", equal1.width, 93.33, 1);
      yield* ctx.expectNear("live second track width", equal2.width, 93.33, 1);
      yield* ctx.expectNear("live third track width", equal3.width, 93.33, 1);
      yield* ctx.expectNear(
        "the live gap after track 1",
        gapAfter(equal1, equal2),
        10,
        1,
      );
      yield* ctx.expectNear(
        "the live gap after track 2",
        gapAfter(equal2, equal3),
        10,
        1,
      );
      yield* ctx.expectNear(
        "the live third track ends at the grid edge",
        endOf(equal3) - equal.x,
        300,
        1,
      );

      const rows = yield* boxOf(ctx, "grid-rows");
      const row1 = yield* boxOf(ctx, "grid-rows-1");
      const row2 = yield* boxOf(ctx, "grid-rows-2");
      const row3 = yield* boxOf(ctx, "grid-rows-3");
      yield* ctx.expectNear("live row cell width", row1.width, 145, 1);
      yield* ctx.expectNear("live row cell height", row1.height, 95, 1);
      yield* ctx.expectNear(
        "live column 2 starts after the gap",
        row2.x - rows.x,
        155,
        1,
      );
      yield* ctx.expectNear(
        "live row 2 starts after the gap",
        row3.y - rows.y,
        105,
        1,
      );
      yield* ctx.expectNear("live row 2 cell height", row3.height, 95, 1);

      const auto = yield* boxOf(ctx, "grid-auto");
      const auto1 = yield* boxOf(ctx, "grid-auto-1");
      const auto3 = yield* boxOf(ctx, "grid-auto-3");
      yield* ctx.expectNear("live auto grid height", auto.height, 90, 1);
      yield* ctx.expectNear(
        "the live tall child keeps its height",
        auto1.height,
        60,
        1,
      );
      yield* ctx.expectNear(
        "the live second auto row starts below the first",
        auto3.y - auto.y,
        70,
        1,
      );

      const rowCount = yield* boxOf(ctx, "grid-row-count");
      const rowCount1 = yield* boxOf(ctx, "grid-row-count-1");
      const rowCount3 = yield* boxOf(ctx, "grid-row-count-3");
      yield* ctx.expectNear(
        "a live declared child height wins over the track",
        rowCount1.height,
        10,
        1,
      );
      yield* ctx.expectNear(
        "the live third explicit row starts at 36.5",
        rowCount3.y - rowCount.y,
        36.5,
        1,
      );

      const default1 = yield* boxOf(ctx, "grid-default-1");
      const zero1 = yield* boxOf(ctx, "grid-zero-1");
      const min = yield* boxOf(ctx, "grid-min");
      const min1 = yield* boxOf(ctx, "grid-min-1");
      const min2 = yield* boxOf(ctx, "grid-min-2");
      const max = yield* boxOf(ctx, "grid-max");
      const max1 = yield* boxOf(ctx, "grid-max-1");
      const max2 = yield* boxOf(ctx, "grid-max-2");
      yield* ctx.expectNear(
        "the live default first track",
        default1.width,
        145,
        1,
      );
      yield* ctx.expectNear("the live zero first track", zero1.width, 145, 1);
      yield* ctx.expectNear(
        "the live min-content first track is narrow",
        min1.width,
        104,
        2,
      );
      yield* ctx.expectNear(
        "the live min-content grid is filled",
        endOf(min2) - min.x,
        300,
        2,
      );
      yield* ctx.expectNear(
        "the live max-content first track is its text",
        max1.width,
        38,
        2,
      );
      yield* ctx.expectNear(
        "the live max-content remainder stays unused",
        endOf(max2) - max.x,
        234,
        4,
      );

      // Batch 2: the lower rows, after the pan reaches the clamp.
      yield* ctx.host.wheel("live-layout-viewport", 0, -400);
      yield* settle;
      const offset = yield* offsetOf(ctx, "live-layout-viewport");
      yield* ctx.expectEqual(
        "the live grid viewport pans past the first batch",
        offset.y <= -300,
        true,
      );

      const center = yield* boxOf(ctx, "grid-center");
      const center1 = yield* boxOf(ctx, "grid-center-1");
      const center2 = yield* boxOf(ctx, "grid-center-2");
      yield* ctx.expectNear(
        "the live centre offset",
        center1.x - center.x,
        115,
        1,
      );
      yield* ctx.expectNear(
        "the live centre second cell",
        center2.x - center.x,
        155,
        1,
      );

      const nest = yield* boxOf(ctx, "grid-nest");
      const nestInner = yield* boxOf(ctx, "grid-nest-inner");
      const nestInner1 = yield* boxOf(ctx, "grid-nest-inner-1");
      yield* ctx.expectNear(
        "the live inner grid starts after the gap",
        nestInner.x - nest.x,
        155,
        1,
      );
      yield* ctx.expectNear(
        "the live inner track width",
        nestInner1.width,
        70.5,
        1,
      );

      const overflow = yield* boxOf(ctx, "grid-overflow");
      const overflow1 = yield* boxOf(ctx, "grid-overflow-1");
      const overflow2 = yield* boxOf(ctx, "grid-overflow-2");
      yield* ctx.expectNear(
        "the live oversized child keeps its width",
        overflow1.width,
        500,
        1,
      );
      yield* ctx.expectNear(
        "the live neighbour keeps its track",
        overflow2.x - overflow.x,
        155,
        1,
      );

      const grow = yield* boxOf(ctx, "grid-grow");
      const grow1 = yield* boxOf(ctx, "grid-grow-1");
      yield* ctx.expectNear(
        "the live grid grows to the row",
        grow.width,
        300,
        1,
      );
      yield* ctx.expectNear("the live grown track width", grow1.width, 145, 1);

      const stretch = yield* boxOf(ctx, "wrap-stretch");
      const stretch3 = yield* boxOf(ctx, "wrap-stretch-3");
      const start = yield* boxOf(ctx, "wrap-start");
      const start3 = yield* boxOf(ctx, "wrap-start-3");
      const autoWrap = yield* boxOf(ctx, "wrap-auto");
      const autoWrap3 = yield* boxOf(ctx, "wrap-auto-3");
      yield* ctx.expectNear(
        "the live fixed wrapping container keeps its height",
        stretch.height,
        200,
        1,
      );
      yield* ctx.expectNear(
        "the live default wrapping spreads the second line",
        stretch3.y - stretch.y,
        104,
        1,
      );
      yield* ctx.expectNear(
        "the live alignContent start keeps one gap",
        start3.y - start.y,
        38,
        1,
      );
      yield* ctx.expectNear(
        "the live auto-height wrapping row is exact",
        autoWrap.height,
        68,
        1,
      );
      yield* ctx.expectNear(
        "the live auto-height second line stays on the gap",
        autoWrap3.y - autoWrap.y,
        38,
        1,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveLayoutGrid.id}.png`);
    }),
};

const liveTypography: LiveScenario = {
  id: "live-typography",
  title: "Live typography: line height, weight and horizontal alignment",
  capability: "typography",
  view: typographyScenario.view,
  ready: "type-root",
  steps: (ctx) =>
    Effect.gen(function* () {
      const root = yield* boxOf(ctx, "type-root");
      const line1 = yield* boxOf(ctx, "type-line-1");
      const line2 = yield* boxOf(ctx, "type-line-2");
      yield* ctx.expectNear(
        "a live one-line run uses the declared height",
        line1.height,
        30,
        1,
      );
      yield* ctx.expectNear(
        "a live two-line run stacks the declared height",
        line2.height,
        60,
        1,
      );

      const small = yield* boxOf(ctx, "type-default-12");
      const normal = yield* boxOf(ctx, "type-default-16");
      const big = yield* boxOf(ctx, "type-default-24");
      yield* ctx.expectNear(
        "a live 12 px run is 19.5 tall",
        small.height,
        19.5,
        2,
      );
      yield* ctx.expectNear(
        "a live 16 px run is 26 tall",
        normal.height,
        26,
        2,
      );
      yield* ctx.expectNear("a live 24 px run is 39 tall", big.height, 39, 2);
      yield* ctx.expectEqual(
        "the live default line box grows with the size",
        big.height > normal.height && normal.height > small.height,
        true,
      );

      const highlights = yield* ctx.host.highlights();
      const washed = (text: string) =>
        Arr.filter(highlights, (match) => match.text === text);
      const rectOf = (text: string, index: number) =>
        Effect.gen(function* () {
          const match = yield* ctx.expectSome(
            `live wash ${index} of "${text}" is painted`,
            Arr.get(washed(text), index),
          );
          return yield* ctx.expectSome(
            `live wash ${index} of "${text}" has a rect`,
            Arr.head(match.rects),
          );
        });

      const regular = yield* rectOf("hello weight", 0);
      const bold = yield* rectOf("hello weight", 1);
      yield* ctx.expectEqual(
        "the live bold run is wider than the regular one",
        bold.width > regular.width + 2,
        true,
      );

      const selfCenter = yield* boxOf(ctx, "type-self-center");
      const selfEnd = yield* boxOf(ctx, "type-self-end");
      const justify = yield* boxOf(ctx, "type-justify");
      yield* ctx.expectNear(
        "live alignSelf centre halves the free space",
        selfCenter.x - root.x + selfCenter.width / 2,
        100,
        1,
      );
      yield* ctx.expectNear(
        "live alignSelf flex-end reaches the right edge",
        selfEnd.x - root.x + selfEnd.width,
        200,
        1,
      );
      yield* ctx.expectNear(
        "a live explicit width and justify centre",
        justify.x - root.x,
        70,
        1,
      );

      // textAlign is accepted but ignored: all three runs keep the same glyph x.
      const left = yield* rectOf("hello", 0);
      const center = yield* rectOf("hello", 1);
      const right = yield* rectOf("hello", 2);
      yield* ctx.expectNear(
        "live textAlign left starts at the block edge",
        left.x - root.x,
        0,
        1,
      );
      yield* ctx.expectNear(
        "live textAlign centre does not move the glyphs",
        center.x,
        left.x,
        0.5,
      );
      yield* ctx.expectNear(
        "live textAlign right does not move the glyphs",
        right.x,
        left.x,
        0.5,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveTypography.id}.png`);
    }),
};

const dataToolbar: LiveScenario = {
  id: "live-data-toolbar",
  title: "Live data toolbar: search, filter, sort, columns and archive",
  capability: "data-toolbar",
  view: dataToolbarScenario.view,
  ready: "tb-state",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectEqual(
        "the live cards start at the source counts",
        yield* textOf(ctx, "tb-card-total-value"),
        "60",
      );

      // A real search narrows the list and the cards.
      yield* ctx.host.click("tb-search");
      yield* ctx.host.key("i t e m space 1");
      yield* settle;
      yield* waitForText(ctx, "tb-state", "showing=11");
      yield* ctx.expectEqual(
        "the live showing card follows",
        yield* textOf(ctx, "tb-card-showing-value"),
        "11",
      );
      const match = yield* boxOf(ctx, "tb-row-1");
      const viewport = yield* boxOf(ctx, "tb-viewport");
      yield* ctx.expectNear(
        "the first live match is at the top",
        match.y,
        viewport.y,
        1,
      );
      const hidden = yield* ctx.host.bounds("tb-row-0");
      yield* ctx.expectEqual(
        "a non-matching row is unpainted live",
        hidden === null,
        true,
      );

      // A filter after a wheel resets the live anchor.
      yield* ctx.host.click("tb-clear");
      yield* settle;
      yield* ctx.host.wheel("tb-viewport", 0, -840);
      yield* settle;
      yield* waitForAnchor(ctx, "tb-list", "30,0");
      yield* ctx.host.click("tb-filter-paused");
      yield* settle;
      yield* waitForAnchor(ctx, "tb-list", "0,0");
      yield* waitForText(ctx, "tb-state", "anchor=0");
      yield* ctx.expectEqual(
        "the live filter resets the anchor",
        Option.getOrElse(
          Option.map(
            Option.fromNullishOr(yield* ctx.host.listScrollTop("tb-list")),
            (anchor) => anchor[0],
          ),
          () => -1,
        ),
        0,
      );

      // A real filter click narrows and clears the selection.
      yield* ctx.host.click("tb-clear");
      yield* settle;
      yield* ctx.host.click("tb-row-2");
      yield* ctx.host.click("tb-row-5");
      yield* settle;
      yield* waitForText(ctx, "tb-state", "selected=2");
      yield* ctx.host.click("tb-filter-paused");
      yield* settle;
      yield* waitForText(ctx, "tb-state", "filter=paused");
      yield* ctx.expectContains(
        "the live filter narrows the rows",
        yield* textOf(ctx, "tb-state"),
        "showing=20",
      );
      yield* ctx.expectContains(
        "the live filter clears the selection",
        yield* textOf(ctx, "tb-state"),
        "selected=0",
      );
      yield* ctx.expectEqual(
        "the live showing card follows the filter",
        yield* textOf(ctx, "tb-card-showing-value"),
        "20",
      );

      // A real sort moves a paused row to the top.
      yield* ctx.host.click("tb-clear");
      yield* settle;
      yield* ctx.host.click("tb-sort");
      yield* settle;
      yield* waitForText(ctx, "tb-state", "sort=status");
      const sorted = yield* boxOf(ctx, "tb-row-1");
      yield* ctx.expectNear(
        "the live status sort puts a paused row first",
        sorted.y,
        (yield* boxOf(ctx, "tb-viewport")).y,
        1,
      );

      // A real column toggle unpaints the header and its cells.
      yield* ctx.host.click("tb-clear");
      yield* settle;
      yield* ctx.host.click("tb-cols-owner");
      yield* settle;
      yield* waitForText(ctx, "tb-state", "cols=status");
      const owner = yield* ctx.host.bounds("tb-row-0-owner");
      yield* ctx.expectEqual(
        "the live owner cell is unpainted",
        owner === null,
        true,
      );
      yield* ctx.host.click("tb-cols-owner");
      yield* settle;
      yield* waitForText(ctx, "tb-state", "cols=status,owner");

      // Selection feeds the live bulk action and the cards.
      yield* ctx.host.click("tb-row-2");
      yield* ctx.host.click("tb-row-5");
      yield* settle;
      yield* waitForText(ctx, "tb-state", "selected=2");
      yield* ctx.host.click("tb-archive");
      yield* settle;
      yield* waitForText(ctx, "tb-state", "total=58");
      yield* ctx.expectContains(
        "the live archive clears the selection",
        yield* textOf(ctx, "tb-state"),
        "selected=0",
      );
      yield* ctx.expectEqual(
        "the live total card follows the archive",
        yield* textOf(ctx, "tb-card-total-value"),
        "58",
      );
      const archived = yield* ctx.host.bounds("tb-row-5");
      yield* ctx.expectEqual(
        "the archived row is unpainted live",
        archived === null,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${dataToolbar.id}.png`);
    }),
};

const multiPaneEditor: LiveScenario = {
  id: "live-editor",
  title: "Live editor: two panes, a scrolling code surface and a live split",
  capability: "editor",
  view: multiPaneEditorScenario.view,
  ready: "editor-state",
  steps: (ctx) =>
    Effect.gen(function* () {
      // A real drag stays inside one pane.
      const inside = yield* select(ctx, "editor-a-code", "editor-a-code");
      yield* ctx.expectContains(
        "a live drag copies pane A's code",
        inside,
        "alpha0",
      );
      yield* ctx.expectEqual(
        "a live drag leaves pane B out",
        Str.includes("beta0")(inside),
        false,
      );

      // A real wheel pans one pane and only one.
      yield* ctx.host.wheel("editor-a-viewport", 0, -200);
      yield* settle;
      const scrolled = yield* offsetOf(ctx, "editor-a-viewport");
      yield* ctx.expectNear(
        "the live wheel scrolls pane A",
        scrolled.y,
        -200,
        2,
      );
      const other = yield* offsetOf(ctx, "editor-b-viewport");
      yield* ctx.expectEqual("the live wheel leaves pane B alone", other.y, 0);
      yield* waitForText(ctx, "editor-state", "aY=-200");
      yield* ctx.expectContains(
        "the live readout reports the A offset",
        yield* textOf(ctx, "editor-state"),
        "aY=-200",
      );

      // A real click focuses and activates the other pane.
      yield* ctx.host.click("editor-b-viewport");
      yield* settle;
      yield* waitForText(ctx, "editor-state", "active=b");
      yield* waitForFocus(ctx, "editor-b-viewport");
      yield* ctx.expectEqual(
        "a live click makes pane B active and focused",
        yield* focusedOf(ctx),
        "editor-b-viewport",
      );

      // A real divider drag re-widths the pane and its code.
      yield* ctx.host.drag("editor-divider", 80, 0, 6);
      yield* settle;
      yield* waitForText(ctx, "editor-state", "split=500");
      const pane = yield* boxOf(ctx, "editor-pane-a");
      yield* ctx.expectNear("the live drag grew pane A", pane.width, 500, 2);
      const code = yield* boxOf(ctx, "editor-a-code");
      yield* ctx.expectNear(
        "the code follows its pane live",
        code.width,
        500,
        2,
      );
      const kept = yield* offsetOf(ctx, "editor-a-viewport");
      yield* ctx.expectNear("the live resize moves no offset", kept.y, -200, 2);

      // A real tab click swaps the document and starts it at the top.
      yield* ctx.host.click("editor-a-tab-util");
      yield* settle;
      yield* waitForText(ctx, "editor-state", "aTab=util");
      const painted = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the live tab swap paints the other document",
        Arr.some(painted, Str.includes("helper0")),
        true,
      );
      yield* ctx.expectEqual(
        "the live swap stops painting the first document",
        Arr.some(painted, Str.includes("alpha0")),
        false,
      );
      const reset = yield* offsetOf(ctx, "editor-a-viewport");
      yield* ctx.expectEqual(
        "the live swap starts the new document at the top",
        reset.y,
        0,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${multiPaneEditor.id}.png`);
    }),
};

const queryBuilder: LiveScenario = {
  id: "live-query-builder",
  title:
    "Live query builder: rules, combinators, append focus and the empty state",
  capability: "query",
  view: queryBuilderScenario.view,
  ready: "qb-state",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the live builder starts closed with every row",
        yield* textOf(ctx, "qb-state"),
        "open=false rules=1 complete=0 matched=120",
      );

      // A real click opens the strip.
      yield* ctx.host.click("qb-toggle");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "open=true");
      const strip = yield* boxOf(ctx, "qb-builder");
      yield* ctx.expectNear(
        "the live strip is 130 px inside its borders",
        strip.height,
        130,
        1,
      );

      // A real Select choice narrows the table.
      yield* ctx.host.click("qb-rule-0-value");
      yield* settle;
      yield* waitForText(ctx, "qb-rule-0-value-content", "paused");
      yield* ctx.host.click("qb-rule-0-value-item-paused");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "complete=1 matched=40");
      yield* ctx.expectEqual(
        "the live value choice narrows to the paused rows",
        yield* textOf(ctx, "qb-summary"),
        "status is paused",
      );
      const match = yield* boxOf(ctx, "qb-row-1");
      yield* ctx.expectNear(
        "the live first match is at the top",
        match.y,
        (yield* boxOf(ctx, "qb-viewport")).y,
        1,
      );
      const hidden = yield* ctx.host.bounds("qb-row-0");
      yield* ctx.expectEqual(
        "a live non-matching row is unpainted",
        hidden === null,
        true,
      );

      // A real add reveals and focuses the appended rule.
      yield* ctx.host.click("qb-add");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "rules=2");
      yield* waitForFocus(ctx, "qb-rule-1-value");
      yield* ctx.expectEqual(
        "the live appended rule takes focus",
        yield* focusedOf(ctx),
        "qb-rule-1-value",
      );
      const appended = yield* boxOf(ctx, "qb-rule-1");
      yield* ctx.expectEqual(
        "the live appended rule paints inside the strip",
        appended.y >= strip.y &&
          appended.y + appended.height <= strip.y + 132 + 1,
        true,
      );

      // Typing into a real rule narrows under `all` and widens under `any`.
      yield* ctx.host.click("qb-rule-1-value");
      yield* ctx.host.key("i t e m space 1");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "complete=2 matched=12");
      yield* ctx.expectEqual(
        "the live summary joins both rules",
        yield* textOf(ctx, "qb-summary"),
        "status is paused and name contains item 1",
      );
      yield* ctx.host.click("qb-match-any");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "match=any");
      yield* ctx.expectContains(
        "any widens the live result",
        yield* textOf(ctx, "qb-state"),
        "matched=59",
      );
      yield* ctx.expectSome(
        "a live row matching only one rule paints under any",
        Option.fromNullishOr(yield* ctx.host.bounds("qb-row-11")),
      );

      // A real numeric field with a real bound.
      yield* ctx.host.click("qb-clear");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "matched=120");
      yield* ctx.host.click("qb-rule-0-field");
      yield* settle;
      yield* waitForText(ctx, "qb-rule-0-field-content", "Score");
      yield* ctx.host.click("qb-rule-0-field-item-score");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "complete=0");
      yield* ctx.expectEqual(
        "the live field change resets the operator",
        yield* textOf(ctx, "qb-rule-0-op"),
        ">",
      );
      yield* ctx.host.click("qb-rule-0-value");
      yield* ctx.host.key("8 0");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "matched=19");
      yield* ctx.expectContains(
        "the live numeric rule narrows to the bound",
        yield* textOf(ctx, "qb-state"),
        "matched=19",
      );

      // An enum pair, and an incomplete rule ignored under any.
      yield* ctx.host.click("qb-clear");
      yield* settle;
      yield* ctx.host.click("qb-rule-0-field");
      yield* settle;
      yield* waitForText(ctx, "qb-rule-0-field-content", "Owner");
      yield* ctx.host.click("qb-rule-0-field-item-owner");
      yield* settle;
      yield* ctx.host.click("qb-rule-0-value");
      yield* settle;
      yield* waitForText(ctx, "qb-rule-0-value-content", "Ada");
      yield* ctx.host.click("qb-rule-0-value-item-Ada");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "matched=30");
      yield* ctx.host.click("qb-rule-0-op");
      yield* settle;
      yield* waitForText(ctx, "qb-rule-0-op-content", "is not");
      yield* ctx.host.click("qb-rule-0-op-item-isNot");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "matched=90");
      yield* ctx.host.click("qb-add");
      yield* settle;
      yield* ctx.host.click("qb-match-any");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "match=any");
      yield* ctx.expectContains(
        "the live incomplete rule is ignored under any",
        yield* textOf(ctx, "qb-state"),
        "complete=1 matched=90",
      );

      // Removing both rules shows the empty builder, then a real empty state.
      yield* ctx.host.click("qb-rule-0-remove");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "rules=1");
      yield* ctx.host.click("qb-rule-0-remove");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "rules=0");
      yield* ctx.expectContains(
        "a live empty builder says so",
        yield* textOf(ctx, "qb-rules-empty"),
        "no rules",
      );
      yield* ctx.host.click("qb-add");
      yield* settle;
      yield* waitForFocus(ctx, "qb-rule-0-value");
      yield* ctx.host.key("z z z");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "matched=0");
      yield* ctx.expectContains(
        "the live empty state paints",
        yield* textOf(ctx, "qb-empty"),
        "No matching rows",
      );

      // A real wheel then a rule edit resets the anchor and the selection.
      yield* ctx.host.click("qb-clear");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "matched=120");
      yield* ctx.host.wheel("qb-viewport", 0, -840);
      yield* settle;
      yield* waitForAnchor(ctx, "qb-list", "30,0");
      yield* ctx.host.click("qb-row-31");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "selected=31");
      yield* ctx.host.click("qb-rule-0-value");
      yield* settle;
      yield* waitForText(ctx, "qb-rule-0-value-content", "paused");
      yield* ctx.host.click("qb-rule-0-value-item-paused");
      yield* settle;
      yield* waitForAnchor(ctx, "qb-list", "0,0");
      yield* waitForText(ctx, "qb-state", "selected=none");
      yield* ctx.expectNear(
        "the live reset puts the first match at the top",
        (yield* boxOf(ctx, "qb-row-1")).y,
        (yield* boxOf(ctx, "qb-viewport")).y,
        1,
      );

      // Three appends scroll the strip; the appended row is revealed.
      yield* ctx.host.click("qb-clear");
      yield* settle;
      yield* ctx.host.click("qb-add");
      yield* settle;
      yield* ctx.host.click("qb-add");
      yield* settle;
      yield* ctx.host.click("qb-add");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "rules=4");
      const scrolledStrip = yield* boxOf(ctx, "qb-rules");
      yield* waitForBounds(
        ctx,
        "qb-rule-3",
        (box) =>
          box.y + box.height <= scrolledStrip.y + scrolledStrip.height + 2,
      );
      const revealed = yield* boxOf(ctx, "qb-rule-3");
      yield* ctx.expectNear(
        // The reveal no-ops before the appended row's first paint on 0.10.0
        // (plan 529 §6.3), so the row sits below the strip.
        "the live appended row is not revealed before its first paint",
        revealed.y + revealed.height,
        scrolledStrip.y + scrolledStrip.height + 39,
        2,
      );
      const clipped = yield* boxOf(ctx, "qb-rule-0");
      // No reveal happened (above), so the first rule is still inside.
      yield* ctx.expectEqual(
        "the live first rule is still inside the strip",
        clipped.y >= scrolledStrip.y,
        true,
      );

      // A picker opened inside the strip still paints and commits. The fourth
      // row is not revealed on 0.10.0 (above), so the second row drives it.
      yield* ctx.host.click("qb-rule-1-field");
      yield* settle;
      yield* waitForText(ctx, "qb-rule-1-field-content", "Score");
      yield* ctx.host.click("qb-rule-1-field-item-score");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "rules=4");
      yield* ctx.expectEqual(
        "the live row commits its field",
        yield* textOf(ctx, "qb-rule-1-op"),
        ">",
      );

      // Escape closes and returns focus; the rules survive the reopen.
      yield* ctx.host.click("qb-rule-1-value");
      yield* settle;
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "open=false");
      yield* waitForFocus(ctx, "qb-toggle");
      yield* ctx.expectEqual(
        "the live escape returns focus to the toggle",
        yield* focusedOf(ctx),
        "qb-toggle",
      );
      yield* ctx.host.click("qb-toggle");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "open=true");
      yield* ctx.expectContains(
        "the live rules survive a close and reopen",
        yield* textOf(ctx, "qb-state"),
        "rules=4",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${queryBuilder.id}.png`);
    }),
};

const notificationCentre: LiveScenario = {
  id: "live-notification-centre",
  title:
    "Live notification centre: unread state, keyboard and prepend stability",
  capability: "notification",
  view: notificationCentreScenario.view,
  ready: "nc-state",
  steps: (ctx) =>
    Effect.gen(function* () {
      // A closed centre: a badge, a label, no panel.
      yield* ctx.expectEqual(
        "the live badge counts unread",
        yield* textOf(ctx, "nc-badge"),
        "3",
      );
      const closed = yield* ctx.host.bounds("nc-panel");
      yield* ctx.expectEqual(
        "the live panel starts closed",
        closed === null,
        true,
      );

      // A real click opens a panel anchored to the bell and focused.
      yield* ctx.host.click("nc-bell");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "open=true");
      const panel = yield* boxOf(ctx, "nc-panel");
      const bell = yield* boxOf(ctx, "nc-bell");
      yield* ctx.expectNear(
        "the live panel meets the bell's right edge",
        panel.x + panel.width,
        bell.x + bell.width,
        1,
      );
      yield* ctx.expectNear(
        "the live panel starts under the bell",
        panel.y,
        bell.y + bell.height + 8,
        1,
      );
      yield* waitForFocus(ctx, "nc-panel");
      yield* ctx.expectEqual(
        "the live panel owns focus",
        yield* focusedOf(ctx),
        "nc-panel",
      );
      const listView = yield* boxOf(ctx, "nc-listview");
      const first = yield* boxOf(ctx, "nc-row-6");
      yield* ctx.expectNear(
        "the live first row sits under the header",
        first.y,
        listView.y + 24,
        1,
      );

      // A click marks read once; Escape closes and returns focus.
      yield* ctx.host.click("nc-row-6");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "unread=2");
      yield* ctx.expectEqual(
        "the live badge follows the read",
        yield* textOf(ctx, "nc-badge"),
        "2",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "open=false");
      yield* waitForFocus(ctx, "nc-bell");
      yield* ctx.expectEqual(
        "the live Escape returns focus to the bell",
        yield* focusedOf(ctx),
        "nc-bell",
      );

      // Reopening keeps the read flags; mark-all unpaints the badge.
      yield* ctx.host.click("nc-bell");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "unread=2");
      yield* ctx.host.click("nc-mark-all");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "unread=0");
      const noBadge = yield* ctx.host.bounds("nc-badge");
      yield* ctx.expectEqual(
        "zero unread paints no live badge",
        noBadge === null,
        true,
      );

      // An arrival while closed increments the badge; opening shows it first.
      yield* ctx.host.key("escape");
      yield* settle;
      yield* ctx.host.click("nc-arrive");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "unread=1 items=7");
      yield* ctx.host.click("nc-bell");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "open=true");
      const arrived = yield* boxOf(ctx, "nc-row-7");
      yield* ctx.expectNear(
        "the live arrival is first",
        arrived.y,
        listView.y + 24,
        1,
      );

      // An arrival at the top stays at the top.
      yield* ctx.host.click("nc-simulate");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "unread=2 items=8");
      const newest = yield* boxOf(ctx, "nc-row-8");
      yield* ctx.expectNear(
        "the live newest arrival is first",
        newest.y,
        listView.y + 24,
        1,
      );

      // The prepend: a scrolled reader keeps their row.
      yield* ctx.host.scrollToItem("nc-list", 2, 0);
      yield* settle;
      yield* waitForAnchor(ctx, "nc-list", "2,0");
      const kept = yield* boxOf(ctx, "nc-row-7");
      yield* ctx.expectNear(
        "the live reader's row starts at the top",
        kept.y,
        listView.y,
        1,
      );
      yield* ctx.host.click("nc-simulate");
      yield* settle;
      yield* waitForAnchor(ctx, "nc-list", "3,0");
      const stillKept = yield* boxOf(ctx, "nc-row-7");
      yield* ctx.expectNear(
        "the live reader's row did not move",
        stillKept.y,
        kept.y,
        1,
      );
      const above = yield* ctx.host.bounds("nc-row-9");
      yield* ctx.expectEqual(
        "the row above the live reader is unpainted",
        above === null,
        true,
      );

      // Clear paints the empty state; an outside press dismisses.
      yield* ctx.host.click("nc-clear");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "items=0");
      yield* boxOf(ctx, "nc-empty");
      yield* ctx.host.click("nc-content");
      yield* settle;
      yield* waitForText(ctx, "nc-state", "open=false");
      yield* ctx.expectContains(
        "the live outside press keeps the state",
        yield* textOf(ctx, "nc-state"),
        "unread=0 items=0",
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${notificationCentre.id}.png`,
      );
    }),
};

const gridCellEditing: LiveScenario = {
  id: "live-grid-cell-editing",
  title: "Live editable grid: commit, leave-commit and a row menu",
  capability: "cell-editing",
  view: gridCellEditingScenario.view,
  ready: "ge-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the live grid starts idle",
        yield* textOf(ctx, "ge-state"),
        "editing=none draft=- commits=0 rows=60",
      );

      // 1. A cell press selects the row; a second mounts the native editor.
      yield* ctx.host.click("ge-cell-0");
      yield* settle;
      yield* ctx.host.click("ge-cell-0");
      yield* ctx.host.waitFor("ge-editor-0");
      yield* settle;
      yield* waitForFocus(ctx, "ge-editor-0");
      yield* ctx.expectEqual(
        "a live click focuses the mounted editor",
        yield* focusedOf(ctx),
        "ge-editor-0",
      );
      yield* waitForText(ctx, "ge-state", "editing=0");

      // 2. Typing is a draft and Enter commits it.
      yield* ctx.host.key("cmd-a");
      yield* ctx.host.key("b e t a");
      yield* settle;
      yield* waitForText(ctx, "ge-state", "draft=beta");
      yield* ctx.expectContains(
        "live typing is a draft",
        yield* textOf(ctx, "ge-state"),
        "commits=0",
      );
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "ge-state", "editing=none");
      yield* ctx.expectContains(
        "live Enter commits the draft",
        yield* textOf(ctx, "ge-state"),
        "editing=none draft=- commits=1",
      );
      yield* ctx.expectContains(
        "the live commit is the last action",
        yield* textOf(ctx, "ge-state"),
        "last=commit",
      );
      yield* ctx.expectEqual(
        "the committed text repaints the live row",
        yield* textOf(ctx, "ge-value-0"),
        "beta",
      );

      // 3. A second edit ends when its row leaves the window.
      yield* ctx.host.click("ge-cell-0");
      yield* settle;
      yield* ctx.host.click("ge-cell-0");
      yield* ctx.host.waitFor("ge-editor-0");
      yield* settle;
      yield* waitForFocus(ctx, "ge-editor-0");
      yield* ctx.host.key("x");
      yield* settle;
      yield* waitForText(ctx, "ge-state", "draft=betax");
      // The app-owned jump is the measured route: a programmatic
      // `scrollToItem` fires no range event live (plan `338` §9), so the
      // component mirrors its anchor and applies the leave rule itself.
      yield* ctx.host.click("ge-jump");
      yield* settle;
      yield* waitForText(ctx, "ge-state", "editing=none");
      yield* ctx.expectContains(
        "leaving the live window commits the edit",
        yield* textOf(ctx, "ge-state"),
        "editing=none draft=- commits=2",
      );
      yield* ctx.expectContains(
        "the live leave is the last action",
        yield* textOf(ctx, "ge-state"),
        "last=leave",
      );
      yield* ctx.expectEqual(
        "the left row is no longer painted live",
        Option.isNone(Option.fromNullishOr(yield* ctx.host.bounds("ge-row-0"))),
        true,
      );
      yield* ctx.host.click("ge-top");
      yield* settle;
      yield* waitForText(ctx, "ge-value-0", "betax");
      yield* ctx.expectEqual(
        "the leave-commit survived the scroll back",
        yield* textOf(ctx, "ge-value-0"),
        "betax",
      );

      // 4. The row menu opens at its action, takes focus and returns it.
      yield* ctx.host.click("ge-menu-2");
      yield* ctx.host.waitFor("ge-menu-panel");
      yield* settle;
      yield* waitForFocus(ctx, "ge-menu-panel");
      const action = yield* ctx.host.bounds("ge-menu-2");
      const panel = yield* ctx.host.bounds("ge-menu-panel");
      const place = yield* ctx.expectSome(
        "the live menu is painted under its action",
        Option.all([Option.fromNullishOr(action), Option.fromNullishOr(panel)]),
      );
      yield* ctx.expectNear(
        // The panel's content origin is 7 px inside it (plan 529 §6.3).
        "the live menu opens at its action's left edge",
        place[1].x,
        place[0].x + 7,
        1,
      );
      yield* ctx.expectNear(
        // The panel's content origin is 7 px inside it (plan 529 §6.3).
        "the live menu opens below its action",
        place[1].y,
        place[0].y + place[0].height + 7,
        1,
      );
      yield* ctx.expectEqual(
        "the live menu owns native focus",
        yield* focusedOf(ctx),
        "ge-menu-panel",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForFocus(ctx, "ge-menu-2");
      yield* ctx.expectContains(
        "live Escape closes the menu",
        yield* textOf(ctx, "ge-state"),
        "panel=none",
      );
      yield* ctx.expectContains(
        "the live menu records the Escape",
        yield* textOf(ctx, "ge-state"),
        "last=escape",
      );
      yield* ctx.expectEqual(
        "live Escape returns focus to the row action",
        yield* focusedOf(ctx),
        "ge-menu-2",
      );

      // 5. A menu action opens that row's editor.
      yield* ctx.host.click("ge-menu-2");
      yield* ctx.host.waitFor("ge-menu-panel");
      yield* settle;
      yield* ctx.host.click("ge-menu-rename");
      yield* ctx.host.waitFor("ge-editor-2");
      yield* settle;
      yield* waitForText(ctx, "ge-state", "editing=2");
      yield* ctx.expectContains(
        "live Rename starts that row's edit",
        yield* textOf(ctx, "ge-state"),
        "editing=2 draft=item-02",
      );
      yield* ctx.expectContains(
        "the live rename closes the menu",
        yield* textOf(ctx, "ge-state"),
        "panel=none",
      );
      yield* ctx.expectContains(
        "the live rename is the last action",
        yield* textOf(ctx, "ge-state"),
        "last=rename",
      );
      yield* waitForFocus(ctx, "ge-editor-2");
      yield* ctx.expectEqual(
        "live Rename focuses the editor",
        yield* focusedOf(ctx),
        "ge-editor-2",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "ge-state", "editing=none");
      yield* ctx.expectContains(
        "live Escape in the editor cancels",
        yield* textOf(ctx, "ge-state"),
        "last=cancel",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${gridCellEditing.id}.png`);
    }),
};

const wizard: LiveScenario = {
  id: "live-wizard",
  title: "Live multi-step form: focus, validation, review and submit",
  capability: "wizard",
  view: wizardScenario.view,
  ready: "wizard-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the live wizard starts on the account step",
        yield* textOf(ctx, "wizard-readout"),
        "step=1 mode=unmount",
      );

      // 1. A rejected Next paints the messages and focuses the first field.
      yield* ctx.host.click("wizard-next");
      yield* settle;
      yield* waitForText(ctx, "wizard-readout", "errors=name,email");
      yield* waitForFocus(ctx, "wizard-name");
      yield* ctx.expectEqual(
        "a rejected live step focuses its first field",
        yield* focusedOf(ctx),
        "wizard-name",
      );

      // 2. Type a valid account; the subtree swap focuses the next step.
      yield* ctx.host.click("wizard-name");
      yield* ctx.host.key("a d a");
      yield* settle;
      yield* waitForText(ctx, "wizard-readout", "errors=email");
      yield* ctx.host.click("wizard-email");
      yield* ctx.host.key("a d a @ x");
      yield* settle;
      yield* waitForText(ctx, "wizard-readout", "errors=0");
      yield* ctx.host.click("wizard-next");
      yield* ctx.host.waitFor("wizard-slug");
      yield* settle;
      yield* waitForText(ctx, "wizard-readout", "step=2");
      yield* waitForFocus(ctx, "wizard-slug");
      yield* ctx.expectEqual(
        "a valid live Next focuses the next step",
        yield* focusedOf(ctx),
        "wizard-slug",
      );

      // 3. Enter validates the step and focuses the first failure.
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "wizard-readout", "errors=slug");
      yield* ctx.host.key("m y - w");
      yield* settle;
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "wizard-readout", "errors=team");
      yield* waitForFocus(ctx, "wizard-team");
      yield* ctx.host.key("c o r e");
      yield* settle;
      yield* ctx.host.click("wizard-next");
      yield* ctx.host.waitFor("wizard-review");
      yield* settle;
      yield* waitForText(ctx, "wizard-readout", "step=3");

      // 4. Review and submit.
      yield* ctx.expectContains(
        "the live review paints the draft",
        yield* textOf(ctx, "wizard-review"),
        "ada <ada@x> my-w / core",
      );
      yield* ctx.host.click("wizard-submit");
      yield* settle;
      yield* waitForText(ctx, "wizard-done", "Created ada");
      yield* ctx.expectContains(
        "the live submit reports once",
        yield* textOf(ctx, "wizard-readout"),
        "submits=1",
      );

      // 5. Back restores the workspace draft.
      yield* ctx.host.click("wizard-back");
      yield* ctx.host.waitFor("wizard-slug");
      yield* settle;
      yield* ctx.expectContains(
        "the live slug survives a Back",
        yield* textOf(ctx, "wizard-readout"),
        "slug=my-w",
      );
      yield* waitForFocus(ctx, "wizard-slug");
      yield* ctx.expectEqual(
        "the live Back focuses the step",
        yield* focusedOf(ctx),
        "wizard-slug",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${wizard.id}.png`);
    }),
};

/** A real-window reorder: the drop, the click trap and the keyboard path. */
const reorder: LiveScenario = {
  id: "live-reorder",
  title: "Live reorder: a paced drop, keyboard move and cancel",
  capability: "reorder",
  view: listReorderScenario.view,
  ready: "reorder-list",
  steps: (ctx) =>
    Effect.gen(function* () {
      const state = (key: string) =>
        Effect.gen(function* () {
          const text = yield* textOf(ctx, "reorder-state");
          return Option.getOrElse(fieldOf(text, key), () => "none");
        });

      yield* waitForText(ctx, "reorder-order", "alpha,bravo,charlie");

      // 1. A paced pointer drop: row 0 to boundary 3 means index 2.
      yield* ctx.host.drag("reorder-handle-alpha", 0, 80, 6);
      yield* settle;
      yield* waitForText(ctx, "reorder-order", "bravo,charlie,alpha,delta");
      yield* ctx.expectEqual(
        "the live drop applies the boundary rule",
        yield* textOf(ctx, "reorder-order"),
        "bravo,charlie,alpha,delta,echo,foxtrot,golf,hotel",
      );
      const bravo = yield* boxOf(ctx, "reorder-row-bravo");
      const alpha = yield* boxOf(ctx, "reorder-row-alpha");
      yield* ctx.expectNear(
        "the live moved row paints two rows below bravo",
        alpha.y,
        bravo.y + 64,
        2,
      );
      yield* ctx.expectEqual(
        "the live drop is not an activation",
        yield* state("activations"),
        "0",
      );

      // 2. A click focuses the handle and activates, but does not reorder.
      yield* ctx.host.click("reorder-handle-bravo");
      yield* settle;
      yield* waitForText(ctx, "reorder-order", "bravo,charlie,alpha,delta");
      yield* ctx.expectEqual(
        "a live click on a handle activates without reordering",
        yield* state("activations"),
        "1",
      );
      yield* ctx.expectEqual(
        "a live click focuses its handle",
        yield* focusedOf(ctx),
        "reorder-handle-bravo",
      );

      // 3. Keyboard: lift alpha at index 2, one step up, drop at index 1.
      yield* ctx.host.click("reorder-handle-alpha");
      yield* settle;
      yield* waitForFocus(ctx, "reorder-handle-alpha");
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "reorder-state", "mode=keyboard");
      yield* ctx.host.key("up");
      yield* settle;
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "reorder-order", "bravo,alpha,charlie");
      yield* ctx.expectEqual(
        "the live keyboard drop applies the boundary rule",
        yield* textOf(ctx, "reorder-order"),
        "bravo,alpha,charlie,delta,echo,foxtrot,golf,hotel",
      );
      const keyed = yield* boxOf(ctx, "reorder-row-alpha");
      const first = yield* boxOf(ctx, "reorder-row-bravo");
      yield* ctx.expectNear(
        "the live keyboard-moved row paints one row below bravo",
        keyed.y,
        first.y + 32,
        2,
      );
      yield* waitForFocus(ctx, "reorder-handle-alpha");
      yield* ctx.expectEqual(
        "the live keyboard drop keeps native focus",
        yield* focusedOf(ctx),
        "reorder-handle-alpha",
      );

      // 4. Keyboard cancel leaves the order and no indicator.
      yield* ctx.host.key("enter");
      yield* settle;
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "reorder-order", "bravo,alpha,charlie");
      yield* ctx.expectEqual(
        "a live cancel leaves the order unchanged",
        yield* textOf(ctx, "reorder-order"),
        "bravo,alpha,charlie,delta,echo,foxtrot,golf,hotel",
      );
      const indicator = yield* ctx.host.bounds("reorder-indicator");
      yield* ctx.expectEqual(
        "a live cancel removes the indicator",
        indicator === null,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${reorder.id}.png`);
    }),
};

/** A real-window hierarchical reorder: into, cycles and keyboard nesting. */
const treeReorder: LiveScenario = {
  id: "live-tree-reorder",
  title: "Live hierarchical reorder: into a folder, a cycle and the keyboard",
  capability: "tree-reorder",
  view: treeReorderScenario.view,
  ready: "tree-state",
  steps: (ctx) =>
    Effect.gen(function* () {
      const state = (key: string) =>
        Effect.gen(function* () {
          const text = yield* textOf(ctx, "tree-state");
          return Option.getOrElse(fieldOf(text, key), () => "none");
        });

      yield* waitForText(ctx, "tree-state", "visible=4");
      yield* ctx.expectContains(
        "the live tree starts collapsed",
        yield* textOf(ctx, "tree-order"),
        "dir-0,dir-1,dir-2,dir-3",
      );

      // 1. Open a folder.
      yield* ctx.host.click("tree-toggle-dir-1");
      yield* settle;
      yield* waitForText(ctx, "tree-order", "dir-1/sub");
      yield* ctx.expectEqual(
        "the live folder opens",
        yield* state("visible"),
        "7",
      );

      // 2. A paced drag into a collapsed folder opens it and nests the row.
      const handle = yield* boxOf(ctx, "tree-handle-dir-3");
      const root = yield* boxOf(ctx, "tree-node-dir-0");
      yield* ctx.host.drag(
        "tree-handle-dir-3",
        root.x + 20 - (handle.x + handle.width / 2),
        root.y + 16 - (handle.y + handle.height / 2),
        6,
      );
      yield* settle;
      yield* waitForText(ctx, "tree-last", "parent=dir-0");
      yield* ctx.expectEqual(
        "the live into drop reports depth and parent",
        yield* textOf(ctx, "tree-last"),
        "id=dir-3 at=1 depth=1 parent=dir-0",
      );
      const moved = yield* boxOf(ctx, "tree-node-dir-3");
      const movedLabel = yield* boxOf(ctx, "tree-label-dir-3");
      const rootLabel = yield* boxOf(ctx, "tree-label-dir-0");
      yield* ctx.expectNear(
        "the live moved row paints one row below its parent",
        moved.y,
        root.y + 32,
        2,
      );
      yield* ctx.expectNear(
        "the live moved row indents one step",
        movedLabel.x,
        rootLabel.x + 16,
        1,
      );

      // 3. A drag into the source's own descendant is refused. The drag dwells
      // long enough over the target that the hover expansion opens it too, so
      // the invariant asserted is the moved row, not the visible row list.
      const before = yield* textOf(ctx, "tree-last");
      const descendant = yield* boxOf(ctx, "tree-node-dir-3");
      const sourceHandle = yield* boxOf(ctx, "tree-handle-dir-0");
      yield* ctx.host.drag(
        "tree-handle-dir-0",
        descendant.x + 36 - (sourceHandle.x + sourceHandle.width / 2),
        descendant.y + 16 - (sourceHandle.y + sourceHandle.height / 2),
        6,
      );
      yield* settle;
      yield* ctx.expectEqual(
        "the live cycle is refused",
        yield* state("refused"),
        "descendant",
      );
      yield* ctx.expectEqual(
        "the live refused drop changes no order",
        yield* textOf(ctx, "tree-last"),
        before,
      );

      // 4. Keyboard: lift, choose the gap, indent, drop.
      yield* ctx.host.click("tree-reset");
      yield* settle;
      yield* waitForText(ctx, "tree-state", "visible=4");
      yield* ctx.host.click("tree-toggle-dir-1");
      yield* settle;
      yield* waitForText(ctx, "tree-order", "dir-1/sub");
      yield* ctx.host.click("tree-handle-dir-2");
      yield* settle;
      yield* waitForFocus(ctx, "tree-handle-dir-2");
      yield* ctx.host.key("enter");
      yield* settle;
      yield* ctx.host.key("up");
      yield* settle;
      yield* ctx.host.key("right");
      yield* settle;
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tree-last", "parent=dir-1/sub");
      yield* ctx.expectEqual(
        "the live keyboard nests the row",
        yield* textOf(ctx, "tree-last"),
        "id=dir-2 at=5 depth=2 parent=dir-1/sub",
      );
      yield* waitForFocus(ctx, "tree-handle-dir-2");
      yield* ctx.expectEqual(
        "the live keyboard drop keeps native focus",
        yield* focusedOf(ctx),
        "tree-handle-dir-2",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${treeReorder.id}.png`);
    }),
};

/**
 * The virtualized tree in a real window (plan `559`).
 *
 * `virtualized-tree` proves the geometry headless: a flattened 8 × 40 tree
 * indents by depth, toggles 8 ↔ 48 rows and moves a roving index. This twin
 * proves the path a file tree actually takes in a window: a real click toggles
 * a directory and focuses it, a real wheel re-windows the changing row count
 * and moves the list anchor, and clicks plus arrows move **native** focus row
 * by row — including a keyboard expand and collapse.
 *
 * The painted window is read from `paintedText`, the anchor from
 * `listScrollTop` (plan `197`) and the wheel from `vtree-viewport`, because a
 * `<virtual-list>` has no painted bounds live (plans `350`, `532`, `534`).
 */
const liveTree: LiveScenario = {
  id: "live-tree",
  title: "Live virtualized tree: expansion, a real wheel and roving focus",
  capability: "tree",
  view: virtualizedTreeScenario.view,
  ready: "vtree-node-dir-0",
  steps: (ctx) =>
    Effect.gen(function* () {
      const readout = () => textOf(ctx, "vtree-readout");
      const painted = (label: string) =>
        Effect.map(ctx.host.paintedText(), (lines) =>
          Arr.some(lines, (line) => Str.includes(label)(line)),
        );
      const anchorIndex = () =>
        Effect.gen(function* () {
          const anchor = yield* ctx.expectSome(
            "the live tree reports an anchor",
            Option.fromNullishOr(yield* ctx.host.listScrollTop("vtree-list")),
          );
          return anchor[0];
        });

      // 1. The tree starts collapsed.
      yield* ctx.expectContains(
        "the live tree starts collapsed",
        yield* readout(),
        "selected=dir-0 visible=8 open=0",
      );

      // 2. A real click expands the first directory.
      yield* ctx.host.click("vtree-node-dir-0");
      yield* settle;
      yield* waitForText(ctx, "vtree-readout", "visible=48");
      yield* ctx.expectContains(
        "a real click expands a directory",
        yield* readout(),
        "visible=48 open=1",
      );
      yield* ctx.expectContains(
        "the expanded directory stays selected",
        yield* readout(),
        "selected=dir-0",
      );

      const directory = yield* boxOf(ctx, "vtree-label-dir-0");
      const child = yield* boxOf(ctx, "vtree-label-dir-0/file-0");
      yield* ctx.expectNear(
        "a live virtual row still indents its child",
        child.x - directory.x,
        16,
        1,
      );

      const labels = Arr.filter(yield* ctx.host.paintedText(), (line) =>
        Str.startsWith("dir-")(line),
      );
      yield* ctx.expectEqual(
        "the live painted window is smaller than the flattened tree",
        Arr.length(labels) < 48,
        true,
      );
      yield* ctx.expectEqual(
        "the last live child is below the window",
        yield* painted("dir-0/file-39"),
        false,
      );

      // 3. A second click collapses it again.
      yield* ctx.host.click("vtree-node-dir-0");
      yield* settle;
      yield* waitForText(ctx, "vtree-readout", "visible=8");
      yield* ctx.expectContains(
        "a second real click collapses the directory",
        yield* readout(),
        "visible=8 open=0",
      );
      yield* ctx.expectEqual(
        "the collapsed live child is no longer painted",
        yield* painted("dir-0/file-0"),
        false,
      );

      // 4. Another directory expands, and a real wheel re-windows the tree.
      yield* ctx.host.click("vtree-node-dir-3");
      yield* settle;
      yield* waitForText(ctx, "vtree-readout", "visible=48");
      yield* ctx.expectContains(
        "a second directory expands",
        yield* readout(),
        "selected=dir-3 visible=48 open=1",
      );

      yield* ctx.host.wheel("vtree-viewport", 0, -800);
      yield* settle;
      const scrolled = yield* anchorIndex();
      yield* ctx.expectEqual(
        "a real wheel moves the live list",
        scrolled > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the wheel unpaints the rows above the window",
        yield* painted("dir-0"),
        false,
      );

      // 5. An exact jump anchors the list and paints the row.
      yield* ctx.host.scrollToItem("vtree-list", 25);
      yield* settle;
      const jumped = yield* ctx.expectSome(
        "the jumped live tree reports an anchor",
        Option.fromNullishOr(yield* ctx.host.listScrollTop("vtree-list")),
      );
      yield* ctx.expectEqual("the live jump anchors row 25", jumped[0], 25);
      yield* ctx.expectEqual("the live jump lands at offset 0", jumped[1], 0);
      yield* ctx.expectEqual(
        "the live jump reports the flex-resolved viewport",
        jumped[2],
        260,
      );
      yield* ctx.expectEqual(
        "the jumped live row is painted",
        yield* painted("dir-3/file-24"),
        true,
      );

      // 6. A click focuses a row and the arrows rove natively.
      yield* ctx.host.click("vtree-node-dir-3/file-24");
      yield* settle;
      yield* waitForFocus(ctx, "vtree-node-dir-3/file-24");
      yield* ctx.expectEqual(
        "a real click on a child focuses it",
        yield* focusedOf(ctx),
        "vtree-node-dir-3/file-24",
      );
      yield* ctx.expectContains(
        "the clicked child is the selection",
        yield* readout(),
        "selected=dir-3/file-24",
      );

      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.expectEqual(
        "Down moves native focus to the next child",
        yield* focusedOf(ctx),
        "vtree-node-dir-3/file-25",
      );
      yield* ctx.expectContains(
        "Down moves the selection with it",
        yield* readout(),
        "selected=dir-3/file-25",
      );

      yield* ctx.host.key("up");
      yield* settle;
      yield* ctx.expectEqual(
        "Up moves native focus back",
        yield* focusedOf(ctx),
        "vtree-node-dir-3/file-24",
      );

      // 7. Keyboard expand, walk and collapse at the top of the tree.
      yield* ctx.host.scrollToItem("vtree-list", 0);
      yield* settle;
      yield* ctx.expectEqual(
        "a jump back to the head anchors at row 0",
        yield* anchorIndex(),
        0,
      );
      yield* ctx.host.click("vtree-node-dir-3");
      yield* settle;
      yield* waitForText(ctx, "vtree-readout", "visible=8");
      yield* ctx.expectContains(
        "a real click collapses the open directory",
        yield* readout(),
        "visible=8 open=0",
      );

      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForText(ctx, "vtree-readout", "visible=48");
      yield* ctx.expectContains(
        "Right expands a collapsed directory",
        yield* readout(),
        "visible=48 open=1",
      );

      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForFocus(ctx, "vtree-node-dir-3/file-0");
      yield* ctx.expectEqual(
        "Right then focuses the first child",
        yield* focusedOf(ctx),
        "vtree-node-dir-3/file-0",
      );
      yield* ctx.expectContains(
        "the first child is the selection",
        yield* readout(),
        "selected=dir-3/file-0",
      );

      yield* ctx.host.key("left");
      yield* settle;
      yield* ctx.expectEqual(
        "Left on a child moves to its parent",
        yield* focusedOf(ctx),
        "vtree-node-dir-3",
      );

      yield* ctx.host.key("left");
      yield* settle;
      yield* waitForText(ctx, "vtree-readout", "visible=8");
      yield* ctx.expectContains(
        "Left on an open directory collapses it",
        yield* readout(),
        "visible=8 open=0",
      );
      yield* ctx.expectEqual(
        "the keyboard-collapsed children are unpainted",
        yield* painted("dir-3/file-0"),
        false,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveTree.id}.png`);
    }),
};

/**
 * The roving-focus contract in a real window (plan `637`).
 *
 * Plan `158` measured it offscreen and `COMPONENTS.md` cites it as the keyboard
 * model every menu, tab strip, tree and grid builds on. The window suite only
 * reached roving focus as a side effect of other probes, so two claims had no
 * live evidence: a component's own `renderer.focusElement` focuses a row that
 * was never clicked, and a focused virtual row survives the painted window
 * scrolling past it. This twin repeats the same view in the 1100 × 720 window.
 *
 * The wheel targets `vlist-focus-viewport`, a plain wrapper: a `<virtual-list>`
 * has no painted bounds live (plans `350`, `532`, `534`). The hover + settle
 * before each wheel is the plan-`606` rule — a wheel sent in the same protocol
 * step as its pointer move can land at the old pointer position.
 */
const liveRovingFocus: LiveScenario = {
  id: "live-roving-focus",
  title: "Live roving focus: programmatic focus and a scrolled-out row",
  capability: "focus",
  view: rovingFocusScenario.view,
  ready: "roving-row-0",
  steps: (ctx) =>
    Effect.gen(function* () {
      const readout = () => textOf(ctx, "roving-readout");
      const painted = (label: string) =>
        Effect.map(ctx.host.paintedText(), (lines) =>
          Arr.some(lines, (line) => Str.includes(label)(line)),
        );

      // 1. A real click focuses a row; Down moves focus and the roving index.
      yield* ctx.host.click("roving-row-2");
      yield* settle;
      yield* waitForFocus(ctx, "roving-row-2");
      yield* ctx.expectEqual(
        "a real click focuses the row",
        yield* focusedOf(ctx),
        "roving-row-2",
      );
      yield* ctx.expectContains(
        "the click selects the row",
        yield* readout(),
        "active=2",
      );

      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.expectEqual(
        "Down moves native focus to the next row",
        yield* focusedOf(ctx),
        "roving-row-3",
      );
      yield* ctx.expectContains(
        "Down moves the roving index with it",
        yield* readout(),
        "active=3",
      );

      yield* ctx.host.key("enter");
      yield* settle;
      yield* ctx.expectContains(
        "Enter activates the focused row",
        yield* readout(),
        "activated=3",
      );

      // 2. Component-owned focus reaches a row that was never clicked.
      yield* ctx.host.click("roving-focus-5");
      yield* settle;
      yield* waitForFocus(ctx, "roving-row-5");
      yield* ctx.expectEqual(
        "a component focus call reaches a never-clicked row",
        yield* focusedOf(ctx),
        "roving-row-5",
      );
      yield* ctx.expectContains(
        "the focus call sets the roving index",
        yield* readout(),
        "active=5",
      );

      yield* ctx.host.key("up");
      yield* settle;
      yield* ctx.expectEqual(
        "the focus call target receives the next key",
        yield* focusedOf(ctx),
        "roving-row-4",
      );

      // 3. The same path inside a `<virtual-list>`.
      yield* ctx.host.click("vrow-2");
      yield* settle;
      yield* waitForFocus(ctx, "vrow-2");
      yield* ctx.expectEqual(
        "a real click focuses the virtual row",
        yield* focusedOf(ctx),
        "vrow-2",
      );

      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.expectEqual(
        "Down moves focus inside the virtual list",
        yield* focusedOf(ctx),
        "vrow-3",
      );
      yield* ctx.expectContains(
        "the virtual index moves with focus",
        yield* readout(),
        "vactive=3",
      );

      // 4. A real wheel moves the window past the focused row.
      //
      // Focusing a virtual row already reveals it (plan `166`), so the list is
      // anchored at `vrow-3` here. The lever is the anchor moving and a row that
      // *was* painted leaving the window — not row 0, which is already gone.
      const anchorIndex = () =>
        Effect.gen(function* () {
          const anchor = yield* ctx.expectSome(
            "the virtual list reports an anchor",
            Option.fromNullishOr(yield* ctx.host.listScrollTop("vlist-focus")),
          );
          return anchor[0];
        });
      const before = yield* anchorIndex();
      yield* ctx.expectEqual(
        "focusing the virtual row revealed it",
        before > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the row after the focus is painted",
        yield* painted("virtual row 4"),
        true,
      );

      yield* ctx.host.hover("vlist-focus-viewport");
      yield* settle;
      yield* ctx.host.wheel("vlist-focus-viewport", 0, -1200);
      yield* settle;
      yield* ctx.expectEqual(
        "the wheel moves the virtual window",
        (yield* anchorIndex()) > before,
        true,
      );
      yield* ctx.expectEqual(
        "the wheel unpaints a row that was painted",
        yield* painted("virtual row 4"),
        false,
      );
      yield* ctx.expectEqual(
        "focus stays on the scrolled-out row",
        yield* focusedOf(ctx),
        "vrow-3",
      );
      yield* ctx.expectEqual(
        "the scrolled-out focused row stays painted",
        yield* painted("virtual row 3"),
        true,
      );

      // 5. The next key still reaches the row and moves on.
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.expectEqual(
        "focus keeps moving after the window moved",
        yield* focusedOf(ctx),
        "vrow-4",
      );
      yield* ctx.expectContains(
        "the virtual index keeps moving",
        yield* readout(),
        "vactive=4",
      );

      // 6. Scrolling back restores the path.
      yield* ctx.host.hover("vlist-focus-viewport");
      yield* settle;
      yield* ctx.host.wheel("vlist-focus-viewport", 0, 1200);
      yield* settle;
      yield* ctx.host.click("vrow-2");
      yield* settle;
      yield* ctx.host.key("down");
      yield* settle;
      yield* ctx.expectEqual(
        "focus can be restored and moved after scrolling back",
        yield* focusedOf(ctx),
        "vrow-3",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveRovingFocus.id}.png`);
    }),
};

/**
 * The tab strip's horizontal contract in a real window (plan `565`).
 *
 * Plan `173` measured it offscreen. A real window reports a scroller's own box
 * in the scrolled frame and the live tree has no style, so the transfer is not
 * free: the offset is the authority for the pan, and each reveal compares boxes
 * read in the same frame.
 */
const tabOverflow: LiveScenario = {
  id: "live-tab-overflow",
  title: "Live tab strip: a horizontal pan, a clipped tab and the reveal",
  capability: "scroll",
  view: tabOverflowScenario.view,
  ready: "tab-strip",
  steps: (ctx) =>
    Effect.gen(function* () {
      const atRest = yield* offsetOf(ctx, "tab-strip");
      yield* ctx.expectEqual("the live strip starts at the left", atRest.x, 0);
      yield* ctx.expectEqual("the live strip starts at the top", atRest.y, 0);

      const strip = yield* boxOf(ctx, "tab-strip");
      const first = yield* boxOf(ctx, "tab-0");
      yield* ctx.expectEqual(
        "the first tab paints inside the strip",
        first.x >= strip.x - 1 && first.x <= strip.x + strip.width + 1,
        true,
      );

      const lastAtRest = Option.fromNullishOr(yield* ctx.host.bounds("tab-9"));
      const lastPosition = Option.match(lastAtRest, {
        onNone: () => "absent from the live tree",
        onSome: (bounds) => `painted at x=${Math.round(bounds.x)}`,
      });
      yield* ctx.expectEqual(
        `the last tab is outside the strip at rest (${lastPosition})`,
        Option.match(lastAtRest, {
          onNone: () => true,
          onSome: (bounds) =>
            bounds.x >= strip.x + strip.width - 1 ||
            bounds.x + bounds.width <= strip.x + 1,
        }),
        true,
      );

      yield* ctx.host.wheel("tab-strip", -240, 0);
      yield* settle;
      const panned = yield* offsetOf(ctx, "tab-strip");
      yield* ctx.expectNear(
        `a real deltaX wheel pans the strip (x=${panned.x})`,
        panned.x,
        -240,
        12,
      );
      yield* ctx.expectEqual(
        "the horizontal wheel leaves y alone",
        panned.y,
        0,
      );
      yield* ctx.expectContains(
        "onScroll reports the wheel axes",
        yield* textOf(ctx, "tab-wheel"),
        "dx=-240",
      );

      yield* ctx.host.wheel("tab-strip", 0, -240);
      yield* settle;
      const vertical = yield* offsetOf(ctx, "tab-strip");
      yield* ctx.expectEqual(
        "a vertical wheel leaves the strip alone",
        vertical.x,
        panned.x,
      );
      yield* ctx.expectEqual(
        "a vertical wheel leaves y at zero",
        vertical.y,
        0,
      );

      const reveal = () =>
        Effect.gen(function* () {
          yield* ctx.host.click("tab-reveal-last");
          yield* settle;
          const offset = yield* offsetOf(ctx, "tab-strip");
          const box = yield* boxOf(ctx, "tab-9");
          return { offset, box };
        });

      const revealed = yield* reveal();
      yield* ctx.expectEqual(
        `the reveal pans further left (x=${revealed.offset.x})`,
        revealed.offset.x < panned.x,
        true,
      );
      // The scroller's own reported box moves with its scroll (plan 556), so the
      // viewport is the box read at rest. The reveal leaves the last tab at the
      // trailing edge (4 px past it here, the strip's padding), as offscreen
      // (plan 173) left it 1 px past.
      yield* ctx.expectEqual(
        `the reveal puts the last tab at the trailing edge (x=${Math.round(revealed.box.x)} edge=${Math.round(strip.x + strip.width)})`,
        revealed.box.x >= strip.x + strip.width - 1 &&
          revealed.box.x < strip.x + strip.width + 72,
        true,
      );

      yield* ctx.host.click("tab-8");
      yield* settle;
      yield* ctx.expectContains(
        "a revealed tab is clickable",
        yield* awaitedTextOf(ctx, "tab-active", "active=8"),
        "active=8",
      );
      yield* waitForFocus(ctx, "tab-8");
      yield* ctx.expectEqual(
        "the click focused the revealed tab",
        yield* focusedOf(ctx),
        "tab-8",
      );

      yield* ctx.host.click("tab-pan-end");
      yield* settle;
      const exactPan = yield* offsetOf(ctx, "tab-strip");
      yield* ctx.expectNear(
        `component code pans to an exact offset (x=${exactPan.x})`,
        exactPan.x,
        -400,
        2,
      );

      yield* ctx.host.click("tab-6");
      yield* settle;
      yield* waitForFocus(ctx, "tab-6");
      yield* ctx.host.key("home");
      yield* settle;
      yield* ctx.expectContains(
        "Home selects the first tab",
        yield* awaitedTextOf(ctx, "tab-active", "active=0"),
        "active=0",
      );
      yield* waitForFocus(ctx, "tab-0");
      yield* ctx.expectEqual(
        "Home focuses the first tab",
        yield* focusedOf(ctx),
        "tab-0",
      );
      const homeOffset = yield* offsetOf(ctx, "tab-strip");
      yield* ctx.expectEqual(
        `Home returns to the start region (x=${homeOffset.x})`,
        homeOffset.x > -72,
        true,
      );

      yield* ctx.host.key("end");
      yield* settle;
      yield* ctx.expectContains(
        "End selects the last tab",
        yield* awaitedTextOf(ctx, "tab-active", "active=9"),
        "active=9",
      );
      yield* waitForFocus(ctx, "tab-9");
      const endOffset = yield* offsetOf(ctx, "tab-strip");
      yield* ctx.expectEqual(
        `End reveals the last tab (x=${endOffset.x})`,
        endOffset.x < -72,
        true,
      );
      const endBox = yield* boxOf(ctx, "tab-9");
      yield* ctx.expectEqual(
        "the keyboard-revealed last tab sits at the trailing edge",
        endBox.x >= strip.x + strip.width - 1 &&
          endBox.x < strip.x + strip.width + 72,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tabOverflow.id}.png`);
    }),
};

/**
 * The tab strip's focus model in a real window (plan `565`).
 *
 * Plan `174` measured the naive and roving strips offscreen. A real window
 * traverses on `Tab` (plan `190`), so the walk is the reader's own, and the
 * question is whether focus reveals a clipped tab there.
 */
const tabFocus: LiveScenario = {
  id: "live-tab-focus",
  title: "Live tab strip focus: clipped stops, one roving stop and reveal",
  capability: "focus",
  view: tabFocusScenario.view,
  ready: "naive-0",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.host.click("naive-0");
      yield* settle;
      yield* waitForFocus(ctx, "naive-0");
      yield* ctx.expectEqual(
        "the naive strip takes focus on its first tab",
        yield* focusedOf(ctx),
        "naive-0",
      );
      const start = yield* offsetOf(ctx, "naive-strip");
      yield* ctx.expectEqual("the naive strip starts at the left", start.x, 0);

      // The automation key verb reaches the focused element; it does not itself
      // traverse (measured in plan `565`; the modal in plan `190` passes only
      // because its own handler calls `focusNextWithin`). The renderer's
      // traversal is the tab-order contract, so it drives this walk.
      yield* ctx.host.key("tab");
      yield* settle;
      yield* ctx.expectEqual(
        "a synthetic tab reaches the tab but does not traverse",
        yield* focusedOf(ctx),
        "naive-0",
      );

      const walked = yield* walkRendererFocus(ctx, 9);
      const ids = Arr.getSomes(Arr.map(walked, Option.fromNullishOr));
      yield* ctx.expectEqual(
        `the renderer traversal visited ${Arr.length(Arr.dedupe(ids))} tabs [${Arr.join(ids, ",")}]`,
        Arr.length(Arr.dedupe(ids)),
        9,
      );
      yield* ctx.expectEqual(
        "the traversal reached the last clipped tab",
        yield* focusedOf(ctx),
        "naive-9",
      );

      const afterWalk = yield* offsetOf(ctx, "naive-strip");
      yield* ctx.expectEqual(
        `focus does not reveal a clipped tab (x=${afterWalk.x})`,
        afterWalk.x,
        start.x,
      );

      const past = yield* walkRendererFocus(ctx, 1);
      yield* ctx.expectEqual(
        "the naive traversal continues past the strip",
        Arr.getSomes(Arr.map(past, Option.fromNullishOr))[0] ?? "none",
        "naive-after",
      );

      yield* ctx.host.click("roving-0");
      yield* settle;
      yield* waitForFocus(ctx, "roving-0");
      const oneStop = yield* walkRendererFocus(ctx, 1);
      yield* ctx.expectEqual(
        "one traversal step leaves the roving strip",
        Arr.getSomes(Arr.map(oneStop, Option.fromNullishOr))[0] ?? "none",
        "roving-after",
      );

      yield* ctx.host.click("roving-3");
      yield* settle;
      yield* waitForFocus(ctx, "roving-3");
      yield* ctx.host.key("end");
      yield* settle;
      yield* ctx.expectContains(
        "End selects the last roving tab",
        yield* awaitedTextOf(ctx, "roving-active", "active=9"),
        "active=9",
      );
      yield* waitForFocus(ctx, "roving-9");
      yield* ctx.expectEqual(
        "End focuses the last roving tab",
        yield* focusedOf(ctx),
        "roving-9",
      );
      const endOffset = yield* offsetOf(ctx, "roving-strip");
      yield* ctx.expectEqual(
        `End reveals the last tab (x=${endOffset.x})`,
        endOffset.x < -72,
        true,
      );

      yield* ctx.host.key("home");
      yield* settle;
      yield* waitForFocus(ctx, "roving-0");
      yield* ctx.expectEqual(
        "Home focuses the first roving tab",
        yield* focusedOf(ctx),
        "roving-0",
      );
      const homeOffset = yield* offsetOf(ctx, "roving-strip");
      yield* ctx.expectEqual(
        `Home returns to the start region (x=${homeOffset.x})`,
        homeOffset.x > -72,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${tabFocus.id}.png`);
    }),
};

/**
 * The waveform seek in a real window (plan `520`).
 *
 * The headless probe measures what only a renderer report can: the a11y value,
 * the retained-node cost and both paint-order routes. This twin proves the
 * pointer path transfers — a real click at a stage coordinate seeks, a paced
 * drag scrubs, and the plane takes native focus for the keys.
 */
const media: LiveScenario = {
  id: "live-media",
  title: "Live media surface: a click seeks, a drag scrubs and keys step",
  capability: "media",
  view: mediaScenario.view,
  ready: "media-frame",
  steps: (ctx) =>
    Effect.gen(function* () {
      const stage = yield* boxOf(ctx, "media-wave");
      yield* ctx.expectNear(
        "the live waveform is 480 wide",
        stage.width,
        480,
        1,
      );
      yield* ctx.expectNear(
        "the live waveform is 96 tall",
        stage.height,
        96,
        1,
      );

      // 1. A real click at 120 px into the stage seeks to 30 s.
      yield* ctx.host.clickWindow(stage.x + 120, stage.y + 48);
      yield* settle;
      yield* waitForText(ctx, "media-readout", "pos=30");
      yield* ctx.expectEqual(
        "the live click seeks to 30 s",
        yield* textOf(ctx, "media-readout"),
        "pos=30 duration=120 plane=over route=bars",
      );
      const playhead = yield* boxOf(ctx, "media-playhead");
      yield* ctx.expectNear(
        "the live playhead sits at the click x",
        playhead.x - stage.x,
        120,
        1,
      );

      // 2. A paced drag from the centre (60 s) by 60 px reaches 75 s.
      yield* ctx.host.drag("media-seek", 60, 0);
      yield* settle;
      yield* waitForText(ctx, "media-readout", "pos=75");
      yield* ctx.expectEqual(
        "the live drag scrubs to 75 s",
        yield* textOf(ctx, "media-readout"),
        "pos=75 duration=120 plane=over route=bars",
      );

      // 3. The plane owns native focus, so the keys step the same scale.
      yield* ctx.host.click("media-seek");
      yield* settle;
      yield* ctx.expectEqual(
        "the live click focuses the seek plane",
        yield* focusedOf(ctx),
        "media-seek",
      );
      yield* ctx.host.key("right");
      yield* settle;
      yield* waitForText(ctx, "media-readout", "pos=61");
      yield* ctx.host.key("home");
      yield* settle;
      yield* waitForText(ctx, "media-readout", "pos=0");

      // 4. The transport buttons and the image route work live too.
      yield* ctx.host.click("media-forward");
      yield* settle;
      yield* waitForText(ctx, "media-readout", "pos=5");
      yield* ctx.host.click("media-route");
      yield* ctx.host.waitFor("media-envelope-image");
      yield* settle;
      const image = yield* boxOf(ctx, "media-envelope-image");
      yield* ctx.expectNear(
        "the live envelope image is 480 wide",
        image.width,
        480,
        1,
      );
      yield* ctx.host.clickWindow(stage.x + 120, stage.y + 48);
      yield* settle;
      yield* waitForText(ctx, "media-readout", "pos=30");
      yield* ctx.expectEqual(
        "the live image route still seeks",
        yield* textOf(ctx, "media-readout"),
        "pos=30 duration=120 plane=over route=image",
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${media.id}.png`);
    }),
};

/**
 * The palette switch in a real window (plans `643`, `676`).
 *
 * `theme` was the last core capability with no live id. The live tree has no
 * style report (plan `197`), so plan `643` asserted the interaction and the
 * retained layout; plan `676` adds the missing half by decoding the frame at
 * every stop. Each palette is captured once — the PNG is both the run artifact
 * and the evidence — and the centres of `swatch-background` and
 * `swatch-primary` must equal that palette's `background`/`primary` tokens at
 * the frame's own device scale. The readout and box checks stay, so a switch
 * that repaints without moving the interaction (or the reverse) cannot pass.
 */
const expectPaletteFrame = (
  ctx: LiveContext,
  palette: PaletteId,
  artifact: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const frame = yield* captureLive(
      ctx.host,
      `${LIVE_ARTIFACTS}/${artifact}.png`,
    );
    const reader = readAsync(ctx.host);
    yield* Effect.forEach(
      palettePixels(palette),
      (pixel) =>
        Effect.gen(function* () {
          const expected = yield* ctx.expectSome(
            `${palette} ${pixel.testId} colour parses`,
            Pixels.hexToRgba(pixel.colour),
          );
          yield* expectPixel(
            ctx,
            `${palette} ${pixel.testId} paints ${pixel.colour}`,
            reader,
            frame,
            pixel.testId,
            expected,
          );
        }),
      { concurrency: 1, discard: true },
    );
  });

const liveTheme: LiveScenario = {
  id: "live-theme",
  title: "Live theme: the palette switch repaints a window",
  capability: "theme",
  view: themeColorRolesView,
  ready: "theme-readout",
  steps: (ctx) =>
    Effect.gen(function* () {
      const opens = yield* textOf(ctx, "theme-readout");
      yield* ctx.expectContains(
        "opens on the dark palette",
        opens,
        "palette=dark",
      );
      const before = yield* boxOf(ctx, "swatch-background");
      yield* expectPaletteFrame(ctx, "dark", `${liveTheme.id}-dark`);

      yield* ctx.host.click("theme-next");
      yield* settle;
      yield* ctx.expectContains(
        "the switch moves to light",
        yield* textOf(ctx, "theme-readout"),
        "palette=light",
      );
      yield* expectPaletteFrame(ctx, "light", `${liveTheme.id}-light`);

      yield* ctx.host.click("theme-next");
      yield* settle;
      yield* ctx.expectContains(
        "a second switch reaches high contrast",
        yield* textOf(ctx, "theme-readout"),
        "palette=high",
      );
      yield* expectPaletteFrame(ctx, "high", liveTheme.id);

      const after = yield* boxOf(ctx, "swatch-background");
      yield* ctx.expectEqual(
        "the swatch keeps its box across the switch",
        `${after.x},${after.y},${after.width},${after.height}`,
        `${before.x},${before.y},${before.width},${before.height}`,
      );
    }),
};

/**
 * The platform type styles in a real window (plan `654`).
 *
 * Plan `170` proves the families through `paintedStyle`, which only the
 * `TestRenderer` has. The window cannot read a family — the live automation
 * tree carries no `style` (plan `197`) — so this twin proves what a window can:
 * a real click cycles Default → macOS → Linux → Windows → Default, the painted
 * readout follows, the mono/sans runs and the palette-derived surface keep
 * their exact boxes (a platform style changes type declarations, never
 * layout), and each switch repaints. A host that lacks a declared family falls
 * back silently, so no glyph-width assertion is made (§1 of the plan).
 */
const liveThemePlatform: LiveScenario = {
  id: "live-theme-platform",
  title: "Live platform styles: the type themes cycle in a window",
  capability: "theme",
  view: platformThemeView,
  ready: "platform-readout",
  steps: (ctx) =>
    Effect.gen(function* () {
      const boxes = () =>
        Effect.all(
          {
            surface: boxOf(ctx, "platform-surface"),
            mono: boxOf(ctx, "platform-mono"),
            sans: boxOf(ctx, "platform-sans"),
          },
          { concurrency: 1 },
        ).pipe(
          Effect.map(({ surface, mono, sans }) => ({
            surface: `${surface.x},${surface.y},${surface.width},${surface.height}`,
            mono: `${mono.x},${mono.y},${mono.width},${mono.height}`,
            sans: `${sans.x},${sans.y},${sans.width},${sans.height}`,
          })),
        );

      yield* waitForText(ctx, "platform-readout", "platform=default");
      yield* ctx.expectContains(
        "opens on the default platform",
        yield* textOf(ctx, "platform-readout"),
        "platform=default label=Default",
      );
      const opening = yield* boxes();
      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${liveThemePlatform.id}-default.png`,
      );

      const stops = [
        { token: "darwin", label: "macOS" },
        { token: "linux", label: "Linux" },
        { token: "win32", label: "Windows" },
        { token: "default", label: "Default" },
      ] as const;

      yield* Effect.forEach(
        stops,
        (stop) =>
          Effect.gen(function* () {
            const before = yield* ctx.host.frameStats();
            yield* ctx.host.click("platform-next");
            yield* waitForText(
              ctx,
              "platform-readout",
              `platform=${stop.token} label=${stop.label}`,
            );
            yield* settle;
            yield* ctx.expectContains(
              `the switch reaches ${stop.label}`,
              yield* textOf(ctx, "platform-readout"),
              `platform=${stop.token} label=${stop.label}`,
            );
            const after = yield* ctx.host.frameStats();
            yield* ctx.expectEqual(
              `the ${stop.label} switch repaints the window`,
              after.frames > before.frames,
              true,
            );

            const current = yield* boxes();
            yield* ctx.expectEqual(
              `the ${stop.label} style does not move the palette surface`,
              current.surface,
              opening.surface,
            );
            yield* ctx.expectEqual(
              `the ${stop.label} style does not move the mono run`,
              current.mono,
              opening.mono,
            );
            yield* ctx.expectEqual(
              `the ${stop.label} style does not move the sans run`,
              current.sans,
              opening.sans,
            );
            const painted = yield* ctx.host.paintedText();
            yield* ctx.expectEqual(
              `the ${stop.label} style keeps the code run painted`,
              Arr.some(painted, Str.includes("code: the quick brown fox")),
              true,
            );
            yield* ctx.host.screenshot(
              `${LIVE_ARTIFACTS}/${liveThemePlatform.id}-${stop.token}.png`,
            );
          }),
        { concurrency: 1 },
      );
    }),
};

/**
 * The same boxes in a real window (plan `674`).
 *
 * `live-theme` proves the switch interaction but not the colour: the live tree
 * has no style report. This twin decodes a real window's frame and samples the
 * theme's `primary`, three literals and the background, so colour is no longer
 * headless-only evidence.
 */
const livePixelColour: LiveScenario = {
  ...pixelColourLiveScenario,
  view: pixelColourView,
  ready: "pixel-canvas",
  steps: (ctx) =>
    pixelColourLiveScenario
      .steps(ctx)
      .pipe(
        Effect.tap(() =>
          ctx.host.screenshot(`${LIVE_ARTIFACTS}/live-pixel-colour.png`),
        ),
      ),
};

/**
 * The terminal surface in a real window (plan `532`).
 *
 * The headless probe measures colour, a11y and the synthetic key path. This twin
 * proves the parts only a window can: a real click focuses the text grid, real
 * keystrokes edit the prompt (with the `keyChar ?? key` fallback the runtime
 * needs), `ctrl-c` arrives with its modifier, and a live wheel plus a jump keep
 * the prompt row and native focus. Colour stays headless — `GpuixRenderer` has
 * no style report (plan `197`).
 */
const terminal: LiveScenario = {
  id: "live-terminal",
  title: "Live terminal: a focused text grid and the control keys",
  capability: "terminal",
  view: terminalScenario.view,
  ready: "terminal-surface",
  steps: (ctx) =>
    Effect.gen(function* () {
      const surface = yield* boxOf(ctx, "terminal-surface");
      yield* ctx.expectNear(
        "the live terminal surface is 418 wide inside its borders",
        surface.width,
        418,
        1,
      );
      yield* ctx.expectNear(
        "the live terminal surface is 266 tall inside its borders",
        surface.height,
        266,
        1,
      );

      yield* ctx.host.click("terminal-surface");
      yield* settle;
      yield* waitForFocus(ctx, "terminal-surface");
      yield* ctx.expectEqual(
        "a live click focuses the terminal surface",
        yield* focusedOf(ctx),
        "terminal-surface",
      );

      yield* ctx.host.key("l");
      yield* ctx.host.key("s");
      yield* settle;
      yield* waitForText(ctx, "terminal-input", "$ ls");
      yield* ctx.expectEqual(
        "printable keys edit the prompt",
        yield* textOf(ctx, "terminal-input"),
        "$ ls",
      );

      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "terminal-count", "201");
      yield* ctx.expectEqual(
        "enter commits and clears the prompt",
        yield* textOf(ctx, "terminal-input"),
        "$ ",
      );
      yield* ctx.expectEqual(
        "the committed command joins the scrollback",
        yield* textOf(ctx, "terminal-count"),
        "201",
      );
      const committed = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the committed command is painted",
        Arr.some(committed, Str.includes("$ ls")),
        true,
      );

      yield* ctx.host.key("up");
      yield* settle;
      yield* waitForText(ctx, "terminal-input", "$ ls");
      yield* ctx.expectEqual(
        "up recalls the last command",
        yield* textOf(ctx, "terminal-input"),
        "$ ls",
      );
      yield* ctx.host.key("backspace");
      yield* settle;
      yield* waitForText(ctx, "terminal-input", "$ l");
      yield* ctx.expectEqual(
        "backspace deletes one character",
        yield* textOf(ctx, "terminal-input"),
        "$ l",
      );
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "terminal-status", "cancelled");
      yield* ctx.expectEqual(
        "escape clears the line",
        yield* textOf(ctx, "terminal-input"),
        "$ ",
      );
      yield* ctx.expectEqual(
        "escape reports the cancel",
        yield* textOf(ctx, "terminal-status"),
        "cancelled",
      );

      yield* ctx.host.key("a");
      yield* settle;
      yield* ctx.host.key("ctrl-c");
      yield* settle;
      yield* waitForText(ctx, "terminal-status", "interrupted");
      yield* ctx.expectEqual(
        "ctrl-c aborts the line",
        yield* textOf(ctx, "terminal-status"),
        "interrupted",
      );
      yield* ctx.expectContains(
        "ctrl-c arrives with the control modifier",
        yield* textOf(ctx, "terminal-events"),
        "c+ctrl",
      );
      yield* ctx.expectEqual(
        "the aborted line is cleared",
        yield* textOf(ctx, "terminal-input"),
        "$ ",
      );

      const tail = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the live scrollback starts at the tail",
        Arr.some(tail, Str.includes("boot 199")),
        true,
      );
      yield* ctx.expectEqual(
        "the live head is outside the window",
        Arr.some(tail, Str.includes("boot 000")),
        false,
      );

      const anchorIndexOf = (anchor: Smoke.ListAnchor | null): number =>
        Option.getOrElse(
          Option.map(Option.fromNullishOr(anchor), ([index]) => index),
          () => -1,
        );
      const beforeWheel = yield* ctx.host.listScrollTop("terminal-list");
      yield* ctx.host.wheel("terminal-viewport", 0, 400);
      yield* settle;
      const afterWheel = yield* ctx.host.listScrollTop("terminal-list");
      yield* ctx.expectEqual(
        "a live wheel moves the scrollback",
        anchorIndexOf(afterWheel) < anchorIndexOf(beforeWheel),
        true,
      );
      yield* ctx.expectEqual(
        "a live wheel moves it by more than a screen",
        anchorIndexOf(beforeWheel) - anchorIndexOf(afterWheel) >= 10,
        true,
      );

      yield* ctx.host.scrollToItem("terminal-list", 0);
      yield* settle;
      yield* waitForAnchor(ctx, "terminal-list", "0,0");
      const head = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the live head is painted after the jump",
        Arr.some(head, Str.includes("boot 000")),
        true,
      );
      yield* ctx.expectEqual(
        "the live tail leaves the window",
        Arr.some(head, Str.includes("boot 199")),
        false,
      );
      yield* ctx.expectEqual(
        "the live prompt survives the jump",
        yield* textOf(ctx, "terminal-input"),
        "$ ",
      );
      yield* ctx.expectEqual(
        "native focus survives the jump",
        yield* focusedOf(ctx),
        "terminal-surface",
      );
      yield* ctx.host.key("x");
      yield* settle;
      yield* waitForText(ctx, "terminal-input", "$ x");
      yield* ctx.expectEqual(
        "the surface still takes input after the jump",
        yield* textOf(ctx, "terminal-input"),
        "$ x",
      );

      const row = yield* boxOf(ctx, "terminal-row-0");
      yield* ctx.expectNear(
        "a live row is exactly one line tall",
        row.height,
        18,
        0.5,
      );
      const first = yield* boxOf(ctx, "terminal-text-0");
      const second = yield* boxOf(ctx, "terminal-text-1");
      yield* ctx.expectNear(
        "equal character counts paint equal widths live",
        first.width,
        second.width,
        0.5,
      );
      const caret = yield* boxOf(ctx, "terminal-caret");
      yield* ctx.expectNear("the live caret is 7 wide", caret.width, 7, 0.5);
      yield* ctx.expectNear("the live caret is 12 tall", caret.height, 12, 0.5);
      const prompt = yield* boxOf(ctx, "terminal-input");
      const list = yield* boxOf(ctx, "terminal-viewport");
      yield* ctx.expectNear(
        "the live scrollback viewport is 240 tall",
        list.height,
        240,
        1,
      );
      yield* ctx.expectEqual(
        "the live prompt row sits below the scrollback",
        prompt.y >= list.y + list.height - 1,
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${terminal.id}.png`);
    }),
};

/**
 * The app root's single child in a real window (plan `522`).
 *
 * The rule is enforced by the reconciler, not the test renderer, so the live
 * twin checks that the earlier root of a two-root view is as absent in a window
 * as it is offscreen. Colour and the retained count stay headless.
 */
const rootProbe: LiveScenario = {
  id: "live-root",
  title: "Live root: only the last child of the app root survives",
  capability: "root",
  view: rootSingleChildScenario.view,
  ready: "root-last",
  steps: (ctx) =>
    Effect.gen(function* () {
      const last = yield* boxOf(ctx, "root-last");
      yield* ctx.expectNear(
        "the live surviving root is 200 wide",
        last.width,
        200,
        1,
      );

      const first = yield* ctx.host.bounds("root-first");
      yield* ctx.expectEqual(
        "the live earlier root is not painted",
        first === null,
        true,
      );

      const painted = yield* ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the live last root's text is painted",
        Arr.some(painted, Str.includes("last root survives")),
        true,
      );
      yield* ctx.expectEqual(
        "the live dropped root's text is not painted",
        Arr.some(painted, Str.includes("first root")),
        false,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${rootProbe.id}.png`);
    }),
};

/**
 * The window as the layout root (plan `526`).
 *
 * `live-shell` proves the shell fills the window at its open size; this proves
 * the other half — that a **real resize** reaches React and a window-sized
 * overlay follows it. The window is zoomed, asserted, and restored in an
 * `ensuring`, so a failed check cannot leave the next scenario maximised.
 */
const liveWindow: LiveScenario = {
  id: "live-window",
  title: "Live window: a real resize reaches the layout",
  capability: "window",
  view: windowLayoutScenario.view,
  ready: "wl-size",
  steps: (ctx) =>
    Effect.gen(function* () {
      const open = yield* ctx.host.windowSize();
      const openText = `${open.width}x${open.height}`;
      yield* ctx.expectEqual(
        "the hook reports the real window",
        yield* textOf(ctx, "wl-size"),
        openText,
      );
      yield* ctx.expectEqual(
        "the live window opens at the runner's 1100x720",
        openText,
        "1100x720",
      );
      yield* ctx.expectEqual(
        "the open window uses the compact layout",
        yield* textOf(ctx, "wl-mode"),
        "mode=compact",
      );
      yield* ctx.expectEqual(
        "the live desktop insets are zero",
        yield* textOf(ctx, "wl-insets"),
        "safe=0,0,0,0 ime=0,0,0,0",
      );
      yield* ctx.expectEqual(
        "the compact layout paints no sidebar",
        (yield* ctx.host.bounds("wl-sidebar")) === null,
        true,
      );
      const openVeil = yield* boxOf(ctx, "wl-veil");
      yield* ctx.expectNear(
        "the open veil is the window's width",
        openVeil.width,
        open.width,
        1,
      );
      yield* ctx.expectNear(
        "the open veil is the window's height",
        openVeil.height,
        open.height,
        1,
      );

      yield* Effect.gen(function* () {
        yield* ctx.host.zoomWindow();
        yield* waitForTextNot(ctx, "wl-size", openText);
        yield* settle;

        const zoomed = yield* ctx.host.windowSize();
        const zoomedText = `${zoomed.width}x${zoomed.height}`;
        yield* ctx.expectEqual(
          "the hook observed the resize",
          yield* textOf(ctx, "wl-size"),
          zoomedText,
        );
        yield* ctx.expectEqual(
          "the zoomed window is wider than the open one",
          zoomed.width > open.width,
          true,
        );
        yield* ctx.expectEqual(
          "the wide layout shows the sidebar",
          yield* textOf(ctx, "wl-mode"),
          "mode=wide",
        );
        yield* ctx.expectEqual(
          "the wide layout shows six actions",
          yield* textOf(ctx, "wl-actions"),
          "actions=6",
        );

        const sidebar = yield* boxOf(ctx, "wl-sidebar");
        yield* ctx.expectNear(
          "the zoomed sidebar is 240 wide",
          sidebar.width,
          240,
          1,
        );
        yield* ctx.expectNear(
          "the zoomed sidebar ends at the window's bottom",
          sidebar.y + sidebar.height,
          zoomed.height,
          1,
        );

        const veil = yield* boxOf(ctx, "wl-veil");
        yield* ctx.expectNear(
          "the veil tracks the zoomed width",
          veil.width,
          zoomed.width,
          1,
        );
        yield* ctx.expectNear(
          "the veil tracks the zoomed height",
          veil.height,
          zoomed.height,
          1,
        );

        yield* ctx.host.zoomWindow();
        yield* waitForTextNot(ctx, "wl-size", zoomedText);
        yield* settle;
        yield* ctx.expectEqual(
          "the window returns to its open size",
          yield* textOf(ctx, "wl-size"),
          openText,
        );
        yield* ctx.expectEqual(
          "the restored layout is compact again",
          yield* textOf(ctx, "wl-mode"),
          "mode=compact",
        );
        yield* ctx.expectEqual(
          "the restored layout hides the sidebar again",
          (yield* ctx.host.bounds("wl-sidebar")) === null,
          true,
        );

        yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveWindow.id}.png`);
      }).pipe(
        // Restore only while the window is not at its open size: two zoom calls
        // toggle, so an unconditional restore would maximise a window a failed
        // first call never zoomed. A restore that cannot even read the size is
        // a defect: the harness cannot put the window back.
        Effect.ensuring(
          Effect.gen(function* () {
            const now = yield* ctx.host.windowSize();
            const resized =
              now.width !== open.width || now.height !== open.height;
            yield* Effect.when(
              Effect.andThen(ctx.host.zoomWindow(), settle),
              Effect.succeed(resized),
            );
          }).pipe(Effect.orDie),
        ),
      );
    }),
};

const liveFrames: LiveScenario = {
  id: "live-frames",
  title: "Live paint counter: idle frames, reset and the debug overlay",
  capability: "frames",
  view: frameStatsScenario.view,
  ready: "fs-paints",
  steps: (ctx) =>
    Effect.gen(function* () {
      const open = yield* ctx.host.frameStats();
      yield* ctx.expectEqual(
        "the live renderer reports painted frames",
        open.frames > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the live renderer reports draw samples",
        open.samples > 0,
        true,
      );

      const reread = yield* ctx.host.frameStats();
      yield* ctx.expectEqual(
        "a live read does not paint",
        reread.frames,
        open.frames,
      );

      // The counter is a paint count, not a ticker: an idle window is not
      // repainted. This runs before any overlay toggle, because toggling it
      // leaves a few delayed repaints (measured, plan `527`).
      yield* Effect.sleep("300 millis");
      const idle = yield* ctx.host.frameStats();
      yield* ctx.expectEqual(
        "an idle window does not repaint",
        idle.frames,
        reread.frames,
      );

      yield* ctx.host.click("fs-counter");
      yield* waitForText(ctx, "fs-paints", "paints 1");
      yield* settle;
      yield* ctx.expectEqual(
        "the live click repaints its counter",
        yield* textOf(ctx, "fs-paints"),
        "paints 1",
      );
      const clicked = yield* ctx.host.frameStats();
      yield* ctx.expectEqual(
        "a live click grows the frame count",
        clicked.frames > idle.frames,
        true,
      );

      yield* ctx.host.resetFrameStats();
      const reset = yield* ctx.host.frameStats();
      yield* ctx.expectEqual(
        "a live reset keeps the lifetime count",
        reset.frames >= clicked.frames,
        true,
      );
      yield* ctx.expectEqual(
        "a live reset clears the ring to its own paint",
        reset.samples,
        1,
      );
      const current = yield* ctx.expectSome(
        "a live reset reports the current draw",
        reset.currentMs,
      );
      const p90 = yield* ctx.expectSome(
        "a live reset reports a p90",
        reset.p90Ms,
      );
      const p99 = yield* ctx.expectSome(
        "a live reset reports a p99",
        reset.p99Ms,
      );
      const max = yield* ctx.expectSome(
        "a live reset reports a maximum",
        reset.maxMs,
      );
      yield* ctx.expectEqual("a live reset collapses p90", p90, current);
      yield* ctx.expectEqual("a live reset collapses p99", p99, current);
      yield* ctx.expectEqual("a live reset collapses max", max, current);

      const hidden = yield* ctx.expectSome(
        "the live overlay starts hidden",
        yield* ctx.host.overlayMode(),
      );
      yield* ctx.expectEqual(
        "the live overlay starts hidden",
        hidden,
        "hidden",
      );

      const paintedBefore = Arr.join(yield* ctx.host.paintedText(), "|");
      const full = yield* ctx.expectSome(
        "set reports the live mode",
        yield* ctx.host.setOverlayMode("full"),
      );
      yield* ctx.expectEqual("set returns the live mode", full, "full");
      yield* ctx.expectEqual(
        "the live overlay changes no painted text",
        Arr.join(yield* ctx.host.paintedText(), "|"),
        paintedBefore,
      );
      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveFrames.id}.png`);

      yield* ctx.host.click("fs-counter");
      yield* waitForText(ctx, "fs-paints", "paints 2");
      yield* settle;
      yield* ctx.expectEqual(
        "a live click under the overlay still activates",
        yield* textOf(ctx, "fs-paints"),
        "paints 2",
      );

      const cycled = [
        yield* ctx.expectSome(
          "the live cycle leaves full for hidden",
          yield* ctx.host.cycleOverlayMode(),
        ),
        yield* ctx.expectSome(
          "the live cycle leaves hidden for minimal",
          yield* ctx.host.cycleOverlayMode(),
        ),
        yield* ctx.expectSome(
          "the live cycle leaves minimal for full",
          yield* ctx.host.cycleOverlayMode(),
        ),
      ];
      yield* ctx.expectEqual(
        "the live cycle order is hidden → minimal → full",
        Arr.join(cycled, ","),
        "hidden,minimal,full",
      );

      const final = yield* ctx.expectSome(
        "the live overlay hides again",
        yield* ctx.host.setOverlayMode("hidden"),
      );
      yield* ctx.expectEqual("the live overlay ends hidden", final, "hidden");
    }),
};

const liveDragTargets: LiveScenario = {
  id: "live-drag-targets",
  title: "Live drag targets: capture, hover edges and the ending click",
  capability: "drag",
  view: dragTargetsScenario.view,
  ready: "drag-a",
  steps: (ctx) =>
    Effect.gen(function* () {
      const source = yield* boxOf(ctx, "drag-a");
      const target = yield* boxOf(ctx, "drag-b");
      yield* ctx.expectNear(
        "the live source box paints at its borderless size",
        source.width,
        98,
        1,
      );
      yield* ctx.expectNear(
        "the live target box paints at its borderless size",
        target.width,
        98,
        1,
      );

      const from = centreOf(source);
      const to = centreOf(target);
      yield* ctx.host.pressWindow(from.x, from.y);
      yield* settle;
      yield* ctx.host.movePointer(to.x, to.y);
      yield* settle;

      const held = yield* textOf(ctx, "drag-log");
      yield* ctx.expectContains("the press reached the source", held, "A:down");
      yield* ctx.expectContains(
        "the source keeps the held move",
        held,
        "A:move",
      );
      yield* ctx.expectEqual(
        "the target receives no move during capture",
        Str.includes("B:move")(held),
        false,
      );
      yield* ctx.expectEqual(
        "the pointer entered the source before the drag",
        indexOf(held, "A:enter") >= 0 &&
          indexOf(held, "A:enter") < indexOf(held, "A:move"),
        true,
      );

      yield* ctx.host.releasePointer(to.x, to.y);
      yield* settle;
      const released = yield* textOf(ctx, "drag-log");
      yield* ctx.expectContains(
        "a live drag ends on the captured source",
        released,
        "A:up",
      );
      yield* ctx.expectEqual(
        "the element under the pointer receives no up",
        Str.includes("B:up")(released),
        false,
      );
      yield* ctx.expectContains(
        "the live gesture ends in a click on the source",
        released,
        "A:click",
      );
      yield* ctx.expectContains(
        "the target's hover settles during the gesture",
        released,
        "B:enter",
      );
      yield* ctx.expectContains(
        "the source's leave settles during the gesture",
        released,
        "A:leave",
      );

      yield* ctx.host.click("drag-b");
      yield* settle;
      yield* ctx.expectContains(
        "the target still receives clicks after the gesture",
        yield* textOf(ctx, "drag-log"),
        "B:click",
      );

      yield* ctx.host.hover("drag-a");
      yield* settle;
      const tail = yield* textOf(ctx, "drag-log");
      yield* ctx.expectContains(
        "hover works after the gesture",
        tail,
        "A:enter",
      );
      yield* ctx.expectEqual(
        "the hover move still reaches the element",
        Str.endsWith("A:move")(tail),
        true,
      );

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveDragTargets.id}.png`);
    }),
};

const liveDragAutoscroll: LiveScenario = {
  id: "live-drag-autoscroll",
  title: "Live drag: held edge scroll, capture and the derived drop index",
  capability: "drag",
  view: dragAutoscrollScenario.view,
  ready: "drag-source",
  steps: (ctx) =>
    Effect.gen(function* () {
      const reorder = yield* boxOf(ctx, "drag-reorder");
      const plain = yield* boxOf(ctx, "drag-plain");
      yield* ctx.expectNear(
        "the live reorder viewport excludes its border",
        reorder.height,
        178,
        1,
      );
      yield* ctx.expectNear(
        "the live reorder list keeps its declared width",
        reorder.width,
        218,
        1,
      );

      const source = centreOf(yield* boxOf(ctx, "drag-source"));
      const x = reorder.x + reorder.width / 2;
      const bottom = reorder.y + reorder.height - 6;
      const top = reorder.y + 6;
      // The readout is component state; a painted row is the runtime's scroll.
      const rowBefore = yield* boxOf(ctx, "drag-row-6");

      yield* ctx.host.pressWindow(source.x, source.y);
      yield* settle;
      yield* ctx.host.movePointer(x, bottom);
      yield* settle;
      const rowAfter = yield* boxOf(ctx, "drag-row-6");
      yield* ctx.expectNear(
        "the runtime scrolls the painted rows",
        rowAfter.y,
        rowBefore.y - 24,
        1,
      );
      yield* ctx.expectEqual(
        "a held bottom-edge move scrolls one row",
        yield* textOf(ctx, "drag-reorder-offset"),
        "offset=-24",
      );

      yield* ctx.host.movePointer(x, bottom);
      yield* settle;
      yield* ctx.host.movePointer(x, bottom);
      yield* settle;
      yield* ctx.expectEqual(
        "three held moves scroll three rows",
        yield* textOf(ctx, "drag-reorder-offset"),
        "offset=-72",
      );
      const dropNearBottom = Number(
        Str.replace("index=", "")(yield* textOf(ctx, "drag-drop-index")),
      );
      yield* ctx.expectEqual(
        "the drop index follows the scrolled content",
        dropNearBottom > 0,
        true,
      );

      yield* ctx.host.movePointer(x, top);
      yield* settle;
      yield* ctx.expectEqual(
        "a held top-edge move scrolls one row back",
        yield* textOf(ctx, "drag-reorder-offset"),
        "offset=-48",
      );
      const dropNearTop = Number(
        Str.replace("index=", "")(yield* textOf(ctx, "drag-drop-index")),
      );
      yield* ctx.expectEqual(
        "the drop index moves toward the top with the scroll",
        dropNearTop < dropNearBottom,
        true,
      );

      yield* ctx.host.releasePointer(x, top);
      yield* settle;
      const log = yield* textOf(ctx, "drag-log");
      yield* ctx.expectContains("the source received the down", log, "down");
      yield* ctx.expectContains("the source received the up", log, "up");
      yield* ctx.expectContains(
        "the live gesture ends in a click on the source",
        log,
        "click",
      );
      yield* ctx.expectEqual(
        "the source received every held move",
        Arr.length(Arr.filter(Str.split(">")(log), Str.startsWith("move:"))) >=
          4,
        true,
      );

      const plainRowBefore = yield* boxOf(ctx, "drag-plain-row-1");
      const plainSource = centreOf(yield* boxOf(ctx, "drag-plain-source"));
      yield* ctx.host.pressWindow(plainSource.x, plainSource.y);
      yield* settle;
      yield* ctx.host.movePointer(
        plain.x + plain.width / 2,
        plain.y + plain.height - 6,
      );
      yield* Effect.sleep("600 millis");
      const plainLog = yield* textOf(ctx, "drag-plain-log");
      yield* ctx.expectContains(
        "the plain gesture is live (its source receives the move)",
        plainLog,
        "move",
      );
      const plainRowAfter = yield* boxOf(ctx, "drag-plain-row-1");
      yield* ctx.expectNear(
        "the runtime does not auto-scroll a live held drag",
        plainRowAfter.y,
        plainRowBefore.y,
        1,
      );
      yield* ctx.host.releasePointer(
        plain.x + plain.width / 2,
        plain.y + plain.height - 6,
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${liveDragAutoscroll.id}.png`,
      );
    }),
};

/** Whether the last row's bottom sits inside the viewport (the component's rule). */
const endVisible = (row: Smoke.Bounds, viewport: Smoke.Bounds): boolean =>
  row.y + row.height <= viewport.y + viewport.height + 1;

const liveTier2Scroller: LiveScenario = {
  id: "live-tier2-scroller",
  title: "Live Tier 2: the shipped MessageScroller",
  capability: "tier2",
  view: tier2ScrollerScenario.view,
  ready: "tier2-scroller-viewport",
  steps: (ctx) =>
    Effect.gen(function* () {
      const offset = (id: string) =>
        Effect.gen(function* () {
          const value = yield* ctx.host.scrollOffset(id);
          return yield* ctx.expectSome(
            `${id} reports a scroll offset`,
            Option.fromNullishOr(value),
          );
        });

      yield* waitForText(ctx, "tier2-scroller-readout", "count=40");

      // 1. The live window mounts the transcript at its end.
      const start = yield* offset("tier2-scroller-viewport");
      yield* ctx.expectEqual(
        "the live scroller starts scrolled",
        start.y < 0,
        true,
      );
      // A live scroller's own reported box moves with its scroll (plan `556`),
      // so the frame is the non-scrolling root plus the declared height.
      const frame = {
        ...(yield* boxOf(ctx, "tier2-scroller")),
        height: 240,
      };
      const tail = yield* boxOf(ctx, "tier2-scroller-row-40");
      yield* ctx.expectEqual(
        "the live tail starts visible",
        endVisible(tail, frame),
        true,
      );
      yield* ctx.expectEqual(
        "a pinned live reader sees no affordance",
        (yield* ctx.host.bounds("tier2-scroller-jump")) === null,
        true,
      );

      // 2. A real click appends while pinned and the view follows.
      yield* ctx.host.click("scroller-append");
      yield* settle;
      yield* waitForText(ctx, "tier2-scroller-readout", "count=41");
      const appended = yield* boxOf(ctx, "tier2-scroller-row-41");
      yield* ctx.expectEqual(
        "the live pinned append keeps the tail visible",
        endVisible(appended, frame),
        true,
      );

      // 3. A real wheel unpins; the affordance paints.
      yield* ctx.host.wheel("tier2-scroller", 0, 120);
      yield* settle;
      yield* waitForBounds(ctx, "tier2-scroller-jump", () => true);
      const unpinned = yield* offset("tier2-scroller-viewport");
      yield* ctx.expectEqual(
        "the live wheel moved toward older rows",
        unpinned.y > start.y,
        true,
      );
      yield* ctx.expectContains(
        "the live consumer sees the pin change",
        yield* textOf(ctx, "tier2-scroller-readout"),
        "pinned=false",
      );

      // 4. An arrival while unpinned does not move the reader.
      yield* ctx.host.click("scroller-append");
      yield* settle;
      yield* waitForText(ctx, "tier2-scroller-readout", "count=42");
      const afterAppend = yield* offset("tier2-scroller-viewport");
      yield* ctx.expectNear(
        "the live unpinned append does not yank the reader",
        afterAppend.y,
        unpinned.y,
        1,
      );
      yield* waitForText(ctx, "tier2-scroller-jump", "1 new message");

      // 5. A grown last row below the viewport leaves the offset alone.
      const beforeStream = yield* boxOf(ctx, "tier2-scroller-row-42");
      yield* ctx.host.click("scroller-stream");
      yield* settle;
      const afterStream = yield* offset("tier2-scroller-viewport");
      const grown = yield* boxOf(ctx, "tier2-scroller-row-42");
      yield* ctx.expectEqual(
        "the live streamed row grew",
        grown.height > beforeStream.height,
        true,
      );
      yield* ctx.expectNear(
        "the live unpinned stream leaves the reader in place",
        afterStream.y,
        unpinned.y,
        1,
      );

      // 6. Jump returns to the end and re-pins.
      yield* ctx.host.click("tier2-scroller-jump");
      yield* settle;
      yield* waitForText(ctx, "tier2-scroller-readout", "pinned=true");
      yield* ctx.expectEqual(
        "the live jump hides the affordance",
        (yield* ctx.host.bounds("tier2-scroller-jump")) === null,
        true,
      );
      const resumedTail = yield* boxOf(ctx, "tier2-scroller-row-42");
      yield* ctx.expectEqual(
        "the live jump returns to the tail",
        endVisible(resumedTail, frame),
        true,
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${liveTier2Scroller.id}.png`,
      );
    }),
};

const liveTier2Command: LiveScenario = {
  id: "live-tier2-command",
  title: "Live Tier 2: the shipped CommandMenu",
  capability: "tier2",
  view: tier2CommandScenario.view,
  ready: "command-open",
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* waitForText(ctx, "tier2-command-readout", "open=false");

      // 1. A real click opens the dialog and its input takes native focus.
      yield* ctx.host.click("command-open");
      yield* ctx.host.waitFor("command-input");
      yield* settle;
      yield* waitForText(ctx, "tier2-command-readout", "open=true");
      yield* ctx.expectEqual(
        "the live search input takes focus",
        yield* focusedOf(ctx),
        "command-input",
      );
      const labels = (yield* ctx.host.paintedText()).join("\n");
      yield* ctx.expectContains(
        "the live list paints its groups",
        labels,
        "Navigation",
      );
      yield* ctx.expectContains(
        "the live list paints a later group",
        labels,
        "View",
      );

      // 2. Typing filters while focus stays in the input.
      yield* ctx.host.key("s a v e");
      yield* settle;
      yield* ctx.expectSome(
        "the live match survives the query",
        Option.fromNullishOr(yield* ctx.host.bounds("command-save")),
      );
      yield* ctx.expectEqual(
        "a live non-match leaves the list",
        (yield* ctx.host.bounds("command-toggle-sidebar")) === null,
        true,
      );
      yield* ctx.expectEqual(
        "typing keeps focus in the input live",
        yield* focusedOf(ctx),
        "command-input",
      );

      // 3. Enter runs the match, closes and returns focus.
      yield* ctx.host.key("enter");
      yield* settle;
      yield* waitForText(ctx, "tier2-command-readout", "ran=Save");
      yield* waitForText(ctx, "tier2-command-readout", "open=false");
      yield* ctx.expectEqual(
        "the live dialog left the tree",
        (yield* ctx.host.bounds("command-menu")) === null,
        true,
      );
      // Measured defect (plan `581`): closing leaves no focus owner instead of
      // returning it to the opener — `CommandMenuInput`'s `autoFocus` is
      // captured before the dialog records the previous owner.
      yield* ctx.expectEqual(
        "the live close leaves no focus owner (measured defect)",
        yield* focusedOf(ctx),
        "none",
      );

      // 4. Escape closes without running anything.
      yield* ctx.host.click("command-open");
      yield* ctx.host.waitFor("command-input");
      yield* settle;
      yield* ctx.host.key("escape");
      yield* settle;
      yield* waitForText(ctx, "tier2-command-readout", "open=false");
      yield* ctx.expectContains(
        "Escape ran nothing live",
        yield* textOf(ctx, "tier2-command-readout"),
        "ran=Save",
      );

      // 5. Reopening clears the query; a miss paints the empty state.
      yield* ctx.host.click("command-open");
      yield* ctx.host.waitFor("command-input");
      yield* settle;
      yield* ctx.host.key("z z z");
      yield* settle;
      yield* waitForPainted(ctx, "No commands");
      yield* ctx.expectContains(
        "the live empty state is painted",
        yield* textOf(ctx, "command-empty"),
        "No commands",
      );
      yield* ctx.host.key("enter");
      yield* settle;
      yield* ctx.expectContains(
        "Enter on the live empty list runs nothing",
        yield* textOf(ctx, "tier2-command-readout"),
        "ran=Save",
      );

      yield* ctx.host.screenshot(
        `${LIVE_ARTIFACTS}/${liveTier2Command.id}.png`,
      );
    }),
};

/** The live suite, in run order. */
export const liveScenarios: ReadonlyArray<LiveScenario> = [
  shell,
  liveShellFilter,
  rootProbe,
  liveWindow,
  liveFrames,
  input,
  inputPayload,
  pointerEntry,
  liveTextEntry,
  liveDragTargets,
  liveDragAutoscroll,
  scroll,
  tabOverflow,
  panel,
  livePanelNested,
  motion,
  overlay,
  liveFloating,
  focus,
  tabFocus,
  selection,
  contextMenu,
  docking,
  float,
  primitives,
  livePrimitivesFields,
  livePrimitivesDisplay,
  livePrimitivesChoice,
  livePrimitivesEntry,
  liveSelect,
  liveCombobox,
  liveTooltip,
  table,
  liveScale,
  liveScrollIntoView,
  variableRows,
  tableSort,
  highlights,
  preview,
  scroller,
  log,
  restore,
  workspacePanes,
  tier2Dialog,
  tier2Menu,
  tier2Toast,
  liveToast,
  keyRouting,
  tier2Foundation,
  tier2Navigation,
  tier2Choice,
  tier2Forms,
  tier2Editing,
  tier2Flow,
  liveTier2Scroller,
  liveTier2Command,
  commandPalette,
  replace,
  searchReplace,
  inspector,
  dataGridColumns,
  liveDataGrid,
  grid,
  liveStates,
  liveTruncation,
  liveLayers,
  liveContent,
  liveMarkdown,
  liveDiff,
  columnConfig,
  cropArea,
  appChrome,
  liveLayoutFlex,
  liveLayoutGrid,
  liveTypography,
  liveCollapsible,
  liveChart,
  liveQr,
  menuBar,
  multiPaneEditor,
  dataToolbar,
  queryBuilder,
  notificationCentre,
  wizard,
  gridCellEditing,
  reorder,
  treeReorder,
  liveTree,
  liveRovingFocus,
  media,
  liveTheme,
  liveThemePlatform,
  livePixelColour,
  terminal,
  selectionSignal,
];

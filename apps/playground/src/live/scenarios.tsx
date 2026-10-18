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
 * that real keystrokes reach a focused text grid.
 *
 * Each scenario provides its own view, which the runner mounts in the real
 * window under a keyed `Fragment` — the live twin of plan `182`'s isolation.
 */
import type { ReactNode } from "react";
import { Duration, Effect, Schedule } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import type { Smoke } from "@gpuixui/testing";
import { App } from "../app.js";
import { contextMenuScenario } from "../scenarios/context-menu.js";
import { nestedLayerScenario } from "../scenarios/layers.js";
import { dockingScenario } from "../scenarios/docking.js";
import { floatScenario } from "../scenarios/float.js";
import { inputScenario } from "../scenarios/input.js";
import { inputPayloadScenario } from "../scenarios/input-payload.js";
import { modalScenario, MODAL_FOCUS_IDS } from "../scenarios/modal.js";
import { motionScenario } from "../scenarios/motion.js";
import { panelScenario } from "../scenarios/panel.js";
import { previewScenario } from "../scenarios/preview.js";
import { primitivesActionsScenario } from "../scenarios/primitives.js";
import {
  comboboxScenario,
  selectScenario,
  tooltipScenario,
} from "../scenarios/popups.js";
import { scrollScenario } from "../scenarios/scroll.js";
import { searchScenario } from "../scenarios/search.js";
import { textSelectionScenario } from "../scenarios/text-selection.js";
import { virtualizedTableScenario } from "../scenarios/virtual-table.js";
import { variableRowsScenario } from "../scenarios/variable-rows.js";
import { pointerEntryScenario } from "../scenarios/pointer-entry.js";
import { tableSelectSortScenario } from "../scenarios/table.js";
import { messageScrollerScenario } from "../scenarios/message-scroller.js";
import { workspaceRestoreScenario } from "../scenarios/workspace-restore.js";
import { replaceScenario } from "../scenarios/replace.js";
import { tier2DialogScenario } from "../scenarios/tier2-dialog.js";
import { tier2FoundationScenario } from "../scenarios/tier2-foundation.js";
import { tier2MenuScenario } from "../scenarios/tier2-menu.js";
import { tier2NavigationScenario } from "../scenarios/tier2-navigation.js";
import { tier2ToastScenario } from "../scenarios/tier2-toast.js";
import { tier2ChoiceScenario } from "../scenarios/tier2-choice.js";
import { EMAIL_MESSAGE, tier2FormsScenario } from "../scenarios/tier2-forms.js";
import { tier2EditingScenario } from "../scenarios/tier2-editing.js";
import { tier2FlowScenario } from "../scenarios/tier2-flow.js";
import { propertyPanelScenario } from "../scenarios/property-panel.js";
import { dataGridColumnsScenario } from "../scenarios/data-grid-columns.js";
import { gridScenario } from "../scenarios/grid.js";
import {
  declaredStylesScenario,
  textTruncationScenario,
} from "../scenarios/styles.js";
import { columnConfigScenario } from "../scenarios/column-config.js";
import { cropScenario } from "../scenarios/crop.js";
import { mediaScenario } from "../scenarios/media.js";
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

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${highlights.id}.png`);
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
      yield* ctx.expectContains(
        "autoFocus does not run React's onFocus",
        yield* textOf(ctx, "key-routing-readout"),
        "innerFocus=0",
      );

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
      // Measured 2026-10-18/19: the automation locator's `click(testId)`
      // resolves the pre-swap display node, so the swapped editor only takes a
      // live pointer focus from a coordinate click inside it — what a user does
      // anyway. React's `onFocus`/`onBlur` delivery is window-state dependent
      // (plan `390`); in the current window a click away commits (plan `555`),
      // while the headless host delivers no `onBlur` (plan `347`). Each claim is
      // asserted in its own suite.
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
      const editor = yield* boxOf(ctx, "ws-name");
      yield* ctx.host.clickWindow(editor.x + 200, editor.y + editor.height / 2);
      yield* settle;
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
      const again = yield* boxOf(ctx, "ws-name");
      yield* ctx.host.clickWindow(again.x + 200, again.y + again.height / 2);
      yield* settle;
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
      const blurEditor = yield* boxOf(ctx, "ws-name");
      yield* ctx.host.clickWindow(
        blurEditor.x + 200,
        blurEditor.y + blurEditor.height / 2,
      );
      yield* settle;
      yield* ctx.host.key("z");
      yield* settle;
      yield* ctx.host.click("ws-elsewhere");
      yield* settle;
      yield* waitForText(ctx, "tier2-editing-readout", "name=livez commits=2");
      yield* ctx.expectContains(
        "a click away commits the open live draft",
        yield* textOf(ctx, "tier2-editing-readout"),
        "name=livez commits=2",
      );
      yield* ctx.expectContains(
        "the committed display paints the draft",
        yield* textOf(ctx, "ws-name"),
        "livez",
      );
      yield* waitForFocus(ctx, "ws-elsewhere");
      yield* ctx.expectEqual(
        "the click's focus is not stolen by the commit",
        yield* focusedOf(ctx),
        "ws-elsewhere",
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
      yield* ctx.host.click("qb-rule-0-field-item-owner");
      yield* settle;
      yield* ctx.host.click("qb-rule-0-value");
      yield* settle;
      yield* ctx.host.click("qb-rule-0-value-item-Ada");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "matched=30");
      yield* ctx.host.click("qb-rule-0-op");
      yield* settle;
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
  scroll,
  panel,
  motion,
  overlay,
  focus,
  selection,
  contextMenu,
  docking,
  float,
  primitives,
  liveSelect,
  liveCombobox,
  liveTooltip,
  table,
  variableRows,
  tableSort,
  highlights,
  preview,
  scroller,
  restore,
  tier2Dialog,
  tier2Menu,
  tier2Toast,
  keyRouting,
  tier2Foundation,
  tier2Navigation,
  tier2Choice,
  tier2Forms,
  tier2Editing,
  tier2Flow,
  commandPalette,
  replace,
  inspector,
  dataGridColumns,
  grid,
  liveStates,
  liveTruncation,
  liveLayers,
  columnConfig,
  cropArea,
  appChrome,
  menuBar,
  multiPaneEditor,
  dataToolbar,
  queryBuilder,
  notificationCentre,
  wizard,
  gridCellEditing,
  reorder,
  treeReorder,
  media,
  terminal,
];

/**
 * The live scenarios: the shipped playground driven in a real window.
 *
 * They are deliberately few. A live window proves that the core mechanisms
 * transfer out of the offscreen `TestRenderer`; it does not repeat the headless
 * suite. It cannot assert colour or the accessibility dump — the live renderer
 * exposes no style or a11y method (plan `197`). Focus, selection, painted
 * highlights and virtual-list anchors *are* asserted: the runner owns the
 * renderer, so it reads them there even where the automation protocol has no
 * verb (plans `190`, `191`, `197`).
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
import { dockingScenario } from "../scenarios/docking.js";
import { floatScenario } from "../scenarios/float.js";
import { inputScenario } from "../scenarios/input.js";
import { modalScenario, MODAL_FOCUS_IDS } from "../scenarios/modal.js";
import { motionScenario } from "../scenarios/motion.js";
import { panelScenario } from "../scenarios/panel.js";
import { previewScenario } from "../scenarios/preview.js";
import { primitivesActionsScenario } from "../scenarios/primitives.js";
import { scrollScenario } from "../scenarios/scroll.js";
import { searchScenario } from "../scenarios/search.js";
import { textSelectionScenario } from "../scenarios/text-selection.js";
import { virtualizedTableScenario } from "../scenarios/virtual-table.js";
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
import { appChromeScenario } from "../scenarios/app-chrome.js";
import { multiPaneEditorScenario } from "../scenarios/multi-pane-editor.js";
import { dataToolbarScenario } from "../scenarios/data-toolbar.js";
import { queryBuilderScenario } from "../scenarios/query-builder.js";
import { notificationCentreScenario } from "../scenarios/notification-centre.js";
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
      yield* ctx.expectNear(
        "the surface is centred horizontally",
        box.x + box.width / 2,
        WINDOW.width / 2,
        2,
      );
      yield* ctx.expectNear(
        "the surface is centred vertically",
        box.y + box.height / 2,
        WINDOW.height / 2,
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
        target.x + target.width / 2,
        1,
      );
      yield* ctx.expectNear(
        "the menu paints at the pointer's y",
        menu.y,
        target.y + target.height / 2,
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
        row.x + row.width / 2,
        1,
      );
      yield* ctx.expectNear(
        "the scrolled menu paints at the pointer's y",
        inside.y,
        row.y + row.height / 2,
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
      yield* ctx.expectNear(
        "the surface is centred horizontally",
        surface.x + surface.width / 2,
        WINDOW.width / 2,
        2,
      );
      yield* ctx.expectNear(
        "the surface is centred vertically",
        surface.y + surface.height / 2,
        WINDOW.height / 2,
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
      yield* ctx.expectNear("the card is 380 px wide", card.width, 380, 1);

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
      yield* ctx.expectContains(
        "a live click focuses natively without running React's onFocus",
        yield* textOf(ctx, "key-routing-readout"),
        "innerFocus=0 outerFocus=0",
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

      yield* ctx.host.key("right");
      yield* settle;
      // Measured: a live click focuses the trigger natively but does not run
      // React's `onFocus`, so the tab's roving `active` is still empty and the
      // arrow starts from the first enabled tab. The headless suite clicks and
      // asserts the next tab, so the difference is real. Recorded as a
      // components defect alongside the missing key bubbling.
      yield* ctx.expectContains(
        "an arrow after a live click restarts at the first tab (measured limit)",
        yield* textOf(ctx, "tier2-navigation-readout"),
        "tab=overview",
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
      // Measured 2026-10-18: the automation locator's `click(testId)` resolves
      // the pre-swap display node, so the swapped editor only takes a live
      // pointer focus from a coordinate click inside it — which is what a user
      // does anyway. React's `onBlur` does not run for a native focus change in
      // a window (the same gap plan `345` measured for `onFocus`), so the
      // blur-commit path stays headless; the keyboard commits and cancels work.
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
        "the live drawer is flush to the right edge",
        surface.x + surface.width,
        1100,
      );
      yield* ctx.expectEqual(
        "the live drawer keeps its md width",
        surface.width,
        400,
      );
      yield* ctx.expectEqual(
        "the live drawer spans the window height",
        surface.height,
        720,
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

      // 2. A real wheel moves the body and leaves the first row alone.
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

      // 4. A real click selects the reordered row.
      yield* ctx.host.click("table-first");
      yield* settle;
      yield* waitForText(ctx, "table-readout", "selected=r199");
      yield* ctx.expectContains(
        "a live row click selects by row id",
        yield* textOf(ctx, "table-readout"),
        "selected=r199",
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
        "selected=r199",
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
        frozen.x + 150,
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
        "the live body shares the resized width",
        bodyStatus.width,
        grownStatus.width,
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
        "the live status bar is 24 px tall",
        status.height,
        24,
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
        "the live strip is 132 px tall",
        strip.height,
        132,
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
      const revealed = yield* boxOf(ctx, "qb-rule-3");
      const scrolledStrip = yield* boxOf(ctx, "qb-rules");
      yield* ctx.expectNear(
        "the live appended row sits at the strip's bottom",
        revealed.y + revealed.height,
        scrolledStrip.y + scrolledStrip.height,
        2,
      );
      const clipped = yield* boxOf(ctx, "qb-rule-0");
      yield* ctx.expectEqual(
        "the live first rule scrolled above the strip",
        clipped.y < scrolledStrip.y,
        true,
      );

      // A picker opened from the scrolled strip still paints and commits.
      yield* ctx.host.click("qb-rule-3-field");
      yield* settle;
      yield* waitForText(ctx, "qb-rule-3-field-content", "Score");
      yield* ctx.host.click("qb-rule-3-field-item-score");
      yield* settle;
      yield* waitForText(ctx, "qb-state", "rules=4");
      yield* ctx.expectEqual(
        "the live scrolled row commits its field",
        yield* textOf(ctx, "qb-rule-3-op"),
        ">",
      );

      // Escape closes and returns focus; the rules survive the reopen.
      yield* ctx.host.click("qb-rule-3-value");
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

/** The live suite, in run order. */
export const liveScenarios: ReadonlyArray<LiveScenario> = [
  shell,
  input,
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
  table,
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
  replace,
  inspector,
  dataGridColumns,
  appChrome,
  multiPaneEditor,
  dataToolbar,
  queryBuilder,
  notificationCentre,
];

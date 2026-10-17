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
import { Duration, Effect } from "effect";
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
import { primitivesActionsScenario } from "../scenarios/primitives.js";
import { scrollScenario } from "../scenarios/scroll.js";
import { searchScenario } from "../scenarios/search.js";
import { textSelectionScenario } from "../scenarios/text-selection.js";
import { virtualizedTableScenario } from "../scenarios/virtual-table.js";
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
      const dismissed = yield* textOf(ctx, "modal-readout");
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
      const dismissed = yield* textOf(ctx, "modal-readout");
      yield* ctx.expectContains(
        "Escape closed the modal",
        dismissed,
        "open=false popover=false last=escape",
      );
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
      yield* ctx.expectEqual(
        "focus entered the nested popover",
        yield* focusedOf(ctx),
        "nested-content",
      );

      yield* ctx.host.key("escape");
      yield* settle;
      const nested = yield* textOf(ctx, "modal-readout");
      yield* ctx.expectContains(
        "Escape closed only the popover",
        nested,
        "open=true popover=false last=popover-escape",
      );
      yield* ctx.expectEqual(
        "focus returned from the popover",
        yield* focusedOf(ctx),
        "modal-open-popover",
      );

      yield* ctx.host.key("escape");
      yield* settle;
      const closed = yield* textOf(ctx, "modal-readout");
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
  highlights,
];

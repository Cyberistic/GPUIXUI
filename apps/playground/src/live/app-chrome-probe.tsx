/**
 * The `app-chrome-lifecycle` probe: the shipped application chrome in a window.
 *
 * `@gpuixui/shell` shipped its three parts with pure navigation suites, so no
 * renderer had ever mounted them. This view is the window that does: a menu bar
 * at the top, a toolbar under it and a status bar at the bottom, with a readout
 * carrying the two selections the caller hears.
 *
 * The checks are the window facts a pure suite cannot state:
 *
 * 1. **The bar opens and navigates.** A press paints the dropdown below its
 *    trigger; Down skips the disabled row and Enter reports it; Right moves the
 *    open menu, wrapping past the disabled Help entry; Escape closes the surface
 *    and puts the native focus back on the trigger.
 * 2. **The toolbar roves the native focus.** Right moves focus to an action
 *    element (not only the component's internal stop), skips the disabled
 *    action, and the overflow trigger opens the tail the `max` split away.
 * 3. **The status tone is a role, not a literal.** The two named tones paint
 *    their `statusTone` ink inside the trailing group's own pixels and nowhere
 *    in the leading group.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import {
  statusTone,
  textStyle,
  type StatusTone,
  type Theme,
} from "@gpuixui/tokens";
import { AppMenu, StatusBar, Toolbar } from "@gpuixui/shell";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale } from "./frame.js";
import { settleUntil } from "./settle.js";
import {
  actionId,
  APP_CHROME_ACTIONS,
  APP_CHROME_IDS,
  APP_CHROME_MENU_LABEL,
  APP_CHROME_MENUS,
  APP_CHROME_OVERFLOW,
  APP_CHROME_PLATFORM,
  APP_CHROME_STATUS_LABEL,
  APP_CHROME_STATUS_LEFT,
  APP_CHROME_STATUS_RIGHT,
  APP_CHROME_TOOLBAR_LABEL,
  APP_CHROME_TOOLBAR_MAX,
  appChromeReadout,
  inkDistance,
  itemId,
  overflowItemId,
  OVERFLOW_ID,
  TONE_TOLERANCE,
  triggerId,
  type AppChromeState,
} from "./app-chrome.js";

/** A dropdown's entry and the focus move a key starts need a frame. */
const SETTLE = Duration.millis(120);

/** The capture a reader can look at. */
const FRAME = "app-chrome";

/** The open dropdown's capture, so the placement is visible beside the numbers. */
const OPEN_FRAME = "app-chrome-menu";

/** The probe's window: the three chrome parts and its own readout. */
export const AppChromeProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [state, setState] = useState<AppChromeState>({
    menu: "none",
    action: "none",
    menuReports: 0,
    actionReports: 0,
  });

  return (
    <div
      testId={APP_CHROME_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <AppMenu
        testId={APP_CHROME_IDS.menuBar}
        label={APP_CHROME_MENU_LABEL}
        menus={APP_CHROME_MENUS}
        platform={APP_CHROME_PLATFORM}
        onSelect={(menu, item) =>
          setState((current) => ({
            ...current,
            menu: `${menu}/${item}`,
            menuReports: current.menuReports + 1,
          }))
        }
      />
      <Toolbar
        testId={APP_CHROME_IDS.toolbar}
        label={APP_CHROME_TOOLBAR_LABEL}
        actions={APP_CHROME_ACTIONS}
        max={APP_CHROME_TOOLBAR_MAX}
        onAction={(action) =>
          setState((current) => ({
            ...current,
            action,
            actionReports: current.actionReports + 1,
          }))
        }
      />
      <Readout testId={APP_CHROME_IDS.readout}>
        {appChromeReadout(state)}
      </Readout>
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.mutedForeground,
        }}
      >
        The shipped menu bar, toolbar and status bar: the window proves the
        dropdown, the native focus a roving toolbar move names, and the ink a
        status tone paints.
      </text>
      <div style={{ flexGrow: 1, flexBasis: 0 }} />
      <StatusBar
        testId={APP_CHROME_IDS.status}
        label={APP_CHROME_STATUS_LABEL}
        left={APP_CHROME_STATUS_LEFT}
        right={APP_CHROME_STATUS_RIGHT}
      />
    </div>
  );
};

/** The painted box of `testId`, or `null` while the runtime paints none. */
const painted = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<Smoke.Bounds | null, Smoke.SmokeHostError> =>
  ctx.host.bounds(testId);

/** Waits until `testId` paints, then asserts it. */
const expectPainted = (
  ctx: Smoke.AsyncSmokeContext,
  label: string,
  testId: string,
): Effect.Effect<
  Smoke.Bounds,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    const box = yield* settleUntil(
      painted(ctx, testId),
      (value) => value !== null,
    );
    return yield* ctx.expectSome(label, Option.fromNullishOr(box));
  });

/** Waits until `testId` stops painting, then asserts it. */
const expectGone = (
  ctx: Smoke.AsyncSmokeContext,
  label: string,
  testId: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const box = yield* settleUntil(
      painted(ctx, testId),
      (value) => value === null,
    );
    yield* ctx.expectEqual(label, box === null, true);
  });

/** Waits until `testId` holds the native focus, then asserts it. */
const expectFocused = (
  ctx: Smoke.AsyncSmokeContext,
  label: string,
  testId: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const focused = yield* settleUntil(
      ctx.host.focused(),
      (value) => value === testId,
    );
    yield* ctx.expectEqual(
      label,
      Option.getOrElse(Option.fromNullishOr(focused), () => "none"),
      testId,
    );
  });

/** Waits until the readout prints `expected`, then asserts it. */
const expectReadout = (
  ctx: Smoke.AsyncSmokeContext,
  label: string,
  expected: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const text = yield* settleUntil(
      ctx.host.text(APP_CHROME_IDS.readout),
      (value) => value === expected,
    );
    yield* ctx.expectEqual(label, text, expected);
  });

/** The status ink of one tone, as the theme's own role. */
const toneInk = (tone: StatusTone, theme: Theme): string =>
  statusTone(theme, tone).foreground;

/** How many pixels of `region` are `ink` within {@link TONE_TOLERANCE}. */
const countInk = (region: Pixels.Pixels, ink: Pixels.Rgba): number =>
  Arr.reduce(
    Arr.range(0, Math.floor(region.data.length / 4) - 1),
    0,
    (count, index) =>
      inkDistance(
        region.data[index * 4] ?? 0,
        region.data[index * 4 + 1] ?? 0,
        region.data[index * 4 + 2] ?? 0,
        ink,
      ) <= TONE_TOLERANCE
        ? count + 1
        : count,
  );

/** The ink count of a logical box inside a capture, or `0` when it is absent. */
const countInBox = (
  frame: Pixels.Pixels,
  scale: number,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
): number =>
  Option.match(
    Option.fromNullishOr(
      Pixels.crop(
        frame,
        new Pixels.PixelRegion({
          x: Math.round(box.x * scale),
          y: Math.round(box.y * scale),
          width: Math.round(box.width * scale),
          height: Math.round(box.height * scale),
        }),
      ),
    ),
    { onNone: () => 0, onSome: (region) => countInk(region, ink) },
  );

/** The leading or trailing slice of a box, as a box of its own. */
const sideOf = (
  box: Smoke.Bounds,
  side: "leading" | "trailing",
  width: number,
): Smoke.Bounds => ({
  x: side === "leading" ? box.x : box.x + box.width - width,
  y: box.y,
  width,
  height: box.height,
});

/** The theme the runner mounts the probe under. */
const THEME: Theme = palettes.dark;

/**
 * The status bar's two named tones, read out of one frame.
 *
 * The trailing slice must hold both inks and the leading slice neither: the
 * tones are roles, and a bar that painted the trailing group in the leading
 * colour — or painted nothing — fails by count.
 */
const expectToneInk = (
  ctx: Smoke.AsyncSmokeContext,
  box: Smoke.Bounds,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    yield* ctx.host.capture(FRAME);
    const frame = yield* ctx.host.pixels(FRAME);
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      `${FRAME} is the window at a whole device scale`,
      captureScale(frame, size),
    );
    const destructive = yield* ctx.expectSome(
      "the destructive tone's foreground role is paintable",
      Option.fromNullishOr(Pixels.hexToRgba(toneInk("destructive", THEME))),
    );
    const success = yield* ctx.expectSome(
      "the success tone's foreground role is paintable",
      Option.fromNullishOr(Pixels.hexToRgba(toneInk("success", THEME))),
    );
    const trailing = sideOf(box, "trailing", 200);
    const leading = sideOf(box, "leading", 200);

    yield* ctx.expectEqual(
      "the trailing group paints the destructive tone",
      countInBox(frame, scale, trailing, destructive) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the trailing group paints the success tone",
      countInBox(frame, scale, trailing, success) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the leading group paints neither tone",
      countInBox(frame, scale, leading, destructive) +
        countInBox(frame, scale, leading, success),
      0,
    );
  });

export const appChromeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(APP_CHROME_IDS.menuBar);
    yield* Effect.sleep(SETTLE);
    const blank = appChromeReadout({
      menu: "none",
      action: "none",
      menuReports: 0,
      actionReports: 0,
    });

    // 1. The bar is one row of triggers, and the initial readout hears nothing.
    yield* expectReadout(ctx, "the readout starts with no selection", blank);
    const file = yield* expectPainted(
      ctx,
      "the File trigger paints",
      triggerId("file"),
    );
    const edit = yield* expectPainted(
      ctx,
      "the Edit trigger paints",
      triggerId("edit"),
    );
    yield* ctx.expectEqual(
      "the triggers paint on one row",
      Math.round(edit.y),
      Math.round(file.y),
    );
    yield* ctx.expectEqual(
      "the triggers paint in menu order",
      edit.x > file.x + file.width - 1,
      true,
    );

    // 2. A press opens the dropdown below its trigger.
    yield* ctx.host.click(triggerId("file"));
    yield* Effect.sleep(SETTLE);
    const first = yield* expectPainted(
      ctx,
      "a press on File paints its dropdown",
      itemId("new"),
    );
    yield* ctx.expectEqual(
      "the dropdown paints below its trigger",
      first.y >= file.y + file.height - 2,
      true,
    );
    yield* ctx.expectContains(
      "the row paints its accelerator for the requested platform",
      yield* ctx.host.text(itemId("new")),
      "Ctrl",
    );
    yield* ctx.host.capture(OPEN_FRAME);

    // 3. Down lands on the first row and Enter reports it once. The highlight
    // is React state, so the key that runs it waits for the render it started.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* expectReadout(
      ctx,
      "Enter reports the highlighted row",
      appChromeReadout({
        menu: "file/new",
        action: "none",
        menuReports: 1,
        actionReports: 0,
      }),
    );
    yield* expectGone(ctx, "a chosen row closes the dropdown", itemId("new"));

    // 4. A second Down skips the disabled row.
    yield* ctx.host.click(triggerId("file"));
    yield* expectPainted(ctx, "the dropdown opens again", itemId("new"));
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* expectReadout(
      ctx,
      "Down skips the disabled row",
      appChromeReadout({
        menu: "file/save",
        action: "none",
        menuReports: 2,
        actionReports: 0,
      }),
    );
    yield* expectGone(
      ctx,
      "the second choice closes the dropdown",
      itemId("save"),
    );

    // 5. Right moves the open menu, and wraps past the disabled Help entry.
    yield* ctx.host.click(triggerId("file"));
    yield* expectPainted(
      ctx,
      "the File dropdown opens for the bar move",
      itemId("new"),
    );
    yield* ctx.host.key("right");
    yield* expectPainted(ctx, "Right opens the next menu", itemId("undo"));
    yield* expectGone(ctx, "the previous menu's rows unpaint", itemId("new"));
    yield* ctx.host.key("right");
    yield* expectPainted(
      ctx,
      "Right wraps past the disabled menu",
      itemId("new"),
    );
    yield* expectGone(ctx, "the skipped menu never paints", itemId("about"));

    // 6. Escape closes the surface and returns focus to the trigger.
    yield* ctx.host.key("escape");
    yield* expectGone(ctx, "Escape closes the dropdown", itemId("new"));
    yield* expectFocused(
      ctx,
      "Escape returns the focus to the trigger",
      triggerId("file"),
    );

    // 7. The toolbar's max splits its tail behind the overflow trigger.
    yield* expectPainted(ctx, "the first action paints", actionId("open"));
    yield* expectPainted(
      ctx,
      "a disabled action still paints",
      actionId("save"),
    );
    yield* expectPainted(
      ctx,
      "the last visible action paints",
      actionId("copy"),
    );
    yield* expectPainted(ctx, "the overflow trigger paints", OVERFLOW_ID);
    yield* expectGone(
      ctx,
      "the overflowed action paints nothing in the strip",
      actionId("link"),
    );

    // 8. Right moves the native focus, skipping the disabled action.
    yield* ctx.host.focusElement(actionId("open"));
    yield* ctx.host.key("right");
    yield* expectFocused(
      ctx,
      "Right moves the focus to the next enabled action",
      actionId("copy"),
    );
    yield* ctx.host.key("enter");
    yield* expectReadout(
      ctx,
      "Enter activates the focused action",
      appChromeReadout({
        menu: "file/save",
        action: "copy",
        menuReports: 2,
        actionReports: 1,
      }),
    );

    // 9. The overflow trigger opens the tail, and a row runs it.
    yield* ctx.host.key("right");
    yield* expectFocused(
      ctx,
      "Right reaches the overflow trigger",
      OVERFLOW_ID,
    );
    yield* ctx.host.key("enter");
    yield* expectPainted(
      ctx,
      "Enter opens the overflow menu",
      overflowItemId("link"),
    );
    yield* Effect.forEach(
      APP_CHROME_OVERFLOW,
      (action) =>
        expectPainted(
          ctx,
          `the overflow menu holds ${action}`,
          overflowItemId(action),
        ),
      { concurrency: 1 },
    );
    yield* ctx.host.click(overflowItemId("link"));
    yield* expectReadout(
      ctx,
      "an overflow row activates",
      appChromeReadout({
        menu: "file/save",
        action: "link",
        menuReports: 2,
        actionReports: 2,
      }),
    );
    yield* expectGone(
      ctx,
      "the overflow menu closes on a choice",
      overflowItemId("link"),
    );

    // 10. The trigger's own key closes the menu it opened. Escape is measured
    // as the gap it is: the surface never takes the focus, so the key reaches
    // the trigger and no handler owns it (the shell workstream's fix).
    yield* ctx.host.focusElement(OVERFLOW_ID);
    yield* ctx.host.key("enter");
    yield* expectPainted(
      ctx,
      "the overflow menu opens from the keyboard",
      overflowItemId("link"),
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* expectPainted(
      ctx,
      "Escape leaves the overflow open, because its surface never takes the focus",
      overflowItemId("link"),
    );
    yield* ctx.host.key("enter");
    yield* expectGone(
      ctx,
      "the trigger's own Enter closes it again",
      overflowItemId("link"),
    );

    // 11. The status bar paints both groups and the two tone roles.
    const status = yield* expectPainted(
      ctx,
      "the status bar paints",
      APP_CHROME_IDS.status,
    );
    yield* ctx.expectContains(
      "the status bar paints the leading group",
      yield* ctx.host.text(APP_CHROME_IDS.status),
      "Ln 12, Col 4",
    );
    yield* ctx.expectContains(
      "the status bar paints the trailing group",
      yield* ctx.host.text(APP_CHROME_IDS.status),
      "Lint passed",
    );
    yield* ctx.expectEqual(
      "the status bar is one row",
      status.height <= 40,
      true,
    );
    yield* expectToneInk(ctx, status);
  });

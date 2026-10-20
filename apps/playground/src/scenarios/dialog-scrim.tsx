/**
 * `dialog-scrim-pixels` / `live-dialog-scrim`: what does the shipped modal veil
 * actually paint?
 *
 * The bug being guarded: `DialogContent` and `DrawerContent` dim the window with
 * a backdrop `div` whose only visible property is `backgroundColor:
 * theme.colors.overlay`. **No scenario names either backdrop** — the modal
 * probes close with Escape and the drawer probe presses the veil's coordinates
 * to dismiss it — so a transparent veil, a veil sized to the surface or a veil
 * that never unmounts leaves the page readable behind a floating box and passes
 * every check.
 *
 * Plan `791` §1a measured a second, larger fact: the veil lives in an
 * `<anchored>` layer, and that layer is **opaque** on 0.10.0 (`#1A1A1A` with or
 * without `occlude`), so opening a modal replaces the window with `#090909`
 * instead of dimming the page. An in-window `absolute` layer composites over the
 * page correctly. This probe asserts the shipped behaviour *and* that recipe.
 *
 * Four states are decoded per host: closed, dialog, drawer, recipe, closed
 * again. The composites and the distinctness guards are pure
 * (`scrim-pixels.ts`); capture, scale mapping and comparison are the shared
 * chain in `frames.ts`.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import {
  Dialog,
  DialogContent,
  Drawer,
  DrawerContent,
} from "../../vendor/packages/components/src/index.js";
import { palettes } from "../palettes.js";
import { Body, Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import {
  TOLERANCE,
  captureHeadless,
  captureLive,
  expectPixel,
  parseColour,
  readAsync,
  readSync,
  type FrameReader,
} from "./frames.js";
import {
  ANCHORED_LAYER_BASE,
  distinctScrimRoles,
  routesDiffer,
  scrimFixtures,
  surfaceStandsOut,
  veiled,
  veilIsVisible,
} from "./scrim-pixels.js";

const PAGE_WIDTH = 200;
const PAGE_HEIGHT = 120;
const INSET = 24;

const ScrimProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [recipe, setRecipe] = useState(false);
  const page = {
    position: "absolute" as const,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  };
  return (
    <div
      testId="scrim-stage"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="scrim-page"
        style={{
          ...page,
          left: INSET,
          top: INSET,
          backgroundColor: theme.colors.primary,
        }}
      />
      <div
        testId="scrim-page-two"
        style={{
          ...page,
          left: window.width - PAGE_WIDTH - INSET,
          top: window.height - PAGE_HEIGHT - INSET,
          backgroundColor: theme.colors.success,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: INSET,
          top: INSET + PAGE_HEIGHT + INSET,
          display: "flex",
          gap: theme.spacing.sm,
        }}
      >
        <Pressable testId="scrim-open-dialog" onClick={() => setDialog(true)}>
          <Body>open dialog</Body>
        </Pressable>
        <Pressable testId="scrim-open-drawer" onClick={() => setDrawer(true)}>
          <Body>open drawer</Body>
        </Pressable>
        <Pressable testId="scrim-open-recipe" onClick={() => setRecipe(true)}>
          <Body>open recipe</Body>
        </Pressable>
      </div>
      <div
        style={{
          position: "absolute",
          left: INSET,
          top: INSET + PAGE_HEIGHT + INSET + 56,
        }}
      >
        <Readout testId="scrim-readout">
          {`dialog=${dialog ? "open" : "closed"} drawer=${
            drawer ? "open" : "closed"
          } recipe=${recipe ? "on" : "off"}`}
        </Readout>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent label="Scrim probe" testId="scrim-dialog">
          <div testId="scrim-dialog-blank" style={{ height: 40 }} />
        </DialogContent>
      </Dialog>
      <Drawer open={drawer} onOpenChange={setDrawer}>
        <DrawerContent
          side="right"
          label="Scrim probe drawer"
          testId="scrim-drawer"
        >
          <div testId="scrim-drawer-blank" style={{ height: 40 }} />
        </DrawerContent>
      </Drawer>
      {recipe ? (
        <div
          testId="scrim-recipe-layer"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: window.width,
            height: window.height,
            backgroundColor: theme.colors.overlay,
          }}
        >
          <div style={{ position: "absolute", left: INSET, top: 320 }}>
            <Pressable
              testId="scrim-close-recipe"
              onClick={() => setRecipe(false)}
            >
              <Body>close recipe</Body>
            </Pressable>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const scrimView = (): ReactNode => <ScrimProbe />;

/** The two hosts differ in their verbs' shape, not in what the probe asserts. */
interface ScrimDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
  readonly click: (testId: string) => Effect.Effect<void, E>;
  readonly escape: () => Effect.Effect<void, E>;
  readonly text: (testId: string) => Effect.Effect<string | null, E>;
}

/** A readout's text, or `"none"` so a failure names the absence. */
const readout = <E,>(
  driver: ScrimDriver<E>,
  testId: string,
): Effect.Effect<string, E> =>
  Effect.map(driver.text(testId), (value) =>
    Option.getOrElse(Option.fromNullishOr(value), () => "none"),
  );

/** An element that must not be painted (a closed modal surface or layer). */
const absent = <E,>(
  ctx: Pick<Smoke.SmokeContext, "expectEqual">,
  reader: FrameReader<E>,
  testId: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.flatMap(reader.bounds(testId), (bounds) =>
    ctx.expectEqual(
      `${testId} is not painted`,
      Option.isNone(Option.fromNullishOr(bounds)),
      true,
    ),
  );

const scrimChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: ScrimDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const colors = palettes.dark.colors;
    const fixtures = scrimFixtures(colors);
    const page = yield* parseColour("the page role parses", fixtures.page);
    const second = yield* parseColour(
      "the second page role parses",
      fixtures.second,
    );
    const modal = yield* parseColour("the modal role parses", fixtures.modal);
    const veil = yield* parseColour("the veil role parses", fixtures.veil);
    const base = yield* parseColour(
      "the anchored layer base parses",
      ANCHORED_LAYER_BASE,
    );

    const plane = veiled(veil, base);
    const dimPage = veiled(veil, page);
    const dimSecond = veiled(veil, second);

    yield* ctx.expectEqual(
      "the four painted roles are distinct",
      distinctScrimRoles(fixtures),
      true,
    );
    yield* ctx.expectEqual(
      "the veil is visible over the page",
      veilIsVisible(veil, page, TOLERANCE),
      true,
    );
    yield* ctx.expectEqual(
      "the veil is visible over the anchored base",
      veilIsVisible(veil, base, TOLERANCE),
      true,
    );
    yield* ctx.expectEqual(
      "the anchored plane and the in-window recipe are distinguishable",
      routesDiffer(veil, base, page, TOLERANCE),
      true,
    );
    yield* ctx.expectEqual(
      "the modal surface stands out from the veiled page",
      surfaceStandsOut(veil, page, modal, TOLERANCE),
      true,
    );

    const closed = yield* driver.capture();
    yield* expectPixel(
      ctx,
      "the closed page paints its token",
      driver.reader,
      closed,
      "scrim-page",
      page,
    );
    yield* expectPixel(
      ctx,
      "the second page panel paints its token",
      driver.reader,
      closed,
      "scrim-page-two",
      second,
    );
    yield* absent(ctx, driver.reader, "scrim-dialog");
    yield* absent(ctx, driver.reader, "scrim-drawer");
    yield* absent(ctx, driver.reader, "scrim-recipe-layer");
    yield* ctx.expectContains(
      "every overlay starts closed",
      yield* readout(driver, "scrim-readout"),
      "dialog=closed drawer=closed recipe=off",
    );

    yield* driver.click("scrim-open-dialog");
    yield* ctx.expectContains(
      "the trigger opened the dialog",
      yield* readout(driver, "scrim-readout"),
      "dialog=open",
    );
    const dialogFrame = yield* driver.capture();
    yield* expectPixel(
      ctx,
      "the dialog veil tints the anchored plane",
      driver.reader,
      dialogFrame,
      "scrim-page",
      plane,
    );
    yield* expectPixel(
      ctx,
      "the dialog veil spans the window",
      driver.reader,
      dialogFrame,
      "scrim-page-two",
      plane,
    );
    yield* expectPixel(
      ctx,
      "the dialog surface is not dimmed",
      driver.reader,
      dialogFrame,
      "scrim-dialog-blank",
      modal,
    );

    yield* driver.escape();
    yield* absent(ctx, driver.reader, "scrim-dialog");
    yield* ctx.expectContains(
      "Escape closed the dialog",
      yield* readout(driver, "scrim-readout"),
      "dialog=closed",
    );

    yield* driver.click("scrim-open-drawer");
    yield* ctx.expectContains(
      "the trigger opened the drawer",
      yield* readout(driver, "scrim-readout"),
      "drawer=open",
    );
    const drawerFrame = yield* driver.capture();
    yield* expectPixel(
      ctx,
      "the drawer veil tints the anchored plane",
      driver.reader,
      drawerFrame,
      "scrim-page",
      plane,
    );
    yield* expectPixel(
      ctx,
      "the drawer surface is not dimmed",
      driver.reader,
      drawerFrame,
      "scrim-drawer-blank",
      modal,
    );

    yield* driver.escape();
    yield* absent(ctx, driver.reader, "scrim-drawer");
    yield* ctx.expectContains(
      "Escape closed the drawer",
      yield* readout(driver, "scrim-readout"),
      "drawer=closed",
    );

    yield* driver.click("scrim-open-recipe");
    yield* ctx.expectContains(
      "the trigger mounted the in-window layer",
      yield* readout(driver, "scrim-readout"),
      "recipe=on",
    );
    const recipeFrame = yield* driver.capture();
    yield* expectPixel(
      ctx,
      "the in-window recipe dims the page",
      driver.reader,
      recipeFrame,
      "scrim-page",
      dimPage,
    );
    yield* expectPixel(
      ctx,
      "the in-window recipe spans the window",
      driver.reader,
      recipeFrame,
      "scrim-page-two",
      dimSecond,
    );

    yield* driver.click("scrim-close-recipe");
    yield* absent(ctx, driver.reader, "scrim-recipe-layer");
    yield* ctx.expectContains(
      "the recipe layer unmounted",
      yield* readout(driver, "scrim-readout"),
      "recipe=off",
    );

    const restored = yield* driver.capture();
    yield* expectPixel(
      ctx,
      "the page is undimmed after closing",
      driver.reader,
      restored,
      "scrim-page",
      page,
    );
    yield* expectPixel(
      ctx,
      "the second panel is undimmed after closing",
      driver.reader,
      restored,
      "scrim-page-two",
      second,
    );
  });

const headlessDriver = (host: Smoke.SmokeHost): ScrimDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
  click: (testId) => Effect.sync(() => host.click(testId)),
  escape: () => Effect.sync(() => host.key("escape")),
  text: (testId) => Effect.sync(() => host.text(testId)),
});

/** A window needs its commit before a read; the live verbs are Effects. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): ScrimDriver<Smoke.SmokeHostError> => ({
  reader: readAsync(host),
  capture: () =>
    Effect.flatMap(Effect.sleep(Duration.millis(120)), () => captureLive(host)),
  click: (testId) =>
    Effect.flatMap(host.click(testId), () =>
      Effect.sleep(Duration.millis(120)),
    ),
  escape: () =>
    Effect.flatMap(host.key("escape"), () =>
      Effect.sleep(Duration.millis(120)),
    ),
  text: host.text,
});

export const dialogScrimScenario: PlaygroundScenario = {
  id: "dialog-scrim-pixels",
  title: "The modal veil: the anchored plane, the surface and the dim recipe",
  capability: "modal",
  view: scrimView,
  steps: (ctx) => scrimChecks(ctx, headlessDriver(ctx.host)),
};

export const dialogScrimLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-dialog-scrim",
  title: "Live modal veil: the anchored plane, the surface and the recipe",
  capability: "modal",
  steps: (ctx) => scrimChecks(ctx, liveDriver(ctx.host)),
};

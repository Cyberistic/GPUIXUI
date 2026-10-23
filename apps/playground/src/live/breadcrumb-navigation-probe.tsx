/**
 * The `breadcrumb-navigation-lifecycle` probe: a trail in a pane that narrows,
 * plus the two answers to a budget the shipped component offers.
 *
 * Tier 4's **Breadcrumb navigation** row was `?` — a trail looked like
 * composition, but the composition has decisions nothing had measured. The
 * shipped list wraps (`flex-wrap`), so a trail wider than its pane grows a
 * second line instead of clipping, and the component's own collapse replaces
 * the middle with an ellipsis that is deliberately not a control. This probe
 * paints the **shipped** trail twice in the same pane:
 *
 * - **No budget**: all five levels, which is what the list does on its own.
 * - **Budgeted**: the app's own trail, budgeted from the pane's `onLayout`
 *   report, whose collapsed middle is a shipped `DropdownMenuTrigger` and whose
 *   menu rows are the hidden levels.
 *
 * The steps press the narrow width, prove the first trail wraps while the
 * second stays one row, then drive the collapsed middle from both inputs: a
 * press chooses a level and returns the focus to the trigger, and a keyboard
 * open lands on the first hidden level, steps with the arrows and chooses one.
 *
 * The view and the steps live here so the measurement is one module; the
 * registry and `liveProbeBodies` name it.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gpuixui/components";
import { Button } from "@gpuixui/primitives";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import {
  BREADCRUMB_FRAMES,
  BREADCRUMB_IDS,
  BREADCRUMB_LEVELS,
  BREADCRUMB_START,
  BREADCRUMB_TARGET,
  BREADCRUMB_WIDTHS,
  breadcrumbReadout,
  budgetFor,
  ellipsisPaint,
  levelAt,
  pagePaint,
  panePaint,
  trailView,
  type BreadcrumbPane,
} from "./breadcrumb-navigation.js";
import { captureScale, colourAt, differs, type Point } from "./frame.js";

/** A press and the layout pass it causes need a frame to commit. */
const SETTLE = Duration.millis(60);

/** How long a poll waits for a transition, in 20ms samples. */
const POLLS = 100;

/** The pane that holds both trails. */
export const BreadcrumbNavigationProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [pane, setPane] = useState<BreadcrumbPane>("wide");
  // The budget is derived from the pane's own report, never from the state that
  // asked for a width: a trail budgeted from a constant would pass at one width
  // and overflow at the other.
  const [measured, setMeasured] = useState(0);
  const [page, setPage] = useState<number>(BREADCRUMB_START);
  const [selected, setSelected] = useState("none");
  const budget = budgetFor(measured);
  const trail = trailView(page, budget);
  const choose = (index: number): void => {
    setPage(index);
    setSelected(levelAt(index));
  };

  return (
    <div
      testId={BREADCRUMB_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.lg,
        backgroundColor: pagePaint(theme),
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        One pane, two trails: the shipped trail with no budget, and the same
        trail budgeted from the pane&apos;s own layout report, whose collapsed
        middle is the menu that reaches the levels the budget hides.
      </text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <Button testId={BREADCRUMB_IDS.wide} onClick={() => setPane("wide")}>
          Wide pane
        </Button>
        <Button
          testId={BREADCRUMB_IDS.narrow}
          onClick={() => setPane("narrow")}
        >
          Narrow pane
        </Button>
        <Readout testId={BREADCRUMB_IDS.readout}>
          {breadcrumbReadout(measured, page, selected)}
        </Readout>
      </div>
      <div
        testId={BREADCRUMB_IDS.pane}
        onLayout={(payload) => setMeasured(payload.width ?? 0)}
        style={{
          width: BREADCRUMB_WIDTHS[pane],
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
          backgroundColor: panePaint(theme),
          borderRadius: theme.radius.md,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          No budget
        </text>
        <Breadcrumb>
          <BreadcrumbList testId={BREADCRUMB_IDS.referenceList}>
            {Arr.map(BREADCRUMB_LEVELS, (level, index) => (
              <BreadcrumbItem key={level}>
                {index === BREADCRUMB_START ? (
                  <BreadcrumbPage testId={BREADCRUMB_IDS.referenceCrumb(index)}>
                    {level}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink testId={BREADCRUMB_IDS.referenceCrumb(index)}>
                    {level}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Budgeted from the pane
        </text>
        <Breadcrumb>
          <BreadcrumbList testId={BREADCRUMB_IDS.appList}>
            {Arr.map(trail.visible, (index, position) => (
              <BreadcrumbItem key={index}>
                {position === 0 ? (
                  <BreadcrumbLink
                    testId={BREADCRUMB_IDS.appCrumb(index)}
                    onSelect={() => choose(index)}
                  >
                    {levelAt(index)}
                  </BreadcrumbLink>
                ) : index === page ? (
                  <BreadcrumbPage testId={BREADCRUMB_IDS.appCrumb(index)}>
                    {levelAt(index)}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    testId={BREADCRUMB_IDS.appCrumb(index)}
                    onSelect={() => choose(index)}
                  >
                    {levelAt(index)}
                  </BreadcrumbLink>
                )}
                {position === 0 && trail.hidden.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      testId={BREADCRUMB_IDS.more}
                      variant="ghost"
                      size="sm"
                      aria-label="Show the hidden levels"
                    >
                      <text
                        style={{
                          ...textStyle(theme, "body"),
                          color: ellipsisPaint(theme),
                        }}
                      >
                        …
                      </text>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      label="Hidden levels"
                      testId={BREADCRUMB_IDS.menu}
                    >
                      {Arr.map(trail.hidden, (hidden) => (
                        <DropdownMenuItem
                          key={hidden}
                          testId={BREADCRUMB_IDS.hiddenRow(hidden)}
                          onSelect={() => choose(hidden)}
                        >
                          {levelAt(hidden)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <Button
        testId={BREADCRUMB_IDS.after}
        onClick={() => {
          setPane("wide");
          setPage(BREADCRUMB_START);
          setSelected("none");
        }}
      >
        Reset the trail
      </Button>
    </div>
  );
};

/** The painted box of `testId`, failing by name when the runtime omitted it. */
const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<
  Smoke.Bounds,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

/** Whether `testId` paints nothing. */
const unpainted = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.bounds(testId), (bounds) =>
    Option.isNone(Option.fromNullishOr(bounds)),
  );

/** The focused element's id, or `"none"` when the window holds no focus. */
const focusedId = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.focused(), (id) =>
    Option.getOrElse(Option.fromNullishOr(id), () => "none"),
  );

/**
 * Waits until `testId`'s text is `wanted`, and reports whether it arrived.
 *
 * The pane's budget moves only after a layout pass, which a state change plus a
 * press do not complete in one frame; polling for the readout keeps the check
 * about the budget rather than about the pass's duration.
 */
const settleText = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
  wanted: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> => {
  const attempt = (
    remaining: number,
  ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
    Effect.gen(function* () {
      const text = yield* ctx.host.text(testId);
      if (text === wanted) return true;
      if (remaining <= 0) return false;
      yield* Effect.sleep(Duration.millis(20));
      return yield* attempt(remaining - 1);
    });
  return attempt(POLLS);
};

/** Waits until `testId` paints, and reports whether it did. */
const settlePainted = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> => {
  const attempt = (
    remaining: number,
  ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
    Effect.gen(function* () {
      const box = yield* ctx.host.bounds(testId);
      if (Option.isSome(Option.fromNullishOr(box))) return true;
      if (remaining <= 0) return false;
      yield* Effect.sleep(Duration.millis(20));
      return yield* attempt(remaining - 1);
    });
  return attempt(POLLS);
};

/** Waits until `testId` paints nothing, and reports whether it stopped. */
const settleGone = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> => {
  const attempt = (
    remaining: number,
  ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
    Effect.gen(function* () {
      const box = yield* ctx.host.bounds(testId);
      if (Option.isNone(Option.fromNullishOr(box))) return true;
      if (remaining <= 0) return false;
      yield* Effect.sleep(Duration.millis(20));
      return yield* attempt(remaining - 1);
    });
  return attempt(POLLS);
};

/** A capture and the scale its logical points convert by. */
const capture = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<
  { readonly pixels: Pixels.Pixels; readonly scale: number },
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    yield* ctx.host.capture(name);
    const pixels = yield* ctx.host.pixels(name);
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      `${name} is the window at a whole device scale`,
      captureScale(pixels, size),
    );
    return { pixels, scale };
  });

/** A logical point in the window. */
const at = (box: Smoke.Bounds, dx: number, dy: number): Point => ({
  x: box.x + dx,
  y: box.y + dy,
});

export const breadcrumbNavigationSteps: Smoke.AsyncSmokeScenario["steps"] = (
  ctx,
) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(BREADCRUMB_IDS.pane);

    const readout = () => ctx.host.text(BREADCRUMB_IDS.readout);
    const shown = (width: number, page: number, selected: string) =>
      breadcrumbReadout(width, page, selected);
    const deep = levelAt(BREADCRUMB_START);

    /** A capture's colour at a logical point, failing by name if outside it. */
    const sample = (
      frame: { readonly pixels: Pixels.Pixels; readonly scale: number },
      point: Point,
      label: string,
    ) => ctx.expectSome(label, colourAt(frame.pixels, point, frame.scale));

    // 1. The pane reports the wide width, and the budget follows it: every
    //    level paints and nothing is hidden.
    const wide = shown(BREADCRUMB_WIDTHS.wide, BREADCRUMB_START, "none");
    yield* ctx.expectEqual(
      "the wide pane's own report sets the budget",
      yield* settleText(ctx, BREADCRUMB_IDS.readout, wide),
      true,
    );
    yield* ctx.expectEqual(
      "the readout prints the width the pane reported",
      yield* readout(),
      wide,
    );
    const wideReference = yield* paintedBox(ctx, BREADCRUMB_IDS.referenceList);
    yield* Effect.forEach(
      Arr.range(0, BREADCRUMB_START),
      (index) =>
        Effect.flatMap(ctx.host.bounds(BREADCRUMB_IDS.appCrumb(index)), (box) =>
          ctx.expectSome(
            `the wide pane paints level ${index}`,
            Option.fromNullishOr(box),
          ),
        ),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "a trail that fits paints no collapsed middle",
      yield* unpainted(ctx, BREADCRUMB_IDS.more),
      true,
    );
    yield* ctx.expectEqual(
      "the trail's current page is the deepest level",
      yield* ctx.host.text(BREADCRUMB_IDS.appCrumb(BREADCRUMB_START)),
      deep,
    );
    yield* ctx.expectEqual(
      "the unbudgeted trail starts as one row",
      wideReference.height ===
        (yield* paintedBox(ctx, BREADCRUMB_IDS.appList)).height,
      true,
    );
    yield* capture(ctx, BREADCRUMB_FRAMES.wide);

    // 2. A press narrows the pane, the layout report changes, and the budget
    //    with it: the middle leaves the trail and the trigger takes its place.
    yield* ctx.host.click(BREADCRUMB_IDS.narrow);
    const narrow = shown(BREADCRUMB_WIDTHS.narrow, BREADCRUMB_START, "none");
    yield* ctx.expectEqual(
      "a press on the narrow control re-lays the pane",
      yield* settleText(ctx, BREADCRUMB_IDS.readout, narrow),
      true,
    );
    yield* ctx.expectContains(
      "the budget follows the measured width",
      yield* readout(),
      `w=${BREADCRUMB_WIDTHS.narrow} budget=${budgetFor(BREADCRUMB_WIDTHS.narrow)}`,
    );
    yield* ctx.expectEqual(
      "the root and the current page stay in the narrow trail",
      yield* Effect.map(
        Effect.forEach(
          [0, BREADCRUMB_START],
          (index) => ctx.host.bounds(BREADCRUMB_IDS.appCrumb(index)),
          { concurrency: 1 },
        ),
        (boxes) =>
          Arr.every(boxes, (box) => Option.isSome(Option.fromNullishOr(box))),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the levels the budget hides leave the trail",
      yield* Effect.map(
        Effect.forEach(
          [1, 2, 3],
          (index) => unpainted(ctx, BREADCRUMB_IDS.appCrumb(index)),
          { concurrency: 1 },
        ),
        (gone) => Arr.every(gone, (item) => item),
      ),
      true,
    );
    const trigger = yield* paintedBox(ctx, BREADCRUMB_IDS.more);
    yield* ctx.expectEqual(
      "the collapsed middle's trigger reaches the press floor",
      trigger.height >= BREADCRUMB_TARGET,
      true,
    );
    yield* ctx.expectEqual(
      "the budgeted trail paints one row, the height of its trigger",
      Math.abs(
        (yield* paintedBox(ctx, BREADCRUMB_IDS.appList)).height -
          trigger.height,
      ) <= 1,
      true,
    );
    const narrowReference = yield* paintedBox(
      ctx,
      BREADCRUMB_IDS.referenceList,
    );
    yield* ctx.expectEqual(
      "the unbudgeted trail wraps to a second row at the same width",
      narrowReference.height > wideReference.height + 8,
      true,
    );
    yield* ctx.expectEqual(
      "the narrow pane keeps the current level painted",
      yield* ctx.host.text(BREADCRUMB_IDS.appCrumb(BREADCRUMB_START)),
      deep,
    );
    const narrowFrame = yield* capture(ctx, BREADCRUMB_FRAMES.narrow);
    const pane = yield* paintedBox(ctx, BREADCRUMB_IDS.pane);
    const paneSurface = yield* ctx.expectSome(
      "the pane's own fill is a paintable colour",
      Option.fromNullishOr(Pixels.hexToRgba(panePaint(palettes.dark))),
    );
    const behind = yield* sample(
      narrowFrame,
      at(pane, 2, pane.height - 2),
      "the narrow capture holds the pane's bottom edge",
    );
    yield* ctx.expectEqual(
      "the pane behind both trails paints its own fill",
      differs(behind, paneSurface),
      false,
    );

    // 3. The trigger is the trail's second tab stop: the root, then the menu —
    //    a level inside a budget is reachable with no measurement of its own.
    yield* ctx.host.focusElement(BREADCRUMB_IDS.appCrumb(0));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the root crumb is a real tab stop",
      yield* focusedId(ctx),
      BREADCRUMB_IDS.appCrumb(0),
    );
    yield* ctx.host.focusNext();
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the next tab stop is the collapsed middle's trigger",
      yield* focusedId(ctx),
      BREADCRUMB_IDS.more,
    );

    // 4. A press opens the shipped menu and choosing a level keeps the trail
    //    collapsed around the chosen page, so the trigger survives.
    yield* ctx.host.click(BREADCRUMB_IDS.more);
    yield* ctx.expectEqual(
      "a press on the trigger paints the hidden levels",
      yield* settlePainted(ctx, BREADCRUMB_IDS.menu),
      true,
    );
    yield* ctx.host.capture(BREADCRUMB_FRAMES.menu);
    yield* ctx.host.click(BREADCRUMB_IDS.hiddenRow(3));
    yield* ctx.expectEqual(
      "a chosen hidden level unpaints the menu",
      yield* settleGone(ctx, BREADCRUMB_IDS.menu),
      true,
    );
    const chosen = shown(BREADCRUMB_WIDTHS.narrow, 3, levelAt(3));
    yield* ctx.expectEqual(
      "a press reaches the level the budget hid",
      yield* settleText(ctx, BREADCRUMB_IDS.readout, chosen),
      true,
    );
    yield* ctx.expectEqual(
      "the chosen level becomes the trail's current page",
      yield* ctx.host.text(BREADCRUMB_IDS.appCrumb(3)),
      levelAt(3),
    );
    yield* ctx.expectEqual(
      "the trigger survives while levels remain hidden",
      yield* unpainted(ctx, BREADCRUMB_IDS.more),
      false,
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "choosing a level returns the focus to the trigger",
      yield* focusedId(ctx),
      BREADCRUMB_IDS.more,
    );

    // 5. A keyboard open lands on the first hidden level, the arrows move real
    //    focus and Enter chooses; the path now fits, so the trigger leaves.
    yield* ctx.host.key("enter");
    yield* ctx.expectEqual(
      "a keyboard open paints the hidden levels",
      yield* settlePainted(ctx, BREADCRUMB_IDS.menu),
      true,
    );
    yield* ctx.expectEqual(
      "a keyboard open lands on the first hidden level",
      yield* focusedId(ctx),
      BREADCRUMB_IDS.hiddenRow(1),
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key moves focus to the next hidden level",
      yield* focusedId(ctx),
      BREADCRUMB_IDS.hiddenRow(2),
    );
    yield* ctx.host.key("enter");
    yield* ctx.expectEqual(
      "the chosen level closes the menu",
      yield* settleGone(ctx, BREADCRUMB_IDS.menu),
      true,
    );
    const leaf = shown(BREADCRUMB_WIDTHS.narrow, 2, levelAt(2));
    yield* ctx.expectEqual(
      "Enter chooses the focused hidden level",
      yield* settleText(ctx, BREADCRUMB_IDS.readout, leaf),
      true,
    );
    yield* ctx.expectEqual(
      "the trail paints the chosen page",
      yield* ctx.host.text(BREADCRUMB_IDS.appCrumb(2)),
      levelAt(2),
    );
    yield* ctx.expectEqual(
      "a path that fits paints no collapsed middle",
      yield* unpainted(ctx, BREADCRUMB_IDS.more),
      true,
    );

    // 6. The keyboard continues from the trail's last stop to the control after
    //    it: a trail is a row of stops, not the end of the window's order.
    yield* ctx.host.focusElement(BREADCRUMB_IDS.appCrumb(1));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the trail's middle level is a real tab stop",
      yield* focusedId(ctx),
      BREADCRUMB_IDS.appCrumb(1),
    );
    yield* ctx.host.focusNext();
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the keyboard continues past the trail into the next control",
      yield* focusedId(ctx),
      BREADCRUMB_IDS.after,
    );
    yield* ctx.expectEqual(
      "the trail is one row after the budget is met",
      (yield* paintedBox(ctx, BREADCRUMB_IDS.appList)).height <
        wideReference.height + 8,
      true,
    );
  });

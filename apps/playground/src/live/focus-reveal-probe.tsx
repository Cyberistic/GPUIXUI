import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { useGpuix, useWindowSize } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import type { EventPayload } from "@gpuix/native";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import {
  Button,
  ScrollArea,
  ThemeProvider as PrimitiveThemeProvider,
} from "@gpuixui/primitives";
import { palettes } from "../palettes.js";
import { Pressable, Readout } from "../ui.js";
import { countPaint, type PaintBox } from "./box-paint.js";
import { captureScale } from "./frame.js";
import {
  FOCUS_REVEAL_BELOW,
  FOCUS_REVEAL_END,
  FOCUS_REVEAL_IDS,
  FOCUS_REVEAL_LAST,
  FOCUS_REVEAL_MARK,
  FOCUS_REVEAL_PANE,
  FOCUS_REVEAL_ROW,
  focusRevealReadout,
  formRowId,
  insidePane,
  revealOffset,
  rovingRowId,
} from "./focus-reveal.js";

const SETTLE = Duration.millis(40);

const HIDDEN_CAPTURE = "focus-reveal-hidden";

const REVEALED_CAPTURE = "focus-reveal-revealed";

const TRAVERSAL_LIMIT = 14;

const focusedIdOf = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.focused(), (id) =>
    Option.getOrElse(Option.fromNullishOr(id), () => "none"),
  );

const settledFocused = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.flatMap(Effect.sleep(SETTLE), () => focusedIdOf(ctx));

const traverseUntil = (
  ctx: Smoke.AsyncSmokeContext,
  id: string,
  limit: number,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  limit === 0
    ? settledFocused(ctx)
    : Effect.gen(function* () {
        yield* ctx.host.focusNext();
        yield* Effect.sleep(SETTLE);
        const at = yield* focusedIdOf(ctx);
        return at === id ? at : yield* traverseUntil(ctx, id, limit - 1);
      });

const pressKey = (
  ctx: Smoke.AsyncSmokeContext,
  key: string,
  times: number,
): Effect.Effect<void, Smoke.SmokeHostError> =>
  times === 0
    ? Effect.void
    : Effect.flatMap(ctx.host.key(key), () =>
        Effect.flatMap(Effect.sleep(SETTLE), () =>
          pressKey(ctx, key, times - 1),
        ),
      );

const offsetOf = (
  ctx: Smoke.AsyncSmokeContext,
  id: string,
): Effect.Effect<
  Smoke.Offset,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `${id} reports a scroll offset`,
      Option.fromNullishOr(yield* ctx.host.scrollOffset(id)),
    );
  });

const boxOf = (
  ctx: Smoke.AsyncSmokeContext,
  id: string,
): Effect.Effect<
  {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `${id} reports its painted box`,
      Option.fromNullishOr(yield* ctx.host.bounds(id)),
    );
  });

const RovingRow = ({
  index,
  cursor,
  instance,
  onKey,
}: {
  readonly index: number;
  readonly cursor: number;
  readonly instance: (element: PublicInstance | null) => void;
  readonly onKey: (event: EventPayload) => void;
}): ReactNode => {
  const theme = useTheme();
  const last = index === FOCUS_REVEAL_LAST;
  return (
    <div
      testId={rovingRowId(index)}
      ref={instance}
      tabIndex={index === cursor ? 0 : -1}
      role="option"
      aria-selected={index === cursor}
      onKeyDown={onKey}
      style={{
        height: FOCUS_REVEAL_ROW,
        display: "flex",
        alignItems: "center",
        padding: theme.spacing.sm,
        backgroundColor: last ? FOCUS_REVEAL_MARK : theme.colors.input,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {`row ${index}`}
      </text>
    </div>
  );
};

const RovingList = ({
  cursor,
  onMove,
}: {
  readonly cursor: number;
  readonly onMove: (next: number) => void;
}): ReactNode => {
  const renderer = useGpuix().renderer;
  const rows = useRef<Array<PublicInstance | null>>([]);

  useLayoutEffect(() => {
    const row = rows.current[cursor];
    if (row === null || row === undefined) return;
    renderer?.focusElement?.(row.id);
    renderer?.scrollIntoView?.(row.id);
  }, [cursor, renderer]);

  const onKey = (event: EventPayload): void => {
    if (event.key === "down") onMove(cursor + 1);
    else if (event.key === "up") onMove(cursor - 1);
  };

  return (
    <ScrollArea
      axis="vertical"
      label="Roving rows"
      viewportTestId={FOCUS_REVEAL_IDS.roving}
      style={{
        width: FOCUS_REVEAL_PANE.width,
        height: FOCUS_REVEAL_PANE.height,
      }}
    >
      {Array.from({ length: FOCUS_REVEAL_LAST + 1 }, (_, index) => (
        <RovingRow
          key={index}
          index={index}
          cursor={cursor}
          instance={(element) => {
            rows.current[index] = element;
          }}
          onKey={onKey}
        />
      ))}
    </ScrollArea>
  );
};

export const FocusRevealProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [cursor, setCursor] = useState(0);
  const [keys, setKeys] = useState(0);

  return (
    <div
      testId={FOCUS_REVEAL_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A form taller than its pane and a roving list beside it: what a keyboard
        focus past the fold does to the scroll offset, and what the row paints.
      </text>
      <Pressable testId={FOCUS_REVEAL_IDS.before}>before the panes</Pressable>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <text
              style={{
                ...textStyle(theme, "label"),
                color: theme.colors.foreground,
              }}
            >
              form
            </text>
            <ScrollArea
              axis="vertical"
              label="Form rows"
              viewportTestId={FOCUS_REVEAL_IDS.form}
              style={{
                width: FOCUS_REVEAL_PANE.width,
                height: FOCUS_REVEAL_PANE.height,
              }}
            >
              {Array.from({ length: FOCUS_REVEAL_LAST + 1 }, (_, index) => (
                <Button
                  key={index}
                  testId={formRowId(index)}
                  variant="secondary"
                  fullWidth
                  style={{
                    height: FOCUS_REVEAL_ROW,
                    borderRadius: 0,
                    backgroundColor:
                      index === FOCUS_REVEAL_LAST
                        ? FOCUS_REVEAL_MARK
                        : theme.colors.input,
                  }}
                >
                  {`row ${index}`}
                </Button>
              ))}
            </ScrollArea>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <text
              style={{
                ...textStyle(theme, "label"),
                color: theme.colors.foreground,
              }}
            >
              roving
            </text>
            <RovingList
              cursor={cursor}
              onMove={(next) => {
                setCursor(Math.max(0, Math.min(FOCUS_REVEAL_LAST, next)));
                setKeys((count) => count + 1);
              }}
            />
          </div>
        </div>
      </PrimitiveThemeProvider>
      <Readout testId={FOCUS_REVEAL_IDS.readout}>
        {focusRevealReadout(cursor, keys)}
      </Readout>
    </div>
  );
};

const markIn = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  scale: number,
  pane: PaintBox,
  label: string,
): Effect.Effect<number, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  ctx.expectSome(
    `the ${label} pane is in the capture`,
    countPaint(frame, pane, scale, FOCUS_REVEAL_MARK),
  );

export const focusRevealSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(FOCUS_REVEAL_IDS.probe);
    yield* Effect.sleep(SETTLE);

    yield* ctx.host.focusElement(FOCUS_REVEAL_IDS.before);
    yield* ctx.expectEqual(
      "the control before the panes takes the focus",
      yield* settledFocused(ctx),
      FOCUS_REVEAL_IDS.before,
    );
    yield* ctx.expectEqual(
      "the form pane opens at its first row",
      (yield* offsetOf(ctx, FOCUS_REVEAL_IDS.form)).y,
      0,
    );

    yield* ctx.expectEqual(
      "a native traversal reaches the control below the fold",
      yield* traverseUntil(ctx, formRowId(FOCUS_REVEAL_LAST), TRAVERSAL_LIMIT),
      formRowId(FOCUS_REVEAL_LAST),
    );
    yield* ctx.expectEqual(
      "the pane does not move for the control it focused",
      (yield* offsetOf(ctx, FOCUS_REVEAL_IDS.form)).y,
      0,
    );
    const formPane = yield* boxOf(ctx, FOCUS_REVEAL_IDS.form);
    const lastFormRow = yield* boxOf(ctx, formRowId(FOCUS_REVEAL_LAST));
    yield* ctx.expectEqual(
      "the focused control starts below the pane's bottom edge",
      lastFormRow.y >= formPane.y + formPane.height,
      true,
    );

    yield* ctx.host.focusElement(formRowId(0));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a code focus on the first row leaves the pane at the top",
      (yield* offsetOf(ctx, FOCUS_REVEAL_IDS.form)).y,
      0,
    );
    yield* ctx.host.focusElement(formRowId(FOCUS_REVEAL_LAST));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a code focus on the last row does not reveal it either",
      (yield* offsetOf(ctx, FOCUS_REVEAL_IDS.form)).y,
      0,
    );

    yield* ctx.host.capture(HIDDEN_CAPTURE);
    const hidden = yield* ctx.host.pixels(HIDDEN_CAPTURE);
    const window = yield* ctx.host.windowSize();
    const hiddenScale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(hidden, window),
    );
    const rovingPane = yield* boxOf(ctx, FOCUS_REVEAL_IDS.roving);
    const hiddenFormMark = yield* markIn(
      ctx,
      hidden,
      hiddenScale,
      formPane,
      "form",
    );
    yield* ctx.expectEqual(
      `the focused control paints nothing inside its pane (${hiddenFormMark} px)`,
      hiddenFormMark,
      0,
    );
    const hiddenRovingMark = yield* markIn(
      ctx,
      hidden,
      hiddenScale,
      rovingPane,
      "roving",
    );
    yield* ctx.expectEqual(
      `the roving list's last row is out of sight before a key moves onto it (${hiddenRovingMark} px)`,
      hiddenRovingMark,
      0,
    );

    yield* ctx.expectEqual(
      "the roving list's cursor row takes the focus",
      yield* traverseUntil(ctx, rovingRowId(0), TRAVERSAL_LIMIT),
      rovingRowId(0),
    );
    yield* ctx.expectEqual(
      "the roving list opens on its first row",
      yield* ctx.host.text(FOCUS_REVEAL_IDS.readout),
      focusRevealReadout(0, 0),
    );
    yield* ctx.expectEqual(
      "the roving list starts at the origin",
      (yield* offsetOf(ctx, FOCUS_REVEAL_IDS.roving)).y,
      0,
    );

    yield* pressKey(ctx, "down", FOCUS_REVEAL_BELOW);
    yield* ctx.expectEqual(
      "the arrows move the cursor and the readout follows",
      yield* ctx.host.text(FOCUS_REVEAL_IDS.readout),
      focusRevealReadout(FOCUS_REVEAL_BELOW, FOCUS_REVEAL_BELOW),
    );
    yield* ctx.expectEqual(
      "the row the key reached holds the focus",
      yield* settledFocused(ctx),
      rovingRowId(FOCUS_REVEAL_BELOW),
    );
    const predicted = yield* ctx.expectSome(
      "the third row needs a scroll of its own height",
      revealOffset(FOCUS_REVEAL_BELOW, 0),
    );
    const revealed = yield* offsetOf(ctx, FOCUS_REVEAL_IDS.roving);
    yield* ctx.expectNear(
      `the reveal lands where a minimal reveal puts it (y=${revealed.y})`,
      revealed.y,
      predicted,
      1,
    );
    const row3 = yield* boxOf(ctx, rovingRowId(FOCUS_REVEAL_BELOW));
    yield* ctx.expectEqual(
      "the revealed row is wholly inside its pane",
      insidePane(row3, rovingPane),
      true,
    );

    yield* pressKey(ctx, "down", FOCUS_REVEAL_LAST - FOCUS_REVEAL_BELOW);
    yield* ctx.expectEqual(
      "the remaining arrows reach the last row",
      yield* ctx.host.text(FOCUS_REVEAL_IDS.readout),
      focusRevealReadout(FOCUS_REVEAL_LAST, FOCUS_REVEAL_LAST),
    );
    yield* ctx.expectEqual(
      "the last row holds the focus",
      yield* settledFocused(ctx),
      rovingRowId(FOCUS_REVEAL_LAST),
    );
    const clamped = yield* offsetOf(ctx, FOCUS_REVEAL_IDS.roving);
    yield* ctx.expectEqual(
      "the reveal stops at the content's end",
      clamped.y,
      FOCUS_REVEAL_END,
    );
    const lastRovingRow = yield* boxOf(ctx, rovingRowId(FOCUS_REVEAL_LAST));
    yield* ctx.expectEqual(
      "the last row is wholly inside its pane",
      insidePane(lastRovingRow, rovingPane),
      true,
    );

    yield* pressKey(ctx, "down", 1);
    yield* ctx.expectEqual(
      "an arrow past the end keeps the cursor",
      yield* ctx.host.text(FOCUS_REVEAL_IDS.readout),
      focusRevealReadout(FOCUS_REVEAL_LAST, FOCUS_REVEAL_LAST + 1),
    );
    yield* ctx.expectEqual(
      "an arrow past the end keeps the offset",
      (yield* offsetOf(ctx, FOCUS_REVEAL_IDS.roving)).y,
      clamped.y,
    );

    yield* ctx.host.capture(REVEALED_CAPTURE);
    const shown = yield* ctx.host.pixels(REVEALED_CAPTURE);
    const shownScale = yield* ctx.expectSome(
      "the second capture is the window at a whole device scale",
      captureScale(shown, window),
    );
    const shownMark = yield* markIn(
      ctx,
      shown,
      shownScale,
      rovingPane,
      "roving",
    );
    yield* ctx.expectEqual(
      `the revealed row paints inside its pane (${shownMark} px)`,
      shownMark > 0,
      true,
    );
    const shownFormMark = yield* markIn(
      ctx,
      shown,
      shownScale,
      formPane,
      "form",
    );
    yield* ctx.expectEqual(
      `the form's control is still out of sight in the same frame (${shownFormMark} px)`,
      shownFormMark,
      0,
    );
  });

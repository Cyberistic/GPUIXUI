/**
 * The `mention-input-lifecycle` probe: the shipped `MentionInput` in a real
 * window.
 *
 * The component derives its query from the field's text, ranks the rows the
 * caller declares and paints the highlighted one in the theme's `accent`. Its
 * behaviour suite reads `aria-selected` and fires presses into a `TestRenderer`;
 * three of its claims are a window's to prove: the suggestion list is a
 * **floating layer** placed one gap below the field, the highlight is paint (an
 * `aria-selected` attribute never reaches a window's accessibility tree), and a
 * press on a row runs the window's own hit test because the layer sits outside
 * the field's element.
 *
 * The second half is the dismissal. A list that leaves keeps the rows it was
 * dismissed with and drops its tab stops, so the probe reads the departing rows
 * in a frame rather than trusting the unmount, and the disabled twin proves a
 * locked field never opens a list at all.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactElement, type ReactNode } from "react";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "@gpuixui/components";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { settleUntil } from "./settle.js";
import {
  AT_KEY,
  DISMISS_QUERY,
  ENTRY_SETTLE_MS,
  FIRST_INSERTION,
  listId,
  MENTION_ACCENT_FLOOR,
  MENTION_IDS,
  MENTION_PEOPLE,
  mentionReadout,
  PRESS_QUERY,
  PRESSED_INSERTION,
  rowId,
  rowRegion,
  SECOND_INSERTION,
  SECOND_QUERY,
  type MentionState,
} from "./mention-input.js";

/** A list paints one frame behind the keystroke that opened it. */
const SETTLE = Duration.millis(40);

/** The captures a reader can look at. */
const OPEN = "mention-open";
const SECOND = "mention-second";
const FILTERED = "mention-filtered";
const DISMISS = "mention-dismiss";

/** The theme's accent, the fill the highlighted row paints. */
const ACCENT = palettes.dark.colors.accent;

/** The people a field offers, so both instances paint the same rows. */
const rows = (field: string): ReadonlyArray<ReactElement> =>
  Arr.map(MENTION_PEOPLE, (person) => (
    <MentionInputItem
      key={person.value}
      testId={rowId(field, person.value)}
      value={person.value}
      label={person.label}
    />
  ));

/** The probe's window: an editable field and a locked twin. */
export const MentionInputProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState(0);
  const state: MentionState = { text, mentions };

  return (
    <div
      testId={MENTION_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        A mention field offers its people in a floating list below the field,
        paints the row the arrows reach in the theme's accent, and keeps the
        rows it was dismissed with while they leave.
      </text>
      <Readout testId={MENTION_IDS.readout}>{mentionReadout(state)}</Readout>
      <div testId={MENTION_IDS.frame} style={{ width: 320 }}>
        <MentionInput
          testId={MENTION_IDS.enabled}
          label="Assign a reviewer"
          placeholder="Type @ to mention"
          value={text}
          onValueChange={setText}
          onMention={() => setMentions((count) => count + 1)}
        >
          <MentionInputList testId={listId(MENTION_IDS.enabled)}>
            {rows(MENTION_IDS.enabled)}
          </MentionInputList>
        </MentionInput>
      </div>
      <div style={{ width: 320 }}>
        <MentionInput
          testId={MENTION_IDS.disabled}
          label="Locked mentions"
          placeholder="Locked"
          disabled
        >
          <MentionInputList testId={listId(MENTION_IDS.disabled)}>
            {rows(MENTION_IDS.disabled)}
          </MentionInputList>
        </MentionInput>
      </div>
    </div>
  );
};

/** Whether `testId` painted at all. */
const paintedAt = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.bounds(testId), (bounds) => bounds !== null);

/** How many accent pixels the inner crop of `testId` holds in `capture`. */
const accentPixels = (
  ctx: Smoke.AsyncSmokeContext,
  capture: string,
  testId: string,
  accent: Pixels.Rgba,
): Effect.Effect<number, Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const bounds = Option.fromNullishOr(yield* ctx.host.bounds(testId));
    if (Option.isNone(bounds)) return 0;
    const frame = yield* ctx.host.pixels(capture);
    const size = yield* ctx.host.windowSize();
    const crop = Pixels.crop(
      frame,
      rowRegion(bounds.value, frame.width / size.width),
    );
    return crop === null ? 0 : Pixels.countColour(crop, accent);
  });

/** The focused `testId`, with `"none"` for no focus so a failure reads clearly. */
const focusedId = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.focused(), (id) =>
    Option.getOrElse(Option.fromNullishOr(id), () => "none"),
  );

/**
 * Waits until `testId` stops painting, and reports whether it did.
 *
 * A dismissal is a transition: the shipped list stays mounted for its exit
 * tween, so `bounds` still answers for a few hundred milliseconds after Escape.
 */
const settleGone = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  settleUntil(
    Effect.map(ctx.host.bounds(testId), (bounds) =>
      Option.isNone(Option.fromNullishOr(bounds)),
    ),
    (gone) => gone,
  );

/** Types a query into the enabled field's current draft. */
const typeQuery = (
  ctx: Smoke.AsyncSmokeContext,
  query: string,
): Effect.Effect<void, Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    yield* ctx.host.key(AT_KEY);
    yield* Effect.forEach(Arr.fromIterable(query), (key) => ctx.host.key(key), {
      concurrency: 1,
    });
    yield* Effect.sleep(SETTLE);
    yield* Effect.sleep(Duration.millis(ENTRY_SETTLE_MS));
  });

export const mentionInputSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(MENTION_IDS.enabled);
    yield* Effect.sleep(SETTLE);
    const accent = yield* ctx.expectSome(
      "the theme's accent is a colour",
      Option.fromNullishOr(Pixels.hexToRgba(ACCENT)),
    );

    // 1. A closed field paints no list.
    yield* ctx.expectEqual(
      "the field starts empty",
      yield* ctx.host.text(MENTION_IDS.readout),
      mentionReadout({ text: "", mentions: 0 }),
    );
    yield* ctx.expectEqual(
      "a closed field paints no list",
      yield* paintedAt(ctx, listId(MENTION_IDS.enabled)),
      false,
    );

    // 2. `@` opens the list: every name, first row highlighted.
    yield* ctx.host.click(MENTION_IDS.enabled);
    yield* ctx.host.key(AT_KEY);
    yield* Effect.sleep(SETTLE);
    yield* Effect.sleep(Duration.millis(ENTRY_SETTLE_MS));
    const field = yield* ctx.expectSome(
      "the runtime paints the mention field",
      Option.fromNullishOr(yield* ctx.host.bounds(MENTION_IDS.enabled)),
    );
    const frame = yield* ctx.expectSome(
      "the runtime paints the field's frame",
      Option.fromNullishOr(yield* ctx.host.bounds(MENTION_IDS.frame)),
    );
    const list = yield* ctx.expectSome(
      "the empty query opens the suggestion list",
      Option.fromNullishOr(yield* ctx.host.bounds(listId(MENTION_IDS.enabled))),
    );
    yield* ctx.expectNear(
      "the list opens one gap below the field",
      list.y,
      field.y + field.height + 4,
      2,
    );
    yield* ctx.expectNear(
      "the list starts on the field's edge",
      list.x,
      frame.x,
      2,
    );
    yield* ctx.expectEqual(
      "the empty query offers every name",
      Arr.every(
        yield* Effect.all(
          Arr.map(MENTION_PEOPLE, (person) =>
            paintedAt(ctx, rowId(MENTION_IDS.enabled, person.value)),
          ),
          { concurrency: "unbounded" },
        ),
        (painted) => painted,
      ),
      true,
    );
    yield* ctx.host.capture(OPEN);
    const firstRow = yield* accentPixels(
      ctx,
      OPEN,
      rowId(MENTION_IDS.enabled, "ada"),
      accent,
    );
    const secondRow = yield* accentPixels(
      ctx,
      OPEN,
      rowId(MENTION_IDS.enabled, "grace"),
      accent,
    );
    yield* ctx.expectEqual(
      `the first suggestion paints the theme's accent (${firstRow} px)`,
      firstRow >= MENTION_ACCENT_FLOOR,
      true,
    );
    yield* ctx.expectEqual(
      `a row the reader is not on paints no accent (${secondRow} px)`,
      secondRow,
      0,
    );

    // 3. The arrow moves the highlight, and the paint follows it.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture(SECOND);
    const reached = yield* accentPixels(
      ctx,
      SECOND,
      rowId(MENTION_IDS.enabled, "grace"),
      accent,
    );
    const left = yield* accentPixels(
      ctx,
      SECOND,
      rowId(MENTION_IDS.enabled, "ada"),
      accent,
    );
    yield* ctx.expectEqual(
      `the second row paints the accent after one arrow (${reached} px)`,
      reached >= MENTION_ACCENT_FLOOR,
      true,
    );
    yield* ctx.expectEqual(
      `the row the arrow left paints no accent (${left} px)`,
      left,
      0,
    );

    // 4. Enter inserts the highlighted row, and the field keeps the focus.
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter inserts the highlighted name",
      yield* ctx.host.text(MENTION_IDS.readout),
      mentionReadout({ text: FIRST_INSERTION, mentions: 1 }),
    );
    yield* ctx.expectEqual(
      "Enter closes the list",
      yield* settleGone(ctx, listId(MENTION_IDS.enabled)),
      true,
    );
    yield* ctx.expectEqual(
      "the field keeps the focus after an insertion",
      yield* focusedId(ctx),
      MENTION_IDS.enabled,
    );

    // 5. The query ranks prefix matches first; a narrowed list paints only them.
    yield* typeQuery(ctx, SECOND_QUERY);
    yield* ctx.expectEqual(
      "only the prefix match remains",
      Arr.every(
        yield* Effect.all(
          Arr.map(MENTION_PEOPLE, (person) =>
            paintedAt(ctx, rowId(MENTION_IDS.enabled, person.value)),
          ),
          { concurrency: "unbounded" },
        ),
        (painted, index) =>
          painted === (MENTION_PEOPLE[index]?.value === "alan"),
      ),
      true,
    );
    yield* ctx.host.capture(FILTERED);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the second insertion keeps the first",
      yield* ctx.host.text(MENTION_IDS.readout),
      mentionReadout({ text: SECOND_INSERTION, mentions: 2 }),
    );

    // 6. A pointer press reaches a row of the floating layer.
    yield* typeQuery(ctx, PRESS_QUERY);
    yield* ctx.host.clickText("Margaret Hamilton");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a pressed row inserts its own name",
      yield* ctx.host.text(MENTION_IDS.readout),
      mentionReadout({ text: PRESSED_INSERTION, mentions: 3 }),
    );
    yield* ctx.expectEqual(
      "a pointer insertion closes the list",
      yield* settleGone(ctx, listId(MENTION_IDS.enabled)),
      true,
    );

    // 7. Escape keeps the dismissed rows painted while the box leaves.
    // Focus the field without pressing it: a press places the caret where it
    // lands, and a query typed mid-string is not an open `@` token.
    yield* ctx.host.focusElement(MENTION_IDS.enabled);
    yield* typeQuery(ctx, DISMISS_QUERY);
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture(DISMISS);
    yield* ctx.expectEqual(
      "a dismissed list keeps the rows it was showing",
      yield* paintedAt(ctx, rowId(MENTION_IDS.enabled, "grace")),
      true,
    );
    yield* ctx.expectEqual(
      "a dismissed list leaves once its exit has run",
      yield* settleGone(ctx, listId(MENTION_IDS.enabled)),
      true,
    );

    // 8. A locked field never offers a row and never takes an edit.
    yield* ctx.host.focusElement(MENTION_IDS.disabled);
    yield* ctx.host.key(AT_KEY);
    yield* ctx.host.key("a");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled field refuses the edit",
      yield* ctx.host.text(MENTION_IDS.disabled),
      "",
    );
    yield* ctx.expectEqual(
      "a disabled field opens no list",
      yield* paintedAt(ctx, listId(MENTION_IDS.disabled)),
      false,
    );
  });

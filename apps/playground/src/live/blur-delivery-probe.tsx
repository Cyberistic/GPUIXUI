/**
 * The `blur-delivery-lifecycle` probe: the routes a window delivers `onBlur`
 * through, measured against the controls that commit on it.
 *
 * The readout is one cumulative trace rather than a set of counters: a consumer
 * that commits a draft on blur and submits on the following press needs the
 * **order**, and a counter pair cannot say which arrived first. Every handler
 * appends its own line, so the trace is the window's delivery sequence.
 *
 * The view and the steps live here so the measurement is one module; the
 * registry and `liveProbeBodies` name it.
 */
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { InlineEdit } from "@gpuixui/components";
import { Button, Input } from "@gpuixui/primitives";
import {
  BLUR_CAPTION,
  BLUR_IDS,
  TRACE_PREFIX,
  traceOf,
} from "./blur-delivery.js";
import { Readout } from "../ui.js";

/** A focus change and the input that caused it need a frame to commit. */
const SETTLE = Duration.millis(40);

/** The one trace the view appends to, shared by every control's handlers. */
type Note = (entry: string) => void;

/**
 * A field that writes its focus pair into the trace.
 *
 * The shipped `Input` composes the caller's handlers with its own focus state,
 * so this is the same path a consumer's field takes, not a raw `<input>`.
 */
const TracedField = ({
  testId,
  label,
  name,
  note,
}: {
  readonly testId: string;
  readonly label: string;
  readonly name: string;
  readonly note: Note;
}): ReactNode => {
  const [value, setValue] = useState("");
  return (
    <Input
      testId={testId}
      label={label}
      value={value}
      onChange={setValue}
      onFocus={() => note(`${name}:focus`)}
      onBlur={() => note(`${name}:blur`)}
      style={{ width: 200 }}
    />
  );
};

/** A painted surface with a press and no tab stop: where a reader clicks away. */
const PlainSurface = ({ note }: { readonly note: Note }): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={BLUR_IDS.plain}
      onClick={() => note("plain:press")}
      style={{
        width: 160,
        height: 32,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.muted,
        display: "flex",
        alignItems: "center",
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Click away
      </text>
    </div>
  );
};

/** The probe's window: the focus routes in one screen. */
export const BlurDeliveryProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [trace, setTrace] = useState<ReadonlyArray<string>>([]);
  const [mounted, setMounted] = useState(true);
  const [name, setName] = useState("");

  const note: Note = (entry) => setTrace((entries) => [...entries, entry]);

  return (
    <div
      testId={BLUR_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {BLUR_CAPTION}
      </text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <TracedField
          testId={BLUR_IDS.fieldA}
          label="First field"
          name="a"
          note={note}
        />
        <TracedField
          testId={BLUR_IDS.fieldB}
          label="Second field"
          name="b"
          note={note}
        />
        <Button
          testId={BLUR_IDS.target}
          variant="secondary"
          onClick={() => note("target:press")}
          onFocus={() => note("target:focus")}
          onBlur={() => note("target:blur")}
        >
          Press me
        </Button>
        <PlainSurface note={note} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <InlineEdit
          testId={BLUR_IDS.edit}
          label="Project name"
          placeholder="Project name"
          value={name}
          onChange={() => note("edit:change")}
          onCommit={(next) => {
            setName(next);
            note(`commit:${next}`);
          }}
        />
        <Button
          testId={BLUR_IDS.after}
          variant="secondary"
          onClick={() => note("after:press")}
          onFocus={() => note("after:focus")}
          onBlur={() => note("after:blur")}
        >
          After
        </Button>
        <div
          testId={BLUR_IDS.toggle}
          onClick={() => {
            note("toggle:press");
            note(mounted ? "unmount:c" : "mount:c");
            setMounted((current) => !current);
          }}
          style={{
            width: 160,
            height: 32,
            padding: theme.spacing.sm,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.muted,
            display: "flex",
            alignItems: "center",
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            Toggle the third field
          </text>
        </div>
        {mounted ? (
          <TracedField
            testId={BLUR_IDS.fieldC}
            label="Third field"
            name="c"
            note={note}
          />
        ) : null}
      </div>
      <Readout testId={BLUR_IDS.readout}>{traceOf(trace)}</Readout>
    </div>
  );
};

export const blurDeliverySteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(BLUR_IDS.probe);
    yield* Effect.sleep(SETTLE);

    const activate = yield* ctx.expectSome(
      "the window exposes its activation",
      Option.fromNullishOr(ctx.host.activateWindow),
    );
    yield* activate();
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(BLUR_IDS.readout);
    const focused = () =>
      Effect.map(ctx.host.focused(), (id) =>
        Option.getOrElse(Option.fromNullishOr(id), () => "none"),
      );

    // 1. A press is the route a reader takes to give a field focus.
    yield* ctx.host.click(BLUR_IDS.fieldA);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press gives the field the window's focus",
      yield* focused(),
      BLUR_IDS.fieldA,
    );

    // 2. Focus moves to a sibling: does the first field hear its blur?
    yield* ctx.host.click(BLUR_IDS.fieldB);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on the sibling moves the focus",
      yield* focused(),
      BLUR_IDS.fieldB,
    );

    // 3. The window's own traversal, the route a reader's Tab takes.
    yield* ctx.host.focusNext();
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the traversal moves the focus to the next stop",
      yield* focused(),
      BLUR_IDS.target,
    );

    // 4. A press on a focusable control while a field holds the focus: the
    //    order here is what a form that submits on the press depends on.
    yield* ctx.host.click(BLUR_IDS.target);
    yield* Effect.sleep(SETTLE);

    // 5. A press on a painted surface that is not a tab stop.
    yield* ctx.host.click(BLUR_IDS.plain);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a plain surface leaves the focus where it was",
      yield* focused(),
      BLUR_IDS.target,
    );

    // 6. The renderer's own blur, with a field focused.
    yield* ctx.host.focusElement(BLUR_IDS.fieldA);
    yield* Effect.sleep(SETTLE);
    const blur = yield* ctx.expectSome(
      "the window exposes the renderer's own blur",
      Option.fromNullishOr(ctx.host.blur),
    );
    yield* blur();
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the renderer's blur leaves nothing focused",
      yield* focused(),
      "none",
    );

    // 7. A focused field that leaves the tree: does anything hear it?
    yield* ctx.host.focusElement(BLUR_IDS.fieldC);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(BLUR_IDS.toggle);
    yield* Effect.sleep(SETTLE);

    // 8. The shipped edit: a draft typed into it, then the reader tabs away.
    yield* ctx.host.click(BLUR_IDS.edit);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("x");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.focusNext();
    yield* Effect.sleep(SETTLE);

    // 9. The other route out of an edit: a press on the control beside it.
    yield* ctx.host.click(BLUR_IDS.after);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the press beside the edit reaches its own handler",
      yield* focused(),
      BLUR_IDS.after,
    );

    yield* ctx.expectEqual(
      "the window's delivered trace",
      yield* readout(),
      `${TRACE_PREFIX}target:press plain:press toggle:press unmount:c edit:change after:press`,
    );
    yield* ctx.expectEqual(
      "the focus the window is left with",
      yield* focused(),
      BLUR_IDS.after,
    );
  });

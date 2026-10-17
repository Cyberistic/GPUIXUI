/**
 * `collapsible-height` — the animated, state-preserving collapsible section.
 *
 * `@gpuixui/components` unmounts a closed section's body because "0.10.0's
 * `motion` needs a numeric target" and there is no `onLayout`. This probe
 * measures the missing half: whether a body that stays mounted inside a
 * `height: 0; overflow: hidden` container can be measured through
 * `ref` → `renderer.getElementBounds`, whether `motion.div` interpolates
 * **height** under the paused motion clock, and whether the clip refuses input
 * that would otherwise land in the overflowing content.
 *
 * The body is never unmounted, so the draft typed into it survives a collapse —
 * the reason an accordion wants this recipe at all.
 *
 * Measured facts: plan `186` §10.
 */
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { motion, useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import { read } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const DURATION_MS = 200;
const MID_MS = 80;
const READOUT = "collapse-readout";

/** One decimal place, so the readout and the paint can be compared. */
const round1 = (value: number): number => Math.round(value * 10) / 10;

/** A `key=value` field of the readout. */
const field = (ctx: Smoke.SmokeContext, key: string): Option.Option<string> =>
  Option.flatMap(Option.fromNullishOr(ctx.host.text(READOUT)), (readout) =>
    Option.map(
      Arr.findFirst(Str.split(readout, " "), Str.startsWith(`${key}=`)),
      (part) => Str.replace(`${key}=`, "")(part),
    ),
  );

/** A numeric field, or `none` when it is absent or unparseable. */
const numberField = (
  ctx: Smoke.SmokeContext,
  key: string,
): Option.Option<number> =>
  Option.flatMap(field(ctx, key), (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Option.some(parsed) : Option.none();
  });

/** The painted rectangle of `testId`, or a labelled failure. */
const boundsOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Effect.Effect<
  { readonly x: number; readonly y: number; readonly height: number },
  Smoke.SmokeAssertionError
> =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

/** A prompt-height section header that activates on click, Enter down or Space up. */
const Trigger = ({
  testId,
  onToggle,
  label,
}: {
  readonly testId: string;
  readonly onToggle: () => void;
  readonly label: string;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      aria-expanded={false}
      onClick={onToggle}
      onKeyDown={(event: EventPayload) => {
        if (event.key === "enter") onToggle();
      }}
      onKeyUp={(event: EventPayload) => {
        if (event.key === "space") onToggle();
      }}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: 28,
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.md,
        borderRadius: theme.radius.sm,
        cursor: "pointer",
        backgroundColor: theme.colors.card,
        hover: { backgroundColor: theme.colors.hover },
      }}
    >
      <Body>{label}</Body>
    </div>
  );
};

const CollapsibleProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [open, setOpen] = useState(false);
  const [natural, setNatural] = useState(0);
  const [mounted, setMounted] = useState<Option.Option<number>>(Option.none());
  const [presses, setPresses] = useState(0);
  const [complete, setComplete] = useState(0);
  const [draft, setDraft] = useState("");
  const contentId = useRef<Option.Option<number>>(Option.none());

  const contentRef = useCallback((instance: PublicInstance | null) => {
    contentId.current = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  }, []);

  const measure = useCallback(
    (): Option.Option<number> =>
      Option.flatMap(contentId.current, (id) =>
        Option.map(
          Option.fromNullishOr(renderer?.getElementBounds?.(id)),
          (bounds) => bounds.height,
        ),
      ),
    [renderer],
  );

  // Whether a measurement is available at mount decides whether a `defaultOpen`
  // section can animate on its first open without a flash.
  useLayoutEffect(() => {
    Option.match(measure(), {
      onNone: () => {},
      onSome: (height) => setMounted(Option.some(height)),
    });
  }, [measure]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    Option.match(measure(), {
      onNone: () => setOpen(true),
      onSome: (height) => {
        setNatural(height);
        setOpen(true);
      },
    });
  };

  const mountedText = Option.getOrElse(
    Option.map(mounted, (height) => `${round1(height)}`),
    () => "none",
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 420,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <Trigger testId="collapse-trigger" onToggle={toggle} label="Section" />
      <motion.div
        initial={false}
        animate={{ height: open ? natural : 0 }}
        transition={{ duration: DURATION_MS / 1000, ease: "linear" }}
        onMotionComplete={() => setComplete((count) => count + 1)}
        style={{
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          backgroundColor: theme.colors.muted,
        }}
      >
        <div
          ref={contentRef}
          testId="collapse-content"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 8,
          }}
        >
          <div testId="collapse-row-0" style={{ height: 24 }}>
            <Body>alpha</Body>
          </div>
          <div testId="collapse-row-1" style={{ height: 24 }}>
            <Body>beta</Body>
          </div>
          <input
            testId="collapse-input"
            value={draft}
            placeholder="draft"
            onChange={(event: EventPayload) => setDraft(event.value ?? "")}
            style={{ height: 24 }}
          />
          <div
            testId="collapse-button"
            tabIndex={0}
            role="button"
            onClick={() => setPresses((count) => count + 1)}
            style={{
              display: "flex",
              alignItems: "center",
              height: 28,
              paddingLeft: theme.spacing.sm,
              borderRadius: theme.radius.sm,
              cursor: "pointer",
              backgroundColor: theme.colors.card,
            }}
          >
            <Body>press</Body>
          </div>
        </div>
      </motion.div>
      <div
        testId="collapse-after"
        style={{ height: 40, backgroundColor: theme.colors.card }}
      >
        <Body>after</Body>
      </div>
      <Readout testId={READOUT}>
        {`open=${open ? 1 : 0} natural=${round1(natural)} mounted=${mountedText} presses=${presses} complete=${complete} draft=${draft}`}
      </Readout>
    </div>
  );
};

export const collapsibleHeightScenario: PlaygroundScenario = {
  id: "collapsible-height",
  title: "Collapsible: measured natural height, height tween, clip and state",
  capability: "motion",
  view: () => <CollapsibleProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.pauseMotion();

      const content = yield* boundsOf(ctx, "collapse-content");
      yield* ctx.expectEqual(
        "the collapsed body keeps its content laid out",
        content.height > 0,
        true,
      );

      const header = yield* boundsOf(ctx, "collapse-trigger");
      const baseline = (yield* boundsOf(ctx, "collapse-after")).y;
      yield* ctx.expectEqual(
        "the collapsed section leaves the next row above its content",
        baseline > header.y + header.height,
        true,
      );

      ctx.host.click("collapse-button");
      yield* ctx.expectContains(
        "the clip refuses input in the overflowing content",
        read(ctx, READOUT),
        "presses=0",
      );

      ctx.host.click("collapse-trigger");
      yield* ctx.expectContains(
        "the trigger opened the section",
        read(ctx, READOUT),
        "open=1",
      );
      const natural = yield* ctx.expectSome(
        "the component measured the content while opening",
        numberField(ctx, "natural"),
      );
      yield* ctx.expectNear(
        "the measurement is the painted content height",
        natural,
        content.height,
        1,
      );
      yield* ctx.expectContains(
        "no completed tween before the clock moves",
        read(ctx, READOUT),
        "complete=0",
      );

      ctx.host.fastForwardMotion(MID_MS);
      const mid = yield* boundsOf(ctx, "collapse-after");
      yield* ctx.expectNear(
        "the height tween is mid-flight at 80 ms",
        mid.y - baseline,
        natural * (MID_MS / DURATION_MS),
        4,
      );

      ctx.host.fastForwardMotion(DURATION_MS);
      const opened = yield* boundsOf(ctx, "collapse-after");
      yield* ctx.expectNear(
        "the section opened to the measured height",
        opened.y - baseline,
        natural,
        1,
      );
      yield* ctx.expectContains(
        "the height tween completed",
        read(ctx, READOUT),
        "complete=1",
      );

      ctx.host.click("collapse-button");
      yield* ctx.expectContains(
        "the opened content is interactive",
        read(ctx, READOUT),
        "presses=1",
      );

      ctx.host.click("collapse-input");
      ctx.host.key("a");
      ctx.host.key("b");
      yield* ctx.expectContains(
        "typing reaches the draft",
        read(ctx, READOUT),
        "draft=ab",
      );

      ctx.host.click("collapse-trigger");
      ctx.host.fastForwardMotion(DURATION_MS);
      const closed = yield* boundsOf(ctx, "collapse-after");
      yield* ctx.expectNear(
        "the section collapsed to zero",
        closed.y - baseline,
        0,
        1,
      );
      yield* ctx.expectContains(
        "the collapse tween completed",
        read(ctx, READOUT),
        "complete=2",
      );
      yield* ctx.expectContains(
        "the draft survived the collapse",
        read(ctx, READOUT),
        "draft=ab",
      );
      yield* ctx.expectEqual(
        "the content stayed mounted while closed",
        ctx.host.text("collapse-content") !== null,
        true,
      );

      ctx.host.keyDown("collapse-trigger", "enter");
      ctx.host.keyUp("collapse-trigger", "enter");
      ctx.host.fastForwardMotion(DURATION_MS);
      const reopened = yield* boundsOf(ctx, "collapse-after");
      yield* ctx.expectNear(
        "Enter re-opened to the same measured height",
        reopened.y - baseline,
        natural,
        1,
      );
      yield* ctx.expectContains(
        "the second open completed",
        read(ctx, READOUT),
        "complete=3",
      );
      yield* ctx.expectContains(
        "the draft survived the second open",
        read(ctx, READOUT),
        "draft=ab",
      );
    }),
};

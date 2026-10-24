/**
 * `accordion-lifecycle`: the shipped `Accordion` driven by a real window.
 *
 * The offscreen suite holds the accordion's rules — single mode keeps one
 * section open, a disabled header is refused, the arrows move focus — but those
 * are tree reads. What a window alone can answer is whether the coordinated
 * section actually *paints*: a body measured by `AutoHeight`, the clipping box
 * settling on it, and the sections below moving by exactly the difference of
 * the two measured bodies when one closes and the next opens. A tree read also
 * cannot tell whether a focused header is the one the arrows move from, since
 * the component focuses a native element on every move.
 *
 * The scene is single, **non**-collapsible mode: the section that opens closes
 * the one before it, and a press on the open section must leave it open. Gamma
 * is disabled, so every path has a header to skip.
 *
 * Every check is a `ctx.expect*` at the step that makes it — the helpers only
 * read — so the count the README prints is the number of assertion sites.
 *
 * Captures: `accordion-single`.
 */

import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gpuixui/components";
import type { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState, type ReactElement, type ReactNode } from "react";
import { Readout } from "../ui.js";
import {
  ACCORDION_BODIES,
  ACCORDION_DISABLED,
  ACCORDION_IDS,
  ACCORDION_MOVES,
  ACCORDION_ORDER,
  ACCORDION_REST,
  ACCORDION_START,
  ACCORDION_WIDTH,
  accordionBody,
  accordionClip,
  accordionOpen,
  accordionReadout,
  accordionShift,
  accordionTrigger,
  type AccordionSection,
  type AccordionState,
} from "./accordion.js";
import { settleNumber, settleUntil } from "./settle.js";

/** The one capture: the section the keyboard left open. */
const CAPTURE = "accordion-single";

const CAPTION =
  "Single mode keeps one section open, a disabled header is refused, and the arrows move focus without opening. The body is measured by the reveal, so the sections below move by the difference of the two heights.";

/** The view: four sections in a fixed-width column, and the readout. */
export const AccordionProbe = (): ReactNode => {
  const theme = useTheme();
  const [state, setState] = useState<AccordionState>(ACCORDION_REST);
  const body = (section: AccordionSection): ReactNode => (
    <div
      testId={accordionBody(section)}
      style={{
        height: ACCORDION_BODIES[section],
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.md,
      }}
    />
  );
  const item = (section: AccordionSection): ReactElement => (
    <AccordionItem
      key={section}
      value={section}
      disabled={section === ACCORDION_DISABLED}
      testId={`accordion-${section}-item`}
    >
      <AccordionTrigger testId={accordionTrigger(section)}>
        <text
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.foreground,
          }}
        >
          {`Section ${section}`}
        </text>
      </AccordionTrigger>
      {/* The padding is dropped so the settled clip is the body's own height. */}
      <AccordionContent testId={accordionClip(section)} className="p-0 gap-0">
        {body(section)}
      </AccordionContent>
    </AccordionItem>
  );
  return (
    <div
      testId={ACCORDION_IDS.probe}
      style={{
        width: ACCORDION_WIDTH + theme.spacing.xl * 2,
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
        {CAPTION}
      </text>
      <div style={{ width: ACCORDION_WIDTH }}>
        <Accordion
          type="single"
          collapsible={false}
          value={state.open === "none" ? null : state.open}
          onValueChange={(next) =>
            setState((current) => ({
              open: accordionOpen(next),
              changes: current.changes + 1,
            }))
          }
        >
          {ACCORDION_ORDER.map(item)}
        </Accordion>
      </div>
      <Readout testId={ACCORDION_IDS.readout}>
        {accordionReadout(state)}
      </Readout>
    </div>
  );
};

/** The probe's steps: the coordinated sections, the arrows, and both keys. */
export const accordionSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(ACCORDION_IDS.probe);
    // A capture stalls the animation clock, so a run that starts right after
    // one misses the mount tween's frames. The section that starts open is
    // settling while this wait runs, which is why its reads come after it.
    yield* Effect.sleep(Duration.millis(400));

    type Failure = Smoke.SmokeAssertionError | Smoke.SmokeHostError;

    /** The box `testId` eventually paints, or `null` while it does not. */
    const box = (
      testId: string,
    ): Effect.Effect<Smoke.Bounds | null, Smoke.SmokeHostError> =>
      settleUntil(ctx.host.bounds(testId), (value) => value !== null);

    /** The painted height of `testId`, `NaN` while nothing paints. */
    const heightOf = (
      testId: string,
    ): Effect.Effect<number, Smoke.SmokeHostError> =>
      Effect.map(box(testId), (painted) =>
        Option.match(Option.fromNullishOr(painted), {
          onNone: () => Number.NaN,
          onSome: (bounds) => bounds.height,
        }),
      );

    /** A box that stops moving, so a reveal is read at rest. */
    const settledHeight = (
      testId: string,
    ): Effect.Effect<number, Smoke.SmokeHostError> =>
      settleNumber(heightOf(testId));

    /** Whether `testId` stops painting, which a close waits for. */
    const gone = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
      settleUntil(
        Effect.map(ctx.host.bounds(testId), (painted) => painted === null),
        (absent) => absent,
      );

    /** The readout once it names `expected`, which a press reports a frame later. */
    const readout = (expected: string): Effect.Effect<string, Failure> =>
      settleUntil(ctx.host.text(ACCORDION_IDS.readout), (line) =>
        line.includes(expected),
      );

    /** The focused `testId`, with `none` for no focus so a failure reads clearly. */
    const focused = (): Effect.Effect<string, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.focused(), (id) =>
        Option.getOrElse(Option.fromNullishOr(id), () => "none"),
      );

    // ── At rest: one section open, measured, and nothing else mounted ─────────
    yield* ctx.expectEqual(
      "single mode starts with the one section it was given",
      yield* readout(accordionReadout(ACCORDION_REST)),
      accordionReadout(ACCORDION_REST),
    );
    yield* ctx.expectNear(
      "the open section paints the body the caller set",
      (yield* ctx.expectSome(
        "the open section's body paints",
        Option.fromNullishOr(yield* box(accordionBody(ACCORDION_START))),
      )).height,
      ACCORDION_BODIES[ACCORDION_START],
      1,
    );
    yield* ctx.expectNear(
      "the clipping box settles on the measured body",
      yield* settledHeight(accordionClip(ACCORDION_START)),
      ACCORDION_BODIES[ACCORDION_START],
      1,
    );
    yield* ctx.expectEqual(
      "a closed section mounts no body",
      yield* gone(accordionBody("beta")),
      true,
    );
    yield* ctx.expectEqual(
      "the disabled section mounts no body either",
      yield* gone(accordionBody(ACCORDION_DISABLED)),
      true,
    );

    // The header below the pair, whose y the switch has to move.
    const restDelta = yield* settleNumber(
      Effect.map(box(accordionTrigger("delta")), (painted) =>
        Option.match(Option.fromNullishOr(painted), {
          onNone: () => Number.NaN,
          onSome: (bounds) => bounds.y,
        }),
      ),
    );

    // ── One press: the previous section closes, the next is measured ─────────
    yield* ctx.host.click(accordionTrigger("beta"));
    const opened: AccordionState = { open: "beta", changes: 1 };
    yield* ctx.expectEqual(
      "a press opens the section it landed on and closes the one before it",
      yield* readout(accordionReadout(opened)),
      accordionReadout(opened),
    );
    yield* ctx.expectNear(
      "the newly open section paints its own body",
      (yield* ctx.expectSome(
        "the opened section's body paints",
        Option.fromNullishOr(yield* box(accordionBody("beta"))),
      )).height,
      ACCORDION_BODIES.beta,
      1,
    );
    yield* ctx.expectNear(
      "its clipping box settles on its measured body",
      yield* settledHeight(accordionClip("beta")),
      ACCORDION_BODIES.beta,
      1,
    );
    yield* ctx.expectEqual(
      "the section that closed unmounts its body",
      yield* gone(accordionBody(ACCORDION_START)),
      true,
    );
    yield* ctx.expectEqual(
      "the clipping box leaves with it",
      yield* gone(accordionClip(ACCORDION_START)),
      true,
    );
    const openDelta = yield* settleNumber(
      Effect.map(box(accordionTrigger("delta")), (painted) =>
        Option.match(Option.fromNullishOr(painted), {
          onNone: () => Number.NaN,
          onSome: (bounds) => bounds.y,
        }),
      ),
    );
    yield* ctx.expectNear(
      "the section below moves by the difference of the two measured bodies",
      openDelta - restDelta,
      accordionShift(ACCORDION_START, "beta"),
      1,
    );

    // ── The press leaves focus on its own header ────────────────────────────
    yield* ctx.expectEqual(
      "a press focuses the header it landed on",
      yield* focused(),
      accordionTrigger("beta"),
    );

    // ── The arrows move focus and open nothing ──────────────────────────────
    yield* Effect.forEach(
      ACCORDION_MOVES,
      (move: (typeof ACCORDION_MOVES)[number]) =>
        Effect.gen(function* () {
          yield* ctx.host.key(move.key);
          yield* Effect.sleep(Duration.millis(80));
          yield* ctx.expectEqual(
            move.rule,
            yield* focused(),
            accordionTrigger(move.to),
          );
        }),
      { concurrency: 1, discard: true },
    );
    yield* ctx.expectEqual(
      "an arrow moves focus without opening the header it lands on",
      yield* ctx.host.text(ACCORDION_IDS.readout),
      accordionReadout(opened),
    );

    // ── Enter opens the focused section, Space leaves an open one alone ──────
    yield* ctx.host.key("enter");
    const activated: AccordionState = { open: "delta", changes: 2 };
    yield* ctx.expectEqual(
      "Enter opens the section focus landed on",
      yield* readout(accordionReadout(activated)),
      accordionReadout(activated),
    );
    yield* ctx.expectNear(
      "the opened section paints the body the caller set",
      (yield* ctx.expectSome(
        "the keyboard-opened body paints",
        Option.fromNullishOr(yield* box(accordionBody("delta"))),
      )).height,
      ACCORDION_BODIES.delta,
      1,
    );
    yield* ctx.expectNear(
      "its clipping box settles on the measured body",
      yield* settledHeight(accordionClip("delta")),
      ACCORDION_BODIES.delta,
      1,
    );
    yield* ctx.expectEqual(
      "the section it replaced unmounts its body",
      yield* gone(accordionBody("beta")),
      true,
    );

    // The open section is the one press a non-collapsible accordion refuses:
    // the readout may report the attempt, but the body has to stay painted.
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(Duration.millis(150));
    yield* ctx.expectEqual(
      "Space on the open section leaves it open",
      yield* ctx.host.text(ACCORDION_IDS.readout),
      accordionReadout({ open: "delta", changes: 3 }),
    );
    yield* ctx.expectEqual(
      "the body it would have closed is still painted",
      Option.isSome(
        Option.fromNullishOr(yield* ctx.host.bounds(accordionBody("delta"))),
      ),
      true,
    );

    // ── A disabled header refuses the press ─────────────────────────────────
    yield* ctx.host.click(accordionTrigger(ACCORDION_DISABLED));
    yield* Effect.sleep(Duration.millis(150));
    yield* ctx.expectEqual(
      "a disabled header leaves every state where it was",
      yield* ctx.host.text(ACCORDION_IDS.readout),
      accordionReadout({ open: "delta", changes: 3 }),
    );
    yield* ctx.expectEqual(
      "the disabled section mounts no body after a press",
      yield* gone(accordionBody(ACCORDION_DISABLED)),
      true,
    );

    // Captures come last: a screenshot stalls the animation clock.
    yield* ctx.host.capture(CAPTURE);
  });

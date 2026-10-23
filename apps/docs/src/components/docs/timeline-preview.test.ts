import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  advance,
  currentStep,
  DEPLOY_STEPS,
  describe as describeRun,
  finish,
  isLast,
  lastIndex,
  mark,
  plan,
  reset,
} from "./timeline-preview";

/**
 * The timeline preview's two rules: the status is the **app's** (the component
 * paints what it is handed, unlike Stepper, which counts from one value), and
 * the rail stops at the last direct child.
 *
 * Both are invisible in a drawing — a hand-marked history and a derived one look
 * identical, and a connector that runs past the last event still reads as a
 * timeline until the reader counts the lines. The rules are therefore held to
 * the component's own source, and the run is measured on what it marks.
 */

const read = (path: string): string =>
  readFileSync(
    new URL(`../../../../../packages/components/src/${path}`, import.meta.url),
    "utf8",
  );

const timeline = read("timeline.tsx");
const stepper = read("stepper.tsx");
const stepperLogic = read("stepper/logic.ts");

/** The expected mark, derived independently of the preview's copy. */
const expected = (index: number, cursor: number): string =>
  index < cursor ? "complete" : index === cursor ? "current" : "upcoming";

describe("the status the app passes", () => {
  it("is a prop with a default, where the stepper's is derived from one value", () => {
    // The contrast is the lesson the page teaches, so both sides are read: a
    // timeline takes `status?` with `complete` as the default and holds no
    // current index; a stepper takes `value` and derives every status.
    const timelineProps = timeline.slice(
      timeline.indexOf("export interface TimelineProps"),
      timeline.indexOf("export interface TimelineItemProps"),
    );
    expect(timelineProps).not.toContain("readonly value");
    expect(timeline).toContain("readonly status?: TimelineStatus");
    expect(timeline).toContain('status = "complete"');
    expect(timeline).toContain('aria-selected={status === "current"}');

    const stepperProps = stepper.slice(
      stepper.indexOf("export interface StepperProps"),
      stepper.indexOf("export interface StepperStepProps"),
    );
    expect(stepperProps).toContain("readonly value: number");
    // The comparison lives in the logic seam both the root and every marker
    // read, so the contrast is held to the code that derives it.
    expect(stepper).toContain("statusOf(current, value)");
    expect(stepperLogic).toContain(
      'step < at ? "complete" : step === at ? "current" : "upcoming"',
    );
  });

  it("marks the preview's run the way a consumer would", () => {
    const cursors = [0, 1, 2, 3, DEPLOY_STEPS.length];
    const drifted = cursors.flatMap((cursor) =>
      DEPLOY_STEPS.flatMap((_step, index) =>
        mark(index, cursor) === expected(index, cursor)
          ? []
          : [
              `cursor ${cursor} event ${index}: preview says ${mark(index, cursor)}, the app rule says ${expected(index, cursor)}`,
            ],
      ),
    );

    expect(drifted).toEqual([]);
  });

  it("leaves exactly one current event inside the run and none past its end", () => {
    const currents = [0, 1, 2, 3].map(
      (cursor) =>
        plan(cursor).filter((event) => event.status === "current").length,
    );

    expect(currents).toEqual([1, 1, 1, 1]);
    // A finished history has nothing left to wait on, which the component
    // cannot express on its own — the app simply marks every event complete.
    expect(
      plan(finish()).filter((event) => event.status === "current"),
    ).toEqual([]);
    expect(plan(finish()).map((event) => event.status)).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
    ]);
    expect(currentStep(finish())).toBeUndefined();
  });

  it("gives a time to the steps that have run and none to the ones that have not", () => {
    const events = plan(2);

    expect(events[0]?.timestamp).toContain("09:41");
    expect(events[1]?.timestamp).toContain("09:44");
    // The current step is the one being looked at, so it reads as now.
    expect(events[2]?.timestamp).toContain("(now)");
    expect(events[3]?.timestamp).toBeUndefined();
  });
});

describe("the rail", () => {
  it("stops the connector at the last direct child", () => {
    // The root computes `last` from its own children and the item paints no
    // connector there; a connector after the last event is a line to nowhere.
    expect(timeline).toContain(
      "{last ? null : <div style={recipeStyle(TIMELINE_CONNECTOR",
    );
    expect(timeline).toContain("value={{ last: index === lastItem }}");

    const counts = [1, 2, 3, 4].map(
      (count) =>
        Array.from({ length: count }, (_, index) => index).filter(
          (index) => !isLast(index, count),
        ).length,
    );
    expect(counts).toEqual([0, 1, 2, 3]);
    // Every event but the last paints one, so the count is events - 1.
    expect(counts).toEqual([0, 1, 2, 3].map((count) => count));
  });

  it("paints the upcoming dot in the text role the mark contract measures", () => {
    // The muted *surface* role measured 1.06:1 on the page — a dot nobody could
    // see. The rule is the text role; a preview that copied the surface fill
    // would draw an invisible dot and look fine in a screenshot.
    const dot = timeline.slice(
      timeline.indexOf("const dotFill"),
      timeline.indexOf("/** {@link Timeline} props. */"),
    );
    expect(dot).toContain("theme.colors.primary");
    expect(dot).toContain("theme.colors.foreground");
    expect(dot).toContain("theme.colors.mutedForeground");
    expect(/theme\.colors\.muted(?![A-Za-z])/.test(dot)).toBe(false);
    expect(timeline).toContain("backgroundColor: dotFill(theme, status)");
  });
});

describe("the run's cursor", () => {
  it("advances one step and clamps at the last planned one", () => {
    expect(advance(0)).toBe(1);
    expect(advance(1)).toBe(2);
    expect(advance(lastIndex())).toBe(lastIndex());
    expect(lastIndex()).toBe(DEPLOY_STEPS.length - 1);
    // The clamp is the app's decision; `finish` is the other one it can make.
    expect(finish()).toBe(DEPLOY_STEPS.length);
    expect(reset()).toBe(0);
  });

  it("names the step the run waits on", () => {
    expect(currentStep(0)?.title).toBe("Build started");
    expect(currentStep(lastIndex())?.title).toBe("Smoke checks");
    expect(currentStep(finish())).toBeUndefined();
  });

  it("prints the readout the page shows", () => {
    expect(describeRun(1)).toBe("cursor=1 current=Tests passed done=1");
    expect(describeRun(finish())).toBe("cursor=4 current=none done=4");
  });
});

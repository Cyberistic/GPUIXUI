/**
 * The timeline preview's model: the history a deploy run writes, and the
 * statuses the app marks on it.
 *
 * `TimelineItem`'s status is **passed, not derived** — a history has no index to
 * count from, so the consumer that knows the events marks them. That is the
 * opposite of `Stepper`, whose statuses come from one value, and the difference
 * is a rule a drawing cannot show. This module is the app half: it keeps a
 * cursor over the planned steps and writes the status and the timestamp each
 * event is painted with, so `timeline-preview.test.ts` can hold the rule to the
 * component's source and the advance to the plan.
 */

/** Where an event sits in the history, as the consumer marks it. */
export type TimelineStatus = "complete" | "current" | "upcoming";

/** One step of the deploy plan, before the run gives it a status. */
export interface DeployStep {
  readonly title: string;
  readonly description: string;
}

/** The run the preview draws: the steps, in the order they happen. */
export const DEPLOY_STEPS: ReadonlyArray<DeployStep> = [
  { title: "Build started", description: "release/2.4.0 at 4c1a9fd" },
  { title: "Tests passed", description: "412 tests, 0 failures" },
  { title: "Deploying to production", description: "rolling, two regions" },
  { title: "Smoke checks", description: "runs when the deploy finishes" },
];

/** The wall clock each completed step ran at; the current one reads "now". */
export const RUN_AT: ReadonlyArray<string> = [
  "09:41",
  "09:44",
  "09:52",
  "09:55",
];

/** One event as the component paints it: status and timestamp are the app's. */
export interface TimelineEvent {
  readonly title: string;
  readonly description: string;
  readonly timestamp: string | undefined;
  readonly status: TimelineStatus;
}

/**
 * The mark the app writes for an event at `index` while the run sits at `cursor`.
 *
 * The component has no such function: it receives the answer. The rule lives
 * here so the preview's statuses are the ones a consumer would compute, and the
 * test holds it to the plan rather than to the component.
 */
export const mark = (index: number, cursor: number): TimelineStatus =>
  index < cursor ? "complete" : index === cursor ? "current" : "upcoming";

/** Whether an event ends the rail, which is where the connector stops. */
export const isLast = (index: number, count: number): boolean =>
  index === count - 1;

/** The whole plan as events, marked for a cursor. */
export const plan = (cursor: number): ReadonlyArray<TimelineEvent> =>
  DEPLOY_STEPS.map((step, index) => ({
    ...step,
    status: mark(index, cursor),
    // A step that has not started has no time to print. The current one reads
    // "now", because that is when the reader is looking at it.
    timestamp:
      index < cursor
        ? RUN_AT[index]
        : index === cursor
          ? `${RUN_AT[index] ?? ""} (now)`
          : undefined,
  }));

/** The last index a run can sit on, i.e. the number of steps less one. */
export const lastIndex = (): number => DEPLOY_STEPS.length - 1;

/**
 * Advance the run one step.
 *
 * The cursor stops at the last step: a run that pressed Promote again would have
 * to leave the last event `current` for ever, because nothing after it is
 * planned. `finish` is the separate decision the page shows — an app may mark
 * the whole history complete by moving its cursor past the end.
 */
export const advance = (cursor: number): number =>
  Math.min(cursor + 1, lastIndex());

/** Mark the whole history complete by moving the cursor past the last step. */
export const finish = (): number => DEPLOY_STEPS.length;

export const reset = (): number => 0;

/** The step the run is waiting on, or none once the cursor is past the end. */
export const currentStep = (cursor: number): DeployStep | undefined =>
  DEPLOY_STEPS[cursor];

/** The readout the preview prints under the rail. */
export const describe = (cursor: number): string =>
  `cursor=${cursor} current=${currentStep(cursor)?.title ?? "none"} done=${plan(cursor).filter((event) => event.status === "complete").length}`;

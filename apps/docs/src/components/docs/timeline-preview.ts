export type TimelineStatus = "complete" | "current" | "upcoming";

export interface DeployStep {
  readonly title: string;
  readonly description: string;
}

export const DEPLOY_STEPS: ReadonlyArray<DeployStep> = [
  { title: "Build started", description: "release/2.4.0 at 4c1a9fd" },
  { title: "Tests passed", description: "412 tests, 0 failures" },
  { title: "Deploying to production", description: "rolling, two regions" },
  { title: "Smoke checks", description: "runs when the deploy finishes" },
];

export const RUN_AT: ReadonlyArray<string> = [
  "09:41",
  "09:44",
  "09:52",
  "09:55",
];

export interface TimelineEvent {
  readonly title: string;
  readonly description: string;
  readonly timestamp: string | undefined;
  readonly status: TimelineStatus;
}

export const mark = (index: number, cursor: number): TimelineStatus =>
  index < cursor ? "complete" : index === cursor ? "current" : "upcoming";

export const isLast = (index: number, count: number): boolean =>
  index === count - 1;

export const plan = (cursor: number): ReadonlyArray<TimelineEvent> =>
  DEPLOY_STEPS.map((step, index) => ({
    ...step,
    status: mark(index, cursor),

    timestamp:
      index < cursor
        ? RUN_AT[index]
        : index === cursor
          ? `${RUN_AT[index] ?? ""} (now)`
          : undefined,
  }));

export const lastIndex = (): number => DEPLOY_STEPS.length - 1;

export const advance = (cursor: number): number =>
  Math.min(cursor + 1, lastIndex());

export const finish = (): number => DEPLOY_STEPS.length;

export const reset = (): number => 0;

export const currentStep = (cursor: number): DeployStep | undefined =>
  DEPLOY_STEPS[cursor];

export const describe = (cursor: number): string =>
  `cursor=${cursor} current=${currentStep(cursor)?.title ?? "none"} done=${plan(cursor).filter((event) => event.status === "complete").length}`;

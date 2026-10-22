/**
 * The stepper preview's model: the status the component derives, and the
 * workflow rule that decides whether the value may move.
 *
 * `Stepper` owns one rule — a step below `value` is complete, the value itself
 * is current, the rest are upcoming — and it clamps nothing: `value={0}` leaves
 * every step upcoming and `value={4}` on three steps paints all of them
 * complete, because the comparison is made against the raw number. The rest of
 * the flow (which step the reader may leave, and whether the last one submits)
 * is the app's, which the page says and this module encodes, so
 * `stepper-preview.test.ts` can fail on both.
 */

/** Where a step sits relative to the current one, as the component derives it. */
export type StepStatus = "complete" | "current" | "upcoming";

/** The steps a workflow is built from: a name and one line of support. */
export interface StepSpec {
  readonly label: string;
  readonly description: string;
}

/** The workspace flow's steps, in order. */
export const STEPS: ReadonlyArray<StepSpec> = [
  { label: "Workspace", description: "Name and handle" },
  { label: "Seats", description: "How many people" },
  { label: "Review", description: "Create it" },
];

/**
 * The component's `statusOf`: the raw comparison, with no clamp.
 *
 * `step` is the step's own 1-based `value` and `current` the root's.
 */
export const stepStatus = (current: number, step: number): StepStatus =>
  step < current ? "complete" : step === current ? "current" : "upcoming";

/** Every step's status for a root value, in step order. */
export const statuses = (
  current: number,
  count: number = STEPS.length,
): ReadonlyArray<StepStatus> =>
  Array.from({ length: count }, (_, index) => stepStatus(current, index + 1));

/** The draft the flow edits: the two fields and nothing derived. */
export interface Draft {
  readonly name: string;
  readonly seats: string;
}

/** What one step accepts, and the message a refused step reports. */
export interface Check {
  readonly accepted: boolean;
  readonly message: string;
}

const accepts = (): Check => ({ accepted: true, message: "" });

const refuses = (message: string): Check => ({ accepted: false, message });

/** A workspace name is the one thing the first step requires. */
export const checkName = (name: string): Check =>
  name.trim().length === 0 ? refuses("Give the workspace a name") : accepts();

/** A seat count is a whole number of people, one or more. */
export const checkSeats = (seats: string): Check => {
  const trimmed = seats.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) >= 1
    ? accepts()
    : refuses("One seat or more, as a whole number");
};

/** The check the step at `step` owns. The review step adds none of its own. */
export const checkStep = (step: number, draft: Draft): Check =>
  step === 1
    ? checkName(draft.name)
    : step === 2
      ? checkSeats(draft.seats)
      : accepts();

/** The flow's state: the draft and the step the reader is on. */
export interface Flow {
  readonly draft: Draft;
  readonly step: number;
  readonly created: boolean;
}

export const initialFlow: Flow = {
  draft: { name: "", seats: "2" },
  step: 1,
  created: false,
};

/** The last step, derived so a step added above cannot leave it behind. */
export const lastStep = (): number => STEPS.length;

/**
 * Move forward one step, or stay put with the message the step reports.
 *
 * The step's check runs **before** the value moves, so the stepper never shows
 * a step the reader has not answered — the one coupling the component leaves to
 * the app. The last step creates the workspace and marks the flow complete.
 */
export const advance = (
  flow: Flow,
): { readonly flow: Flow; readonly message: string } => {
  if (flow.created) return { flow, message: "" };
  const check = checkStep(flow.step, flow.draft);
  if (!check.accepted) return { flow, message: check.message };
  return flow.step >= lastStep()
    ? { flow: { ...flow, created: true }, message: "" }
    : { flow: { ...flow, step: flow.step + 1 }, message: "" };
};

/** Move back one step. The first step is the floor, and a created flow is done. */
export const back = (flow: Flow): Flow =>
  flow.created || flow.step <= 1 ? flow : { ...flow, step: flow.step - 1 };

/** Edit one field; the step does not move, whatever the draft says. */
export const edit = (flow: Flow, draft: Draft): Flow =>
  flow.created ? flow : { ...flow, draft };

/** Start another workspace from the first step. */
export const restart = (): Flow => initialFlow;

/** The readout the preview prints under the flow. */
export const describe = (flow: Flow): string =>
  flow.created
    ? `created=${flow.draft.name.trim()} seats=${flow.draft.seats.trim()}`
    : `step=${flow.step}/${lastStep()} value=${flow.step} status=${statuses(flow.step).join(",")}`;

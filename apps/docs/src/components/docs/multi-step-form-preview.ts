/**
 * The multi-step form preview's model: the draft the caller owns, the gate each
 * step runs, and the step arithmetic the shipped `MultiStepForm` performs.
 *
 * The component keeps one piece of state — the current step — and the draft is
 * the caller's. Two rules belong to the component and are mirrored here so a
 * test can fail on them: the current step never leaves `1…count`, and a step's
 * gate runs **before** the workflow moves (on Next) and again on the last
 * step's Submit. The whole-record decode `Form` owns is deliberately absent.
 *
 * Absence is a tagged union rather than `null`, matching the `Option` the
 * shipped component answers with. This is the docs app's browser model, not the
 * shipped logic; the preview cannot mount the library (it renders through
 * GPUix).
 */

/** The draft every wizard field writes into. */
export interface WizardDraft {
  readonly name: string;
  readonly port: string;
  readonly accepted: boolean;
}

/** A draft before the reader has touched anything. */
export const EMPTY_WIZARD_DRAFT: WizardDraft = {
  name: "",
  port: "",
  accepted: false,
};

/** One step of the preview: its key, title and one line of support. */
export interface WizardStep {
  readonly id: "name" | "port" | "review";
  readonly title: string;
  readonly description: string;
}

/** The workspace flow's steps, in the order the indicator paints them. */
export const WIZARD_STEPS: ReadonlyArray<WizardStep> = [
  { id: "name", title: "Name", description: "Lowercase, 3–24 characters" },
  { id: "port", title: "Port", description: "1024–65535" },
  { id: "review", title: "Review", description: "Accept the checklist" },
];

/** A workspace name is lowercase letters, digits and hyphens, 3–24 long. */
export const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/;

/** The sentence the name step refuses with. */
export const NAME_MESSAGE = "Use 3 to 24 lowercase letters, digits or hyphens";

/** The sentence the port step refuses with. */
export const PORT_MESSAGE = "Enter a port from 1024 to 65535";

/** The sentence the review step refuses with. */
export const ACCEPT_MESSAGE =
  "Accept the checklist before creating the workspace";

/**
 * The step a value names, held inside `1…count` — the component's `stepOf`.
 * A count below one reads as 1 and a non-finite value as the first step.
 */
export const stepOf = (value: number, count: number): number => {
  if (count < 1) return 1;
  const named = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.min(Math.max(named, 1), count);
};

/** Whether `step` is the workflow's last one. */
export const isLastStep = (step: number, count: number): boolean =>
  count > 0 && stepOf(step, count) === count;

/** What a step's gate answers: a move, or the sentence that refuses it. */
export type WizardGate =
  | { readonly _tag: "Pass" }
  | { readonly _tag: "Refuse"; readonly message: string };

/** The gate that lets the workflow move. */
export const passGate: WizardGate = { _tag: "Pass" };

/** Whether a gate refuses the move. */
export const refuses = (
  gate: WizardGate,
): gate is Extract<WizardGate, { readonly _tag: "Refuse" }> =>
  gate._tag === "Refuse";

/**
 * The gate the step at `step` runs. A step the list does not name has no gate,
 * which the component reads as `None`.
 */
export const gateOf = (step: number, draft: WizardDraft): WizardGate => {
  const id = WIZARD_STEPS[step - 1]?.id;
  if (id === "name") {
    return NAME_PATTERN.test(draft.name)
      ? passGate
      : { _tag: "Refuse", message: NAME_MESSAGE };
  }
  if (id === "port") {
    const port = Number(draft.port);
    const usable = /^[0-9]+$/.test(draft.port) && port >= 1024 && port <= 65535;
    return usable ? passGate : { _tag: "Refuse", message: PORT_MESSAGE };
  }
  if (id === "review") {
    return draft.accepted
      ? passGate
      : { _tag: "Refuse", message: ACCEPT_MESSAGE };
  }
  return passGate;
};

/** The refusal on screen, or the fact that none is. */
export type WizardRefusal =
  | { readonly _tag: "None" }
  | {
      readonly _tag: "Refused";
      readonly step: number;
      readonly message: string;
    };

/** Whether a refusal carries a message. */
export const isRefused = (
  refusal: WizardRefusal,
): refusal is Extract<WizardRefusal, { readonly _tag: "Refused" }> =>
  refusal._tag === "Refused";

/** Whether a refusal was raised on the step at `step`. */
export const refusedOn = (
  refusal: WizardRefusal,
  step: number,
): refusal is Extract<WizardRefusal, { readonly _tag: "Refused" }> =>
  isRefused(refusal) && refusal.step === step;

/** What the caller was told, or the fact that Submit has not passed. */
export type WizardSubmission =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Submitted"; readonly label: string };

/** Whether Submit has passed and told the caller. */
export const submitted = (
  submission: WizardSubmission,
): submission is Extract<WizardSubmission, { readonly _tag: "Submitted" }> =>
  submission._tag === "Submitted";

/** The preview's state: the current step, the refusal and the caller's report. */
export interface WizardState {
  readonly step: number;
  readonly refusal: WizardRefusal;
  readonly submission: WizardSubmission;
}

/** The first step, with no refusal and nothing submitted. */
export const initialWizard: WizardState = {
  step: 1,
  refusal: { _tag: "None" },
  submission: { _tag: "Idle" },
};

/** The refusal to paint: only the one raised on the step on screen. */
export const visibleRefusal = (state: WizardState): WizardRefusal =>
  refusedOn(state.refusal, stepOf(state.step, WIZARD_STEPS.length))
    ? state.refusal
    : { _tag: "None" };

/** The refusal a step raised, remembered with that step. */
const refused = (step: number, message: string): WizardRefusal => ({
  _tag: "Refused",
  step,
  message,
});

/** Move one step forward, or stay put with the message the gate raised. */
export const advance = (
  state: WizardState,
  draft: WizardDraft,
): WizardState => {
  const count = WIZARD_STEPS.length;
  const current = stepOf(state.step, count);
  const gate = gateOf(current, draft);
  if (refuses(gate)) {
    return { ...state, refusal: refused(current, gate.message) };
  }
  return {
    ...state,
    step: Math.min(current + 1, count),
    refusal: { _tag: "None" },
  };
};

/**
 * Move one step back. The component clears the refusal on Back, so the message
 * a step raised cannot follow the reader to the previous step.
 */
export const back = (state: WizardState): WizardState => ({
  ...state,
  step: Math.max(1, stepOf(state.step, WIZARD_STEPS.length) - 1),
  refusal: { _tag: "None" },
});

/** The label a passing Submit reports, the way the example records it. */
export const submittedLabel = (draft: WizardDraft): string =>
  `created ${draft.name}:${draft.port}`;

/**
 * Submit: only the last step paints the action, and its gate runs again before
 * the caller is told — the two jobs the page distinguishes from `Form`'s
 * whole-record decode.
 */
export const submit = (state: WizardState, draft: WizardDraft): WizardState => {
  const count = WIZARD_STEPS.length;
  const current = stepOf(state.step, count);
  if (!isLastStep(current, count)) return state;
  const gate = gateOf(current, draft);
  if (refuses(gate)) {
    return { ...state, refusal: refused(current, gate.message) };
  }
  return {
    ...state,
    refusal: { _tag: "None" },
    submission: { _tag: "Submitted", label: submittedLabel(draft) },
  };
};

/** The readout the preview prints under the workflow. */
export const describeWizard = (state: WizardState): string => {
  const refusal = visibleRefusal(state);
  return `step=${state.step}/${WIZARD_STEPS.length} refusal=${
    isRefused(refusal) ? refusal.message : "none"
  } submitted=${submitted(state.submission) ? state.submission.label : "none"}`;
};

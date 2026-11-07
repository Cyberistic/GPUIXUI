export interface WizardDraft {
  readonly name: string;
  readonly port: string;
  readonly accepted: boolean;
}

export const EMPTY_WIZARD_DRAFT: WizardDraft = {
  name: "",
  port: "",
  accepted: false,
};

export interface WizardStep {
  readonly id: "name" | "port" | "review";
  readonly title: string;
  readonly description: string;
}

export const WIZARD_STEPS: ReadonlyArray<WizardStep> = [
  { id: "name", title: "Name", description: "Lowercase, 3–24 characters" },
  { id: "port", title: "Port", description: "1024–65535" },
  { id: "review", title: "Review", description: "Accept the checklist" },
];

export const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/;

export const NAME_MESSAGE = "Use 3 to 24 lowercase letters, digits or hyphens";

export const PORT_MESSAGE = "Enter a port from 1024 to 65535";

export const ACCEPT_MESSAGE =
  "Accept the checklist before creating the workspace";

export const stepOf = (value: number, count: number): number => {
  if (count < 1) return 1;
  const named = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.min(Math.max(named, 1), count);
};

export const isLastStep = (step: number, count: number): boolean =>
  count > 0 && stepOf(step, count) === count;

export type WizardGate =
  | { readonly _tag: "Pass" }
  | { readonly _tag: "Refuse"; readonly message: string };

export const passGate: WizardGate = { _tag: "Pass" };

export const refuses = (
  gate: WizardGate,
): gate is Extract<WizardGate, { readonly _tag: "Refuse" }> =>
  gate._tag === "Refuse";

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

export type WizardRefusal =
  | { readonly _tag: "None" }
  | {
      readonly _tag: "Refused";
      readonly step: number;
      readonly message: string;
    };

export const isRefused = (
  refusal: WizardRefusal,
): refusal is Extract<WizardRefusal, { readonly _tag: "Refused" }> =>
  refusal._tag === "Refused";

export const refusedOn = (
  refusal: WizardRefusal,
  step: number,
): refusal is Extract<WizardRefusal, { readonly _tag: "Refused" }> =>
  isRefused(refusal) && refusal.step === step;

export type WizardSubmission =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Submitted"; readonly label: string };

export const submitted = (
  submission: WizardSubmission,
): submission is Extract<WizardSubmission, { readonly _tag: "Submitted" }> =>
  submission._tag === "Submitted";

export interface WizardState {
  readonly step: number;
  readonly refusal: WizardRefusal;
  readonly submission: WizardSubmission;
}

export const initialWizard: WizardState = {
  step: 1,
  refusal: { _tag: "None" },
  submission: { _tag: "Idle" },
};

export const visibleRefusal = (state: WizardState): WizardRefusal =>
  refusedOn(state.refusal, stepOf(state.step, WIZARD_STEPS.length))
    ? state.refusal
    : { _tag: "None" };

const refused = (step: number, message: string): WizardRefusal => ({
  _tag: "Refused",
  step,
  message,
});

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

export const back = (state: WizardState): WizardState => ({
  ...state,
  step: Math.max(1, stepOf(state.step, WIZARD_STEPS.length) - 1),
  refusal: { _tag: "None" },
});

export const submittedLabel = (draft: WizardDraft): string =>
  `created ${draft.name}:${draft.port}`;

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

export const describeWizard = (state: WizardState): string => {
  const refusal = visibleRefusal(state);
  return `step=${state.step}/${WIZARD_STEPS.length} refusal=${
    isRefused(refusal) ? refusal.message : "none"
  } submitted=${submitted(state.submission) ? state.submission.label : "none"}`;
};

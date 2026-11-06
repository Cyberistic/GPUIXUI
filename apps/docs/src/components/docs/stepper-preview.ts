export type StepStatus = "complete" | "current" | "upcoming";

export interface StepSpec {
  readonly label: string;
  readonly description: string;
}

export const STEPS: ReadonlyArray<StepSpec> = [
  { label: "Workspace", description: "Name and handle" },
  { label: "Seats", description: "How many people" },
  { label: "Review", description: "Create it" },
];

export const currentStep = (value: number): number =>
  Number.isFinite(value) ? value : 1;

export const stepStatus = (current: number, step: number): StepStatus => {
  const at = currentStep(current);
  return step < at ? "complete" : step === at ? "current" : "upcoming";
};

export const statuses = (
  current: number,
  count: number = STEPS.length,
): ReadonlyArray<StepStatus> =>
  Array.from({ length: count }, (_, index) => stepStatus(current, index + 1));

export interface Draft {
  readonly name: string;
  readonly seats: string;
}

export interface Check {
  readonly accepted: boolean;
  readonly message: string;
}

const accepts = (): Check => ({ accepted: true, message: "" });

const refuses = (message: string): Check => ({ accepted: false, message });

export const checkName = (name: string): Check =>
  name.trim().length === 0 ? refuses("Give the workspace a name") : accepts();

export const checkSeats = (seats: string): Check => {
  const trimmed = seats.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) >= 1
    ? accepts()
    : refuses("One seat or more, as a whole number");
};

export const checkStep = (step: number, draft: Draft): Check =>
  step === 1
    ? checkName(draft.name)
    : step === 2
      ? checkSeats(draft.seats)
      : accepts();

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

export const lastStep = (): number => STEPS.length;

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

export const back = (flow: Flow): Flow =>
  flow.created || flow.step <= 1 ? flow : { ...flow, step: flow.step - 1 };

export const edit = (flow: Flow, draft: Draft): Flow =>
  flow.created ? flow : { ...flow, draft };

export const restart = (): Flow => initialFlow;

export const describe = (flow: Flow): string =>
  flow.created
    ? `created=${flow.draft.name.trim()} seats=${flow.draft.seats.trim()}`
    : `step=${flow.step}/${lastStep()} value=${flow.step} status=${statuses(flow.step).join(",")}`;

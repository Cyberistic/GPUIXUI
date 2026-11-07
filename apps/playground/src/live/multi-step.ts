import { Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const MULTI_STEP_IDS = {
  probe: "multi-step-probe",
  name: "multi-step-name",
  nameInput: "multi-step-name-input",
  port: "multi-step-port",
  portInput: "multi-step-port-input",
  back: "multi-step-back",
  next: "multi-step-next",
  submit: "multi-step-submit",
  review: "multi-step-review",
  terms: "multi-step-terms",
  applied: "multi-step-applied",
  readout: "multi-step-readout",
} as const;

export const MULTI_STEP_STEPS = ["Name", "Port", "Review"] as const;

export type MultiStepStep = 1 | 2 | 3;

export interface MultiStepDraft {
  readonly name: string;
  readonly port: string;
}

export const emptyMultiStepDraft: MultiStepDraft = { name: "", port: "" };

export const MULTI_STEP_NAME_MESSAGE =
  "Use 3 to 24 lowercase letters, digits or hyphens";

export const MULTI_STEP_PORT_MESSAGE = "Enter a port from 1024 to 65535";

export const MULTI_STEP_TERMS_MESSAGE =
  "Accept the checklist before creating the workspace";

export const WorkspaceName = Schema.String.check(
  Schema.makeFilter(
    (value: string) => /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/.test(value),
    {
      identifier: "WorkspaceNameShapeCheck",
      title: "Workspace name",
      description:
        "Three to twenty-four lowercase letters, digits or hyphens, starting and ending with a letter or digit.",
      message: MULTI_STEP_NAME_MESSAGE,
    },
  ),
);

export const Port = Schema.String.check(
  Schema.makeFilter(
    (value: string) => {
      const port = Number(value);
      return /^[0-9]+$/.test(value) && port >= 1024 && port <= 65535;
    },
    {
      identifier: "PortRangeCheck",
      title: "Port",
      description: "A decimal port from 1024 to 65535.",
      message: MULTI_STEP_PORT_MESSAGE,
    },
  ),
);

export const Accepted = Schema.Boolean.check(
  Schema.makeFilter((value: boolean) => value, {
    identifier: "ChecklistAcceptedCheck",
    title: "Checklist accepted",
    description: "The review step's checklist is accepted.",
    message: MULTI_STEP_TERMS_MESSAGE,
  }),
);

export class WorkspaceSetup extends Schema.Class<WorkspaceSetup>(
  "WorkspaceSetup",
)({
  name: WorkspaceName,
  port: Port,
  accepted: Accepted,
}) {}

const satisfies =
  (schema: Schema.Constraint) =>
  (value: string): boolean =>
    Schema.is(schema)(value);

const nameUsable = satisfies(WorkspaceName);
const portUsable = satisfies(Port);

export const stepError = (
  step: MultiStepStep,
  draft: MultiStepDraft,
): Option.Option<string> =>
  Match.value(step).pipe(
    Match.when(1, () =>
      nameUsable(draft.name)
        ? Option.none<string>()
        : Option.some(MULTI_STEP_NAME_MESSAGE),
    ),
    Match.when(2, () =>
      portUsable(draft.port)
        ? Option.none<string>()
        : Option.some(MULTI_STEP_PORT_MESSAGE),
    ),
    Match.when(3, () => Option.none<string>()),
    Match.exhaustive,
  );

export const nextStep = (step: MultiStepStep): MultiStepStep =>
  Match.value(step).pipe(
    Match.when(1, () => 2 as const),
    Match.when(2, () => 3 as const),
    Match.when(3, () => 3 as const),
    Match.exhaustive,
  );

export const previousStep = (step: MultiStepStep): MultiStepStep =>
  Match.value(step).pipe(
    Match.when(1, () => 1 as const),
    Match.when(2, () => 1 as const),
    Match.when(3, () => 2 as const),
    Match.exhaustive,
  );

export const multiStepReadout = (
  step: MultiStepStep,
  draft: MultiStepDraft,
  accepted: boolean,
  submits: number,
): string =>
  `step=${step} name=${draft.name === "" ? "none" : draft.name} port=${
    draft.port === "" ? "none" : draft.port
  } accepted=${accepted} submits=${submits}`;

export const appliedReadout = (
  applied: Option.Option<WorkspaceSetup>,
): string =>
  Option.match(applied, {
    onNone: () => "applied=none",
    onSome: (setup) => `applied=${setup.name}:${setup.port}`,
  });

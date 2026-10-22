/**
 * The wizard `multi-step-form-lifecycle` drives.
 *
 * Tier 5's *multi-step forms* row is marked `?` in the inventory: a wizard is
 * composition over the shipped `Form`, `Stepper`, `Field` and `Checkbox`, and
 * nothing had measured the rules a caller writes around them. This fixture is
 * the caller's half — the step gate, the app-owned draft and the schema that
 * decodes the record — so the probe's checks and the README table are read off
 * one source.
 *
 * Two gates are deliberate and different: a step's own fields are checked
 * before the wizard moves, while the whole record (including the review step's
 * acceptance) is decoded by `Form` on submit. The probe measures both, so a
 * wizard whose step gate is mistaken for the form's validation fails.
 */
import { Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The ids the probe's view and steps share. */
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

/** The three steps, in the order the stepper paints them. */
export const MULTI_STEP_STEPS = ["Name", "Port", "Review"] as const;

/** A step's 1-based number. */
export type MultiStepStep = 1 | 2 | 3;

/** The app-owned draft: never decoded until the form submits. */
export interface MultiStepDraft {
  readonly name: string;
  readonly port: string;
}

/** The draft a mounted wizard starts with. */
export const emptyMultiStepDraft: MultiStepDraft = { name: "", port: "" };

/** The message a workspace name earns when it is not usable. */
export const MULTI_STEP_NAME_MESSAGE =
  "Use 3 to 24 lowercase letters, digits or hyphens";

/** The message a port earns when it is outside the range. */
export const MULTI_STEP_PORT_MESSAGE = "Enter a port from 1024 to 65535";

/** The message the review step earns while the checklist is unaccepted. */
export const MULTI_STEP_TERMS_MESSAGE =
  "Accept the checklist before creating the workspace";

/** A workspace name: lowercase, 3–24 characters, no leading or trailing dash. */
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

/** A decimal TCP port in the unprivileged range. */
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

/** The accepted checklist item the review step requires. */
export const Accepted = Schema.Boolean.check(
  Schema.makeFilter((value: boolean) => value, {
    identifier: "ChecklistAcceptedCheck",
    title: "Checklist accepted",
    description: "The review step's checklist is accepted.",
    message: MULTI_STEP_TERMS_MESSAGE,
  }),
);

/** The record the form decodes: the wizard's draft plus its acceptance. */
export class WorkspaceSetup extends Schema.Class<WorkspaceSetup>(
  "WorkspaceSetup",
)({
  name: WorkspaceName,
  port: Port,
  accepted: Accepted,
}) {}

/** Whether a value satisfies one named schema, read through that schema. */
const satisfies =
  (schema: Schema.Constraint) =>
  (value: string): boolean =>
    Schema.is(schema)(value);

const nameUsable = satisfies(WorkspaceName);
const portUsable = satisfies(Port);

/**
 * The message the current step refuses to move for, or `None` when it may.
 *
 * The review step gates nothing itself: its acceptance is part of the record
 * only the form decodes, which is the distinction the probe's last check reads.
 */
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

/** The next step's number; the last step stays put. */
export const nextStep = (step: MultiStepStep): MultiStepStep =>
  Match.value(step).pipe(
    Match.when(1, () => 2 as const),
    Match.when(2, () => 3 as const),
    Match.when(3, () => 3 as const),
    Match.exhaustive,
  );

/** The previous step's number; the first step stays put. */
export const previousStep = (step: MultiStepStep): MultiStepStep =>
  Match.value(step).pipe(
    Match.when(1, () => 1 as const),
    Match.when(2, () => 1 as const),
    Match.when(3, () => 2 as const),
    Match.exhaustive,
  );

/** The `key=value` line every check reads the wizard's state from. */
export const multiStepReadout = (
  step: MultiStepStep,
  draft: MultiStepDraft,
  accepted: boolean,
  submits: number,
): string =>
  `step=${step} name=${draft.name === "" ? "none" : draft.name} port=${
    draft.port === "" ? "none" : draft.port
  } accepted=${accepted} submits=${submits}`;

/** The values the form's `onSubmit` received, decoded or not. */
export const appliedReadout = (
  applied: Option.Option<WorkspaceSetup>,
): string =>
  Option.match(applied, {
    onNone: () => "applied=none",
    onSome: (setup) => `applied=${setup.name}:${setup.port}`,
  });

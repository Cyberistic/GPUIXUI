/**
 * The pure model behind `wizard-flow` (plan `386`): the draft, the per-step
 * rules, the navigation and the readout a multi-step form renders.
 *
 * The rules live here, not in the view, so the part a wizard must get right —
 * which fields belong to a step, what makes one invalid, where focus goes when
 * a step is rejected or entered, and what the review shows — is provable
 * without a renderer. Each user-facing message is a constant shared by the
 * field's schema and the view, so a decode failure and a painted message cannot
 * drift.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** A field the wizard owns, in the order a step presents it. */
export const Field = Schema.Literals(["name", "email", "slug", "team"]);
/** A field the wizard owns, in the order a step presents it. */
export type Field = typeof Field.Type;

/** The three steps, 1-based. */
export const StepIndex = Schema.Literals([1, 2, 3]);
/** The three steps, 1-based. */
export type StepIndex = typeof StepIndex.Type;

/** How step content is kept between transitions. */
export const Mode = Schema.Literals(["unmount", "hide"]);
/** How step content is kept between transitions. */
export type Mode = typeof Mode.Type;

/** What the last navigation did. */
export const LastAction = Schema.Literals([
  "start",
  "next",
  "back",
  "submit",
  "mode",
]);
/** What the last navigation did. */
export type LastAction = typeof LastAction.Type;

/** Everything the wizard collects. */
export interface Draft {
  readonly name: string;
  readonly email: string;
  readonly slug: string;
  readonly team: string;
}

/** A draft with nothing filled in. */
export const EMPTY_DRAFT: Draft = { name: "", email: "", slug: "", team: "" };

/** The steps in order. No arithmetic casts. */
export const STEP_ORDER: ReadonlyArray<StepIndex> = [1, 2, 3];

/** Each step's visible title. */
export const STEP_TITLES: Record<StepIndex, string> = {
  1: "Account",
  2: "Workspace",
  3: "Review",
};

/** Each field's user-facing message. One source for the schema and the view. */
export const MESSAGES: Record<Field, string> = {
  name: "Enter at least three characters",
  email: "Enter an address containing @",
  slug: "Use lowercase words joined by a hyphen",
  team: "Name the team",
};

/** A name of at least three characters. */
const nameRule = Schema.String.check(
  Schema.makeFilter((value: string) => value.length >= 3, {
    identifier: "WizardNameCheck",
    title: "Wizard name",
    description: "A name of at least three characters.",
    message: MESSAGES.name,
  }),
);

/** An address containing `@` and at least three characters. */
const emailRule = Schema.String.check(
  Schema.makeFilter(
    (value: string) => value.length >= 3 && value.includes("@"),
    {
      identifier: "WizardEmailCheck",
      title: "Wizard email",
      description: "An address containing @ and at least three characters.",
      message: MESSAGES.email,
    },
  ),
);

/** Lowercase words joined by a hyphen, with no spaces. */
const slugRule = Schema.String.check(
  Schema.makeFilter(
    (value: string) =>
      value.includes("-") &&
      !value.includes(" ") &&
      value === value.toLowerCase(),
    {
      identifier: "WizardSlugCheck",
      title: "Wizard slug",
      description: "Lowercase words joined by a hyphen, with no spaces.",
      message: MESSAGES.slug,
    },
  ),
);

/** A team name of at least one character. */
const teamRule = Schema.String.check(
  Schema.makeFilter((value: string) => value.length >= 1, {
    identifier: "WizardTeamCheck",
    title: "Wizard team",
    description: "A team name of at least one character.",
    message: MESSAGES.team,
  }),
);

/** The one rule a field is valid against. */
const ruleOf = (field: Field): Schema.Schema<string> =>
  Match.value(field).pipe(
    Match.when("name", () => nameRule),
    Match.when("email", () => emailRule),
    Match.when("slug", () => slugRule),
    Match.when("team", () => teamRule),
    Match.exhaustive,
  );

/** Whether `value` satisfies `field`'s rule. */
export const isValid = (field: Field, value: string): boolean =>
  Schema.is(ruleOf(field))(value);

/** The fields a step owns, in focus order; the review owns none. */
export const fieldsOf = (step: StepIndex): ReadonlyArray<Field> =>
  Match.value(step).pipe(
    Match.when(1, () => ["name", "email"] as const),
    Match.when(2, () => ["slug", "team"] as const),
    Match.when(3, () => [] as const),
    Match.exhaustive,
  );

/** Every failing field of `step`, in the step's own order. */
export const invalidFields = (
  step: StepIndex,
  draft: Draft,
): ReadonlyArray<Field> =>
  Arr.filter(fieldsOf(step), (field) => !isValid(field, draft[field]));

/** The first failing field of `step`, the one a rejection focuses. */
export const firstInvalid = (
  step: StepIndex,
  draft: Draft,
): Option.Option<Field> => Arr.head(invalidFields(step, draft));

/** The step after `step`, or `None` on the review. */
export const nextStep = (step: StepIndex): Option.Option<StepIndex> =>
  Arr.findFirst(STEP_ORDER, (candidate) => candidate > step);

/** The step before `step`, or `None` on the account. */
export const previousStep = (step: StepIndex): Option.Option<StepIndex> =>
  Arr.findLast(STEP_ORDER, (candidate) => candidate < step);

/** The `testId` a step focuses when it becomes active. */
export const entryFocus = (step: StepIndex): string =>
  Match.value(step).pipe(
    Match.when(1, () => "wizard-name"),
    Match.when(2, () => "wizard-slug"),
    Match.when(3, () => "wizard-submit"),
    Match.exhaustive,
  );

/** The `testId` of a field's input. */
export const inputId = (field: Field): string => `wizard-${field}`;

const valueOf = (value: string): string => (value === "" ? "none" : value);

/** `ada <ada@x> my-w / core` — the review line and the submitted value. */
export const summary = (draft: Draft): string =>
  `${valueOf(draft.name)} <${valueOf(draft.email)}> ${valueOf(draft.slug)} / ${valueOf(draft.team)}`;

/** Everything the readout renders. */
export interface WizardState {
  readonly step: StepIndex;
  readonly mode: Mode;
  readonly draft: Draft;
  readonly errors: ReadonlyArray<Field>;
  readonly submits: number;
  readonly last: LastAction;
  readonly created: Option.Option<string>;
}

const errorsOf = (errors: ReadonlyArray<Field>): string =>
  Arr.match(errors, {
    onEmpty: () => "0",
    onNonEmpty: (fields) => Arr.join(fields, ","),
  });

/**
 * `step=1 mode=unmount name=none email=none slug=none team=none errors=0 submits=0 last=start created=none summary=none`
 *
 * The summary appears only on the review step: it is the reason that step
 * exists, and printing it earlier would claim more than the screen shows.
 */
export const describeWizard = (state: WizardState): string =>
  Arr.join(
    [
      `step=${state.step}`,
      `mode=${state.mode}`,
      `name=${valueOf(state.draft.name)}`,
      `email=${valueOf(state.draft.email)}`,
      `slug=${valueOf(state.draft.slug)}`,
      `team=${valueOf(state.draft.team)}`,
      `errors=${errorsOf(state.errors)}`,
      `submits=${state.submits}`,
      `last=${state.last}`,
      `created=${Option.getOrElse(state.created, () => "none")}`,
      `summary=${state.step === 3 ? summary(state.draft) : "none"}`,
    ],
    " ",
  );

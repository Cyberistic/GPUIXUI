# 386 — Tier 5 feasibility: a multi-step form (wizard)

**Status:** landed 2026-10-18 · **Phase:** D/E · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `158`, `177`, `188`, `190`, `330`,
`344`, `346`, `378`.

**Number note:** the playground index says the next free number is **`386`**.
Take it, and move the index to `387` after this plan lands.

## 1. Why this plan exists

`COMPONENTS.md`'s Tier 5 row **Multi-step forms** is the last inventory row still
marked `todo | ?` — *"Variant merged here: Form (adabraka `form`) — partial
coverage; validation orchestration is the Tier 2 Form row."* Every other row now
has runtime evidence. A wizard is the missing composition: several validated
steps, one draft, a step indicator, and navigation that moves native focus.

The shipped parts it would compose are already measured individually:

- `Field` / `Fieldset` / `Form` on the consumer path (`tier2-forms`, plan `346`);
- `Stepper`'s derived statuses and `aria-selected` (`tier2-flow`, plan `347`);
- native text entry, caret and `onSubmit` (`text-entry` 188, `pointer-entry` 343,
  `input-edit` 120);
- programmatic focus to a freshly mounted node (`roving-focus` 158, `query-builder`
  378's post-commit reveal);
- mount vs. hide, `visibility: "hidden"` leaving paint and the tab order
  (`workspace-panes` 177).

What no probe answers is the **wizard shell**:

1. **Does changing step need an explicit focus move?** When the focused input
   unmounts with its step, what does the runtime report — and what must the
   component do so the next step's first field is focused?
2. **Can a validation failure inside a click handler focus the first invalid
   field?** The effect that reveals a rule in `query-builder` ran after a commit;
   a wizard must do the same after a *rejected* transition, where nothing else
   changed.
3. **Does an unmounted step leave its tab stops?** If it does, Tab walks into a
   step that is not on screen. And in the **keep-mounted** strategy, does a
   `visibility: "hidden"` step leave them?
4. **Is the draft app state or native editor state?** Unmounting loses native
   state; hiding keeps it. Which one a wizard needs decides the step container.
5. **Does Enter in a field submit the step?** A wizard advances on Enter; if the
   key does not reach `onSubmit`, the contract is a button only.
6. **Do the step indicator's statuses survive the step change** — the shipped
   `Stepper` derives them from one value, and AccessKit exposes `aria-selected`
   only on the current step.

This probe answers all six with **no package code**, one pure model + unit tests,
one consumer-probe view, one headless scenario, one live twin, and a new
`wizard` capability.

## 2. What was already measured (do not re-measure)

| Fact | Source |
| ---- | ------ |
| An `<input>` receives printable keys (including `@` and `-`), fires `onChange` per character, and delivers Enter as the input's `onSubmit` | `text-entry` (188), `input-edit` (120); `@` and `-` re-checked for this plan |
| `renderer.focusElement(id)` focuses a never-clicked node, and the next key is delivered there | `roving-focus` (158), `live-key-routing` (345) |
| A focus call must be ordered after the render that mounts the target; a click handler sees the pre-commit tree | `query-builder` (378) §8 |
| `visibility: "hidden"` leaves the paint and **also leaves the tab order**; `display: "none"` is a no-op | `workspace-panes` (177) |
| A live step must `settle`/`waitFor` because the automation protocol has no frame boundary | `smoke:live` (189), plans `344`–`347` |
| AccessKit exposes `aria-selected`; `role="listitem"` is a `ListItem` | `stepper` (347), `a11y-tree` (160) |
| An a11y node's `value` is the **authored prop**, so a controlled input's state is readable after a remount | `text-entry` (188) §9 |
| The a11y dump is `TestRenderer`-only; the live renderer has noa11y or style method | plan `197` |
| A step/unmount swap can leave the automation locator on the previous node, so a live read waits for the new `testId` | `tier2-editing` (347) |

## 3. What will be proven

Capability: `wizard` (new). Scenario: `wizard-flow`; live twin: `live-wizard`.

### 3.1 The model (`wizard-model.ts`)

Three steps, one draft, four validated fields:

| Step | Fields | Rule | Message |
| ---- | ------ | ---- | ------- |
| 1 Account | `name` | at least 3 characters | `Enter at least three characters` |
| 1 Account | `email` | contains `@` and at least 3 characters | `Enter an address containing @` |
| 2 Workspace | `slug` | contains `-`, no spaces, and lowercase | `Use lowercase words joined by a hyphen` |
| 2 Workspace | `team` | at least 1 character | `Name the team` |
| 3 Review | — | — | — |

Each rule is a `Schema.String.check(Schema.makeFilter(...))` carrying
`identifier`, `title`, `description` and the exact message above (EF-12c). The
model exposes:

```ts
export const Field = Schema.Literals(["name", "email", "slug", "team"]);
export type Field = typeof Field.Type;

export const StepIndex = Schema.Literals([1, 2, 3]);
export type StepIndex = typeof StepIndex.Type;

export interface Draft {
  readonly name: string;
  readonly email: string;
  readonly slug: string;
  readonly team: string;
}

export const EMPTY_DRAFT: Draft;
export const STEP_TITLES: Record<StepIndex, string>; // Account, Workspace, Review
export const MESSAGES: Record<Field, string>;

/** The fields a step owns, in focus order; the review step owns none. */
export const fieldsOf: (step: StepIndex) => ReadonlyArray<Field>;

/** `Schema.is`/decode of the field's one rule. */
export const isValid: (field: Field, value: string) => boolean;

/** Every failing field of the step, in field order. */
export const invalidFields: (
  step: StepIndex,
  draft: Draft,
) => ReadonlyArray<Field>;

/** The first failing field's testId, for the focus move. */
export const firstInvalid: (
  step: StepIndex,
  draft: Draft,
) => Option.Option<Field>;

/** The next/previous step, or `None` at either end. */
export const nextStep: (step: StepIndex) => Option.Option<StepIndex>;
export const previousStep: (step: StepIndex) => Option.Option<StepIndex>;

/** The testId a step focuses when it becomes active (`wizard-submit` on review). */
export const entryFocus: (step: StepIndex) => string;

/** `ada <ada@x> my-w / core` */
export const summary: (draft: Draft) => string;

export interface WizardState {
  readonly step: StepIndex;
  readonly mode: "unmount" | "hide";
  readonly draft: Draft;
  readonly errors: ReadonlyArray<Field>;
  readonly submits: number;
  readonly last: "start" | "next" | "back" | "submit" | "mode";
  readonly created: Option.Option<string>;
}

/** `step=1 mode=unmount name=none email=none slug=none team=none errors=name,email submits=0 last=next created=none summary=none` */
export const describeWizard: (state: WizardState) => string;
```

Rules:

- No React, no GPUix, no `Date`/`Math.random`; `effect/Array`, `effect/Option`
  and `effect/Schema` only.
- `nextStep`/`previousStep` walk a literal `STEP_ORDER` array; no numeric casts.
- `entryFocus(3) === "wizard-submit"`; `entryFocus(1)`/`entryFocus(2)` are the
  step's first field.
- `describeWizard` prints `summary` only on step 3 (otherwise `summary=none`) and
  `created` as the stored summary or `none`.
- The **view** renders `MESSAGES[field]`; the schema carries the same constant, so
  the message a user sees and the message a decoder would produce cannot drift.

### 3.2 The view (`wizard.tsx`)

A `wizard-frame` (560 px wide, column, 16 px gap, 24 px padding):

- `wizard-mode` — a pressable showing `steps: unmount` / `steps: hide`.
- `wizard-steps` — `role="list"`, `aria-label="Steps"`; three
  `wizard-step-1/2/3` children, each `role="listitem"`, `aria-label` =
  `STEP_TITLES`, `aria-selected={step === value}`; a marker (`1/2/3`) and the
  title paint inside.
- `wizard-body` — `position: "relative"`, fixed `height: 220`, width `"100%"`.
  - `unmount`: only the active step's subtree is rendered.
  - `hide`: the three step subtrees render in absolute slots
    (`left/top: 0`, `width: "100%"`, `height: 220`), the active slot
    `visibility: "visible"`/`pointerEvents: "auto"`, the others hidden/none —
    the plan-177 recipe.
- `wizard-step-account`:
  - label `Full name`; `<input testId="wizard-name" aria-id="wizard-name" aria-label="Full name" value={draft.name} onChange={edit("name")} onSubmit={advance}>`; an error `<text testId="wizard-name-error" role="alert">` when the field is in `errors`.
  - label `Email`; `wizard-email` the same way.
- `wizard-step-workspace`: `wizard-slug`, `wizard-team`, same shape, labels
  `Workspace slug` and `Team`.
- `wizard-step-review`:
  - `<text testId="wizard-review">{summary(draft)}</text>`;
  - `Pressable wizard-submit` labelled `Create workspace`, with a `ref`;
  - `<text testId="wizard-done">` = `Created ${created}` after a submit.
- `wizard-footer`: `wizard-back` (only when `step > 1`) and `wizard-next` (only
  when `step < 3`), both `Pressable` with refs.
- `wizard-readout` — `describeWizard(state)`.

**State.** `step`, `mode`, `draft`, `errors`, `submits`, `last`, `created` as
React state. Navigation is:

- `advance()`: `invalidFields(step, draft)`; if non-empty, set `errors`, set
  `last="next"` and request focus on `wizard-${first invalid}` **without**
  changing step; otherwise clear errors, go to `nextStep(step)` (no-op on
  review), set `last="next"` and request focus on `entryFocus(next)`.
- `back()`: clear errors, go to `previousStep(step)`, `last="back"`, request
  focus on `entryFocus(previous)`.
- `submit()`: validate every step (`Arr.flatMap` over `STEP_ORDER`); if any step
  fails, jump to the first failing step, set its `errors` and focus its first
  invalid field; otherwise increment `submits`, store `summary(draft)` in
  `created`, `last="submit"`.
- `edit(field, value)`: set the draft; drop **that field** from `errors` (not all
  of them), so the count is derived.
- `toggleMode()`: `unmount ↔ hide`, `last="mode"`, nothing else changes.

**Focus.** A `useLayoutEffect` keyed on a **nonce** (a `useState<number>` plus a
`useRef<Option<string>>` target, exactly the pattern `query-builder` uses for its
reveal) reads the target's `PublicInstance` from a `testId → instance` ref
registry and calls `useGpuix().renderer.focusElement(instance.id)`. A repeated
request on the same field still runs because the nonce changes. The first mount
requests nothing, so the baseline focus is `none`.

All colours, gaps and type come from `useTheme()`; the only literals are
geometry (`560`, `220`, `12`, marker `24`).

### 3.3 Checks

| Area | Check |
| ---- | ----- |
| baseline | `wizard-frame` painted; readout exactly `step=1 mode=unmount name=none email=none slug=none team=none errors=0 submits=0 last=start created=none summary=none`; `wizard-name` is an `input`; `wizard-slug`/`wizard-review` are **not mounted** (`bounds === null`) |
| indicator | the three chips paint `1 Account`, `2 Workspace`, `3 Review`; `wizard-step-1` is a `ListItem` with `selected=true` and `wizard-step-2` `selected=false` |
| invalid Next | click `wizard-next` with an empty draft: stays `step=1`, `errors=name,email`; both messages paint (the schema's own text); **focus is `wizard-name`** |
| per-field clear | type `ada` into `wizard-name`: `name=ada` and `errors=email` (the name's message unpaints, the email's stays) |
| rejected Next | click `wizard-next`: stays `step=1`, `errors=email`, **focus `wizard-email`** |
| valid Next | type `ada@x`, click `wizard-next`: `step=2`, `errors=0`, `wizard-name` unmounted, `wizard-slug` painted, **focus `wizard-slug`**; the indicator's `selected` moves to chip 2 |
| Back keeps the draft | click `wizard-back`: `step=1`, `last=back`, the a11y `value` of `wizard-name` is `ada` and of `wizard-email` is `ada@x`, **focus `wizard-name`** |
| forward again | click `wizard-next`: `step=2`, the slug input is empty, focus `wizard-slug` |
| Enter rejects | press Enter in the empty slug: stays `step=2`, `errors=slug`, the message paints, focus `wizard-slug` |
| Enter advances to the next failure | type `my-w`, press Enter: `errors=team`, **focus `wizard-team`**, still `step=2` |
| review | type `core`, click `wizard-next`: `step=3`, both editors unmounted, `wizard-review` paints `ada <ada@x> my-w / core`, chip 3 `selected=true`, **focus `wizard-submit`** |
| submit | click `wizard-submit`: `submits=1`, `last=submit`, `created=ada <ada@x> my-w / core`, `wizard-done` paints `Created ada <ada@x> my-w / core` |
| back through both steps | Back → `step=2` with `slug`/`team` a11y values restored and focus `wizard-slug`; Back → `step=1` with `name`/`email` restored and focus `wizard-name` |
| tab order (unmount) | from `wizard-name`, four `focusNext` presses visit only `wizard-name`, `wizard-email` and `wizard-next`; no step-2/3 id appears; the fourth returns to `wizard-name` |
| hide mode | toggle `wizard-mode`: `mode=hide`, step and values unchanged; the inactive steps are **retained** (`elementType("wizard-slug") === "input"`) but **unpainted** (`bounds === null`) and absent from the painted text |
| hide mode tabs | a `focusNext` walk from `wizard-name` never reaches `wizard-slug` (the hidden slot leaves the order, plan 177) |
| hide mode step change | Next → `step=2`, focus `wizard-slug`; Back → `step=1`, the name a11y `value` survives (the subtree was never unmounted) |
| live | a real window repeats the rejected Next (message + focus), the valid Next (focus `wizard-slug`), typing, the Enter rejection, review, submit and one Back; paced by `settle`/`waitFor`/`waitForFocus`, no style or a11y read |

The probe does **not** re-measure generic typing, focus traversal, `visibility`
semantics or `Stepper`'s statuses. It does not claim per-field async validation,
server submit, persisted wizard progress, or an accessible error summary.

## 4. Files

Create:

- `apps/playground/src/scenarios/wizard-model.ts` — the draft, rules and readout.
- `apps/playground/src/scenarios/wizard-model.test.ts` — §8.1.
- `apps/playground/src/scenarios/wizard.tsx` — the view, scenario and live view.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register `wizardScenario`,
  add `"wizard"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"wizard"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, append
  `live-wizard` to `liveScenarios`.
- `apps/playground/README.md` — a `## Multi-step forms (plan 386)` section with
  the measured facts, the registry paragraph, and the evidence counts (which
  currently lag at `85/85`/`36/36`; correct them while here).
- `COMPONENTS.md` — the **Multi-step forms** row: `partial (composition; probe)`
  with the measured contract, and a Tier 3/4 notes column only if a capability
  table row is needed (do not add a new capability row outside the row's text).
- `TODO.md` — tick the new playground task with the measured counts.
- `.agents/slop/plans/README.md` — add the `386` row; move the next free number
  to `387`.

Do **not** change any package source, `apps/docs`, the shell or the theme. Any
defect found is a `TODO.md` task with its own plan number.

## 5. The view's focus contract (why the nonce)

A naive `useEffect(() => focus(ref), [step])` has three failure modes this probe
is designed to expose:

1. the effect runs before the new step's ref is assigned (React assigns refs
   before passive effects, so this should not happen — measured);
2. a **rejected** Next changes no step, so a `[step]`-keyed effect never runs and
   the invalid field is never focused;
3. a repeated focus request on the same field is a state no-op.

The nonce + target-ref pattern avoids all three: every request is a new nonce,
and the effect runs once per request. The layout effect is deliberate — focus
should land in the same commit as the new step, not after a paint.

## 6. Steps for the executor

1. Read this plan, then `query-builder.tsx` (post-commit reveal),
   `workspace-panes.tsx` (absolute + visibility slots), `tier2-forms.tsx`
   (validation messages), `roving-focus.tsx` (`focusElement` + registry),
   `probes.ts` and `ui.tsx`.
2. Write `wizard-model.ts` + its test. Run:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; the new unit tests pass beside the existing playground
   tests (**207** at plan `385`).
3. Write `wizard.tsx`, register it, add the capability literals. Run the same
   command. Expected: exit `0`; `scenarioProblems` reports nothing.
4. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only wizard-flow
   ```

   Expected: `1/1 scenarios passed`, exit `0`. A miss reports the readout, the
   focused id or a bound — fix the implementation, or, when the runtime really
   behaves differently, assert the measured fact with a label that says so
   (§9).
5. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected baseline before this plan: `87/87`, `2920` checks, exit `0`. After:
   `88/88`, `2920 + <new>` checks, exit `0`, `wizard=verified`.
6. Add `live-wizard` and run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected baseline: `38/38` live, `715` checks, exit `0`. After:
   `39/39`, `715 + <new>`, exit `0`, one screenshot.
7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`.
8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`, this plan's
   §9 and the plan index with the measured counts and every fact that changed
   the design. Commit the plan first, then the probe.

## 7. Test plan

### 7.1 Unit tests (`wizard-model.test.ts`)

Each must be able to fail:

| Test | Guards |
| ---- | ------ |
| `EMPTY_DRAFT` | all four fields empty; the four message constants are non-empty and distinct |
| `fieldsOf` | step 1 is `[name, email]`, step 2 is `[slug, team]`, step 3 is `[]` |
| `isValid` boundaries | name `"ab"` fails / `"abc"` passes; email `"adx"` fails / `"a@x"` passes; slug `"My W"` fails / `"my-w"` passes; team `""` fails |
| `invalidFields` | the empty draft fails `name,email`; `{name:"ada"}` fails `email`; a full draft fails none; the order is the step's field order |
| `firstInvalid` | the first failing field; `None` when the step passes |
| `nextStep` / `previousStep` | 1→2, 2→3, 3→`None`; 3→2, 2→1, 1→`None` |
| `entryFocus` | `wizard-name`, `wizard-slug`, `wizard-submit` |
| `summary` | the exact `ada <ada@x> my-w / core` string, including empty fields |
| `describeWizard` | exact baseline string; the error list joined with `,`; `summary` only on step 3; `created` set and `none` |
| immutability | `invalidFields`/`edit`-style helpers never mutate their inputs |

### 7.2 The scenario

The scenario is the runtime test: typed checks over readout text, bounds, the
a11y dump, native focus and the painted text. Record six mutation proofs and one
reverse proof in §9.3 (temporary edit → `--only wizard-flow` → revert):

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | `invalidFields` ignores `email` | "an empty step reports both fields" (`errors=name`) |
| M2 | a rejected Next requests no focus | "an invalid step focuses its first field" (`wizard-next`) |
| M3 | the entry-focus effect is removed | "a valid step focuses its first field" (`none`) |
| M4 | `edit` clears **all** errors | "editing a field clears only its own error" (`errors=0` vs `errors=email`) |
| M5 | hide mode gives every slot `visibility: "visible"` | "a hidden step is not painted" (bounds appear) |
| M6 | submit skips the all-step validation and never stores `created` | "a submit reports the decoded draft" (`created=none`) |

Reverse proof (consumer wiring): `back()` advances instead of going back →
"Back restores the account draft" fails with `step=2`/`step=3`.

### 7.3 Two-direction checks by hand

- `--only wizard-flow` exits `1` after each mutation and names the check label.
- Full headless `88/88` and live `39/39`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 8. STOP conditions

- **The layout effect cannot focus a just-mounted input.** Record what
  `focused()` reports after the transition. Try a plain `useEffect` and, only if
  that also fails, a `setTimeout(0)` (the toast/preview timers are the precedent)
  and record the measured requirement. Do not weaken the focus check to "none".
- **`renderer.focusElement` is a no-op in the `TestRenderer` for this input.**
  Stop and report; the whole wizard contract depends on it, and a component
  would need a different primitive.
- **A hidden (unmounted) step still reports a11y `value` changes.** Keep the
  check to what is real (the readout and the re-shown input) and record it.
- **`aria-selected` is absent on a `ListItem`.** Assert the role/name instead and
  record the measured dump; do not invent a role.
- **Enter does not reach the input's `onSubmit`.** Drop the Enter half, keep the
  button path, and record the payload that arrived instead.
- **A `visibility: "hidden"` step still paints or keeps its tab stops.** Assert
  the measured behaviour and record it as the keep-mounted limitation; the plan
  claims the plan-177 recipe, so a difference is a finding.
- **The fixed 220 px body clips a step.** Grow it and record the measured
  height; do not let a readout above the body move the geometry (the crop-area
  lesson).
- **The live step race cannot be closed with `waitFor`/`waitForFocus`.** Narrow
  the live twin to the rejected Next and the review submit, and record the race.
- **A file outside §4 must change.** Stop and write the task in `TODO.md`.
- The suites are not `88/88` headless and `39/39` live with exit `0`. Stop and
  report the failing scenario; do not mark the plan done.

## 9. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003).

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `wizard-flow` (headless) | 70 | pass — suite `87 → 88`, `2920 → 2990`, exit `0`, `wizard=verified` |
| `live-wizard` | 11 | pass — live `38 → 39`, `715 → 726`, exit `0`, one screenshot |

Unit tests: `wizard-model.test.ts` adds 24; the playground suite is
207 → **231** tests in 21 files.

### 9.1 Facts that changed the plan

- **The explicit focus move is load-bearing in both directions.** With the
  entry-focus request removed, a click on `wizard-next` left focus on
  `wizard-next` (a sibling of the swapped subtree), and Enter inside the email
  field left focus on **`wizard-team`** — the runtime's own fallback is
  positional, not "the next step's first field". A wizard must request the focus
  and must not assume an unmount loses it.
- **The rejected-step focus works from the click handler** through a
  `useLayoutEffect` keyed on a nonce: `wizard-name` on the first rejection,
  `wizard-email` on the second. A `[step]`-keyed effect could never do this,
  because the step does not change.
- **A hidden step is retained, unpainted and out of the tab order.** In `hide`
  mode `elementType("wizard-slug")` is still `input`, its bounds are `null`, its
  label is absent from `getPaintedText()`, and a `focusNext` walk never reaches
  it — the plan-177 recipe transfers from panes to steps unchanged.
- **A controlled input's a11y `value` is the authored prop.** After an unmount
  and a remount, the name and email drafts read back exactly, which makes the
  app-state draft contract assertable through the dump (plan `188`'s rule).
- **The step chips need an authored `aria-id`.** `role="listitem"` +
  `aria-selected` reach the dump as `ListItem`/`selected`, but an `aria-label`
  alone gives no addressable node (the plan-344 lesson).
- **Enter is a step submit.** It reaches the raw input's `onSubmit`; the handler
  validates the step and focuses the first invalid field, so the whole wizard is
  operable without the pointer.
- **`summary` prints `none` for an empty value.** The unit test that asserted a
  raw `" <>  / "` was replaced after the model gained the shared `valueOf`
  formatter; the readout and the review line now agree on how absence reads.

### 9.2 The measured contract

| Fact | Value |
| ---- | ----- |
| baseline | `step=1 mode=unmount … errors=0 submits=0 last=start created=none summary=none`; the account is the only mounted step |
| rejected Next | `step=1 errors=name,email`; both messages paint; focus `wizard-name` |
| per-field clear | typing `ada` leaves `errors=email` and unpaints the name message |
| valid Next | `step=2`, the account subtree unmounts, focus `wizard-slug`; chip 2 becomes `selected` |
| Back | `step=1`, a11y values `ada`/`ada@x`, focus `wizard-name` |
| Enter | an empty slug stays on step 2 with `errors=slug` and focus on the slug; a valid slug moves the error to `team` and focuses `wizard-team` |
| review | `step=3`, `wizard-review` = `ada <ada@x> my-w / core`, focus `wizard-submit` |
| submit | `submits=1 last=submit`, `Created ada <ada@x> my-w / core` |
| tab order (unmount) | `wizard-name → wizard-email → wizard-next → wizard-name`; no other step's id |
| hide mode | inactive inputs retained (`input`), `bounds === null`, labels unpainted, absent from the tab walk; the step change still focuses `wizard-slug` |
| a11y | step chips are `ListItem` with `selected` true only on the current step |
| live | the rejected Next, the swap focus, the two Enter validations, the review text, the submit and one Back hold in a real window |

### 9.3 Mutation proofs

Each mutation was applied, built, run with `--only wizard-flow`, and reverted:

| # | Mutation | Measured failure |
| - | -------- | ---------------- |
| M1 | `invalidFields` ignores `email` | `an empty step reports both fields` — `errors=name` |
| M2 | the rejection requests no focus | `an invalid step focuses its first field` — got `wizard-next` |
| M3 | the entry-focus request is removed | `a valid step focuses its first field` — got `wizard-next` |
| M4 | `edit` clears every error | `editing a field clears only its own error` — `errors=0` |
| M5 | every hide slot is visible | `a hidden step is not painted` — a bound appeared |
| M6 | submit never stores `created` | `a submit reports the decoded draft` — `wizard-done` reads `none` |

Reverse proof (consumer wiring): `back()` calls `nextStep` instead of
`previousStep` → `Back returns to the account` fails with `step=3 … last=back`.

A seventh measurement (not a mutation in the table): with the entry-focus
request removed **and** the transition driven by Enter inside the email field,
focus after the swap read `wizard-team`, not `none` — the runtime's fallback is
positional. It is the strongest evidence that the focus request is required.

### 9.4 Limits recorded

- The draft lives in app state. **Unmounting a step loses native editor state**
  (caret, selection, undo); the probe asserts the app value, not the editor's.
  `hide` mode is the alternative, measured at rest and across one step change.
- Native focus on a *hidden* editor is not measured: every navigation requests
  focus explicitly, so the probe never leaves the pointer on a hidden control.
- No async validation, no server submit, no persisted wizard progress and no
  error summary; a step's fields are synchronous and in-memory.
- The review is a single text line; a real component would render a definition
  list (plan `348`'s key-value row is the measured shape).
- Live has no a11y or style channel (plan `197`), so the chip/selected and
  hidden-subtree checks are headless-only.


## 10. Acceptance

- `wizard-model.ts` + its test, `wizard.tsx`, the registry entry, the capability
  literal, the live twin, and the docs/inventory/plan-index updates.
- Headless `88/88`, live `39/39`, exit `0`; `nub run check`, `nub run lint`,
  `nub run test` all exit `0`.
- `COMPONENTS.md`'s **Multi-step forms** row has the measured contract;
  `TODO.md` ticks this task with the counts.
- Every mutation in §7.2 was run and produced the named failure (§9.3).
- No component package changed. Any defect found is a measured `TODO.md` task
  with its own plan number, not an edit from this workstream.

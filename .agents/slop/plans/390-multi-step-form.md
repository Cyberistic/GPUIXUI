# 390 — Multi-step form: step-scoped validation over the Form contract

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition; the Tier 5 row is a composition, not a new capability) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `115` (`Field`/validation), `200` (compound-part contract), `201` (state model), `205` §3 (B4), `306` (`Fieldset`), `307` (`Stepper`), `308` (`Form`), `384` (`Form` field paths) |
| Status | planned |
| Source | `COMPONENTS.md` → Tier 5 → "Multi-step forms"; plan `205` §3 B4 |

This plan is self-contained. It adds `MultiStepForm` to `packages/components` at
the Tier 2 bar: code, a native behaviour test that can fail, a docs page, an
example and an inventory row.

---

## 1. Why

`Form` validates one schema on submit. `Stepper` shows progress from a value the
caller owns. Neither composes into a workflow: a multi-step form must validate
**only the current step** before advancing, keep the whole draft in the caller's
hands, and run the full schema once at the end.

`COMPONENTS.md` lists "Multi-step forms" as `todo` with the note "Variant merged
here: Form — partial coverage". Plan `205` B4 fixes the primitive (`Form` +
`Stepper`) and the dependency order; no component implements it yet.

### Why it is not a `Form` prop

A `steps` array on `Form` would make one component own two contracts: the submit
lifecycle and the step machine. `Form` stays as it is; `MultiStepForm` is a
separate composition that reuses `Form`'s validation helpers, its error summary
look (extracted, §3) and `Stepper` for the indicator.

### What it is not

- Not a wizard with arbitrary per-step content ownership: the caller's render
  prop renders the current step's fields, exactly as `Form`'s render prop does.
- Not an interactive stepper: `Stepper` is display-only (plan 307), so a step is
  not clickable. `next`/`back` are the only moves.
- Not a request tracker: `pending` is the caller's async state, as in `Form`.

## 2. The target API

```tsx
const Account = Schema.Struct({ email: Schema.NonEmptyString });
const Billing = Schema.Struct({ card: Schema.NonEmptyString });
class Checkout extends Schema.Class<Checkout>("Checkout")({
  email: Schema.NonEmptyString,
  card: Schema.NonEmptyString,
}) {}

const STEPS = [
  { id: "account", label: "Account", schema: Account },
  { id: "billing", label: "Billing", schema: Billing },
] as const;

<MultiStepForm
  schema={Checkout}
  value={{ email, card }}
  steps={STEPS}
  onSubmit={(checkout) => save(checkout)}
  label="Checkout"
>
  {(form) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {form.step.id === "account" ? (
        <Field label="Email" error={form.errorFor("email")}>
          <FieldInput value={email} onChange={(e) => setEmail(e.value ?? "")} />
        </Field>
      ) : (
        <Field label="Card" error={form.errorFor("card")}>
          <FieldInput value={card} onChange={(e) => setCard(e.value ?? "")} />
        </Field>
      )}
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button onClick={form.back} disabled={form.isFirst || form.pending}>
          Back
        </Button>
        <Button
          onClick={form.isLast ? form.submit : form.next}
          disabled={form.pending}
        >
          {form.isLast ? "Place order" : "Continue"}
        </Button>
      </div>
    </div>
  )}
</MultiStepForm>;
```

### Root props

| Prop | Type | Default | Contract |
| ---- | ---- | ------- | -------- |
| `schema` | `Schema.ConstraintDecoder<T>` | required | the full schema, decoded only on the last step's submit |
| `value` | `unknown` | required | the caller's draft; never read from the runtime |
| `steps` | `readonly [MultiStepFormStep, ...MultiStepFormStep[]]` | required | at least one step; the non-empty tuple makes the empty case unrepresentable |
| `onSubmit` | `(value: T) => void` | required | receives the decoded value, never the draft |
| `pending` | `boolean` | `false` | locks `next`, `back` and `submit` |
| `label` | `string` | — | `role="form"` + `aria-label`; without it the root is a plain container |
| `step` | `number` | — | controlled 0-based index |
| `defaultStep` | `number` | `0` | uncontrolled start |
| `onStepChange` | `(index: number) => void` | — | reports every accepted move, controlled or not |
| `children` | `(state: MultiStepFormState) => ReactNode` | required | the render prop, as in `Form` |

### `MultiStepFormStep`

```ts
export interface MultiStepFormStep {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  /** Validates this step's fields against the whole draft. */
  readonly schema: Schema.ConstraintDecoder<unknown>;
}
```

A step schema is a **projection schema** over the full draft (for example
`Schema.Struct({ email: ... })`). Schema decoding ignores excess keys by default
(measured: `Schema.Struct({a})` and `Schema.Class` both accept `{a, b}` and strip
`b`), so one draft validates against each step without reshaping it, and a
failure's path is the same key path the full schema reports.
`Schema.ConstraintDecoder` keeps the service requirement at `never`, so the
messages can be read synchronously as `Form` does.

### `MultiStepFormState`

```ts
export interface MultiStepFormState {
  /** The current step, 0-based. */
  readonly index: number;
  /** The step record at `index`. Always defined (the tuple is non-empty). */
  readonly step: MultiStepFormStep;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly fieldErrors: ReadonlyArray<FieldMessage>;
  readonly pending: boolean;
  readonly errorFor: (
    path: PropertyKey | ReadonlyArray<PropertyKey>,
  ) => string | undefined;
  /** Validate the current step; advance only when it passes. */
  readonly next: () => void;
  /** Move back one step. Never validates. No-op on the first step. */
  readonly back: () => void;
  /** No-op unless `isLast`. Validate the full schema; submit the decoded value. */
  readonly submit: () => void;
}
```

### State rules

1. `next()` — no-op while `pending` or on the last step. Decode
   `step.schema` against `value`:
   - failure: keep the index, show that step's messages (summary + paths);
   - success: clear the messages, move to `index + 1` and call `onStepChange`.
2. `back()` — no-op while `pending` or on the first step. Clears the messages,
   moves to `index - 1`, calls `onStepChange`. It never validates, so a user can
   always leave a failing step.
3. `submit()` — no-op while `pending` or when `!isLast`, so a stray early call
   cannot report errors for fields the user has not reached. On the last step it
   decodes the full `schema`; a failure shows every message located by path; a
   success clears the messages and calls `onSubmit(decoded)` exactly once.
4. **Stale errors** — messages are stored with the index that produced them and
   are only rendered while that index is current (`{ index, fieldErrors }` in
   state). A controlled `step` move therefore cannot show the previous step's
   message, without an effect and without a render-time flash.
5. **Controlled index** — `step` is authoritative when given: `next`/`back` call
   `onStepChange` but only the prop moves the view. A controlled index outside
   `[0, steps.length - 1]` is clamped for rendering (a shrinking `steps` array
   must not crash).
6. **Empty step list is a type error**, and the runtime never indexes past the
   end: the render-time index is clamped, and `steps[index] ?? steps[0]` is
   defined because the tuple's first element is required.

## 3. Shared error summary

`Form` currently renders its summary inline (`form.tsx` lines ~121–145). Extract
that exact look into `src/internal/error-summary.tsx`:

```tsx
export interface ErrorSummaryProps {
  readonly messages: ReadonlyArray<string>;
}
/** The one `role="alert"` block a validated surface paints. */
export const ErrorSummary = ({ messages }: ErrorSummaryProps) => ...
```

- `Arr.match` over the messages: `onEmpty` renders `null`; `onNonEmpty` renders
  the `role="alert"` column of `<text>` rows, `caption` type, `destructive`.
- `Form` imports it instead of repeating the block. Its behaviour is unchanged
  (the same node shape), so its 9 native tests must keep passing unchanged.

## 4. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/components/src/internal/error-summary.tsx` | **create** — the shared summary |
| `packages/components/src/multi-step-form.tsx` | **create** — the component + `multiStepFormMeta` |
| `packages/components/src/behaviour/multi-step-form.test.tsx` | **create** — the native suite (§5) |
| `packages/components/examples/multi-step-form.example.tsx` | **create** — two-step checkout |
| `packages/components/examples/index.ts` | register `"multi-step-form": MultiStepFormExample` |
| `packages/components/docs/multi-step-form.mdx` | **create** — description, usage, API, validation, theming, a11y, limitations, verification, related |
| `packages/components/package.json` | add `"./multi-step-form": "./src/multi-step-form.tsx"` |
| `packages/components/src/index.ts` | add `export * from "./multi-step-form.js";` |
| `packages/components/src/inventory.ts` | import + append `multiStepFormMeta` |
| `packages/components/src/form.tsx` | replace the inline summary with `ErrorSummary` |
| `COMPONENTS.md` | Tier 5 "Multi-step forms" row → `done` / `partial` + notes + native count |
| `docs/component-api.md` | §8 Tier 5 row: `| Multi-step forms | \`MultiStepForm\` (render prop; one part) | — | plan 390 |` |
| `.agents/slop/plans/README.md` | index this plan |

Do not touch `apps/*`, `docs/*` (repo root, other than `docs/component-api.md`),
or any other package.

## 5. Test plan

`src/behaviour/multi-step-form.test.tsx`, using `renderComponent` from
`src/internal/test-root.tsx` (the plan 326 teardown). Every case must be able to
fail; the mutation that proves each is named.

| # | Case | Mutation that must fail it |
| - | ---- | -------------------------- |
| 1 | Renders the stepper's first step as current and the first step's fields | pass `index + 2` to `Stepper` → the current-step assertion fails |
| 2 | `next` on an invalid step shows the message, keeps the index, does not call `onStepChange` | drop the `decodeUnknownResult` branch → the message is never shown |
| 3 | `next` on a valid step advances, calls `onStepChange(1)` once, and clears the previous message | keep the failure state after advancing → the message persists |
| 4 | `back` from a failing step moves back without validating and clears the message | make `back` validate → it stays on the step |
| 5 | `submit` on the last step calls `onSubmit` once with the **decoded** class instance | submit the raw `value` → the `instanceof` assertion fails |
| 6 | `submit` on the last step with an invalid draft shows every message and never calls `onSubmit` | skip the full-schema decode → `onSubmit` fires |
| 7 | `submit` on a non-last step is a no-op (no submit, index unchanged) | remove the `isLast` guard → `onSubmit` fires |
| 8 | `pending` blocks `next`, `back` and `submit` | remove one guard → that move happens |
| 9 | A controlled `step` is authoritative: `next` reports `onStepChange` but the view does not move until the prop changes | write to internal state in controlled mode → the view moves |
| 10 | A controlled index outside the range is clamped and renders the last step | remove the clamp → `steps[index]` is undefined and the render throws |
| 11 | A controlled step change does not show the previous step's message | render messages without the producing index → the stale message shows |
| 12 | The error summary is one `role="alert"` with one text node per distinct message | render one alert per message → the count assertion fails |

Both themes: cases 2 and 5 run once per theme (the suite's helper takes a
`mode`), matching the theme-matrix convention for validated surfaces.

No new unit module: the only pure rule is index clamping, exercised through
cases 9–10. Do not add a `logic.ts` with nothing but a clamp.

Two-direction proof (recorded in the plan's status when done):

1. Run the suite after the component exists but before wiring the rules — it
   fails. Alternatively, apply each mutation in the table and confirm exactly
   the named case fails.
2. Restore the rule; the suite passes.

## 6. Commands and expected results

```sh
cd packages/components
nub run --filter @gpuixui/components test            # expected: unit suite green, inventory new checks green
nub run --filter @gpuixui/components test:behaviour  # expected: behaviour green, Multi-step form 12/12
nub run --filter @gpuixui/components check-types     # expected: exit 0
cd ../..
nub run check                                        # expected: exit 0
nub run lint                                         # expected: exit 0
```

`nub run test` at the root is the last gate; it needs the native binding for the
behaviour suites on this host (plan 140's locally built `darwin-x64`).

## 7. STOP conditions

Stop and report if:

- a step's projection schema cannot validate the full draft without an unknown
  props error (verified before writing code: excess keys are ignored);
- the runtime cannot host two nested `role="form"` containers (the page will use
  `label` only on `MultiStepForm`; do not nest a second labelled `Form`);
- `Form`'s existing suites change behaviour after the `ErrorSummary` extraction
  (the extraction must be node-for-node identical);
- adding the export/registry entry makes `inventory.test.ts`,
  `examples.test.tsx` or `exports.test.ts` fail for a reason other than a missing
  row — fix the row, do not weaken a check.

## 8. Acceptance criteria

- `MultiStepForm` exports its props and state types, is reachable from
  `@gpuixui/components/multi-step-form` and the package root, and carries
  `multiStepFormMeta`.
- Its behaviour suite has 12 cases, all green in the real renderer, and at least
  five named mutations each fail exactly one case.
- `Form`'s 9 cases and the full 583-case behaviour suite stay green.
- The example mounts in `examples.test.tsx`, the docs page states the real native
  count, and `COMPONENTS.md`'s Tier 5 row agrees with the record.
- `nub run check`, `nub run lint` and `nub run test` pass.

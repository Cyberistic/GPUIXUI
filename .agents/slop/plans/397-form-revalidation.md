# 397 — Validation re-checks after an edit (`Form` and `MultiStepForm`)

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 feedback and validation) |
| Owner | components workstream (`packages/components`) |
| Depends on | `115` (Field + validation), `200`/`201` (compound-part and state contract), `308` (Form), `384` (field messages), `390` (MultiStepForm) |
| Status | planned |
| Files | `src/validation/logic.ts`, `src/validation/logic.test.ts`, `src/form.tsx`, `src/multi-step-form.tsx`, `src/behaviour/form.test.tsx`, `src/behaviour/multi-step-form.test.tsx`, `examples/form.example.tsx`, `examples/multi-step-form.example.tsx`, `docs/form.mdx`, `docs/multi-step-form.mdx`, `COMPONENTS.md`, `TODO.md` |

## 1. The gap

`Form` and `MultiStepForm` both validate an **owned value**: the caller holds the
draft and `Form` only runs the schema when asked. After a failed submit (or a
failed `next`), the messages stay on screen until the caller submits again. A
user who fixes the field still sees the old error, and the error summary keeps
claiming the form is invalid. Both docs pages and both inventory records state
this as a limitation:

- `packages/components/docs/form.mdx` → "No automatic re-validation on edit:
  errors persist until the next submit."
- `packages/components/docs/multi-step-form.mdx` → "No validate-on-edit:
  messages persist until the next action."

The caller cannot fix it from outside without duplicating the schema walk and
the `errorFor` lookup, which is the drift plan `384` removed.

## 2. Contract

Add one opt-in boolean, **default `false`**, to both components:

```ts
readonly revalidate?: boolean;
```

When `revalidate` is true:

1. Nothing is validated before the first failed action. An untouched invalid
   form shows no messages.
2. After a failed `submit` (`Form`) or a failed `next`/`submit`
   (`MultiStepForm`), a change to the `value` prop **or** the validation schema
   re-runs the same validation pass and updates the summary and every
   `errorFor` result.
3. An edit that fixes every failure clears the messages; an edit that fixes one
   field removes only that field's message; an edit that produces a different
   failure replaces it.
4. Re-validation never calls `onSubmit`, never advances a step, and never
   changes `pending`.
5. `revalidate` never turns a failing schema into a passing one. It only paints
   current messages.

When `revalidate` is false (the default), behaviour is exactly today's: messages
persist until the next action.

`value` is compared by **identity**, the React convention. The caller must pass a
new value when the draft changes; mutating the same object in place is not
detected. This is the identity comparison the previous docs claimed was
impossible: it is impossible to tell an edit from an unrelated re-render, but it
is not required. A new identity triggers the same schema walk, and the result is
written only when the messages actually differ, so an unrelated re-render with a
new object identity is a no-op visually.

## 3. Pure helper

`packages/components/src/validation/logic.ts` gains one exported function, placed
after `fieldMessageAt`:

```ts
/**
 * Whether two validation passes report exactly the same failures, in the same
 * order. `Form` and `MultiStepForm` use it to keep the previous array identity
 * when a re-check finds nothing new, so an unrelated re-render cannot repaint.
 */
export const sameFieldMessages = (
  left: ReadonlyArray<FieldMessage>,
  right: ReadonlyArray<FieldMessage>,
): boolean =>
  Arr.length(left) === Arr.length(right) &&
  Arr.every(
    Arr.zip(left, right),
    ([leftField, rightField]) =>
      samePath(leftField.path, rightField.path) &&
      leftField.message === rightField.message,
  );
```

`samePath` already exists below `FieldMessage`; it must be declared before this
function uses it (move it up if the executor places the helper earlier).

Add JSDoc. Do not add a second comparison implementation in either component.

## 4. `Form`

`packages/components/src/form.tsx`:

1. Import `useLayoutEffect`, `useRef` from `react` and `sameFieldMessages` from
   `./validation/logic.js`.
2. Add the prop to `FormProps<T>` with the JSDoc from §2, and destructure it with
   `revalidate = false`.
3. After the `fieldErrors` state, add the refs and the effect. Use
   **`useLayoutEffect`, not `useEffect`**: measured in the real test renderer, a
   passive effect scheduled by `rerender` has not run when the assertion reads
   the tree, and layout effects also remove a one-frame flash of the old
   message.

```tsx
const lastValue = useRef(value);
const lastSchema = useRef(schema);

useLayoutEffect(() => {
  const changed = lastValue.current !== value || lastSchema.current !== schema;
  lastValue.current = value;
  lastSchema.current = schema;
  if (!revalidate || !changed || Arr.isReadonlyArrayEmpty(fieldErrors)) return;

  const next = Effect.runSync(validateFields(schema)(value));
  setFieldErrors((current) =>
    sameFieldMessages(current, next) ? current : next,
  );
}, [fieldErrors, revalidate, schema, value]);
```

Why the guard order matters:

- `changed` is computed **before** the refs update, so the mount effect and the
  effect that follows `setFieldErrors` both return without re-walking.
- `Arr.isReadonlyArrayEmpty(fieldErrors)` is the "only after a failure" rule.
  Do not move this check before the ref update: the refs must track every render
  so a later edit is detected against the value the user actually saw.
- Returning the same `current` array when the messages match stops the effect
  from repainting after its own `setFieldErrors`.

4. Update the module's header comment: replace "Errors persist until the next
   submit because an inline object identity cannot tell an edit from a re-render."
   with the identity rule from §2.
5. Update `formMeta.limitations`: remove
   `"no automatic re-validation on edit: errors persist until the next submit"`
   and add
   `"revalidate compares the owned value by identity: the caller must pass a new value; an unrelated re-render with a new object re-checks but repaints nothing"`.

## 5. `MultiStepForm`

`packages/components/src/multi-step-form.tsx`:

1. Add `revalidate?: boolean` to `MultiStepFormProps<T>` and destructure it with
   `revalidate = false`.
2. `StepFailure` records the schema that produced the messages, because `next`
   validates a projection schema and the last-step `submit` validates the full
   schema:

```ts
interface StepFailure {
  readonly index: number;
  /** The schema whose messages are stored, so a re-check runs the same pass. */
  readonly schema: Schema.ConstraintDecoder<unknown>;
  readonly fieldErrors: ReadonlyArray<FieldMessage>;
}
```

3. Both `setFailure(Option.some({ index, ... }))` sites add
   `schema: step.schema` (`next`) or `schema` (the full-schema `submit`).
4. Add the effect after `fieldErrors` is derived:

```tsx
const lastValue = useRef(value);

useLayoutEffect(() => {
  const changed = lastValue.current !== value;
  lastValue.current = value;
  if (!revalidate || !changed) return;

  const failed = Option.getOrUndefined(failure);
  if (failed === undefined || failed.index !== index) return;

  const next = Effect.runSync(validateFields(failed.schema)(value));
  setFailure((current) => {
    const stored = Option.getOrUndefined(current);
    if (stored === undefined || stored.index !== index) return current;
    if (sameFieldMessages(stored.fieldErrors, next)) return current;
    return Arr.isReadonlyArrayEmpty(next)
      ? Option.none()
      : Option.some({ ...stored, fieldErrors: next });
  });
}, [failure, index, revalidate, value]);
```

The inner guard keeps a controlled `step` move that races the effect from
painting step A's messages on step B.

5. Update `multiStepFormMeta.limitations`: replace `"no validate-on-edit:
   messages persist until the next action"` with
   `"revalidate compares the owned draft by identity, after a failed action only"`.

## 6. Tests

### 6a. Pure — `packages/components/src/validation/logic.test.ts`

Import `sameFieldMessages`; add a `describe("sameFieldMessages")` with five
`it(...)` cases (no `it.effect` needed):

| Case | Assert |
| ---- | ------ |
| identical arrays | `true` |
| same path, different message | `false` |
| same message, different path | `false` |
| different length | `false` |
| same failures in a different order | `false` |

Header comment: state that the bug guarded is a re-check that repaints or skips
a repaint because equality compared only one of path/message/order.

### 6b. Native — `packages/components/src/behaviour/form.test.tsx`

Extend `Harness` with `readonly revalidate?: boolean` and forward it to `Form`.
Add four cases; each must fail on the current code:

1. **"does not validate before the first failed submit"** — render
   `Harness` with `revalidate`, `value={invalid}`; assert `0:false` and no
   `role="alert"` node. `rerender` with `{ email: "nope", name: "Ada" }`; still
   `0:false`. (Without the "only after a failure" guard, the old code shows no
   messages too, so this case guards the new guard specifically: it fails if the
   executor validates on mount.)
2. **"clears the fixed field's message after an edit"** — submit `invalid`; then
   `rerender` with `{ email: valid.email, name: "" }`; assert the address
   message is gone, the name message remains, `role="alert"` still has exactly
   the one remaining message, and `onSubmit` was never called.
3. **"clears every message and the alert after the edit makes the form valid"** —
   submit `invalid`; `rerender` with `valid`; assert `0:false`, no
   `role="alert"`, no message text, `onSubmit` not called.
4. **"keeps the messages when revalidation is off"** — the same flow without
   `revalidate`; assert the messages persist. This pins the default contract.

### 6c. Native — `packages/components/src/behaviour/multi-step-form.test.tsx`

Extend `Harness` with `revalidate?: boolean`. Add three cases:

1. **"does not validate before the first failed action"** — render `revalidate`
   with `{ email: "nope", card: "4242" }`; assert the address message is absent
   and there is no alert. `rerender` with another invalid draft; still absent.
2. **"re-checks a failed step when the draft changes"** — `revalidate`, value
   `{ email: "nope", card: "4242" }`, click `next` → error; `rerender` with
   `{ email: valid.email, card: "4242" }` → error gone, index still `0`; click
   `next` → index `1`.
3. **"keeps a failed step's messages when revalidation is off"** — the same
   flow without `revalidate`; after the edit the message remains.

## 7. Examples and docs

1. `examples/form.example.tsx`: pass `revalidate`. Behaviour does not change
   until the first failed submit, so the example gains live clearing without a
   new control.
2. `examples/multi-step-form.example.tsx`: pass `revalidate`.
3. `docs/form.mdx`:
   - API table: add `revalidate?: boolean` after `pending`.
   - Add a `## Revalidation` section after `## Submit lifecycle` with the §2
     rules, the identity rule, and one sentence saying the first render remains
     silent.
   - Validation section: replace "There is no validate-on-blur or
     validate-on-keystroke; the caller decides when to call `submit`." with a
     sentence that the first run is still the caller's `submit`, and `revalidate`
     only re-checks after a failure.
   - Limitations: replace the "No automatic re-validation on edit" bullet with
     the identity caveat.
   - Verification: update the count and the sentence to name the new cases.
4. `docs/multi-step-form.mdx`: same four edits; the limitation becomes
   "re-checks after a failed action only, by value identity".
5. `COMPONENTS.md`:
   - Form row: add the `revalidate` sentence, drop the "No field registration and
     no re-validation on edit" claim, update the test count.
   - Multi-step forms row: add the `revalidate` sentence, drop "no
     validate-on-edit", update the test count.
6. `TODO.md`: under **Tier 2 hardening after the inventory closed (plans 120+)**,
   add `- [x] Form and multi-step form re-check after an edit — plan 397; ...`
   with the final test counts.

## 8. Commands and expected results

```sh
nub run --filter @gpuixui/components test
# expected: 39 files, 395 tests passed (390 + 5)

nub run --filter @gpuixui/components test:behaviour
# expected: 49 files, 626 tests passed (619 + 7)

nub run check
# expected: check:tests, lint, fmt and every check-types pass

nub run test
# expected: every workspace's tests pass
```

The inventory check (`src/inventory.test.ts`) fails until:
- the docs verification counts match the suites (13 and 15),
- every inventory limitation string is still present in its docs page's
  Limitations section,
- the `COMPONENTS.md` rows carry the new counts.

## 9. Both-direction proof

After the suite is green:

1. Save the effect body in `form.tsx`: temporarily return immediately after the
   refs update (`if (true) return;` before the validation).
2. Run only the behaviour files and record the failures:
   `npx vitest run --config vitest.behaviour.config.ts src/behaviour/form.test.tsx src/behaviour/multi-step-form.test.tsx`
   Measured: exactly three failures — Form's "clears the fixed field's message
   after an edit" and "clears every message after the edit makes the form valid",
   and Multi-step form's "re-checks a failed step when the draft changes"; the
   two default/lifecycle guards still pass.
3. Restore the effect and re-run: 28/28 pass.
4. Repeat the same temporary disable for `multi-step-form.tsx`; the third
   failure above is that suite's only one, while "keeps a failed step's messages
   when revalidation is off" still passes.
5. Record the exact failing test names and counts in this plan's Status row in
   `.agents/slop/plans/README.md` and in the `TODO.md` task line.

Do not claim the proof from a run that was not executed.

## 10. STOP conditions

Stop and report if:

- `Arr.zip` is not exported by the installed `effect` version, or its tuple type
  needs a cast to satisfy strict `noUncheckedIndexedAccess` — do **not** add
  `any`/`as`; use an index loop with `Arr.get` instead and update this plan;
- the effect causes a render loop (a test times out or React reports a maximum
  update depth) — the `sameFieldMessages` guard is then not doing its job; fix
  that, do not suppress React's warning;
- a native behaviour test passes on the **old** code after the temporary
  disable — the case is not guarding the feature; rewrite it;
- the docs-count check still disagrees after updating both counts — recount with
  the same regex (`src/behaviour/<stem>.test.tsx ... (\d+) tests`) rather than
  guessing;
- adding `revalidate` requires touching a file outside `packages/components`,
  `COMPONENTS.md` or `TODO.md` — stop; record the need as an interlock in
  `TODO.md` instead.

## 11. Acceptance criteria

- `revalidate` is documented, typed and defaults to `false`.
- Form: 13 native tests, all pass; cases 2 and 3 fail without the effect, case 1
  guards the "after a failure" rule and case 4 pins the default.
- MultiStepForm: 15 native tests, all pass; "re-checks a failed step when the
  draft changes" fails without the effect, the other two guard the default and
  the pre-failure rule.
- `validation/logic.ts` has one equality implementation, covered by five pure
  cases.
- Both examples use the prop; both docs pages document it; both inventory rows,
  `COMPONENTS.md` and `TODO.md` agree on the test counts.
- `nub run check`, `nub run test`, `nub run --filter @gpuixui/components
  test:behaviour` all exit 0, and the commands were actually run.

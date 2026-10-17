# 308 — Form: validation orchestration and the submit lifecycle

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `115` (Field + `validation/logic.ts`), `205` §3 (B3), `306` |
| Status | done — 7 native tests; both-direction proof measured |
| Source | `docs/component-api.md` §8 (planned parts: `Form`); `COMPONENTS.md` → Tier 2 → Form; plan `205` B3 |

This plan is self-contained. It adds `Form` to `packages/components` at the Tier 2
bar: code, a native behaviour test that can fail, a docs page, an example and an
inventory row.

---

## 1. Why

`Field` paints a message; `validation/logic.ts` turns a schema into messages.
Nothing joins them into a submit lifecycle: run the schema, show every message
when the value is invalid, and call the consumer only when it is valid.
`COMPONENTS.md` lists Form as `todo` and plan `205` §3 makes it B3, after
`Fieldset` (B1) and the inline validation (B2, landed as `Field`).

The runtime has no form element and no DOM to read values from. The component is
therefore **owned-value**: the consumer passes the value it already holds, as it
does for `Field`. Form never invents a second source of truth.

## 2. The target API

One part — the table in `docs/component-api.md` §8 fixes `Form` as a single part.
It renders the group, the error summary and a **render prop** that hands the
consumer the state it cannot derive:

```tsx
<Form
  schema={Signup}
  value={draft}
  pending={saving}
  onSubmit={save}
  label="Create account"
>
  {(form) => (
    <>
      <Field label="Email" description="We never share it">
        <FieldInput value={draft.email} onChange={setEmail} />
      </Field>
      <Field label="Name">
        <FieldInput value={draft.name} onChange={setName} />
      </Field>
      <Button onClick={form.submit} disabled={form.pending}>
        Create account
      </Button>
    </>
  )}
</Form>
```

```ts
export interface FormState {
  /** Every message from the last failed submit, in schema order. */
  readonly errors: ReadonlyArray<string>;
  /** Mirrors the `pending` prop; a pending form ignores `submit`. */
  readonly pending: boolean;
  /** Run the schema over `value` and call `onSubmit` only when it accepts. */
  readonly submit: () => void;
}
```

- `children` is a function, not parts. `Form` has no compound parts, so
  `docs/component-api.md` §1's typed-by-position rule does not apply; the render
  prop is how the consumer reaches the submit action without a `FormSubmit` part,
  which §8 does not allow. Record the reason in the docs page.
- `schema: Schema.ConstraintDecoder<T>` — the same decoder type
  `validation/logic.ts` takes, so a schema that needs services is rejected at the
  type level.
- `value: unknown`; `onSubmit: (value: T) => void` receives the **decoded** value,
  so the consumer never re-decodes.
- `pending?: boolean` — the caller's async state. Form does not promise or track
  the request; it only refuses to submit twice while `pending` is true.
- `label?: string` — `aria-label` on `role="form"`. Without it the root is a plain
  container (0.10.0 has no `aria-labelledby`), so an unnamed form is a group, not
  a landmark. Document.
- The error summary is rendered by `Form` itself: `role="alert"` with one
  `<text>` per message. `validateAll` deliberately returns messages, not field
  paths, so a summary is the only truthful presentation; per-field messages stay
  the consumer's `Field` concern.
- Errors persist until the next submit. There is no clear-on-edit: the caller
  owns the value and an inline object identity cannot tell an edit from a
  re-render. Document this.

### Running the Effect

`validateAll(schema)(value)` and the decode are pure, non-failing effects with no
requirements. The submit handler is the runtime boundary, so it runs them with
`Effect.runSync` — the same boundary rule as `Toast`'s `ManagedRuntime`, without a
runtime the component does not need. Note it in the module header.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/form.tsx` | **create** — `Form`, `FormState`, `formMeta` |
| `packages/components/src/index.ts` | add `export * from "./form.js";` |
| `packages/components/src/inventory.ts` | import and list `formMeta` |
| `packages/components/src/behaviour/form.test.tsx` | **create** — 7 tests (§6) |
| `packages/components/examples/form.example.tsx` | **create** — a signup form with a real submit, pending state and a failed submit |
| `packages/components/docs/form.mdx` | **create** — usage, the render prop, validation, API, theming, accessibility, limitations |
| `docs/component-api.md` | move Form from "Planned Tier 2 additions" to the built table with source `plan 308` and note the render prop |
| `COMPONENTS.md` | Form row → `done` / `partial`, 7 native tests, the limitations |
| `TODO.md` | tick Form under the Tier 2 gap list |
| `.agents/slop/plans/README.md` | add this plan to the components table |

No new dependency: `effect/Schema`, `validation/logic.ts` and `internal/button.tsx`
are already in the package.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # expected: all suites pass; Form 7
nub run --filter @gpuixui/components test             # expected: unit suites + inventory pass
nub run check                                         # expected: exit 0
nub run lint                                          # expected: exit 0
nub run test                                          # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- a render-prop `children` cannot be typed without an `any` or a cast. Then keep
  the single-part API and make the state explicit through a context + a
  `FormSubmit`-shaped helper **only** if `docs/component-api.md` §8 is amended in
  the same change; do not ship an untyped callback.
- `role="form"` produces no accessible node in the 0.10.0 dump. Then the root is a
  plain `div` with no role; record the evidence in the row and docs.
- `Effect.runSync` would throw for a schema that suspends. `ConstraintDecoder`
  forbids service requirements; if a pure-but-suspending schema still throws,
  switch to `Effect.runPromise` in the handler with a rejection path, and add the
  finding to `TODO.md`.
- decoding a value that `validateAll` accepted can still fail. That is an
  invariant break (`Schema.decodeUnknownResult` twice on the same value); stop
  and report instead of calling `onSubmit` with an unvalidated value.

## 6. Test plan

`src/behaviour/form.test.tsx` (real GPUix renderer; a schema class is defined in
the suite, as `validation/logic.test.ts` does):

1. renders the render prop's children with an idle state (`errors: []`,
   `pending: false`);
2. a valid submit calls `onSubmit` once with the **decoded** value (a class
   instance, not the raw object);
3. an invalid submit never calls `onSubmit` and renders every schema message, in
   schema order, in one `role="alert"`;
4. the alert is the only alert and each message is its own text node;
5. `pending` is exposed to the render prop and a submit while pending is a no-op;
6. a consumer `style` on the root wins, and the summary paints
   `colors.destructive` in **both** themes;
7. the root reports `role="form"` and takes `label` as its accessible name.

**Both directions.** Replace the submit body with an unconditional `onSubmit`
(no validation): tests 3 and 4 fail. Restore. Second break: drop the `pending`
guard and test 5 fails.

## 7. Acceptance criteria

- One exported part with JSDoc, an exported `FormState`, and a typed schema
  decoder; no `any`.
- Seven native tests, both themes, no literal colours.
- Example, docs page, inventory record, `COMPONENTS.md` row and the contract's
  §8 table agree; the render-prop decision is recorded in the docs page.
- All gates and the behaviour suite green.

## 8. Result

Landed 2026-10-17:

- `src/form.tsx` — the single `Form` part: decode with `Schema.decodeUnknownResult`,
  show every `validateAll` message in one `role="alert"`, call `onSubmit` with
  the decoded value, refuse submit while `pending`. The submit handler runs the
  pure validator with `Effect.runSync` at the React event boundary; the module
  header records why.
- `src/behaviour/form.test.tsx` — 7 tests. Expected messages are computed with
  `validateAll` itself, so the suite asserts the component shows the validator's
  output rather than a copy of the formatter's text.
- Example, docs page, inventory record, `COMPONENTS.md` row and the contract's §8
  table updated; Form left the planned list.
- **Both directions:** dropping the messages from the failure branch fails the
  message test (and cascades through the rest of the suite because the failed
  assertion leaves the root mounted). Restored: 332 behaviour tests green,
  `nub run check` green.

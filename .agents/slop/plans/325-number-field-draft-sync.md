# 325 — A controlled `NumberField` must follow an external value change

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives |
| Depends on | `054` (the field), `077` (the step maths), `324` (the per-render mode) |
| Status | done |
| Fixes | `NumberField` only — the one controlled field that keeps a text draft |

---

## 1. The defect

`NumberField` keeps a `draft` string so a user can type `"1."` or `"001"`
without the controlled value reformatting it mid-edit. The draft is rendered
unconditionally whenever it exists:

```tsx
// packages/primitives/src/components/NumberField.tsx (before)
const text =
  !touched && Option.isNone(draft)
    ? ""
    : Option.getOrElse(draft, () => display(state.value.current));
```

So an **external** value change — a Reset button, a record reload, a parent that
clamps after submit — never reaches the paint while a draft exists. The field
keeps the user's old text, and the next keystroke continues from it.

**Measured on this host, 2026-10-18**, real GPUix 0.10.0 `TestRenderer`:

```
× probe: a controlled NumberField follows an external reset
AssertionError: expected 1236 to be 56
```

The probe mounts `<NumberField value={12} autoFocus>`, types `3` (reports
`123`), re-renders the same tree with `value={5}`, then types `6`. The field
should now read `5` and report `56`; it still paints `123` and reports `1236`.

The other controls are unaffected: `Input`/`TextArea` have no draft (the native
element holds the text and the resolved value is pushed in), and every other
component stores only a value. `OTPField` has a value, not a draft.

The two rules that must both hold:

1. a draft the **user** is writing survives the parent accepting it (otherwise
   `"1."` would be reformatted to `"1"` and decimals become untypeable);
2. a value the **parent** changes to something the draft did not ask for
   replaces the draft.

Only the second is broken.

---

## 2. The rule

A draft carries two facts: the value it started from (`base`) and the value it
last asked the parent for (`reported`, absent while the text does not parse).
It still applies while the current value is either of those:

```
draftApplies(draft, value) = value === draft.base || draft.reported === value
```

- `value === base` — the parent has not moved; the user is still typing.
- `value === reported` — the parent accepted the edit; keep the text as typed.
- neither — the parent chose another value; paint that value instead.

---

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/number.ts` | `NumberDraft` interface + `draftApplies` (pure, documented) |
| `packages/primitives/src/core/number.test.ts` | 4 cases: base match, reported match, external change, non-numeric draft |
| `packages/primitives/src/components/NumberField.tsx` | the draft state carries `base`/`reported`; the painted text applies the rule; typing records both |
| `packages/primitives/runtime/number-field.runtime.test.tsx` | one measured test: external reset, then typing continues from the reset value |
| `packages/primitives/docs/number-field.mdx` | one paragraph under the controlled prop: an external change replaces an in-progress draft |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan |

---

## 4. Exact implementation

### 4.1 `core/number.ts`

```ts
/** A number field's in-progress text, and the two values it can belong to. */
export interface NumberDraft {
  readonly text: string;
  /** The value the field held when the draft was written. */
  readonly base: number;
  /** The value the draft asked the parent for; absent while it does not parse. */
  readonly reported: Option.Option<number>;
}

/**
 * Whether a draft should still be painted.
 *
 * A draft belongs to the field while the value is the one it started from (the
 * parent has not moved) or the one it reported (the parent accepted the edit).
 * Any other value is an external change and wins over the draft.
 */
export const draftApplies = (draft: NumberDraft, value: number): boolean =>
  Object.is(draft.base, value) ||
  Option.exists(draft.reported, (reported) => Object.is(reported, value));
```

### 4.2 `NumberField.tsx`

- `draft` becomes `Option.Option<NumberDraft>`.
- The painted text:

```ts
const current = state.value.current;
const showDraft = Option.exists(draft, (d) => draftApplies(d, current));
const text = showDraft
  ? Option.getOrElse(draft, () => display(current)).text
  : touched
    ? display(current)
    : "";
```

  (Write it without re-wrapping; `Option.match` on `draft` reads better. Keep the
  existing "untouched and no draft paints empty" rule.)
- `onTextChange(next)` records `{ text: next, base: current, reported: parsed
  clamped or None }`, then reports a parsed value exactly as today.
- `onCommit` and `onValue` clear the draft as today.
- No other behaviour changes: the step buttons, clamp, precision and commit
  paths stay as they are.

### 4.3 Tests

Unit (`core/number.test.ts`) — one `describe("draftApplies")` with the four
cases above.

Runtime (`runtime/number-field.runtime.test.tsx`) — the probe, with a comment
naming the bug:

```tsx
it("follows a value the parent changes while a draft exists", async () => {
  // The bug guarded (plan 325): the field kept the user's draft, so a Reset or a
  // reloaded record never reached the paint and the next keystroke continued
  // from the old number (measured 1236 instead of 56).
  ...
  expect(lastValue(values)).toBe(56);
});
```

### 4.4 Docs

`number-field.mdx`, near the `value` prop: an external `value` change replaces
an in-progress draft; the field keeps the user's text while the parent accepts
what the field reported, so typing `1.5` is never reformatted.

---

## 5. Commands, in order

| # | Command (from `packages/primitives`) | Expected |
| - | ------------------------------------ | -------- |
| 1 | `nub run test:runtime -- number-field` before the fix | the new test fails with `expected 1236 to be 56` |
| 2 | `nub run test -- number` before the fix | the new `draftApplies` cases fail (the module does not exist) |
| 3 | apply §4.1–§4.4 | — |
| 4 | `nub run test` | 40+ files, all passing (514 + 4 unit + 1 runtime) |
| 5 | `nub run test:runtime` | 21 files, all passing (309 + 1) |
| 6 | from the root: `nub run check` | tests, lint, fmt and every `check-types` green |
| 7 | `git diff` review | only the files in §3 |

Both failing outputs from steps 1–2 go into §8 before the fix is applied.

---

## 6. STOP conditions

- **STOP** if the fix makes a controlled field reformat `"1."` to `"1"` while
  typing (the `reported` half of the rule is wrong) — capture the failing
  keystrokes and re-plan.
- **STOP** if an uncontrolled field starts dropping its draft after a step
  (base/reported must be recomputed from the *current* value on each edit).
- **STOP** before touching any component other than `NumberField`; no other part
  keeps a text draft.
- **STOP** if a suite outside the package fails; record it in `TODO.md`.

---

## 7. Acceptance

- [x] `draftApplies` is a documented pure rule with four unit cases.
- [x] A controlled field follows an external value change and the next
      keystroke continues from it (runtime, real binding).
- [x] A draft the parent accepts is kept, so `"1."` still types.
- [x] The uncontrolled path, stepping and commit are unchanged.
- [x] `nub run test`, `nub run test:runtime`, `nub run check` green; results in
      §8.
- [x] Docs, `TODO.md` and the plan index updated.

---

## 8. Measured results

**Before the fix** (2026-10-18, real GPUix 0.10.0 `TestRenderer`, the old
`NumberField.tsx` with the new test):

```
FAIL  runtime/number-field.runtime.test.tsx > follows a value the parent changes while a draft exists
AssertionError: expected 1236 to be 56
Expected: 56   Received: 1236

Test Files  1 failed | 20 passed (21)
     Tests  1 failed | 309 passed (310)
```

The four `draftApplies` unit cases document the rule and pass with the helper;
their red direction was the missing module (the helper is new). The end-to-end
behaviour is the runtime case above, which fails on the old `text` expression
and passes on the new one.

**After the fix:**

```
nub run --filter @gpuixui/primitives test
  Test Files  40 passed (40)
       Tests  518 passed (518)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  21 passed (21)
       Tests  310 passed (310)

nub run check
  tests: every test asserts something, and nothing asserts itself
  oxlint: no findings
  oxfmt: All matched files use the correct format.
  check-types: every workspace Done
```

# 326 — `NumberField` must show a value supplied after mount

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives |
| Depends on | `054` (the field), `324` (the per-render mode), `325` (the draft rule) |
| Status | done |
| Fixes | `NumberField`'s empty-state gate |

---

## 1. The defect

`NumberField` decides once, at mount, whether it is "touched":

```tsx
// packages/primitives/src/components/NumberField.tsx (before)
const [touched, setTouched] = useState(
  props.value !== undefined || props.defaultValue !== undefined,
);
...
const text = Option.match(applicableDraft, {
  onNone: () => (touched ? display(current) : ""),
  ...
});
```

The gate exists for a good reason: an untouched field with neither `value` nor
`defaultValue` must render empty, not `0`. But since plan `324` a component can
become controlled **after mount**, and `touched` is still false — so the field
hides the value it now holds.

**Measured on this host, 2026-10-18**, real GPUix 0.10.0 `TestRenderer`:

```
× probe: a NumberField shows a value supplied after mount
AssertionError: expected 7 to be 427
```

The probe mounts `<NumberField autoFocus>` (empty), re-renders it with
`value={42}`, then types `7`. The fixed field paints `42` and reports `427`; the
defective one paints nothing and reports `7`.

The other 13 controlled parts have no such gate — this is `NumberField`'s own
mount-time state, not the shared rule.

---

## 2. The rule

> Show the value when the field is **touched** *or* **controlled on this
> render**; paint empty only for an untouched, uncontrolled field.

`touched` stays the "the user or the caller has given this field a value" flag
for the uncontrolled case. Controlled-ness comes from the per-render mode plan
`324` established, so a late `value` is visible immediately.

---

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/NumberField.tsx` | the empty-state gate includes `state.value.mode === "controlled"` |
| `packages/primitives/runtime/number-field.runtime.test.tsx` | the probe as a regression test |
| `packages/primitives/docs/number-field.mdx` | name the late-value behaviour beside the empty-state sentence |
| `TODO.md` | add and tick the task (bump 74 → 75) |
| `.agents/slop/plans/README.md` | index this plan |

No core change: `withValue` already reports the mode per render.

---

## 4. Exact implementation

```tsx
const current = state.value.current;
const showValue = touched || state.value.mode === "controlled";
const text = Option.match(
  Option.filter(draft, (candidate) => draftApplies(candidate, current)),
  {
    onNone: () => (showValue ? display(current) : ""),
    onSome: (candidate) => candidate.text,
  },
);
```

Runtime test (append to `number-field.runtime.test.tsx`):

```tsx
it("shows a value supplied after mount", async () => {
  // The bug guarded (plan 326): `touched` was decided at mount, so an empty
  // field that became controlled later painted nothing (measured 7, not 427).
  ...
  expect(lastValue(values)).toBe(427);
});
```

Docs: after "An untouched field with neither `value` nor `defaultValue` renders
empty", add that a `value` supplied later shows immediately.

---

## 5. Commands, in order

| # | Command (from `packages/primitives`) | Expected |
| - | ------------------------------------ | -------- |
| 1 | `nub run test:runtime -- number-field` before the fix | the new test fails with `expected 7 to be 427` |
| 2 | apply §4 | — |
| 3 | `nub run test` | 40 files / 518 tests green |
| 4 | `nub run test:runtime` | 21 files / 311 tests green |
| 5 | from the root: `nub run check` | green |
| 6 | `git diff` review | only §3's files |

---

## 6. STOP conditions

- **STOP** if an untouched uncontrolled field starts painting `0` (the gate must
  still be false when neither a value nor a default exists).
- **STOP** if a controlled field with `value={0}` paints empty.
- **STOP** outside `NumberField`, its runtime test, its page, `TODO.md` and the
  plan index.

---

## 7. Acceptance

- [x] A value supplied after mount paints on the next render (runtime, real
      binding) and typing continues from it.
- [x] An untouched uncontrolled field still paints empty.
- [x] `nub run test`, `nub run test:runtime`, `nub run check` green; results in
      §8.
- [x] Docs, `TODO.md` and the plan index updated.

---

## 8. Measured results

**Before the fix** (2026-10-18, real GPUix 0.10.0 `TestRenderer`), with only the
new gate reverted to `touched` and the plan-325 draft rule in place:

```
FAIL  runtime/number-field.runtime.test.tsx > shows a value supplied after mount
AssertionError: expected 7 to be 427
Expected: 427   Received: 7

Test Files  1 failed | 20 passed (21)
     Tests  1 failed | 310 passed (311)
```

**After the fix:**

```
nub run --filter @gpuixui/primitives test
  Test Files  40 passed (40)
       Tests  518 passed (518)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  21 passed (21)
       Tests  311 passed (311)

nub run check
  tests: every test asserts something, and nothing asserts itself
  oxlint: no findings
  oxfmt: All matched files use the correct format.
  check-types: every workspace Done
```

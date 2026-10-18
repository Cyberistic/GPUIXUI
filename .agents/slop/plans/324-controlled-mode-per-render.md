# 324 — Controlled-ness is decided per render, not frozen at mount

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives |
| Depends on | `030` (the shared state machine), `041` (the runtime suite) |
| Status | done |
| Fixes | every component built on `useControlState` (14 public parts) |

This plan is self-contained. Run it top to bottom; do not skip §5.

---

## 1. The defect

`core/state.ts` decides "controlled" **once**, when the component mounts, and
stores that decision in `ValueState.mode`. `withValue` — the function every
render calls — then **ignores the `value` prop whenever the control started
uncontrolled**:

```ts
// packages/primitives/src/core/state.ts (before)
export const withValue = <Value>(
  state: ValueState<Value>,
  value: Option.Option<Value>,
): ValueState<Value> =>
  state.mode === "controlled"
    ? { ... }
    : state; // ← an uncontrolled control never sees a value again
```

So a parent that has no value yet and supplies one after mount — the ordinary
async form shape `value={data?.name}` — is ignored forever. The field keeps its
empty internal draft.

**Measured on this host, 2026-10-18**, against the real GPUix 0.10.0
`TestRenderer` (plan 140's binding), with a temporary probe that re-rendered the
same tree with a different `value` prop:

```
× probe: a text value supplied after mount is ignored
AssertionError: expected 'x' to be 'loadedx'
Expected: "loadedx"   Received: "x"

× probe: a checked value supplied after mount is ignored
AssertionError: expected 'unchecked' to be 'checked'
Expected: "checked"   Received: "unchecked"
```

The text probe mounts `<Input defaultValue="" autoFocus onValueChange=…>`, then
re-renders `<Input value="loaded" …>` and types one character. The edit arrives
as `"x"`, not `"loadedx"`: the native field was still empty, so the parent's
value never reached the host. The checkbox probe mounts `<Checkbox label="Agree">`,
re-renders `<Checkbox checked label="Agree">`, and the accessible value stays
`"unchecked"`.

This is not an `Input` problem. `useControlState` is the one controlled rule for
`Input`, `TextArea`, `NumberField`, `OTPField`, `Select`, `Checkbox`,
`CheckboxGroup`, `RadioGroup`, `Switch`, `Toggle`, `ToggleGroup`, `Rating`,
`Slider` and `RangeSlider`.

The reverse transition is broken the same way: a control that mounts controlled
and later loses its `value` keeps `mode: "controlled"` and renders its
`defaultValue`, because a controlled control never stores an internal draft.

**Cause.** Controlled-ness is a property of the current render (is `value`
supplied *now*?), not of the mount. The existing unit test
`"never reverts an uncontrolled control's own input on a re-render"` passes
`Some("ignored")` and asserts the control ignores it — it encodes the defect.
Both directions must change.

---

## 2. The rule

> A control is **controlled** on a render where `value` is supplied, and
> **uncontrolled** on a render where it is not. `internal` is the uncontrolled
> draft and survives the switch; the rendered value is the supplied value while
> controlled and `internal` while uncontrolled.

Notes:

- This matches React's own contract: passing `value` makes an input controlled.
  Switching modes in a mounted tree is legal for us and deterministic; React
  warns about it, we document it.
- A controlled control still does not keep a private copy of an interaction
  (`internal` is unchanged by `setValue` while controlled) — that rule stays.
- `setValue`'s optimistic `current` is unchanged; the next render's `withValue`
  re-derives `current` from the prop, so a parent that refuses a change wins.

---

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/state.ts` | `withValue` derives `mode` from the supplied `Option` every render; update its doc comment and the module header |
| `packages/primitives/src/core/state.test.ts` | Replace the test that asserts the defect; add the two transitions and the stable-render case; reword the header comment to name the bug |
| `packages/primitives/runtime/fields.runtime.test.tsx` | One measured test: a value supplied **after mount** reaches the native field (type one character and assert `"loadedx"`) |
| `packages/primitives/runtime/controls.runtime.test.tsx` | One measured test: a `checked` supplied after mount reaches the accessibility tree (`"unchecked" → "checked"`) |
| `packages/primitives/README.md` | New `### Controlled and uncontrolled values` subsection under "One value callback" |
| `packages/primitives/docs/input.mdx` | `value` row + a paragraph: a value supplied later takes over; `defaultValue` is the uncontrolled draft |
| `TODO.md` | Add the fix under the primitives section and tick it |
| `.agents/slop/plans/README.md` | Add the plan row (this file) |

No new component, example or inventory row: this corrects the shared rule every
existing component and example already uses.

---

## 4. Exact implementation

### 4.1 `core/state.ts`

Replace `withValue` with:

```ts
export const withValue = <Value>(
  state: ValueState<Value>,
  value: Option.Option<Value>,
): ValueState<Value> =>
  Option.match(value, {
    onNone: () => ({
      mode: "uncontrolled",
      current: state.internal,
      internal: state.internal,
    }),
    onSome: (current) => ({
      mode: "controlled",
      current,
      internal: state.internal,
    }),
  });
```

Update the doc comment: controlled-ness is per render; `internal` is the
uncontrolled draft and survives a switch. Update `initValueState`'s comment only
if it now claims more than "the initial state".

Do **not** touch `setValue`'s internal-copy rule.

### 4.2 `core/state.test.ts`

- Rename/replace `"never reverts an uncontrolled control's own input on a re-render"`
  with `"keeps an uncontrolled control's draft while no value is supplied"`
  (`withValue(state, Option.none())` → same `current`).
- Add `"a value supplied after mount makes the control controlled"`:
  start `initValueState(None, "draft")`, set to `"typed"`, then
  `withValue(…, Some("loaded"))` → `mode: "controlled"`, `current: "loaded"`,
  `internal: "typed"`.
- Add `"losing the value falls back to the uncontrolled draft"`:
  start `initValueState(Some("parent"), "default")`, then
  `withValue(…, None)` → `mode: "uncontrolled"`, `current: "default"`.
- Keep the existing controlled-follows-parent and initial-state tests.
- Header comment: state the bug guarded — a parent that loads its value after
  mount, which the field used to ignore.

### 4.3 Runtime tests

`runtime/fields.runtime.test.tsx` (append near the Input editing tests):

```tsx
it("takes a value supplied after mount", async () => {
  // The bug guarded (plan 324): the controlled decision was frozen at mount, so
  // `<Input value={data?.name}>` ignored the value once the load completed.
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Input testId="field" label="Name" autoFocus defaultValue="" onValueChange={field.onValueChange} />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <Input testId="field" label="Name" autoFocus value="loaded" onValueChange={field.onValueChange} />
    </Surface>,
  );
  runtime.type("x");
  expect(lastValue(field.values)).toBe("loadedx");
});
```

`runtime/controls.runtime.test.tsx` (near the Checkbox cases):

```tsx
it("takes a checked supplied after mount", async () => {
  // The bug guarded (plan 324): the shared controlled rule froze the mode at
  // mount, so a checkbox that became controlled later painted "unchecked".
  const runtime = await openWindow();
  const value = (): string | undefined =>
    Option.getOrUndefined(a11yValueOf(runtime.a11y(), { role: "CheckBox", label: "Enable" }));
  runtime.render(
    <Surface>
      <Checkbox testId="cb" label="Enable" />
    </Surface>,
  );
  expect(value()).toBe("unchecked");
  runtime.render(
    <Surface>
      <Checkbox testId="cb" label="Enable" checked />
    </Surface>,
  );
  expect(value()).toBe("checked");
});
```

`runtime.render` on the same root reconciles in place (the probe proved the
`useState` survives: the field stayed the same uncontrolled draft across the
second render).

### 4.4 Docs

README, after "One value callback":

```md
### Controlled and uncontrolled values

`value` / `defaultValue` / `onValueChange(value)` is the one value contract. A
part is **controlled on the render where `value` is supplied** and uncontrolled
on a render where it is not — the decision is not frozen at mount, so
`value={loaded?.name}` works when `loaded` arrives later. `internal` is the
uncontrolled draft and survives the switch; a controlled part never keeps a
private copy of an interaction. Switching modes in a mounted tree is
deterministic; React warns about it, and a part that switches by accident is
usually a caller mistake.
```

`docs/input.mdx`: in the `value` API row, append "a value supplied after mount
takes over, so `value={loaded?.name}` works"; add one sentence under Usage.

---

## 5. Commands, in order

| # | Command (from `packages/primitives`) | Expected |
| - | ------------------------------------ | -------- |
| 1 | `nub run test -- state` (or `nub run test`) | the new state tests fail before the fix; after §4.1 they pass |
| 2 | `nub run test:runtime -- fields` before the fix | the new test fails with `expected 'x' to be 'loadedx'` (the two-direction proof) |
| 3 | `nub run test:runtime -- controls` before the fix | the new test fails with `"unchecked"` ≠ `"checked"` |
| 4 | apply §4.1–§4.4 | — |
| 5 | `nub run test` | 40+ files, all passing (512 + the new cases) |
| 6 | `nub run test:runtime` | 21+ files / 307+ tests, all passing |
| 7 | from the repo root: `nub run check` | `check:tests`, lint, fmt and every `check-types` green |
| 8 | `git diff` review | only the files in §3; no unrelated churn |

**Two-direction proof required.** Record both failing outputs (steps 2–3) in §8
below before the fix. `scripts/verify-two-directions.sh` is jj-based and broken
(recorded in `TODO.md`); the manual commands above are the substitute and their
output must be pasted into §8.

---

## 6. STOP conditions

- **STOP** if the runtime does not apply an updated `value` prop to an existing
  `<input>` (step 2 still reports `"x"` after the fix). That would be a second,
  different defect; record the measurement and do not fake the test.
- **STOP** if a new failure appears outside `core/state` tests — the rule is
  shared, so a failure means another component depended on the frozen mode;
  report the file and test name instead of widening the change.
- **STOP** before changing `setValue`, `initValueState`, or a component file.
  The fix is one function and the tests; anything else is a different plan.
- **STOP** if `nub run check` fails for a reason outside this workstream's paths;
  record it in `TODO.md` as a cross-team item rather than editing another
  workstream's file.

---

## 7. Acceptance

- [x] `withValue` derives controlled-ness from the supplied `Option` on every
      render; no code path freezes the mode.
- [x] A value supplied after mount reaches the native field (runtime, real
      binding) and the accessibility tree (runtime, real binding).
- [x] The uncontrolled draft still survives ordinary re-renders that supply no
      value.
- [x] `nub run test`, `nub run test:runtime` and `nub run check` are green, and
      the plan records their actual output in §8.
- [x] README and `docs/input.mdx` state the per-render rule.
- [x] `TODO.md` carries the ticked task; the plan index row points here.

---

## 8. Measured results

**Before the fix** (`git stash push -- packages/primitives/src/core/state.ts`,
then the new tests against the old `withValue`), 2026-10-18:

```
FAIL  runtime/fields.runtime.test.tsx > takes a value supplied after mount
AssertionError: expected 'x' to be 'loadedx'
Expected: "loadedx"   Received: "x"
❯ runtime/fields.runtime.test.tsx:133:35

FAIL  runtime/controls.runtime.test.tsx > takes a checked supplied after mount
AssertionError: expected 'unchecked' to be 'checked'
Expected: "checked"   Received: "unchecked"
❯ runtime/controls.runtime.test.tsx:554:40

Test Files  2 failed | 19 passed (21)
     Tests  2 failed | 307 passed (309)
```

**After the fix:**

```
nub run --filter @gpuixui/primitives test
  Test Files  40 passed (40)
       Tests  514 passed (514)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  21 passed (21)
       Tests  309 passed (309)

nub run check
  tests: every test asserts something, and nothing asserts itself
  oxlint: no findings
  oxfmt: All matched files use the correct format.
  check-types: every workspace Done
```

Both new runtime tests fail with the old `withValue` and pass with the new one;
the two `withValue` transition tests fail in the same direction (the "takes over"
case asserted `uncontrolled`/`"typed"`).

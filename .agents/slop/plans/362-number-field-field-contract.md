# 362 — `NumberField`'s field contract: a disabled field commits, a key-up is dropped, and an out-of-range value is painted raw

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `054`, `077`, `324`–`326`, `332`, `338`, `339`, `345` |
| Status | done |

Self-contained: §0 the measured defects, §1 the decision, §2 the rules, §3 the
files, §4 commands and expected results, §5 the test plan and the two-direction
proof, §6 STOP conditions, §7 outcome (filled after the run), §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, this host, 0.10.0)

Three temporary runtime probes (deleted after recording) mounted a `NumberField`
in the real `TestRenderer` and dumped the input's `customProps`, the
accessibility tree and the callbacks. The package's own records say:

- `docs/number-field.mdx`, `disabled`: *"read-only, out of the tab order,
  inert"*; `COMPONENTS.md` says a disabled field *"refuses text, keys and
  presses"*.
- `NumberFieldProps extends TriggerHandlers` (`components/internal.ts`), and
  `docs/number-field.mdx` says the field forwards a tooltip's handlers.
- `docs/number-field.mdx`, `min`/`max`: *"bound the value"*; `docs/slider.mdx`
  says an out-of-range value is clamped (and `Slider` does clamp it on every
  render), so the two value controls claim the same rule.

| Probe | Result before the fix |
| ----- | --------------------- |
| Mount `<NumberField value={150} max={100} label="Amount" autoFocus />` | the input paints `"150"` and AccessKit reports `value: "150"` — a value outside the field's own bound |
| On the same field, `ArrowUp` | reports **`100`** — an "up" step that *decreases* the value; the up stepper itself is disabled (`atMax` reads the raw `150`), so pointer and keyboard disagree |
| Mount `<NumberField value={1} autoFocus onValueChange />`, type `"2"`, re-render `disabled`, then move focus away | `onValueChange` fires **again** with `12`: the blur commit runs on a disabled field |
| Mount with `onKeyUp`, `keyUp("nf", "up")` | zero calls. The input's event set is `["blur","change","focus","keyDown","submit"]` — there is no key-up handler, while `Input`, `TextArea`, `Select`, `Slider` and every button forward the caller's `onKeyUp` |

The three are one class: **the field treats its own public contract as advice.**
The disabled rule is bypassed by one handler, the slot contract is honoured for
`onKeyDown` but not `onKeyUp`, and the bound rule is applied to typed text but
not to a supplied value.

## 1. The decision

1. **A disabled field is inert on every path**, including the blur commit. It
   still reports blur to the caller and drops its ring, but it does not parse,
   commit or report a value.
2. **A supplied `value` is rendered through the same bound as typed text.**
   The painted text, the announcement, `atMin`/`atMax`, the steppers and the
   arrow keys all derive from `clampNumeric(value, range)`. The field never
   reports the clamp spontaneously on render — only a commit or a step reports.
3. **The caller's `onKeyUp` reaches the input**, exactly as every sibling
   forwards it. The field itself steps on key **down** (`decideNumberKey`);
   key up stays the caller's.

### Why the clamp belongs in the component, not in `core/number.ts`

`clampNumeric` already owns the rule. The defect is that the wrapper feeds it
only `defaultValue` and typed text. Both the wrapper (for the painted text and
the draft's base) and the pure renderer (for `atMin`/`atMax` and the key/step
target) need the same bounded value, so both call the one helper. No new rule is
invented, and the pure renderer becomes correct for any caller.

## 2. The rules

In `src/components/NumberField.tsx`:

1. `renderNumberField` derives one local value for every decision:

   ```ts
   const current = clampNumeric(state.current, range);
   ```

   and uses it for `atMin`, `atMax`, the two steppers, `decideNumberKey` and
   `stepNumber`. `state.current` is not read anywhere else in the renderer.

2. The input gains the caller's key-up handler:

   ```tsx
   onKeyUp={props.onKeyUp}
   ```

   (`passiveTriggerHandlers` deliberately omits key handlers, so every control
   wires its own; this is the one `NumberField` forgot.)

3. The blur handler commits only while enabled:

   ```tsx
   onBlur={(event: EventPayload) => {
     focus.onBlur();
     if (!disabled) handlers.onCommit();
     props.onBlur?.(event);
   }}
   ```

   The ring and the caller's callback are unchanged; only the value report is
   suppressed.

4. The wrapper derives the displayed value the same way:

   ```ts
   const current = clampNumeric(state.value.current, range);
   ```

   used for `showValue`/`display`, `draftApplies` and every handler's step and
   commit. `state.value.current` remains only the source of that expression.

No public type changes: `NumberFieldProps` already declares `onKeyUp` through
`TriggerHandlers`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/NumberField.tsx` | the bounded `current` in the wrapper and the renderer, `onKeyUp`, the disabled blur guard; update the header/docstrings |
| `packages/primitives/src/components/NumberField.test.tsx` | two element-tree cases: the caller's `onKeyUp` is forwarded, and an out-of-range state disables the matching stepper without stepping |
| `packages/primitives/runtime/number-field.runtime.test.tsx` | three runtime cases (§5.1) |
| `packages/primitives/docs/number-field.mdx` | a "Bounds" paragraph (a supplied out-of-range value paints the bound and steps from it), the disabled row's commit rule, `onKeyUp` in the API table, and the Verification list |
| `COMPONENTS.md` | the Number Field row (`... (line truncated)` tail) gains the bounded-value, disabled-blur and key-up facts |
| `TODO.md` | tick the task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

Do **not** edit `packages/components`, `packages/tokens`, `packages/icons`,
`apps/*` or `docs/gpuix-capabilities.md` (no capability claim changes).

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/components/NumberField.test.tsx` | the new element-tree cases and the existing field cases pass |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 43 files / 603 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/number-field.runtime.test.tsx` | the three new cases pass; every existing field case stays green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 29 files / 584 tests) |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test must be able to fail. Write them first, run against the unmodified
code, and record the failing assertion in §7.

### 5.1 Runtime (`runtime/number-field.runtime.test.tsx`)

One window per case (the fixture rule).

1. **"paints and announces the bound for a supplied out-of-range value"** —
   mount `value={150} max={100} label="Amount"`. Assert the AccessKit `TextInput`
   value is `"100"` (before: `"150"`) and the chrome paints the enabled up
   stepper as blocked (muted icon — or simply that the next two assertions
   hold).
2. **"an out-of-range value steps from its bound"** — the same field: `ArrowUp`
   reports nothing (it is at the bound after clamping); `ArrowDown` reports
   `99`. Before: `ArrowUp` reports `100` and `ArrowDown` reports `100` (both
   from the raw `150`).
3. **"a disabled field does not commit its draft on blur"** — a controlled,
   deferring parent (`value={1}`, the callback records but never applies), type
   `2` (one report: `12`), re-render `disabled`, move focus to a following
   `Button`. Assert the reports are still exactly `[12]`. A second case proves
   the enabled direction on the same shape: blur **while enabled** appends a
   second `12`, so the guard is what removes the third, not a dead commit path.

### 5.2 Element tree (`src/components/NumberField.test.tsx`)

4. **"forwards the caller's `onKeyUp` to the input"** — `renderNumberField` with
   `onKeyUp`; assert `hostProp(input, "onKeyUp")` is `Some` and invoking it calls
   the spy. Before: the input has only `onKeyDown`.
5. **"a value above `max` steps down from the bound"** — call
   `renderNumberField` with `state.current = 150`, `max = 100`: click the up
   stepper (blocked, no call) and the down stepper. Assert `onValue` receives
   `99`. Before: `stepNumber(150, {max: 100}, -1)` is `clamp(149)` → `100`, so
   the first down step reports the bound and the next step is the first real
   move.

Note: the wrapper's painted text is not reachable from a pure element test (the
`text` string is a component argument), so case 1 is the paint proof and case 5
is the stepper proof.

### 5.3 Two-direction proof (required before "done")

Run cases 1–5 against the **unmodified** tree first; record the failing
assertions in §7. Then, on the fixed tree, mutate one rule at a time:

- restore `onBlur` → `handlers.onCommit()` without the guard → case 3 fails;
- delete `onKeyUp={props.onKeyUp}` → case 4 fails;
- feed `state.current` (raw) to the painted text → case 1 fails;
- feed `state.current` (raw) to `atMax`/`stepNumber` → case 2 fails;
- remove the `disabled` guard from the stepper/key paths (existing cases) — the
  suite must report the same disabled contract it already holds.

Restore; every suite is green, then `nub run check`, `nub run lint` and
`nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. The AccessKit value of the input is not the painted text (case 1 needs a
   different, still honest observation — e.g. the input's `customProps.value`,
   which the probe showed carries `"150"`).
3. Clamping the supplied value makes a controlled parent fight the field (a
   render→report loop). The field must not report on render; if a loop appears,
   report the trace instead of adding a dependency guard by guesswork.
4. Suppressing the blur commit breaks an existing case that depends on a
   disabled field committing (there should be none: plan `339` already asserts a
   disabled field neither commits nor submits).
5. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the output instead of masking it.

## 7. Outcome

`NumberField` now treats its bound, its disabled state and its forwarded
handlers as one contract.

**Measured after** (same probes as §0):

| Observation | Before | After |
| ----------- | ------ | ----- |
| `<NumberField value={150} max={100} label="Amount" autoFocus />` — AccessKit value | `"150"` | `"100"` |
| `ArrowUp` on that field | reports `100` (a decrease) | reports nothing |
| `ArrowDown` on that field | reports `100` | reports `99` |
| controlled `value={1}`, type `2`, disable, move focus away | second report `12` | no report |
| controlled `value={1}`, type `2`, move focus away while enabled | second report `12` | second report `12` (unchanged — the control case) |
| caller's `onKeyUp` | never called; input events `blur, change, focus, keyDown, submit` | called once; the input carries an `onKeyUp` handler |

The no-op guard fell out of the first measurement: with the value clamped to
`100`, `ArrowUp` still reported `100` because the controlled rule compared the
proposal against the parent's raw `150`. Both `onValue` and `onCommit` now
report against the value the field paints, so a step or commit that lands on the
painted number stays silent (a bound is not a change), while a real step
(`99`) still reports.

### 7.2 The two-direction proof

Each mutation of the fixed tree failed the case named for it:

| Mutation | Failing case |
| -------- | ------------ |
| `onKeyUp={props.onKeyUp}` deleted | element: *forwards the caller's key-up to the input* |
| wrapper's bounded `current` replaced by `state.value.current` | runtime: *paints and announces the bound of an out-of-range supplied value* (the a11y value read `"150"`) |
| renderer's bounded `current` replaced by `state.current` | element: *steps from the bound when the supplied value is outside it*; runtime: the same out-of-range case |
| `if (!disabled)` removed from `onBlur` | runtime: *does not commit its draft once the field is disabled* |
| `Object.is` guard removed from `onValue` | runtime: the out-of-range case (`ArrowUp` reported `100`) |

Both suites were green on the restored tree: offline **43 files / 605 tests**
(603 + 2), runtime **29 files / 587 tests** (584 + 3). `nub run check`,
`nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] A value outside `min`/`max` paints and announces the bound, and steps from
      it.
- [x] A disabled field reports no value on blur, while an enabled one still
      commits.
- [x] The caller's `onKeyUp` reaches the input.
- [x] Docs, the inventory row, `TODO.md` and the plan index record it.
- [x] Every new test fails in both directions.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.

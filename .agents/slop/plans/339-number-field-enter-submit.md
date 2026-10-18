# 339 — `NumberField`'s Enter never commits, and it has no submit hook

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `025`, `030`, `041`, `046`, `047`, `054`, `338` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands and expected results, §5 the test plan and the two-direction
proof, §6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, this host, 0.10.0)

`docs/number-field.mdx` says of `Enter`: *"commit and reformat"*, and
`renderNumberField` handles it as `key === "enter"` inside the input's
`onKeyDown`.

A probe (a temporary runtime file, deleted after recording) mounted a
`NumberField` with `precision={2}` and `autoFocus`, typed `1 . 5`, and pressed
Enter through `renderer.nativeSimulateKeyDown(input.id, "enter")` +
`nativeSimulateKeyUp`:

| Step | Painted text |
| ---- | ------------ |
| after typing `1.5` | `1.5` |
| after Enter | `1.5` — **not** the committed `1.50` |

A second probe logged every event a raw `<input>` receives for Enter:

| Props | Events observed |
| ----- | --------------- |
| `onKeyDown` + `onKeyUp` only | `down:1`, `down:2`, **`up:enter`** |
| plus `onSubmit` | `down:1`, `down:2`, **`submit`**, `up:enter` |

So the editor consumes Enter's **key down** exactly as it consumes the caret
keys (plan `338`): an input without `onSubmit` never reports the key at all, and
one with it reports a `submit` event instead. The `key === "enter"` branch in
`NumberField` is therefore dead, and the documented commit does not happen — a
draft only reformats when the field loses focus.

`Input` already solves this: `fieldHostProps` passes the caller's `onSubmit`
(plan `046` measured that a `TextArea` must not, because the trade is the
newline; a single-line field has no newline to lose). `NumberField` has no
`onSubmit` prop at all, so it has neither the commit nor the familiar hook.

## 1. The decision

**`NumberField` commits through the input's `onSubmit`, and exposes
`onSubmit`.** Enter is the platform's submit gesture on a single-line field; the
component commits its draft first and then hands the same event to the caller,
so an app can save or advance on Enter without re-implementing the reformat.

Key-up is rejected for the same reason as plan `338`: a key-up handler would
work, but `submit` is the event the host actually defines for this gesture, and
it keeps the order (commit → caller) in one place.

The `key === "enter"` branch in the keydown handler is deleted — it cannot fire,
and leaving it implies a second path that would double-commit if the runtime
ever delivered both.

## 2. The rule

1. `NumberFieldProps` gains:

   ```ts
   /**
    * Enter: the draft is committed and reformatted before this is called.
    * The event is the host's submit payload.
    */
   readonly onSubmit?: (event: EventPayload) => void;
   ```

2. `renderNumberField`'s `<input>` gains:

   ```tsx
   onSubmit={(event: EventPayload) => {
     if (disabled) return;
     handlers.onCommit();
     props.onSubmit?.(event);
   }}
   ```

   and its `onKeyDown` loses the `enter` branch.

3. The public surface is unchanged otherwise — `onCommit` stays internal to
   `NumberFieldHandlers`.

4. Docs: the props table gains `onSubmit`; the Keyboard `Enter` row says
   "commit, reformat, then call `onSubmit`"; the Verification list notes the
   runtime proof.

5. `COMPONENTS.md` → Number Field and `TODO.md` record it.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/NumberField.tsx` | `onSubmit` prop, the input's submit handler, remove the dead keydown branch |
| `packages/primitives/src/components/NumberField.test.tsx` | the key case drops `enter` from `onKeyDown`; a new case proves `onSubmit` commits and then calls the caller, and that a disabled field does neither |
| `packages/primitives/runtime/number-field.runtime.test.tsx` | Enter commits `1.5` to `1.50` and reports once; the caller's `onSubmit` runs once after the commit; a disabled field ignores Enter |
| `packages/primitives/docs/number-field.mdx` | props table, Keyboard row, Verification list |
| `COMPONENTS.md` | the Number Field row |
| `TODO.md` | add and tick the task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

Do **not** edit `packages/components`, `packages/tokens`, `apps/*` or
`docs/gpuix-capabilities.md`.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/components/NumberField.test.tsx` | the submit case passes |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 41 files / 544 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/number-field.runtime.test.tsx` | the three new cases pass; every existing case stays green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 22 files / 368 tests) |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

### 5.1 The element tree (`src/components/NumberField.test.tsx`)

1. **"commits on the host's submit, then calls the caller"** — invoke
   `hostHandler(input, "onSubmit")` with a submit payload; assert `onCommit` ran
   and `onSubmit` was called once, in that order. Before the fix the input has
   no `onSubmit`, so `hostHandler` fails by name.
2. **"a disabled field ignores Enter"** — the same handler with
   `disabled: true`; neither `onCommit` nor the caller's `onSubmit` runs.
3. **"routes only the keys the runtime delivers"** amended — `enter` is no
   longer asserted on `onKeyDown` (it never arrives); the caret-key case from
   plan `338` stays.

### 5.2 The runtime (`runtime/number-field.runtime.test.tsx`)

4. **"Enter commits and reformats the draft"** — `precision={2}`; type `1 . 5`,
   press Enter (`nativeSimulateKeyDown` + `nativeSimulateKeyUp`), assert the
   painted text is `1.50`. Before: `1.5`.
5. **"Enter calls the caller's `onSubmit` once, after the commit"** — the
   recorder's `onValueChange` and `onSubmit` both fire; the painted text at the
   time `onSubmit` runs is the committed one (recorded through the callback).
6. **"a disabled field ignores Enter"** — no commit, no submit, painted text
   unchanged.

### 5.3 Two-direction proof (required before "done")

- Run §5.1–§5.2 against the **unmodified** tree; record the failing assertions
  in §7 (the submit case has no handler; the runtime paints `1.5`).
- Remove the input's `onSubmit` only → cases 1, 4 and 5 fail.
- Call the caller before `handlers.onCommit()` → case 5's recorded paint is the
  draft, not `1.50`.
- Drop the disabled guard → case 2 and case 6 fail.
- Restore; every suite is green; `nub run check`, `nub run lint`, `nub run test`
  pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. Enter still reaches `onKeyDown` on this host (the §0 `up:enter`-only
   observation changes) — re-measure; the plan's premise is the submit-only
   path.
3. Adding `onSubmit` makes Enter submit something else (a second handler, a
   form-style bubble) — report the trace rather than shipping a double path.
4. A gate fails for a reason unrelated to this change. Report the output instead
   of masking it.

## 7. Outcome

### 7.1 The fix

`NumberField` takes `onSubmit` and wires it to the input's **submit** event: the
draft commits and reformats first, then the caller's handler receives the same
event. The dead `key === "enter"` branch is gone from `onKeyDown`. Measured in
the runtime, `1.5` with `precision={2}` paints `1.50` after Enter, the caller's
handler runs once, and a disabled field neither commits nor calls it.

The order is proven where it is observable — the element tree records both calls
and asserts `["commit", "caller"]`. During dispatch the repaint has not happened
yet, so the runtime case asserts the final paint rather than the paint *inside*
the callback (the plan's §5.2 case 5 phrasing was not observable; the assertion
was narrowed to the calls and the final text, and the order lives in §5.1).

### 7.2 The two-direction proof

| Mutation | Failing assertion |
| -------- | ----------------- |
| the input's `onSubmit` removed | element tree: "the element tree did not carry what this test asserts on" (no handler); runtime: `expected ['1.5'] to include '1.50'` and `expected [] to strictly equal ['submit']` |
| the caller called before `handlers.onCommit()` | element tree: `expected ['caller','commit'] to strictly equal ['commit','caller']`; the runtime case still passes — the final paint is the same and each callback runs once, which is why the order is asserted offline |
| the `disabled` guard dropped | element tree: `expected "vi.fn()" to be called +0 times, but got 1 times`; runtime: `expected ['submit'] to strictly equal []` |

### 7.3 Counts

Offline **41 files / 546 tests** (544 + 2 element-tree cases). Runtime **22 files
/ 371 tests** (368 + 3). `nub run check`, `nub run lint` and `nub run test`
pass.

## 8. Acceptance

- [x] `NumberField` takes `onSubmit`, commits the draft first, then calls it.
- [x] Enter reformats a typed draft in the real runtime (`1.5` → `1.50`).
- [x] A disabled field neither commits nor calls `onSubmit`.
- [x] The dead keydown `enter` branch and its assertion are gone.
- [x] Docs, `COMPONENTS.md`, `TODO.md` and the plan index record it.
- [x] Every new test fails in both directions before/after the fix.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.

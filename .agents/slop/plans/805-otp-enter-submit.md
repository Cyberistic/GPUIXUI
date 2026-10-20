# 805 — `OTPField` cannot be submitted from the keyboard

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `046`, `047`, `054`, `076`, `339`, `358`, `360`, `372`, `752`, `786` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands and expected results, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan

### 0.1 The gap

`OTPField` is the one single-line text field in the library with no way to
finish from the keyboard:

| Part | `onSubmit` | Enter's effect |
| ---- | ---------- | -------------- |
| `Input` | yes (`FieldProps.onSubmit`, forwarded by `fieldHostProps`, plan `046`) | reports the raw runtime `submit` event |
| `NumberField` | yes (plan `339`) | commits the draft, then reports `submit` |
| `TextArea` | **no, deliberately** (plan `046`) | the runtime would trade the newline for a submit |
| `OTPField` | **no prop at all** | **nothing** |

The OTP page's `## Keyboard` table lists `Tab`, a letter/digit, a separator, the
arrows, `Home`/`End` and `Backspace` — and no Enter row at all. The example ends
its flow with "Code complete — press Verify.", i.e. the only submit path is a
pointer press on a separate button.

A one-time-code step is the archetypal "type six digits, press Enter" surface,
and every other field in the family can do it. This is the same class of defect
plan `339` fixed for `NumberField`: the gesture the platform defines for a
single-line field is not wired to anything.

### 0.2 Why it is not free (the platform fact)

Plan `339` measured the mechanism on this host and build:

- a single-line `<input>` **consumes Enter's key down** — a component's
  `onKeyDown` never sees it;
- the host then reports Enter as its **`onSubmit`** event, when one is given.

So the fix is a host `onSubmit` on each cell, not a key handler. `OTPField`'s
cells are real `<input>` hosts (`renderOtpField`), so the same event is
available; a scratch probe is unnecessary for the decision, and §7 records the
observed event on the shipped wiring. If the cell does **not** report a submit,
that is STOP condition 1 and the page records the runtime limit instead.

### 0.3 What must not change

The field's existing contracts, each proven elsewhere and re-run in §5:

- one roving tab stop (plan `076`) and the read-only resting stop (plan `786`);
- contiguous value, `onValueChange` per real change, `onComplete` on every edit
  that leaves the code full (plans `358`, `360`, `752`);
- `disabled` is inert on **every** path (plan `786`); `readOnly` keeps focus and
  refuses every edit but is not a disabled control.

## 1. The decision

**Add `onSubmit?: (value: string) => void` to `OTPField`.** Enter in any cell
reports **the code the field holds**, and nothing else changes.

The payload is the code, not the raw event — a deviation from `Input`/
`NumberField`, recorded in the page's API table:

- the event belongs to **one cell** (`cell 3`), which is an implementation
  detail of a field whose contract is a single string;
- every other callback on this part speaks the code (`onValueChange(value)`,
  `onComplete(value)`);
- `Input`/`NumberField` have no `value` callback on the same event to collide
  with, so they keep the runtime's event.

A partial code is submitted **as it stands**. The field is not a validator: the
caller decides whether `12` is complete, exactly as it does for
`onValueChange`. This also keeps the prop honest for a form whose submit button
is enabled before the code is full.

## 2. The rule

| State | Enter |
| ----- | ----- |
| interactive, partial code | `onSubmit(currentCode)` |
| interactive, full code | `onSubmit(currentCode)` — not a second `onComplete` |
| `readOnly` | `onSubmit(currentCode)` — the field shows the code and a form may submit it |
| `disabled` | **nothing** — inert on every path (the `NumberField` rule) |
| no `onSubmit` prop | nothing observable |

`currentCode` is the value the field holds on that render (`state.current`),
which is the painted code: every edit is committed through `onValueChange`
before Enter can follow it. A controlled parent that defers the value owns what
is submitted — the field cannot invent a code the parent did not accept.

Enter must not move the caret or the cell. `decideOtpKey` has no Enter branch
and the host consumes the key down, so no cell movement happens; the runtime
case pins that too.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/OTPField.tsx` | `OTPFieldProps.onSubmit` (JSDoc as in §1); `OTPFieldHandlers.onSubmit: () => void`; the cell `<input>` passes `onSubmit` gated on `disabled`; the component wires `props.onSubmit?.(state.value.current)` |
| `packages/primitives/src/components/OTPField.test.tsx` | element-tree cases: the cell carries a submit handler; it reports through the handler; a disabled tree carries **none**; the read-only tree still carries one |
| `packages/primitives/runtime/otp.runtime.test.tsx` | native cases: Enter after typing six digits reports `"123456"` once and leaves focus on the cell; a partial code reports itself; a disabled field reports nothing; a read-only field reports its code |
| `packages/primitives/docs/otp-field.mdx` | a `## Submit` section, the `onSubmit` API row (naming the value payload deviation), and an Enter row in `## Keyboard` |
| `packages/primitives/examples/otp.example.tsx` | the verify flow answers Enter as well as the button, and the caption says so |
| `COMPONENTS.md` | the `OTP Field` row records the submit path and its tests |
| `TODO.md` | a ticked task for this plan |
| `PLAN.md` | decision row `D55`: the OTP field's Enter payload is the code |
| `.agents/slop/plans/README.md` | this plan indexed |

No other package is touched.

## 4. Commands and expected results

Run from the worktree root, in this order:

```sh
nub run --filter @gpuixui/primitives check-types
# expect exit 0

nub run --filter @gpuixui/primitives test
# expect the OTP element cases in the run; 75+ files and 1060+ tests, exit 0

nub run --filter @gpuixui/primitives test:runtime runtime/otp.runtime.test.tsx
# expect 1 file, all green, including the new submit cases

nub run --filter @gpuixui/primitives test:runtime runtime/readonly.runtime.test.tsx \
  runtime/tab-order.runtime.test.tsx runtime/otp-paste.runtime.test.tsx
# the scoped neighbours the field shares contracts with; expect green

nub run --filter @gpuixui/primitives test:runtime runtime/examples.runtime.test.tsx
# the example that changed; expect green

nub run lint
nub run fmt
# expect exit 0
```

The full `test:runtime` run is the merge gate, not this plan's gate: the change
touches one part and adds one host handler.

## 5. Test plan

Each case names the bug it guards in its header comment.

### Element tree (`src/components/OTPField.test.tsx`)

1. **carries the submit handler on every cell** — `hostHandler(cell, "onSubmit")`
   is `Some` and calling it calls `handlers.onSubmit` once.
2. **a disabled field carries no submit handler** — `Option.none()` (the guard,
   not a rejected callback: a disabled field is inert on every path).
3. **a read-only field still carries it** — the review state shows a code a form
   may submit.

### Runtime (`runtime/otp.runtime.test.tsx`)

4. **Enter reports the code the user typed** — `autoFocus`, type `123456`,
   Enter on the focused cell → `onSubmit` once with `"123456"`, focus still on
   the last cell, `onComplete` count unchanged by the Enter.
5. **Enter submits a partial code as it stands** — type `12`, Enter → `"12"`.
6. **a disabled field reports nothing** — `disabled defaultValue="123456"`,
   Enter on a cell id → no call (and no value change).
7. **a read-only field reports its code** — `readOnly defaultValue="123456"`,
   Enter on the first cell (its resting stop) → `"123456"`.

### Two-direction proof (each mutation reverted after it fails)

- Remove the cell's `onSubmit` wiring → runtime cases 4, 5, 7 fail by name and
  element cases 1 and 3 fail.
- Change the gate from `disabled` to `inert` (i.e. read-only also refused) →
  runtime case 7 and element case 3 fail, and cases 4–5 stay green.
- Drop the `disabled` gate → runtime case 6 fails and element case 2 fails.
- Report `props.defaultValue` instead of `state.value.current` → runtime cases
  4 and 5 fail on the reported string.

## 6. STOP conditions

Stop and report with the measured evidence instead of improvising if:

- a cell's Enter does **not** reach an `onSubmit` handler on the pinned runtime
  (then the page states the limit, no prop ships, and the plan records the
  event dump — do not substitute a key-up handler that the runtime may deliver
  twice);
- subscribing `onSubmit` on a cell changes the native editing, focus movement or
  paste behaviour (run `otp-paste.runtime.test.tsx`; if it does, stop — the
  handler must be additive);
- a contract/docs guard rejects the change because a page or table does not name
  the prop — fix the page, never relax the guard;
- the change would require editing another workstream's paths — record it in
  `TODO.md` instead.

## 7. Outcome

Measured 2026-10-21 in this worktree (release-tag binding in the shared store):

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run --filter @gpuixui/primitives test` | 75 files / **1062 tests** green (was 1060; +2 element cases) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/otp.runtime.test.tsx` | 1 file / **17 tests** green (was 13; +4 submit cases) |
| `… test:runtime runtime/otp.runtime.test.tsx runtime/readonly.runtime.test.tsx runtime/tab-order.runtime.test.tsx runtime/otp-paste.runtime.test.tsx runtime/examples.runtime.test.tsx` | **5 files / 101 tests** green |
| `nub run lint` | exit 0 |
| `nub run fmt` | only `apps/docs/src/components/docs/demos.tsx` (another workstream's unformatted file, recorded in `TODO.md`); every primitives path is formatted |

The observed event sequence confirms plan `339`'s platform fact on the OTP cell:
`nativeSimulateKeyDown/Up(cell, "enter")` reaches the cell's host `onSubmit`
and nothing else — no caret move, no cell move, no second `onComplete`.

### Two-direction proof (each mutation reverted after it failed)

| Mutation | Failures |
| -------- | -------- |
| The cell's `onSubmit` removed entirely | runtime `reports the code on Enter…`, `submits a partial code as it stands`, `still submits the code it shows while read-only`; element `carries Enter on every cell…`, `carries the submit handler on a read-only field…` |
| The gate changed to `inert` (read-only refused too) | runtime `still submits the code it shows while read-only`; element `carries the submit handler on a read-only field…` |
| The `disabled` gate dropped (handler always present) | runtime `reports no submit while disabled` (`expected [ '123456' ] to strictly equal []`); element `carries the submit handler on a read-only field…` |
| The component reported `props.defaultValue` instead of the live code | runtime `reports the code on Enter…` and `submits a partial code as it stands` (`expected [ '' ]`) |

One measured correction during implementation: the first partial-code case typed
`"1 2"` as one string, and a separator does not move the caret, so the second
digit *replaced* the first (`"2"`). That is the documented separator contract,
not a submit defect; the case now types two keys, as the full-code case does.

## 8. Acceptance

- `OTPField.onSubmit` exists, is documented in the prop table with its payload
  and its read-only/disabled rule, and appears as an Enter row in the keyboard
  table.
- Enter reports the painted code once; a partial code is reported; a disabled
  field is silent; a read-only field still submits.
- The example answers Enter and its caption no longer implies a pointer-only
  flow.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` (`D55`) and the plan index are current.
- `check-types`, `test`, the scoped runtime files, `lint` and `fmt` are green,
  and the exact commands and totals are recorded.

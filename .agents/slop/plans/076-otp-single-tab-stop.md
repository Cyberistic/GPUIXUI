# 076 — `OTPField` is six tab stops

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 interaction correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `054`, `064`, `072` |
| Status | **done** |

Self-contained: §1 the measured gap, §2 the rule, §3 exact files, §4 tests, §5
commands, §6 STOP conditions, §7 acceptance and outcome.

---

## 1. The gap (measured)

`renderOtpField` gives **every** cell `tabIndex={0}`. `Tab` therefore visits all
six cells before it reaches the next control. A one-time-code field is one
control; on the platform it has one tab stop, and the arrows (already
implemented in `core/otp.ts`) move inside it.

Measured on this host with the real GPUix 0.10.0 `TestRenderer` (probe added to
`runtime/otp.runtime.test.tsx`, then removed once the fix landed):

```text
[ Before ] [ 6 cells ] [ After ]   →  click Before, then focusNext ×8

visited: otp-cell-1, otp-cell-2, otp-cell-3, otp-cell-4, otp-cell-5,
         otp-cell-6, after, before
```

Six stops inside one field is also why a form with an OTP step feels broken:
`Tab` from the e-mail field appears to do nothing until the sixth press.

The docs page never mentions tab order, so no claim has to be corrected — one is
added instead.

## 2. The rule

**One tab stop, at the place typing continues.**

- While a cell holds focus, that cell is the tab stop (so `Tab` moves *out* of
  the field rather than to the next cell).
- While the field is not focused, the tab stop is the **first empty cell**, or
  the **last cell** when the code is full. `Tab` into the field therefore lands
  where the next character belongs.
- A disabled field keeps every cell at `-1` (unchanged).

New pure rule in `core/otp.ts`:

```ts
/** The cell Tab enters at when the field is not focused. */
export const otpTabStop = (value: string, length: number): number =>
  Math.min(Str.length(normalizeOtp(value, length)), otpLength(length) - 1);
```

- `otpTabStop("", 6) === 0`, `otpTabStop("12", 6) === 2`,
  `otpTabStop("123456", 6) === 5`, `otpTabStop("123456789", 6) === 5`.
- A nonsense or sub-one `length` resolves through `otpLength`, like every other
  rule in the module.

In `renderOtpField`:

```ts
const tabStop = Option.getOrElse(
  Option.map(focus.focusedIndex, (index) =>
    Math.min(Math.max(index, 0), limit - 1),
  ),
  () => otpTabStop(state.current, limit),
);
// …
tabIndex={disabled || index !== tabStop ? -1 : 0}
```

No new public component props. `otpTabStop` is exported from `core/index.ts`
beside `otpCells`/`otpLength` because the other rules there are.

**Why not keep six stops and add a group tab stop?** That would introduce two
kinds of focus in one control (the wrapper and a cell) and still make `Tab`
visit six arbitrary targets. The roving tab stop is the standard
`role="group"` → child-with-`tabIndex=0` contract, and GPUix already honours
`tabIndex` in `focusNext` (measured by the Toggle Group and Checkbox Group
suites).

**Why not `tabIndex={-1}` on every cell and one hidden input?** GPUix has no
hidden-input composition, the visible cells *are* the native inputs, and the
runtime has no `onPaste`; a second surface would duplicate the text pipeline for
no gain.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/otp.ts` | add `otpTabStop` (pure, documented) |
| `packages/primitives/src/core/index.ts` | export `otpTabStop` with the other OTP rules |
| `packages/primitives/src/core/otp.test.ts` | the pure cases in §4 |
| `packages/primitives/src/components/OTPField.tsx` | derive the tab stop; one `tabIndex={0}` |
| `packages/primitives/src/components/OTPField.test.tsx` | the element-tree cases in §4 |
| `packages/primitives/runtime/otp.runtime.test.tsx` | the two runtime cases in §4 (replace the probe) |
| `packages/primitives/docs/otp-field.mdx` | Keyboard + Accessibility: one tab stop and where it lands; Verification list |
| `COMPONENTS.md` | the OTP Field row: record the single tab stop |
| `TODO.md` | tick the task added for this plan |
| `.agents/slop/plans/README.md` | index this plan and its status |

Implementation notes:

- `focus.focusedIndex` is already cleared on blur, so it needs no extra state:
  the focused cell wins while focused, `otpTabStop` is the resting tab stop.
- Clamp a stale `focusedIndex` (a `length` change while focused) into
  `0..limit - 1`; never produce an index with no `tabIndex={0}`, or the whole
  field leaves the tab order.
- `autoFocus` is unchanged: it still focuses cell 1 on mount. (Whether it should
  land on the first empty cell is a separate question; do not change it here.)
- `core/` stays runtime-free: no `@gpuix/react` import in `core/otp.ts`.
- Do not touch `core/otp.ts`'s existing edit/key rules; this plan adds one rule.

## 4. Tests — each able to fail

**Pure (`src/core/otp.test.ts`)**

1. `otpTabStop("", 6)` is `0` and `otpTabStop("12", 6)` is `2` (first empty).
2. `otpTabStop("123456", 6)` is `5` (on the last cell, never out of range) and a
   longer value is truncated to the same answer.
3. A nonsense length resolves through `otpLength` (`otpTabStop("", 0) === 0`).

**Element tree (`src/components/OTPField.test.tsx`)**

4. Exactly one cell has `tabIndex === 0`, and it is the first empty cell for a
   partial value (`"12"` → index 2). Guards the six-stops bug offline.
5. With a full value the last cell is the one stop; with a focused index the
   focused cell is the one stop; both still leave exactly one.
6. A disabled field still has no stop (the existing assertion grows to "no cell
   is `0`").

**Runtime (`runtime/otp.runtime.test.tsx`)**

7. `Tab` into the code lands on cell 1 and the **next** `Tab` leaves the field
   (measured before: it visited cells 2–6 first). Fixture:
   `[Before][OTPField][After]`, click Before, `focusNext` twice; expected
   `otp-cell-1` then `after`.
8. Typing advances the tab stop with the caret: with a partial
   `defaultValue="12"`, `Tab` enters at cell 3; one more `Tab` leaves the field
   (`after`) instead of visiting cell 4.

**Two-direction proof**

- Remove the fix (`tabIndex={disabled ? -1 : 0}`) and re-run test 7: it fails
  with the measured six-stop list in §1. Record the observed failure in §7.
- Keep the existing OTP runtime suite green (typing, arrows, Backspace, a11y,
  invalid, ring, disabled).

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run --filter @gpuixui/primitives check-types
nub run check
```

- the offline suite grows by the §4 cases; every file passes;
- the runtime suite grows from 179 to 181 tests, 16 files, exit `0` (update
  `COMPONENTS.md`'s count sentence and the plan status);
- `check` is green (tests, lint, format, types).

## 6. STOP conditions

Stop and report instead of improvising if:

- `focusNext` ignores `tabIndex = -1` for `<input>` (then the runtime cannot
  express a roving tab stop and the limitation is recorded with the probe, not
  faked);
- more than one cell must stay focusable for caret/selection behaviour to work
  (record the measured reason; do not ship a tab stop that moves under a user);
- the fix requires a new public prop or a change to another component.

## 7. Acceptance and outcome

Accepted when: one `Tab` enters the field where typing continues, the next `Tab`
leaves it, typing moves the stop with the caret, arrows/Backspace/paste-shaped
edits are unchanged, the docs state the contract, and every gate in §5 is green.

**Outcome (2026-10-17).**

- Added `otpTabStop` and the roving `tabIndex` in `renderOtpField`; no other
  behaviour changed.
- Offline: 3 pure + 3 element-tree tests added (the element tree asserts exactly
  one `tabIndex === 0` and which cell it is).
- Runtime: 2 tests added — `Tab` enters at cell 1 and leaves, and with
  `defaultValue="12"` it enters at cell 3 and leaves. Suite **16 files / 181
  tests**, exit `0`.
- Two directions: reverting the `tabIndex` expression makes the traversal test
  fail with `[otp-cell-1 … otp-cell-6, after, before]` (the §1 probe; re-measured
  after the fix as `[otp-cell-1, after, before]`).
- Docs (`docs/otp-field.mdx`) and the `COMPONENTS.md` OTP Field row now state the
  contract; `README.md` and the inventory count were refreshed 175 → 181.

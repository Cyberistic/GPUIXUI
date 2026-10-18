# 358 — A character the OTP field cannot accept erases the digit already there

**Phase:** F (input correctness) · **Workstream:** primitives · **Depends on:** 030, 041, 047, 054, 076, 089, 093 · **Status:** done

## 1. The defect (measured)

`OTPField` documents that only letters and digits are kept, and that an edit
fills forward from the cell that received it. `core/otp.ts` `applyOtpInput`
handles the "the host reported text that normalises to nothing" case as a
**deletion**:

```ts
const typed = normalizeOtp(edited, limit);
if (typed === "")
  return { value: join(withCell(cells, start, "")), focus: start };
```

But `typed === ""` has two causes, and they are not the same event:

- the host reported an **empty** edit — the user deleted the cell's character
  (Backspace, Delete, select-and-delete);
- the host reported a **non-empty** edit whose characters all belong to the
  rejected set (`-`, ` `, `.`, `+`, …) — the user typed or pasted a separator.

The second case currently clears the cell the user was editing. A code field
therefore destroys a digit when someone types the hyphen a provider printed in
the code.

Measured on this host in the real `TestRenderer` (2026-10-18), plan `358` §6:

| Setup | Action | Result before the fix |
| ----- | ------ | --------------------- |
| `<OTPField defaultValue="12" onValueChange={record} />` | click `otp-cell-2`, type `-` | `record` = `["1"]` — the `2` is gone |
| the same field | type `-` again in the now-empty cell | no further change (nothing left to erase) |

The same value reaches the runtime through the pure rule, which is where the
cause lives:

```ts
applyOtpInput("12", 1, "2-", 6) // => { value: "1", focus: 1 }
```

The host appends to a filled cell's text (measured 2026-10-17, plan 054 §9), so
typing `-` into the cell holding `2` reports `"2-"`; stripping the accumulated
prefix leaves `"-"`, which normalises to `""`, which the rule reads as a
deletion. Selecting the cell's character and typing `-` reports `"-"` directly
and takes the same branch.

This is invisible to every existing suite: `core/otp.test.ts` proves an empty
edit clears the cell (which must keep working), and the runtime suite types only
letters and digits.

The docs already promise the opposite reading — `docs/otp-field.mdx` says "Only
letters and digits are kept" and that a code is typed one character at a time —
without saying that a rejected character is destructive.

## 2. The rule, once

An edit with **no usable character** leaves the cell as it was:

| Host edit | Meaning | Result |
| --------- | ------- | ------ |
| `""` | the user deleted this cell's character | clear the cell, keep focus there (unchanged) |
| `"2-"` / `"-"` / `" "` / `"2 "` — normalises to `""` | rejected input | value and focus unchanged |
| `"7"` / `"2-"` (strip leaves `"7"`) | one usable character | replace the cell, advance (unchanged) |
| `"123-456"` from an empty cell | a multi-character insert | fill forward, advancing past the inserted run (unchanged) |

The rule lives in `applyOtpInput` only: the component already routes every edit
through it, and a second guard in `OTPField.tsx` would be a copy that can drift.

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/otp.ts` | In `applyOtpInput`, split the `typed === ""` branch: an **empty** `text` still clears the cell; a non-empty `text` that normalises to nothing returns the current value and focus at `start`. Use `Str.isNonEmpty` (already imported as `Str`). |
| `packages/primitives/src/core/otp.test.ts` | New cases: a rejected single character and a rejected accumulated report leave the value unchanged; an empty edit still clears; a mixed paste still fills. The existing "clears the edited cell … on an empty edit" case must keep passing unchanged. |
| `packages/primitives/runtime/otp.runtime.test.tsx` | New case: `defaultValue="12"`, click `otp-cell-2`, type `-`, assert `onValueChange` recorded nothing; then type `9` and assert it reports `"19"` — the field still holds `12`, so the replacement lands in the second cell. Header comment gains the bug being guarded. |
| `packages/primitives/docs/otp-field.mdx` | After "Only letters and digits are kept …", state that a character the field cannot keep leaves the cell unchanged, and adjust the keyboard row from "any character" to "any letter or digit". |
| `COMPONENTS.md` | The OTP Field row gains a **Rejected input (358)** sentence with the measurement. |
| `TODO.md` | One ticked primitives row describing the defect and the fix. |
| `.agents/slop/plans/README.md` | Index row for `358`. |

No new component, prop, state type, example or token. The change is one branch
in one pure rule plus its guard.

## 4. Implementation notes (exact)

1. `Str.isNonEmpty(text)` is the deletion discriminator, not `typed`: the host
   reports `""` for a real deletion regardless of the cell's previous content,
   and every rejected-only edit is non-empty.
2. Keep `focus: start` in both branches. A rejected character must not move the
   caret; a deletion stays where it was.
3. Return `join(cells)` — the contiguous code the field was already holding —
   not `withCell(...)`; the cell must keep its character.
4. Do not touch `normalizeOtp`, `decideOtpKey`, `apply`/`onEdit` in
   `OTPField.tsx`, or the `emptiedByEdit` flag: the Backspace double-delete
   guard (plan 054) depends on the empty-edit branch and on the *value* the
   rule returns. With the fix, a rejected character produces no edit and leaves
   `emptiedByEdit` false, which is correct — the cell was not emptied.
5. Do not add a case for typing a rejected character into an **empty** cell
   beyond the code as a new behaviour: it already produces no change; the new
   pure case may assert it for completeness (`applyOtpInput("12", 3, "-", 6)`
   keeps `"12"` and focuses cell index `2` because `start` is clamped to the
   code length).

### Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- otp` | the core OTP suite green, with the new case names; the pre-existing empty-edit case still green |
| `nub run --filter @gpuixui/primitives test:runtime -- otp` | `runtime/otp.runtime.test.tsx` green including the new case |
| `nub run --filter @gpuixui/primitives test` | baseline **591 passed** in 43 files plus the new core cases; no failures |
| `nub run --filter @gpuixui/primitives test:runtime` | baseline **536 passed** in 27 files plus the new runtime case; no failures |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run check`, `nub run lint`, `nub run test` (repo root) | exit `0` |

Record the exact counts after the run in §6; never copy the estimates.

## 5. Test plan and two-direction proof

**Offline — `src/core/otp.test.ts`:**

1. `applyOtpInput("12", 1, "2-", 6)` → `{ value: "12", focus: 1 }`. **Without
   the fix this is `{ value: "1", focus: 1 }`**, so the case fails by value.
2. `applyOtpInput("12", 1, "-", 6)` → `{ value: "12", focus: 1 }` (the
   select-and-type shape).
3. `applyOtpInput("12", 1, "2 ", 6)` → `{ value: "12", focus: 1 }` (a typed
   space, the other separator a pasted code often carries).
4. The existing `applyOtpInput("123", 1, "", 4)` → `{ value: "13", focus: 1 }`
   stays green — a real deletion still deletes.
5. `applyOtpInput("", 0, "123-456", 6)` still fills `"123456"` — a paste with
   separators still works.

**Runtime — `runtime/otp.runtime.test.tsx`:**

6. Mount `defaultValue="12"`, click `otp-cell-2`, `runtime.type("-")`:
   `field.values` is empty (no change was reported), and the next `runtime.type("9")`
   reports `"19"` — the `2` was still in cell 2 and the digit replaced it.
   Before the fix the first assertion fails because the field reported `"1"`
   (and the follow-up would report `"19"` from a field that had already lost
   the digit, which is why the two assertions belong in one case).

**Two-direction proof:** run the pure case against the pre-fix branch (the
`typed === ""` branch as shipped) and record the failure; then apply the fix
and run all three commands. The runtime case is the second, independent witness
(the component path, not just the rule).

## 6. Result (measured 2026-10-18)

- **Offline:** `nub run --filter @gpuixui/primitives test` — **593 passed** in 43
  files (baseline 591 + the 2 new cases); `check-types` exit `0`.
- **Runtime:** `nub run --filter @gpuixui/primitives test:runtime` — **537
  passed** in 27 files (baseline 536 + the new case).
- **Two-direction proof:**
  - with the old branch restored, `src/core/otp.test.ts` failed at
    `applyOtpInput("12", 1, "2-", 6)` with `value: "1"` instead of `"12"` (exit
    `1`);
  - with the old branch restored, `runtime/otp.runtime.test.tsx > keeps the
    digit when a character the field cannot keep is typed` failed with
    `AssertionError: expected [ '1' ] to strictly equal []` (1 failed |
    536 passed);
  - with the fix restored both commands are green again.
- `nub run check`, `nub run lint` and `nub run test` (repo root) exit `0`;
  `oxfmt` was run after the first check reported the new test file unformatted.

The docs, `COMPONENTS.md` and `TODO.md` now state the rule the code enforces.

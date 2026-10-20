# 752 — `OTPField`'s paste path: a measured capability the page calls unverified

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | C/F (Tier 1 truth + native evidence) |
| Owner | primitives workstream |
| Depends on | `054` (OTPField), `358` (rejected input), `360` (completion), `372` (field recipe), `583`/`590` (release runtime + tracker), playground `764` (the measured pasteboard fact) |
| Feeds | `docs/otp-field.mdx`, the OTP Field row in `COMPONENTS.md`, the runtime suite |

## 1. Goal and the defects being guarded

`OTPField` accepts a real clipboard paste today, and two shipped statements say it
does not:

1. `docs/otp-field.mdx` §Limitations — "**Paste is unverified.** `@gpuix/native`
   0.10.0 has no `onPaste` and the `TestRenderer` has no clipboard simulation …
   the real clipboard path has not been observed." The first clause is true and
   irrelevant (the paste arrives as a native `onChange`, never as `onPaste`); the
   second is false — the headless `TestRenderer` wraps the real platform, so
   `cmd-c`/`cmd-v` are delivered and use the **system pasteboard** (playground
   plan `764` §2 measured this in
   `gpui-ce/crates/gpui/src/app/visual_test_context.rs`).
2. `runtime/otp.runtime.test.tsx`'s header repeats the same claim and says the
   paste branch "is not faked with a keyboard sequence" — a real chord is
   exactly the honest path, not a fake.

The behaviour behind the claim (`applyOtpInput`'s multi-character forward fill,
one `onValueChange`, one `onComplete`, focus to the last cell) was proven **only
as a pure rule**. A 2FA form's most common gesture therefore had no native
guard: a regression in the fill, a change that reported once per character, or a
lost focus move would ship green.

This plan does not change component behaviour. It replaces a false limitation
with the measured contract and adds the native suite that holds it.

## 2. Measured evidence (this workstream, release-tag 0.10.0, 2026-10-20)

A throwaway probe (deleted) copied from a read-only `Input` with `cmd-a`,`cmd-c`,
pasted with `cmd-v` into `OTPField` (`testId="otp"`, label `"Code"`), and read
the reported values, the a11y cell values, focus and the painted rings.

| Scenario | `onValueChange` | `onComplete` | Cells | Focus |
| --- | --- | --- | --- | --- |
| copy `123456` → paste into cell 1 | `["123456"]` | `["123456"]` | `1 2 3 4 5 6` | `otp-cell-6` |
| copy `123-456` → paste into cell 1 | `["123456"]` | `["123456"]` | `1 2 3 4 5 6` | `otp-cell-6` |
| copy `12345678` → paste into cell 1 | `["123456"]` | `["123456"]` | `1 2 3 4 5 6` | `otp-cell-6` |
| full code `999999`, paste `123456` into cell 3 | `["991234"]` | `["991234"]` | `9 9 1 2 3 4` | `otp-cell-6` |
| disabled field, paste into cell 1 | `[]` | `[]` | empty | cell 1 (native click) |

The disabled row also painted **0** focus rings: `fieldRecipeStyle` only rings
`focused && !disabled`. The fields do not claim to be unfocusable by pointer.

**Pasteboard side effect.** The headless host and the real window both use the
**system** pasteboard, so running the suite replaces the user's clipboard. The
test header says so and every paste is preceded by a copy from the test's own
field, so no case depends on prior contents (the rule plan `764` established).

## 3. Files (exact)

| File | Change |
| --- | --- |
| `packages/primitives/runtime/otp-paste.runtime.test.tsx` | **create** — the five cases in §6, a header that states the bug guarded and the pasteboard side effect |
| `packages/primitives/runtime/otp.runtime.test.tsx` | edit the header only: delete "Not proven here" and point at the paste suite |
| `packages/primitives/docs/otp-field.mdx` | §Code handling gains the measured paste contract; §Limitations loses the false bullet and keeps the real ones; §Verification names the new file |
| `COMPONENTS.md` | the OTP Field row: replace "**No `onPaste`** and no clipboard simulation … proven only as a pure rule" with the measured paste contract; the runtime-suite count `**70 files**` becomes `**71 files**` (two occurrences: the prose paragraph and the count guard's second sentence) |
| `packages/primitives/README.md` | "The runtime suite is **70 test files**" becomes **71** |
| `TODO.md` | append a correction to the `054` row, add a ticked row for this plan, and bump the primitives counter `171/171` → `172/172` |
| `.agents/slop/plans/README.md` | add the plan `752` row |

No component source changes. `applyOtpInput`, `OTPField.tsx` and the docs'
keyboard table are already correct.

## 4. Commands and expected results

Run from `packages/primitives` (the scoped form, plan `700`: a space, never
`-- --run`):

| Command | Expected |
| --- | --- |
| `nub run test:runtime runtime/otp-paste.runtime.test.tsx` | 1 file, 5 tests, exit `0` |
| `nub run test:runtime runtime/otp.runtime.test.tsx` | 1 file, 13 tests, exit `0` (unchanged) |
| `nub run test src/docs-counts.test.ts` | 5 tests, exit `0` (the file counts agree) |
| `nub run test src/runtime-hygiene.test.ts` | 3 tests, exit `0` (the new suite has a header) |
| `nub run test src/contract.test.ts src/docs-keyboard.test.ts` | exit `0` (no page-contract drift) |
| `nub run test` | 72 test files, all passing |
| `nub run check-types` | exit `0` |

Offline file count: 71 before this plan (README) → 72 only if a new **offline**
file is added; an existing offline file may host a docs assertion instead. The
runtime count goes 70 → 71 and both documents must say so.

## 5. STOP conditions

- Stop and report if the paste no longer fills the code in this worktree (the
  page must then keep a **measured** limitation, not the corrected claim).
- Stop if `nub run test:runtime runtime/otp-paste.runtime.test.tsx` needs a
  second file or a harness change: the paste is delivered through the existing
  `type`/`simulateKeystrokes` path, so a harness change means the premise is
  wrong.
- Do not weaken an assertion to match the runtime. If a case measures something
  different from §2, record the measured value in the plan and assert **that**
  (the plan-`156` precedent), keeping a check that names the intended rule.

## 6. Test plan (the new suite)

Header comment must state: the bug guarded (the false limitation and the
unproven paste path), the measured contract, and the pasteboard side effect.

| # | Case | Asserts |
| --- | --- | --- |
| 1 | a real paste fills the code as **one** change | values `["123456"]`, complete `["123456"]`, six cells `1…6`, focus `otp-cell-6` |
| 2 | a pasted separator is dropped | values `["123456"]`, complete `["123456"]` for a copied `123-456` |
| 3 | a paste longer than the code truncates | values `["123456"]` for a copied `12345678` |
| 4 | a paste into a full code fills forward from the receiving cell | `defaultValue="999999"`, paste into cell 3 → values `["991234"]`, complete `["991234"]`, cells `9 9 1 2 3 4` |
| 5 | a disabled field refuses a paste | values `[]`, complete `[]`, every cell empty, 0 focus rings |

Each case copies from its own read-only `Input` (`testId="source"`) with
`cmd-a`/`cmd-c` and pastes with `cmd-v` after clicking the target cell, so the
clipboard content is always the case's own.

**Failing directions (measure all three, record the output in §8 below):**

1. Make `applyOtpInput` accept only the first character of a multi-character
   edit → cases 1–4 fail on the code they report.
2. Remove the `onComplete` call in `apply` → cases 1–4 fail on `complete`.
3. Drop the `readOnly` guard on a disabled cell (e.g. render `readOnly={false}`)
   → case 5 reports a change and its empty-cell assertions fail.

## 7. Acceptance criteria

- A reader of `docs/otp-field.mdx` learns that paste works, what it does to
  separators and length, where it fills from, and that a disabled field refuses
  it — with no claim that the runtime cannot do it.
- `COMPONENTS.md`'s OTP row states the measured paste contract; both runtime
  counts are true.
- The five cases fail under each mutation in §6 and pass on the shipped code.
- `nub run test`, `nub run check-types` and `nub run lint` pass; the scoped
  runtime file was run in this workstream, and its id (`otp-paste`) is recorded
  in `TODO.md`.

## 8. Outcome

_Landed 2026-10-20._ Five cases, all green. The failing directions were measured:

1. `applyOtpInput` taking only the first character of a multi-character edit —
   cases 1–4 fail on the reported code (case 5 passes, it never edits).
2. The `onComplete` call removed from `apply` — cases 1–4 fail on `complete`.
3. Removing **both** disabled guards (`readOnly` and the `onChange` guard) —
   case 5 fails with a reported change. Removing `readOnly` alone does **not**
   fail: the handler guard is the second layer, which is why the case asserts
   both the empty cells and the zero rings.

Offline suite 71 files (no new offline file); runtime suite 70 → 71 files;
`src/docs-counts.test.ts`, `src/runtime-hygiene.test.ts`, `src/contract.test.ts`
and `src/docs-keyboard.test.ts` stay green. The scoped runtime id is
`otp-paste` (`runtime/otp-paste.runtime.test.tsx`, 5/5).

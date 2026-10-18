# 360 — `OTPField.onComplete`'s documented contract is wrong

**Bug guarded.** The prop is documented as firing *once*, when a code *becomes*
full — `OTPField.tsx` says "Called once when an edit makes the code complete"
and `docs/otp-field.mdx` says "fires when an edit makes the code full". Measured
on 0.10.0, 2026-10-18: a **correction inside an already full code** fires it
again:

```tsx
<OTPField defaultValue="123456" onValueChange={…} onComplete={…} />
// click cell 3, type "9"
// onValueChange: ["129456"]   onComplete: ["129456"]
```

That behaviour is the **useful** one: the docs' own usage snippet is
`onComplete={(complete) => verify(complete)}`, and a user who fixes a mistyped
digit must have the corrected code verified. A transition-only callback would
silently never re-verify unless the user first cleared a cell. The defect is the
**claim**, not the code (the same class as plans `087`, `338`, `342`).

## 1. Change

1. `packages/primitives/src/components/OTPField.tsx` — the `onComplete` JSDoc:
   "Called after an edit that leaves the code full, with the new code — so a
   corrected digit is verified again. It is not called for an edit that leaves
   the code incomplete."
2. `packages/primitives/docs/otp-field.mdx` — the prop table row says the same,
   and the page states the reason (a corrected digit must re-verify) next to the
   value table.
3. `COMPONENTS.md` — the OTP Field row gains the plan `360` note.

No behaviour changes. This is a truth fix plus the guard the promise lacked.

## 2. Test plan (the guard)

`packages/primitives/runtime/otp.runtime.test.tsx` — one new case:

- mount `defaultValue="123456"` with both recorders;
- click cell 3, type `9` → `onValueChange` `["129456"]`, `onComplete`
  `["129456"]` (the corrected code is reported);
- Backspace on cell 3 → the code is `"12456"`, `onComplete` unchanged;
- type `7` → the code is `"127456"`, `onComplete` ends `[…, "127456"]`.

The test can fail in the direction this plan rejects: implement
transition-only completion (`edit.value.length === limit` **and** the previous
value was shorter) and the second assertion fails. Prove that, then restore.

## 3. Commands and expected results

```sh
cd packages/primitives
nub run test:runtime      # 28 files; the OTP file gains one case (552 → 553)
nub run test              # 43 files, unchanged 601
cd ../..
nub run check             # green
```

## 4. STOP conditions

- Stop if the measured behaviour differs from the probe above — re-measure and
  report rather than writing the claim.
- Do not change `onComplete` to transition-only: that removes re-verification
  and is a product decision, not a wording fix.

## 5. Acceptance

- No document says the callback fires "once" or only on becoming full.
- The guard proves a corrected full code is reported again, and fails under a
  transition-only implementation.
- `COMPONENTS.md`, `TODO.md` and the plan index record the plan.

## 6. Measured (2026-10-18)

- The new case passes against the shipped behaviour: `129456` then `129856` are
  reported, and the backspace that shortens the code reports nothing.
- The rejected transition-only implementation
  (`edit.value.length === limit && state.value.current.length < limit`) fails
  the case with `[]` instead of `["129456"]`; it was reverted.
- Runtime suite: the OTP file is 13 cases (12 before); the full suite is
  **553 tests in 28 files**.

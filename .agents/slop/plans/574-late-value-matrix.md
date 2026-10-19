# 574 — The late-value contract, proven on every controlled part

| Field | Value |
| ----- | ----- |
| Status | **done** — implementation and both measurement directions below |
| Phase | F (cross-control hardening) |
| Owner | primitives workstream (`packages/primitives`) |
| Depends on | `324` (the per-render controlled rule), `041` (the native harness), `089`/`093` (the matrix precedent), `502` (the selection family) |
| Sources | `packages/primitives/src/core/state.ts`, `packages/primitives/runtime/` |
| Produces | `packages/primitives/runtime/late-value.runtime.test.tsx` (12 cases), refreshed ledger numbers |

---

## 1. The defect this closes

Plan `324` fixed a real shipped bug: the shared controlled rule froze its mode at
mount, so a parent that loaded its record later (`value={data?.name}`) was
ignored. The fix lives in one place, `withValue` in `src/core/state.ts`, and is
shared by **fourteen** parts.

The evidence for the fix, however, covers **two** of them: plan `324` measured
`Input` (typing after a late value reports `"loadedx"`) and `Checkbox` (the
announcement flips `"unchecked" → "checked"`). Plans `325`/`326` added one part,
`NumberField`. The other eleven controlled parts have no measurement of the
contract at all, so a part that kept a private copy of an initial value would
still pass its own suite.

That is the class the repo has repeatedly guarded across controls (activation
`354`, pointer feedback `361`, invalid `351`, tab order `089`, names `093`):
one rule, one owner, many consumers, and a matrix that fails when one consumer
stops honouring it.

## 2. What was measured before writing the guard

A probe mounted each remaining part uncontrolled, re-rendered the same tree with
a value, and read the accessibility tree:

| Part | First render | Re-render | Observed after re-render |
| ---- | ------------ | --------- | ------------------------ |
| `Switch` | off | `checked` | `checked` |
| `Toggle` | unpressed | `pressed` | `pressed` |
| `RadioGroup` | no value | `value="b"` | Beta `checked` |
| `ToggleGroup` | no value | `value="b"` | Right `pressed` |
| `CheckboxGroup` | no value | `value={["b"]}` | Beta `checked` |
| `Rating` | no value | `value={3}` | stars 1–3 `checked`, 4–5 `unchecked` |
| `Slider` | no value | `value={70}` | `aria-valuetext` `70` |
| `RangeSlider` | no value | `[30, 70]` | thumbs `30` / `70` |
| `OTPField` | empty | `value="12"` | cells `1`, `2`, rest empty |
| `NumberField` | empty | `value={42}` | field value `42` |
| `TextArea` | empty | `value="loaded"` | typing `x` reports `loadedx` |
| `Select` | placeholder | `value="b"` | combobox value `Beta` |

The contract is currently honoured by all twelve. The matrix is therefore a
**regression guard**, not a bug fix; its value is that it fails by part name if
any one of them regresses.

## 3. Files

Create:

- `packages/primitives/runtime/late-value.runtime.test.tsx` — the matrix. Header
  comment names the class (plan `324`) and states that each case mounts
  uncontrolled, re-renders with a value, and reads the accessibility tree, not a
  prop.

Change:

- `packages/primitives/README.md` — the offline and live suite counts, and the
  example sentence that said "fourteen realistic compositions" while the
  registry had sixteen entries (`fifteen compositions plus the icon set`). Do
  **not** reintroduce a raw count for examples: plan `357` removed the icon
  page's stale count for the same reason, and `src/example-coverage.test.ts`
  already owns "every public component has an example". Say the registry covers
  every public component and name the guard.
- `COMPONENTS.md` — the leading sentence of the `Runtime (041)` measurement
  paragraph (the one that begins "657 tests in 41 files at plan `391`") and its
  dated re-run.
- `TODO.md` — the live-suite row's latest measurement (append one dated line;
  never re-baseline an assertion).
- `.agents/slop/plans/README.md` — index this plan.

## 4. Steps (exact)

1. Create the matrix with one `it` per part above. Every case uses a fresh
   `openWindow()` (the harness dispatches input to the window it rendered last),
   `runtime.render` of a `<Surface>`, `flush`, then a second `render` of the same
   part with the value, `flush`, and asserts on `a11yValueOf` / `a11yNodes`.
   Use the exact labels and expectations from §2.
2. Run the file:

   ```sh
   cd packages/primitives
   nub run test:runtime runtime/late-value.runtime.test.tsx
   ```

   Expected: `1` file, `12` tests, all passing.
3. Prove the failure direction — temporarily freeze the mode in
   `withValue`:

   ```ts
   // mutation only, never committed
   if (state.mode === "uncontrolled") return state;
   ```

   Re-run the command. Expected: **12 failed** cases, each naming its part.
   Restore `withValue` exactly as it was and re-run: `12` passing.
4. Run the package's offline suites and the gates:

   ```sh
   cd packages/primitives && nub run test
   cd ../.. && nub run check
   ```

   Expected: offline green; `check` green.
5. Record the measured numbers in §5, then update `README.md`, `COMPONENTS.md`
   and the `TODO.md` row to those numbers.

## 5. Measured results

- Scope probe (before the guard): **12/12** parts honoured a late value.
- New file: **12 tests, 12 passing**.
- Failure direction: with `withValue` frozen at mount, **12/12 fail**; restoring
  it returns to **12/12**.
- Offline suite after the guard: **51 files, 734 tests, all passing** (the
  runtime suite is separate and is not part of `nub run test`).
- Live suite after the guard (same artifact, same host): **46 files, 700 tests,
  589 passed / 111 failed**, the same 19 failing files as the pre-guard run —
  plan `529`'s artifact delta; no assertion was changed.

## 6. STOP conditions

Stop and report, do not improvise, if:

- any of the twelve cases fails on the unmodified tree — that is a real
  regression; record the measured readout and do not weaken the assertion;
- the mutation does **not** fail the matrix — the guard is not testing the
  shared rule; inspect which part bypasses `useControlState`;
- the live suite's failing-file set or count changes beyond the added file —
  do not re-baseline it; report the delta with the artifact provenance;
- a gate (`check`, `lint`, `test`) fails for a reason outside
  `packages/primitives` — record it and stop.

## 7. Acceptance

- `runtime/late-value.runtime.test.tsx` exists, has a header comment, and
  covers the twelve parts above.
- `nub run test:runtime runtime/late-value.runtime.test.tsx` → `12 passed`.
- The mutation makes all twelve fail; the restored file passes.
- `nub run check` and the package's offline `test` are green.
- The ledger numbers in `README.md`, `COMPONENTS.md` and `TODO.md` match the
  runs in §5; the stale "fourteen compositions" claim is gone.

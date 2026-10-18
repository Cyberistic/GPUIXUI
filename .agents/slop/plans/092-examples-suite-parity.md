# 092 — The examples suite must mount every registered example

| Field | Value |
| ----- | ----- |
| Phase | F (hardening) |
| Owner | primitives workstream |
| Depends on | `047`, `041`, `040` |
| Status | **done** — 12/12 examples recorded and mounted, registry parity guarded in both directions (§7) |

Self-contained: §1 the gap, §2 the rule, §3 the files, §4 commands, §5 the test
plan, §6 STOP conditions, §7 outcome, §8 acceptance.

---

## 1. The gap

`packages/primitives/runtime/examples.runtime.test.tsx` opens with a test named:

> `it("mounts every registered example and paints its headline")`

It iterates a hand-written `SCREENS` list. The registry
(`packages/primitives/examples/index.ts`) has **12** entries; `SCREENS` has
**10**. `rating` and `toggle` are absent from the list. They are mounted by
their own interaction tests and never by the "every example" test, so:

- the test's name is false (it does not mount every registered example);
- the dark-palette test (`paints every example from the dark palette`) also
  iterates `SCREENS`, so the rating and toggle examples are never painted from
  the dark palette;
- adding a 13th example to the registry needs no change to `SCREENS` and
  silently escapes both checks.

Plan `047` §8 states the intent this drifted from:

> every registered example mounts and paints its headline

The two examples are `Box tone="card"` roots
(`testId="rating-example"` / `"toggle-example"`, headlines "Rate this release"
and "Canvas toolbar"), so the dark assertion (`backgroundColor === card`) is
valid for them.

## 2. The rule

**The registry is the list.** The screen table is a per-example annotation
(headline and root test id), and a guard proves it has exactly one entry per
registry id. The first test then really mounts every example, and the theme pass
covers the same set.

No production component changes.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/runtime/examples.runtime.test.tsx` | add the `rating` and `toggle` screen records; add a registry-parity test (both directions: a missing record and an extra record) |
| `COMPONENTS.md` | update the runtime suite count (264 → 265) and the plan reference list |
| `TODO.md` | add and tick the task under the primitives ledger |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/092-examples-suite-parity.md` | §7 after the run |

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `cd packages/primitives && ./node_modules/.bin/vitest run --config vitest.runtime.config.ts runtime/examples.runtime.test.tsx` | before: the new parity test fails (when a record is removed for the proof); after: all pass |
| `nub run --filter @gpuixui/primitives test` | 38 files / 433 tests pass (unchanged) |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

The full `test:runtime` suite is not re-run for a test-only change; the one
changed file is run directly (the 264-test full run that preceded this plan is
recorded in plan `091` §7). If the changed file fails, STOP.

## 5. Test plan

1. **"records a screen for every registered example"** — flatten
   `R.keys(examples)` and `SCREENS`; expect the sorted id lists to be equal.
   Fails if an example is added without a record, or a record outlives its
   example.
2. The existing "mounts every registered example" test now covers all 12,
   because `SCREENS` contains all 12.
3. The existing dark-palette test now paints all 12 from `testThemeDark`.
4. **Both directions for the parity test:**
   - delete `{ id: "toggle", ... }` from `SCREENS` → test 1 fails by id;
   - add `{ id: "gone", ... }` → test 1 fails by id;
   - restore → test 1 passes.
   Record the exact output in §7.

No new assertion is added to the interaction tests; they already mount the two
examples and prove their behaviour.

## 6. STOP conditions

1. The runtime binding cannot load (`MissingNativeBindingError`).
2. Either example's root is not `colors.card` in the dark theme (then the dark
   pass needs a per-example expected role, and the design question is recorded
   instead of guessed).
3. The changed file fails for a reason outside this plan.

## 7. Outcome

### Before

`SCREENS` had 10 entries for 12 registry entries. The rating and toggle
examples were only mounted by their own interaction tests, so the test named
"mounts every registered example" did not, and neither example was painted from
the dark palette.

### Both directions (measured)

With `{ id: "toggle", ... }` deleted from `SCREENS`:

```text
× records a screen for every registered example
AssertionError: expected [ 'feedback', 'form', 'icons', …(9) ]
  to deeply equal [ 'feedback', 'form', 'icons', …(8) ]
Tests  1 failed | 14 passed (15)
```

With an extra `{ id: "gone", ... }` record:

```text
× records a screen for every registered example
× mounts every registered example and paints its headline   (no registry entry)
× paints every example from the dark palette                (no registry entry)
Tests  3 failed | 12 passed (15)
```

With the records restored: **15/15 pass** in
`runtime/examples.runtime.test.tsx` (11.3 s). The full runtime suite was not
re-run for a test-only change; the preceding full run is plan `091` §7
(264/264). The registry-parity test makes the first test's name true and keeps
it true for the next example.

## 8. Acceptance

- [x] `SCREENS` covers all 12 registry entries.
- [x] A registry/`SCREENS` drift fails a test in both directions.
- [x] The examples runtime file passes (15/15); `check`, `lint` and `test` pass.
- [x] `COMPONENTS.md`, `TODO.md` and the plan index are updated.

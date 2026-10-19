# 608 — The composed-app ledger still records two disproved claims

| Field | Value |
| ----- | ----- |
| Phase | F (documentation truth / integration) |
| Owner | primitives workstream |
| Depends on | `327`, `529`, `584`, `597`, `598` |
| Status | done |

Self-contained: §0 the measured starting point, §1 the decision and scope,
§2 the exact changes, §3 the commands, §4 the test plan and both-direction
proof, §5 STOP conditions, §6 the outcome, §7 acceptance.

---

## 0. What is true before this plan (measured 2026-10-19)

Two ledger passages describe the composed Tier 1 app as it stood **before**
plans `584` and `598`:

- `COMPONENTS.md` §"Composed app (327)" says the app suite has **6 tests**, and
  ends with: *"One measured limitation is recorded in the app's README: a field
  mounted after the first render does not receive `autoFocus` … so `autoFocus`
  is proven on the initial mount only (plan `064`)."*
- `examples/basic-app/README.md` says *"On this host 6 of the 7 pass; the
  reachability assertion is short by the published box model of the release-tag
  binding (plan `529` §6.5), not by a component change."*

Both are false now, and both were disproved by measurements this workstream
already recorded:

- Plan `584` measured that `Input`, a controlled `Input`, `TextArea`, `OTPField`
  and `NumberField` all take `autoFocus` when mounted **after** the first render.
  Plan `327`'s empty `runtime.focused()` was a locator artifact: the app's field
  had no `testId`, and `runtime.focused()` names the focused element's `testId`.
  The app's first field now takes focus after the skeleton, and the seven-case
  matrix proves it.
- Plan `598` measured that a scroller's own reported box slides with its offset
  and made `paintBounds` its visible box. The app's consent-row reachability case
  was then **7/7**. The stale sentence still blames the published box model for a
  failure that no longer exists.

The suite is seven cases, not six. Measured now:

```sh
nub run --filter @gpuixui/basic-app test:runtime
```

```text
Test Files  1 passed (1)
     Tests  7 passed (7)
```

The runtime file has exactly seven `it(...)` cases:
`mounts the composed workflow after the skeleton`, `focuses the first field when
the form replaces the skeleton`, `paints the consent copy the user has to agree
to`, `reaches the consent row, refuses Save, then saves once accepted`, `keeps
Save refused while the email is invalid`, `Reset restores the form, not only the
palette`, and `paints the Select's option label, not its value`.

This is a documentation defect, not a component defect: the code and its
evidence are correct; the ledger that another agent reads to decide what is done
is wrong. It is in this workstream's paths (`COMPONENTS.md` is the inventory
every primitives plan updates, and `examples/basic-app` is recorded as the
primitives workstream's in `TODO.md`).

## 1. The decision

**Correct both passages to the measured state, and add one guard that fails
when either false claim returns or when the stated case count drifts from the
real runtime file.**

- `COMPONENTS.md` states **7 tests**, records the `autoFocus` truth (plan `584`
  and the locator explanation), and records the **7/7** reachability result
  (plan `598`).
- `examples/basic-app/README.md` states that **all 7 pass** and explains that the
  earlier reachability failure was the scroller's reported box, not the app or a
  component change.
- A new offline test reads the runtime suite, counts its cases, and holds both
  documents to that count and to the absence of the two disproved claims. It is
  the same shape as `src/docs-counts.test.ts` (plan `588`) and
  `src/capabilities.test.ts` (plan `203`): a prose claim that no run can keep
  true is guarded by a test that reads the source of truth.

Alternatives rejected:

- **Delete the passages.** The composed app is real evidence and the autoFocus
  history is the kind of measured fact the inventory exists to preserve.
- **Update only `COMPONENTS.md`.** The app README is where a reader of the
  example learns what is verified; it carries the same false 6/7 claim.
- **Add a prose-only note.** The previous two regressions were exactly prose
  that drifted from a later plan, so the fix needs a guard.

## 2. The exact changes

### 2.1 `COMPONENTS.md` — the "Composed app (327)" paragraph

Change the opening from `(…, 6 tests)` to `(…, 7 tests)`.

Replace the final two sentences:

```text
One measured limitation is recorded in the app's
README: a field mounted after the first render does not receive `autoFocus`
(`runtime.focused()` was empty after the skeleton), so `autoFocus` is proven on
the initial mount only (plan `064`).
```

with:

```text
The first field takes `autoFocus` after the skeleton: measured, a field mounted
after the first render **does** take native focus (plan `584`); plan `327`'s
empty `runtime.focused()` was a locator artifact, not a runtime limitation. On
the release-tag build the suite is **7/7**, including the consent row's
reachability after a real wheel (plan `598`).
```

Keep every other sentence (the consent-row rationale and the plan `087`
reference are still true).

### 2.2 `examples/basic-app/README.md` — the verified table row

Replace:

```text
On this host 6 of the 7 pass; the reachability assertion is short by the
published box model of the release-tag binding (plan `529` §6.5), not by a
component change.
```

with:

```text
On this host all 7 pass, including the consent row's reachability after a real
wheel (plan `598`). The earlier reachability failure was the scroller's own
reported box — it slides with the scroll offset — not the app or a component
change (plan `529` §6.5 measured the model; plan `598` corrected the reader).
```

The sentence just above already says the runtime grants `autoFocus` after a
later mount and credits plan `584`; leave it unchanged.

### 2.3 `packages/primitives/src/composed-app-docs.test.ts` — new guard

Create the file with this header and cases:

```ts
/**
 * The composed-app ledger must match its suite (plan `608`).
 *
 * The bug this guards: `COMPONENTS.md` and `examples/basic-app/README.md` kept
 * two claims that later measurements disproved — that the suite had 6 tests,
 * that a field mounted after the first render cannot take `autoFocus` (plan
 * `584`), and that only 6 of 7 cases pass because of the published box model
 * (plan `598` made it 7/7). A reader uses these passages to decide what is
 * done, so a stale claim is a real defect in the ledger.
 */
```

The file reads, with `@effect/platform-node`'s `NodeFileSystem`/`NodePath` and
`Effect`, exactly as `src/docs-counts.test.ts` does:

- `examples/basic-app/runtime/app.runtime.test.tsx`;
- `examples/basic-app/README.md`;
- `COMPONENTS.md`.

It exposes one derived record `{ cases, readme, components }` where `cases` is
the number of lines matching `/^it\(/m`-style case declarations in the runtime
file (the file declares each case as `it("…", async () => {` at column 1).

Four cases:

1. **The README states the real case count.** The verified row contains
   `` `(${cases} cases)` ``. Fails with a message naming the count to write.
2. **The inventory states the real case count.** The "Composed app (327)"
   paragraph — extracted from `**Composed app (327):**` to the next blank line —
   contains `` `${cases} tests` ``.
3. **Neither document repeats the disproved `autoFocus` claim.** The two scoped
   passages (the inventory paragraph above; the README paragraph starting
   "One measured fact") must not match
   `/does not receive\s+`?autoFocus|initial mount only/i`; the inventory
   passage must name `plan \`584\``.
4. **Neither document claims a partial pass.** The README verified row must not
   match `/\b[1-9]\d* of the \d+ pass\b/` unless the first number equals the
   second; the inventory paragraph must not contain `6 of the 7`.

Every case must be able to fail: case 1 fails when the README says 6 cases; case
2 fails when `COMPONENTS.md` says 6 tests; case 3 fails when the old autoFocus
sentence returns; case 4 fails when `6 of the 7` returns. The proof in §4
measures all four directions.

No production code changes. Exports, props, runtime behaviour and the docs
pages are untouched.

## 3. The commands

Run from the repository root (`/Users/cyberistic/GPUIXUI/workspaces/primitives`):

```sh
# 1. The new guard alone.
nub run --filter @gpuixui/primitives test src/composed-app-docs.test.ts

# 2. The package's offline suite.
nub run --filter @gpuixui/primitives test

# 3. The app's real runtime suite (the number the ledger now states).
nub run --filter @gpuixui/basic-app test:runtime

# 4. The completion gate.
nub run check
nub run lint
nub run test
```

Expected:

1. `1 file / 4 tests` pass after the edits.
2. `60 files` pass with `837` tests (was `833`; the new file adds 4 cases).
3. `1 file / 7 tests` pass (**7/7**), as measured in §0.
4. `check` green (check-tests, lint, fmt, types), `lint` green, `test` green.

## 4. The test plan and the two-direction proof

The guard must fail **before** the edits and pass **after** them. Prove both
directions on the same tree:

```sh
# 1. Before: the guard is not yet written, so build it against the OLD prose.
#    Temporarily restore the old sentences in a scratch copy, or run the new
#    test after only writing the test file (the old prose is still in the docs).
nub run --filter @gpuixui/primitives test src/composed-app-docs.test.ts
# Expected: the count cases and the autoFocus/partial-pass cases fail by name.

# 2. Apply §2.1 and §2.2.
nub run --filter @gpuixui/primitives test src/composed-app-docs.test.ts
# Expected: 4/4 pass.

# 3. Mutate one claim at a time and observe the right case fail:
#    - change "7 tests" back to "6 tests"  -> case 1 fails
#    - add "does not receive `autoFocus`" to the inventory paragraph -> case 2 fails
#    - add the same claim to the README note -> case 3 fails
#    - change "all 7 pass" to "6 of the 7 pass" -> case 4 fails
#    Restore the corrected text after each mutation.
```

A case that cannot fail is not a guard: the chosen assertions read the exact
claims that were wrong, not a vibe. The runtime count is derived from the suite
file, so adding an eighth case without updating the ledger fails case 1 and 2.

## 5. STOP conditions

Stop and report rather than improvise if:

- `examples/basic-app/runtime/app.runtime.test.tsx` no longer has seven `it(`
  cases, or the runtime suite does not pass 7/7 on this host. The prose must
  describe the measured suite; do not write a count the run did not produce.
- The "Composed app (327)" paragraph or the README verified row cannot be
  located by the scoped patterns. Fix the scope in the test, not the meaning of
  the claim.
- Any of the four gate commands fails for a reason unrelated to this change.
  Report the failure; do not weaken an assertion to get green.

## 6. The outcome (2026-10-19)

- `COMPONENTS.md` now states **7 tests**, records the plan `584` `autoFocus`
  truth and the plan `598` **7/7** reachability result.
- `examples/basic-app/README.md` now states **all 7 pass** and explains the
  earlier failure as the scroller's reported box.
- `packages/primitives/src/composed-app-docs.test.ts` holds both passages to the
  real suite: the case count, the absence of the disproved limitation, and the
  absence of a partial-pass claim.
- Measured:
  `nub run --filter @gpuixui/basic-app test:runtime` → **7/7**;
  `nub run --filter @gpuixui/primitives test` → **60 files / 837 tests**;
  `nub run check`, `nub run lint` and `nub run test` green.
- Both directions: with the old prose, the new guard fails the count, the
  inventory autoFocus, the README autoFocus and the partial-pass cases; with the
  corrected prose, 4/4 pass. Each of the four mutations in §4 was applied once
  and failed its case by name.

## 7. Acceptance

- The two documents contain no claim that the composed app has six cases, cannot
  focus a field mounted after the first render, or passes only six of seven.
- The new test fails against the old prose and passes against the corrected
  prose, in both directions, with the count derived from the real suite.
- The completion gate (§3, command 4) is green.

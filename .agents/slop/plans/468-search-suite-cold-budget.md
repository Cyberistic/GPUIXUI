# 468 — The search suite stops timing out on a cold, loaded host

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 419, 431, 442 (the search contract), 439 (the release gate)

## 1. Why

`apps/docs/src/lib/search.test.ts` builds the Fumadocs index for every page on
its first query. The 30 s budget added by plan 463 is enough when the file runs
alone, and not enough when the other 41 files run in parallel with it.

Measured 2026-10-18 in a fresh worktree at `origin/agent/docs-site`
(`nub install --frozen-lockfile`):

| Run | Budget | Result |
| --- | ------ | ------ |
| `vitest run src/lib/search.test.ts` alone | 30 s | 18/18 pass, 23.8 s |
| `nub run --filter docs test` (42 files) | 30 s | 2 fail — `Test timed out in 30000ms` |
| `nub run --filter docs test` (42 files) | 120 s | 42 files / 260 tests pass |

The suite was red for a timing threshold, not for a search defect: the same
assertions pass in isolation. A red release gate that depends on host load is
not a gate.

## 2. What changes

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/search.test.ts` | The `describe` budget is 120 000 ms, with the two measurements in the comment. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Tick the row. |

No assertion changes. The budget is the only knob; the tests still fail on a
wrong result or a real hang.

## 3. Test plan (both directions)

1. At 30 000 ms, the full suite fails with `Test timed out in 30000ms` on
   `returns the matching page for a title query` and `finds a component page
   from any page's search` (measured above).
2. At 120 000 ms, the same cold worktree passes 42 files / 260 tests.
3. The assertions are untouched, so a broken rank, a dropped dedupe or an
   unindexed registry still fails — the existing plan 431 proofs cover them.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 42 files / 260 tests, exit 0 |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run check` / `nub run lint` | exit 0 |

## 5. STOP conditions

- The file still exceeds 120 s on an idle host: stop and report the measured
  time; do not raise the budget again. That would be an index defect, not a
  test-budget one.
- A search assertion changes: this plan does not change what the tests check.

## 6. Acceptance

- The full docs suite is green on a cold worktree, and the 30 s failure is
  recorded with its exact message.
- No assertion, index or ranking code changed.

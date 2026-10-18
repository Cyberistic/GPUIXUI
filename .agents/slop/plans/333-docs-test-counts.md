# 333 — Docs truth: a stated native-test count must match the suite

**Phase:** F (docs truth pass) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 117, 139, 330–332.

**Status when written:** 27 docs pages state their native behaviour test count
in the sentence `` `src/behaviour/<file>` runs in the real GPUix renderer (N
tests) ``. Nothing checks those numbers. One already lies: `docs/field.mdx` says
5 while `src/behaviour/field.test.tsx` has 6 cases (the disabled case is
missing from the prose).

## 1. The defect

`COMPONENTS.md` counts are checked by `src/inventory.test.ts` against the
behaviour suites, so the inventory cannot drift. The docs pages repeat the same
number in prose with no check, and `Field` has already drifted. A reader trusts
the docs page's "Verification" section, and it advertises one fewer test than
the suite runs.

## 2. The rule

> When a docs page states a native behaviour test count next to the suite file,
> that number is the suite's real `^  it(` case count. A page that does not
> state a count is out of scope — this plan does not force every page to adopt
> the sentence.

The check lives beside the existing inventory count check, so the convention and
the counter are shared.

## 3. Exact changes

### 3.1 `packages/components/src/inventory.test.ts`

Add one case in the "component inventory" describe, after "states the real
native test count in every done row":

```
it("states the real native test count in every docs verification line", ...)
```

- Pattern: ``/`src\/behaviour\/([^`]+)` runs in the real GPUix renderer \((\d+) tests?\)/g``
- For each inventory record, read `meta.docs` (relative to the package root) and
  `Arr.fromIterable` the `matchAll` iterator.
- `Arr.filterMap` the matches to a problem string when the claimed number and
  `countBehaviourTests("src/behaviour/" + file)` disagree.
- `expect(problems).toEqual([])`.

Use the existing `countBehaviourTests`, `fileURLToPath`, `readFileSync` and
`Option` imports; no new dependency.

### 3.2 `packages/components/docs/field.mdx`

Change "(5 tests)" to "(6 tests)" and add the missing case to the sentence: the
disabled state (read-only, out of the tab order).

### 3.3 Nothing else

No source change, no behaviour change, no inventory count change. Pages that
state the count in a different sentence are left alone.

## 4. Test plan

1. The new case itself is the test. Before 3.2 it **must fail** with
   `Field: field.test.tsx says 5, suite has 6` — delete the fix (stash
   `docs/field.mdx`) to prove it, then restore.
2. `nub run --filter @gpuixui/components test` → green; unit count `334 + 1`.
3. `nub run check`, `nub run lint`, `nub run test` → green.

## 5. STOP conditions

- A page names a suite file that does not exist — STOP; a docs page pointing at
  a missing suite is a separate truth defect, report it instead of skipping.
- The regex matches a count that is not a behaviour-suite count (for example a
  logic suite) — STOP and narrow the pattern rather than loosening the check.
- Fixing a count requires rewriting the prose beyond adding a missing case —
  STOP and record the page for the docs workstream.

## 6. Acceptance

- The check fails against the old `field.mdx` and passes after the fix.
- Every stated behaviour count on the 27 pages matches its suite.
- The three repo gates pass.

## 7. Outcome

Landed on `agent/components` (2026-10-18). With `docs/field.mdx` stashed the
check reports `Inline validation: field.test.tsx says 5, suite has 6`; with the
fix the unit suite is **335** (334 + 1) and green. `nub run check`,
`nub run lint` and `nub run test` pass.

Two corrections made while landing it, both worth knowing:

- Effect v4's `Arr.filterMap` takes a **`Result`**, not an `Option`: an
  `Option.none()` is not a filter failure and the Some/None wrappers are
  discarded, so the first version could never fail. The check uses
  `Result.failVoid` / `Result.succeed`.
- A backtick inside the regex literal made `scripts/check-tests.ts`'s scanner
  read the rest of the file as a template string and report the test as
  assertion-less. The pattern matches `src/behaviour/<stem>.test.tsx` and takes
  the closing backtick with `\S*`, so it contains no backtick.


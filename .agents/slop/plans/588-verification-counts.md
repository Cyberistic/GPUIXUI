# 588 — The package README's suite counts must be true

**Phase:** F (documentation truth)
**Owner:** primitives
**Depends on:** 030, 041, 047, 583, 587
**Status:** planned

---

## 1. The defect

`packages/primitives/README.md` is the package's overview and its
"Verification status" section is the evidence a consumer reads before trusting a
`done` claim. It currently states, as a measured fact:

- offline: **53 files, 753 tests, all passing**;
- runtime: **46 files, 700 tests, 589 passing / 111 failing**, then "the next
  full run is 47 files / 707 tests".

Measured in this worktree on 2026-10-19:

```sh
cd packages/primitives
find src -name '*.test.ts' -o -name '*.test.tsx' | wc -l        # 54
find runtime -name '*.runtime.test.tsx' | wc -l                 # 49
nub run --filter @gpuixui/primitives test                       # 54 files, 788 passed
nub run --filter @gpuixui/primitives test:runtime               # 49 files, 605 passed / 112 failed
```

Plans `573`–`587` added tests (and `584`'s runtime file) without refreshing the
paragraph. A stale count is a false evidence claim, and the next plan will
stale it again. The fix has two halves:

1. **The prose stops carrying a number that cannot be kept true by a guard.**
   Keep the **file** counts, which are exact and cheap to verify; drop the
   **test**, **passing** and **failing** counts, which only a full run knows.
   Point at the plan index / `TODO.md` for the latest run instead.
2. **A test holds the remaining counts to the filesystem**, so adding a test
   file without updating the README fails by name.

This is the same documentation-truth class as plans `027`, `333`, `349`, `396`,
`583` and `586`: a claim a reader will act on, guarded by a test that reads the
real files.

## 2. Exact changes

### 2.1 `packages/primitives/README.md`

In **Verification status**:

- Replace `Measured 2026-10-19: **53 files, 753 tests, all passing**` with
  `Measured 2026-10-19: the offline suite is **54 test files**, all passing`.
- Replace the runtime sentence
  `Measured 2026-10-19 on this host: **46 files, 700 tests, 589 passing / 111 failing**; plan 584 adds ... so the next full run is 47 files / 707 tests.`
  with
  `The runtime suite is **49 test files**.` and keep the existing explanation of
  the two measured failure classes (release build delivers no focus events;
  absolute geometry is short by the published box model). End that sentence with
  `The latest run's totals live in TODO.md's live-suite row and plan 583, not
  here: a prose count cannot be held true by a test.`
- Do not change any other claim in the file.

**The guard counts the file after it exists**, so the README value is **55**
offline test files at the end, not 54. The executor must run the guard once
before committing and paste the number it reports; if the number differs from
55, the README is wrong, not the guard. (This plan adds exactly one file,
`src/docs-counts.test.ts`.)

### 2.2 New file: `packages/primitives/src/docs-counts.test.ts`

A runtime-free vitest file that:

1. Resolves the package root from `import.meta.dirname` (`..` from `src`) and
   reads `README.md` with `FileSystem.readFileString` from Effect, using
   `NodeFileSystem` / `NodePath` (the pattern in `src/docs-theme-paths.test.ts`).
2. Recursively lists files under `src` and `runtime`.
3. Counts offline test files as names ending `.test.ts` or `.test.tsx` under
   `src` (any depth).
4. Counts runtime test files as names ending `.runtime.test.tsx` under
   `runtime`.
5. Parses the two claims with one regex each:
   - `offline suite is \*\*(\d+) test files\*\*`
   - `runtime suite is \*\*(\d+) test files\*\*`
6. Asserts the parsed number equals the real count, naming both values and the
   command a reader should run when it fails.
7. Adds a **policy** assertion that the README contains no numeric test count:
   the regex `/Measured[^\n]*\d+ tests?\b/` must not match. This is what stops a
   future author from re-introducing a number only a full run knows. The file's
   header comment states both the bug (the 53/753/46/700 drift) and the rule.

Keep the whole file under ~90 lines. Use `Effect.gen`, `Effect.runPromise` in
the test cases, `expect`, and `it` (the suite is vitest, not `@effect/vitest`).

### 2.3 `.agents/slop/plans/README.md`

Add one row to the primitives block, after `587`:

```md
| [588](./588-verification-counts.md) | The package README's suite counts must be true | F | 030, 041, 047, 583, 587 | **done** — the README claimed 53/753 offline and 46/700 runtime against a measured 54/788 and 49/717; the prose now carries only the file counts and `src/docs-counts.test.ts` fails by value when either drifts or a numeric test count returns |
```

(Adjust the status wording to the measured final numbers; the file count after
this plan is 55.)

### 2.4 `TODO.md`

Add a row in the primitives section (beside the other `packages/primitives` fix
rows), tick it, and keep the section's progress bar internally consistent:

```md
`[x]` `packages/primitives`: **the README's suite counts were stale** —
      measured 2026-10-19: it claimed 53 offline files / 753 tests and 46 runtime
      files / 700 tests, while the tree had 54 / 788 and 49 / 717. The README now
      carries only the file counts (the latest run's totals stay in the live-suite
      row and plan 583), and `src/docs-counts.test.ts` fails by value when either
      count drifts or a numeric test count returns (plan `588`).
```

### 2.5 `COMPONENTS.md`

No row changes: no component behaviour changed. Do **not** touch the Tier 1
table.

## 3. Commands and expected results

Run from the package directory unless stated otherwise.

```sh
cd packages/primitives
nub run test -- docs-counts            # or: nub exec vitest run src/docs-counts.test.ts
```

Expected: **1 file, 3 tests passed** (two count cases + the no-numeric-count
policy case).

```sh
nub run --filter @gpuixui/primitives test
```

Expected: **55 files, 791 tests passed** (the suite was 54/788; this file adds
three cases). If the count differs, report the real numbers and update §1/§2.1
rather than forcing the text — the count is the evidence.

```sh
nub run check
nub run lint
```

Expected: both exit `0`.

## 4. Two-direction proof (required)

Before committing, prove the guard can fail:

1. **Declared-count direction.** Change `**55 test files**` in the README to
   `**54 test files**`. Run only `src/docs-counts.test.ts`. Expected: one case
   fails, naming `55` vs `54`. Revert.
2. **Tree direction.** Create a throwaway `src/__count-probe.test.ts` with one
   real assertion (not an empty test — `check-tests` would reject it), for
   example:

   ```ts
   import { expect, it } from "vitest";

   it("is a count probe", () => {
     expect(1 + 1).toBe(2);
   });
   ```

   Run only `src/docs-counts.test.ts`. Expected: the offline case fails, naming
   `56` in the tree against `55` in the README. Delete the probe.
3. **Policy direction.** Add `Measured 2026-10-19: 788 tests` to the README,
   run the file, see the policy case fail, then revert.

Record the three observed failure messages in the plan's status row / final
commit message. A guard that has never failed is not proven.

## 5. STOP conditions

- **STOP** if the README's file-count claims and the filesystem cannot be made
  to agree because another plan changed the tree in the same session: report the
  two numbers instead of editing code to match prose.
- **STOP** if a full `nub run --filter @gpuixui/primitives test` cannot run: do
  not claim a count that was not measured; run the guard alone and say so.
- **STOP** before changing any file outside `packages/primitives`,
  `packages/icons`, `.agents/slop/plans/`, `TODO.md` or `COMPONENTS.md`.
- Do **not** add a runtime dependency or a script that shells out to vitest from
  inside a test.

## 6. Acceptance

- The README states the real offline and runtime **file** counts, and no numeric
  test / passing / failing count.
- `src/docs-counts.test.ts` passes, and all three failure directions above were
  observed.
- `nub run check`, `nub run lint` and `nub run test` pass.
- The plan is indexed, `TODO.md` is ticked, and the branch is pushed.

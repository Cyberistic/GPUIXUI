# 711 — The composition matrix's own budget

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (test infrastructure / completion gate).
**Depends on:** 333 (the 20 s suite budget), 374 (the applied-style composition
matrix), 398 (every composition asks the total check), 541/618 (the applied
level paths the matrix exercises).

## 1. The defect

`nub run --filter @gpuixui/tokens test` — a §7 completion gate — failed on this
box at 04:54 on 2026-10-20 with no code change:

```
FAIL  src/platform-composition.test.ts > a platform style applied over another platform
      > holds every shipped base and applied style to all 10 checks
Error: Test timed out in 20000ms.
 Test Files  1 failed | 192 passed (193)
      Tests  1 failed | 6794 passed (6795)
```

The same file passes alone in **3.0 s** (4 cases). The failing case is the
largest in the package by an order of magnitude: it builds
`2 modes × 2 contrasts × 8 bases × 6 styles × 2 requested levels = 384`
compositions and runs the **ten** checks on each. Under a full-suite run the
file took **7.13 s** inside its own worker (JSON reporter), and on a box at load
average ~20 — another workstream was running `vite build`, and the package
spawns 193 isolated workers — the single case was descheduled past the 20 s
budget.

Plan 333 introduced the budget when the suite was **55 files** and the heavy
operations were a ~2.3 s compile and a ~0.8 s palette audit. The suite is now
**193 files**; the composition matrix is the one case whose wall-clock time is a
large fraction of the budget, and `testTimeout` measures wall clock, including
time the worker spends descheduled. The gate is therefore red at random, which
makes a real regression indistinguishable from scheduling noise — plan 333's own
argument, one suite generation later.

**Why this is not "raise the timeout".** The case's cost is real work, and one
test carrying 7 s of it gets a 20 s budget once; the same work split across the
32 base cases it is built from gives each case its own budget. Headroom per case
becomes ~40× instead of ~3×, and a timeout names the base instead of the whole
matrix.

## 2. Exact changes

### 2.1 `packages/tokens/src/platform-composition.test.ts`

After the `shippedBases` helper (line ~57), add the table the matrix is split
into:

```ts
/**
 * The composition matrix is one unit per shipped base, because a single case
 * over the whole product builds 384 themes and holds the package's largest
 * wall-clock budget: on 2026-10-20 a full parallel suite descheduled it past the
 * 20 s budget while every other file passed, and a loaded box must not turn a
 * real failure into a timeout. One base per case runs in a fraction of the
 * budget and names the base that timed out.
 */
const baseCases = modes.flatMap((mode) =>
  levels.flatMap((contrast) =>
    shippedBases(mode, contrast).map(([name, base]) => ({
      label: `${mode}/${contrast} ${name}`,
      base,
    })),
  ),
);
```

Replace the single case (lines 106–123) with:

```ts
  describe.each(baseCases)("$label", ({ base }) => {
    it(`holds every applied style to all ${themeChecks.length} checks`, () => {
      const failures = appliedStyles.flatMap(([styleName, style]) =>
        levels.flatMap((level) =>
          failuresOf(applyPlatformStyle(base, style, level)).map(
            (failure) => `${styleName} @${level}: ${JSON.stringify(failure)}`,
          ),
        ),
      );

      expect(failures).toEqual([]);
    });
  });

  /**
   * The split must keep every combination the single case measured: 32 bases
   * (identity and the builder, four platform variants and two recipes, in both
   * modes and at both contrasts) × 6 applied styles × 2 requested levels = 384
   * themes per check run. The number is deliberate: adding a platform, a recipe,
   * a style or a level must update it in the same commit, so a refactor cannot
   * quietly shrink the matrix.
   */
  it("covers every base, style and requested level", () => {
    const basesPerAxis = 2 + platformNames.length + platformRecipeNames.length;

    expect(baseCases).toHaveLength(modes.length * levels.length * basesPerAxis);
    expect(
      baseCases.length * appliedStyles.length * levels.length,
    ).toBe(384);
  });
```

No import changes: `Theme` is already imported as a type; `platformNames`,
`platformStyles`, `platformRecipes`, `platformRecipeNames`, `applyPlatformStyle`,
`getTheme`, `createTheme`, `getPlatformTheme`, `getPlatformRecipeTheme`,
`themeChecks`, `themeFailures`, `themeModes` and `themeContrasts` are already
used by the file.

### 2.2 `packages/tokens/vitest.config.ts`

The comment is stale (`55-file run`, `~2.3s` compile) and does not say which
case is the expensive one. Replace the JSDoc with the current facts:

```ts
/**
 * A full run is 193 isolated files on 12 cores; the package spawns a worker per
 * file, so a worker can be descheduled while the box is busy with something
 * else. The two operations larger than a unit test are the real TypeScript
 * compile in `react-consumer.test.ts` and the applied-style matrix in
 * `platform-composition.test.ts` (one case per base, 32 × 12 compositions).
 * `testTimeout` is wall clock, so a loaded worker can inflate either past the 5 s
 * default with no code change and the gate fails intermittently. 20 s is
 * headroom, not an infinite timeout: a hung subprocess never returns and still
 * fails. Keep the matrix split per base (plan 711): one case over the whole
 * product ran ~7 s under a parallel run, which left the budget too little room
 * to tell a slow box from a regression.
 */
```

### 2.3 `TODO.md`

Add under **Design tokens and theming (`tokens-theme`)** as a ticked row (after
the plan-710 row), and bump the progress fraction by one (the row count moves
398 → 399; the parser reads the counts in the header line):

```
`[x]` Give the composition matrix its own budget — the completed gate
`nub run --filter @gpuixui/tokens test` failed on 2026-10-20 with no code change:
`platform-composition.test.ts` built 384 themes in one case, took 7.13 s of a
full parallel run and was descheduled past plan 333's 20 s budget while the box
sat at load ~20. The matrix is one case per shipped base now (32 cases, 384
compositions, same product), a completeness case pins the 384 so a refactor
cannot shrink it, and `vitest.config.ts` states the current size and the split.
No token value, pair, floor, metric, platform style, recipe or theme moves
(plan 711)
```

The section header's progress fraction is the only aggregate count that moves.

### 2.4 `.agents/slop/plans/README.md`

Add to the `tokens-theme` table after row `710`:

```
| [711](./711-composition-matrix-budget.md) | The composition matrix's own budget | F | 333, 374, 398, 618 | done |
```

`README.md` (repo root) and `COMPONENTS.md` do not change: no token, component
or public API is added or altered.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Reproduce the current failure (evidence, optional if already captured):**

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected at the branch point: either green or
   `Test timed out in 20000ms` in `platform-composition.test.ts`; the file is
   ~7 s of the run and the box is shared. Record the run's own output.

2. **The guard can fail before the split** — apply §2.1 only, then:

   ```sh
   cd packages/tokens && nub exec vitest run src/platform-composition.test.ts
   ```

   Expected: green (4 old cases + 32 base cases + the completeness case; Vitest
   reports 36 cases in this file). Then prove the completeness guard in the other
   direction by temporarily filtering one base out of `baseCases` (for example
   `.filter((entry) => !entry.label.endsWith("recipe:xp"))`) and re-running:
   expected failure `expected 28 to have a length of 32`. Restore the line.

3. **Measure the split:**

   ```sh
   cd packages/tokens && nub exec vitest run src/platform-composition.test.ts --reporter=json --outputFile=/private/tmp/opencode/composition-timing.json
   jq -r '.testResults[] | .assertionResults[] | [(.endTime-.startTime), .title] | @tsv' /private/tmp/opencode/composition-timing.json | sort -rn | head -5
   ```

   Expected: the slowest single case is well under 1 s (the whole file was 3.0 s
   before the split when it was one case plus three others).

4. **Full suite under the shared box:**

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: 193 files, **6827** cases (6795 at the branch point − 1 removed case
   + 32 base cases + 1 completeness case), all passing. Record the file timing
   from a JSON run if the box is loaded.

5. **Gates:**

   ```sh
   nub run --filter @gpuixui/tokens check-types
   nub run check
   nub run lint
   nub run fmt
   ```

   Expected: clean.

6. **No scenario runs.** The change touches one test file, one config comment and
   two ledgers: no token value, pair, floor, metric, platform style, recipe,
   provider or runtime path. The commit says so instead of implying a native
   check.

## 4. STOP conditions

Stop and report instead of improvising if:

- The failing case is not `platform-composition.test.ts`, or the full suite fails
  in a different file with a real assertion (not a timeout) — that is a
  regression, not scheduling noise; do not paper over it with a budget change.
- The file alone takes more than ~5 s on an idle box: the split is not the
  problem, the composition cost has grown; re-measure and report before
  changing the shape.
- `describe.each` with a computed object table cannot interpolate `$label` in
  this Vitest version (5.0.5): fall back to a plain
  `baseCases.forEach(...)` + `describe(...)` loop, and say so in §7.
- The total case count is not 6827 after §2.1. Derive it from the run; do not
  edit the number in this plan.
- Another worktree owns `711` (checked below). At the time of writing, `710` is
  the last executed plan and `711` is free.

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/71[0-2]-*"
```

## 5. Test plan

**The bug the guard protects.** A suite gate that fails at random without a code
change makes every red run ambiguous. Plan 333 fixed the 55-file case with a
budget; the suite has since grown 3.5× and the matrix became the one case whose
wall-clock cost approaches the budget. The fix is structural (one budget per
base) plus a completeness guard, not a longer timeout.

**Both directions.**

- The completeness guard: dropping one base from `baseCases` makes the product
  28 instead of 32 and fails `expect(...).toHaveLength(32)`; restoring it passes. This
  proves the split cannot silently shrink the matrix while every per-base case
  still passes.
- A per-base case can still fail: temporarily plant `destructiveSoft: "#FF0000"`
  in the identity light palette (or edit one applied style's colour) and run the
  file — the composition case that base produces reports the failing check with
  its style and level label. Revert.
- The budget: the observation that motivates the plan is wall clock, so it is
  verified by measuring, not by a test — the case timings in §3.3 and the full
  run in §3.4 are the evidence, recorded verbatim in §7.

## 6. Acceptance

- `platform-composition.test.ts` holds the same 384-composition product as
  per-base cases, and the completeness case pins it at 384 compositions.
- The file's slowest case is under 1 s on this box (was 7.13 s as one case).
- The full tokens suite is green, with the pre-fix failure and the post-fix
  timings recorded in §7.
- `vitest.config.ts` no longer describes a 55-file suite.
- `TODO.md` and the plan index carry the change.
- One commit on `agent/tokens-theme`, pushed to `origin`.

## 7. Execution notes (2026-10-20)

### The failure, verbatim

A full run at 04:54 on 2026-10-20, box load average ~20:

```
FAIL  src/platform-composition.test.ts > a platform style applied over another platform > holds every shipped base and applied style to all 10 checks
Error: Test timed out in 20000ms.
 Test Files  1 failed | 192 passed (193)
      Tests  1 failed | 6794 passed (6795)
   Duration  59.71s
```

The same file alone: `1 passed (1)`, 4 cases, **3.00 s**. A JSON-reporter run of
the whole suite measured the file at **7.13 s** inside its worker — 2.7× the next
slowest (`snippets.test.ts`, 2.69 s). The suite spawned 193 workers at ~1.0–2.0 s
startup each.

### Changes

- `platform-composition.test.ts`: the single 384-composition case is now
  `describe.each(baseCases)` — 32 cases, one per `mode/contrast base` — and a
  completeness case pins 32 bases × 6 styles × 2 levels = **384** compositions
  per run.
- `vitest.config.ts`: the JSDoc now states the 193-file suite, names the compile
  and the matrix, and explains why the matrix is split rather than the budget
  raised.

### Two-directions evidence

1. **The completeness guard fails when the matrix shrinks.** Filtering
   `recipe:xp` out of `baseCases` produced:
   `expected … to have a length of 32 but got 28`. Restored.
2. **A per-base case still reports a real failure.** Planting
   `foreground: palette.neutral[100]` on the identity light palette (an
   unreadable body ink) failed every light identity base case in 56–84 ms, each
   naming its own style and level. Reverted (`src/color.ts` is untouched in the
   commit).
3. **The timings.** Full suite: 193 files, **6827 cases**, all green in 20.41 s
   (box load lower than the failing run; `nub run test` repeated at 25.66 s,
   green). The file alone is 1.79 s; its slowest case is **66 ms**
   (`light/default identity`) against the ~3 s the single case took, and the next
   24 cases are 50–58 ms. The JSON reporter's per-case durations sum to ~1.9 s.

### Divergences from the plan

- **The composition arithmetic was wrong in the draft.** The product is
  2 modes × 2 contrasts × 8 bases = **32 base cases**, and
  32 × 6 applied styles × 2 requested levels = **384** compositions, not 768.
  The guard caught the draft figure on its first run (`expected 384 to be 192`),
  which is the case doing its job before the commit. The plan's numbers, the
  source comments and `vitest.config.ts` all state 384 now.
- `describe.each` with `$label` works in Vitest 5.0.5; no fallback was needed.
  Test titles read `a platform style applied over another platform >
  light/default identity > holds every applied style to all 10 checks`.
- `nub run test` runs the tokens suite in this worktree ("Scope: 3 of 4 workspace
  projects"); `nub run check`'s `check-types` covers `packages/tokens` and
  `packages/deploy`. Both are clean.

# 700 — The package's own "scoped" verification command runs the whole live suite

| Field | Value |
| ----- | ----- |
| Status | done — fixed and measured (see §5) |
| Phase | F (integration and polish — docs truth) |
| Owner | primitives |
| Depends on | `047`, `588`, `691`, `696`, `699` |
| Feeds | every future primitives verification, and the plan index's commands |

The package documents how to verify one scenario. On this toolchain the form it
teaches silently ignores the file and runs all of them, so an executor who
follows the page pays for a full live run and may believe the scope was proven.
This plan measures the two forms and fixes the page plus a guard.

---

## 1. Measured facts this plan relies on

Measured on this worktree, 2026-10-20, `nub v0.9.6`, Node 24.18.0 (pinned by
`.node-version`), against the store's release-tag `@gpuix/native@0.10.0`
binding:

1. **The documented form runs everything.**
   `nub run --filter @gpuixui/primitives test:runtime -- --run runtime/surface.runtime.test.tsx`
   prints `vitest run --config vitest.runtime.config.ts -- --run runtime/…` and
   reports **62 files / 839 tests** (at that moment a temporary probe file was
   present; the tree's count without it is 61). The file argument never becomes
   a filter, because everything after `--` reaches the runner verbatim.
2. **The form without the extra `--` is scoped.**
   `nub run --filter @gpuixui/primitives test:runtime runtime/surface.runtime.test.tsx`
   prints `vitest run --config vitest.runtime.config.ts runtime/surface.runtime.test.tsx`
   and reports **1 file / 9 tests**.
3. `packages/primitives/docs/surface.mdx` line 206 and
   `.agents/slop/plans/696-surface-primitive.md` §Verification teach form 1.
   Plan `699` already records form 2 in its §4.3 note.

**STOP** if form 1 scopes on a different nub/vitest pair — the page would then be
right and this plan is void. **STOP** if `nub run … test <filter>` stops
filtering (then the correct advice is a different command, not this one).

---

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/docs/surface.mdx` | the two `sh` commands use the scoped form and name what each should report |
| `.agents/slop/plans/696-surface-primitive.md` | §Verification's table drops the extra `--` and`--run` (the plan is a living record) |
| `.agents/slop/plans/README.md` | one line in the primitives block: the measured scoped form, so new plans copy it |
| `packages/primitives/src/docs-commands.test.ts` | new guard, below |
| `TODO.md` | a row for the correction, ticked with the measured result |

No source behaviour changes.

---

## 3. The guard

`src/docs-commands.test.ts`, built on the `readDocs`/`readText` shape of
`src/docs-floating-follow.test.ts`:

1. Read `docs/*.mdx` (sorted) and `README.md`.
2. Fail, by `file:line` and the line text, for any line that contains
   `test:runtime` followed by ` -- ` and a second `--` — the form that silently
   runs the whole suite. The pattern is deliberately narrow: it targets the
   double-dash hand-off, not a legitimate `--filter` or `--reporter`.
3. Assert the guard is not vacuous: `surface.mdx` must still contain the scoped
   `test:runtime runtime/surface.runtime.test.tsx` line, and the docs set must
   be non-empty.

### Test plan (both directions)

1. Write the guard **before** fixing the page. Run
   `nub run --filter @gpuixui/primitives test src/docs-commands.test.ts` → it
   must fail naming `surface.mdx:206` (or whatever line the command sits on).
2. Fix the page. Re-run → green.
3. Remove the scoped `surface.mdx` line → the vacuity assertion fails; restore.

### Commands (scoped)

```sh
nub run --filter @gpuixui/primitives test src/docs-commands.test.ts
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types
```

Expected: the scoped guard green, offline **67 files / 921 tests** (one more
case), `check-types` clean. No runtime suite is needed: the change is docs plus
a source-reading guard.

---

## 4. Acceptance criteria

- Every primitives page and the README teach a command that actually scopes.
- The new guard fails on the old line and passes on the corrected one; the
  vacuity assertion fails when the scoped line is removed.
- The plans index states the working form once, and plan `696`'s table uses it.
- `check-types`, the offline suite and the scoped guard are green.


---

## 5. Outcome (measured 2026-10-20)

- **Both directions proven.** Written before the fix, the guard reports exactly
  `"surface.mdx:206 nub run --filter @gpuixui/primitives test:runtime -- --run
  runtime/surface.runtime.test.tsx"` and fails the vacuity case; after the page
  uses the scoped form both cases pass (2/2).
- **The page, plan `696` and the plans index** teach the working form; the index
  gained a short "Scoped verification commands" section so a new plan copies it.
- **No behaviour change.** Offline suite **68 files / 923 tests**, `check-types`
  clean; the runtime suite was not re-run for this plan (docs plus a
  source-reading guard).

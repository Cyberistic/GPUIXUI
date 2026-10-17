# 023 — `alpha` comes from `@gpuixui/tokens`

**Phase:** B (cleanup). **Owner:** primitives workstream.
**Depends on:** plan `021` (primitives depends on tokens), plan `014` (tokens’ `alpha`).
**Status:** done (2026-10-17).

## 1. Why

`src/core/color.ts` carries a `TODO:` — “`@gpuixui/tokens` exports the same
helper; delete this module and import it once that package is in the tree.” It is
in the tree (plan 021), and its `alpha` is tested in
`packages/tokens/src/color.test.ts`. Keeping a second implementation of the same
arithmetic is how the two drift: the local one preserves the input’s case, the
tokens one uppercases, and nothing forces a future fix to land twice.

The public API does not change: `@gpuixui/primitives` keeps exporting `alpha`
from `core/index.ts`; only its implementation moves.

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/index.ts` | `export { alpha } from "@gpuixui/tokens";` (delete the `./color.js` re-export) |
| `packages/primitives/src/core/selection.ts` | import `alpha` from `@gpuixui/tokens` |
| `packages/primitives/src/core/variants.ts` | import `alpha` from `@gpuixui/tokens` |
| `packages/primitives/src/core/theme.test.ts` | drop `color.ts` from `COLOUR_FILES` (the file no longer exists; the fixture is the only hex source) |
| `packages/primitives/src/core/color.ts` | **delete** |
| `packages/primitives/src/core/color.test.ts` | **delete** — tokens owns the helper and its tests |
| `packages/primitives/README.md` | the `core/` table no longer lists `color.ts` |
| `TODO.md` / plan index | record plan 023 as done when the gates pass |

Do not edit `packages/tokens`. Its helper already covers every case the deleted
test asserted: six- and eight-digit input, alpha replacement, clamping, and a
non-hex value returned unchanged.

## 3. Steps

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/primitives
nub run --filter @gpuixui/primitives check-types
```

Expected before the edit: clean (this is the baseline).

1. Apply the file changes in §2. Keep the import ordering the formatter wants;
   `@gpuixui/tokens` sorts with the other external packages.
2. Run:

   ```sh
   nub run --filter @gpuixui/primitives test
   nub run check
   nub run test
   ```

   Expected: primitives at 14 test files / 161 tests (the two `color` cases are
   gone with the deleted module; all other counts unchanged), every workspace
   green.

3. Prove the public API still resolves:

   ```sh
   grep -n "alpha" packages/primitives/src/core/index.ts
   ```

   Expected: exactly one line, re-exporting from `@gpuixui/tokens`.

4. Commit and push:

   ```sh
   git add packages/primitives TODO.md .agents/slop/plans
   git commit -m "refactor(primitives): alpha comes from tokens"
   git push origin agent/primitives
   ```

## 4. Test plan

- The deleted `color.test.ts` cases are already present in
  `packages/tokens/src/color.test.ts`; run `nub run --filter @gpuixui/tokens test`
  and confirm they still pass (they are the coverage, not a new double).
- `core/style.test.ts` still asserts that every button variant has hover and
  press feedback — that is the consumer of `alpha` and fails if the import is
  wrong or the helper returns a non-colour.
- The `theme.test.ts` colour-literal scan must still pass with `color.ts` gone,
  proving the surviving scan set is accurate (a stale allowance would hide a
  literal in a deleted file; a missing allowance would fail on the fixture).

No new assertion is invented for this deletion: the behaviour is unchanged and
already covered. If a reviewer wants a guard against a reintroduced copy, add
`expect(alpha).toBe(tokensAlpha)` in a follow-up only if the project starts
exporting both names.

## 5. STOP conditions

- `@gpuixui/tokens`’ `alpha` differs from the local one in a way that changes a
  rendered colour (the only known difference is uppercase output, which GPUix
  parses identically). If any test asserts the exact string case, stop and
  report instead of rewriting the assertion.
- A consumer outside this workstream imports `./core/color.js` directly (grep
  the repo). The fix is to move that consumer to the package export, not to keep
  the module.
- Any gate fails for a reason not explained by the deletion.

## 6. Acceptance

- One `alpha` implementation in the library, owned by `@gpuixui/tokens`.
- `@gpuixui/primitives` still exports `alpha`.
- `nub run check` and `nub run test` green; runtime suite unaffected (no need to
  re-run, but re-run if time allows).
- Plan index and `TODO.md` record plan 023 as done.

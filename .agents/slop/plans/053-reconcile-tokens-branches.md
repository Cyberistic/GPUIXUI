# 053 — Reconcile the two `tokens` branches into one

| Field | Value |
| ----- | ----- |
| Phase | B (foundation) — closes the tokens workstream before promotion |
| Owner | **tokens-theme workstream** — it owns `packages/tokens`, `docs/tokens.md` and `docs/design-system.md` |
| Depends on | plans `010–019`, `050` (this branch), `051–052` (on `master`) |
| Status | planned |
| Evidence | `.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`; `git merge-base master HEAD` → `da1fd61` |

This plan is self-contained. It is a **branch reconciliation**, not new design
work: two live sessions shared one worktree (the concurrent-writer blocker), so
the same workstream produced two branches that both edited the *same files* of
`packages/tokens`. Neither side is wrong; each has content the other lacks. The
workstream is not one branch until they are one.

## 1. What each side has — do not drop either

Diverged at `da1fd61`:

| Branch | Commits the other lacks | Content |
| ------ | ----------------------- | ------- |
| `agent/tokens-theme` (this worktree) | `e3df297`, `508d2cc`, `65ca82f`, `1ffe12f` | plan `019` motion tokens (`src/motion.ts`, `motion.test.ts`, `motion.example.ts`; `theme.motion`, `mergeMotion`, `motionTransition`), plan `050` layering + omissions, the four-theme group guard |
| `master` ( = `agent/tokens-platform`) | `ca71e0e`, `57b5678`, `458fe10`, `6e01fde` | plan `051` platform type styles (`src/platforms.ts`, `platforms.test.ts`, `platforms.example.ts`; `platformTheme`), plan `052` (font registration, still blocked by B1) |

Both branches also **removed the other's feature from the shared files** —
`master`'s `theme.ts` has no `motion` group; this branch's `theme.ts` has no
`platformTheme`; both versions of `docs/tokens.md`, `docs/design-system.md` and
`packages/tokens/README.md` describe only their own new feature. A merge that
keeps one side's file wholesale silently deletes the other feature. The
resolution is **union**, never "ours" or "theirs".

## 2. Resolution rules — file by file

All paths relative to the `tokens-theme` worktree.

| Path | Resolution |
| ---- | ---------- |
| `packages/tokens/src/index.ts` | **Union**: export both `./motion.js` and `./platforms.js` |
| `packages/tokens/src/theme.ts` | Keep this branch's `motion` group, `mergeMotion`, the `motion` field on `Theme`/`ThemeOverrides`, the four theme objects and `extendTheme`; **add** `platformTheme` and the `platformTypes`/`PlatformName` import from `master`. Keep `master`'s blank line after `isDensityName` (fmt) |
| `packages/tokens/src/typography.ts` | Take **`master`'s** version: it imports `systemMonoFamily`/`systemUiFont` from `./platforms.js`. The inline `monoByPlatform` table is superseded — do not keep both. `systemMonoFamily` stays exported (now from `platforms.ts`) |
| `packages/tokens/src/platforms.ts` | **Keep from `master`** (new file) |
| `packages/tokens/src/motion.ts`, `motion.test.ts`, `motion.example.ts` | **Keep from this branch** (new files) |
| `packages/tokens/src/platforms.test.ts`, `platforms.example.ts` | **Keep from `master`** (new files) |
| `packages/tokens/src/theme.test.ts` | **Union**: this branch's motion-override + theme-completeness tests **and** `master`'s `platformTheme` tests |
| `packages/tokens/README.md` | Union: keep the **Motion** section, add the **Platform type** section; merge the **Limitations** list so it carries both (drop the stale "no motion tokens yet" line — motion exists) |
| `docs/tokens.md` | Union: keep **Motion** and **Layering**; add **Platform type** under Typography; keep `motion` in the `Theme` interface and the motion merge rule; keep this branch's newer **Limitations** list (breakpoints, `shadowXs`/`shadowXl`, no stacking scale) **and** `master`'s platform limitations; add `platformTheme`/`platformTypes`/`currentPlatform`/`systemUiFont` to the import block and the verification note |
| `docs/design-system.md` | Union: keep this branch's motion paragraph and the Layering link; add `master`'s platform-type paragraph in §5 |
| `TODO.md`, `COMPONENTS.md` | Union of rows; tick the reconciliation |
| `.agents/slop/plans/README.md` | Union of rows; add `051` and `052` |

## 3. Commands and expected results

```sh
git merge master                # expected: conflicts in the files §2 lists
# resolve per §2, then:
nub run --filter @gpuixui/tokens test        # expected: exit 0, motion + platform tests
nub run --filter @gpuixui/tokens check-types # expected: exit 0
nub run check                                # expected: exit 0
nub run test                                 # expected: exit 0
node -e "import('@gpuixui/tokens').then(m=>console.log(!!m.motionTransition, !!m.platformTheme))"
# expected: true true
```

## 4. STOP conditions

Stop and report if:

- `master` no longer carries `platforms.ts` / `platformTheme` (§1 was read at
  `6e01fde`; if the branch moved, re-read before merging);
- a resolution would require editing a path outside this workstream (record it
  in `TODO.md` instead);
- the union produces a `Theme` field that one of the two doc sets contradicts
  (then both docs are wrong — fix the docs to match the code, do not invent a
  third story);
- a gate fails outside this package (report it and leave the other workstream
  alone).

## 5. Test plan

- Motion: `theme.test.ts` keeps the override/immutability assertions (they fail
  if `mergeMotion` is dropped in the resolution) and `motion.test.ts` passes.
- Platform: `platforms.test.ts` keeps its table and `platformTheme` assertions
  (they fail if `platformTheme` is dropped).
- **Able to fail:** the union is proven by both suites passing at once. If the
  resolver kept only one side, one suite fails or the other feature is absent;
  prove the failure by temporarily reverting the resolver for one side.
- The four-theme group guard (`508d2cc`) must still pass: `motion` is a group on
  every shipped theme after the merge.
- `scripts/verify-two-directions.sh` is run for the two theme-field assertions
  the resolution could have dropped.

## 6. Acceptance criteria

- `agent/tokens-theme` contains **both** motion tokens and platform type styles,
  with every test on both sides passing.
- `index.ts` exports both modules; `Theme` carries `motion`; `platformTheme`
  exists; `typography.ts` has exactly one mono table (`platforms.ts`).
- The docs describe both features and agree with the code; no doc claims a
  removed token or a token that no longer exists.
- `nub run check`, `nub run lint` and `nub run test` exit 0.
- `TODO.md` records that the promotion to `main` is the integration owner's step,
  and that `agent/tokens-platform` can be retired once one branch carries both.

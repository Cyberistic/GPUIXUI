# 688 — The plan-number collision at `433` (and the rule it exposes)

> **Status: ready to execute.** This plan is plan-and-document maintenance, not
> code. It changes no token value, no package export and no test fixture.

## Why

`PLAN.md` D7 counts plans across every worktree: the supervisor aggregates
distinct plan files from `main` and each `workspaces/*` tree. A plan number is
therefore a **global** identity, even though the files live on branches.

Two plan sets already claim `433`:

| Tree | File | Content |
| ---- | ---- | ------- |
| `main` (and every worktree branched from it, including this one) | `433-platform-theme-recipes.md` | Windows XP/Aero recipes (Recipe A, shipped as `311`) plus the open Omarchy Recipe B |
| `agent/docs-site` | `433-theming-native-captures.md` | the docs site's native-capture work |

`agent/docs-site` records the collision and blocks its own plan until one side
renumbers (`workspaces/docs-site/TODO.md`, *"Plan numbering collision in the docs
block"*, owner: coordinator / tokens-theme). Our file is the one that can move:
Recipe A is already delivered by plan `311`, so this plan has no code work riding
on its number.

The audit for this plan also found the same class one number over: our **executed**
`685-theme-diff.md` and `686-density-boundary-truth.md` share their numbers with
`agent/components`' `685-controlled-contract-truth.md`. Renaming executed plans
would rewrite dozens of cross-references, commit messages and historical
sentences for no functional gain, so they stay; the durable fix is an automated
uniqueness check, recorded as a repo-tooling task below.

## Decision

- Renumber **our** recipe plan `433` → **`687`** (both `687` and `688` are free
  in every worktree; checked 2026-10-19).
- `agent/docs-site` keeps `433`.
- This maintenance plan is `688`.
- Executed `685`/`686` are **not** renamed. Record the systemic guard instead:
  a repo-tooling check that fails when two worktrees carry different files under
  one number.
- Plan `052` gets the docs-site re-check it asked for: the pinned release is
  re-verified absent, the decision stands, and the evidence path no longer names
  a worktree that may not have the package installed.

## Exact files and changes

1. **Rename** `.agents/slop/plans/433-platform-theme-recipes.md` →
   `.agents/slop/plans/687-platform-theme-recipes.md` (`git mv`).
   - Change the H1 to `# Plan 687: …`.
   - Add one line under the status block: *"Renumbered from `433` on
     2026-10-19 to resolve a cross-worktree collision with `docs-site`'s
     `433-theming-native-captures.md`; the content is unchanged."*
   - Keep the existing status (`A` done via `311`; `B` blocked on a Linux host).

2. **`.agents/slop/plans/README.md`**
   - Reference-adoption table: change the row number `433` → `687` (title and
     status unchanged).
   - Prose in plan `311`'s entry: *"Recipe B of plan 433"* → `687`.
   - Tokens table: add a row for `688` with status `done` once this plan runs.

3. **`.agents/slop/plans/311-platform-recipe-styles.md`** — four references to
   `433` (lines 12, 22, 67, 290/296) become `687`.

4. **`TODO.md`**
   - The two references to plan `433` in the tokens section (Recipe B row and
     the docs-site recipe row) become `687`.
   - Add, under *Design tokens and theming*:
     - `[x]` the `433` → `687` renumber with the collision stated (plan 688);
     - `[x]` the plan `052` re-check requested by `docs-site`: pinned
       `@gpuix/native@0.10.0` still has no `registerFont`, so the plan's
       blocked status is correct and no evidence path names a stale worktree
       (plan 688);
     - `[ ]` cross-team / repo tooling: a uniqueness guard for plan numbers
       across worktrees (found by plan 688; the executed `685`/`686` collision
       is real and unchecked).

5. **`.agents/slop/plans/052-register-font.md`**
   - Add a *Re-check (2026-10-19)* note: `docs-site` asked whether §1 was citing
     the reference clone. Answer: it was corrected on 2026-10-17 and is correct;
     re-verified today against a resolved `@gpuix/native@0.10.0`
     (`grep -rn registerFont` over the package prints nothing).
   - Replace the worktree-specific path in the command table with a discovery
     command (`find … -path "*@gpuix/native/package.json"`) so the check runs in
     any worktree that has the runtime installed.
   - Status stays **blocked (upstream)**. Do not implement `registerFonts`.

## Commands

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| Rename | `git mv .agents/slop/plans/433-platform-theme-recipes.md .agents/slop/plans/687-platform-theme-recipes.md` | exit 0 |
| No stale references | `grep -rn --exclude=688-plan-number-collision.md -e "433-platform" -e "plan 433" -e "Plan 433" .agents/slop/plans TODO.md` | no output (exit 1). Against `HEAD~1` the same command finds eight lines, so it can fail |
| Number is free | `find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/687-*"` | only our renamed file |
| Types/lint/fmt/tests guard | `nub run check` | exit 0 |
| Package suite | `nub run --filter @gpuixui/tokens test` | 192 files, 6737 tests pass |
| Worktree state | `git status --short` | only the intended files, plus the known `references` symlink |

The exclusion keeps this plan's own historical description out of the check;
everything else must be clean. `grep` is used rather than `rg` because ripgrep
is not installed on this host.

## Test plan

There is no executable code change, so a new unit test would assert nothing about
the library. The meaningful checks are the ones above:

- **Can it fail?** Point the `grep` check at the pre-change tree: it finds eight
  lines (five in plan `311`, one in the recipe plan's own title, one in the
  index and one in `TODO.md`). After the change it finds none. That both
  directions were run is recorded in the commit message.
- **Index truth:** the reference-adoption table and the tokens table each carry
  one row for `687`/`688`; a `grep` for a duplicated row number returns one row.
- **Gates:** `nub run check` and the tokens suite must pass unchanged; the plan
  files are not read by the suite, so a failure means the branch was already red
  and must be reported, not papered over.

## Acceptance

- [ ] `687-platform-theme-recipes.md` exists; no file numbered `433` exists in
      this worktree.
- [ ] The README index, `311`'s references and `TODO.md` name `687`.
- [ ] Plan `052` carries the 2026-10-19 re-check and a worktree-independent
      evidence command; its status is still blocked.
- [ ] `[x]` rows land in `TODO.md` for both fixes, and the repo-tooling
      uniqueness task is recorded as `[ ]`.
- [ ] `nub run check` and `nub run --filter @gpuixui/tokens test` pass.

## STOP conditions

- `agent/docs-site`'s `433-theming-native-captures.md` is not in this worktree;
  **never create or edit it** from here.
- Another worktree claims `687` or `688` between the audit and the commit →
  take the next free number and update this plan before continuing.
- A gate fails for a file this plan did not touch → report the failure with the
  command output; do not fix another workstream's tree.
- The re-check finds `registerFont` in the pinned release → stop; plan `052` is
  then unblocked and must be executed as its own plan, not from this one.

# 653 — Every core capability has live evidence, or a named reason

**Phase:** F
**Depends on:** `100`, `110`, `120`, `140`, `189`, `197`, `517`, `639`
**Workstream:** playground (`apps/playground`, `packages/testing`)

## 1. Why this plan exists

MISSION's hardest rule is that an interaction is not complete until it runs in
the real runtime. The suite enforces half of that today:

- `scenarioProblems` (`apps/playground/src/scenarios/index.ts`) requires every
  **core** and **probe** capability to have a headless scenario.
- `liveScenarioProblems` (`apps/playground/src/live/scenario-problems.ts`)
  requires every live scenario id to be unique, `live-`-prefixed, and filed
  under a capability that a headless scenario also mounts.

Neither direction requires a **core capability to have live evidence**. The
live list is hand-maintained, so deleting `live-combobox` (or adding a new core
capability with only an offscreen probe) would leave every test green while the
report still says `combobox=verified` from the offscreen suite. That is exactly
the coverage claim `COMPONENTS.md` promises not to make.

Three core capabilities currently have no live scenario filed under their own
name:

| Capability | Live evidence today | Why the id is filed elsewhere |
| ---------- | ------------------- | ---------------------------- |
| `text` | `live-typography` | the twin mounts the typography view; it asserts painted text, line boxes and font weight |
| `modal` | `live-focus`, `live-overlay` | the twins mount the modal view; one proves the lifecycle, one the focus contract |
| `a11y` | none | `GpuixRenderer` exposes no accessibility dump; only `TestRenderer.getA11yTree` does (plan `197`) |

The first two are real live evidence under another family name; the third is a
measured runtime limit. The guard must record both facts so the coverage claim
is checkable rather than remembered.

**Guard being exercised:** the mission's native-evidence rule. A red guard means
the live registry under-claims its own coverage; §4 says stop. This plan does
**not** add a window scenario, so it does not need a live run.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenario-problems.ts` | Add `LIVE_ALIASES` (a core capability proven by a live id filed elsewhere), `HEADLESS_ONLY_CAPABILITIES` (a core capability the live renderer cannot observe, with the measured reason), and `coreCoverageProblems`. `liveScenarioProblems` gains a required `core` argument and appends those problems. |
| `apps/playground/src/live/scenarios.test.ts` | Pass `CORE_CAPABILITIES` to every call; add a test that flags a core capability with no live coverage and a test that accepts the reasoned exemption. Update the header comment with the new bug and the observed two directions. |
| `apps/playground/README.md` | Extend the live-registry paragraph: a core capability needs a live scenario, a named alias, or a reasoned headless-only entry; name the two aliases and the `a11y` limit. |
| `COMPONENTS.md` | The `text` capability row also cites `live-typography`; the `modal` row cites `live-overlay` + `live-focus`. No verdict changes. |
| `TODO.md` | New ticked row at the top of the playground section with the counts, commands and the mutation proofs. |
| `.agents/slop/plans/README.md` | Add `653` to the playground table and the numbering paragraph. |
| This plan | Fill §7 "Landed" with the observed output. |

Do **not** touch `packages/testing`: the guard is registry policy, and the
package stays free of `apps/playground` imports.

## 3. Commands and expected results

Run from the worktree root
(`/Users/cyberistic/GPUIXUI/workspaces/playground`) with `nub`.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter playground test` | exit `0`; the live-registry file reports **8** tests (4 new) and the playground total is **436** (was 432). Record the exact number. |
| 2 | `nub apps/playground/dist/live/run.js --list \| wc -l` | `93` (no window; proves the registry is unchanged). Rebuild first if `dist` is stale: `nub run --filter playground build`. |
| 3 | `nub run check` | exit `0` (`check:tests`, lint, format, every `check-types`). |
| 4 | `nub run lint` | exit `0`. |
| 5 | `nub run test` | exit `0`; record the per-package totals (baseline playground 432 → 436, testing 61, components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7). |

No `--only` / `--all` native run is required: no scenario, view or host verb
changes. `--list` is the registry proof and opens no window.

## 4. STOP conditions

Stop and report the command output — never weaken an assertion — if:

1. Step 1 fails on the **real-registry** case with a capability not in the
   alias/exemption list. That is a real coverage gap: either name the live twin
   that proves it (with the reason it is filed elsewhere) or add the live
   scenario in a follow-up plan. Do not add a capability to
   `HEADLESS_ONLY_CAPABILITIES` without a measured reason.
2. An alias names an id that is not in `liveScenarios`. Fix the alias, not the
   guard.
3. Step 1, 3, 4 or 5 fails for any other reason. Fix it in this workstream if it
   is `apps/playground`; otherwise record a cross-team row in `TODO.md`.
4. The live registry count in step 2 is not `93`. This plan changes no
   scenario; a different count means the tree already moved. Record it and
   re-read the real-registry test before continuing.

## 5. Test plan

The guard is pure, so the tests run on any host with no binding.

| Test | What it must catch |
| ---- | ------------------ |
| `accepts the real live registry against the headless one` (extended) | With `CORE_CAPABILITIES`, the real 93-entry live list, the two aliases and the `a11y` exemption are complete. This is the forward direction of every core capability. |
| `flags a core capability with no live coverage` | Filter `live-combobox` out of the live list; expect `no live scenario covers core capability "combobox"`. This is the bug the guard exists for. |
| `accepts the reasoned headless-only core capability` | Pass `["a11y"]`; the real list stays clean because the exemption is declared. |
| `flags an unexempted capability` | Pass `["upload"]` (a real capability with no live scenario and no exemption); expect the coverage problem. |
| existing duplicate / prefix / unmatched-capability cases | Unchanged behaviour; they now pass `CORE_CAPABILITIES`. |

**Two-direction evidence (observed, then reverted):**

- **M1** — rename the `text` alias id to `live-typo`: the real-registry test
  fails with `live alias "live-typo" is not registered` and three synthetic
  cases fail. (A true deletion of the registry entry would name both the alias
  and `text`; the typo exercises the same branch in one line.)
- **M2** — delete the `a11y` entry from `HEADLESS_ONLY_CAPABILITIES`: the
  real-registry test fails with `no live scenario covers core capability
  "a11y"`.
- **M3** — return `[]` from `coreCoverageProblems`: the synthetic
  `combobox` test fails. This proves the assertion is not vacuous.

Each mutation is run, observed red, and reverted. Record the exact message.

## 6. Ledger wording

- `TODO.md`: one ticked row naming the guard, the two aliases, the `a11y`
  reason, the test count, the exact commands run and the three mutation
  proofs observed.
- `COMPONENTS.md`: no verdict moves; `text` and `modal` gain their live ids in
  the **Scenario** column.
- `apps/playground/README.md`: the rule, not just the fact.

## 7. Acceptance

- [x] `liveScenarioProblems` fails when a core capability has no direct, alias
      or exempted live coverage, and the alias must name a registered id.
- [x] `HEADLESS_ONLY_CAPABILITIES` carries `a11y` **with** the measured reason
      (plan `197`: no `GpuixRenderer` a11y method).
- [x] The real registries pass with the two aliases (`text` → `live-typography`;
      `modal` → `live-focus`, `live-overlay`).
- [x] New tests fail without the implementation and pass with it; the three
      mutations above are observed and reverted.
- [x] `nub run check`, `nub run lint` and `nub run test` pass; the counts are
      recorded.
- [x] Committed on `agent/playground` and pushed to `origin`; never `master`.

## 8. Landed

Executed 2026-10-19 on `agent/playground`.

- **Tests:** `nub run --filter playground test` — 37 files, **436** tests
  (was 432; the live-registry file goes `4 → 8`), exit `0`.
- **Registry:** unchanged — `nub apps/playground/dist/live/run.js --list`
  reports **93** live ids; the headless suite is **105**.
- **Gates:** `nub run check`, `nub run lint` and `nub run test` green
  (playground 436; the other packages unchanged).
- **Mutations observed and reverted:** deleting the `a11y` exemption failed the
  real case with `no live scenario covers core capability "a11y"` (2 tests);
  renaming the `text` alias to `live-typo` failed with `live alias "live-typo"
  is not registered` (4 tests); returning `[]` from `coreCoverageProblems`
  failed the three synthetic coverage cases.
- **Ledgers:** the `text` and `modal` capability rows cite their live twins;
  the playground README states the rule and the two aliases.
- **Not claimed:** no window scenario changed, so no live run was needed; the
  `a11y`/`upload` limits stay headless-only with their measured reasons.

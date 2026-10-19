# 639 — The final merge/release gate, and a checkable live registry

**Phase:** F
**Depends on:** `517`, `529`, `531`, `564`, `620`, `623`, `624`, `633`, `637`
**Workstream:** playground (`apps/playground`, `packages/testing`)

## 1. Why this plan exists

The workstream's promotion row in `TODO.md` is `[~]`: `agent/playground` has
merged every commit of `origin/master` and is a fast-forward, but the
owner/supervisor runs the final merge. The last **recorded** merge/release gate
was headless **104/104** (3672 checks) and live **90/90** (2330 checks, 881 s).
Since then:

- plan `624` registered `live-text-entry` (the gate after it ran 90/90);
- plan `633` grew `live-tier2-navigation` from 20 to 26 checks in place;
- plan `637` registered `live-roving-focus` (28 checks) and changed
  `tier2-navigation`/`live-tier2-navigation`; only that one id has run on the
  current head;
- the live registry therefore holds **91** scenarios, and no full live run has
  ever included `live-roving-focus`.

The branch cannot be promoted on "the focused scenarios passed". The full
suites are the two-direction evidence for a change that touched shared harness
code (`AsyncSmokeHost`, the registry, the runner), so the gate must run at the
final head.

The second half is a guard. The live registry
(`apps/playground/src/live/scenarios.tsx`) is a hand-maintained list of 91
entries. `scenarioProblems` guards the headless registry, but nothing guards the
live one. A live entry added with a duplicate id silently makes `--list` and a
report disagree with the number of scenarios that ran (`--only` selects one of
the two by id), an id without the `live-` prefix makes a window claim
indistinguishable from an offscreen one in a report, and a live capability with
no headless scenario would claim live evidence for a family the offline suite
never mounted. Each is a silent coverage lie, which is the exact failure this
repository's evidence rules exist to prevent.

**Bug guarded by the new test:** a duplicate/ unprefixed/ unmatched live
registry entry produces a report that claims more (or other) coverage than the
suite actually exercised, and no test fails. The test fails without the guard
and passes with it; §5 records the observed two directions.

## 2. Files to create or change

### 2.1 `apps/playground/src/live/scenario-problems.ts` (new)

A pure module — no React, no renderer, no `@gpuix/*` runtime import — so it can
be unit-tested on any host.

```ts
/**
 * Every integrity problem in the live registry `list`, checked against the
 * headless registry it twins.
 *
 * The bugs it guards: a duplicate id makes `--only` run one of two scenarios
 * while a report counts both; an id without `live-` lets a window claim pass
 * for an offscreen one; a capability with no headless scenario claims live
 * evidence for a family the offline suite never mounted.
 */
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import type { Smoke } from "@gpuixui/testing";

/** The part of a registered scenario the integrity rules read. */
export interface RegisteredScenario {
  readonly id: string;
  readonly capability: Smoke.Capability;
}

export const liveScenarioProblems = (
  list: ReadonlyArray<RegisteredScenario>,
  headless: ReadonlyArray<RegisteredScenario>,
): ReadonlyArray<string> => {
  const ids = Arr.map(list, (scenario) => scenario.id);
  const headlessCapabilities = Arr.map(
    headless,
    (scenario) => scenario.capability,
  );

  return Arr.flatten([
    Arr.filter(ids, Str.isEmpty).map(() => "a live scenario has an empty id"),
    Arr.length(ids) === Arr.length(Arr.dedupe(ids))
      ? []
      : ["live scenario ids are not unique"],
    Arr.filter(ids, (id) => !Str.startsWith("live-")(id)).map(
      (id) => `live scenario "${id}" is not named live-`,
    ),
    Arr.filter(
      list,
      (scenario) => !Arr.contains(headlessCapabilities, scenario.capability),
    ).map(
      (scenario) =>
        `no headless scenario covers "${scenario.capability}" (live "${scenario.id}")`,
    ),
  ]);
};
```

Notes for the executor:

- Match the headless `scenarioProblems` shape (`apps/playground/src/scenarios/
  index.ts`) — `Arr.flatten`, one message per problem, no `any`, no `throw`.
- `RegisteredScenario` is a structural port on purpose: the test can feed
  synthetic entries without constructing a `LiveScenario` (which needs a view).
- Do **not** import `./scenarios.js` here; that module mounts the app and would
  make the rule unimportable without React.

### 2.2 `apps/playground/src/live/scenarios.test.ts` (new)

```ts
/**
 * Guards the live registry's integrity.
 *
 * Bug: the live list is hand-maintained, so a duplicate id, an id that does not
 * mark itself as live, or a live capability with no headless twin would make a
 * report claim coverage the suite did not exercise. No other test reads the
 * live registry.
 *
 * Observed two directions (§5): appending one real entry to the live list fails
 * the first test with "live scenario ids are not unique"; removing the guard
 * makes the three synthetic cases pass vacuously.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { liveScenarios } from "./scenarios.js";
import { liveScenarioProblems } from "./scenario-problems.js";
import { scenarios } from "../scenarios/index.js";

const entry = (id: string, capability: "layout" | "focus") => ({
  id,
  capability,
});

describe("liveScenarioProblems", () => {
  it("accepts the real live registry against the headless one", () => {
    expect(liveScenarioProblems(liveScenarios, scenarios)).toEqual([]);
    expect(Arr.length(liveScenarios)).toBeGreaterThan(0);
  });

  it("flags a duplicated live id", () => {
    expect(
      liveScenarioProblems(
        Arr.appendAll(liveScenarios, Arr.take(liveScenarios, 1)),
        scenarios,
      ),
    ).toContain("live scenario ids are not unique");
  });

  it("flags an id that does not mark the live suite", () => {
    expect(
      liveScenarioProblems([entry("theme-switch", "layout")], scenarios),
    ).toContain('live scenario "theme-switch" is not named live-');
  });

  it("flags a live capability the headless suite never mounts", () => {
    const headless = Arr.filter(
      scenarios,
      (scenario) => scenario.capability !== "focus",
    );
    expect(liveScenarioProblems([entry("live-x", "focus")], headless)).toContain(
      'no headless scenario covers "focus" (live "live-x")',
    );
  });
});
```

Adjust the synthetic `entry` helper's capability union to whatever `Smoke.
Capability` requires (use `"layout"` and `"focus"`/an omitted one — both are in
the union). If TypeScript cannot infer the literal, annotate the return type as
`RegisteredScenario`.

### 2.3 `apps/playground/README.md`

Add one short subsection beside "The registry is the single source of truth"
(§"Run it" / §"The shell itself"):

- the live list has the same guard: unique, `live-`-prefixed ids and every
  capability also mounted headlessly (`liveScenarioProblems`, 4 tests);
- update the two stale live totals in "What is proven here, honestly"
  (`75/75` and "the registry is **86**") to the gate's measured numbers and the
  current head, exactly once, from the report.

### 2.4 `TODO.md`

- Tick the gate task added below (a new row at the top of the playground
  section) with the measured counts, duration, exit codes and the exact ids
  exercised (the whole registries; focused ids before the run: none).
- Update the `[~]` promotion row's addendum: replace "only `live-roving-focus`
  has been run on this head" with the final gate's numbers, so the
  owner/supervisor merges a head whose gate is recorded.

### 2.5 `.agents/slop/plans/README.md`

Add `639` to the playground table with a one-line landed status, and record the
number in the playground numbering paragraph.

## 3. Commands and expected results

Run everything from the worktree root
(`/Users/cyberistic/GPUIXUI/workspaces/playground`) with `nub`.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter playground test` | the playground suite passes; test count grows by **4** (the new file). Record the exact total. |
| 2 | `nub run --filter playground build` | exit `0`; `dist/smoke/run.js` and `dist/live/run.js` rebuilt with the guard. |
| 3 | `nub apps/playground/dist/smoke/run.js --list \| wc -l` | `104` |
| 4 | `nub apps/playground/dist/live/run.js --list \| wc -l` | `91` |
| 5 | `nub apps/playground/dist/smoke/run.js` | exit `0`, `104/104 scenarios passed`, every capability `verified`; `.artifacts/smoke-report.json` written. Record checks + capabilities. |
| 6 | `nub apps/playground/dist/live/run.js --all` | exit `0`, `91/91 scenarios passed`; `.artifacts/live-report.json` written. Record checks, capabilities and duration (expect ~880–950 s). **This is the merge gate.** |
| 7 | `nub run check` | `check:tests` + lint + fmt + `check-types` all pass. |
| 8 | `nub run lint` | exit `0`. |
| 9 | `nub run test` | every workspace suite passes; record the per-package counts. |

Do **not** run step 6 before steps 1–4 pass: a red guard makes the gate
meaningless. Do not run the live suite twice "to be sure" unless step 6 fails
with a scenario that looks timing-related; one green full run is the gate.

## 4. STOP conditions

Stop and report with the command output — do not widen a tolerance, drop a
check, or re-run until green — if:

1. `liveScenarioProblems(liveScenarios, scenarios)` is non-empty for the real
   registry. That is a real registry defect; name the entries and fix the list
   (or the rule, if the rule is wrong) in a follow-up plan, not by weakening the
   test.
2. The full headless suite fails. Name the scenario and its first failing
   check; triage it as a regression against the plan that owns the scenario.
3. The full live suite fails on a scenario that passes focused **and** the
   failure is not reproducible focused twice. Record it as a gate flake, keep
   the red report, and follow the owning plan's hardening rule (a bounded
   `waitFor`, a real-time budget, a settle) — never remove the check.
4. The live run exits `2` (no window). Re-run once; if it persists, record that
   the gate could not run on this host and leave the promotion row unticked.
5. A gate failure needs a change in a path outside this workstream. Record it
   in `TODO.md` as a cross-team task and do not edit that path.

## 5. Test plan and two-direction proof

**Unit (the new file).** The four tests above. They have to be able to fail:

- **Forward:** with the guard in place and the real registry, all four pass.
- **Reverse 1 (real registry):** temporarily append `Arr.take(liveScenarios, 1)`
  to `liveScenarios` in `scenarios.tsx`, run
  `nub run --filter playground test` → the first test fails with
  `live scenario ids are not unique`. Revert.
- **Reverse 2 (the rule is load-bearing):** make `liveScenarioProblems` return
  `[]` → the three synthetic tests fail. Revert.
- Record the exact observed messages in the plan's landed status.

**Gate (the integration proof).** A green full headless and full live run are
the two-direction evidence for the registry/harness changes: the guard's real
case is the live run, and the gate's count (`91`) is the number the guard
accepts.

**Not claimed:** the live gate does not prove colour or the accessibility dump
(no `style`/a11y method live — plan `197`), and it still uses the locally built
`darwin-x64` binding (ADR `0003`), not the published binary.

## 6. Ledger updates

- `apps/playground/README.md`: the registry-integrity paragraph and the current
  total in "What is proven here, honestly" (`91` live, the gate's check count
  and date). Remove the "the next run must cover all 86" sentence.
- `TODO.md`: the gate row ticked with numbers; the promotion row's addendum
  updated (not the promotion itself — the owner merges).
- `.agents/slop/plans/README.md`: `639` landed with counts.
- `COMPONENTS.md`: only if a capability verdict changes. It should not: no
  capability is added, and the table already cites `live-roving-focus` under
  `focus`. If the gate makes a verdict fail, follow §4.

## 7. Acceptance

- [x] `liveScenarioProblems` exists, is pure, and is exported with the four
      unit tests; the real registry passes it.
- [x] Reverse 1 and reverse 2 were observed and reverted; the messages are
      recorded.
- [x] Headless full suite: `104/104`, exit `0`, every capability `verified`.
- [x] Live full suite: `91/91`, exit `0`, with `live-roving-focus` and the
      plan-633/624 ids included.
- [x] `nub run check`, `nub run lint`, `nub run test` pass; the per-package
      counts are in `TODO.md`.
- [x] The three ledgers name the gate's numbers, not an earlier run.
- [x] Committed on `agent/playground` and pushed to `origin`.

## 8. Landed (2026-10-19)

**Files.** New `apps/playground/src/live/scenario-problems.ts` and
`apps/playground/src/live/scenarios.test.ts`; `apps/playground/README.md`,
`TODO.md`, `COMPONENTS.md` and this index updated.

**Unit.** `nub exec vitest run src/live/scenarios.test.ts` → 4/4 passed. The
whole playground suite is **36 files / 428 tests** (was 424).

**Reverse proof 1 (real registry).** Appending `selectionSignal` a second time
to `liveScenarios` failed the first test with exactly:

```
expected [ 'live scenario ids are not unique' ] to deeply equal []
```

Reverted; 4/4 green again.

**Reverse proof 2 (the rule is load-bearing).** Making `liveScenarioProblems`
return `[]` failed the three synthetic tests — `flags a duplicated live id`,
`flags an id that does not mark the live suite` and `flags a live capability
the headless suite never mounts` — with `Tests 3 failed | 1 passed`. Reverted;
4/4 green.

**Headless gate.** `nub apps/playground/dist/smoke/run.js` → `104/104 scenarios
passed`, exit `0`, **3695 checks**, 64 capabilities,
`host = gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288,
zed 81c99f81, runtime shaders)`.

**Live merge gate.** `nub apps/playground/dist/live/run.js --all` → `91/91
scenarios passed`, exit `0`, **2369 checks**, 59 capabilities, **942.6 s**,
including `live-roving-focus` (12.7 s), `live-tier2-navigation` and
`live-text-entry`.

**Quality gates.** `nub run check` (tests checked, lint, fmt, all type-checks),
`nub run lint` and `nub run test` all exit `0`: tokens 196, testing 61, docs 7,
icons 19, tw 103, components 308, primitives 282, playground 428.

**Not claimed.** Colour and the accessibility dump remain headless (plan `197`);
the binding is the locally built `darwin-x64` artifact (ADR `0003`), so the
Apple Silicon published-binary CI run is still the gold standard.

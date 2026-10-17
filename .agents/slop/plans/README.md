# Implementation Plans

**This directory is the swarm's first deliverable.** No implementation work
starts until the plan set below exists and is indexed here.

Each plan is **self-contained for a weaker executor**. That means, at minimum:

- the exact files to create or change, and their exact paths;
- the exact commands to run, and the expected result of each;
- **STOP conditions** — the point at which the executor must stop and report
  rather than improvise;
- a **test plan** — which tests to write, what they must be able to catch, and
  how to prove the test fails without the fix;
- the acceptance criteria that let the executor say "done".

Naming: `NNN-kebab-title.md`, numbered in dependency order. One plan per phase,
one per package, plus a plan for each cross-cutting concern (native smoke test,
licensing, docs site).

**Number ranges by workstream**, so parallel agents cannot collide:
`000–099` cross-cutting/platform, `100–199` playground (`apps/playground`,
`packages/testing`), `200–299` tokens+theme, `300–399` primitives+icons,
`400–499` components, `500–599` docs site. Take the next free number in your
range.

## The plan set

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| `100` | `packages/testing` — the platform-free smoke harness | B | — | **landed** (`packages/testing` green on this host) |
| `110` | The native smoke test (cross-cutting) | B | 100, 120 | 0.10 suite exits 2 on this host (ADR 0001); the 0.5.1 legacy probe is landed at `apps/playground/legacy-probe` (ADR 0002) |
| `120` | `apps/playground` — native playground + smoke runner | B | 100 | **landed**: shell, `SplitPane`, 8 scenarios, CLI; `smoke` exits `2` on this host with the ADR 0001 evidence and writes no report (§2.1 of the plan records the API deviations) |
| `130` | Tier 3/4 feasibility probes | B→D | 100, 110, 120 | **landed**: `table-select-sort`, `table-column-resize`, `workspace-tab-drag` registered (§3 records the deviations); verdicts need a supported host |
| `140` | Build the `darwin-x64` GPUix binding from source (blocker B1) | B | 110, 120, 130 | **landed**: the binding builds with `gpui_macos/runtime_shaders` (no `xcrun metal`) and loads; the suite is **11/11 green on this host**, exit `0` (§4 records every measured fact) |

Cross-cutting records:

- `.agents/adr/0001-native-smoke-host.md` — the 0.10.0 binding gap and what it
  means for every `done` row (superseded in part).
- `.agents/adr/0002-two-gpuix-versions.md` — the library targets 0.10.0; 0.5.1
  is the newest version that runs on this Intel Mac, and the measured matrix of
  what it does and does not verify (focus and wheel scroll are the gaps).

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.

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

## The plan set

Numbering is by dependency order; gaps are left for other workstreams. The table
is the authority on order, not the file name.

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [020](020-gpuix-runtime-capability.md) | GPUix runtime capability map and verification strategy | A | — | **done (recon); runtime verification BLOCKED — read §3** |
| [022](022-swarm-single-writer.md) | One writer per worktree — the swarm is running duplicate agents | infra | — | **BLOCKER B3 — read §3 before writing anything** |
| [030](030-primitives-package.md) | `packages/primitives` — render primitives + Tier 1 components | B/C | 020 | **implemented** — all 19 Tier 1 components + `core/` + element-tree suites; docs pages and `examples/basic-app` pending; read §9 (the §2.2/§3 file lists are superseded by the shipped tree) |
| [031](031-icons-package.md) | `packages/icons` — icon set, sizing, accessibility | B | 020 | **done** (47 icons, 18 tests proven in both directions; on-screen paint unverified — 020 §3) |
| [040](040-phase-c-tier1.md) | Phase C: Tier 1 foundational components (primitives workstream) | C | 030, 031 | **in progress** — code + tests + inventory done; example, docs pages and runtime verification outstanding |
| [041](041-tier1-runtime-verification.md) | Tier 1 in the real GPUix runtime (primitives workstream) | C | 030, 031, 040, **140** | **done** — 46 `test:runtime` tests in `packages/primitives/runtime/` (icons included there, §2.2); measured results and the two-direction proof in §9 |
| [042](042-tier1-theme-verification.md) | Tier 1 in both themes, and a live theme switch | C | 030, 040, 041 | **done** — 5 `test:runtime` tests incl. a repaint-on-switch proof; results in §8 |
| [043](043-presentational-testid.md) | `testId` parity for the presentational primitives | C | 030, 041 | **done** — `Text`/`Separator`/`Spacer` accept and forward it; both-direction proof in §6 |
| [044](044-radio-skip-disabled.md) | A radio group must skip disabled options | C | 030, 041 | **done** — `decideMove` takes an optional `isDisabled`; measured regression proof in §6 |
| [045](045-labelledby-prop.md) | `labelledBy` must return the prop the controls read | C | 030, 040 | **done** — returns `{ label }`; the old return type named nothing; measured proof in §6 |
| [046](046-textarea-no-submit.md) | `TextArea` must not accept `onSubmit` | C | 030, 040, 041 | **done** — the runtime trades the newline for a submit; measured probe in §6 |
| [047](047-tier1-docs-and-examples.md) | Tier 1 docs pages and runnable examples | C | 030, 031, 040, 041 | **done** — 21 primitives pages + the icons page, six composed examples, and a 7-file/60-test runtime run that mounts every example (§8) |
| [048](048-tier1-fixable-limitations.md) | Three fixable Tier 1 limitations | C | 030, 040, 041, 047 | **done** — named `ButtonGroup`, `ScrollArea` deltas, RadioGroup Home/End; measured both directions in §7 (64 runtime tests) |
| — | `packages/tokens` (tokens-theme) | B | — | not written here |
| — | `packages/components` (components) | C/D | 030 | not written here |
| — | `apps/playground` + `packages/testing` + the native smoke test (playground) | B | 020 | not written here |
| — | `apps/docs` Fumadocs site (docs-site) | B–F | — | not written here |

### The runtime blocker (D7 / B1) is fixed — read plan 140 before claiming anything

`020-gpuix-runtime-capability.md` §3 recorded the measured evidence that this box
is **Intel macOS**, GPUix publishes **no `darwin-x64` native binary**, and this
SSH session has **no Aqua session** — so no GPUix component could be rendered,
clicked or focused here.

That changed on 2026-10-17. **`140-gpuix-native-darwin-x64-build.md`
(playground workstream) built `@gpuix/native@0.10.0` from source on this host**
with `gpui_macos/runtime_shaders` (the `xcrun metal` step is optional), and the
playground's native suite is **11/11 green** against it: layout, text, input,
focus, overlay, scroll, panel, virtual-list, table and workspace are all
`verified 0.10.0`, with nine screenshots and `smoke-report.json` as evidence.

Two consequences for this workstream:

- the artifact is present in every worktree's `node_modules` (one shareable
  store), so `packages/primitives` and `packages/icons` can run the **real**
  `TestRenderer` — see `041-tier1-runtime-verification.md`;
- the verdict's provenance is a **locally-built** binding, and `nub run test`
  still runs on a host without any binding. A row may only cite the runtime when
  this workstream's `test:runtime` run produced the observation, and the
  gold-standard confirmation on the *published* binary is the CI task in
  `TODO.md` (playground workstream).

### Prerequisite for the whole swarm: one writer per worktree

`022-swarm-single-writer.md` records the measured fact that the supervisor is
running **several live agents per worktree** (5 for `primitives` alone), so they
clobber each other's files. Its §4 mitigation was applied to the `primitives`
tree on 2026-10-17 08:40 (the duplicate session was deleted after the tree was
committed) and the tree went green afterwards. **The fix itself is still
unlanded:** `scripts/swarm-supervisor.sh`'s runner loops `opencode run` without a
stable `--session`, so every loop iteration that returns early leaves a live turn
and the next iteration forks another. Until §5.1 lands in the shared `scripts/`,
every workstream will re-acquire a duplicate. Read its §3 first.

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
6. **Read `020-gpuix-runtime-capability.md` §3 before promising any component is
   verified.** The native runtime cannot run in this environment; the honest
   paths to verification are listed there.

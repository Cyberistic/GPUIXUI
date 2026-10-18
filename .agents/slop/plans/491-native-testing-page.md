# 491 — The native smoke suite gets a real documentation page

**Workstream:** docs-site · **Phase:** F/G · **Depends on:** 410, 412, 448, 470, 490;
playground plans `100`/`110`/`140`

## 1. The gap this closes

`@gpuixui/testing` ships (playground workstream) and is the reason every
`COMPONENTS.md` row can say `verified 0.10.0`. The docs site mentions it twice:

- `apps/docs/content/docs/architecture.mdx` — one bullet, no link;
- `apps/docs/content/docs/contributing.mdx` — not at all.

Nothing on the site says what the harness is, how to run it, what the exit codes
mean, how to write a scenario, or what the suite does **not** prove. The package
README has this for package developers, but a contributor reading the docs cannot
reach it. `apps/docs/src/lib/api-values.ts` even points the reader at
"Contributing" for the harness runs, and Contributing does not contain them.

This plan adds one docs page, `/docs/native-testing`, guarded against the package
it documents, and makes the existing cross-reference true.

## 2. Files to create

### 2.1 `apps/docs/content/docs/native-testing.mdx`

Frontmatter:

```mdx
---
title: Native smoke suite
description: The platform-free harness and the playground adapter that prove GPUix behaviour.
---
```

Sections, in this order (write real prose, no placeholder text):

1. **The two halves.** A table:

   | Half | Package | May import GPUix | Runs on |
   | ---- | ------- | ---------------- | ------- |
   | platform-free | `@gpuixui/testing` | no | any host |
   | native adapter | `apps/playground` | yes | a host with the 0.10.0 binding |

   State plainly that the split exists so the model, report and preflight tests
   run where no binding exists, and that a browser preview is **not** evidence.

2. **Run it.** Real commands (fenced `sh`):

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js

   # one scenario
   nub apps/playground/dist/smoke/run.js --only floating-placement

   # build and run in one step
   nub run --filter playground smoke
   ```

   Explain the exit-code contract precisely:

   - `Report.exitCode` returns `0` when at least one scenario ran and all passed,
     `1` otherwise (see `packages/testing/src/report.ts`);
   - the playground CLI returns `2` **before running anything** when no binding
     loaded (`EXIT.unverified`, `apps/playground/src/smoke/run.ts`), because that
     is no evidence rather than a pass;
   - `2` is never a pass.

3. **The host boundary.** A table of `SmokeHost` responsibilities: text /
   painted text / bounds / painted style / focus / click / window click / key /
   focus traversal / wheel / drag / scroll offset / screenshot / advance. Explain
   `paintedStyle` is the runtime's own style report decoded at the adapter, not a
   screenshot guess.

4. **The check model.** `SmokeScenario` is one capability, one view, one `steps`
   effect. `SmokeContext` gives `expectEqual`, `expectNear`, `expectContains`,
   `expectSome` and `check`; a failed assertion becomes `Failed` data, a defect
   becomes `Errored`, and the next scenario still runs. A report's capability
   verdict is `verified` or `failed`; "unverified" is the absence of a report
   (`exit 2`), not a row inside one.

5. **Write a scenario.** Include one real scenario file and walk through it:

   ```mdx
   <include lang="tsx" meta='title="apps/playground/src/scenarios/layout.tsx"'>
     ../../../../apps/playground/src/scenarios/layout.tsx
   </include>
   ```

   Note the two rules the example demonstrates: assert on measured bounds within
   a tolerance, and never touch `@gpuix` from a scenario.

6. **What the report says.** A small table for `Report.formatReport`,
   `Report.reportJson`, `Report.passed`, `Report.exitCode`; say the JSON goes
   through its schema (`Schema.fromJsonString`) so it can be decoded back.

7. **Preflight.** `Runtime.detectRuntime` never fails; it returns `RuntimeReady`
   or `RuntimeUnsupported` with a `bindingHint`. Link to
   [GPUix capabilities](/docs/capabilities) for the measured results and to
   [Contributing](/docs/contributing) for the release gates.

8. **What it does not prove.** One list: no browser renderer is evidence; a
   screenshot is an artifact, not an assertion; scenarios are capability probes,
   not a screen per component; a locally built binding is not the published one
   (ADR 0003); a skipped or `exit 2` run upgrades no `COMPONENTS.md` row.

9. **Source.** Include the entry point:

   ```mdx
   <include lang="ts" meta='title="packages/testing/src/index.ts"'>
     ../../../../packages/testing/src/index.ts
   </include>
   ```

10. **Related.** Links to `/docs/capabilities`, `/docs/contributing`,
    `/docs/components` and `/docs/examples`.

### 2.2 `apps/docs/src/native-testing.test.ts`

A vitest guard (read files with `node:fs`; this app has no Effect runtime). Header
comment must state the bug: *the harness had no page, so its exit codes, scenario
model and limits were only in a package README*.

It reads:

- `apps/docs/content/docs/native-testing.mdx`
- `packages/testing/src/index.ts`
- `packages/testing/src/report.ts`
- `apps/playground/src/smoke/run.ts`
- `apps/docs/content/docs/contributing.mdx`
- `apps/docs/src/lib/api-values.ts`
- every `apps/*/package.json` and `packages/*/package.json`

and asserts:

1. **Namespaces.** Parse `export * as (\w+)` from the testing entry; expect
   exactly `["Report", "Runtime", "Smoke"]`, and assert each name appears on the
   page. A new namespace projection fails until the page names it.
2. **Commands resolve.** Parse every `nub run --filter <package> <script>` from
   the page; for each, find the workspace whose `package.json` `name` matches and
   assert its `scripts` object has `<script>`. A renamed script fails by name.
3. **Exit-code contract.** The CLI source still contains `unverified: 2`; the
   page still says `Report.exitCode`, `0`, `1`, `2`, and `unverified`.
4. **Reachability.** `contributing.mdx` links `/docs/native-testing`; the page
   links `/docs/capabilities`, `/docs/contributing` and `/docs/components`.
5. **Real source.** The page includes
   `packages/testing/src/index.ts` and
   `apps/playground/src/scenarios/layout.tsx`, and both files exist.
6. **The exclusion pointer is true.** The `@gpuixui/testing` entry in
   `EXCLUDED_ENTRIES` names "Native smoke suite", so the Values API exclusion
   points at the page that now explains the harness.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/meta.json` | add `"native-testing"` after `"capabilities"` |
| `apps/docs/content/docs/architecture.mdx` | link the `@gpuixui/testing` bullet to `/docs/native-testing` |
| `apps/docs/content/docs/contributing.mdx` | add a **Native smoke suite** subsection linking the page and stating `0`/`1`/`2`; `2` is never a pass |
| `apps/docs/content/docs/api-values.mdx` | the `@gpuixui/testing` sentence links the new page instead of saying the runs are on Contributing |
| `apps/docs/src/lib/api-values.ts` | `EXCLUDED_ENTRIES` reason for `@gpuixui/testing` says its subject is documented on the Native smoke suite page |
| `.agents/slop/plans/README.md` | add this plan |
| `TODO.md` | add and tick the task in the docs-site block |

Do **not** edit `packages/testing`, `apps/playground` or any package README.
Their page/documentation changes are another workstream's.

## 4. Exact commands and expected results

Run from the worktree root:

```sh
nub run --filter docs test
```

Expected: all files pass, including the new `src/native-testing.test.ts`.

```sh
nub run --filter docs check-types
```

Expected: exit `0`.

```sh
nub run --filter docs build
```

Expected: exit `0`; `native-testing` appears in the built sitemap/route output.

```sh
nub run --filter docs smoke:build
```

Expected: exit `0` (or `2` only if the smoke cannot start; `2` is not a pass —
report it). The crawl must include `/docs/native-testing`.

```sh
nub run check
nub run lint
nub run test
```

Expected: exit `0` for each. If a failure is outside `apps/docs`, STOP and report
the workspace; do not edit it.

## 5. Two-direction proofs (record these in the final report)

1. Delete `Smoke` from the page table → `native-testing.test.ts` fails naming
   `Smoke`; restore.
2. Change `nub run --filter playground smoke` on the page to `smoke2` → the
   command guard fails naming `playground`/`smoke2`; restore.
3. Remove the `/docs/native-testing` link from `contributing.mdx` → the
   reachability guard fails; restore.
4. Remove the `2` exit-code sentence from the page → the contract guard fails;
   restore.

Each proof is run and its output captured; none is asserted from memory.

## 6. STOP conditions

Stop and report instead of improvising if:

- `packages/testing` no longer exports exactly the three namespaces (the package
  changed). Read the real entry and update the **plan** first; do not weaken the
  guard to pass.
- The include path does not resolve under `content-references.test.ts`. Check the
  relative depth; do not inline a copy of the source.
- `smoke:build` exits `2` because no browser/server is available. That is not a
  pass; report it and leave the check unrun.
- A gate fails in another workspace. Report the failing workspace; do not edit it.
- The page would have to claim a per-component native screen exists. It does not;
  keep the honest limitation text.

## 7. Acceptance criteria

- `/docs/native-testing` exists in the sidebar between Capabilities and Theming.
- It names the harness's three namespaces, the real commands, the `0`/`1`/`2`
  contract, the host boundary, the check model, one real scenario and the limits.
- `contributing.mdx`, `architecture.mdx`, `api-values.mdx` and the API-values
  policy all point at the page truthfully.
- `src/native-testing.test.ts` passes and four two-direction proofs are recorded.
- `nub run --filter docs test`, `check-types`, `build`, `nub run check`,
  `nub run lint`, `nub run test` pass (or a failure is reported with the owning
  workspace).
- `TODO.md` is ticked and the plan index status is `implemented`.

## 8. Results

Measured on 2026-10-18 in `workspaces/docs-site`:

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 52 files / 342 tests passed |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0`; `native-testing` chunk emitted |
| `nub run --filter docs smoke:build` | exit `0`; sitemap 90 pages, 109 links, search, 404, robots |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` (all workspaces) |

Two-direction proofs, each run against only
`src/native-testing.test.ts` and then restored:

1. Renamed `SmokeHost` (and the other two `Smoke*` identifiers) → the namespace
   test failed with `expected [ 'Smoke' ] to deeply equal []`; restored, 6/6.
2. Changed `playground smoke` to `playground smoke2` → the command test failed
   with `[ 'playground smoke2' ]`; restored.
3. Changed the Contributing link to `/docs/native-testing-typo` → the
   reachability test failed with the missing `(/docs/native-testing)`; restored.
4. Replaced `exit 2` in the page with `unverified` → the contract test failed
   with the missing `exit 2`; restored.

One note for the next executor: the proofs must not run under `set -e`. The test
command exits `1` by design, and `set -e` aborts before the backup restore; proof
1 did exactly that and the identifiers had to be restored by hand. Restore in the
same command unconditionally.

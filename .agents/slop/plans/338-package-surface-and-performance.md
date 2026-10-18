# 338 — Package surface truth and a performance baseline

**Phase:** F (integration, packaging, performance) · **Owner:** components
workstream (`packages/components`) · **Depends on:** 110, 117, 330, 336, 337.

**Claimed from:** `TODO.md` → Phase F → "Performance and packaging".

**Status when written:** the package's export map is

```json
"exports": { ".": "./src/index.ts", "./validation/logic": "./src/validation/logic.ts", "./*": "./src/*.tsx" }
```

The wildcard makes every deep path a public API and maps it to a `.tsx` file.
Measured on this host (`node --input-type=module -e 'import.meta.resolve(...)'`):

| Specifier | Resolves to | Public? |
| --------- | ----------- | ------- |
| `@gpuixui/components/card` | `src/card.tsx` | yes |
| `@gpuixui/components/internal/button` | `src/internal/button.tsx` | **no — internals leak** |
| `@gpuixui/components/menu/item` | `src/menu/item.tsx` | **no — internal part** |
| `@gpuixui/components/runtime.test` | `src/runtime.test.tsx` | **no — test module** |
| `@gpuixui/components/toast/store` | `src/toast/store.tsx` (**does not exist**) | the 336 bug class |
| `@gpuixui/components/validation/logic` | `src/validation/logic.ts` | yes (explicit) |

So the package has no enumerable public surface: a consumer can address
implementation details, a test file, and paths that do not exist. Nothing checks
the manifest against the source's imports either, so a component can start
depending on a package the manifest does not declare. And the package has never
had a measured performance baseline, so "performance" is an opinion rather than
a fact.

## 1. The rules

> 1. The public surface is **explicit**: one export entry per public module.
>    No wildcard, no internals, no test files, no `.ts` module the docs do not
>    document.
> 2. Every bare import in runtime source is declared in `dependencies` or
>    `peerDependencies`. `node:*` and test-only packages stay in tests.
> 3. A roving-focus move on a 1,000-row list is measured and recorded; the
>    known cost is stated as a limitation, not implied away.

## 2. Exact changes

### 2.1 `packages/components/package.json` — explicit exports

Replace the `exports` block with the 43 public modules (the `src/*.tsx` modules
that are not tests) plus `./validation/logic`. Keep `.` first. Do **not** add
`./internal/*`, `./menu/*`, `./toast/*`, `./list/*` or any `*.test.*`.

The list is generated from `src/*.tsx` (basenames, alphabetical) so the plan's
executor can regenerate it with:

```sh
ls packages/components/src/*.tsx | sed 's#.*/##; s#\.tsx$##' | grep -v test | sort
```

Expected: `accordion alert avatar badge breadcrumb carousel card chat collapsible
color-picker combobox command-menu confirm-dialog context-menu countdown
date-picker dialog drawer dropdown-menu empty-state field fieldset form
hotkey-recorder inline-edit keyboard-shortcuts list mention-input message
message-scroller navigation-menu pagination popover preview-card search-input
stepper tabs tag-input timeline time-picker toast` (42) — plus
`validation/logic` (the 43rd entry, a documented `.ts` module).

Each entry is `"./<stem>": "./src/<stem>.tsx"`, and
`"./validation/logic": "./src/validation/logic.ts"`.

### 2.2 `packages/components/src/exports.test.ts` — hold the surface

Extend the existing suite with three checks (keep the two it has):

1. **Every export target exists.** Read `package.json`'s `exports`, resolve each
   relative target from the package root, `existsSync`. This is the existing
   check generalised from "documented specifiers" to the whole map.
2. **Every public module has an entry.** For every `src/*.tsx` that is not a
   test and not `index`, assert `exports` contains `"./<stem>"` pointing at
   `./src/<stem>.tsx`.
3. **Nothing private is addressable.** Assert every target is under `src/`, is
   not `.test.`, and is not under `src/internal/`, `src/menu/`, `src/list/`,
   `src/toast/`, `src/combobox/`, `src/date-picker/`, `src/time-picker/`,
   `src/command-menu/`, `src/tag-input/`, `src/mention/`, `src/hotkey/`,
   `src/shortcut/`, `src/color/`, `src/core/`, `src/validation/` except the one
   documented `validation/logic` entry. Add an assertion that
   `import.meta.resolve("@gpuixui/components/internal/button")` throws, which
   fails today.

Header comment states the bug guarded: a wildcard export exposed internals and
a test module, and mapped `.ts` modules to a non-existent `.tsx`.

### 2.3 `packages/components/src/manifest.test.ts` (new)

A repository check (test-only `node:fs`, like `inventory.test.ts`).

1. Walk `src/**/*.ts(x)`, skipping `*.test.ts(x)`, `src/behaviour/**` and
   `src/testing/**`-style helpers only if they are test-only (they are not here).
2. Collect every `from "<specifier>"` and `import("<specifier>")`.
3. For each bare specifier, take the package name (`@scope/name` or `name`) and
   assert it is a key of `dependencies` or `peerDependencies`. Relative
   specifiers are skipped. `node:` specifiers must not appear in runtime source
   at all.
4. Assert no runtime source imports `apps/…`, `packages/data-grid`,
   `packages/docking`, `packages/editor` or `react-dom`.

Header comment: the manifest did not have to be true; a component could import a
package no consumer installs. The check is the boundary law of plan 110 §2.

### 2.4 Performance: measure, record, guard the ceiling

Add a **third** vitest project, deliberately outside both gates:

- `packages/components/vitest.perf.config.ts` — like the behaviour config
  (`environment: "node"`, `pool: "forks"`, `fileParallelism: false`,
  `testTimeout: 120_000`), `include: ["src/perf/**/*.test.tsx"]`, the same
  teardown.
- `packages/components/package.json` — `"test:perf": "vitest run --config vitest.perf.config.ts"`.
- `packages/components/src/perf/list.test.tsx` — render a 1,000-row `List`
  (multiple selection) under the real renderer and measure, with
  `performance.now()` around:
  - mount,
  - one `ArrowDown` roving move,
  - one full re-render with unchanged state.
  Assert only a **ceiling** (mount < 10 s; a move < 5 s) so the suite catches an
  order-of-magnitude regression (an accidental quadratic per-row scan, a render
  loop) without turning host load into a failure — plan 327's lesson. The test
  also asserts the focus actually moved, so a suite that measured nothing
  cannot pass.
- `packages/components/docs/performance.md` — the measured table, the method
  (command, host, renderer), and the known limitation: with 1,000 rows a
  roving-focus move repaints every row because `ListItem` reads active/selected
  from one context; virtualise large collections today, and the row-level
  subscription refactor is a follow-up (recorded in `TODO.md`, not hidden).
- `packages/components/README.md` — one line under Commands and one row in
  "What is here" pointing at `docs/performance.md`.
- `COMPONENTS.md` → Lists row — append the measured figure and the
  "every row repaints on a focus move; virtualise at scale" limitation.

### 2.5 Docs truth

`docs/performance.md` must state the real command and real numbers. Add it to
the `packages/components/docs` set only; no docs-site change (owned there).

## 3. Commands and expected results

Run from `packages/components` unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/components test -- exports` | **fails before 2.1/2.2** with `internal/button` resolvable and/or a missing explicit entry |
| `nub run --filter @gpuixui/components test -- exports` | passes after |
| `nub run --filter @gpuixui/components test -- manifest` | passes; fails after temporarily importing `node:fs` in `src/card.tsx` |
| `nub run --filter @gpuixui/components test:perf` | passes; prints/writes the measured table via the assertion messages only on failure |
| `nub run --filter @gpuixui/components test` | all unit suites pass (340 + new) |
| `nub run --filter @gpuixui/components test:behaviour` | 517 unchanged |
| `nub run check && nub run lint && nub run test` (root) | green |

## 4. Test plan (and the both-direction proofs)

1. **Write the new export assertions first** and run them: they must fail on
   today's manifest, naming `@gpuixui/components/internal/button` (resolvable)
   and every public module without an explicit entry.
2. Apply §2.1; the same command passes.
3. **Both directions, surface:** delete one explicit entry (e.g. `./badge`) →
   check 2 fails naming `badge`; restore. Add `"./internal/button"` back → check
   3 fails; restore. Point `./card` at `src/card.ts` → check 1 fails; restore.
4. **Both directions, manifest:** add `import { readFileSync } from "node:fs"`
   to `src/card.tsx` → fails naming `node:fs`; restore. Add
   `import * as DataGrid from "@gpuixui/data-grid"` → fails naming the package;
   restore.
5. **Perf suite:** run it; record the numbers in `docs/performance.md`. Prove
   the ceiling assertion is live by temporarily lowering the mount ceiling
   below the measured value → the test fails; restore.
6. Run every gate in §3 and paste the real counts into the plan outcome.

## 5. STOP conditions

- A documented specifier other than `validation/logic` points at a `.ts` module
  or an internal path → **STOP**, list it, and decide with the docs (the docs
  must not promise an internal).
- The explicit export list cannot be generated without adding a non-public
  module (e.g. `toast/store` used by docs) → **STOP**; do not widen the surface
  silently.
- The manifest check finds a real undeclared dependency → **STOP** and report;
  adding the dependency is a deliberate decision, not a typo fix.
- The native renderer is unavailable → the perf suite cannot run; **STOP** the
  performance half, record `unsupported-host`, and ship only the packaging half
  (the plan is still complete without a fabricated measurement).
- A perf number is more than 10× the baseline in §6 → **STOP** and report the
  regression rather than raising the ceiling.

## 6. Acceptance

- `@gpuixui/components/internal/button`, `.../runtime.test` and
  `.../toast/store` no longer resolve; every public module does.
- `exports.test.ts` and `manifest.test.ts` fail in both directions above.
- `docs/performance.md` records real numbers from this host and the limitation.
- All gates pass; behaviour suite unchanged.

**Baseline measured 2026-10-18** (1,000 rows, real renderer, this host):
mount ≈ 1.1 s, one `ArrowDown` ≈ 1.0–2.1 s, full re-render ≈ 0.15 s. The move
figure is the limitation: it repaints every row.

## 7. Outcome

Landed on `agent/components` (2026-10-18).

- **Surface.** `package.json` now enumerates 42 component modules plus
  `./validation/logic`; the wildcard is gone. Measured after:
  `import.meta.resolve("@gpuixui/components/internal/button")` and the three
  other private specifiers throw; every documented subpath still resolves.
- **Checks.** `src/exports.test.ts` is 6 cases (was 2): targets exist, every
  public module has one entry, nothing private is addressable, the four private
  specifiers do not resolve, plus the two originals. `src/manifest.test.ts` is
  3 cases: every bare import is declared, no `node:*` in runtime source, no
  cross-boundary import.
- **Both directions.** Removing `./badge` failed with `[ 'badge' ]`; adding
  `./internal/button` failed with that key; `node:fs` in `src/card.tsx` failed
  two checks. All restored.
- **Performance.** `vitest.perf.config.ts` + `src/perf/list.test.tsx`; measured
  mount 1,100 ms, one `ArrowDown` 2,075 ms, re-render 154 ms; ceilings 10 s / 5 s
  / 5 s. `docs/performance.md` records the baseline, the method and the row-repaint
  limitation; `COMPONENTS.md` names it in the Lists row.
- **Gates.** Unit **348** (37 files), behaviour **517**, perf 1;
  `nub run check`, `nub run lint`, `nub run test` green.
- **Follow-up, not claimed:** row-level subscription so a focus move repaints
  two rows instead of all of them — recorded in `TODO.md`.

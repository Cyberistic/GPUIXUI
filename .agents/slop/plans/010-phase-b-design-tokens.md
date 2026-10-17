# 010 — Phase B: design tokens and theming

**Workstream:** `tokens-theme`
**Phase:** B (working foundation)
**Depends on:** 001 (Phase A audit) for the GPUix colour/style capability evidence;
nothing in code — tokens are the bottom of the dependency graph.
**Consumers:** `packages/primitives`, `packages/components`, `packages/icons`,
`packages/data-grid`, `packages/docking`, `packages/editor`, `apps/playground`,
`apps/docs` (read-only import of token values for docs tables).

This plan is the phase slice. The package-level detail lives in
[`011-package-tokens.md`](./011-package-tokens.md); the documentation deliverable
lives in [`012-docs-design-system.md`](./012-docs-design-system.md).

---

## 1. Goal

Land the single source of truth for colour, typography, spacing, radii, density,
elevation, border widths and icon sizes — for both light and dark themes — plus
the extension mechanism that lets an application brand the library without
touching component source.

Phase B exits for this workstream when:

1. `packages/tokens` builds, type-checks and tests with zero runtime
   dependencies in its core entry point.
2. `lightTheme` and `darkTheme` exist, expose the same semantic roles, and are
   proven readable by a contrast test that can fail.
3. `createTheme` / `extendTheme` override any token group without mutating the
   base theme.
4. `@gpuixui/tokens/react` exposes `ThemeProvider` and `useTheme`.
5. `docs/tokens.md` and `docs/design-system.md` document every public token and
   the extension mechanism.
6. `COMPONENTS.md` has a design-system section recording the real status.
7. The native visual proof (a theme gallery in `apps/playground`) is recorded as
   a cross-team task, not faked here.

## 2. Scope and boundaries

In scope (this workstream owns these paths):

```
packages/tokens/**
docs/tokens.md
docs/design-system.md
.agents/slop/plans/010-*.md, 011-*.md, 012-*.md
.agents/slop/plans/README.md (index rows only)
TODO.md (tasks in this workstream only)
COMPONENTS.md (design-system section only)
```

Out of scope — record a task in `TODO.md` instead of editing:

- any file in `packages/primitives`, `packages/components`, `apps/*`,
  `examples/*`, `packages/config`, the root `package.json`;
- a Fumadocs page under `apps/docs` (the docs agent consumes `docs/tokens.md`);
- the native theme gallery screen under `apps/playground` (the playground agent);
- ADRs under `.agents/adr` (the architect/owner decides).

**Boundary law.** `packages/tokens` imports no workspace package. The core entry
(`@gpuixui/tokens`) has no runtime dependency at all. The optional `./react`
entry has `react` as a **peer** dependency; that is the only external runtime
edge and it does not leak into the core entry.

## 3. Why the React provider lives here

The theme shape belongs to tokens. If the provider lived in `primitives`, tokens
could not offer an extension mechanism end to end, and two packages would each
need to know how a theme is resolved. A subpath entry keeps the dependency
optional and directional:

```
@gpuixui/tokens          pure data + pure functions     (no deps)
@gpuixui/tokens/react    context + hooks                (react peer)
primitives/components    import both                    (one direction only)
```

The docs site may import the core entry to render token tables; it never needs
the React entry.

## 4. Work breakdown

| # | Task | Deliverable | Depends on |
| - | ---- | ----------- | ---------- |
| T1 | Write and index the plan set | plans 010–012 + index rows | — |
| T2 | Land `packages/tokens` core | colour roles, type, spacing, radii, density, elevation, light/dark, extension, helpers | T1 |
| T3 | Land the React binding | `ThemeProvider`, `useTheme`, server-render test | T2 |
| T4 | Write repo documentation | `docs/tokens.md`, `docs/design-system.md` | T2, T3 |
| T5 | Inventory + handoffs | `COMPONENTS.md` section; playground/docs tasks in `TODO.md` | T3, T4 |
| T6 | Gates | `nub run check`, `nub run lint`, `nub run test` green; commit | T2–T5 |

## 5. Cross-team handoffs (record, do not implement)

- **Playground agent:** add a `Theme gallery` screen that renders swatches for
  every semantic colour in both themes, the type scale, spacing, radii, density
  comparison, and an in-place light/dark switch. Capture a screenshot as native
  evidence. This is the visual proof for the `COMPONENTS.md` row; until it
  exists the row must say `wip`, not `done`.
- **Docs agent:** consume `docs/tokens.md` into the Fumadocs `Theming` page and
  `docs/design-system.md` into `Architecture`/`Design system`. Link back to the
  repo documents. Do not retype token values; import the package (or generate a
  table) so the site cannot drift.
- **Primitives/components agents:** use `textStyle`, `controlHeight`,
  `controlPaddingX` and semantic colour roles. No literal colours, font sizes,
  radii or control heights in component source.

## 6. Verification

Commands (run from the worktree root):

```sh
nub install
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run lint
nub run fmt
nub run check
nub run test
```

Expected results:

| Command | Expected |
| ------- | -------- |
| `nub install` | resolves the workspace; `packages/tokens/node_modules` exists |
| `check-types` | exit 0, no diagnostics |
| `test` | all token tests pass; report the count in the commit/status |
| `lint` | exit 0 |
| `fmt` | exit 0 |
| `check` | test-quality gate, lint, fmt and type-check all pass |
| `test` (root) | every workspace with a test script passes |

The contrast test is the load-bearing one: it must fail if a semantic pair drops
below its threshold. Prove that direction by temporarily changing one value
(e.g. light `mutedForeground` to `#B9C0CC`), run the test, observe the failure,
restore the value, run again. Record both results in the commit message or the
agent status log. Do not claim two-direction verification without running both.

## 7. STOP conditions

Stop and report (do not improvise) if:

- `nub install` fails (network/registry/auth). Report the exact command and
  error; do not vendor packages or switch package managers.
- `nub` does not understand `catalog:` in a new package. Report the resolution
  error; do not hardcode versions that differ from the root catalog without
  recording why.
- React 19 types cannot be resolved for the `./react` entry. Report; do not add
  `any`, `@ts-ignore`, or move the provider into another package without an
  owner decision.
- A GPUix style field needed by the tokens does not exist (e.g. letter spacing).
  Record the limitation in `docs/design-system.md` and `TODO.md`; do not invent
  a token the runtime cannot paint.
- A gate fails for a reason outside this workstream (e.g. another package's
  type error). Report the failing workspace and leave it untouched.
- A native runtime check would be required to call something `done`. Leave the
  status `wip` and record the playground task.

## 8. Acceptance criteria

- [ ] Plan set exists and is indexed.
- [ ] `@gpuixui/tokens` core has zero runtime dependencies.
- [ ] Light and dark themes expose identical colour role keys, enforced by types.
- [ ] Contrast test covers both themes and at least the pairs listed in plan 011
      §5; it has been shown to fail when a colour regresses.
- [ ] `extendTheme` does not mutate its base; nested typography overrides merge.
- [ ] `@gpuixui/tokens/react` provider/consumer test passes.
- [ ] Every exported token and helper has JSDoc.
- [ ] `docs/tokens.md` and `docs/design-system.md` are complete and cross-linked.
- [ ] `COMPONENTS.md` design-system rows are honest (`wip` until native proof).
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.

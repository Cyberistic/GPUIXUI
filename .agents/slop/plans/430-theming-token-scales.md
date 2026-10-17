# 430 — Theming page completeness: render every token group from the package

- **Workstream:** docs-site
- **Phase:** F (documentation completeness)
- **Status:** implemented — see §7.
- **Owns:** `apps/docs/src/components/token-scales.tsx` (new),
  `apps/docs/src/components/token-scales.test.tsx` (new),
  `apps/docs/src/components/mdx.tsx`, `apps/docs/content/docs/theming.mdx`,
  `apps/docs/README.md`, this plan, the plan index row, and the matching
  `TODO.md` entry.
- **Depends on:** 416 (generated colour/type tables; the same pattern),
  410 (site), `packages/tokens` (`Theme`, `elevationShadow`).
- **Depended on by:** nothing; it closes an IA/prose gap.

## 1. Why

`MISSION.md` requires the docs to "document every public token and the extension
mechanism." The site's Theming page currently generates the **colour** catalogue
and Typography generates the **type** scale. The remaining groups in the shipped
`Theme` — `spacing`, `radius`, `borderWidth`, `iconSize`, `density` and
`elevation` — are described in prose and linked to `docs/tokens.md`, but the site
never shows their values. A reader therefore cannot see the shipped scale on the
docs site, and a future token change has no page-level guard.

This is the same class of work as plan 416, with the same rule: **generate from
`@gpuixui/tokens`; never retype a value.**

## 2. What is measured today

- `Theme` (in `packages/tokens/src/theme.ts`) has: `name`, `mode`, `colors`,
  `typography`, `spacing`, `radius`, `density`, `elevation`, `borderWidth`,
  `iconSize`.
- `apps/docs/src/components/token-colors.tsx` renders `colors`; `type-scale.tsx`
  renders `typography`.
- `theming.mdx` has no spacing/radius/density/elevation/focus/icon table and
  says the full reference is `docs/tokens.md`.
- The docs app may import `@gpuixui/tokens` root only
  (`src/architecture.test.ts`), which exports `lightTheme`, `darkTheme`,
  `elevationShadow`, and the group types.

## 3. Files and exact changes

| File | Change |
| ---- | ------ |
| `apps/docs/src/components/token-scales.tsx` | **new** — `TokenScales` renders six generated groups from `@gpuixui/tokens`: spacing, radius, border width, icon size, density and elevation |
| `apps/docs/src/components/token-scales.test.tsx` | **new** — every key and value of every group is rendered; density/elevation edge cases; light/dark agreement for mode-independent scales |
| `apps/docs/src/components/mdx.tsx` | register `TokenScales` in `getMDXComponents` |
| `apps/docs/content/docs/theming.mdx` | new `## Scales and control metrics` after `## Light and dark`: the rule, `<TokenScales />`, and the density/elevation notes |
| `apps/docs/README.md` | one paragraph under "Theme" naming the generator and its test |
| `TODO.md` | add and tick the docs-site task; keep the progress count current |
| `.agents/slop/plans/README.md` | index this plan as `implemented` |

### 3.1 `token-scales.tsx`

One exported component, one local `ScaleTable` helper. Rules:

- Import `darkTheme`, `elevationShadow`, `lightTheme`, and the types
  `ElevationLevel`, `Theme` from `@gpuixui/tokens`.
- Use `import * as R from "effect/Record"` for `spacing`/`radius`/`borderWidth`/
  `iconSize` entries; use `import * as Arr from "effect/Array"` for the density
  and elevation rows. No `Object.entries`, no `for` loops.
- Mode-independent groups render one `Value` column from `lightTheme`; the test
  proves `darkTheme` carries the same values. If they ever diverge, the test
  fails and the page gains a mode column rather than lying.
- `density` rows are `controlHeight.sm|md|lg`, `controlPaddingX.sm|md|lg` and
  `rowHeight`, rendered as `${n}px`; the group title includes the preset name.
- `elevation` renders `Light` and `Dark` columns. A row is
  `elevationShadow(theme, level)`; when it is `undefined`, render `none
  (reserved)`. A shadow renders `offsetX offsetY blurRadius spreadRadius` and
  its colour.
- Every row carries `data-token="<group>.<key>"`; every table carries
  `data-group="<group>"` so the test can count rows without parsing prose.

### 3.2 The Theming section

```mdx
## Scales and control metrics

Every group below is a value in the same `Theme`, so overriding one moves every
component that reads it. The tables are generated from `@gpuixui/tokens`; a
group the package adds appears here without a docs edit.

<TokenScales />

Density is a preset, not a second palette: it moves control heights, horizontal
padding and row heights, and leaves colour and type alone. Elevation resolves to
one shadow per surface because the native runtime paints one; `overlay` is
reserved and paints nothing.
```

### 3.3 README

Under **Theme**, after the docs-theme paragraph: `TokenColors`, `TypeScale` and
`TokenScales` render the package's colour, type and scale groups; their tests
fail when a key or value drifts. This is the documented answer to "why is this
table generated?"

## 4. Test plan

`token-scales.test.tsx` renders the component with `renderToStaticMarkup` and
asserts:

1. `data-group` is present for all six groups and its row count equals the
   package's key count (`spacing` 10, `radius` 6, `borderWidth` 2, `iconSize` 5,
   `density` 7, `elevation` 4).
2. Each `data-token` exists with the package's value: every spacing/radius/
   border/icon number as `${n}px`; every density metric; every elevation level
   with the light and dark colours, and `overlay` as `none (reserved)`.
3. Light and dark agree for spacing, radius, borderWidth and iconSize — the
   invariant that lets the page render one column. This is the assertion that
   fails if a future theme gains a mode-dependent scale without the page saying
   so.

Two-direction proof (record the exact output in §7):

- delete the `radius` group from the component → the group/count test fails with
  `radius` missing;
- change one rendered value to a literal (`0px`) → the value test fails;
- restore both → all pass.

## 5. Commands, expected results and STOP conditions

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass; `token-scales.test.tsx` included |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0; Theming route still builds |
| `nub run check` / `nub run lint` / `nub run test` | the repository gate |
| dev server: `curl -s localhost:3000/docs/theming` | 200 and the generated tables are present |

STOP when:

- `@gpuixui/tokens` does not export a group this plan names — report the missing
  export; do **not** inline a copy on the page.
- A scale is mode-dependent in a way §3.1's one-column rule cannot express —
  stop and add the mode column with its test instead of silently showing light.
- The page renders a value the package does not ship (copy/paste detected) —
  replace it with the package value; never keep a literal.

## 6. Acceptance

- Theming renders every shipped token group, generated from the package.
- The test fails when a group, key or value is dropped or retyped, and it was
  proven in both directions.
- Docs suites, type-check, build and the repository gate pass.
- `TODO.md`, the plan index and `apps/docs/README.md` are updated; the change is
  committed and pushed on `agent/docs-site`.

## 7. Verification record (2026-10-17)

- `nub run --filter docs test`: 26 files, 151 tests pass.
- `nub run --filter docs check-types`: exit 0.
- `nub run --filter docs build`: exit 0.
- Both directions: renaming the `radius` group id to `radii` failed
  `token-scales.test.tsx` on `data-group="radius"`; replacing the density
  `rowHeight` value with the literal `0px` failed with
  `expected '0px' to be '32px'`; restoring the package-derived values passed.
- Architecture boundary: the component uses `Object.entries` rather than
  `effect/*` because `src/architecture.test.ts` forbids the Effect runtime in
  non-test site modules. The test keeps `effect/Array`, `Option` and `Record`.
- The dev server renders the tables on `/docs/theming` (see the command output in
  the commit message); `overlay` renders `none (reserved)` in both themes.

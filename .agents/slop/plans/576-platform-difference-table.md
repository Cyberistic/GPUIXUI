# Plan 576 — the platform table is generated, not remembered

**Workstream:** docs-site · **Phase:** F (docs truth and future-proofing)
**Depends on:** 420 (platform toggle), 434 (platform-styled previews), 430
(generated token scales). **Related cross-team:** `packages/tokens` plan 063 on
`agent/tokens-theme` (a platform style becomes a full style and `platformTheme`
is deprecated).

## 1. The defect

`apps/docs/content/docs/theming.mdx` states the platform difference in prose:

- line 117–121: *"today the visible change is the monospace family, because that
  is the only value the shipped platform styles change."*
- line 135–140: *"Today the platform styles differ in their **type families and
  theme name** … Control metrics and per-platform colour tuning are tracked in
  `TODO.md`."*

The first sentence is true for the currently merged `@gpuixui/tokens`, whose
`platformTheme` changes `name` and `typography` only. It stops being true the
moment a platform style carries more: the tokens workstream's plan 063 already
replaces `platformTheme` with `applyPlatformStyle` / `getPlatformTheme` — a full
style with families, radii, density, motion, surfaces, accent and shadows — and
marks `platformTheme` deprecated. When that branch merges, the docs will keep
telling the reader that only the mono face changes while every preview changes
colour and metrics, and no test will notice, because the sentence is MDX prose
and every guard reads code.

The page also **restates** a fact the package already owns. The platform values
panel (`<PlatformValues />`) already renders the real name and families from
`platformTheme`; the reader still has to take the prose's word for which *fields*
differ.

## 2. The fix

Derive the difference from the two `Theme` values and render it.

1. A pure module compares a base theme with an applied theme group by group and
   reports the changed top-level keys (`colors.primary`, `typography.mono`, …).
   It is API-agnostic: it takes `(base, applied)`, never calls `platformTheme`,
   so the tokens migration changes only the caller.
2. A React component renders one table: rows are the eight comparison groups,
   columns are the four platform styles, and each cell is either `same` or the
   changed keys with their shipped values (`mono · Consolas`). The active
   platform column carries `data-active`.
3. The Theming page renders `<PlatformStyles />` and drops both hard-coded
   sentences; it points at the generated table instead.
4. The existing platform search document (`token-search.ts`) derives its content
   from the same diff, so ⌘K's `Platform styles` entry cannot outlive the API
   either.
5. A test reads `theming.mdx` and fails if either retired sentence returns or the
   component is missing.

The table is honest today (it will say `Typography — mono · Consolas` and
`Palette — same`) and needs no docs edit when the tokens style grows. This is
the same "the page cannot outlive the package" rule as plans 430, 447, 504,
520 and 565.

## 3. Files to create or change

| File | Change |
| --- | --- |
| `apps/docs/src/lib/platform-styles.ts` | **create** — `STYLE_GROUPS`, `StyleDiff`, `styleDiff(base, applied)`, `summary(items, applied)`; plain-data equality; no React, no `platformTheme`. |
| `apps/docs/src/lib/platform-styles.test.ts` | **create** — the pure diff and its two-direction proofs (§5). |
| `apps/docs/src/components/platform-styles.tsx` | **create** — `<PlatformStyles />`; resolves each platform with `platformTheme(themes.light, …)`, calls `styleDiff`, renders the table; uses `usePlatform` for `data-active`. |
| `apps/docs/src/components/platform-styles.test.tsx` | **create** — server render, four columns, the shipped values, active column, and the page guard (§5). |
| `apps/docs/src/components/mdx.tsx` | **change** — register `<PlatformStyles />` next to `<PlatformValues />`. |
| `apps/docs/content/docs/theming.mdx` | **change** — insert `<PlatformStyles />` after `<PlatformValues />`; replace the two hard-coded claims (§4). |
| `apps/docs/src/lib/token-search.ts` | **change** — `platformContent` derived from `styleDiff`; description names what the styles change. |
| `.agents/slop/plans/README.md` | **change** — index this plan. |
| `TODO.md` | **change** — tick the task; add the `platformTheme` migration as a tracked docs task. |

No file outside `apps/docs`, `docs/preview-strategy.md` or the plan/TODO/index
is touched. `packages/tokens` is read, never written.

## 4. Exact behaviour

`apps/docs/src/lib/platform-styles.ts`:

```ts
import { themes, type Theme } from "@gpuixui/tokens";

export const STYLE_GROUPS = [
  { key: "colors", label: "Palette" },
  { key: "typography", label: "Typography" },
  { key: "spacing", label: "Spacing" },
  { key: "radius", label: "Radius" },
  { key: "density", label: "Density" },
  { key: "elevation", label: "Elevation" },
  { key: "borderWidth", label: "Border widths" },
  { key: "iconSize", label: "Icon sizes" },
] as const;
```

- `styleDiff(base, applied)` compares `name` separately (it is a field, not a
  group) and each entry of `STYLE_GROUPS` by its own top-level keys. The table
  passes the **default platform style** (`platformTheme(themes.light,
  "default")`) as the base, so the cells read the same on every build host
  instead of inheriting that host's `systemMonoFamily`.
- A cell is:
  - `same` when no key differs;
  - `key · value` / `a · b` for one or two changed keys whose value is a string
    or number;
  - the bare key names when a changed value is not a scalar;
  - `${n} values` when more than two keys differ.
- Comparison is structural over plain theme data (objects and arrays), because
  `extendTheme` copies untouched groups into new objects.

`apps/docs/src/components/platform-styles.tsx` renders:

- a visually hidden `<caption>` naming the table;
- a header row: `Field`, then `macOS`, `Linux`, `Windows`, `Default` from
  `platformNames` (MISSION's order);
- a `Theme name` row with each applied `Theme.name`;
- one row per `STYLE_GROUPS` entry;
- `data-platform` on every value cell and `data-active` on the active column's
  header;
- `not-prose` styling consistent with `<PlatformValues />`.

`theming.mdx` after `<PlatformValues />`:

```mdx
<PlatformStyles />
```

and the paragraph below `<PlatformValues />` becomes:

> Every component preview on the site is a **labelled browser approximation** …
> The previews below read the whole active `Theme`, so the toggle re-renders all
> of them. Which fields actually change is not prose: the table above is
> generated from `@gpuixui/tokens`, so it names the shipped difference and
> nothing more.

The "today the platform styles differ in …" paragraph becomes:

> The table above names the fields a platform style changes, read from
> `@gpuixui/tokens` rather than retyped. GPUI resolves the `.SystemUIFont`
> sentinel to each platform's own UI face, and each style names the monospace
> family its platform installs (`Menlo`, `DejaVu Sans Mono`, `Consolas`).
> Control metrics and per-platform colour tuning are tracked in `TODO.md`; the
> docs show what the package actually ships rather than implying more.

## 5. Test plan

`apps/docs/src/lib/platform-styles.test.ts`:

1. **The shipped Windows style** — `styleDiff(defaultStyle,
   platformTheme(defaultStyle, "win32"))` reports `Typography` changed with
   `mono · Consolas`, and `Palette`, `Spacing`, `Radius`, `Density`, `Elevation`,
   `Border widths`, `Icon sizes` as `same`.
2. **The reference is the default style, not the build host** —
   `platformStyles()` marks macOS's groups `same` (both name Menlo) on any host.
3. **The derivation is not a list of today's answer** — a fixture
   `extendTheme(themes.light, { colors: { primary: "#123456" }, density:
   "compact" })` makes the diff report `Palette` (naming `primary`) and
   `Density`. *This is the proof the table fills in when the tokens style grows.*
4. **Structural comparison** — a rebuilt but equal theme reports every group
   `same` (a reference `===` comparison would call them changed).

`apps/docs/src/components/platform-styles.test.tsx`:

5. The server render has the four platform column headers, the eight group rows
   and the shipped faces (`Menlo`, `DejaVu Sans Mono`, `Consolas`).
6. The default server snapshot marks the `Default` column `data-active`.
7. `content/docs/theming.mdx` contains `<PlatformStyles />` and contains neither
   retired sentence (`only value the shipped platform styles change`, `differ in
   their **type families and theme name**`).

Two-direction proofs, recorded in the plan's result section after running them:

- Delete `typography` from `STYLE_GROUPS` → test 1 fails by name.
- Replace the structural comparison with `base === applied` → test 4 fails.
- Hard-code `"same"` for `colors` → test 3 fails.
- Re-insert either retired sentence in `theming.mdx` → test 7 fails.

## 6. Commands

```sh
nub run --filter docs test                  # expect: all suites pass
nub run --filter docs check-types           # expect: exit 0
nub run --filter docs build                 # expect: production build
nub run --filter docs smoke:build           # expect: 98 pages, exit 0
nub run check                               # expect: exit 0
nub run lint                                # expect: exit 0
```

## 7. STOP conditions

Stop and report if any of these is true:

- `themes.light` no longer exposes any of the eight groups (the table's contract
  changed, not the docs).
- `platformTheme` is absent from the installed `@gpuixui/tokens` on this branch
  (the caller must be migrated to the tokens workstream's API first; do not
  invent it).
- The docs test suite is red before the change for an unrelated reason.
- A required command fails in a way this plan does not describe.

## 8. Acceptance

- Theming renders a table whose cells come from the package, not from prose.
- No sentence in `theming.mdx` claims a platform difference independent of the
  package.
- When a platform style changes more than type, the table reports it with no
  docs edit; the pure test proves that path.
- All commands in §6 pass.

## 9. Result (2026-10-19)

**Landed.** `apps/docs/src/lib/platform-styles.ts` (the structural diff),
`apps/docs/src/components/platform-styles.tsx` (`<PlatformStyles />`), the two
suites, the MDX registration, the Theming wiring and the derived platform search
document. The table compares every column with the **default platform style**, so
its cells are identical on a macOS, Linux or Windows build host; macOS and
Default therefore read `same` for every group and the Windows/Linux rows name the
monospace family each changes.

**Measured.**

| Command | Result |
| --- | --- |
| `nub run --filter docs test` | 91 files / 652 tests pass (was 89 / 643) |
| `nub run --filter docs check-types` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run --filter docs smoke:build` | 98 pages, 121 links, 1 275 anchors, exit `0` |
| `nub run check` | exit `0` |

**Two-direction proofs (each forced defect measured, then reverted).**

1. Removed `typography` from `STYLE_GROUPS` → the Windows test failed by name
   (`expected undefined to be "mono · Consolas"`).
2. Replaced the structural comparison with reference equality → the
   `structuredClone` test failed (a rebuilt, equal theme reported every group
   changed).
3. Forced `colors` to report `[]` → the fixture test failed
   (`expected [] to equal ["primary"]`).
4. Re-inserted *"only value the shipped platform styles change"* in
   `theming.mdx` → the page guard failed by name.

**Follow-up recorded.** `packages/tokens` plan 063 on `agent/tokens-theme`
deprecates `platformTheme` in favour of `applyPlatformStyle` /
`getPlatformTheme`. The docs' three call sites (`theme-surface.tsx`,
`preview/main.tsx`, `platform-values.tsx`/`platform-styles.tsx`) must migrate
when that branch lands; the diff table itself already accepts any applied
`Theme`, so only the callers change. Tracked in `TODO.md`.

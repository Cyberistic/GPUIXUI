# 636 — Overlay placement: one owner for side, align and the two measured defects

**Phase:** F (documentation completeness; a measured documentation gap)
**Depends on:** 156, 323, 410, 412, 419, 431, 455, 482, 486, 568, 589, 598, 606, 624, 626, 630, 633, 634, 635
**Status:** planned
**Owner:** docs-site workstream (`apps/docs`, `docs/preview-strategy.md`, the component-page template)

---

## 1. The gap this plan closes

Every floating surface in the library — popover, dropdown menu, combobox, select,
tooltip, preview card, navigation menu, mention list, context menu — is placed by
GPUix's `<anchored>` element through `@gpuix/react/floating`'s `FloatingLayer`.
The site documents the **paint order** of those surfaces (Component API
`## Layering`, plan 589) and lists `side`/`align` in each component page's props
table, but **no page explains the placement model**: what the five props mean,
what the React layer asks the runtime for, which components compensate for the
runtime's measured defects, and what is not possible.

Measured on 2026-10-21 in this worktree against the real `/api/search` merge (a
scratch vitest calling `search()`; deleted afterwards):

| Query | First result before | Correct owner |
| ----- | ------------------- | ------------- |
| `placement` | `/docs/components/spinner#accessibility-and-limitations` (text) | this page |
| `positioning` | `/docs/components/select#accessibility-and-limitations` (text) | this page |
| `side` | `/docs/components/drawer` (page) | this page |
| `align` | `/docs/components/stack#theming` (text) | this page |
| `side offset` | `/docs/components/preview-card#variants` (text) | this page |
| `sideOffset` | `/docs/components/preview-card#variants` (text) | this page |
| `align offset` | `/docs/components/stack#theming` (text) | this page |
| `collision` | `/docs/components/dropdown-menu#sizes` (text) | this page |
| `collision padding` | `/docs/styling#the-supported-surface` (text) | this page |
| `flip` | `/docs/components/context-menu#accessibility-and-limitations` (text) | this page |
| `snap` | `/docs/extending#a-worked-component` (text) | this page |
| `fit` | `/docs/architecture` (page) | this page |
| `off screen` | `/docs/showcase#the-screen` (text) | this page |
| `near the edge` | `/docs/components/dropdown-menu#accessibility-and-limitations` (text) | this page |
| `anchor point` | `/docs/components/slider#keyboard-and-focus` (text) | this page |
| `overlay placement` | `/docs/window#the-frame-overlay` (text) | this page |
| `reposition` / `repositioning` | **nothing** | this page |

Queries that must **not** move (their owners are correct):

- `position` → `/docs/styling` (the CSS concept that does not exist)
- `anchored`, `anchor`, `anchor element` → `/docs/native-elements` (the JSX tag)
- `popover placement`, `popover position` → `/docs/components/popover`
- `tooltip placement`, `tooltip arrow`, `arrow` → `/docs/components/tooltip`
- `layering`, `z-index`, `dismiss`, `outside click`, `stacking` → `/docs/component-api`
- `align items`, `grid` → Styling / Stack
- `drawer` → `/docs/components/drawer`, `window edge` → `/docs/window`

Two facts make the page necessary rather than nice:

1. **The React placement surface is five fields nobody explains.** The installed
   `@gpuix/react/dist/components/floating.d.ts` declares
   `FloatingContentProps` with `side`, `sideOffset`, `align`, `alignOffset` and
   `collisionPadding`; the installed implementation
   (`floating.js`) turns them into `<anchored side align gap offset fit="snap"
   snapMargin deferred priority={1} occlude>`. That mapping is the actual
   contract, and it is invisible on the site.
2. **The runtime has two measured placement defects and the library only
   compensates in three components.** `packages/components/src/internal/placement.ts`
   records that `align="center"` puts the surface's end on the anchor's centre
   line (short by half the surface) and that `fit="snap"` clamps instead of
   flipping, so a bottom surface near the window edge is moved **over** its
   trigger. `usePlacement` corrects both for Popover, Dropdown menu and Combobox
   only. Select, Tooltip, Preview card, Navigation menu and the Mention list pass
   their placement straight through.

**Evidence boundary.** The rules come from the shipped source
(`packages/components/src/internal/placement.ts`, `use-placement.ts`) and the
installed declarations/implementation (`@gpuix/react@0.10.0`). The defect is
measured by the headless playground scenario `floating-placement` (plan 156 §8,
re-measured in plan 323); this plan re-runs that one scenario, and no new probe
is invented. The page must not claim a placement behaviour that neither the
source nor the scenario proves.

---

## 2. What the page says (and where each claim comes from)

Page: `/docs/overlay-placement`, title **Overlay placement**, sidebar directly
after `component-api`.

Sections, in order:

1. **`## The placement props`** — the five fields of `FloatingContentProps` with
   their types and the defaults the shipped `FloatingLayer` applies
   (`side="bottom"`, `sideOffset=0`, `align="start"`, `alignOffset=0`,
   `collisionPadding=8`). State that these props belong to
   `@gpuix/react/floating`, not to this library, and that every surface below
   accepts them. Table: `<PlacementProps />`.
2. **`## What the layer asks the runtime for`** — `<LayerMapping />`, one row per
   translation: `side` → `side`, `align` → `align`, `sideOffset` → `gap`,
   `alignOffset` → `offset` (one axis only: `{x}` for top/bottom, `{y}` for
   left/right), `collisionPadding` → `snapMargin`, plus the fixed
   `fit="snap"`, `deferred`, `priority: 1` and `occlude`. Link Native elements
   for `<anchored>` and its own props (`anchor`, `fit: "switch" | "snap"`,
   `position`, `priority`, `occlude`).
3. **`## Which components correct it`** — `<PlacementMatrix />`, one row per
   surface, derived from the component source: whether it uses `usePlacement`,
   which placement props it exposes, its defaults, and whether a centre
   correction and a one-step flip apply. Rows: Popover, Dropdown menu, Combobox
   (measured); Select and Tooltip (runtime-owned, pass-through); Preview card
   (exposes `align`, pass-through); Navigation menu and Mention list (fixed
   `bottom`/`start`); Context menu (pointer position). The Preview card row is
   the honest limitation: `align="center"` is accepted and **not** corrected.
4. **`## The two measured defects`** — the centre defect and the snap defect,
   each with what the runtime does, what the library does instead, and the exact
   sentence from the source. Include the real sources:
   `<include lang="ts" meta='title="packages/components/src/internal/placement.ts"'>`
   and `use-placement.ts`. State that the library's rule is one-shot: a flip can
   never oscillate.
5. **`## Choosing a side`** — the practical rules a consumer applies: choose the
   side with room; `align="center"` is safe on Popover/Dropdown/Combobox and
   should be avoided on the pass-through surfaces; `collisionPadding` is the
   margin kept from the window edge; a surface near an edge may be moved over
   its trigger on the pass-through surfaces, so choose `side="top"` there
   yourself. One compiled `tsx` fence: a `PopoverContent side="top" align="center"
   collisionPadding={12}`.
6. **`## One-shot measurement`** — `usePlacement` measures the trigger, the
   surface and the window after the surface's first commit and resolves once per
   open (again only when `side:align:margin` changes). Resizing the window or
   moving the trigger while the surface is open does **not** re-place it; close
   and reopen. The pass-through surfaces never measure at all.
7. **`## What is not supported`** — `<PlacementAbsences />`, each row with the
   substitute or owning page: no arrow/pointer triangle (Tooltip page records the
   same absence); no arbitrary anchor element (the React layer anchors to its
   containing block; `<anchored>` anchors by corner, not element id); no `fit`
   choice in the React layer (`snap` is hardcoded; the raw element offers
   `switch`); no `side="auto"`; no flip beyond one; no live re-placement on
   resize/scroll; no cross-axis shift beyond the snap clamp; no placement
   animation (Theming owns motion).
8. **`## Evidence`** — the declarations and source above, plus the headless
   scenario `floating-placement` (plan 156 §8 / 323), run for this plan with
   `nub apps/playground/dist/smoke/run.js --only floating-placement`. The live
   scenes on Previews open the real surfaces; no screenshot is offered as
   placement evidence.
9. **`## Related`** — Popovers, Dropdown menu, Combobox, Select, Tooltip, Preview
   card, Navigation menu, Context menu, Component API (`Layering`), Native
   elements (`anchored`), Window (`getWindowSize`), Automation
   (`getElementBounds`), Theming (motion).

Cross-links added by this plan:

- `component-api.mdx` `## Layering`: one sentence linking Overlay placement for
  side/align and the measured corrections.
- `components/popover.mdx`, `dropdown-menu.mdx`, `combobox.mdx`: one sentence in
  `## Accessibility and limitations` linking the page (the centre correction and
  the single flip).
- `components/preview-card.mdx`: the limitation row gains the uncorrected
  `align="center"` and the no-flip consequence, linking the page.
- `components/tooltip.mdx`: the default `align="center"` consequence (off-centre
  by half its width) links the page, because the runtime default is not corrected.

---

## 3. Files to create

All paths relative to `apps/docs/`.

### 3.1 `src/lib/placement.ts` (new)

Authored data plus a pure guard, mirroring `src/lib/events.ts` / `src/lib/updater.ts`.

```ts
export interface PlacementPropRow {
  readonly name: string;      // "sideOffset"
  readonly type: string;      // "number"
  readonly default: string;   // "0"
  readonly summary: string;
}
export const placementProps: ReadonlyArray<PlacementPropRow>;

export interface LayerMappingRow {
  readonly from: string;      // "sideOffset"
  readonly to: string;        // "gap"
  readonly value: string;     // "sideOffset"
  readonly summary: string;
}
export const layerMapping: ReadonlyArray<LayerMappingRow>;

export type PlacementCorrection = "measured" | "pass-through" | "fixed" | "pointer";
export interface PlacementSurfaceRow {
  readonly surface: string;        // "PopoverContent"
  readonly source: string;         // "packages/components/src/popover.tsx"
  readonly props: string;          // "side, align, sideOffset, alignOffset, collisionPadding"
  readonly defaults: string;       // 'side="bottom", align="start", sideOffset=6, …'
  readonly correction: PlacementCorrection;
  readonly centreCorrected: boolean;
  readonly flipsOnce: boolean;
}
export const placementSurfaces: ReadonlyArray<PlacementSurfaceRow>;

export interface PlacementAbsence {
  readonly subject: string;
  readonly statement: string;
}
export const placementAbsences: ReadonlyArray<PlacementAbsence>;
export const placementAbsenceSubjects: ReadonlyArray<string>;

export interface PlacementSurfaceInput {
  readonly reactDeclarations: string; // installed floating.d.ts
  readonly reactLayer: string;        // installed floating.js
  readonly nativeDeclarations: string; // installed host.d.ts
  readonly runtimeTooltip: string;    // installed components/tooltip.js
  readonly components: ReadonlyArray<{ readonly path: string; readonly source: string }>;
}
export const placementSurfaceViolations: (input: PlacementSurfaceInput) => ReadonlyArray<string>;
```

`placementSurfaceViolations` rules (each returns a message naming the member):

1. `interface FloatingContentProps` declares exactly `side`, `sideOffset`,
   `align`, `alignOffset`, `collisionPadding` (plus `children` from the
   `Omit<Props, "children">` parent), with the declared types; every
   `placementProps` row names a declared field and every declared field has a row.
2. The destructuring defaults in the installed `FloatingLayer` equal
   `placementProps.default` for all five fields.
3. Every `layerMapping` row appears in the installed `<anchored>` call with the
   stated value (`gap: sideOffset`, `fit: "snap"`, `snapMargin: collisionPadding`,
   `deferred: true`, `priority: 1`, `occlude:`), and every target name is declared
   by `interface AnchoredProps` in the native declarations.
4. Every `.tsx` under `packages/components/src` that contains `usePlacement(`
   is a `correction: "measured"` row; every file that contains `<FloatingLayer`
   or an `<anchored` surface without `usePlacement(` is a `pass-through`,
   `fixed` or `pointer` row. No row names a file that no longer places a surface.
   A new component adopting the layer fails by path.
5. The installed `TooltipContent` default is `align = "center"`; the Tooltip row
   is `pass-through` with `centreCorrected: false`. A GPUix upgrade that changes
   the default fails by name.
6. The absences are provable: `AnchoredProps` declares no `arrow`; the React
   declarations declare no `fit`; `AnchoredProps["anchor"]` is a corner union,
   not an element id; `use-placement.ts` contains no `addEventListener`,
   `requestAnimationFrame` or resize hook. `placementAbsenceSubjects` matches the
   absence table exactly.

Authored summaries state meaning only; names, types and defaults are read from
the installed files at test time.

### 3.2 `src/lib/placement-search.ts` (new)

One `GeneratedSearchEntry` (`placementSearchEntry`):

- `names`: the distinctive names — `FloatingContentProps`, `sideOffset`,
  `alignOffset`, `collisionPadding`, `resolvePlacement`, `resolveSide`,
  `usePlacement`, `FloatingLayer`, `snapMargin` — filtered by
  `isDistinctiveName`. **Not** `side`, `align`, `fit`, `snap`, `flip` (plain
  words are indexed by the page, never promoted), and not `AnchoredProps`
  (Native elements owns the element).
- `index`: title `Overlay placement`, url `/docs/overlay-placement`,
  description and content built from the props/mapping/matrix/absences,
  keywords `overlay placement side align collision flip snap anchored`.

### 3.3 `src/components/placement-tables.tsx` (new)

Four server components, following `event-tables.tsx` / `updater-tables.tsx`
(accessible scroll region, `data-placement-*` attributes for the page guard):
`<PlacementProps />`, `<LayerMapping />`, `<PlacementMatrix />`,
`<PlacementAbsences />`. No colour or spacing literal; reuse the existing
`border-fd-border` / `text-fd-muted-foreground` classes.

### 3.4 `content/docs/overlay-placement.mdx` (new)

Frontmatter:

```yaml
---
title: Overlay placement
description: How floating surfaces are positioned — the five placement props, what the React layer asks GPUix for, which components correct the measured centre and snap defects, and what is not possible.
---
```

The sections in §2, with the four table components and the two `<include>`
sources in place. One compiled `tsx` fence (the popover) with real
`@gpuixui/components` imports.

### 3.5 `src/overlay-placement.test.ts` (new)

Header comment states the bug guarded (measured 2026-10-21: the 17 misrouted or
empty queries in §1, and the two defects that only live in source comments).

Suites:

- **surface** — `placementSurfaceViolations` returns `[]` for the real input;
  each of the six rules fails by name when its fact is changed in a copy (add a
  prop, change a default, drop a mapping row, add an unlisted `usePlacement`
  file, change the tooltip default, add an `arrow` field).
- **page** — `overlay-placement.mdx` contains every section heading, the four
  table tags and both include paths, no placeholder prose; `getMDXComponents()`
  registers every tag the page uses; `meta.json` lists the slug after
  `component-api`.
- **search** — `generatedSearchEntries` contains the entry; each §1 query that
  should move lands on `/docs/overlay-placement`; each regression stays put.
- **surface rows** — every `placementSurfaces.source` file exists and still
  contains the mechanism its `correction` claims.

### 3.6 Plan index, `TODO.md`, `PLAN.md`

- `.agents/slop/plans/README.md`: one row for 636 in the docs block.
- `TODO.md`: the docs progress becomes 203/203; a plan-636 paragraph at the top of
  the docs section with the measured gap and the delivered page; a cross-team row
  for the Preview card / Tooltip centre correction (owner: components).
- `PLAN.md`: one decision row (D72) recording that placement has one page, that
  Component API keeps paint order and Native elements keeps `<anchored>`, and that
  the evidence is the shipped rules plus the `floating-placement` scenario.

---

## 4. Files to change

| File | Change |
| ---- | ------ |
| `src/components/mdx.tsx` | import and register `PlacementProps`, `LayerMapping`, `PlacementMatrix`, `PlacementAbsences` |
| `content/docs/meta.json` | add `"overlay-placement"` after `"component-api"` |
| `src/lib/search.ts` | import `placementSearchEntry`; add it to `generatedSearchEntries` |
| `src/lib/search-docs.ts` | add the Overlay placement `indexedSurfaces` row |
| `src/lib/page-aliases.ts` | new `/docs/overlay-placement` block + the plan-636 paragraph in the header comment |
| `src/lib/page-aliases.test.ts` | `owned` rows for every new term; `regressions` rows pinning `position`, `anchored`, `anchor`, `custom anchor`, `popover placement`, `tooltip placement`, `arrow`, `window edge`, `layering`, `z-index`, `dismiss`, `outside click`, `align items` |
| `content/docs/component-api.mdx` | one sentence in `## Layering` linking the page |
| `content/docs/components/popover.mdx` | one limitation linking the correction |
| `content/docs/components/dropdown-menu.mdx` | one limitation linking the correction |
| `content/docs/components/combobox.mdx` | one limitation linking the correction |
| `content/docs/components/preview-card.mdx` | state the uncorrected `align="center"` and no flip, link the page |
| `content/docs/components/tooltip.mdx` | state the runtime `align="center"` consequence, link the page |
| `scripts/smoke-build.ts` | two production queries: `sideOffset` → `/docs/overlay-placement`, `flip` → `/docs/overlay-placement` |
| `src/example-snippets.test.ts` | add `"overlay-placement"` to `extraPages` |

**Aliases to add** (exact whole-query only; each must be answered by a section or
table on the page):

`placement`, `positioning`, `overlay placement`, `overlay position`, `side`,
`align`, `side offset`, `sideOffset`, `align offset`, `alignOffset`, `collision`,
`collision padding`, `flip`, `snap`, `fit`, `off screen`, `offscreen`,
`near the edge`, `anchor point`, `reposition`, `repositioning`.

Deliberately absent (with the regression that proves it): `position` (Styling),
`anchored` / `anchor` / `anchor element` (Native elements), `custom anchor` /
`popover placement` (Popover), `tooltip placement` / `tooltip arrow` / `arrow`
(Tooltip), `layering` / `z-index` / `dismiss` / `outside click` / `stacking`
(Component API), `align items` / `grid` (Styling / Stack), `window edge` (Window),
`drawer` (Drawer).

---

## 5. Commands and expected results

Run from the worktree root unless stated.

1. `nub apps/playground/dist/smoke/run.js --only floating-placement`
   Expected: exit `0`, the scenario passes and its report names
   `floating-placement`. **STOP** on exit `2` (no binding) — record it and keep
   the page's evidence to the shipped source, do not claim a new native run.
2. `cd apps/docs && nub exec vitest run src/overlay-placement.test.ts src/lib/page-aliases.test.ts src/lib/search-docs.test.ts src/example-snippets.test.ts src/mdx-components.test.ts`
   Expected: all files pass. **STOP** if `example-snippets` cannot compile the
   fence: fix the fence, do not remove it.
3. `nub run --filter docs check-types`
   Expected: exit 0 (the app and `preview/tsconfig.json`).
4. `nub run lint` and `nub run fmt`
   Expected: exit 0, no files reformatted.
5. `nub run --filter docs smoke:build`
   Expected: exit 0, `117 pages`, both new production queries answer
   `/docs/overlay-placement`, every link and fragment resolves. **STOP** on exit
   `2` (build/server) — report, do not retry unchanged.
6. `nub run --filter docs smoke:a11y` (or its `--only` page form if available)
   Expected: exit 0 in both schemes; the new tables must have `<th scope>` and a
   keyboard-reachable scroll region.
7. `nub run check` and `nub run test`
   Expected: exit 0, `check:tests` accepts every assertion without
   `check-tests-ok`.

Scoped native run: only `floating-placement` (step 1). No other scenario is
touched. Record the exact id in the commit body and the TODO entry.

---

## 6. Test plan — the forced directions

Each of these must be run once, recorded, and reverted before the commit:

1. Remove the `align="center"` row from `placementProps` → surface rule 1 fails
   naming `align`.
2. Change `collisionPadding`'s default from `8` to `4` in `placement.ts` →
   surface rule 2 fails naming `collisionPadding`.
3. Drop the `fit: "snap"` row from `layerMapping` → surface rule 3 fails naming
   `fit`.
4. Add `usePlacement(` to `preview-card.tsx` without a matrix row change →
   surface rule 4 fails naming the file.
5. Change the installed tooltip default to `"start"` in a copy of the layer
   source → surface rule 5 fails naming `TooltipContent`.
6. Add `arrow?: number` to a copy of `AnchoredProps` → surface rule 6 fails
   naming `arrow`.
7. Remove the page's `## One-shot measurement` heading → the page suite fails
   naming the heading.
8. Delete the placement search entry from `generatedSearchEntries` → the search
   suite fails on `placement` and `sideOffset`.
9. Add `position` to the page aliases → the regression row fails, proving the
   Styling owner is pinned.
10. `smoke:build` without the page registered in `meta.json` → the crawl finds an
    orphan and the sitemap count changes; this direction is recorded from the
    build log, not from a committed defect.

The regression file also runs the §1 `owned` and `regressions` query lists
through the real `search()` merge, so a ranker change that moves an owner fails
by query and URL.

---

## 7. Acceptance criteria

- `/docs/overlay-placement` builds and is reachable from the sidebar, sitemap and
  search; the MDX page renders the four generated tables and both source
  includes.
- Every claim is traceable to the installed declarations/implementation or the
  shipped source; the two defects quote the measured rule and cite the scenario.
- The measured queries in §1 return the page, and every pinned regression keeps
  its owner.
- The Preview card's uncorrected `align="center"` and the Tooltip default are
  stated as limitations, with a cross-team TODO row for the component fix.
- `nub run --filter docs check-types`, `nub run lint`, `nub run check` and
  `nub run test` pass; the scoped `floating-placement` run is recorded.
- `TODO.md`, `PLAN.md` and the plan index are updated; the branch is committed
  and pushed.

## 8. STOP conditions

- The installed `@gpuix/react` placement surface differs from §3.1's assumed
  fields in a way this plan did not anticipate: stop, record the real
  declaration, and amend the plan before implementing.
- `floating-placement` exits `1`: the runtime's measured behaviour changed;
  stop and report with the scenario output rather than rewriting the page to
  match an unexplained failure.
- The page-alias guard cannot keep `position` on Styling while adding `positioning`
  here: stop and record the measured conflict instead of widening the alias.
- Any gate fails for a reason outside `apps/docs`: stop and record it as a
  cross-team row.

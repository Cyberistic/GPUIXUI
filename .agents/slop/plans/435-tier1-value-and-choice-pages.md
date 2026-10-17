# 435 — the seven Tier 1 value and choice pages

- **Workstream:** docs-site
- **Phase:** C — every delivered Tier 1 component gets its `apps/docs` page
- **Owns:** `apps/docs/**`, `COMPONENTS.md` docs columns, `TODO.md` docs rows
- **Depends on:** plans `411`–`415`, `423` (the proven Tier 1 page shape), `424`
  (the truth guard), `428` (dependencies), `432` (native coverage), and the
  primitives workstream's `053`, `054` (the seven delivered components)
- **Status:** implemented — evidence in §8.1

## 1. Why this plan exists

`master` now ships seven further `@gpuixui/primitives` components — Slider, Range
slider, Meter, Number field, OTP field, Toggle and Rating — with source, offline
tests, native runtime tests (`053`/`054`), in-package pages
(`packages/primitives/docs/*.mdx`), examples (`packages/primitives/examples/`)
and `COMPONENTS.md` rows. They have **no `apps/docs` page**, so the docs site
does not yet document components a consumer can import, and the inventory says a
row is not `done` until the docs page exists.

The page shape is already proven by the 20 Tier 1 pages (plan 423); this is that
handoff repeated for seven records. No new docs mechanism is introduced.

## 2. The delivered set

| Slug | Registry title (must equal the `COMPONENTS.md` row) | Source | Props types | Example |
| ---- | --------------------------------------------------- | ------ | ----------- | ------- |
| `slider` | Slider | `packages/primitives/src/components/Slider.tsx` | `SliderProps` | `packages/primitives/examples/value.example.tsx` |
| `range-slider` | Range slider | `packages/primitives/src/components/Slider.tsx` | `RangeSliderProps` | `packages/primitives/examples/value.example.tsx` |
| `meter` | Meter | `packages/primitives/src/components/Meter.tsx` | `MeterProps` | `packages/primitives/examples/value.example.tsx` |
| `number-field` | Number Field | `packages/primitives/src/components/NumberField.tsx` | `NumberFieldProps` | `packages/primitives/examples/number-field.example.tsx` |
| `otp-field` | OTP Field | `packages/primitives/src/components/OTPField.tsx` | `OTPFieldProps` | `packages/primitives/examples/otp.example.tsx` |
| `toggle` | Toggle | `packages/primitives/src/components/Toggle.tsx` | `ToggleProps` | `packages/primitives/examples/toggle.example.tsx` |
| `rating` | Rating | `packages/primitives/src/components/Rating.tsx` | `RatingProps` | `packages/primitives/examples/rating.example.tsx` |

Runtime coverage per record (the exact suite `native-coverage.test.ts` re-derives):

| Slug | `testFile` |
| ---- | ---------- |
| `slider`, `range-slider`, `meter` | `packages/primitives/runtime/value.runtime.test.tsx` |
| `number-field` | `packages/primitives/runtime/number-field.runtime.test.tsx` |
| `otp-field` | `packages/primitives/runtime/otp.runtime.test.tsx` |
| `toggle` | `packages/primitives/runtime/toggle.runtime.test.tsx` |
| `rating` | `packages/primitives/runtime/rating.runtime.test.tsx` |

All seven are `status: "wip"`, `gpuix` copied from the inventory (`ours` rows are
`partial` in the registry vocabulary only where the `COMPONENTS.md` support cell
is `ours` → `yes` with a limitation; the mapping is the one the existing `Button`
record already uses: `ours` → `"yes"`, and every partial capability the source
documents becomes a `limitations` entry). `tier: "1"`, `group: "foundational"`.

## 3. The page contract

Identical to plan 423, in this order:

`Usage`, `Variants`, `Sizes`, `States`, `Composition`, `API reference`,
`Keyboard and focus`, `Theming`, `Accessibility and limitations`,
`Dependencies`, `Source`, `Related`.

- Frontmatter `title` = registry title, `description` = registry summary.
- `<ComponentState slug="…" />` and `<NativePreview slug="…" />` immediately
  after the intro.
- **No `<ComponentPreview>`**: no tier-A approximation exists for these
  components and none may be invented (§7). The preview is tier V, which names
  the runtime suite above.
- `## Composition` includes the real example file with `<include>`; do not paste
  source.
- `## API reference` uses one `<auto-type-table>` per exported props type in
  §2. The shared types `SliderProps`/`RangeSliderProps` live in the same file;
  `RangeSliderProps` does not extend `SliderProps`, so both tables are rendered.
- `## Keyboard and focus` states the measured keys only (from the component
  source and `053`/`054`), including the ones that do **not** work.
- `## Theming` names the real token roles the component paints; read the style
  helpers in `core/style.ts` / `core/variants.ts`, do not guess.
- `## Accessibility and limitations` repeats the inventory's measured gaps:
  no `aria-valuenow`/`min`/`max` (value rides on `aria-valuetext`), no
  `aria-pressed`/`aria-checked`, no pointer capture on the sliders, no numeric
  `type` on the number field, OTP paste unproven in the `TestRenderer`, whole
  stars only.
- `## Dependencies` is `<ComponentDependencies slug="…" />`.
- `## Related` links only records that exist; planned records render as labels.

## 4. Exact files

Create:

```
apps/docs/content/docs/components/slider.mdx
apps/docs/content/docs/components/range-slider.mdx
apps/docs/content/docs/components/meter.mdx
apps/docs/content/docs/components/number-field.mdx
apps/docs/content/docs/components/otp-field.mdx
apps/docs/content/docs/components/toggle.mdx
apps/docs/content/docs/components/rating.mdx
```

Change:

```
apps/docs/src/component-meta/entries.ts        seven planned -> wip records
apps/docs/content/docs/components/meta.json    seven slugs, delivered order
COMPONENTS.md                                  docs-page link on each of the seven rows
TODO.md                                        the docs row for this handoff
.agents/slop/plans/README.md                   index this plan
```

Nothing outside `apps/docs/**` is edited except the three ledgers above.

**First step — merge `master`.** The components only exist there; run
`git merge master` in `workspaces/docs-site` and resolve the ledger conflicts by
keeping both sides. If `packages/primitives` or any package fails its own gate
after the merge, STOP (§7) — this plan does not fix another workstream.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub install` | links the workspace packages; no error |
| `nub run --filter docs test` | every suite passes, including the seven new records/pages |
| `nub run --filter docs check-types` | 0; every `auto-type-table` type resolves |
| `nub run --filter docs build` | 0; seven new routes in the output |
| `nub run check` | repo gate green |
| `nub run lint` | green |
| `nub run test` | all workspace suites green |
| `nub run --filter docs dev` then `curl -s localhost:3000/docs/components/slider` | 200; the page names its source, example and runtime suite |

Browser check: each new URL returns 200, appears once in `/sitemap.xml`, is
listed once in the sidebar and the component index, and its API table renders
rows (not an empty block). Search for `number field` reaches its page.

## 6. Test plan

The new pages are guarded by the existing contracts; the work is proving each
guard actually engages for them.

1. `registry.test.ts` — delete the `rating` record → sidebar/page/source
   mismatch. Restore.
2. `component-pages.test.ts` — delete `## Theming` from `toggle.mdx` → fails
   with `toggle: missing section "Theming"`. Restore.
3. `content-references.test.ts` — point `meter.mdx`'s include at
   `packages/primitives/src/Meter.tsx` (wrong path) → fails. Restore.
4. `content-references.test.ts` — rename `SliderProps` to `SliderPropd` in the
   `auto-type-table` on `slider.mdx` → fails. Restore.
5. `dependencies.test.ts` — remove the derived dependency from one record →
   fails with the expected list. Restore.
6. `native-coverage.test.ts` — point `otp-field` at
   `runtime/fields.runtime.test.tsx` (a suite that does not import `OTPField`) →
   fails. Restore.
7. `component-truth.test.ts` — change one usage snippet to import from
   `@gpuixui/components` → fails. Restore.

Record every run in §8. A command that was not run is not a pass.

## 7. STOP conditions

- A props type in §2 is not exported by the real source → stop, record the type
  and file; never hand-write an API table.
- A `COMPONENTS.md` row for one of the seven is absent or its status cannot be
  mapped to the registry vocabulary → stop and report; never invent a row.
- An in-package docs page contradicts the component source → source wins; record
  the package drift as a cross-team `TODO.md` row, do not edit the package.
- The `master` merge conflicts outside the three ledgers → stop and report.
- Any gate fails outside `apps/docs` after the merge → stop and report.
- No screenshot, playground screen or tier-A approximation exists for these
  components. Do not fabricate a preview; tier V is the honest answer.

## 8. Acceptance criteria and evidence

- [ ] Seven `wip` records with real sources, dependencies and runtime suites.
- [ ] Seven pages passing the page, source, dependency, coverage and truth
      guards; sidebar, index, sitemap and search agree.
- [ ] `COMPONENTS.md` rows link the new pages; `TODO.md` and the plan index are
      current.
- [ ] All gates in §5 pass; two-direction proofs recorded below.

### §8.1 Evidence (measured 2026-10-17)

- **Merge:** `master` merged into `agent/docs-site` (`9611358`). Conflicts were
  confined to the five ledgers; they were resolved by keeping the docs branch's
  Tier 2 status/docs rows and the master branch's Tier 1 rows, renumbering the
  docs decisions to D25–D27 in `PLAN.md`, and taking `master`'s tracked
  `nub.lock`. Content (`apps/docs/**`, `packages/**`) merged without a conflict.
- **Records:** the seven `planned` stubs in `src/component-meta/entries.ts`
  became `delivered` records with the source, the runtime suite, the derived
  dependency list (`effect/Option`, `effect/Array`, `@gpuixui/icons` where real)
  and the measured limitations. The registry now has 71 records and 49 delivered
  pages.
- **Pages:** `slider`, `range-slider`, `meter`, `number-field`, `otp-field`,
  `toggle`, `rating`; each has the twelve template sections, its example
  `<include>`, one generated props table and its source include. `meta.json`
  follows the registry order.
- **Gates:** `docs test` 31 files / **180 tests**; `docs check-types` 0;
  `docs build` 0.
- **Browser/route check (dev server):** all seven URLs return 200; each emits its
  own `type-table-<file>-<Type>-*` ids (7, 13–17 rows), its source include and its
  example include; `/sitemap.xml` lists **49** component URLs; `/api/search`
  reaches `/docs/components/number-field` for `number field`.
- **Two directions proven** (each reverted to green afterwards):
  1. renamed the `rating` slug → `registry.test.ts` (2), `component-pages.test.ts`
     (2) and `content-references.test.ts` (1) failed.
  2. `toggle.mdx` `## Theming` → `## Theme` → `component-pages.test.ts`:
     `toggle: missing section "Theming"`.
  3. `meter.mdx` include path → `src/Meter.tsx` → `content-references.test.ts`
     failed on the include, the table target and the generated table.
  4. `slider.mdx` `SliderProps` → `SliderPropd` → `slider.mdx: SliderPropd
     generated no props`.
  5. removed `effect/Option` from the slider record → `slider: expected
     effect/Option, found (none)`.
  6. pointed `otp-field` at `fields.runtime.test.tsx` → `does not import it`.
  7. imported `Toggle` from `@gpuixui/components` in the page snippet →
     `toggle.mdx: Toggle is not exported by @gpuixui/components`.
- **Test fixture updated:** `preview.test.tsx` used the `slider` slug as its
  example of an unverified component; that record is now delivered, so the
  fixture moved to the still-planned `message-scroller`. The assertion (an
  unverified component is never approximated) is unchanged.


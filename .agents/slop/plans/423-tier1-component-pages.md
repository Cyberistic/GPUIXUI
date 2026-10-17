# 423 — the remaining Tier 1 component pages

- **Workstream:** docs-site
- **Phase:** C — every implemented Tier 1 component gets its `apps/docs` page
- **Owns:** `apps/docs/content/docs/components/**`, `apps/docs/src/component-meta/entries.ts`
- **Depends on:** plan `411` (template), `412` (preview tiers), `414` (source
  include), `415` (API tables), `422` (the proven page shape), and the primitives
  workstream's plan `047` (the components, their in-package pages and examples)
- **Status:** implemented — 20 Tier 1 pages, all gates green; evidence in §8.1

Plan 422 proved the chain on Buttons. This plan finishes the Tier 1 handoff:
the primitives workstream has code, tests, runtime verification, an in-package
page and a mounted example for every component; the `apps/docs` pages are the
only missing deliverable (their `TODO.md` says so explicitly).

## 1. The list

Every record already exists in `apps/docs/src/component-meta/entries.ts` as
`planned`. Move each to `wip` with the real `sourcePath`, the GPUix support the
inventory records, and its recorded limitations. One page per row:

| Slug | Title (must match the registry) | Source | Props type | GPUix |
| ---- | ------------------------------- | ------ | ---------- | ----- |
| `text` | Text / typography | `packages/primitives/src/components/Text.tsx` | `TextProps` | yes |
| `icon` | Icons | `packages/icons/src/Icon.tsx` | `IconProps` | yes |
| `separator` | Separators | `packages/primitives/src/components/Separator.tsx` | `SeparatorProps` | yes |
| `spacer` | Spacers | `packages/primitives/src/components/Separator.tsx` | `SpacerProps` | yes |
| `stack` | Stack / layout primitives | `packages/primitives/src/components/Stack.tsx` | `StackProps` | yes |
| `box` | Boxes / containers | `packages/primitives/src/components/Box.tsx` | `BoxProps` | yes |
| `scroll-area` | Scrollable containers | `packages/primitives/src/components/ScrollArea.tsx` | `ScrollAreaProps` | partial |
| `button-group` | Button groups | `packages/primitives/src/components/ButtonGroup.tsx` | `ButtonGroupProps` | yes |
| `label` | Labels | `packages/primitives/src/components/Label.tsx` | `LabelProps` | partial |
| `text-input` | Text inputs | `packages/primitives/src/components/Input.tsx` | `InputProps` | yes |
| `text-area` | Text areas | `packages/primitives/src/components/TextArea.tsx` | `TextAreaProps` | yes |
| `checkbox` | Checkboxes | `packages/primitives/src/components/Checkbox.tsx` | `CheckboxProps` | partial |
| `radio-group` | Radio groups | `packages/primitives/src/components/RadioGroup.tsx` | `RadioGroupProps` | partial |
| `select` | Selects | `packages/primitives/src/components/Select.tsx` | `SelectProps` | yes |
| `switch` | Switches | `packages/primitives/src/components/Switch.tsx` | `SwitchProps` | partial |
| `progress` | Progress | `packages/primitives/src/components/Progress.tsx` | `ProgressProps` | partial |
| `tooltip` | Tooltips | `packages/primitives/src/components/Tooltip.tsx` | `TooltipProps` | yes |
| `skeleton` | Skeletons | `packages/primitives/src/components/Skeleton.tsx` | `SkeletonProps` | partial |
| `spinner` | Loading indicators | `packages/primitives/src/components/Spinner.tsx` | `SpinnerProps` | partial |

`Grid` has no inventory row of its own; it is documented inside
`Stack / layout primitives` and opens `GridProps` in the same page.

## 2. What every page must contain

The plan 422 page is the model. In order: frontmatter (`title` = registry title,
`description` = registry summary), `<ComponentState>`, `<NativePreview>`, then
`Usage`, `Variants`, `Sizes`, `States`, `Composition`, `API reference`,
`Keyboard and focus`, `Theming`, `Accessibility and limitations`, `Source`,
`Related`.

- **Truth source:** `packages/primitives/docs/<name>.mdx` (or
  `packages/icons/docs/icon.mdx`), the component source, and the `COMPONENTS.md`
  row. A page that cannot fill a section says "none" or "not applicable"; it
  never deletes the heading (the contract test fails anyway).
- **Composition:** include the real example file that exercises the component
  (`layout`, `typography`, `form`, `selection`, `feedback`, `icons`) with
  `<include>`; do not write a new example in prose.
- **API:** `<auto-type-table path="../../../../../packages/…" name="…" />` from
  the table above. Never hand-write a prop list.
- **Source:** the paired `<include>` of the real file.
- **Related:** `<RelatedComponents>`; related records that are still `planned`
  render as labels (plan 422), so no page gains a 404.
- **Preview:** tier X for every page. The playground has no per-component screen
  yet; do not invent one, a screenshot or an approximation.
- **Status:** `wip` for every row. `done` waits on the published-binary runtime
  run (the primitives workstream's rule); the docs page is not what holds it.

## 3. Batching

Write and verify in family order so each batch shares an example and a theme
review:

1. **Layout:** `box`, `stack`, `separator`, `spacer`, `scroll-area`.
2. **Typography:** `text`, `icon`.
3. **Form:** `label`, `text-input`, `text-area`, `select`, `button-group`.
4. **Selection:** `checkbox`, `radio-group`, `switch`.
5. **Feedback:** `progress`, `skeleton`, `spinner`, `tooltip`.

Each batch is its own commit. Update `content/docs/components/meta.json` in the
same commit as its pages — the registry test compares the sidebar to the
non-planned records, so a page without a sidebar entry fails.

## 4. Exact files

```
M apps/docs/src/component-meta/entries.ts         19 records: planned -> wip
M apps/docs/content/docs/components/meta.json     index + every delivered slug
A apps/docs/content/docs/components/{text,icon,separator,spacer,stack,box,
  scroll-area,button-group,label,text-input,text-area,checkbox,radio-group,
  select,switch,progress,tooltip,skeleton,spinner}.mdx
M apps/docs/README.md                             point at the completed set
M COMPONENTS.md                                   docs-page link per Tier 1 row
M TODO.md                                         tick the Tier 1 docs handoff
M .agents/slop/plans/README.md                    index this plan
```

No package file is edited. If a package page is wrong or a source path moved,
record it as a cross-team `TODO.md` row rather than fixing it here.

## 5. Commands and expected results

```sh
nub run --filter docs test          # 19 existing suites + 19 new pages guarded
                                     # by component-pages/content-references/registry
nub run --filter docs check-types    # every auto-type-table resolves a real type
nub run --filter docs build          # every include and MDX page compiles
nub run check
nub run lint
nub run test
```

Expected: the page contract reports no missing section/block, the registry test
reports the sidebar equals `index` + every `wip`/`done` slug, and every
`auto-type-table` generates at least one row.

Browser check after `nub run --filter docs dev`:

- every `/docs/components/<slug>` returns 200 with its `<h1>`;
- `/docs/components` lists all 20 delivered records;
- `/sitemap.xml` contains all 20 URLs;
- `/api/search?query=checkbox` returns the Checkboxes page;
- each page's API table has real rows and its source block is the real file.

## 6. Test plan

There is no new mechanism to test: the existing guards become stricter as each
record leaves `planned`. They can fail and must be shown to:

1. `component-pages.test.ts` — a page missing a section, a block, or with a
   frontmatter/title mismatch fails. Prove once by deleting `## Theming` from a
   page, run, restore.
2. `content-references.test.ts` — a broken include or a type name that generates
   no rows fails. Prove once by renaming `CheckboxProps` in one page, run,
   restore.
3. `registry.test.ts` — a page without a sidebar entry, a `wip` record without a
   source path, or a title that disagrees with `COMPONENTS.md` fails.

Record both directions in §8.

## 7. STOP conditions

- A package page and the component source disagree → the source wins; write the
  source's truth and record the package page's drift as a `TODO.md` row for the
  primitives workstream.
- An `auto-type-table` generates zero rows → the type is not exported or is
  declared inline; stop and record it. Do not hand-write the table.
- A page would need a capability the runtime lacks → write the limitation and the
  honest alternative, never a fabricated preview.
- The preview would need a screenshot or playground screen that does not exist →
  tier X stays.
- A gate fails outside `apps/docs` → stop and report; do not weaken the gate.

## 8. Acceptance criteria and evidence

- [ ] 19 new pages, all 20 Tier 1 records `wip`, each with a real `sourcePath`.
- [ ] Sidebar, sitemap, search, index and pages agree.
- [ ] Every API table is generated from the real props type; every page includes
      its source.
- [ ] `docs test`, `docs check-types`, `docs build`, `nub run check`,
      `nub run lint`, `nub run test` pass; counts recorded.
- [ ] `COMPONENTS.md` links every Tier 1 row's docs page; `TODO.md` and the plan
      index are current.
- [ ] Two-direction proofs for the contract and the type table recorded here.

### §8.1 Evidence (measured 2026-10-17)

- **Batches (one commit each):**
  - layout — Box, Stack/Grid, Separator, Spacer, ScrollArea;
  - typography — Text, Icons;
  - form — Label, Input, TextArea, Select, ButtonGroup;
  - selection — Checkbox, RadioGroup, Switch;
  - feedback — Progress, Tooltip, Skeleton, Spinner.
- **Gates:**
  - `nub run --filter docs test` → **19 files, 102 tests passed** (the page and
    reference guards cover all 20 pages; the contract test did not need a new
    file).
  - `nub run --filter docs check-types` → pass; every `auto-type-table` resolves
    a real exported type (Stack's page generates two tables: `StackProps` and
    `GridProps`).
  - `nub run --filter docs build` → exit 0.
  - `nub run check` → test-quality, lint, format and all workspace type-checks
    pass.
  - `nub run lint` → pass.
  - `nub run test` → tokens 10 files/196 tests, icons 3/18, primitives 16/156,
    docs 19/102 — all pass.
- **Two-direction proof:**
  1. renamed `## Theming` to `## Colours` on `progress.mdx` →
     `component-pages.test.ts` failed with
     `progress: missing section "Theming"` (1 failed, 101 passed); restored →
     102 passed.
  2. changed `name="CheckboxProps"` to `name="CheckboxPropd"` on
     `checkbox.mdx` → `content-references.test.ts` failed with
     `components/checkbox.mdx: CheckboxPropd generated no props` (1 failed,
     101 passed); restored → 102 passed.
- **Browser check** (`nub run --filter docs dev`, all 20 URLs): every
  `/docs/components/<slug>` returned **200**, each page contained one generated
  props table (Stack two), each contained its real source path, `/sitemap.xml`
  listed **20** component URLs, and the component index linked exactly those
  **20** slugs.
- **Registry:** every Tier 1 record is `wip` with a real `sourcePath`; `done` was
  deliberately not claimed because the published-binary run is still pending.
  The inventory's seven unimplemented rows (Slider, Range slider, Meter, Number
  Field, OTP Field, Toggle, Rating) remain `todo` and `planned`.

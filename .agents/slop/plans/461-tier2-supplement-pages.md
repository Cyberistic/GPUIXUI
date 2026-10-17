# 461 — The Tier 2 supplement: seventeen delivered components get real pages

**Phase:** C/F · **Owner:** docs-site · **Status:** in progress
**Depends on:** 410, 411, 412, 414, 415, 428, 429, 432, 435, 437, 441, 449–453
**Trigger:** the merge of `master` (`81a5934`) brought the components workstream's
Tier 2 supplement — 17 rows moved to `done` in `COMPONENTS.md` — and split
`Date / time pickers` into `Date pickers` + `Time pickers`. The docs registry
still says `planned`, so `registry.test.ts` fails four ways and the dependency
drift guard fails on seven records whose entry files changed.

## 1. Why this plan exists

`COMPONENTS.md` owns status; the registry mirrors it (`plan 429`) and the
inventory column is read by `registry.test.ts` (`plan 443`). A `done` row with
no page fails `has a page and source for every finished component`; a delivered
page with no preview and no measured reason fails `scene-contract.test.ts`
(`plan 458`); a page whose dependency list drifts from its entry file fails
`dependencies.test.ts` (`plan 428`).

So this is not "write some pages": it is one coherent change that restores the
four inventories to agreement and gives every newly delivered component the same
contract the other 49 already meet — record, page, generated props, real source,
honest preview, sidebar, related links, dependencies.

**Measured at `81a5934`** (`nub run --filter docs test`): 4 failed / 251 passed.
The failures are the status/support/tier disagreement plus the `command-menu`
dependency assertion; `dependencies.test.ts` had already failed on the seven
entry files the merge changed (fixed in the commit before this plan, because it
is a regression in existing pages, not new work).

## 2. The seventeen components

Every title must equal its `COMPONENTS.md` row character for character. Support
words come from the same row. `sourcePath` and the runtime suite are the real
files in this worktree; `api` is the entry file's root props type.

| Slug | Title | Support | Source | API | Runtime suite | Related |
| ---- | ----- | ------- | ------ | --- | ------------- | ------- |
| `time-picker` | Time pickers | yes | `packages/components/src/time-picker.tsx` | `TimePickerProps` | `behaviour/time-picker.test.tsx` | `date-picker` |
| `message-scroller` | Message scroller | partial | `packages/components/src/message-scroller.tsx` | `MessageScrollerProps` | `behaviour/message-scroller.test.tsx` | `list` |
| `fieldset` | Fieldset | partial | `packages/components/src/fieldset.tsx` | `FieldsetProps` | `behaviour/fieldset.test.tsx` | `form`, `text-input` |
| `form` | Form | partial | `packages/components/src/form.tsx` | `FormProps` | `behaviour/form.test.tsx` | `fieldset`, `inline-validation` |
| `navigation-menu` | Navigation Menu | partial | `packages/components/src/navigation-menu.tsx` | `NavigationMenuProps` | `behaviour/navigation-menu.test.tsx` | `dropdown-menu` |
| `preview-card` | Preview Card | partial | `packages/components/src/preview-card.tsx` | `PreviewCardProps` | `behaviour/preview-card.test.tsx` | `popover` |
| `drawer` | Drawer | partial | `packages/components/src/drawer.tsx` | `DrawerProps` | `behaviour/drawer.test.tsx` | `dialog` |
| `stepper` | Stepper | partial | `packages/components/src/stepper.tsx` | `StepperProps` | `behaviour/stepper.test.tsx` | `progress` |
| `timeline` | Timeline | partial | `packages/components/src/timeline.tsx` | `TimelineProps` | `behaviour/timeline.test.tsx` | `list` |
| `color-picker` | Color picker | partial | `packages/components/src/color-picker.tsx` | `ColorPickerProps` | `behaviour/color-picker.test.tsx` | `text-input` |
| `tag-input` | Tag / token input | partial | `packages/components/src/tag-input.tsx` | `TagInputProps` | `behaviour/tag-input.test.tsx` | `text-input` |
| `mention-input` | Mention input | partial | `packages/components/src/mention-input.tsx` | `MentionInputProps` | `behaviour/mention-input.test.tsx` | `combobox` |
| `hotkey-input` | Hotkey-recorder input | partial | `packages/components/src/hotkey-recorder.tsx` | `HotkeyRecorderProps` | `behaviour/hotkey-recorder.test.tsx` | `keycap` |
| `countdown` | Countdown | yes | `packages/components/src/countdown.tsx` | `CountdownProps` | `behaviour/countdown.test.tsx` | `text` |
| `carousel` | Carousel | partial | `packages/components/src/carousel.tsx` | `CarouselProps` | `behaviour/carousel.test.tsx` | `tabs` |
| `inline-edit` | Inline edit | partial | `packages/components/src/inline-edit.tsx` | `InlineEditProps` | `behaviour/inline-edit.test.tsx` | `text-input` |
| `keycap` | Keyboard shortcuts / keycap display | yes | `packages/components/src/keyboard-shortcuts.tsx` | `KeyboardShortcutsProps` | `behaviour/keyboard-shortcuts.test.tsx` | `hotkey-input` |

`date-picker` is retitled **Date pickers** (the inventory split it) and its page
frontmatter follows. Its limitation says a time picker is separate; it now links
the new page. The page slug stays `date-picker`.

Every source file exports more part types than the root (`FieldsetLegendProps`,
`MessageScrollerItemProps`, …). Like the existing compound pages (Dialog,
Pagination, Command menu), the page's table documents the **root** type; the
parts are named in `Anatomy`/`Composition` prose. Do not add a second table for
this pass — `api-reference.mdx` stays a root-type index, matching plan 441.

## 3. What each page says (the template)

Use `content/docs/components/dialog.mdx` as the shape. Twelve sections exactly,
in the order `sectionsFor("static")` returns:

`Usage`, `Variants`, `Sizes`, `States`, `Composition`, `API reference`,
`Keyboard and focus`, `Theming`, `Accessibility and limitations`,
`Dependencies`, `Source`, `Related`.

Content source of truth, in this order:

1. `packages/components/docs/<file>.mdx` — the package's own page (anatomy,
   value rules, keyboard table, limitations, verification). Adapt it; do not
   invent behaviour it does not state.
2. `COMPONENTS.md` Tier 2 row — status/support/notes and the behaviour count.
3. The component source — the exact prop names and defaults in the API table
   (generated, so only the tsdoc needs to exist).
4. `packages/components/examples/<file>.example.tsx` — the real composition
   included by `## Composition`.

Sections that do not apply say "none" and why (the template rule). A component
with no sizes says so; one with no variants says so.

Frontmatter `title`/`description` must equal the record's `title`/`summary`
(`component-pages.test.ts`). `<ComponentState slug>` + `<NativePreview slug>`
are mandatory. `<ComponentPreview slug>` is added in §5 for the 13 static
components.

The `## Composition` block includes the package example with the paired tag:

```mdx
<include lang="tsx" meta='title="packages/components/examples/time-picker.example.tsx"'>
  ../../../../../packages/components/examples/time-picker.example.tsx
</include>
```

The `## Source` block includes the entry file the same way. `## API reference`
is `<auto-type-table path="../../../../../packages/components/src/<file>.tsx" name="<Root>Props" />`.

## 4. Files and edits, in order

1. `apps/docs/src/component-meta/entries.ts`
   - retitle the `date-picker` record/summary (summary already correct) and add
     `time-picker` next to it;
   - convert the 15 `planned(...)` records into `delivered(...)` with the table
     above, in inventory order at the end of `composition`;
   - add `message-scroller` (it has no record at all) in the same position the
     inventory lists it — after `time-picker`;
   - update `popover` and `combobox` `gpuix` to `partial` (the merge changed
     those inventory cells) and keep their existing limitations, which satisfy
     the partial-support rule.
2. `apps/docs/content/docs/components/<slug>.mdx` — 17 new pages, 1 retitled.
3. `apps/docs/content/docs/components/meta.json` — append the 17 slugs after
   `date-picker`, in registry order; keep the two separators.
4. `apps/docs/src/component-meta/entries.ts` dependencies — after step 2 run
   the drift guard, copy each derived list into its record verbatim. Do not
   hand-sort: the derived list is the contract.
5. `apps/docs/src/components/preview/approximations.tsx` + the three preview
   files (`control-previews.tsx`, `composition-previews.tsx`,
   `feedback-previews.tsx` or a new `supplement-previews.tsx`) — 13 tier-A
   previews (see §5), registered in `previewsBySlug`.
6. `apps/docs/src/components/preview/scene-contract.test.ts` — add the four
   measured interaction gaps to `noLiveScene` (§5).
7. `apps/docs/README.md` — the "Adding a component page" count and the
   "Previews" paragraph state the new totals and names; `content/docs/` prose
   that hand-counts component pages (if any) follows `plan 450`'s rule.
8. `TODO.md`, `.agents/slop/plans/README.md` — tick and index this plan.

## 5. Previews: tier A or a measured gap

`scene-contract.test.ts` allows a delivered page with neither scene nor
illustration **only** when it is listed in `noLiveScene` with a measured reason.
Thirteen of the seventeen have a static, meaningful rest state and get a tier-A
approximation (built only from `--preview-*` variables, never a literal):

| Slug | What the approximation shows |
| ---- | ---------------------------- |
| `fieldset` | legend + two labelled fields in a group |
| `form` | a field, an invalid field and the `role="alert"` summary |
| `stepper` | three steps: complete / current / upcoming |
| `timeline` | three events with the connector, current marked |
| `color-picker` | six swatches, the selected one, a HEX field |
| `tag-input` | two chips, the field and its placeholder |
| `countdown` | `MM:SS` and the long `HH:MM:SS` form |
| `carousel` | one slide, the controls and the position |
| `inline-edit` | display text with the edit affordance |
| `keycap` | a shortcut table using `kbd` keycaps |
| `time-picker` | two segments, the `:` and the clear control |
| `message-scroller` | three message rows and the jump-to-latest affordance |
| `preview-card` | the card surface with a title, body and link |

Four pages stay at tier V with a measured reason, because their rest state is a
trigger and an approximation would show nothing about the component:

- `drawer` — the panel exists only while open and is anchored by its trigger;
- `navigation-menu` — the panel exists only while open; the rest state is a nav row;
- `mention-input` — the suggestion list exists only while a query is open and no prop opens it;
- `hotkey-input` — the field's content is a captured chord, which needs a real key event.

If a reason stops being true (a prop opens the surface), the guard fails and the
page moves to a live scene or an approximation.

## 6. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/docs-site
nub run --filter docs test
# expected: all files pass; the count rises from 255 by the new guards' cases
nub run --filter docs check-types
# expected: exit 0, no error
nub run check
nub run lint
nub run --filter docs build
```

`smoke:build`, `smoke:browser` and `smoke:preview` are release checks; run
`smoke:build` after the content change (it crawls every sitemap page). A new MDX
page with a broken include or a missing link fails there, not in the unit suite.

## 7. STOP conditions

- A `COMPONENTS.md` row's status, support word or title differs from the table:
  stop — the inventory moved again; re-read §Tier 2 before writing.
- A source path or runtime suite in §2 does not exist: stop; the record would
  claim a component that is not in the tree.
- A page needs behaviour the package docs do not state: stop; do not infer it
  from a component name.
- A tier-A preview would need a colour literal or a `--preview-*` name the
  surface does not define: stop and add the token path to `theme-surface.tsx`
  first (plan 451's rule), or drop the preview to a measured tier-V gap.
- The full suite cannot go green without editing `COMPONENTS.md` or a package
  source: stop — those belong to another workstream; record the ask in
  `TODO.md` instead.

## 8. Test plan

The guards already exist; this plan adds pages and records, so the tests that
must fail first are the four failing registry cases and the dependency drift.
Verify each direction:

1. **Registry status/support** — after the records change but before the pages,
   `registry.test.ts` is green for status/support and
   `has a page and source` fails on the 17 slugs. Add the pages; it passes.
2. **Template** — temporarily remove one required heading from a new page;
   `component-pages.test.ts` must name that page and section. Restore.
3. **API tables** — remove one `api` entry from a record; `content-references`
   / `api-index` must fail on page ⇄ registry drift. Restore.
4. **Dependencies** — delete one module from a derived list; `dependencies.test.ts`
   must fail with the expected list. Restore.
5. **Preview contract** — remove a slug from `previewsBySlug` while its page
   still renders `<ComponentPreview>`: `component-preview.test.tsx` fails.
   Remove the `<ComponentPreview>` too and `scene-contract.test.ts` fails until
   the gap is listed. Restore.
6. **Sidebar** — drop one new slug from `meta.json`; `registry.test.ts` fails.
   Restore.
7. **Built site** — `smoke:build` reports the new pages in the crawl and no
   broken include or link.

## 9. Acceptance

- Four previously failing tests pass; the suite is green.
- 17 new component pages with generated props, real source, a real example and
  an honest preview; `date-picker` matches the split row.
- Sidebar, sitemap, search and `/docs/api-reference` all see the new records
  without a per-page edit.
- `README.md`, plan index and `TODO.md` state the new totals.
- `nub run check`, `nub run lint`, `nub run test` and `nub run --filter docs build`
  exit 0.

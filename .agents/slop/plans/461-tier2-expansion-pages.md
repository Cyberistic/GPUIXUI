# 461 — The Tier 2 expansion: 17 delivered components the site has never documented

**Phase:** C (docs half) · **Owner:** `docs-site` · **Status:** implemented
**Depends on:** 410, 411, 412, 414, 415, 425, 428, 432, 441; `packages/components`
plans 119–157 (merged from `origin/master` in this worktree).

## 1. Why

`origin/master` now ships **seventeen Tier 2 components** — and their fixes —
that predate this branch's last docs pass: time picker, message scroller,
fieldset, form, navigation menu, preview card, drawer, stepper, timeline, colour
picker, tag input, mention input, hotkey recorder, countdown, carousel, inline
edit, and the keyboard-shortcuts/keycap display. The components workstream's
`COMPONENTS.md` marks every one `done`, and its `src/inventory.test.ts` proves
each has a behaviour suite, an example and a row. Its own TODO says:

> docs-site pages are still pending (docs-site workstream)

The site's registry still lists all seventeen as `planned`, so
`apps/docs/src/component-meta/registry.test.ts` fails against the real
inventory, and a reader cannot discover a delivered component. This plan closes
that gap without inventing a second page shape.

The same merge also changed nine existing components' imports (the dependency
block drifts) and split **Date / time pickers** into **Date pickers** and
**Time pickers** in `COMPONENTS.md`; the date record's title and its "no time
picker" limitation are now false.

## 2. Current state (measured in this worktree, 2026-10-18)

- `packages/components` has 38 Tier 2 records; 308 package tests pass.
- `apps/docs` has 49 component pages and 255 tests; 4 fail after the merge:
  - `registry.test.ts` — 17 records `planned`, inventory `done`; `date-picker`
    has no row because the row split.
  - `dependencies.test.ts` — nine existing records' import lists drifted
    (`toast`, `dialog`, `context-menu`, `command-menu`, `accordion`, `combobox`,
    `date-picker` and the dependency-block render).
- Every new component already has `packages/components/docs/<name>.mdx` and
  `packages/components/examples/<name>.example.tsx`. The docs page adapts that
  prose, includes the real example and entry file, and generates its prop table
  from the exported props type. **No new example is written.**

## 3. Files

### 3.1 Records — `apps/docs/src/component-meta/entries.ts`

Move each `planned(...)` below to `delivered(...)` with the values in the table.
`status: "done"`; `gpuix` and `limitations` come from the `COMPONENTS.md` row
(already merged); `runtime` uses the shared `nativeSuite` helper; `dependencies`
is filled from `dependencies.test.ts`'s expected list after the page exists.

| Slug | Title (exact `COMPONENTS.md` name) | `sourcePath` | `api` | Example |
| ---- | ---------------------------------- | ------------ | ----- | ------- |
| `time-picker` | Time pickers | `packages/components/src/time-picker.tsx` | `TimePickerProps`, `TimePickerSegmentProps` | `time-picker.example.tsx` |
| `message-scroller` | Message scroller | `packages/components/src/message-scroller.tsx` | `MessageScrollerProps`, `MessageScrollerViewportProps` | `message-scroller.example.tsx` |
| `fieldset` | Fieldset | `packages/components/src/fieldset.tsx` | `FieldsetProps` | `fieldset.example.tsx` |
| `form` | Form | `packages/components/src/form.tsx` | `FormProps` | `form.example.tsx` |
| `navigation-menu` | Navigation Menu | `packages/components/src/navigation-menu.tsx` | `NavigationMenuProps`, `NavigationMenuLinkProps` | `navigation-menu.example.tsx` |
| `preview-card` | Preview Card | `packages/components/src/preview-card.tsx` | `PreviewCardProps`, `PreviewCardContentProps` | `preview-card.example.tsx` |
| `drawer` | Drawer | `packages/components/src/drawer.tsx` | `DrawerProps`, `DrawerContentProps` | `drawer.example.tsx` |
| `stepper` | Stepper | `packages/components/src/stepper.tsx` | `StepperProps`, `StepperStepProps` | `stepper.example.tsx` |
| `timeline` | Timeline | `packages/components/src/timeline.tsx` | `TimelineProps`, `TimelineItemProps` | `timeline.example.tsx` |
| `color-picker` | Color picker | `packages/components/src/color-picker.tsx` | `ColorPickerProps` | `color-picker.example.tsx` |
| `tag-input` | Tag / token input | `packages/components/src/tag-input.tsx` | `TagInputProps`, `TagInputChipProps` | `tag-input.example.tsx` |
| `mention-input` | Mention input | `packages/components/src/mention-input.tsx` | `MentionInputProps`, `MentionInputItemProps` | `mention-input.example.tsx` |
| `hotkey-input` | Hotkey-recorder input | `packages/components/src/hotkey-recorder.tsx` | `HotkeyRecorderProps` | `hotkey-recorder.example.tsx` |
| `countdown` | Countdown | `packages/components/src/countdown.tsx` | `CountdownProps` | `countdown.example.tsx` |
| `carousel` | Carousel | `packages/components/src/carousel.tsx` | `CarouselProps`, `CarouselSlideProps` | `carousel.example.tsx` |
| `inline-edit` | Inline edit | `packages/components/src/inline-edit.tsx` | `InlineEditProps` | `inline-edit.example.tsx` |
| `keycap` | Keyboard shortcuts / keycap display | `packages/components/src/keyboard-shortcuts.tsx` | `KeyboardShortcutsProps`, `KeycapProps` | `keyboard-shortcuts.example.tsx` |

Every `runtime` is
`nativeSuite("@gpuixui/components", "src/behaviour/<file>.test.tsx")`, where
`<file>` is the component's name (`hotkey-recorder`, `keyboard-shortcuts`,
`time-picker`, …). The behaviour suite already exists for each.

**Date picker:** change the record's title to `Date pickers`, keep its source and
suite, and replace the "No time picker…" limitation with the real one: a date is
picker-only, and the time of day is `TimePicker` (a separate field, not a
popup). Add `time-picker` to its `related` list, and `date-picker` to the time
picker's.

### 3.2 Pages — `apps/docs/content/docs/components/<slug>.mdx`

One page per row of §3.1. Use the existing template exactly; the section order
is `component-pages.test.ts`'s `sectionsFor("static")`:

```
<ComponentState slug="…" />
<NativePreview slug="…" />
## Usage
## Variants
## Sizes
## States
## Composition
## API reference
## Keyboard and focus
## Theming
## Accessibility and limitations
## Dependencies
## Source
## Related
<RelatedComponents slug="…" />
```

Facts come from `packages/components/docs/<name>.mdx` and the real source — never
invent a variant or a key. Where the package doc says a thing does not exist
(no animation, no `aria-current`, no saturation square), the page says the same.
`## Sizes` may say "None" where the component has no size axis; that is a real
answer, not a missing section.

`## Composition` includes the real example:

```mdx
<include lang="tsx" meta='title="packages/components/examples/<name>.example.tsx"'>
  ../../../../../packages/components/examples/<name>.example.tsx
</include>
```

`## Source` includes the entry file the record names. `## API reference` has one
`<auto-type-table>` per `api` entry, with the path relative to the MDX file
(`../../../../../packages/components/src/<file>.tsx`). `## Dependencies` renders
`<ComponentDependencies slug="…" />`; `## Related` renders
`<RelatedComponents slug="…" />`.

### 3.3 Sidebar — `apps/docs/content/docs/components/meta.json`

Append the 17 slugs to the Tier 2 section in `COMPONENTS.md` order:

```
time-picker, message-scroller, fieldset, form, navigation-menu, preview-card,
drawer, stepper, timeline, color-picker, tag-input, mention-input,
hotkey-input, countdown, carousel, inline-edit, keycap
```

`registry.test.ts` proves sidebar = index + every non-planned slug.

### 3.4 Existing records' dependency lists

`dependencies.test.ts` prints the expected list per record. Copy it into the
record's `dependencies` array; never loosen the test. The nine drifted records
are the merge's import changes, not new components.

### 3.5 `COMPONENTS.md`

Prefix the new rows' notes with `[docs](apps/docs/content/docs/components/<slug>.mdx) · `
once the page exists. The date/time split gets both links.

### 3.6 README and TODO

- `apps/docs/README.md`: 49 → 66 component pages; name the new set.
- `TODO.md`: tick this row under the docs-site workstream; keep the count
  current. Record that the live-scene backlog for these components is not part
  of this plan (each page sits at tier V until a scene exists).
- This plan's index row in `.agents/slop/plans/README.md`.

### 3.7 Previews — tier A or a measured gap

`scene-contract.test.ts` (plan 458) fails for any delivered page with no live
scene, no `<ComponentPreview>` and no entry in its `noLiveScene` map. These
components have no wasm scene (plan 455–458's scene set does not include them),
so each page takes one of two honest routes:

- **Tier A** for the thirteen with a static, meaningful rest state: time picker,
  message scroller, fieldset, form, preview card, stepper, timeline, color
  picker, tag input, countdown, carousel, inline edit, keycap. Each preview is
  built only from `--preview-*` values on `PreviewSurface` and registered in
  `previewsBySlug`; it shows the resting layout, never an interaction.
- **Tier V with a measured reason** for the four whose rest state is a trigger
  and whose surface exists only while open: drawer, navigation menu, mention
  input, hotkey-recorder input. Their reasons go in `noLiveScene`, and the page
  keeps the real native suite as its evidence (tier V).

A reason that stops being true (a prop opens the surface) fails the guard, which
is the point: the page then moves to a live scene or an approximation.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 0 failures; the registry, page, source, API, dependency, sidebar and sitemap suites pass |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0; 66 component routes plus the rest |
| `nub run --filter @gpuixui/components test` | 308 tests, unchanged |
| `nub run check` | test quality, lint, format and types green |
| `nub run lint` / `nub run test` | green |
| `nub run --filter docs smoke:build` | every sitemap page renders; the new slugs are in it |

## 5. STOP conditions

- A component's package doc or source contradicts the `COMPONENTS.md` row: stop
  and record the contradiction in `TODO.md`; do not write a page around it.
- An export named in §3.1 is not exported by the entry file: fix the table (the
  real export wins) or stop if the source is missing.
- A required section cannot be written truthfully (for example, a variant list
  with no source evidence): say "None"/the limitation, and keep the section.
- A dependency list needs an import the record's entry file does not have: the
  test is right; fix the record, not the test.
- A page needs a live scene to be honest: it does not — tier V names the real
  suite. Do not add a scene outside plans 455–458's contract.

## 6. Test plan

The guards already exist; this plan adds content, so the tests are the proof:

1. `registry.test.ts` — every new record's status and GPUix word equal its
   `COMPONENTS.md` row, every related slug exists, a live scene key is real.
2. `component-pages.test.ts` — all 11 sections, the state and preview blocks,
   and title/description agreement for every new page.
3. `content-references.test.ts` — each page includes its real source, each props
   type resolves, each `<include>` is paired.
4. `dependencies.test.ts` — every record's imports are re-derived from source.
5. `component-truth.test.ts` — every backticked path/name a page claims exists.
6. `content.test.ts` / `sitemap.test.ts` / search — the new routes, sidebar order
   and search hits.
7. `component-pages.test.ts` fails if a page loses a section; prove it once by
   deleting `## Keyboard and focus` from a new page, observing the failure, and
   restoring it.

## 7. Acceptance

- All 17 components are `delivered` records with a page, a generated props
  table, the real example, the real source and their native suite named.
- Date and time are documented as the two components they now are.
- The nine drifted dependency lists match their entry files.
- Every gate in §4 is green, and the change is pushed on `agent/docs-site`.

## 8. Progress (2026-10-18)

Landed in one pass, after merging `origin/master` (which brought the components
expansion, ADRs 0004–0005 and plans 119–157):

- **17 delivered records and pages**, each with the real example include, the
  entry-file source include, generated props tables and its behaviour suite.
  The date row split into **Date pickers** and **Time pickers**; the date page
  no longer claims "no time picker".
- **13 tier-A previews** (`src/components/preview/supplement-previews.tsx`,
  registered through `approximations.tsx`): Time picker, Message scroller,
  Fieldset, Form, Preview card, Stepper, Timeline, Color picker, Tag input,
  Countdown, Carousel, Inline edit and Keyboard shortcuts. They are rest states
  built only from `--preview-*` values, so the platform toggle reaches them.
- **4 measured tier-V gaps**, now the only entries in `scene-contract.test.ts`'s
  reason map: Drawer (exists only while open, anchored by its trigger),
  Navigation menu (the panel exists only while open), Mention input (the list
  needs an open query and no prop opens it) and Hotkey recorder (needs a real key
  event, not a static layout).
- `COMPONENTS.md` keeps the components workstream's exact notes/test counts and
  gains the `[docs]` link for every new row. Its Tier 2 table was replaced from
  the merged `master` version, because that table is the inventory the
  components package tests.
- The test guards that assumed a planned component now use the exported
  `componentSearchIndex`/`componentSearchUrl` and `PreviewUnavailable` with
  fixtures; every real record is delivered.
- Measured: `nub run --filter docs test` 41 files / 255 tests green,
  `check-types` green, `nub run --filter @gpuixui/components test` 308 tests
  green.

A duplicate plan (`461-tier2-supplement-pages.md`) was written by a second
docs-site loop turn against the same tree; it was folded into this plan and
deleted. The loop was stopped (AGENTS §6 one writer per tree); the measurement
is in `.agents/slop/docs-site-concurrency.md`.


# 452 — Tier-A previews for the static Tier 2 compositions

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 412, 434, 449, 451.

## 1. Why

After plan 451, 21 of the 49 component pages carry a tier-A preview. The Tier 2
pages with a static resting layout still show only the native-coverage notice, so
the design system's composition surfaces — a list, an empty state, a breadcrumb,
a page control — are documented in prose but never seen.

This plan adds eight labelled rest previews for the Tier 2 compositions whose
rest state is static. Menus, dialogs, toasts, popovers and anything whose meaning
is an interaction stay at tier V/X, exactly as plans 449 and 451 decided.

## 2. Scope

| Slug | Rest states |
| ---- | ----------- |
| `list` | five rows, one selected, one disabled, a section label |
| `empty-state` | title, description, primary action, second (quiet) action |
| `inline-validation` | a valid field with help text and an invalid field with its error |
| `breadcrumb` | a four-crumb trail with the current page as text |
| `pagination` | first/prev disabled, current page, ellipsis, next/last |
| `search-input` | a query with the leading glyph and the clear affordance |
| `accordion` | one expanded section and one collapsed header |
| `collapsible` | the trigger and the open panel |

Out of scope: dialog, confirm dialog, popover, dropdown/context/command menu,
toast, tooltip, combobox, date picker (a closed trigger says nothing and an open
surface is an interaction), table/workspace rows that do not exist yet.

## 3. Files

**Create**

- `apps/docs/src/components/preview/composition-previews.tsx` — the eight
  previews over the shared `preview-styles` helpers. One local `Action` span and
  one `Glyph` span cover the button-shaped and icon-shaped pieces; no component
  package is imported.

**Change**

- `apps/docs/src/components/preview/approximations.tsx` — register the eight
  slugs.
- `apps/docs/content/docs/components/{list,empty-state,inline-validation,breadcrumb,pagination,search-input,accordion,collapsible}.mdx`
  — `<ComponentPreview slug="…" />` below `<NativePreview … />`.
- `apps/docs/src/components/preview/approximations.test.tsx` — eight
  `documentedStates` rows.
- `apps/docs/src/components/preview/theme-surface.test.tsx` — add
  `composition-previews.tsx` to the literal and variable-name scans.
- `apps/docs/README.md` — name the Tier 2 coverage.
- `.agents/slop/plans/README.md`, `TODO.md`.

## 4. Rules

Unchanged from `docs/preview-strategy.md`: `div`/`span` only, no `role`,
`tabIndex` or handler, no colour/space/radius literal, only `--preview-*` names
the surface defines, registered for a delivered slug, rendered on its page.

## 5. Tests

1. The existing five preview contracts widen over the registry automatically.
2. `documentedStates` gains eight rows. Prove it can fail by removing the
   pagination's current page label, observing `pagination: …`, then restoring.
3. The variable-name and literal scans cover the new file. Prove the variable
   scan by adding one kebab-case name and observing the failure, then removing it.
4. `nub run --filter docs smoke:browser` still passes; no new route is needed
   because every preview shares `PreviewSurface`, but the existing check proves
   hydration still paints the platform theme.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 232 + the new rows pass |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| `nub run check` / `nub run lint` / `nub run test` | the §7 gate in `AGENTS.md` |

## 7. STOP conditions

- The only honest depiction needs an open overlay or a live control: leave the
  page at tier V and record why. Do not paint a dialog or a menu.
- A preview needs a component package import: stop — the docs site reads source
  only (`architecture.test.ts`).
- A colour role the preview needs is missing from the theme: stop and record the
  token role in `TODO.md`; do not invent a colour.

## 8. Acceptance

- Eight more Tier 2 pages carry a labelled approximation built from the active
  `Theme`; 29 previews in total.
- The state, literal and variable-name guards cover the new file and fail when
  a state or a token name is broken.
- All gates green; plan index, `apps/docs/README.md` and `TODO.md` updated;
  committed and pushed on `agent/docs-site`.

## 9. Progress (2026-10-17)

- `composition-previews.tsx` holds `ListPreview`, `EmptyStatePreview`,
  `InlineValidationPreview`, `BreadcrumbPreview`, `PaginationPreview`,
  `SearchInputPreview`, `AccordionPreview` and `CollapsiblePreview`; the eight
  pages render their block and the registry holds 29 previews.
- `documentedStates` gained eight rows. Two-direction proof: deleting the
  pagination's ellipsis cell failed with `pagination: …`; restoring it passed.
  The first attempt asserted the current page's `3`, which every rendered style
  attribute also contains, so the test could not fail; the phrase moved to the
  ellipsis and its caption.
- The literal and variable-name scans now cover the new file. Re-introducing
  `var(--preview-color-primary-foreground)` failed with
  `composition-previews.tsx: --preview-color-primary-foreground`; fixing it
  passed.
- `nub run --filter docs test` — 39 files / 232 tests; type-check, build,
  `check`, `lint` and the repository test suite green.

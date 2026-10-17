# 453 — Tier-A previews for the remaining static layout pages

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 412, 449, 451, 452.

## 1. Why

Plans 449, 451 and 452 took preview coverage to 29 of 49 pages. The static
layout and typography pages — the ones a reader visits to understand the design
system before choosing a control — still have no visual. After this plan every
page whose rest state is static carries a labelled preview; the 13 remaining
pages are interactions (menus, dialogs, toast, popover, combobox, date picker,
tooltip, scroll area), animations (skeleton, spinner) or the icon set, and stay
at tier V/X.

## 2. Scope

| Slug | Rest states |
| ---- | ----------- |
| `text` | display, h1, h2, body, strong, label, caption and code roles |
| `separator` | horizontal rule between sections, vertical rule between links |
| `spacer` | two edges pushed apart by the spacer |
| `stack` | a column and a row with their gaps |
| `box` | a padded surface inside another, with radius and border |
| `button-group` | an attached three-button group and a separated group |
| `label` | a label with description, a required marker, a disabled label |

`icon` is out: the icon page documents a real glyph set, and drawing substitute
glyphs would show a shape the library does not ship. It stays at tier V.

## 3. Files

**Create**

- `apps/docs/src/components/preview/layout-previews.tsx` — the seven previews
  over `preview-styles`; one local `Rule` and one local `GroupButton`.

**Change**

- `apps/docs/src/components/preview/approximations.tsx` — register seven slugs.
- `apps/docs/content/docs/components/{text,separator,spacer,stack,box,button-group,label}.mdx`
  — `<ComponentPreview slug="…" />` below `<NativePreview … />`.
- `apps/docs/src/components/preview/approximations.test.tsx` — seven
  `documentedStates` rows.
- `apps/docs/src/components/preview/theme-surface.test.tsx` — add
  `layout-previews.tsx` to the literal and variable-name scans.
- `apps/docs/README.md`, `.agents/slop/plans/README.md`, `TODO.md`.

## 4. Rules

Unchanged: `div`/`span` only, no role/tabIndex/handler, no palette literal, only
defined `--preview-*` names, registered for a delivered slug, rendered by its
page. A rule or a group is decoration; none may look like a live control.

## 5. Tests

1. The five preview contracts widen over the registry automatically.
2. `documentedStates` gains seven rows. Prove it can fail by removing the text
   preview's code sample, observing `text: const theme = createTheme(…)`, then
   restoring it.
3. The literal and variable-name scans cover the new file. Prove the variable
   scan with one kebab-case name, then restore it.
4. `nub run --filter docs build` renders the seven pages.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 232 tests pass; the new rows are covered |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| `nub run check` / `nub run lint` / `nub run test` | the §7 gate in `AGENTS.md` |

## 7. STOP conditions

- A page's only honest depiction needs a real control or an interaction: leave
  it at tier V and record why. Do not draw a fake button.
- A preview needs a component package import: stop — the docs site reads source
  only (`architecture.test.ts`).
- A needed colour or metric role is missing: record it in `TODO.md`; do not add
  a literal.

## 8. Acceptance

- Seven more pages carry a labelled approximation; 36 previews in total.
- Every component page whose rest state is static now has one; the 13 that do
  not are named in `apps/docs/README.md` with the reason.
- All gates green; plan index and `TODO.md` updated; committed and pushed on
  `agent/docs-site`.

## 9. Progress (2026-10-17)

- `layout-previews.tsx` holds `TextPreview`, `SeparatorPreview`,
  `SpacerPreview`, `StackPreview`, `BoxPreview`, `ButtonGroupPreview` and
  `LabelPreview`; the seven pages render their block and the registry holds 36
  previews.
- `documentedStates` gained seven rows. Two-direction proof: deleting the code
  sample from the text preview failed with
  `text: const theme = createTheme(`; restoring it passed. The assertion stops
  before the quoted argument because `renderToStaticMarkup` escapes `"` to
  `&quot;`.
- The new file is under the literal and variable-name scans; one kebab-case name
  failed, then passed.
- `nub run --filter docs test` — 39 files / 232 tests; type-check, build,
  `check`, `lint` and the repository test suite green.

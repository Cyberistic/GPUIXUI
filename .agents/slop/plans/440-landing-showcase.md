# 440 — The landing page shows the real library: design system, inventory and preview model

**Phase:** F (showcase quality) · **Owner:** docs-site · **Status:** planned
**Depends on:** 410, 411, 416, 429, 434; `@gpuixui/tokens` `colorRoles` /
`platformTypes` / `themes`

## 1. Why this plan exists

`MISSION.md` requires "Showcase quality: … a useful landing page and
quick-start", and the site's `/` is the page every reader sees first. Today it is
a text column: a headline, two buttons, a quick-start block and two counts. It
shows no part of the design system, gives no picture of what exists versus what
is planned, and does not tell a newcomer how the site's previews relate to the
native runtime.

This is **not** a request for decoration. The landing page is the one place that
can answer three questions at a glance, and every answer must come from real
data:

1. what the design system looks like (both themes, the platform styles);
2. how much of the inventory is documented, by tier;
3. how a preview on this site is labelled, and why none of them is a browser
   imitation passed off as native.

## 2. Current state (measured 2026-10-17, `c976d82`)

- `apps/docs/src/components/landing.tsx` — 82 lines; `QUICK_START` (two
  commands) plus a two-count `<dl>`. Its six tests in `landing.test.tsx` guard
  the quick start against `installation.mdx`, the Bun/`check-types` honesty
  sentence, the single `<main>` landmark, four links and the two counts.
- The registry has **65 records: 49 documented, 16 planned**, in two groups
  (`foundational` / `composition`). `groups` already groups them by tier and
  carries `groupTitles`; nothing on the landing page reads it.
- `@gpuixui/tokens` exports `colorRoles`, `themes`/`themeColors` (via
  `src/lib/docs-theme.ts`) and `platformTypes`; the Theming page already renders
  the full 47-role table and every scale. The landing page may reuse the data,
  not copy values.
- The committed native captures (`public/screenshots/theming/*.png`) are **theme
  gallery developer frames**: a swatch grid with a large empty window area. They
  are honest evidence on Theming and are **not** used here — a landing image
  must not be a picture of a test harness.
- No component screenshot exists, so the landing page shows no component image.
  A browser-drawn component would be the forbidden "decorative placeholder
  presented as native".

## 3. What changes

### 3.1 `apps/docs/src/components/landing.tsx`

Keep the hero, the quick start and the honesty paragraph. Add three sections,
all fed by real data:

| Section | Content | Source |
| ------- | ------- | ------ |
| **The design system** | a compact light and dark palette (8 semantic roles each) and the three platform mono families | `themeColors` (`docs-theme.ts`), `platformTypes` |
| **What is documented** | one line per registry group: tier, group title, documented count, tracked count, link to the index | `groups`, `groupTitles`, `components` |
| **How previews work** | the five honest tiers in one line each, link to Architecture | a `PREVIEW_TIERS` constant in this file, wording matching `docs/preview-strategy.md` |

Rules:

- **No literal colour.** A swatch's `backgroundColor` is
  `themeColors[mode][role]`. The test asserts the rendered value equals the
  package value, so a renamed role or an edited token shows up as a failure.
- **No hard-coded counts.** Every number comes from the registry.
- **No native claim.** The palette is labelled as the library's semantic roles
  rendered in the browser; the preview section states that no browser surface is
  GPUix.
- Mark up the palette as a list whose items carry `role="img"` and an
  `aria-label` of `<role> <value>`; a colour chip without a name is invisible to
  a screen reader. Keep the existing single `<main>`-free contract.

### 3.2 `apps/docs/src/components/landing.test.tsx`

Keep the existing guards (they caught real regressions: the double `<main>` and
the Bun claim) and add:

1. **Palette values are the package's** — for every rendered role/mode the
   markup carries `background-color:<themeColors[mode][role]>` and
   `data-role`/`data-mode`; every role is a member of `colorRoles`.
2. **Tier counts are derived** — each group's `data-documented` /
   `data-tracked` equals the registry's own counts, and the group title equals
   `groupTitles`.
3. **All five preview tiers are named** — and the section links to
   `/docs/architecture`; a tier removed from `PREVIEW_TIERS` fails.
4. **Platform families are the package's** — `Menlo`, `DejaVu Sans Mono`,
   `Consolas` are rendered from `platformTypes`, not typed as strings.

### 3.3 `apps/docs/README.md`

One short "Landing page" subsection: what it derives from, and that it must
never show a component image until a proven capture exists.

## 4. Test plan (two directions)

| Test | Fails when removed/regressed |
| ---- | ---------------------------- |
| palette | change one swatch to a literal hex → expected package value missing |
| palette membership | rename a role in `PALETTE_ROLES` to something not in `colorRoles` → fails |
| tier counts | hard-code `20` while the registry says another number → fails |
| preview tiers | delete a tier from `PREVIEW_TIERS` → its label is absent |
| platform families | hard-code `Menlo` in the component and change `platformTypes` → fails |
| existing guards | quick start drift, Bun claim, `<main>` landmark, links |

Run each new assertion once against the old component (it must fail), then
against the new one. Record the failure text in the commit message or this plan.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass, including the new landing tests |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0`; `/` renders the new sections |
| `nub run --filter docs smoke:build` | exit `0`; `/` still has one `<main>`, a title, `<h1>`, canonical and the same links |
| `nub run check`, `nub run lint`, `nub run test` | the repository gate |

## 6. STOP conditions

- A proposed section needs a component image or a native frame that does not
  exist: stop and leave the section out. Do not draw a browser imitation.
- The tier counts cannot be derived from the registry without duplicating it:
  stop and record the missing metadata rather than hard-coding numbers.
- Any existing landing test has to be deleted to make the page pass: stop — the
  test guards a real regression (plan 439's nested `<main>`, plan 436's Bun
  claim). Update its expectation only when the new markup still proves the same
  fact.
- `smoke:build` exits `2` (cannot run): record the output; do not report a pass.

## 7. Acceptance

- `/` shows the real light and dark semantic palettes, the three platform mono
  families, the documented/tracked count per tier and the five preview tiers.
- Every value and number is derived from `@gpuixui/tokens` or the component
  registry; no colour literal, no hand-counted number.
- The page still contains no component image and makes no native claim.
- All docs suites, type-check, build and the built-site smoke pass; the
  repository gate passes; `TODO.md` and the plan index are updated; the change
  is committed and pushed on `agent/docs-site`.

## 8. Progress (2026-10-17)

- **Implemented.** `landing.tsx` now has the hero, a light/dark palette (8
  roles, each value from `themeColors`), the three platform families from
  `platformTypes`, one inventory line per registry group, the quick start and
  the five preview tiers. `landing.test.tsx` renders it with
  `renderToStaticMarkup` and guards each derivation; nine tests in the file.
- **Four two-direction proofs, measured:**

  | Mutation | Failure |
  | -------- | ------- |
  | swatch painted `#5F4BDB` instead of `themeColors` | `expected '<li role="img" aria-label="background…' to contain 'background-color:#F6F8FA'` |
  | `data-documented={done + 1}` | `expected '<div class="mx-auto …' to contain 'data-group="foundational" data-docume…'` |
  | one `PREVIEW_TIERS` entry deleted | `expected [ …(4) ] to have a length of 5 but got 4` |
  | mono family hard-coded to `"Menlo"` | `expected 'Menlo' to contain 'DejaVu Sans Mono'` |

  Each was reverted; the file is restored exactly.
- **Verified:** `nub run --filter docs test` — 33 files / 190 tests;
  `check-types` exit `0`; `build` exit `0`; `smoke:build` exit `0`, 66 pages and
  85 links (one `<main>` on `/`).
- The committed theme-gallery PNGs were inspected and **not** used: they are
  developer swatch grids with a large empty window area, not showcase imagery.

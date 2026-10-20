# 603 — A troubleshooting page readers can act on

**Phase:** F (documentation completeness)
**Depends on:** 410 (site), 412 (preview strategy), 424/426 (truth passes), 461,
487, 490, 495, 512, 520, 584, 589, 602
**Owns:** `apps/docs/content/docs/troubleshooting.mdx`,
`apps/docs/content/docs/meta.json`, `apps/docs/src/lib/page-aliases.ts`,
`apps/docs/src/lib/troubleshooting-page.test.ts`,
`apps/docs/src/lib/page-aliases.test.ts`
**Status:** planned

## 1. The measured gap

The site documents every failure mode it knows about, but only inside the page
that owns the feature. A reader whose window is empty, whose label is invisible,
whose font did not load, whose host has no binding, whose live preview stays
blank, or whose check exited `2` has nowhere to start. The search index says so.

Measured on 2026-10-20 (`nub x vitest run src/lib/search-sweep.tmp.test.ts`, a
throwaway sweep over `src/lib/search.ts`; top three results per query):

| Query | Before | Honest owner |
| ----- | ------ | ------------ |
| `troubleshooting` | **nothing** | this page |
| `debug` | **nothing** | this page |
| `problem` | **nothing** | this page |
| `not working` | Toast | this page |
| `does not work` | Workspace | this page |
| `nothing renders` | Pagination / Drawer text | this page |
| `component not rendering` | Components index | this page |
| `blank window` | Time picker / Dialog text | this page |
| `blank screen` | Showcase heading | this page |
| `crash` | Native testing preflight / Icon | this page |
| `no provider` | Toast | this page |
| `font not applied` | Toast | this page |
| `unsupported host` | Component API host props | this page |
| `help` | Inline validation | this page |
| `support` | Inline validation | this page |
| `preview blank` | Previews page | Previews answers the tiers; this page answers the failure |

Baseline: `nub run --filter docs test` — 114 files / 927 tests green; the site
builds 99 pages. Adding this page makes 100.

Not aliased, because the existing answer is already correct: `error` / `errors`
→ Inline validation, `install fails` / `installation failed` → Installation,
`native binding missing` → Native smoke suite, `exit code 2` → Native smoke
suite, `missing theme` → Theming, `rtl` → Layouts.

## 2. The page

`/docs/troubleshooting`, title **Troubleshooting**, description:

> Fix the failures readers hit: an empty window, a missing or doubled theme
> provider, a font that is not applied, a host with no native binding, a blank
> live preview, a clipped overlay, a platform switch that only changes the type,
> and a check that exits 2.

Every section states what is true of the **pinned** release, links the page that
owns the topic, and never repeats a visible-only-in-this-repo remedy as library
behaviour.

### `## Nothing appears in the window`

- A primitive with no `<ThemeProvider>` above it throws
  `MissingThemeProviderError` at render time; its message names the provider.
  Source: `packages/primitives/src/components/ThemeProvider.tsx` (exported from
  `packages/primitives/src/components/index.ts`).
- `@gpuixui/components` reads the token context, whose default is `lightTheme`
  (`packages/tokens/src/react.ts`), so a components-only tree paints light
  instead of failing. That is the wrong-colour case, not an empty window.
- A host with no binding never creates a window; the native suite reports exit
  `2` before running a scenario. Source: `apps/playground/src/smoke/run.ts`
  (`EXIT.unverified = 2`), `packages/testing` preflight.

Links: `/docs/getting-started#providers`, `/docs/installation#native-bindings`,
`/docs/native-testing#run-it`.

### `## The colours are wrong, or a label is invisible`

- The two contexts, the nesting order and the fallback (link
  `/docs/getting-started#providers`, `/docs/theming#providers`).
- Mode is owned by the application because the runtime exposes no appearance
  query; the recipe is `/docs/dark-mode`.
- High-contrast palettes exist: `/docs/theming#high-contrast`.

### `## A font is not applied`

- `@gpuix/native` 0.10.0 exposes no `registerFont`; `fontFamily` only names an
  **installed** family. `extendTheme({ typography: { sans } })` is the supported
  route. Source: installed declarations (guarded by
  `typography-truth.test.ts`), page `/docs/typography#custom-fonts-on-the-pinned-runtime`.
- A bundled font file cannot be registered on the pinned release; do not claim
  otherwise.

### `## The native binding is missing for this platform`

- The three published targets and the Intel-macOS absence, with the repository's
  build script. The page does not repeat the table (Installation owns it): one
  sentence plus `/docs/installation#native-bindings`, `/docs/capabilities`.
- Exit `2` is "unverified", never a pass: `/docs/native-testing#run-it`.

### `## The live surface stays blank`

- It loads only after a click and downloads about 20 MB
  (`src/components/preview/live-surface.tsx`, `LIVE_SURFACE_DOWNLOAD`).
- A failed frame reports `data-gpuix="failed"` and a reason in `data-reason`;
  a mounted one reports `data-gpuix="ready"`. Source: `preview/main.tsx`.
- It needs a working WebGL/GPU backend in the tab, and its canvas is outside the
  browser accessibility tree (`/docs/accessibility`).
- It is a browser renderer, not the desktop binary: a blank live surface proves
  nothing about the native suites (`/docs/previews`, `/docs/capabilities`).

### `## An overlay is clipped or paints underneath`

- GPUix has no `z-index` and no portal; stacking is paint order, and an
  app-level surface must be mounted last. Source: `## Layering` on
  `/docs/component-api#layering` (plan 589).
- A raw `<anchored>` does not flip at a window edge (`fit="snap"` clamps) and
  `align="center"` is measured as short by half the panel; the library's
  overlays compensate, and `align="start"` is exact. Source:
  `/docs/capabilities` (plan 156 row) — the page must not repeat the numbers,
  only the advice and the link.

### `## The platform switch only changes the type`

- `platformTheme` replaces `name` and `typography.sans`/`mono` only; colours,
  spacing, radius and density stay the base theme's. Source:
  `packages/tokens/src/theme.ts` (`platformTheme`).
- The docs toggle is complete; real per-platform palettes await
  `packages/tokens` plan 063 (`TODO.md`, cross-team row). `apps/docs` must not
  invent platform colours.
- Link `/docs/theming#platform-styles`.

### `## A check exits 2`

Table (both halves are real source, not memory):

| Check | `1` | `2` |
| ----- | --- | --- |
| native smoke (`run.js`) | a scenario failed and a report exists | no binding loaded, no scenario ran |
| docs smokes (`smoke:*`) | the built site or the browser state is wrong | the check could not run (build, server, Chrome) |

- `2` is never a pass; it upgrades no inventory row. Links:
  `/docs/native-testing#run-it`, `/docs/contributing#docs-site`.

### `## Where to ask`

- The repository issue tracker is the only channel (Contributing
  `## Issues and pull requests` already holds the URL). Ask the reader to paste
  the platform, the pinned GPUix version, the binding target, the exact command
  and its exit code. Do not invent a chat, support address or SLA.

## 3. Files and exact changes

1. **Create** `apps/docs/content/docs/troubleshooting.mdx` — the page above.
2. **Edit** `apps/docs/content/docs/meta.json` — add `"troubleshooting"` after
   `"native-testing"` (the runtime-evidence cluster, before the design topics).
3. **Edit** `apps/docs/src/lib/page-aliases.ts` — one entry:
   `/docs/troubleshooting`: `not working`, `does not work`, `nothing renders`,
   `component not rendering`, `blank window`, `blank screen`, `crash`,
   `no provider`, `missing provider`, `font not applied`, `unsupported host`,
   `debug`, `problem`, `help`, `support`.
   `troubleshooting` is **not** an alias: it is the page title and
   `pageTitleHits` already ranks it (the table's "does not shadow a page title"
   guard would reject it).
4. **Create** `apps/docs/src/lib/troubleshooting-page.test.ts` — §4.
5. **Edit** `apps/docs/src/lib/page-aliases.test.ts` — add the measured queries
   to the `owned` table so the real index must return the page first.
6. **Edit** `apps/docs/content/docs/installation.mdx` and
   `apps/docs/content/docs/getting-started.mdx` — one sentence each pointing at
   `/docs/troubleshooting` where the native binding and the providers are
   introduced. No duplicated content.
7. **Edit** `TODO.md` (tick the task and keep the progress bar current) and
   `.agents/slop/plans/README.md` (§4 status column → implemented with the
   measured counts). **Edit** `apps/docs/README.md` only if a command or a guard
   changes; it does not.

Paths outside this workstream: none. `packages/tokens` plan 063 is cross-team;
this page records the limitation, it does not implement the variants.

## 4. Test plan

`apps/docs/src/lib/troubleshooting-page.test.ts` must be able to fail in both
directions. It reads the page and the real sources:

1. **Registered:** `source.getPages()` serves `/docs/troubleshooting` with the
   title and description; `meta.json` lists it after `native-testing`.
2. **Sections:** each `##` heading from §2 is present exactly once.
3. **Provider truth:** `MissingThemeProviderError` is exported by
   `@gpuixui/primitives`' components entry **and** the page names it; the token
   context's default is `lightTheme` **and** the page says a components-only tree
   paints light. Fails if the page claims components throw, or primitives fall
   back.
4. **Font truth:** the installed declarations expose no `registerFont` and the
   page says so; fails if the page promises a bundled font.
5. **Platform truth:** the `platformTheme` body mentions only `name` and
   `typography` (no `colors`/`spacing`/`radii`/`density`) and the page states the
   type-only limitation. If plan 063 lands and the body grows a palette, the test
   fails by name — the page must then be updated.
6. **Preview truth:** `preview/main.tsx` still writes `data-gpuix` and
   `data-reason`, and the page names both.
7. **Exit-code truth:** `EXIT.unverified` is `2` in
   `apps/playground/src/smoke/run.ts`, `SetupError` in
   `apps/docs/scripts/setup-error.ts` is the docs smokes' "could not run" path,
   and the page's table says `2` is never a pass.
8. **Links:** every `/docs/...` link in the page resolves to a served page and
   every `#fragment` names a heading that page renders (the repo-wide guards
   already do this; the page test asserts the specific links so a renamed anchor
   fails by name).
9. **Search:** the 15 aliases reach `/docs/troubleshooting` first and the
   regressions in `page-aliases.test.ts` still pass.

Two-direction proof (record the exact run in the plan §6 when done):
- remove the page from `meta.json` → test 1 fails;
- change "paints light" to "throws" → test 3 fails;
- add a colour assignment to `platformTheme` (scratch, revert) → test 5 fails;
- drop one alias from the table → the matching `it.each` case fails.

## 5. Commands and expected results

Run from the worktree root unless noted.

```sh
cd apps/docs && nub x vitest run src/lib/troubleshooting-page.test.ts
# expected: 1 file, all tests pass

cd apps/docs && nub x vitest run src/lib/page-aliases.test.ts
# expected: every owned term returns its page first, including the 15 new ones

nub run --filter docs test
# expected: 115 files / >927 tests, exit 0 (one new file)

nub run --filter docs check-types
# expected: exit 0

nub run --filter docs smoke:build
# expected: 100 pages, every internal link and fragment resolves, exit 0

nub run check && nub run lint
# expected: exit 0
```

Scoped verification only while iterating; no native or live suite is needed —
this change is content, aliases, one guard and one test.

## 6. STOP conditions

- **STOP** if a fact in §2 cannot be read from the named source on this branch
  (for example `platformTheme` already applies a palette, or the declarations
  gain `registerFont`). Do not soften the claim into a maybe: drop the section or
  correct it from the source, then update this plan's evidence.
- **STOP** if adding the page breaks `content.test.ts` / sitemap / IA because
  `meta.json` or the description is malformed; fix the page and meta, never the
  guard.
- **STOP** if an alias steals a query an existing regression table pins
  (`provider`, `theme`, `error`, `blank`, `support`). Remove that alias; the page
  still answers via its title and summary.
- **STOP** if a claimed exit code cannot be derived from a single source; keep
  the table to the two rows §2 proves and link the rest.
- Do not add a support channel, an SLA, or platform colours.

## 7. Acceptance

- `/docs/troubleshooting` is served, in the sidebar after Native smoke suite,
  with a description that names every failure the page answers.
- The eight sections are present; every claim is tied to a source and guarded.
- The 15 measured queries return the page first; the nine measured
  already-correct queries are unchanged.
- `nub run --filter docs test`, `check-types`, `smoke:build`, `nub run check`
  and `nub run lint` pass; the exact counts and the forced-defect runs are
  recorded in §6 of this plan before the TODO row is ticked.

## 8. Results

Pending.

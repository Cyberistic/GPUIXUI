# 571 — The reader-facing preview guide

**Phase:** F (docs completeness)
**Workstream:** docs-site
**Depends on:** 412 (preview strategy), 432 (native coverage), 455 (live surface), 439/446/495 (built-site and browser gates), 487 (component-page template), 570 (live facet)
**Status:** implemented

## 1. The measured gap

Every component page renders one of six preview labels. The labels are exact,
load-bearing values in the app: `LIVE_SURFACE_NOTICE` in
`src/components/preview/live-surface.tsx`, `APPROXIMATION_NOTICE` in
`approximation-banner.tsx`, the `RuntimeCoverage` and `PlaygroundScreen` notices,
`PreviewUnavailable`, and the capture caption built by `captureCaption`.

A reader meets those labels with no on-site explanation of what they prove.
The only complete explanation is `docs/preview-strategy.md` — a repository file
— and the site links to it as a raw GitHub URL from
`content/docs/components/index.mdx`. `architecture.mdx` has a six-line summary,
but it does not define the labels, the counts, provenance, or what a label does
**not** claim.

Measured from the registry on 2026-10-19 (`selectPreview(record, captureFor)`):

| Tier | Records today |
| ---- | ------------- |
| L — live wasm scene | 44 |
| V — native runtime coverage | 22 |
| S — screenshot | 0 |
| N — playground screen | 0 |
| A — browser approximation | 0 component records (only explicit static previews on pages) |
| X — unavailable | 0 |
| **Total** | **66** |

So the page must be generated from the same selection code the pages use, not
hand-counted. Today the live/runtime split is only visible in
`apps/docs/README.md`; a reader cannot see it and a test cannot check it.

## 2. Outcome

`/docs/previews` is the reader-facing explanation of every preview:

- the six tiers, their exact labels, what each proves, and how many records use
  each today;
- the live wasm surface: what it is, what it is not, why it loads on request,
  and why its canvas is not in the browser accessibility tree;
- native evidence: screenshots and their sidecars, a playground screen, and a
  suite (`V`) that is coverage rather than a capture;
- browser approximations: static only, always labelled;
- what the site explicitly does not claim;
- links to the strategy file (maintainer spec), the capability matrix, the
  native-testing page and the component index.

The page is indexed by Fumadocs search and appears in the sidebar immediately
after Architecture. The raw GitHub link in the component index becomes an
on-site link.

## 3. Exact files

Create:

- `apps/docs/src/components/preview/preview-tiers.tsx`
- `apps/docs/src/components/preview/preview-tiers.test.tsx`
- `apps/docs/content/docs/previews.mdx`

Change:

- `apps/docs/src/components/mdx.tsx` — register `PreviewTiers`.
- `apps/docs/content/docs/meta.json` — add `"previews"` after `"architecture"`.
- `apps/docs/content/docs/index.mdx` — link the new page from "Where to start"
  or the "What this site is" paragraph.
- `apps/docs/content/docs/architecture.mdx` — replace "the rules are in
  `docs/preview-strategy.md`" with a link to `/docs/previews` plus the
  maintainer file.
- `apps/docs/content/docs/components/index.mdx` — replace the raw GitHub link
  with `/docs/previews`.
- `docs/preview-strategy.md` — add one line near the top: the reader-facing
  version is `/docs/previews`.
- `.agents/slop/plans/README.md` — add this plan to the docs table.
- `TODO.md` — add and tick the task once green.

Do **not** touch package source, the preview components' label strings, or the
registry. The new module reads them.

## 4. Implementation

### 4.1 `preview-tiers.tsx`

Pure data plus one render component. Import `components` from
`@/component-meta/registry`, `captureFor` from `./captures`, and
`selectPreview` from `./select-preview`.

```ts
export type PreviewTierLetter = "L" | "N" | "S" | "S (interaction)" | "V" | "A" | "X";

export interface PreviewTierRow {
  readonly tier: PreviewTierLetter;
  readonly name: string;
  readonly proves: string;
  readonly label: string;
  readonly count: number | null; // null for S (interaction) and A, which are not record tiers
}

export const PREVIEW_TIER_ROWS: readonly PreviewTierRow[] = [ ... ];

export const previewTierCounts = (
  records: ReadonlyArray<ComponentMetaInput> = components,
  lookup = captureFor,
): { readonly total: number; readonly live: number; readonly runtime: number; readonly screenshot: number; readonly playground: number; readonly unavailable: number } => ...
```

Rules:

- `L`, `S`, `N`, `V`, `X` are one row each; `S` has a second
  `S (interaction)` row because a before/after capture makes a different claim
  than a still. Both S rows render the same record count (`screenshot`) but only
  the still row says "records today"; the interaction row is used when a page
  publishes a pair/recording and its label is `Recorded in GPUix — …`.
- The `label` for L is imported from `./live-surface` (`LIVE_SURFACE_NOTICE`)
  and for A from `./approximation-banner` (`APPROXIMATION_NOTICE`). Do not
  re-type them.
- For V, N and X the label column uses the same reader-facing wording the
  components render (`Native coverage: <file> drives this component…`,
  `Run it natively: nub run dev:playground → <screen>`,
  `Not verified in the GPUix runtime — <reason>`). Keep these as prose in the
  module; do not refactor the components in this plan.
- The table has a caption and a `<th scope="col">` for every column. Render
  `data-preview-tier-row={tier}` so the test can count rows.
- A summary line above/below the table states `{total} records`, `{live} live`
  and `{runtime} native-coverage`, all interpolated from the function. No
  hand-written number appears in the MDX.
- `A` has no record count because approximations are page-author choices, not a
  registry tier. It renders `—` and a sentence says so.

### 4.2 `previews.mdx`

Frontmatter:

```mdx
---
title: Previews
description: How every preview is labelled, and what each label proves.
---
```

Sections, in order (the built crawl checks the heading outline and every MDX tag
is checked by `mdx-components.test.ts`):

1. Opening paragraph: the site is a browser app; the library is native; every
   preview carries a label and no label is decorative.
2. `<PreviewTiers />`.
3. `## The live surface` — L; the exact label; click-to-load because of the
   ~20 MB wasm; the same source, tokens and layout; not the desktop binary;
   scene list and gesture contract link; canvas is outside browser
   accessibility APIs; link to `/docs/accessibility`.
4. `## Native evidence` — N/S/V; a still proves the resting layout only; a
   sidecar supplies the caption; a missing sidecar means no image; V names the
   suite and command and is coverage, not a pass; no per-component playground
   screen ships yet, so N has no records today; link to `/docs/native-testing`.
5. `## Approximations` — A; only for static layout/typography/spacing, always
   the exact banner; never for an interaction presented as native.
6. `## What this site does not claim` — a short list (the same claims as
   `docs/preview-strategy.md` §"What is explicitly not claimed", but written for
   readers).
7. `## The full rules` — link to the strategy file on GitHub, plus
   `/docs/capabilities` and `/docs/components`.

The page must not state a count by hand. If the prose says "44", it fails review.

### 4.3 Wiring

- `mdx.tsx`: import and export `PreviewTiers` in `getMDXComponents`.
- `meta.json`: `"architecture", "previews", "component-api", ...`.
- Links: `index.mdx`, `architecture.mdx`, `components/index.mdx` point at
  `/docs/previews`.
- `docs/preview-strategy.md` gains one line: "The reader-facing version of this
  document is `/docs/previews`."

## 5. Commands and expected results

Run from the worktree root.

```sh
# 1. focused unit test; expect all new cases green
nub run --filter docs test -- src/components/preview/preview-tiers.test.tsx

# 2. whole docs suite; expect 87 files / 6xx tests, no failures
nub run --filter docs test

# 3. strict types; expect exit 0
nub run --filter docs check-types

# 4. production build + crawl; expect exit 0 and a page count one higher
nub run --filter docs smoke:build

# 5. accessibility over every page in both schemes; expect exit 0
nub run --filter docs smoke:a11y

# 6. repo gates
nub run check
nub run lint
```

If `smoke:a11y` cannot find Chrome or the server, it exits `2`; record the
reason and do not call it a pass.

## 6. Test plan

`preview-tiers.test.tsx` (React rendered with `renderToStaticMarkup`, the same
pattern as `component-index.test.tsx`):

1. **Counts are derived, not retyped.** `previewTierCounts()` must equal a
   folded pass over `components` and `selectPreview(record, captureFor)`:
   `total === components.length`, every record in exactly one of
   live/screenshot/playground/runtime/unavailable, and the sum equals total.
   Fails if a new tier is added and not counted.
2. **Today's split is honest.** Assert `live === 44`, `runtime === 22`,
   `screenshot === 0`, `playground === 0`, `unavailable === 0`. This is the
   measured baseline; if a component gains a capture or loses a scene, the test
   tells the author to update the page's narrative, not to hide the change.
3. **Every strategy tier is listed.** Read `docs/preview-strategy.md`, extract
   the tier letters from its table, and compare the set with
   `PREVIEW_TIER_ROWS` (normalising `S (interaction)`). Fails when the strategy
   gains a tier or the page drops one.
4. **The exact label values are shared.** The rendered table contains
   `LIVE_SURFACE_NOTICE` and `APPROXIMATION_NOTICE` verbatim; it contains the
   `Native coverage`, `Run it natively` and `Not verified in the GPUix runtime`
   prefixes. Fails when a component label changes and the guide is not updated.
5. **The page is wired.** `previews.mdx` exists, every capitalised MDX tag is
   registered (`mdx-components.test.ts` already does this), `meta.json` contains
   `"previews"` directly after `"architecture"`, and `index.mdx`,
   `architecture.mdx`, `components/index.mdx` link `/docs/previews`.
6. **The page states no hand count.** Search the MDX for a digit adjacent to a
   tier word (`44 live`, `22 native`, `66 records`) outside code; none may
   appear. The rendered component is the only source of numbers.
7. **Search finds it.** In `search.test.ts` (or a new case) assert
   `(await search("preview labels", 10)).some(r => r.url === "/docs/previews")`.
   If the page title/summary is not enough, add the page's own words to the
   summary; do not add a generated alias.

Two-direction proofs to run and record in the plan's implementation notes:

- Delete the `V` row from `PREVIEW_TIER_ROWS` → case 3 fails by name.
- Change the live count from derived to `44` → case 1 fails when the registry
  changes (force with a one-record fixture) and case 6 fails on the retyped
  number in MDX only if the number is in MDX; case 2 catches the count.
- Remove `PreviewTiers` from `getMDXComponents()` → case 5 and the existing
  `mdx-components.test.ts` fail.
- Remove `"previews"` from `meta.json` → case 5 fails.

## 7. STOP conditions

- **STOP** if `selectPreview`/`captureFor` cannot be imported outside a browser
  build (they are pure today; verify before writing the page). Report the import
  error rather than duplicating the selection rules.
- **STOP** if `smoke:build` fails because an existing guard hard-codes the page
  total and the plan did not name it. Record the guard's file and line as a
  follow-up; do not lower the guard.
- **STOP** if adding the page changes a generated search total that is asserted
  by a test; update only derived totals, never a hand count.
- **STOP** if the exact live/approximation labels cannot be imported without
  pulling browser-only code into the server render. In that case move the
  label constants to a tiny pure module and import them from both places — do
  not copy the strings.
- Do not touch `packages/*`, `apps/playground`, or another workstream's files.

## 8. Acceptance

- `/docs/previews` renders in the production build, appears in the sidebar
  directly after Architecture, and is present in the sitemap and `/llms.txt`.
- The tier table lists every tier in `docs/preview-strategy.md`, with the exact
  L and A label values from the components and the measured record counts.
- The page has no hand-counted number and no claim the code does not support.
- The three existing raw links point at the new page.
- `nub run check`, `nub run lint`, docs tests, `check-types`, `smoke:build` and
  `smoke:a11y` are green (or a documented exit `2` with reason).
- `TODO.md` ticks the task and the plan index row says `implemented`.

## 9. Result (2026-10-19)

Landed exactly as planned, with one placement fact measured during the work:

- `/docs/previews` sits in the sidebar **after Capabilities**, not directly
  after Architecture. Two existing guards pin `component-api` directly after
  `architecture` and `accessibility` directly after `component-api`
  (`component-api-page.test.ts`, `accessibility-page.test.ts`); the guide's
  subject — what the measured capabilities look like on a page — belongs after
  both. The page test asserts it follows Architecture rather than a fixed
  neighbour.
- `PreviewTiers` is a pure read of `components`, `captureFor` and
  `selectPreview`; the measured split is 66 records, 44 live, 22 native
  coverage, 0 captures/screens/unavailable.
- `component-page-docs.test.tsx`'s guard list matched the new test because it
  reads `content/docs/components/index.mdx` for its link assertion. It is now
  explicitly excluded with that reason; it does not read component-page
  content.

Commands run:

| Command | Result |
| ------- | ------ |
| `nub x vitest run src/components/preview/preview-tiers.test.tsx` | 7/7 green |
| `nub x vitest run src/lib/search.test.ts` | 56/56 green, including `preview labels → /docs/previews` |
| `nub run --filter docs test` | 87 files / 629 tests green |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs smoke:build` | exit 0; 97 pages, 120 links, 1 267 anchors, search and discovery green |
| `nub run --filter docs smoke:a11y` | exit 0; 97 pages × 2 schemes, 0 violations |
| `nub run check` | exit 0 (test-quality, lint, format, all workspace types) |
| `nub run lint` | exit 0 |

Two-direction proofs, all measured and reverted:

1. removed the `V` row → the tier-set test failed by name and the label test
   lost `Native coverage:`;
2. inserted `44 live records ship today.` into the page → the hand-count test
   failed on `/\\b(44|22|66)\\b/`;
3. removed `"previews"` from `meta.json` → the wiring test failed
   (`expected -1 to be greater than 4`);
4. removed `PreviewTiers` from `getMDXComponents()` → both the wiring test and
   `mdx-components.test.ts` failed with `PreviewTiers` named.

The page states no number by hand; the table and the summary line read
`previewTierCounts()`.


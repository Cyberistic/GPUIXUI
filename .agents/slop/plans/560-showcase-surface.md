# 560 — The showcase surface: one real GPUix screen, composed

**Phase:** F (docs showcase completeness).
**Owner:** `docs-site`.
**Depends on:** 410, 412, 455–458, 486, 492–497, 508, 513, 515, 519.
**Status:** ready to implement.

## 0. Why

`MISSION.md` asks for a Fumadocs **documentation and showcase** site. Today the
site has three strong pieces but no joined-up showcase:

- `/` shows the token palette and the preview tiers, but **no component** (plan
  440 deliberately shipped no image or imitation);
- every component page proves one component at a time, 42 of them with a real
  GPUix WebAssembly scene;
- `/docs/components` is a searchable **index**, not a visual gallery.

A reader cannot see the library's design system and several real components
composed into one screen without opening a dozen pages. This plan adds
`/docs/showcase`: a short page whose main content is **one live GPUix surface**
running a curated, realistic composition (identity header, a card, form
controls, progress) built from the real packages. It is tier L under the
existing label, so it is a real renderer — not a browser imitation and not a
claim about the desktop binary.

This is not a sampler: the scene is a plausible workspace/project panel, the
kind of screen an application builds from the library.

## 1. Design

### 1.1 A scene, not a new preview tier

Reuse the existing live-surface machinery (plan 455):

- `preview/scenes.ts` gains the `"showcase"` key and its expected text.
- `preview/scene-views.tsx` gains `ShowcaseScene`, mounted by `LIVE_SCENE_VIEWS`.
- `content/docs/showcase.mdx` renders
  `<LiveSurface scene="showcase" title="Showcase" />`.

The scene is **not** tied to a component record: it documents a composition, so
it keeps the generic live label and adds no `liveScene` field to any record.
`scene-contract.test.ts` therefore gains no record requirement; it still proves
the expected text occurs in the view.

### 1.2 The composition

At the preview's fixed 640×360 window the scene is a compact project panel:

1. a header row — `Avatar` (initials, online dot), a name/caption stack and a
   success `Badge` (`"Live on GPUix"`);
2. a two-column row:
   - left: an outline `Card` with `CardHeader`/`CardTitle`/`CardDescription`/
     `CardContent`/`CardFooter` — access list and `Manage`/`Invite` buttons;
   - right: `Input` (project name), `Select` (region), `Checkbox` and `Progress`.

All imports are the real package subpaths used by the other scenes
(`@gpuixui/components/card`, `/badge`, `/avatar`, `@gpuixui/primitives`). No
colour, spacing or radius literal: the components read the active `Theme`.

The smoke's expected text is the card's own sentence, **not** the scene's
heading: `"Three people can edit this workspace."`.

### 1.3 The scene → page map

`smoke:preview` currently derives each scene's page as
`/docs/components/<scene>`. That is true for component scenes and false for the
showcase. `preview/scenes.ts` gains:

```ts
export const SCENE_PAGE: Readonly<Partial<Record<LiveScene, string>>> = {
  showcase: "/docs/showcase",
};
```

The smoke uses `SCENE_PAGE[scene] ?? \`/docs/components/${scene}\``. A new test
asserts every override names a real MDX page, so a renamed route fails by name.

### 1.4 Counts and prose

`LIVE_SCENES` grows 42 → 43 and the gesture set stays 20. Two committed totals
are derived by `preview-gaps.test.ts` and must change with the scene:

- `docs/preview-strategy.md` — `42 scenes ship today` → `43`; the sentence gains
  the fact that 42 are per record and one is the showcase composition;
- `apps/docs/README.md` — `(42 today)` → `(43 today)`; gesture total unchanged.

The tier-L row still names only component-record scenes; the showcase is not a
component, so the test that compares the row with the registry is unaffected.

## 2. Exact files

| Action | Path | What |
| ------ | ---- | ---- |
| edit | `apps/docs/preview/scenes.ts` | add `"showcase"`, `SCENE_TEXT.showcase`, `SCENE_PAGE` + type |
| edit | `apps/docs/preview/scene-views.tsx` | add `ShowcaseScene`, register it |
| create | `apps/docs/content/docs/showcase.mdx` | the page |
| edit | `apps/docs/content/docs/meta.json` | add `"showcase"` after `"getting-started"` |
| edit | `apps/docs/src/components/landing.tsx` | add a `See the showcase` CTA |
| edit | `apps/docs/src/components/landing.test.tsx` | assert the new link |
| create | `apps/docs/src/showcase-page.test.tsx` | page/scene contract |
| edit | `apps/docs/scripts/smoke-live-preview.ts` | scene → page map |
| edit | `apps/docs/README.md` | document the page + scene, 43 total |
| edit | `docs/preview-strategy.md` | 43 total, showcase sentence |
| edit | `TODO.md` | tick the task, update the docs progress line |
| edit | `.agents/slop/plans/README.md` | index this plan |
| edit | `PLAN.md` | decision row D41 |

### 2.1 `showcase.mdx` shape

```mdx
---
title: Showcase
description: The library composed into one screen, running on GPUix.
---

One real GPUix screen, built from the public packages: an identity header, a
project card and its form controls. This is GPUix's WebAssembly renderer running
the real component code — not a browser imitation. The native evidence stays on
each component page and in the playground.

<LiveSurface scene="showcase" title="Showcase" />

## What this screen composes

<ShowcaseComponents /> … (a list generated from `SHOWCASE_SLUGS`)

## Where to go next

links to `/docs/components`, `/docs/theming`, `/docs/architecture`
```

`SHOWCASE_SLUGS = ["avatar", "badge", "button", "card", "checkbox", "select",
"progress", "text-input"] as const` lives in `src/showcase.ts` with
`ShowcaseComponents` so the page never types a component title: it looks each
slug up in the registry and links its real page. A test fails if a slug is not a
delivered record.

## 3. Steps

1. Add the scene key and expectation; add `SCENE_PAGE` beside `SCENE_TEXT`.
2. Add `ShowcaseScene` and register it. Keep the composition inside the fixed
   window; do not add a second heading that the smoke could mistake for the
   expectation.
3. Add `src/showcase.ts` + `<ShowcaseComponents />`; add the MDX page, sidebar
   entry and landing CTA.
4. Point the smoke's page loop at `SCENE_PAGE`.
5. Update the two totals and the README.
6. Write `showcase-page.test.tsx` (below).
7. Run every command in §4. Record the results in this plan and the TODO tick.
8. Commit and push `agent/docs-site`.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all files pass; `showcase-page.test.tsx` included |
| `nub run --filter docs check-types` | exit 0; `LIVE_SCENE_VIEWS` exhaustiveness proves the key exists |
| `nub run --filter docs build` | exit 0; `/docs/showcase` in the sitemap |
| `nub run --filter docs smoke:preview` | exit 0; `smoke: scene showcase ready — …, N text nodes`; `/docs/showcase` reports `ready` |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

If Chrome is unavailable, `smoke:preview` exits `2`; that is **unverified**, not
a pass. Record it and do not claim the scene painted.

## 5. STOP conditions

- The scene reports `failed`/`timeout` on the wasm renderer after the build.
- Any component import needed by the scene is not exported by the package.
- The page smoke cannot reach `ready` after a click (the iframe wiring is the
  feature, not an optional check).
- `preview-gaps.test.ts` still reports a count mismatch after the two totals are
  updated — fix the prose, never the assertion.
- The composition does not fit the 640×360 window without clipping.

## 6. Test plan (each test must be able to fail)

`src/showcase-page.test.tsx` reads the real files (same boundary as
`content-references.test.ts`):

1. **The page exists and is in navigation** — frontmatter title/description,
   `meta.json` contains `showcase`, and the page carries the live-surface block.
2. **The scene is real** — `isLiveScene("showcase")`, `SCENE_TEXT.showcase` is
   non-empty and occurs in `preview/scene-views.tsx`.
3. **The screen is composed from delivered pages** — every `SHOWCASE_SLUGS`
   entry resolves to a non-`planned` registry record and every rendered link
   path has an `.mdx` page.
4. **The scene has its own page in the smoke** — `SCENE_PAGE.showcase ===
   "/docs/showcase"` and that file exists; the smoke source uses `SCENE_PAGE`.
5. **The landing page brings readers here** — `/docs/showcase` appears in the
   rendered landing HTML, and the page does not deny the live surface.
6. **Every scene override resolves to a page** — every `SCENE_PAGE` entry maps
   to an `.mdx` file, so a renamed route fails by name instead of at the smoke.

Two-direction proofs to run and record in §7:

- Remove `"showcase"` from `LIVE_SCENES` → `check-types` fails (the
  `LIVE_SCENE_VIEWS` record is exhaustive) and test 2 fails.
- Remove `<LiveSurface scene="showcase" …>` from the page → test 1 fails.
- Remove one slug from `SHOWCASE_SLUGS` → test 3 fails naming the missing page.
- Remove `showcase` from `meta.json` → test 1 fails.
- Change `43` back to `42` → `preview-gaps.test.ts` fails with the real count.
- Rename the card sentence → `scene-contract.test.ts` fails by scene name.

## 7. Results

Run 2026-10-19 on `agent/docs-site`:

| Check | Result |
| ----- | ------ |
| `nub run --filter docs test` | 72 files / 499 tests passed (the new 6-test suite included) |
| `nub run --filter docs check-types` | exit 0 (MDX + app + preview projects) |
| `nub run --filter docs build` | exit 0; `/docs/showcase` in the build |
| `nub run --filter docs smoke:build` | exit 0; the production crawl renders the new page, resolves its links and finds it in the sitemap |
| `nub run --filter docs smoke:responsive` (`--no-build`) | exit 0; 93 pages responsive, phone controls and mobile navigation checked |
| `nub run --filter docs smoke:a11y` (`--no-build`) | exit 0; 93 pages × 2 schemes, 0 violations |
| `nub run --filter docs smoke:preview` | exit 0; `smoke: scene showcase ready — 640x520 canvas, 16 text nodes`; `smoke: /docs/showcase loaded the live iframe — /gpuix-preview/?scene=showcase&platform=default&mode=dark (606x358)` |
| Captured frame | the composition paints both cards, the identity header, both fields, the checked box and the progress bar; text tree: `Project settings`, `Project name`, `Region`, `Email me when a deploy finishes`, `Migration · 64%` |

Two-direction proofs (each run, observed, then reverted):

1. Removed `"showcase"` from `LIVE_SCENES` → `check-types` failed with
   `'showcase' does not exist in type` on `SCENE_TEXT` and `SCENE_PAGE`; the
   suite failed the scene test.
2. Removed `<LiveSurface scene="showcase" …>` from the page → the page test
   failed (`expected … to contain '<LiveSurface scene="showcase"'`).
3. Removed `"showcase"` from `meta.json` → the page test failed with the sidebar
   list missing it.
4. Changed the stated total to `42` → `component-page-docs.test.tsx` failed
   (`expected [42] to deeply equal []`).
5. Renamed the card sentence in the view → `scene-contract.test.ts` failed with
   `"showcase: Three people can edit this workspace."`.

## 8. Acceptance

- `/docs/showcase` is reachable from the sidebar and the landing page.
- The page runs the scene on the real wasm renderer and says it is not the
  desktop binary (the existing label does this).
- Every component the page names is a delivered record with a real page.
- The scene has a smoke assertion and its page is driven by `smoke:preview`.
- Both totals agree with `LIVE_SCENES`; the full gates in §4 pass.

# 460 — The pages stop denying the live surface they ship

**Phase:** F (docs truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455 (live wasm surface), 456–458 (the scenes), 426 (prose-truth), 459 (architecture truth)

## 1. Why this plan exists

Plans 455–458 made the site render **real GPUix components in the browser** on
eleven pages (the published WebAssembly renderer, click-to-load, labelled as
not the desktop binary). Three surfaces still say the opposite, and a fourth
says it on pages that now carry a scene:

| Surface | Stale claim | Why it is false |
| ------- | ----------- | --------------- |
| `content/docs/index.mdx` | “it does not render it” / “Where a component cannot be shown running in a browser” | eleven pages run the real component code on GPUix's wasm renderer |
| `content/docs/getting-started.mdx` | “This site does not render GPUix in the browser.” | same |
| `content/docs/examples/index.mdx` | playground paragraph names only approximations and coverage | the live surface is the strongest preview and is not mentioned |
| `content/docs/components/*.mdx` (18 pages) | “The docs site cannot render it live; the example and source are real.” | four of those pages (`tabs`, `popover`, `command-menu`, `dropdown-menu`) have a live scene; the other fourteen state a capability limit where the truth is “no scene ships for this component yet” |
| `component-meta/entries.ts` (Card) | the same sentence as a limitation | same |
| `components/landing.tsx` | “A browser cannot render GPUix” and “it does not render GPUix” | same |

A reader who lands on the Tabs page sees a live GPUix surface and, further down,
a bullet saying the site cannot render it live. That is the credibility failure
this plan removes, and the guards make it unrepresentable.

## 2. Files

Change:

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/index.mdx` | the “What this site is” paragraph describes the live WebAssembly surface and keeps the desktop-binary distinction |
| `apps/docs/content/docs/getting-started.mdx` | the “Native previews” section stops denying browser rendering and names the live tier, the native evidence and the labelled approximation |
| `apps/docs/content/docs/examples/index.mdx` | the playground paragraph names the live surface |
| `apps/docs/content/docs/components/{tabs,popover,command-menu,dropdown-menu}.mdx` | delete the “cannot render it live” bullet; the live surface above and the native-coverage notice below are the whole truth |
| `apps/docs/content/docs/components/*.mdx` (the other 14 with the bullet) and `card.mdx` | reword to “No live scene ships for this component yet; the example and source are real.” |
| `apps/docs/src/component-meta/entries.ts` | Card's limitation uses the same reworded sentence |
| `apps/docs/src/components/landing.tsx` | add the live surface as the first `PREVIEW_TIERS` entry (six) and replace the two “browser cannot render GPUix” sentences |
| `apps/docs/src/components/landing.test.tsx` | assert six tiers, the live tier's label and its WebAssembly detail |
| `apps/docs/src/components/preview/scene-contract.test.ts` | a record with a `liveScene` may not have a page that says the site cannot render it live |
| `apps/docs/src/prose-truth.test.ts` | while any scene ships, no page may say the site does not render GPUix / does not render it |
| `TODO.md`, `.agents/slop/plans/README.md` | tick and index |

Create: none.

## 3. Wording rules

- **Live pages** do not mention a rendering limitation at all; the surface is
  above them and the native evidence is beneath.
- **Pages without a scene** say exactly `No live scene ships for this component
  yet; the example and source are real.` — a page-level fact, not a claim about
  what the site can do.
- **The site-level pages** say: pages that have a scene run the real component
  code on GPUix's **published WebAssembly renderer**, labelled as the browser
  renderer and not the desktop binary; every page still carries its native
  evidence beneath it. Never “a browser cannot render GPUix”.
- No hand-counted number of scenes (plan 450's rule): “pages with a scene”, never
  “eleven pages”.

## 4. Commands and expected results

```sh
nub run --filter docs test          # exit 0, the three new guards green
nub run --filter docs check-types   # exit 0
nub run --filter docs build         # exit 0
nub run --filter docs smoke:build   # exit 0, 68 pages
nub run check && nub run lint && nub run test
```

## 5. STOP conditions

- A page without a scene cannot truthfully say the example is real: check the
  page includes its source; if not, stop and record which page, do not invent an
  example.
- The landing test's tier count is asserted elsewhere: update every reference in
  the same change rather than weakening the assertion.
- A live-scene page's bullet is load-bearing for another test: fix the test's
  wording expectation, never re-add the false claim.

## 6. Test plan

| Test | Guards | Proven to fail by |
| ---- | ------ | ----------------- |
| `scene-contract.test.ts` — no denial | a page whose record ships a scene never says the site cannot render it live | re-adding the Tabs bullet |
| `prose-truth.test.ts` — site denial | no content page says the site does not render GPUix while `LIVE_SCENES` is non-empty | restoring “it does not render it” in `index.mdx` |
| `landing.test.tsx` — six tiers | the landing page lists the live surface with its WebAssembly detail | removing the live tier from `PREVIEW_TIERS` |

## 7. Acceptance

- No surface claims the site cannot render a component it renders live.
- Pages without a scene state a page-level fact, not a site capability limit.
- The introduction, getting-started, examples and landing pages describe the
  live surface honestly, with no hand-counted total.
- All guards are proven in both directions; the repository gate is green; the
  change is committed and pushed on `agent/docs-site`.

## 8. Progress

Implemented 2026-10-18.

- **Nineteen component pages** lost the false capability claim: the four with a
  scene (`tabs`, `popover`, `command-menu`, `dropdown-menu`) have no such bullet
  at all, and the other fourteen plus Card now say “No live scene ships for this
  component yet; the example and source are real.” Card's registry limitation
  carries the same wording, so the state block and the page agree.
- **The site-level pages** are corrected: the Introduction, Getting started and
  Examples describe the isolated WebAssembly surface, keep the desktop-binary
  distinction, and the landing page lists the live surface as its first preview
  tier (six).
- **Three guards:**
  `scene-contract.test.ts` (a live-scene page may not deny it),
  `prose-truth.test.ts` (no content page denies the live surface while
  `LIVE_SCENES` is non-empty), and `landing.test.tsx` (six tiers, the first
  naming WebAssembly).
- **Measured:** `nub run --filter docs test` — 41 files, 255 tests;
  `check-types`, `check`, `lint`, `test`, `build`, `smoke:build` (68 pages,
  87 links), `smoke:browser` (5 checks) and `smoke:preview` (11 scenes, 11
  pages, platform toggle) all exit `0`.
- **Two directions proven:**
  1. re-adding the Tabs bullet failed the scene-contract denial guard;
  2. restoring “it does not render it” in `index.mdx` failed the prose-truth
     denial guard;
  3. deleting the live tier from `PREVIEW_TIERS` failed the landing tier test.
  All three restored green (28 tests in the three files).

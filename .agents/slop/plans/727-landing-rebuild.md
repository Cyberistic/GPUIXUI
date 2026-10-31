# 727 — The landing, rebuilt: real native pixels, Mac first, numbers as proof

| Field | Value |
| ----- | ----- |
| Owner | `docs-site` (`apps/docs/src/components/landing`, `src/styles/landing.css`) |
| Depends on | `722` (window anatomy), `728` + at least three `729` blocks (the footage), `730` (numbers), `726` (effects out of the core) |
| Supersedes | `434` (the "Hunter License" landing), deleted when this plan was written |
| Status | landed 2026-10-31 |

## Why

Today the page is a stack of HTML reproductions, and four sections end with
"Browser preview of the native composition · the shipped window renders
through GPUix, not the DOM." The disclaimer is honest, and it is also the page
arguing against itself. The register we want (Raycast, Linear, Things, cap.so)
leads with the **real app** and backs it with **numbers**. We have both: the
launch film is captured from a real GPUix window (`media/launch/README.md`),
and `/live` paints real GPUix in the browser through the wasm build (plan
`440`).

Decisions already made by the owner (2026-10-31): **drop the Hunter identity
entirely**; **Mac first** (Windows/Linux keep their looks, shown lower down).

## The page (top to bottom)

| # | Section | Content | Replaces |
| - | ------- | ------- | -------- |
| 1 | Nav | wordmark, Docs, Blocks, Live, GitHub, theme toggle, "Get started" | same, + Live |
| 2 | Hero | one line: **"Native Mac apps, written in React."** Sub: "shadcn's API, drawn on the GPU by GPUI. No DOM, no Electron." CTAs: `Get started` · a copy pill with the install command the guide already documents (import it from `apps/docs/src/lib/prompt-data.ts`; never a second literal). Below: **the hero loop** (real capture, see §Footage) of the pipeline block in a vibrant window over a wallpaper, autoplay muted, `prefers-reduced-motion` shows the poster | the 3-platform deck |
| 3 | Proof strip | four measured numbers from `730` (cold start, idle RSS, binary size, p99 frame time), each with "vs Electron" only if `730` measured a comparator | — |
| 4 | Feel | 5 short loops (2–4 s each, captured natively): vibrant sidebar resize, ⌘K launcher, sheet from the toolbar, 120 Hz table scroll, menu-bar popover. One-line caption each, in a 3+2 grid | Dashboard + Management sections |
| 5 | Blocks | 6 block thumbnails (native captures, from `729`'s capture script) linking to `/blocks/<slug>`; "Copy the recipe" under each | — |
| 6 | Code, rendered | keep `CodeAndComponent`, switch the demo to `SegmentedControl` + `InsetGroup` (`725`) | Tabs demo |
| 7 | Every desktop | keep the 3-platform deck here, smaller, captioned "The same tree on Windows 11 and Linux, and in your Omarchy theme" | moved down from hero |
| 8 | Run it live | a button to `/live`: "Open a real GPUix surface in this tab (19 MB wasm)" | — |
| 9 | Footer | as today; `Lineage` folds into one footer line ("Built on shadcn/ui · Base UI · Tailwind · GPUI") | `Lineage` section, `Defaults` section |

Removed: `Dashboard`, `Management`, `Lineage`, `Defaults`, the formula line,
`Terminal` (its claim moves to section 7's caption), all `.landing-licence*`
CSS (it is already dead: no `.tsx` uses it — `rg -l landing-licence
apps/docs/src -g '*.tsx'` is empty), and every "Browser preview…" caption on
the landing (the footage is native; the code preview in §6 keeps a short one).

Target: `landing.css` from 2 347 lines to **≤ 900**; `landing/*.tsx` from
~1 600 to **≤ 700**. Record before/after in the commit.

## Footage

All footage is a capture of a real GPUix window — never an HTML render, never a
mock. Reuse the film pipeline; do not write a new one.

1. **App captures** (block content, interactions, scroll, ⌘K): a take per loop
   in `apps/playground/src/film/takes.tsx`, run by the existing runner
   (`nub apps/playground/dist/film/takes.js <take> <outDir>`, plan `060`), framed
   by `film/frame.tsx`. Takes are real trees under real input on a stepped
   clock, so a loop is frame-accurate. Coordinate new takes with the
   `launch-film` workstream through `.agents/slop/TODO.md` → Launch film.
2. **Vibrancy loops** (the hero, the sidebar resize): an app capture **cannot**
   show the blur — it reads alpha 0 where the material is
   (`docs/gpuix-capabilities.md:82`) and has no OS chrome. Record these from the
   OS: `screencapture -v -l<windowId> -V 6 hero.mov` over the block run with
   `nub run --filter @gpuixui/blocks dev -- pipeline`, our wallpaper behind it,
   the pointer driven by hand or by the `take.ts` input script. Say "screen
   recording of the native window" in the `aria-label`.
3. Encode for the web, per loop:
   ```sh
   ffmpeg -framerate 60 -i take/%05d.png -vf "scale=1600:-2" -c:v libx264 -crf 24 \
     -preset slow -pix_fmt yuv420p -movflags +faststart -an hero.mp4
   ffmpeg -i hero.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -an hero.webm
   ffmpeg -i hero.mp4 -frames:v 1 -q:v 3 hero-poster.jpg
   ```
4. Budget: hero ≤ **3 MB** per format, each feel loop ≤ **800 KB**. Files go in
   `apps/docs/public/media/landing/`. **STOP** if the total exceeds 8 MB: raise
   it with the owner (R2 vs the repo), do not commit larger binaries.
5. The wallpaper behind the window is **our own** (a gradient generated from
   the theme's `primary`), not Apple's.

`<video>` rules: `autoplay muted loop playsinline preload="metadata"`, a
`poster`, `aria-label` describing what plays, and the reduced-motion hook
(`reduced-motion.ts`) swaps it for the poster.

## Files

- `apps/docs/src/components/landing/landing.tsx` — the new section list
- `apps/docs/src/components/landing/hero.tsx` (new), `proof.tsx` (new),
  `feel.tsx` (new), `blocks-strip.tsx` (new)
- `deck.tsx` — keep, drop `LandingFormula` and the Omarchy cards' hero role
- delete `lineage.tsx`, `terminal.tsx`, `formula.test.tsx`, `terminal.test.tsx`,
  `management-section.test.tsx` and their CSS
- `data.ts` — `navLinks` + Live; `attribution` stays
- `apps/docs/src/lib/page-meta.ts` — title "GPUIxUI — native Mac apps in
  React", description from the hero sub-line, `twitter:card` →
  `summary_large_image` with `hero-poster.jpg`
- `apps/docs/src/styles/landing.css`


## Test plan

`nub run --filter @gpuixui/docs test src/components/landing`

| Case | Inversion |
| ---- | --------- |
| the hero plays a native capture with a poster and a label | drop `poster` |
| reduced motion paints the poster, not the video | ignore the hook |
| no landing section prints "Browser preview" except the code preview | re-add the dashboard caption |
| the page says nothing about hunters or licences | re-add "Hunter" copy (keep `deck.test.tsx:166`'s guard, widen it to the whole page) |
| every proof number comes from `730`'s results file, not a literal | inline `"38 ms"` |
| every blocks-strip tile links to a block page that exists | rename a slug |
| every `<video>` source exists in `public/` and is within budget | point at a missing file; add a 4 MB file |
| the Live CTA links to `/live` | link to `/` |

Browser pass (required, a test file cannot see layout):

```sh
nub run dev:docs   # then, in a second shell:
nub apps/docs/scripts/platform-switch-probe.ts   # reuse its Chrome session helper
```

Capture `/` at 1440×900 and 390×844 (phone) in light and dark into
`.agents/slop/evidence/727-*.png`; no horizontal scroll at 390; the hero video's
first frame is painted within 1.5 s on a cold load (Lighthouse LCP in the
evidence note).

## Acceptance

- The table above is the page; nothing else remains.
- Size targets met; `nub run check`, `lint`, `test` green.
- `.agents/slop/TODO.md` updated.

## STOP

- Stop if any footage would have to be an HTML render: wait for the capture.
- Stop at the media budget.
- Stop if `730` measured nothing: ship the page without the proof strip and
  leave a `// TODO:` — never print an unmeasured number.

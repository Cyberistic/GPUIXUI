# 060 — Launch film: "Feel it"

Replaces the 22 s film in `media/launch/` (judged not good enough). Reference:
Paper's "tabs" launch (`~/Documents/paper.mp4`, analysed below). Brief: an Apple-
style launch for gpuixui.sudokw.com carried by **haptics expressed as sound
design**: every interaction on screen has a designed tactile sound. Highlights
GPUI · React · shadcn · Tailwind, blocks, native feel, macOS · Windows · Linux ·
terminal, and Omarchy theme follow.

**Rule zero: every pixel that claims to be GPUIxUI is GPUIxUI.** Each shot is a
real component tree rendered by GPUix's test renderer, driven by real input
(`nativeSimulateMouseDown/Move/Up`, keystrokes) through GPUI hit-testing, with
the motion clock paused and stepped one frame at a time (`clockSet`). Window
chrome, the desktop ground, type and the cursor are drawn by the composition;
they are the frame, not the product. Haptics are **sound only**: the film never
claims a haptics API (the runtime has none).

## Reference analysis (paper.mp4, 33 s)

- No hard cuts: every change is a camera move or a caption swap over moving UI.
- Scale changes every ~3 s: icon → large cropped window → 4× macro on one control
  → tiny overview → medium grid → large → type → mark.
- One centred lowercase line at a time, no periods; the lines chain into one
  sentence. Each fades from ~40 % grey to ink. Nothing slides.
- One ground material for the whole film; the accent appears only on the URL
  and the mark.
- Sound: a quiet bed until the music enters on the second line; the music drops
  to silence for a beat on three transitions; UI ticks and keystrokes are
  audible; it fades under the mark.

## SPEC (1920×1080, 30 fps, 33.0 s)

Ground `#F5F5F7`, ink `#1D1D1F`, accent `#5F4BDB` (logo) for the URL and the
mark only. Type: Inter Display 600, 96 px, tracking −2 %, one line, centred at
y = 180 (above the action) or 540 (type-only shots). A line arrives as opacity
0.35 → 1 over 0.35 s (`power2.out`). It never slides and never moves after it
lands.

**BANNED:** dark void with floating UI, glow, particles, three cards in a row, a
docked logo, fade-and-slide-up entrances, tilted 3D UI, synthesised beeps.

| # | t (s) | Shot | Take | Input → sound | Line |
| - | ----- | ---- | ---- | ------------- | ---- |
| 1 | 0.0–2.4 | macro Switch, 8×, macOS look | `switch` | down 0.70 → low thock; up 0.83 → crisp tick | feel every press |
| 2 | 2.4–4.6 | macro Slider, 6×, 10 detents | `slider` | drag 0→80 over 1.4 s → one tick per detent, rising | every detent |
| 3 | 4.6–6.4 | macro primary Button "Save changes", 6× | `button` | down 5.2 → thud; up 5.5 → click | every click |
| 4 | 6.4–10.0 | pull back: the button is in the Settings block, macOS window | `settings` | tab click 7.6; switch 8.8 | native on mac |
| 5 | 10.0–14.0 | each switch press restyles the window: Windows 11, then Linux | `settings` | press 11.1, 12.6 → press + air | on windows · on linux |
| 6 | 14.0–17.5 | a Ghostty window: `nub run terminal` typed; the same UI paints in it; one press | `terminal` | key ticks; press | and in your terminal |
| 7 | 17.5–22.5 | Omarchy desktop, real wallpapers: tokyo-night → catppuccin → gruvbox → rose-pine → everforest | `omarchy` | glass tick per flip, accelerating | follows your omarchy theme |
| 8 | 22.5–26.5 | 2×2 real blocks, then a punch-in on the kanban: drag one card into Done | `blocks` | lift, slide, drop thunk | start from blocks |
| 9 | 26.5–29.0 | type: GPUI · React · shadcn · Tailwind; each word presses in and springs back | — | keycap per word | — |
| 10 | 29.0–33.0 | the cursor presses the mark; the wordmark wipes in; URL | — | the film's deepest thock; music resolves | gpuixui.sudokw.com |

Silence beats: 0.0–0.7 (before the first press), 10.8–11.1 (before the first
platform flip), 29.4–29.6 (before the mark press).

## Files

| Path | What |
| ---- | ---- |
| `apps/playground/src/film/magnify.ts` + `.test.ts` | a theme with every token length ×k (colours, weights, ratios kept) |
| `apps/playground/src/film/take.ts` + `.test.ts` | the take runner: mount, step clock, apply scripted input, capture PNGs + `cursor.json` |
| `apps/playground/src/film/takes.tsx` | the takes in the SPEC table, one entry each; CLI `nub dist/film/takes.js <take> <outDir>` |
| `apps/playground/src/blocks/{settings,kanban,inbox,dashboard}.tsx` | the blocks as **compiled native code** (the docs carried uncompiled strings) |
| `apps/playground/src/blocks/blocks.test.tsx` | behaviour: each block mounts, its text paints, its key control responds to a click |
| `media/launch/` | HyperFrames project (`index.html`, `compositions/`, `assets/`), `SPEC.md`, `REVIEW.md`, README |
| `apps/playground/src/film/{blocks,main}.tsx` | deleted with the old film |

## Commands

```sh
nub run --filter playground build
nub apps/playground/dist/film/takes.js <take> media/launch/takes/<take>   # PNG frames + cursor.json
ffmpeg -framerate 30 -i media/launch/takes/<take>/%04d.png -c:v libx264 -crf 12 -pix_fmt yuv420p media/launch/assets/<take>.mp4
cd media/launch && npx hyperframes check --json && npx hyperframes snapshot --review
npx hyperframes render
```

## STOP conditions

- A take needs input the test renderer cannot dispatch, or a component paints
  differently under `magnify` than at 1× apart from size: stop and report. Never
  hand-draw the component instead.
- The terminal shot cannot be captured from a real terminal run: report it and
  use the honest fallback (the real kitty-protocol frames decoded by
  `terminal/kitty.ts`, inside a labelled terminal frame).
- No music source (HeyGen catalog, local MusicGen, or the person's own track):
  deliver with the tactile sound layer only and say so.

## Tests

- `magnify.test.ts`: lengths scale (spacing, type size, switch metrics); colours,
  `fontWeight` and unitless `lineHeight` do not. It fails if `magnify` returns
  the theme unchanged or scales colours.
- `take.test.ts`: the same take captured twice gives byte-identical frames. A
  real click on frame n changes frame n+2 and not frame n−1, so the test fails
  if input is ignored or the clock is not stepped.
- `blocks.test.tsx`: each block paints its title; Settings' switch flips its
  `aria-valuetext` on a click; the kanban card moves column on a drag.

## Done

`nub run check`, `nub run lint`, `nub run test` green; `npx hyperframes check`
clean; `REVIEW.md` written; `media/launch/gpuixui-launch.mp4` rendered.

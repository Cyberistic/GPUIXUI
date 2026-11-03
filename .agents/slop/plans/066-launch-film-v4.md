# 066 — Launch film v4: Paper's calm, a bento of components, a dashboard built

| Field | Value |
| ----- | ----- |
| Owner | `launch-film` workstream |
| Depends on | 064 (v3), 065 (charts), 067 (tiling block) |
| Status | landed |

## Owner notes (2026-11-01)

1. The Tabs close-up looks bad (tall pills, tiny labels).
2. The Omarchy display looks bad; use a better Linux example (067).
3. The first few seconds are far too quick.
4. Use the stageshow skill (`~/GPUIXUI/references/benjitaylor-skills/stageshow`)
   for a bento-style display of the components.
5. Better, rounded charts (065).
6. Follow `~/Documents/paper.mp4`.

## Diagnosis

- **Tabs**: the film magnified the *theme* 5×, but the library's recipes compile
  shadcn's fixed metrics (ADR 0006: `text-sm` = 14, `px-3` = 12). The rail grew
  with `controlHeight`; the label and its padding stayed 1×. The macro idea is
  wrong for any recipe component. **Fix**: every take renders the library at
  1× (no `magnify`); captures are 2×, so the composition's camera may push in
  up to 2× with no loss. Stageshow's close-up rule is 1.3–1.6×.
- **Pace**: v3 gave each control 15 frames (0.5 s). Paper gives each line about
  3 s and each interaction 1.5–3 s; stageshow: overlapping beats, a payoff that
  holds 2 s, nothing still for more than 3 s.

## Paper, measured again (contact sheets at 2 fps)

- Ground: warm paper `#F4F2EE` with a faint 48 px grid; ink `#1D1D1F`.
- One lowercase line at a time, centred above the action, ~3 s each; lines chain
  ("tabs, now in Paper" → "so you can get more done" → "let your agents" →
  "work across different files" → "at the same time" → "stay in flow" → "keep
  exploring" → "try tabs today / paper.design" → mark).
- The camera pans slowly across one continuous surface; a single control in
  close-up for ~2 s (a tab being typed), then pulls back to rows of tabs.
- **A dashboard is built**: blank canvas → blue blueprint outlines of every box →
  the real filled dashboard. That is the owner's "components falling onto a
  blank slate", told the way the reference tells it.

## The cut (30 s, 120 BPM; a beat is 15 frames)

| Time | Line | Picture |
| --- | --- | --- |
| 0–3 | "native apps, now in react" | The outline mark on paper; the cursor clicks it; the Settings window opens at 1× (macOS), camera settles |
| 3–9 | "built from the components you know" | Three close-ups, 2 s each, pushed in 1.6×: Switch toggled, Tabs (Arena → Island), Slider dragged; each tap with its sound |
| 9–13 | "composed into blocks" | **Bento** (stageshow rules): hero = the stats dashboard with the new charts (2×1), Slang's keypad cropped (1×2), a stat tile "60 fps", a statement tile "shadcn + tailwind", a Switch tile; tiles arrive 100 ms apart |
| 13–17 | "watch one come together" | **Blueprint build**: the stats block's real boxes as blue outlines on paper, drawn in reading order, then the real frame fills in over them |
| 17–21 | "on every desktop" | macOS window → Windows (the Aero desktop) → Linux (the tiling block, 067), one palette change |
| 21–25 | "even in your terminal" | The console block in a terminal: sidebar collapses, toasts arrive; then Slang computes in a terminal |
| 25–27 | "gpui · react · shadcn · tailwind" | type only |
| 27–30 | — | The mark, `gpuixui.sudokw.com`, "Made with ☕ by @sudo_kw" |

## Takes

- Remove `magnify`/`macro` from close-ups; close-ups render at 1× in a
  960×540 stage and are pushed in by the composition.
- New: `bento-*` stills/takes are the existing block takes; `blueprint` dumps
  the stats block's painted boxes (`getElementBounds` of every element with a
  background or border) to `boxes.json` beside its frames.
- `tiling` take (067) at 1280×800.
- `term-slang` with the terminal rig (`slang` program).

## Composition

Committed generator (`media/launch/build.ts`, run with nub) writes the scene
HTML from one timeline table, so a retime is one edit and survives a context
loss. Ground and grid from Paper. Tactile cues placed from the takes' press
frames. Score: re-use `sound/piano.ts`, retimed if needed.

## Verification

- `npx hyperframes check`; snapshots at every line change and every press.
- Contact sheet at 2 fps next to Paper's; the first 9 s must hold each control
  ≥ 1.5 s.
- Loudness −19 ± 1 LUFS.

## STOP

- Any take that shows a broken component (like the v3 Tabs) is fixed in the
  library or dropped, never shipped.

## Stageshow (owner, 2026-11-01: "just use the skill of stageshow")

Two shots are built with the stageshow skill (`~/GPUIXUI/references/benjitaylor-skills/stageshow`,
MIT), following its SKILL.md workflow: plan, film the closest gold, copy its
structure, rehearse with `scripts/film.mjs --gate`. Every product picture inside
a stage is **real GPUix footage** (a take's frames, played on the stage's own
clock); the stage draws only the page, the tiles, the copy and the motion. No
component is drawn in DOM and presented as the library.

### Bento (9–13 s) — gold `bento` (hero and strip)

| Tile | Span | Kind | The one thing | Words |
| --- | --- | --- | --- | --- |
| Blocks | 2 × 1 | Hero UI | the stats block, Month pressed, window off the right edge | **Every block, native.** Painted by GPUI, written in React. |
| Count | 1 × 1 | Stat (dark) | the real component count, counting up | "components" + one line |
| Switch | 1 × 1 | Component | the Wi-Fi switch close-up, pressed | **shadcn's API.** The props you know. |
| Slang | 1 × 1 | Component | Slang's keypad, 7 × 6 = 42 | **Slang.** A calculator built on it. |
| Platforms | 1 × 1 | Diagram | macOS, Windows, Linux, Terminal chips, lines drawing into one GPUI node | **One tree, everywhere.** |

One window in the grid (the hero's). Tiles play one beat each, 110 ms apart.

### Assemble (13–17 s) — gold `subscriptions` (`Fly`)

The stats screen's blueprint (`boxes.json`: every painted box, blue outlines on
the paper ground) draws in reading order; then the screen's real cards, cropped
from its native frame, fly in from below the stage with `Fly` and land in their
slots one by one (KPI row, bars, ring, line), 160 ms apart; the payoff holds.
The film then cuts on the beat to the live stats take.

### Files

```
media/launch/stage/
  setup.sh          copy the skill into .media/stageshow, npm ci, link our scenes
  scenes/bento/     index.tsx + bento.css
  scenes/assemble/  index.tsx + assemble.css
  record/           index.html + main.tsx: installVirtualClock(30 fps), one scene at 1920×1080
  record.mjs        playwright-core: step the clock a frame, screenshot, repeat
```

`npm ci` in the copied skill is its documented install (its own lockfile); it
runs only inside the gitignored `.media/`.

## v5 (owner, 2026-11-01): "the earlier version was better, especially the start;
## this feels like a presentation, not a launch video; lower the music, let the
## haptics speak; scenes should show what is possible"

- **Opening**: v3's montage back, at 1× — six controls, 0.6 s each, hard-cut as
  each press lands (`data-media-start` puts the press 0.25 s into its clip).
- **Grid** replaces the static bento (owner: "a bunch of components in a grid
  moving in opposite directions, and it keeps zooming out to reveal more"):
  nine columns of live tiles, alternate columns sliding opposite ways, the
  camera pulling back exponentially from one input being typed into.
- **Showcase**: hard cuts on actions with camera pushes — the assemble, Settings
  across looks, Aero's Start, Linux's palette change, the agent typing and
  sending, Slang computing.
- **Words**: four lines on a ground band, none over the montage.
- **Mix**: score 0.28, haptics 0.9, mastered to −18 LUFS.

## v4.1 (owner, 2026-11-01): "static cuts, the sidebar collapse, and make the
## platform switch visible"

- **Opening**: four close-ups (Switch, Tabs, Slider, Checkbox) at 1.2 s each.
  Each shot is one static framing — the camera push is gone, so the cut is the
  only motion, and every press has ~0.7 s to settle before its cut.
- **Platforms**: each shot is named under the line (`macOS`, `Windows`,
  `Linux`) for exactly its own cut, so the switch is read, not inferred. The
  Settings take holds the macOS look for the shot (its Look presses moved to
  1.5 s / 2.4 s / 3.2 s of a 4 s take); Aero is Windows, the tiling block Linux.
- **Terminal**: the scene starts at the take's first frame — `ssh` typed at the
  local prompt, the login banner, `nub run dev console --terminal` typed, its
  output, then the app painting below the shell history. The take is pressed
  early (`deploy@0.5`) so its toasts are up, then the sidebar trigger
  (`sidebar-trigger@1.5`); the collapse and the toasts paint on the terminal's
  own repaint cadence, which is the whole ~2 s the platform gives it.
  Terminal mode only repaints on input (`terminal-take.ts` TODO), so the
  collapse is one painted frame, not a spring — the film shows it instead of
  cutting past it.
- **App shots**: the agent and Slang shots shrink to leave a bottom margin.

## v4.2 (owner, 2026-11-02): "first frame just the switch, the pointer stays
## after a click, and the same component in three platforms"

- **First frame**: `cu-switch-solo` — the Switch alone on the paper (no card,
  no label), `size="lg"`, cut in at a 4× camera push. Frame 0 is the off state
  and the only thing on screen.
- **Pointer**: `tap` and the slider's path end on the control they pressed, so
  no shot carries the old drift down and away; the close-up takes were
  re-recorded.
- **Platforms**: the section is the *same* Settings window three times, not
  three different blocks: one take whose own Look control restyles it, cut
  into `macOS` (0.15–1.35 s), `Windows` (1.6–2.6 s) and `Linux` (2.95–4.25 s)
  of the take, with no camera move so the cut is the only change. The Settings
  take is 4.4 s (presses at 1.4 / 2.8 s); cursor on the chosen pill for the
  Windows and Linux cuts, none on macOS. The old Aero and tiling shots stay in
  the grid tiles.
- **Retime**: assemble 2.9 s, macOS 1.2 s, Windows 1.0 s, Linux 1.3 s,
  agent 2.4 s, Slang 2.25 s.

## v4.3 (owner, 2026-11-02): "quality, a drone over the falling blocks, the
## terminal full-screen with its springs shown, and Paper's text swap"

- **Close-ups**: the montage crops are back under 1.5 and the close-up footage
  is encoded at CRF 8, so the control is framed, not magnified — the checkbox
  and its check read sharp.
- **Assemble**: the blueprint outlines are gone — the stats block's cards fall
  onto bare paper while one slow drone move (scale 1.14 → 1.02, a 0.6° settle)
  carries the camera, then the whole screen settles over them.
- **Platforms**: unchanged (one window, three looks); the assemble now cuts
  straight into that switch.
- **Terminal**: the app takes the *whole* screen when it opens (the shell
  history clears, as a TUI does) instead of sitting below it.
- **The springs**: terminal mode paints only on input — measured again: three
  batches for a whole take, and keys, wheel and resize pulses add none — so a
  native `console-window` take carries the sidebar collapse and the toasts
  (19.45–20.95 s), and the terminal then shows that same screen, collapsed
  with its toast, filling the window. No animation is faked in the terminal.
- **Paper's swap**: "every component you need" starts under the field, then the
  line and the field exchange places — the line rises to the band, the field
  slides down under a crossfading paper gradient.
- **Slang**: the new app (`~/Documents/slang`) replaces the old calculator take:
  three of its own captures (fx-991 result, LaTeX, TI-84 graph) cut in a
  0.75 s triptych.

## v4.4 (owner, 2026-11-02): "no repeats in the grid, a sharp switch, a macOS
## terminal, and the animations inside it"

- **Grid**: twenty **different** takes in one 5×4 wall (no repeats), camera
  1.6 → 0.62 and then a second move to 0.5 as the line swaps in, so the wall
  ends fully visible under the line. The line holds 1.85 s under the wall
  before the swap.
- **Switch**: `cu-switch-solo` draws the primitive at 4× its shipped
  `switchMetrics` (152×88) instead of cropping a 2× capture, so the macro
  keeps the renderer's pixels; the montage crop is 2.6 of that.
- **Terminal chrome**: light macOS title bar (44 pt, traffic lights, centred
  title, hairline border), not the old dark bar.
- **Terminal animations**: the platform paints only on input (re-measured;
  no pulse helps), so the app area is `console-term` — the same tree at the
  terminal's 1024×576 and darwin theme, rendered by the window renderer — and
  the sidebar collapse and the toasts play. Documented in the README.
- **Slang**: the fx-991 still is `slang-history` (1024, no clipped fraction);
  `slang-result` clips a fraction at its display's bottom edge in the app.
- **Not done here**: the desktop flip (Windows / Linux / macOS with the chat
  block) needs a macOS desktop block, and the image-2/3 ideas (code editor,
  music player, browser, photos, hardware monitor, analytics) are new library
  blocks with their own docs, tests and inventory rows — the next plan.

## v4.6 (owner, 2026-11-03): "10x the quality"

Reference: the huashu-motion skill's director rules — a route, a hook in 3 s, carried
cuts, hits on every landing, screenshots are source not shot.

Landed here:

- **Opening**: the switch is 1.45× (not 2.6×) and the clip starts 0.38 s before its
  press, so the film opens already moving.
- **Grid**: thirty **different** takes (every block we ship plus the close-ups), a
  6×5 wall, gentler column drift, camera 2.05 → 0.72 with the line swap.
- **Wallpapers**: real images (Wikimedia Commons — a Maligne Lake sunrise and a
  sea-wave texture, licences in `assets/wallpaper/SOURCES.md`) behind the Windows
  and Omarchy desktops; the macOS desktop keeps its drawn violet ground because
  the Agent window's platform materials go translucent over a photo.
- **Omarchy scene back**: the tiling desktop's palette flip (tokyo-night →
  rose-pine) replaces the music shot, with a glass hit on the flip frame.
- **Sound**: the assemble's `land` hits now sit on the stage's real landing frames
  (0.95 s + 150 ms each, not a guessed 2.15 + 0.16), and every scene cut carries an
  `air` whoosh.
- **Defects**: a cursor now sits where its take left it at the cut instead of at
  the frame's top-left corner, and the platform shots are framed, so a take cannot
  spill past the film's rounded edge.

Owed (not in this pass): the monitor rebuilt to the reference (ring gauges, RAM /
network / storage cards, top processes), the music block reworked or dropped, a
story spine (a route with carried cuts rather than beats), the terminal beat
showing more of the library, and the macOS chat window's translucency (the
platform's materials win over the opaque override).

## v4.7 (owner, 2026-11-03): the monitor rebuilt, the terminal shows the library,
## and every cut lands on a beat

- **Monitor**: rebuilt to the reference — dark cards, a load ring per processor
  (a `DonutChart` of load against the rest), temperature / clock / fan rows with
  bars, RAM ring, network and drives, and a Top Processes table. The range
  control moved into the toolbar because the content overflowed a 700-tall
  window (measured: the chips sat at y = 888 in an 800 box, so their press never
  landed); the block test holds the press again.
- **Terminal**: the app in the terminal is the **Settings block**, not the deploy
  list: the ssh session starts `nub run dev settings --terminal`, the window fills
  the terminal, and the look, dark mode and volume are pressed there — each press
  is a real repaint, so the restriction on the terminal platform is turned into a
  demo of the library's controls.
- **Beat grid**: every cut now lands on a 0.5 s beat — montage 4 × 1.0 s, wall
  4–8.5 s, assemble 2.0 s, platforms 3 × 1.0 s, the three-OS flip 3 × 0.5 s, the
  apps 4 × 1.0 s, the terminal 19–24 s.

## v4.8 (owner, 2026-11-03): the story ladder, the player rebuilt, the film on the beat

- **Story ladder**: the lines now name the verb of each beat — "the components
  you know" → the wall's "every component you need" → "compose them into blocks"
  → "one tree, every platform" → "on every desktop" → "real apps, built with it"
  → "even in your terminal, through ssh". One argument, seven rungs.
- **Music**: rebuilt after the reference — a cover with a light, NOW PLAYING,
  the title and artist, the waveform, the scrubber and the transport, then the
  queue with a cover per row. It now opens as a small floating window that hugs
  its content (640×486) instead of a 1100×700 card with an empty half; the
  press-routing guard found the cover's highlight swallowing the row press, so
  both are `pointerEvents: none`.
- **Apps beat**: five 0.8 s shots — Slang, the editor, the monitor, the player,
  the Omarchy desktop.

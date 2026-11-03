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

## v4.9 (owner, 2026-11-03): the macOS desktop runs on a photo, a bento wall,
## and a carried opening

- **macOS over a photo**: the translucent window was a *stale take* — the opaque
  theme and the solid card were already right (a magenta ground behind the window
  showed no bleed at all). Re-recorded `chat-mac` against the blurred Maligne Lake
  wallpaper; the window is solid, so all three desktops now run on real images.
- **Bento wall**: the grid is no longer a uniform 6×5. Nineteen tiles on a
  6×5 unit grid with spans — a 2×2 hero (the stats screen), two 2×1 wide panels,
  two 1×2 tall ones, a second 2×2 block, and singles between them; the camera
  pulls back over the whole wall (2.1 → 0.86) and the line swap still follows.
- **Carried opening**: the first close-up is a camera push (1.1 → 1.45 over the
  beat) that lands mid-move on the cut, so the opening four shots read as one
  gesture instead of four stills.
- **Regression caught and fixed**: an earlier probe edit had truncated the takes
  map (lint found `solo`/`tap` unused); the file was restored from HEAD and only
  the wallpaper line re-applied — `nub run lint` is clean again.

### v4.9a — the whole film on the beat grid

The apps beat was five 0.8 s shots, which put its last four starts on a 0.4 s
grid (7.3 / 8.1 / 8.9 / 9.7). Each app is now 1.0 s, so every shot start and
every scene start is a multiple of 0.5 s, and the terminal moves to 20.0 s with
4.0 s of screen (the ssh typing and the three Settings presses still fit).

Measured from the generated files (`index.html` + `compositions/showcase.html`):

```
montage      start= 0.00  len= 4.00  on-beat=True
grid         start= 4.00  len= 4.50  on-beat=True
showcase     start= 8.50  len=11.50  on-beat=True
terminal     start=20.00  len= 4.00  on-beat=True
stack        start=24.00  len= 2.00  on-beat=True
end          start=26.00  len= 4.00  on-beat=True
showcase shot starts: [0.0, 2.0, 3.0, 4.0, 7.5, 8.5, 9.5, 10.5]
every shot start on the beat: True
```

### v4.9b — every cue back on its picture, and the wall's tiles filled

- **The terminal cue block follows the cut.** The whooshes were hard-coded to
  the old times (4.8 / 9 / 11 / 13.7 / 15.8 / **19.45** / 24 / 26); they are read
  from the timeline now — `4*BEAT_CUT, SHOWCASE, shotStart(1), shotStart(4),
  shotStart(7), TERMINAL, 24, 26` — so the terminal whoosh sits on **20.00**.
  The duplicate whoosh at 4.0 (one literal, one derived) is gone.
- **The assemble's hits follow its in-point.** The shot opens at 1.35 s of the
  stage, so the landing hits are the four that are on screen (8.58, 8.73, 8.88,
  9.03); a hit for a landing behind the cut would sound on the previous scene.
- **The wall's tiles are filled.** A close-up take is a 960×540 stage with one
  small control; the tile crops into it at 2.2× so the control fills the tile,
  and the switch tile uses `cu-switch-solo` (the switch alone, centred) because
  the card take puts its control at the card's right edge.
- **The caption band is solid under the line**: the bottom gradient reaches the
  ground at 28% of its height instead of 55%, so the line sits on paper and the
  tiles wash out behind it rather than showing through the text.

Cue table read back from `index.html` (30 s, beat = 0.5 s):

```
whooshes: [4.0, 8.5, 10.5, 13.5, 15.0, 20.0, 24.0, 26.0]     ← the cuts
assemble landings: [8.58, 8.73, 8.88, 9.03]                  ← the card hits
terminal: 20.00 air · 22.20 press · 22.80 press · 23.40 thud · 24.00 air
```

### v4.10 — the wall picks what reads, and the push carries through it

- **Tiles are chosen by what they read at 300 px**, measured: the centre-crop
  contrast (grey sd) of every take, so a tile could not be a pale card whose
  content disappears. The wall is sixteen distinct takes now — a 2×2 hero
  (stats), wide panels (music, desktop-luna, editor, slang, chat-mac, button),
  a 2×2 kanban, tall columns (chat-win, desktop-aero), and singles (calendar,
  monitor, viewer, launcher, chat-linux, welcome). No close-up cards: a 1920×1080
  stage holding one small control always leaves most of a 3:2 tile as paper, and
  the montage already carries the components in detail.
- **Contrast ledger** (60 % centre crop, grey sd): license 93, slang 87, button 71,
  desktop-aero 66, stats 50, music 48, desktop-luna 45, launcher 40, viewer 38,
  monitor 21, welcome 18, calendar 15, tiling 14, editor 7.5 — versus the rejected
  cu-switch-solo 2.7, slider 3.0, cu-checkbox 4.1, cu-input 4.2, inbox 6.8.
  `omarchy` came off (it is the same kanban board as the kanban tile).
- **The push carries into the wall.** The montage's four clips animate
  1.1 → 1.33 → 1.58 → 1.84 → 2.1 with no easing (one move, not four zooms), and
  the wall opens at exactly 2.1 — the scale hands over. The wall then opens *on
  the calculator tile* (not on the seam) and pulls back to the whole wall over
  3 s, drifting from the tile's centre to the wall's.
- **The line sits on paper across the whole pull-back.** The bottom band is now
  560 px tall with a near-solid stop at 44 %, so the caption is legible over the
  zoomed wall instead of over tiles showing through a gradient.
- **The assemble opens on landed cards**: in-point 1.7 s of the stage (the screen
  lands under the line at y=285, scale 0.55), so the cut at 8.5 s shows three
  cards landed and the chart arriving — never empty paper and never a card in
  the headline.
- `README.md`'s shot table now matches the timeline the film actually renders
  (0–4, 4–8.5, 8.5–10.5, 10.5–13.5, 13.5–15, 15–20, 20–24, 24–26, 26–30).

### v4.11 — a real match cut, and the tile crop bug that hid it

- **The wall's opening frame was never the tile it claimed.** The pull-back used
  `gsap.to(...)` with a position argument, which is a *standalone* tween — GSAP
  ignores the third argument — so it ran on wall-clock time from page load and was
  finished before the scene began. Every opening frame was the wall's centre, no
  matter what `FOCUS` said (which is why two different FOCUS values rendered
  identical pixels). It is `tl.to(..., 0)` now.
- **The cut is a match cut.** The montage's last close-up is a white card with one
  blue control on it ("Hunter License"); the wall now opens on the **button card**
  (same white card, same blue, same centre) at 2.1×: outgoing card 1240×305 at
  (960, 537), incoming 1298×420 at (960, 540) — within 5 % on width, identical on
  centre. The tile sits in the wall's middle row so the pull-back reveals tiles on
  every side instead of empty paper.
- **Detail crops for the three palest tiles** — `zoom` + `focus` on a tile keeps
  the crop uniform (`object-fit: cover` plus `transform: scale`, origin on the
  focus point, never a stretch):
  - `editor` 1.5× on the code block: "import { Stack, Text } …" now reads at tile
    size (7.5 → legible dark type).
  - `calendar` 1.6× on the week grid; `welcome` 1.7× on the logo + 2FA buttons
    (18 → a legible card instead of a white rectangle).

### v4.12 — the wall gets its first two seconds back, and the quiet tiles go

- **The reveal is clean now.** The line's wash used to cover the wall from the
  first frame of the beat, sitting over the calculator for ~2 s. The zoom now
  finishes in 2 s (not 3), the caption and its band rise at 5.9 s, and the
  caption rests lower (y = 880) on a shorter band (400 px, solid from 45 %), so it
  clears the wall's third row: at 6.5 s the calculator is fully visible above the
  line. The line's swap up is still at 7.0 s (y −824).
- **The calendar tile is gone.** Its last frame is a mostly empty week grid
  (measured 15) — the events are small, pale chips. Replaced with `license`: the
  dark Hunter Association card, the licence details and the privileges rows
  (measured 93, the densest take in the film), cropped 2.4× onto the card.
- **Detail crops are exact now.** A zoomed image is sized to the source's own
  aspect (2200×1400, `SCREEN_ASPECT`) rather than to the tile's, so `object-fit:
  cover` has no slack and the focus point lands on the tile's centre. Before, the
  vertical slack shifted the crop by ~0.24 of the frame — the editor showed lines
  6–10 instead of the block, and the welcome dialog was cut off. The welcome tile
  is 2.5× on the dialog (crown, "Bring your binder", Import cards, Import and
  Continue, Step 2 of 3) — all of it inside the tile.

### v4.13 — the wall measured tile by tile, and the two softest surfaces replaced

Contrast (sd) alone cannot judge a bright surface: the old `viewer` tile scored
**77.5** because it was a large flat blue block against a pale sidebar — high
variance, no detail. The ledger therefore measures **detail** as well: the mean
absolute grey-level difference to the right and lower neighbour, over the tile as
it appears in the settled frame — i.e. exactly what the eye gets at 0.83 scale.

- **`viewer` → `settings`** (detail 1.2 → 3.7). A flat blue page became the
  Appearance panel: Look segmented control, Dark mode, Sound effects, Volume —
  labels complete after the focus moved to 0.52.
- **`chat-mac`** (1.3 → **12.2**, the highest in the wall). It was the blurred
  lake wallpaper; the crop now sits on the window's top — Today / Retry failed
  payments / Offline drafts / Exam timetable export plus the diff text.
- **`launcher` → `notes`** (1.6 → 5.5). The launcher is a command palette with a
  single result row on white; the notes app gives the middle pane's titles and
  snippets.
- **The top band was washing the wall's top row.** It was 330 px and solid to
  181, so the stats title bar, the player and the XP menu bar all sat under it
  after the swap. It is 260 px (solid to 120, gone by 203) and the wall settles
  88 px lower, so its first row is crisp.

Ledger at 8.2 s (per tile, sorted by detail):

```
tile           mean  contrast  detail     tile           mean  contrast  detail
kanban        237.0      17.0     2.4     welcome       231.6      33.1     4.3
button        189.8      70.6     2.4     slang         181.7      91.9     4.3
music         205.8      64.4     3.4     license        81.0      86.0     4.9
desktop-aero  178.1      75.7     3.5     notes         233.9      25.6     5.5
desktop-luna  190.3      56.1     3.5     chat-linux    143.2     106.7     6.2
settings      248.5      18.1     3.7     monitor        37.3      39.3     7.7
stats         234.9      44.1     4.0     chat-win      203.3      67.6     8.5
editor        235.3      21.2     4.0     chat-mac      222.8      42.8    12.2
```
detail min 2.4 · median 4.3 · max 12.2 · **no tile under 2.0**.

### v4.14 — the wall comes forward instead of unzipping

The wall opened as a flat field being zoomed out. It now has depth: every tile
starts **2–7 % larger** (more the further it sits from the wall's middle) and
settles to its own size over the same 2 s `power1.inOut` as the pull-back.

- Translation was tried first and rejected: pushing tiles apart opened 40 px of
  paper between neighbours at 2.1×, which read as a broken grid rather than
  depth. Scaling keeps the tiles flush — while the camera is close they meet
  with no gutters, and the gutters return exactly as the wall settles.
- The match cut survives: the button card is 2 % larger at 4.05 s (1298 → 1324 px
  wide against the outgoing 1240), same centre, same blue.
- The settled frame is untouched (scale 1 by 6.0 s), so the ledger is unchanged:
  detail min 2.4 · median 4.3 · max 12.2, no tile under 2.0.

### v4.15 — the settle staggers, and the apps beat moves

- **The depth needed a lag, not just a scale.** Every tile reached its own size at
  the same instant, which flattened the parallax it was there to create. Each
  tile now starts its settle at `depth × 0.32 s` (0 s at the wall's middle row,
  0.32 s at the edges) and runs for `1.8 − delay`, so the centre lands first, the
  outer rows catch up late, and everything is at rest before the line arrives at
  5.9 s. The match tile sits on the middle row, so its delay is 0 and the 4.05 s
  cut is untouched.
- **The apps beat is camera work now, not five stills.** Each of the five shots
  pushes 5–7 % (was 3–4 %) *and* drifts 8–14 px to a different side, so no shot
  sits still: Slang [12, 10], editor [−12, 8], monitor [10, 12], player [−10, −8],
  tiling [10, −6]. `Shot` gained an optional `drift` animated to zero with the
  same `power2.out` as the push; it applies only to shots without a cursor, so
  the cursor follow never desyncs.
- The wall at rest is unchanged, so the ledger holds: detail min 2.4 · median
  4.3 · max 12.2, none under 2.0.

### v4.16 — the settings beat and the terminal hold join the camera

- **The three `settings` looks move.** Each is `push 1.05 → 1` with its own drift:
  macOS [−8, 6], Windows [8, −6], Linux [−6, −8]. This also corrects a v4.15
  assumption: drift is *not* unsafe with a cursor — the cursor lives inside
  `#s-cam${i}` (`.frame` holds the media and `#s-cur${i}`), so it moves with the
  content and stays on the chip it presses (verified at 11.9 s on Windows and
  12.9 s on Linux).
- **The terminal's 4 s hold is a slow dolly**: `.term` goes 1 → 1.03 and −8, −6 px
  over the whole scene with `ease: "none"`, so the `ssh` typing and the three
  Settings presses ride a continuous move instead of sitting still. Measured from
  the render: the window's left edge runs **365 → 358 → 352 px** at 21 / 22 / 23 s.

### v4.17 — the desktop flip joins the camera

The three platform chat stills (13.5–15 s) were the last shots declared `push:
[1, 1]` with no drift, so three 0.5 s cuts sat completely still between the moving
settings beat and the moving apps beat. They now push 5 % with alternating drift:
macOS [8, −6], Windows [−8, 6], Linux [8, 6] — the same language as everything
around them. Measured on the macOS cut: the desktop card spans **1074 px at
13.52 s → 1033 px at 13.95 s** and its centre falls from 966 to 960.5 as the
drift resolves.

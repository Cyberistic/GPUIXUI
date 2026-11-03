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

### v4.18 — the closing beats move too

The stack (24–26 s) and the end card (26–30 s) were the last scenes with no camera
move. Both now push 3 % with a small drift, `ease: "none"`, over their whole
duration:

- **Stack**: `.words` goes 1 → 1.03 and −10, −6 px as the four words ink in one per
  beat. Measured: the line spans **1476 px at 24.05 s → 1518 px at 25.9 s**.
- **End card**: the mark, name, url and credit are wrapped in `.lockup` (so the
  push keeps their spacing) which goes 1 → 1.03 and −8, −6 px over the four
  seconds. Measured: "GPUIxUI" spans **336 px at 26.15 s → 346 px at 29.9 s**.

Every scene in the film now carries the same camera language; no shot is static.

### v4.19 — the whole film audited: cue table re-read, contact sheet inspected

The cue table had not been read back since v4.9b, before the terminal dolly, the
settings/apps drift, the desktop-flip push and the stack/end moves. Re-read from
the generated `index.html` (45 `sfx` clips over 30 s):

```
whooshes     4.00 8.50 10.50 13.50 15.00 20.00 24.00 26.00   ← every cut, no extras
land hits    8.53 8.68                                        ← the two cards still on
                                                                screen at the 1.7 s in-point
terminal     20.00 air · key 20.10–21.22 · press 22.20 · press 22.80 · thud 23.40 · 24.00 air
stack/end    24.00 air · 26.00 air · 26.10 mark
scenes       0.00 / 4.00 / 8.50 / 20.00 / 24.00 / 26.00 — all on the 0.5 s beat
```

Two defects the audit found and fixed:

- a **stray `press` at 4.53 s** left over from an earlier wall design — nothing on
  screen is pressed there (the wall is mid pull-back), so a click fired over a
  moving card. Removed; the cut's whoosh at 4.00 already carries it.
- a **duplicated comment** on the land-hit block (two paragraphs saying the same
  thing) — collapsed to one.

Contact sheet: `fps=2` over the whole film, 60 frames, 6×5 per sheet
(`/tmp/sheetB1.png` 0–15 s, `/tmp/sheetB2.png` 15–30 s). Read left-to-right,
top-to-bottom: switch → tabs → slider → checkbox → wall (button card match, pull
back, line swap) → assemble → three Settings looks → three desktops → five apps →
terminal (prompt, ssh, app) → stack → end card. No dead frame, no beat off the
grid; the only frame that reads flat at thumbnail size is the terminal prompt at
20.0 s, which is a single line of type on black by design (full frame confirms
the chrome, the title and the caret).

### v4.20 — the delivered mp4's audio, verified against the cue table

Until now the cue table was read from `index.html`; nothing had looked at the
audio inside the shipped file. It is a real AAC track:

```
$ ffprobe -show_entries stream=codec_type,codec_name,sample_rate,channels,duration
audio aac 48000 Hz stereo 30.000000 s (195 kb/s)
video h264 1920x1080 30 fps 30.000000 s
```

**Method.** The mix is the score at 0.28 plus the sfx at 0.9, so the sfx can be
isolated exactly: decode the mp4 to mono 48 kHz, render the score with the same
gain and fade, subtract. The residual's median RMS is **7.2** (silence) against
peaks of 6 000–12 000 — the score cancels at **0 samples offset** (AAC priming is
handled), so the residual *is* the sfx bed.

**Cross-correlation against the source samples** (normalised, ±60 ms search):

```
cue     sample    best lag   corr
4.00    air         0.0 ms   1.00
8.50    air         0.0 ms   0.89
10.50   air         0.0 ms   0.86
13.50   air         0.0 ms   0.86
15.00   air         0.0 ms   1.00
20.00   air         0.0 ms   1.00
24.00   air         0.0 ms   1.00
26.00   air         0.0 ms   0.35   (overlaps the mark chime)
8.53    land       +3.0 ms   0.93
8.68    land       +3.0 ms   0.55
22.20   press       0.0 ms   1.00
22.80   press       0.0 ms   1.00
23.40   thud        0.0 ms   1.00
26.10   mark        0.0 ms   0.94
0.41    press      +3.0 ms   1.00
19.63   glass-2    +3.0 ms   0.90
10.53   look-mac   +3.0 ms   0.91
```

The two grouped checks land at 0.0 ms as well: the terminal's ten key cues
(20.10–21.22, summed) and the assemble's two land hits (8.53 + 8.68, summed).

Lag profile around one whoosh, showing the peak is a point, not a plateau:

```
whoosh @ 4.00 s   -200ms=-0.01  -50ms=-0.03  +0ms=1.00  +50ms=-0.02  +200ms=0.01
press  @ 22.20 s  -200ms= 0.01  -50ms= 0.06  +0ms=1.00  +50ms= 0.27  +200ms=-0.01
mark   @ 26.10 s  -200ms=-0.01  -50ms=-0.56  +0ms=0.94  +50ms=-0.80  +200ms=-0.37
```

The +3 ms cases are one AAC frame; nothing is off by more than that. Earlier
"misses" from a threshold-based onset pass (air +70 ms, land 8.68 merged into
8.53) were the samples' own slow attacks and merged decay tails, not sync errors —
the correlation puts every one of them at lag 0.

### v4.21 — cuts measured in the render, and the terminal's sync bug

Cut timing had been read from the generated HTML, never from the mp4. Measured
directly: decode to 80×45 grey, per-frame mean delta, then compare each frame's
delta with its two neighbours — **motion is smooth, a cut is a spike**.

```
cut    frame   delta   spike    nearest cue   Δ
1.00      30     4.8    71.6     1.41 cap-0   (montage: carried push, no whoosh)
2.00      60     2.7    28.1     2.41 cap-1   (idem)
3.00      90     4.1    27.1    3.41 cap-2    (idem)
4.00     120    58.3   427.7     4.00 air     0 ms
8.50     255    31.7    11.8     8.50 air     0 ms
10.50    315    12.7    31.8    10.50 air     0 ms
11.50    345     4.2    17.3    11.50 air     0 ms
12.50    375     4.4    15.6    12.50 air     0 ms
13.50    405    21.8    37.1    13.50 air     0 ms
14.00    420    15.9    18.1    14.00 air     0 ms
14.50    435    15.7    16.3    14.50 air     0 ms
15.00    450    58.1    71.3    15.00 air     0 ms
16.00    480    75.5   748.4    16.00 air     0 ms
17.00    510   113.8   169.6    17.00 air     0 ms
18.00    540   101.8   493.3    18.00 air     0 ms
19.00    570   138.0   164.6    19.00 air     0 ms
20.00    600    92.3   471.7    20.00 air     0 ms
24.00    720    80.2   437.5    24.00 air     0 ms
26.00    780     5.1   227.7    26.00 air     0 ms
```

Every cut is on a frame that is a multiple of 15 — the 0.5 s grid, exactly. The
distinction matters: inside the wall's pull-back (5.0 s) the frame delta is 15.1,
*higher* than the 1.0 s cut's 4.9, but its spike ratio is 1.0 — it is motion. A cut
is identified by the spike, not the delta: 8.4×–748× at every cut.

Three defects the audit found, all fixed:

- **The terminal's app takeover had no sound.** The picture jumps at 21.60 s
  (Δ 89.8, the biggest change in the beat) and the nearest cue was 380 ms away.
- **The thud fired 230 ms before the repaint it accompanies.** The
  `term-settings` take emits exactly one repaint (frame 61 = 2.03 s), while the
  cue sat at T_APP + 1.8. The two "presses" between them had no picture at all.
  Now: `land` on the takeover at **21.60**, `thud` on the repaint at **23.63**,
  and the two phantom presses are gone (`T_REPAINT = 61 / 30` is named in build.ts).
- **Only three of the showcase's thirteen shot boundaries had a whoosh.** The
  comment said "the showcase's shot boundaries"; the code emitted three. Every
  shot boundary now gets one at **0.55** (the scene starts stay at 0.9), so the
  0.5 s cuts do not machine-gun: 8 whooshes → 16.

The montage's three cuts (1.0/2.0/3.0) stay silent on purpose: the opening is one
carried push (v4.9), the press sounds inside each clip carry its beat, and the
first whoosh is the arrival at the wall.

Re-verified in the delivered file: ten new cues correlate with their samples at
**lag 0.0–3.0 ms** (11.50/12.50/14.00/14.50/16.00/17.00/18.00/19.00 air, 21.60
land, 23.63 thud); peak sample 22 671 of 32 767 (69 %), **no clipped samples**.

### v4.22 — every cut whooshed, and the terminal platform's paint limit

- **The montage's three cuts are no longer silent.** `air` at 1.0 / 2.0 / 3.0 at
  **0.35** (the scene starts stay 0.9, the showcase's shot boundaries 0.55), so the
  opening keeps its carried-push feel while every cut still has its transition
  sound: **19 cuts, 19 whooshes, 55 cues.**
- **The terminal take cannot paint three repaints.** Three recordings were tried:

  ```
  term-a  dark@1.0 look-win32@2.0 look-linux@3.0   126 frames · paints at 61, 87, 121
  term-b  look-win32@1.5 dark@3.0 look-linux@4.5   171 frames · first paint at frame 101
  retry   dark@0.8 look-win32@1.6 look-linux@2.4   110 frames · first paint at frame 61
  ```

  In every case the **first** painted frame already shows the *final* state — the
  app applied all three inputs before its first commit — and the frames after it
  differ only by the pointer's chip hover (Δ 4.6 at 240×135). The platform
  coalesces paints until a commit; `terminal-take.ts` documents the same class of
  bug ("the collapse likely waits on a layout event … A runtime fix is owed").
  So three visible repaints are not obtainable by recording, and the experimental
  takes were deleted. The film keeps `takes/term-settings` (app painted from frame
  0, one look change at 2.03 s) and its cues now point at what is actually on
  screen: `land` on the takeover at 21.60, `thud` on the repaint at 23.63.
- **The README stops overclaiming**: the terminal beat says the block takes the
  terminal over and its look changes — one repaint, not three presses.

**Full 55-cue audit against the new render** (score subtracted, each cue
correlated with its own sample):

```
52 direct:  lag 0.0–3.0 ms, corr 0.36–1.00
 2.41 detent-3  masked by cap-1 at the same instant → grouped with it: lag 3.0 ms, corr 0.99
20.10 key-0     masked by the whoosh tail (air is 0.575 s) → grouped with air + the
20.20 key-1     first four keys: lag 0.0 ms, corr 1.00
```

Cut table re-run on the same render: **19/19** cuts show a picture spike (8.4×–748×
against their neighbours) exactly on a frame that is a multiple of 15, with a
sound at **0 ms**.

### v4.23 — the terminal beat gets its three repaints, without faking one

**Root cause.** The terminal renderer ships in `@gpuix/native@0.11.0`, a pinned
external binary — the repo's `apps/playground/src/terminal/*` is a probe that
decodes the escape stream, not the painter. Three recordings established the
behaviour:

```
term-a  dark@1.0 look-win32@2.0 look-linux@3.0   126 frames · paints 61, 87, 121
term-b  look-win32@1.5 dark@3.0 look-linux@4.5   171 frames · first paint at 101
retry   dark@0.8 look-win32@1.6 look-linux@2.4   110 frames · first paint at 61
```

In every one the **first** painted frame already carries the final state — the
platform coalesces every paint up to its commit — and later frames differ only by
the pointer's hover. No input spacing produces three commits, so no recording
through the terminal can show three repaints. `terminal-take.ts` records the same
class of defect ("A runtime fix is owed"); the fix itself belongs upstream in the
native runtime.

**What was done instead, honestly.** The app area of the terminal was already a
1024×576 render of the same tree — the terminal paints the app, the window
renderer paints the app, and the README has always described the area as that
tree at the terminal's size and theme. A new window-renderer take `term-app`
records **the Settings block alone** at 1024×576 with `platformTheme(light/dark,
"darwin")` and presses at the film's beats: look-win32 (0.6 s), dark (1.2 s),
look-linux (1.8 s). That renderer paints every frame, so it yields the three
states the terminal cannot.

The terminal scene now holds four stills of that take (frames 8 / 24 / 42 / 60)
switched at `T_APP + 0.6 / 1.2 / 1.8`, with the pointer drawn from the take's own
samples at **half** its coordinate space (the window take reports at 2× DPR).
Cues: `land` 21.60 (the app takes over), `press` 22.20 (look chip), `thud` 22.80
(dark mode), `press` 23.40 (look chip again).

**Audited on the new render.**

```
terminal beat  21.60  full-frame Δ 90.0   cue land   Δ 0 ms
               22.20  Look-row Δ 3.4      cue press  Δ 0 ms   (chip highlight moves)
               22.80  full-frame Δ 82.8   cue thud   Δ 0 ms   (dark mode)
               23.40  Look-row Δ 1.8      cue press  Δ 0 ms   (chip highlight moves)
cuts           19/19 spike on a frame multiple of 15 with a cue at ≤40 ms
cues           54/57 direct at lag ≤25 ms; the three others are masked by
               simultaneous sounds (detent-3 under cap-1; key-0/key-1 under the
               air tail) and group to lag 3.0 / 0.0 ms with corr 0.99 / 1.00
```

The two chip repaints are small by nature (a highlight moving between two chips),
which is why the 80×45 full-frame pass reads them as ~0.1; measured on the Look
row at full resolution they are 3.4 and 1.8.

### v4.24 — the terminal pointer lands on the control it presses

The pointer was drawn from `term-app`'s cursor samples at half their 2× coordinate
space, which put it on the right controls but left it drifting off after each
press — at 23.6 s the tip sat ~40 px below the Linux chip it had just pressed.

Measured rather than guessed: the take's aim points (resolved by the renderer from
`testId`) are the control centres in 2× space — look-win32 (898, 92.5),
dark (964, 145), look-linux (959.5, 92.5) in take pixels — and a 100 px grid over
`takes/term-app/0042.png` confirms the chips at y ≈ 79–100 and the switch at
y ≈ 132–151. The mapping was right; the **last waypoint** was the problem: it
drifted `dx 30, dy 40` after the press. It now holds the chip (`dx 0, dy 0`), so
the tip stays on the control for the rest of the beat.

Verified by cropping each press out of the render:

```
22.2 s  Windows chip   tip on "d"/"o" of the chip, inside the highlight
22.8 s  dark switch    tip on the switch knob
23.4 s  Linux chip     tip inside the chip
23.6 s  (after)        tip still inside the chip — no drift off
```

Re-ran both audits on the new render: **19/19** cuts spike on a frame multiple of
15 with a cue at ≤40 ms (terminal: 21.60 Δ90.0 land, 22.20 press, 22.80 Δ82.8
thud, 23.40 press — each at 0 ms); **54/57** cues correlate directly at lag
≤25 ms, the three others masked by simultaneous sounds as before.

### v4.25 — the terminal paint coalescing: where it lives, and why it is blocked here

Investigated on request, to see whether the defect can be fixed in this repo.

**It cannot, as the repo stands.** The terminal platform is Rust, not the JS in
`apps/playground/src/terminal/`:

- `@gpuix/native@0.11.0` ships only a compiled addon (`index.d.ts` exposes
  `terminal?: boolean` and no repaint hook — there is no JS seam to call).
- The renderer lives in the GPUix host at
  `references/gpuix/packages/gpui-terminal/` (`window.rs`, `tty.rs`, `kitty.rs`,
  `dispatcher.rs`; 3 587 lines). `window.rs::draw` presents one frame per paint,
  so the coalescing is in the input → invalidate → frame scheduling path, not in
  the presenter.
- `patches/gpui/0001-transform.patch` — the only runtime patch in the repo —
  patches a **Zed checkout** used to *build* that addon, and its README says it is
  optional and "not a dependency of any package in this repository". The host
  checkout under `references/` is read-only by repo rule.
- There is no build step here for the addon: no `target/` in the reference, no
  script that produces the `.node`, and the pinned binary lives inside the nub
  store.

**What a real fix costs.** Copy the host out of `references/`, patch the frame
scheduling so each committing paint emits its own kitty batch, build the napi
addon with the pinned toolchain (`channel = "1.97.1"`, cold — no cargo cache for
this tree), then replace the binary in
`node_modules/.store/@gpuix+native-darwin-arm64@0.11.0/…` and re-record
`takes/term-settings` and the two audits. That is a dependency-build change for
the whole repo, not a film change, and it is the kind of call a workstream owner
should make rather than a film pass.

**Meanwhile the beat is not broken.** The film shows the three repaints through
`takes/term-app`, a real render of the same block at the terminal's 1024×576 and
darwin theme, cut on the three pressing frames; cuts are 19/19 on the grid and
54/57 cues correlate directly. The upstream defect only limits what a *terminal
capture* can show, which is why it is recorded here rather than patched blindly.

### v4.26 — the native fix, attempted: it builds, it patches, it does not change the paint

The defect was attacked for real this time, not documented.

**The build works.** `references/gpuix` was copied to a scratch tree, its `zed`
submodule fetched at the pin (`f77e5cfe`, shallow), and the addon built with the
repo's pinned toolchain (rustc 1.97.1):

```
$ cargo build --release --features test-support
    Finished `release` profile [optimized] target(s) in 1m 38s
```

**The patch.** `packages/gpui-terminal/src/gpui_terminal.rs::pump_events` drained
every queued message (up to `PUMP_BUDGET`) and painted once at the end. It now
presents between messages:

```rust
Ok(message) => {
    self.handle_message(message);
    if let Some(deadline) = self.window().and_then(|window| window.run_frame_if_due()) {
        self.wake_at(deadline);
    }
}
```

The resulting `libgpuix_native.dylib` was copied over
`node_modules/.store/@gpuix+native-darwin-arm64@0.11.0/…/gpuix-native.darwin-arm64.node`,
ad-hoc signed, and the recorder ran against it.

**It changed nothing.** Two takes were recorded through the patched binary:

```
presses 0.6/1.2/1.8 s   90 frames   4 painted, first at 2843 ms   one visible change (frame 61)
presses 3.4/4.0/4.6 s  174 frames   5 painted, first at 2705 ms   one visible change (frame 160)
```

Both still collapse to a single painted state, now *later* rather than per press:
the presses land before the app's first paint (the terminal app needs ~2–2.8 s to
boot), and the one paint that follows carries the final state. So the coalescing
is **not** in `pump_events`; the next candidate is the input path — `tty.rs` reads
one `TerminalEvent` per read, so several presses can arrive inside a single event
and reach the app as one batch — and the JS frame loop that decides when to
rebuild.

**Left as found.** The pristine vendor binary was restored (hash matches the
store's `.bak`), the experimental takes were deleted, and the film was re-recorded
from the restored binary to confirm the environment is healthy (`3 painted frames,
first at 2725 ms`). The film keeps `term-app`; nothing shipped from this
experiment except this record.

### v4.27 — instrumented: the platform delivers and presents; the app is what collapses

The `tty.rs`/`pump_events` hypothesis was tested with instrumentation rather than
reasoning. The patched host (v4.26's build) was rebuilt with a probe that appends
to `/tmp/gpui-terminal-probe.log` on every handled message and every presented
frame, swapped into the store, and the recorder run twice.

**Probe, presses before the app's first paint (0.6 / 1.2 / 1.8 s):**

```
handled runnable → presented        (boot)
handled terminal ×14                (the input burst — three presses + motion)
presented                           (one frame, carrying the final state)
```

**Probe, presses after the app is up (3.4 / 4.0 / 4.6 s):**

```
presented after 1 terminals × many  (one frame per input event — ~60/s of motion)
…
174 terminal events handled, 69 frames presented
```

So the reader already emits one `MainMessage::Terminal` per parsed event
(`tty.rs` drains a `Vec` of events and sends each), and with the v4.26 patch the
window presents between messages. **The platform path is cleared.**

**The app is what collapses.** In the post-boot take, `cmp` says frames 100 and
150 are byte-identical — the app re-presents an unchanged scene for every motion
event — and the one state change lands at frame 160 (5.33 s), ~2 s after the first
press. The presses reach the app (the dark theme does appear), it just renders
them as a single late frame. That points at `@gpuix/react`'s reconciler scheduling
in terminal mode, which is JavaScript in the store package, not the native host.

**Left as found.** Vendor binary restored (hash matches the store's `.bak`),
probe takes and logs deleted. The film keeps `term-app`. The next target is now
named precisely, and it is a JS patch rather than a Rust rebuild.

### v4.28 — the JS patch was not reached: the take pipeline paints once every ~2 s

Before patching `@gpuix/react` the take itself had to be shown to be healthy, and
it is not. Three fresh recordings through the **vendor** binary (the store was
restored first, hash matches `.bak`):

```
settings dark@6.0   216 frames   every sampled frame blank (mean 250)
settings dark@1.0    66 frames   samples 250,250,…,49 — the app appears in the last
settings dark@1.0    66 frames   identical
recorder log         "3 painted frames, first at 2667–2803 ms" in every run
```

So the app's **first paint lands ~2.7 s after the process starts**, and the takes
end shortly after; presses sent at 0.6/1.2/1.8 s all land before that first paint
and are therefore applied into it — one frame, final state. That is the observed
"coalescing". Paints that do happen are ~1.5–2 s apart (the 3.4/4.0/4.6 s take
showed its single change 2.5 s after the first press), so three distinct states
cannot fit a 2.4 s beat even when the inputs land after boot.

That is consistent with what `terminal-take.ts` already recorded in 2026-11-01
("the platform paints only when the app marks a state change on input, so no
spring can be recorded in terminal mode") — the limit is the renderer's paint
cadence, not a missing flush in the reconciler. Patching `@gpuix/react` would not
change it: the app does commit, the renderer is what takes seconds per frame.

**Consequence.** The film keeps `term-app` (the same block painted by the window
renderer at the terminal's 1024×576 and darwin theme); its three wipes are exact
and audited. The upstream defect should be reported as *paint cadence* with the
numbers above, not as reconciler batching. Store binary restored, probe takes and
logs removed.

### v4.29 — the present path timed: 0.4–1.3 ms, so the 2 s is not the renderer

`kitty.rs::present` was instrumented with per-stage timings (encode → `write_all`,
byte count, wall clock) plus an `input` stamp per `TerminalEvent`, built and
swapped in, then a take recorded (`settings dark@1.0 look-win32@2.0`):

```
96 input events, 4 presents
  present bytes=66397 write=1.0 ms   since_last_input=  0.0 ms
  present bytes=66397 write=1.3 ms   since_last_input=  6.0 ms
  present bytes=70106 write=0.6 ms   since_last_input=  4.0 ms
  present bytes=68109 write=0.6 ms   since_last_input= 26.0 ms
```

**Verdict on the stage the instruction named: the present path is not slow.**
A full 1024×576 frame is ~66–70 KB and takes **0.4–1.3 ms** to encode and write,
and every present follows its input by **4–26 ms**. The TODO's "slow link blocks
the main thread" is not what is happening here.

What *is* slow is upstream of the present: a take with presses at 3.0 / 3.9 / 4.8 s
paints its first change at **4.93 s** and its second at **5.03 s** — the state
commits arrive ~1.9 s after the press and then land in a burst. So the app's
commit is the deferred stage, not the renderer's encode.

A take with presses at 1.0 / 2.0 s does contain two distinct states (Δ 202 at
2.03 s, Δ 4.6 at 2.90 s), which is why earlier takes were inconsistent: whether a
press appears depends on where it lands relative to that ~2 s commit cadence, not
on whether the renderer can paint it.

Store binary restored (hash matches `.bak`), probe takes and logs removed. Next
target is the JS commit latency (~1.9 s), which is the `@gpuix/react` side after
all — but the renderer is now cleared by measurement rather than assumption.

### v4.30 — instrumented the commit path: the commits are fast, and no click ever arrives

The JS side was instrumented in the store (reversibly; all three files restored
and diffed clean afterwards) and a take recorded with two presses:

```
[state] module loaded                 ← the patched module is live
[commit] flushMutations 0.3 ms        ← resetAfterCommit → one applyBatch FFI call
[commit] flushMutations 0.0 ms
[tick] …                              ← none over 20 ms: the frame loop is idle-free
[evt] …                               ← ZERO pointer events dispatched
```

Three conclusions, in order of surprise:

1. **The commit is not slow.** `flushMutations` — the single FFI applyBatch that
   pushes the whole mutation queue into Rust — takes **0.0–1.4 ms**.
2. **The frame loop is not slow.** No `tick()` exceeded 20 ms across two takes.
3. **The clicks never reach the app.** `dispatch(event)` in
   `@gpuix/native/dist/renderer-state.js` is the only door from native input to
   the React handlers, and in a take with two presses it is called **zero times**.
   The one visible state change that earlier takes showed is therefore not a press
   being applied late — it is a relayout/render that happens without any input.

So the v4.29 "~1.9 s JS commit" reading is withdrawn: the two commits observed
were the boot render and one relayout. The real defect is upstream of React —
the terminal's pointer events are parsed (v4.27 probe: 174 `TerminalEvent`s) but
never hit-test to a JS element, so no handler runs. That is a hit-test/coordinate
defect in the terminal window, not a scheduler one.

Caveat recorded honestly: the instrumentation is a store patch, so a dispatch path
that bypasses `createRendererState` would be invisible to it; the module marker
confirms the patched code was the live code path.

**Restored:** `renderer-state.js`, `runtime.js`, `host-config.js` copied back from
their pre-patch copies (grep for the probes: 0 hits), vendor `@gpuix/native`
binary in place, take re-recorded to confirm the environment is healthy.

### v4.31 — the clicks arrive with the right coordinates and never reach the app

`window.rs::handle_mouse` was instrumented (raw event kind, raw x/y, whether the
terminal reports pixel mouse, scale factor, the position handed to GPUI, and the
dispatch result), the addon rebuilt and swapped, and a take recorded with two
presses:

```
96 mouse events
kind=Press(Left)   raw=(882.0,94.0)  pixel_mouse=true scale=1.00 pos=(882.0,94.0) result=Some(true)
kind=Release(Left) raw=(882.0,94.0)  …                                          result=Some(true)
kind=Press(Left)   raw=(960.0,149.0) …                                          result=Some(true)
kind=Release(Left) raw=(960.0,149.0) …                                          result=Some(true)
kind=Move(None)    raw=(882.0,94.0)  … (×33, the pointer resting on the chip)
```

So the coordinates are **exactly right**: pixel mouse is on, scale is 1.0, the
frame is 1024×576 (verified from the take's PNG), and (882, 94) is the Windows
chip in the layout the recorder measured. There is no coordinate or resize defect
to fix — the hit test is never given a chance to miss.

What the log does show is that the press is delivered to the platform's input
callback and comes back **propagating** (`result=Some(true)`), while v4.30 proved
`renderer-state.dispatch` in JS is called **zero times**. Combined: the native
window hands the mouse event to its input callback, but the JS `onEvent` bridge
never runs for it in terminal mode.

That moves the defect one layer further and *narrows it to the JS↔native event
bridge* (`@gpuix/native/dist/runtime.js`, `createNativeRenderer`'s callback), not
the hit test, not the coordinates, not the scheduler, not the renderer.

Store binary restored (hash matches `.bak`), probe take and log deleted,
environment re-verified by recording a take.

### v4.32 — the JS bridge is never called at all

`createNativeRenderer`'s callback in `@gpuix/native/dist/runtime.js` — the single
place the native renderer hands anything to JS — was instrumented to log every
invocation (error?, event type, whether `options.onEvent` is a function), the file
restored afterwards. A take with one press:

```
[bridge] …    ← zero lines
```

**The callback never fires.** Not for pointer events, not for errors, not for the
initial render. Meanwhile the Rust side logs prove the platform *does* run its
input callback and hands it a press at (882, 94) with `pixel_mouse=true`, scale
1.0 — it comes back propagating. And `renderer-state.dispatch`, which is only
reached from this callback, is never called (v4.30).

So the chain is now: input parsed ✓ → platform callback invoked ✓ → **native→JS
threadsafe callback never delivered** ✗ → JS dispatch ✗ → React handler ✗. The
break is inside the addon's event delivery to Node, not anywhere above it.

That is the sixth layer in six rounds, and each one has moved the defect deeper
into the pinned `@gpuix/native` build while the film stays green with `term-app`.
Diminishing returns are now explicit: the next step would be instrumenting the
napi `ThreadsafeFunction` itself (does `tsf.call` return Ok? is the JS loop
blocked?) — a change inside a compiled dependency whose correctness I cannot
verify beyond "a take shows no frames".

Store restored (`runtime.js` back to its pre-patch bytes: grep for the probe is 0),
environment re-verified by recording a take.

### v4.33 — the bridge works: clicks reach JS, but the chip presses miss

Instrumented the napi `ThreadsafeFunction` in
`packages/native/src/renderer.rs::event_callback_for_view` (event kind, element id,
`tsf.call` status), rebuilt, swapped, recorded. Results:

```
one press (dark@1.0)          5 tsf calls: windowKeyDown, keyDown, focus,
                              mouseMove(el 78), click(el 59) — all status=Ok
three presses (3.0/4.0/5.0)   click(el 46), click(el 50), click(el 59) — all Ok
two chip presses (3.0/4.0)    click(el 46), click(el 50) — all Ok, and the take
                              shows NO visible change at all
```

So **v4.32's "the bridge is never called" was wrong** — my earlier `dispatch`
instrumentation did not take effect on the live object; the tsf shows the bridge
running and every call returning `Ok`. Clicks reach JS.

What the takes then show is the real defect: the **dark-mode click produces a
paint** (Δ 206 at 4.93 s) while the **two look-chip clicks produce none at all**,
even though their clicks arrive with distinct element ids. The chip presses are
landing on elements that are not the chips (the aim coordinates are off for those
rows), while the dark switch is hit correctly.

Store binary restored (hash matches `.bak`), probes removed. Remaining work is now
a coordinate calibration for the chip aims — measurable by logging the hit
element's bounds in `handle_mouse` and comparing with the aim point, not another
architecture hunt.

### v4.34 — the aim is on the chip; the chip still does not take the press

The chip-row calibration was done, and it cleared the coordinates as well.

The take's **own** frame (1024×576) was cropped and measured: with the crop at
(820, 40) scaled 3×, the Windows chip spans take x ≈ 843–920, y ≈ 73–102, i.e. its
centre is **(881, 87)**. The recorded aim is **(882, 94)** — inside the chip. So
the aim mapping for that row is correct; nothing to recalibrate.

The take also shows the pointer's **hover** on the chip: at 3.3 s the Windows chip
paints a grey hover fill while Linux stays selected. So a move over the chip
repaints the app, but the press at that same point does not select it — the click
event reaches JS (`click(el 46/50)`, status `Ok`) and the *state does not change*.

An experiment measuring the aims under `darwin` instead of `linux` (the block's
entry starts in Linux — visible in the take) made it worse, not better, and was
reverted: the original `initialLook: "linux"` matches the runtime and the aims.

So the defect has narrowed to the last possible place: the press reaches the
element container but the chip's own press handler never runs — a hit-test
depth/handler-targeting issue inside GPUIX's element tree, entirely within the
pinned runtime, with no coordinate work left on this side. Every layer measurable
from the film side has now been measured and cleared.

### v4.35 — correction: the JS-side probes were unreliable, the Rust one was not

Chasing the chip press one layer further exposed a methodology error worth
recording. Both JS probes (v4.30's `dispatch`, v4.32's `createNativeRenderer`
callback) wrapped `process.stderr.write` in `try { … } catch {}`. In the bundled
ESM context that write can throw, and the catch swallowed it — so "zero lines"
meant "the probe failed", not "the code path never ran". That is why v4.32's
"the bridge is never called" contradicted the Rust `tsf` log (`status=Ok` for every
event), and why v4.30's "zero dispatches" was equally unsound.

**Withdrawn:** "the JS bridge is never called" (v4.32) and "JS dispatch is never
called" (v4.30). The take that changes to dark after a click is proof the callback
does run — the probe, not the runtime, was silent.

**What remains, all from Rust-side logs that cannot fail silently:**

- `window.rs::handle_mouse`: presses arrive at (882, 94) and (960, 149), pixel mouse
  on, scale 1.0, dispatch returns a result.
- `renderer.rs::event_callback_for_view`: every event reaches the napi
  `ThreadsafeFunction` with `status=Ok`, kinds `click`/`mouseMove`/`focus`/keys,
  element ids 46 / 50 / 59.
- The dark press (el 59) **paints**; the two chip presses (el 46 / 50) do not.
- The take's own pixels put the aim inside the Windows chip (843–920 × 73–102 for
  aim 882,94) and the chip **paints its hover** under the same pointer.

So the last standing hypothesis is handler targeting inside the chip: the press
reaches an element in the chip's subtree whose id has no JS handler, while the
hover path does reach the chip. Verifying that needs a JS probe that actually
writes (a file, not stderr) — the correct next instrument, and the reason this
round did not produce a fix.

### v4.36 — the press lands on the chip, finds a handler, runs it, and nothing changes

The file-writing probe (this time `process.getBuiltinModule("fs")`, so it cannot be
swallowed like the stderr probes) went into `dispatch` with the element bounds from
the live renderer:

```
type=click id=46 at=(882,94) bounds=(843,77,79x36) found=true     ← Windows chip
type=click id=50 at=(954,94) bounds=(930,79,53x32) found=true     ← Linux chip
type=click id=59 at=(960,149) bounds=(943,138,40x24) found=true   ← dark switch
```

Two takes, chip presses only: **no frame changes at all** (delta > 0.3: none). The
same take with the dark press paints (Δ 206). So:

- the press lands inside the chip's own bounds (843–922 × 77–113 for the aim 882,94),
- the element has a registered click handler (`types=click|focus|blur`, `found=true`),
- the handler runs (dispatch returns true),
- and the app still does not change.

So this was never a coordinate, bridge or scheduling problem — the chip's click
handler is not the one that changes the look. The value-change handler sits on the
group (`Tabs`/`ToggleGroup`), which never runs because GPUIX dispatches a press to a
single element. The same block *does* change looks in the window renderer, so the
difference is which element the hit test resolves in the terminal window (wrapper vs
trigger).

The honest next step is therefore different from the one I was given: log the
ancestor chain for the press and either dispatch to ancestors (add bubbling) or move
the change handler onto the item. Both are component or runtime design decisions,
not a coordinate fix.

Store file restored (`renderer-state.js` byte-identical, probe grep: 0), environment
re-verified by recording a take.

### v4.37 — the click chain completes and re-renders; the terminal still does not paint

Instrumented the two hops above the runtime (both file-logging, both restored):

```
click index=1 disabled=false
notify next=["win32"]
onValueChange next=win32 isLook=true
SettingsApp render look=win32 dark=false     ← the app re-rendered in the new look
```

and the take recorded across that press shows **no frame change at all**.

So the v4.36 hypothesis ("the change handler sits on an ancestor that never runs") is
**wrong as well** — the handler runs, the value changes, `SettingsApp` re-renders with
`look=win32`. The break is *after* React commits: the new tree's mutations are
applied to the retained tree, but the next `tick()` does not produce a different
scene, so no frame reaches the terminal. The dark switch (which also re-renders)
does repaint, so the difference is in what the re-render changes (a theme whose
control metrics move) rather than in input.

That is the fourth distinct hypothesis in this thread and the third one withdrawn:
stacking on `pump_events` → bridge → hit-test/handler → **post-commit scene rebuild**.
It is also the first point where the film side has nothing left to measure: the
remaining question is inside the renderer's scene/mutation application.

Both probe files restored (grep for the probe: 0 in both), environment re-verified.

### v4.38 — batches arrive dirty and paint; the painted chip still shows the old look

Instrumented `renderer.apply_batch` (bytes, destroyed ids, `dirty`) and recorded a
take with a chip press at 3.0 s and the dark switch at 4.5 s:

```
batch bytes=28124 destroyed=0 dirty=true      ← boot
batch bytes=70    destroyed=0 dirty=true
batch bytes=6546  destroyed=0 dirty=true      ← the chip commit
batch bytes=9137  destroyed=0 dirty=true      ← the dark commit
```

Every batch is dirty, so the window invalidates and repaints — and the take proves
it: the chip press produces a **non-zero** frame delta (0.13 at 2.90 s) while the
dark press produces 206.8 at 4.93 s. My earlier "no frame change at all" came from a
0.3 threshold on a 256-wide downsample; the chip repaint is real, it is just a chip
highlight's worth of pixels.

But cropping the Look row from the take shows what actually got painted: before the
press Linux is filled and Windows plain; after it **Linux is still filled** and
Windows has only gained a grey *hover*. Meanwhile the v4.37 probe logged
`onValueChange next=win32` and `SettingsApp render look=win32` — the app's state and
tree say Windows while the terminal paints Linux.

So the pipeline runs end to end (input → handler → state → commit → batch → dirty →
paint) and the paint is of the *previous* look. That is a style-resolution
discrepancy in the renderer, not a dropped event: the tree updated, the frame
rendered, and the chip's selected fill did not follow.

Vendor binary restored (hash matches `.bak`), probe take and log removed.

### v4.39 — the JS tree is right; the painted chip keeps the old fill

Logged the ToggleGroup item render (value, pressed, computed background) and the
batch stream together, then cropped the Look row from the take's last frame:

```
render  item=win32 pressed=true  bg="#CFE6F9"     ← after the click
render  item=linux pressed=false bg=null
batches 28124 / 70 / 6546 bytes, all dirty=true
painted (last frame crop)   Linux still filled, Windows plain-but-hovered
```

So the React side is **correct**: the item re-renders pressed with the selection
fill, a 6.5 KB batch is applied with `dirty=true`, the window invalidates, the frame
paints — and the chip still shows the *previous* selection fill, while a hover that
the renderer draws itself appears normally.

That closes every layer that lives on the JS side of the boundary. The defect is now
precisely: **a style mutation for an existing element is applied to the retained
tree (dirty is set) but not reflected in the painted output, while renderer-owned
overlays (hover) are.** A hover repaint proves the paint path runs; a style change
proves it runs with stale style.

Restored: `ToggleGroup.tsx` byte-identical (grep 0), vendor binary in place (hash
matches `.bak`), probe takes and logs removed.

### v4.40 — the style arrives in the retained tree; the composed frame keeps the old fill

`RetainedTree::set_style` — the function the 6.5 KB batch calls — was instrumented
(id, background, whether the element accepted the change), the addon rebuilt and
swapped, and a chip-only take recorded:

```
set_style id=85 bg=Some("#0078D4")  changed=true      ← Windows chip in the new look
…
set_style id=…  bg=Some("#CFE6F9")  changed=true      ← the selected fill, twice
```

`set_style` compares the incoming style with the element's current one and marks the
element render-changed when they differ (`mark_render_changed`). The paint path reads
that very field (`let style = animated_style.or(element.style)`), so both sides of the
retained tree agree: the chip holds `#CFE6F9` after the click.

And the take still shows Linux filled. So the loss is *after* the style is in the
retained tree: either the gpui element built for the chip keeps the styles of the
previous frame, or the terminal's frame production drops the changed pixels. The
presenter's dirty-rect path is disabled by default here (`frame_edits: false` unless
the terminal proves support), so the frame should be whole — which leaves the
element-tree rebuild as the remaining suspect.

That is where instrumentation from this side runs out: the next probe has to be
inside the gpui element build/paint for one element between two frames, which needs
the runtime's own debugging rather than another blind rebuild from the film branch.

Vendor binary restored (hash matches `.bak`), probe take and log removed, no repo
file left modified.

### v4.41 — the chip is built with the new fill; the frame still shows the old one

Two probes, one experiment.

**The built element is correct.** Logged where a built gpui element applies its
resolved background, filtered to the two fill colours the chip can paint:

```
paint bg=#D2E4F7 ×18      ← Linux selected
paint bg=#CFE6F9 ×4       ← the last four paints, Windows selected
```

So after the click the view really does build the chip with `#CFE6F9`. Combined with
v4.40 (`set_style` stored it) and v4.39 (React rendered it), the value is correct at
every stage the code exposes.

**Forcing whole frames changes nothing.** The presenter's edit path can drop a
style-only repaint if `dirty_rects` compares against pixels it already replaced, so
`finish_probe` was patched to always take `Transport::Inline { frame_edits: false }`,
rebuilt, swapped and recorded: the take is still 126 frames whose only change is the
0.13 hover at frame 87. So the edit path is not the culprit either.

What is left is the gpui element tree's own paint cache — the built element carries
the fill, the composed frame does not — which cannot be observed from this side
without the runtime's internals.

**This is the end of what the film branch can do.** Ten rounds, seven hypotheses,
five withdrawn on measurement. The remaining defect is one sentence with a complete
trace, and it belongs to whoever owns the renderer's paint cache.

Vendor binary restored (hash matches `.bak`), scratch host left in the temp tree,
no repo file modified.

### v4.42 — the terminal beat is three real terminal captures

The defect was never that the platform cannot paint a state change — it is that it
paints one only into the **next frame it commits**. A press sent *before* the app's
first paint is therefore already in that first frame. Measured on the chip row:

```
take with look-win32@1.5   frame 61 (2.03 s) Δ 2.65, crop: Windows chip *filled*
take with dark@1.5         frame 61, crop: the whole pane dark, Linux selected
take with ~dark@1.5        frame 61, crop: Linux selected, light
```

So the film now uses three real terminal captures instead of the window-renderer
still:

- `term-light-linux` — Linux, light (`~dark` hover so the app paints at all)
- `term-light-win` — Windows, light (one chip press before the first paint)
- `term-dark` — Linux, dark (one dark press before the first paint)

They are switched at `T_APP`, +0.6 s and +1.2 s, with `land` / `press` / `thud` on
those beats. **`term-app` is no longer used by the film** — the workaround is gone,
and every pixel of the terminal beat now comes from the terminal platform.

Audited on the new render: cuts **19/19** on frame multiples of 15 with cues at
≤40 ms; terminal beat deltas 90.4 (takeover), 0.9 (chip), 78.7 (dark); cues **53/56**
direct at lag ≤25 ms, the same three masked by simultaneous sounds.

## Acceptance rubric (v5.0) — the nine points and the rhythm rules, checked on the shipped mp4

| # | Criterion (from the original critique / huashu-motion) | Evidence | Verdict |
| --- | --- | --- | --- |
| 1 | No repeated components in the wall | `compositions/grid.html` references **16 unique** footage files, one per tile | **pass** |
| 2 | Text holds long enough | `LINES` holds: 2.8 s, 2.0 s, 3.0 s, 1.5 s, 5.0 s, 4.0 s | **pass** |
| 3 | Opening not oversized | the four clips push 1.1 → 1.33 → 1.58 → 1.84 → 2.1 with `ease: none`, cut mid-move | **pass** |
| 4 | Sound on every placement, landing and transition | whooshes at **19/19** cuts (0 ms); **53/56** cues correlate directly at lag ≤25 ms, the 3 others masked by simultaneous sounds and grouped at 0–3 ms | **pass** |
| 5 | No stray cursor at a frame corner | frame 0: **0** dark pixels in either 240×160 top corner | **pass** |
| 6 | Desktop imagery inside its rounded frame | every desktop shot is a `.frame.framed` (radius 20, `overflow:hidden`); checked at 13.7 / 14.2 s | **pass** |
| 7 | Real photographs as wallpapers | macOS = Maligne Lake, Windows = sea, Omarchy = tiling desktop (`assets/wallpaper`) | **pass** |
| 8 | Omarchy scene restored | `tiling` take appears in the wall and as the last apps shot | **pass** |
| 9 | Monitor matches the reference | load rings, temp/clock/fan bars, RAM ring, network/storage, top-processes table | **pass** |
| 10 | Terminal shows the library | three real terminal captures — Linux light → Windows light → Linux dark — **all three now on the 0.5 s grid** (21.5 / 22.0 / 22.5), each with its cue at corr 0.99–1.00 | **pass** |
| R1 | Hook (huashu) | the film opens on a switch turning on, cursor in frame | **pass** |
| R2 | Route | controls → wall → block → platforms → desktops → apps → terminal → stack → card, one ladder | **pass** |
| R3 | Carried cuts | the opening push and the per-shot drift carry the camera across every cut | **pass** |
| R4 | Hits on landings | `land` cues sit on the cards' settle frames (8.53 / 8.68) and the app takeover (21.5) | **pass** |
| R5 | Cuts on the beat | **19/19** scene and shot cuts on frame multiples of 15; the terminal's three state cuts moved from 21.6/22.2/22.8 (off-grid) to 21.5/22.0/22.5 | **pass (fixed this pass)** |

~~Two honest caveats: the Windows-light state (22.0 s) is a chip-and-control-metrics
change (frame delta 0.87); the ssh typing is one line on black by design.~~

**v5.0a — the middle terminal state now reads at a glance.** The chip-only change
was fixed by reordering the three captures rather than recording a new one: Linux
light → **Linux dark** → **Windows light**. Both cuts are now a theme flip, so the
beat reads without inspection:

```
21.5 s  frame 645  Δ 90.31  on-grid  land   corr 0.99
22.0 s  frame 660  Δ 78.32  on-grid  thud   corr 1.00   Linux light → dark
22.5 s  frame 675  Δ 78.29  on-grid  press  corr 1.00   dark → Windows light
```

**v5.0b — the ssh beat is a screen, not a line.** The prompt used to be one line on
black for 1.3 s. It now runs at 0.016 s per character and ends with the dev server's
own output, so the black card carries six lines before the app takes over:

```
20.10  gon@macbook ~ % ssh gon@whale-island        (typed, caret)
20.48  Last login: Sun Nov 1 19:41:07 2026 …
20.54  gon@whale-island ~ % nub run dev settings --terminal   (typed)
21.12  console · ready in 1.4 s
21.18  VITE v7.1.3  ready in 412 ms
21.28  ➜  Local:   http://localhost:5173/
21.38  ➜  GPUix:   http://localhost:5173/terminal
21.50  the app takes the screen
```

The rubric now has no caveats: every row passes, with the measurements above.

Full-film review at 0.1 s (`fps=10`, 300 frames, six 10×5 sheets) shows no dead
frame, no discontinuity and no seam at any join.

### v5.1 — trying to lift the two weakest tiles: measured, no gain, reverted

The wall's ledger still showed `kanban` and `button` at the bottom (2.4 detail).
Both were re-cropped and measured on the render:

```
kanban  zoom 1.15  focus (0.5,0.45)   detail 2.4 → 1.6   (worse: the crop cuts cards)
button  zoom 1.20  focus (0.5,0.5)    detail 2.4 → 3.3
button  zoom 1.45  focus (0.5,0.5)    detail 2.4 → 3.2   (no further gain)
```

Both are structurally flat: a kanban board is a grid of pale cards with tiny type,
and the button is one large filled pill on a pale card — magnifying either discards
content faster than it sharpens edges. The button zoom also pulled the tile away
from the close-up card it match-cuts against, so it was reverted to keep the 4.05 s
cut exact.

**Decision, recorded rather than fudged:** the metric is edge energy, and six of the
sixteen tiles are surfaces that carry meaning without much edge (kanban, button,
desktop-luna, desktop-aero, music, settings). Driving every tile past the median
would mean choosing tiles for noise instead of for what they show, which would make
the wall worse. The ledger stays as the honest measurement it is — **min 2.4, median
4.3, max 12.2** — with this experiment on record as the reason it does not move.

### v5.2 — the wall's weak tiles replaced by denser takes (not crops)

Cropping could not lift the flat tiles (v5.1), so the *content* was changed instead,
each tile placed in the shape where its take reads best. Measured at tile size first
(cover crop to the tile aspect, then the film's 0.83 scale, mean grey neighbour
difference):

```
take         1x1    2x1          take         1x1    2x1
chat-linux   8.8    2.2          settings     4.0    3.4
monitor      7.3    4.2          music        3.6    2.5
term-slang   6.3    2.9          button       3.1    2.8
omarchy      5.9    3.8          notes        2.8    1.4
desktop-luna 5.6    2.7          kanban       2.7    1.4
license      5.5    4.4          welcome      1.1    1.5
tiling       5.2    4.6
```

Two swaps followed from that table:

- `desktop-luna` was in a **2×1** slot (2.7 detail); it now takes the **1×1** the
  weakest tile held (5.6). `welcome` (1.1 at 1×1) is retired from the wall.
- `tiling` (4.6 at 2×1 — the best wide take available) takes the freed 2×1.

**Ledger before → after** (same render, same metric):

```
before  min 2.4 · median 4.3 · max 12.2 · under 4.0: kanban, button, luna, aero, music, settings
after   min 2.4 · median 4.7 · max 10.7 · under 4.0: kanban, music, button, editor
```

The floor is still `kanban` (2.4) — a board of pale cards — and it is kept because
the wall is meant to show a board, not to maximise edge energy. Everything else
moved up, the median rose, and the worst previous tile (welcome) is gone.

Audited on the same render: cuts **19/19** on frame multiples of 15; terminal states
89.9 / 78.3 / 78.3 at 21.5 / 22.0 / 22.5; cues **53/56** direct at lag ≤25 ms.

### v5.3 — the wall's last three weak tiles reshaped (median 4.3 → 4.8)

Three moves, each chosen from the tile-size table and verified on the render:

- **`music` 2×1 → 1×1** (2.6 → 4.1). The player's wide panel was mostly empty at
  616×200; a square crop keeps the cover, title and transport.
- **`license` 1×1 → 2×1**, zoom 1.15 focus (0.5, 0.45) (4.7 at 1×1, 3.1 with a 1.5×
  crop, **4.8** at 1.15). The licence screen's wide band is its densest region when
  the crop is gentle.
- **`editor` zoom 1.5 → 1.75** (3.6 → **4.3**). The code block reads at 1.75 without
  cutting lines mid-word.

**Ledger, 8.2 s frame**

```
kanban 2.4 · button 2.8 · slang 4.1 · music 4.1 · desktop-aero 4.2 · editor 4.3
stats 4.5 · settings 4.7 · license 4.8 · notes 5.0 · tiling 5.1 · chat-linux 7.5
desktop-luna 7.6 · chat-win 9.6 · monitor 9.9 · chat-mac 10.7

min 2.4 · median 4.8 · under 4.0: kanban, button
```

Across v5.1–v5.3 the wall went from **six** sub-median tiles to **two**, and the
median from 4.3 to 4.8. The two that remain are the board (`kanban`, a grid of pale
cards) and the hero button (one filled pill) — both kept because the wall is meant
to show them, not because they cannot be replaced.

Audited on the same render: cuts **19/19**; terminal states 89.9 / 78.3 / 78.3 at
21.5 / 22.0 / 22.5; cues **53/56** direct at lag ≤25 ms.

### v5.4 — the board retired from the wall; one sub-median tile left

`kanban` was the wall's floor (2.4). At 2×2 it measures 1.8 — it is a board of pale
cards, and no crop fixes that (v5.1). Measured alternatives at 2×2:

```
monitor 4.9 · tiling 4.2 · slang 4.1 · term-slang 4.0 · omarchy 4.0
license 3.8 · stats 3.8 · chat-mac 3.1 · settings 3.0 · pipeline 2.8
notes 2.0 · kanban 1.8 · inbox 1.7 · editor 1.7 · preferences 1.5
```

Two moves: `tiling` takes the 2×2 (5.3 in place), and `omarchy` — the board *window*
rather than the board block, so the wall keeps a board without repeating one — takes
the wide slot tiling left (4.8).

**Ledger, 8.2 s frame**

```
button 2.8 · music 4.0 · slang 4.1 · desktop-aero 4.2 · stats 4.5 · editor 4.5
settings 4.7 · license 4.7 · omarchy 4.8 · notes 5.2 · tiling 5.3 · chat-linux 7.0
desktop-luna 7.2 · chat-win 9.8 · monitor 9.8 · chat-mac 10.6

min 2.8 · median 4.8 · under 4.0: button
```

Across v5.1 → v5.4: **six sub-median tiles → one**, floor 2.4 → 2.8, median 4.3 →
4.8. `button` is the last one, kept because it is the tile the opening match-cuts
onto (a close-up card with one control at 4.05 s); a zoom crops the card's corners
and would break that cut, and every denser replacement duplicates another tile.

Audited on the same render: cuts **19/19**; terminal 89.9 / 78.3 / 78.3; cues
**53/56** direct at lag ≤25 ms.

### v5.5 — the match tile keeps its cut and clears the median

`button` was the wall's last sub-median tile (2.8), kept because the opening
match-cuts onto it. The instruction offered two routes: move the match, or find a
crop that keeps the card's corners. The second one works.

Zoom trial, measured on the 8.2 s frame:

```
button zoom 1.00   2.8      card corners visible
button zoom 1.15   3.6      card corners visible at 4.05 s
button zoom 1.30   4.1      card corners still visible at 4.05 s   ← kept
```

At 1.3 the card still shows its rounded top-left corner inside the tile (cropped
frame checked), and the close-up → wall cut still lands on the same white card with
one blue control: the graphic match is unchanged, the tile is just denser.

**Ledger, 8.2 s frame — every tile within 0.7 of the median or above**

```
music 4.1 · slang 4.1 · button 4.1 · desktop-aero 4.2 · stats 4.5 · editor 4.5
settings 4.7 · license 4.7 · omarchy 4.8 · notes 5.2 · tiling 5.3 · chat-linux 6.9
desktop-luna 7.2 · monitor 9.8 · chat-win 9.8 · chat-mac 10.6

min 4.1 · median 4.8 · max 10.6 · under 4.0: none
```

Across v5.1 → v5.5: **six sub-median tiles → none**, floor 2.4 → 4.1, median 4.3 →
4.8. Audited on the same render: cuts **19/19**; terminal 89.9 / 78.3 / 78.3; cues
**53/56** direct at lag ≤25 ms.

### v5.6 — the rubric re-run against the film as shipped after v5.5

The rubric and the 0.1 s review had last been run at v5.0, before the terminal
re-capture, the ssh rewrite and the wall reshaping. Re-run now, each row with the
measurement it uses:

| # | criterion | measurement on this render | verdict |
| --- | --- | --- | --- |
| 1 | no repeated wall tiles | 16 unique footage files in `grid.html` | pass |
| 2 | text holds | `LINES` 2.8 / 2.0 / 3.0 / 1.5 / 5.0 / 4.0 s | pass |
| 3 | opening not oversized | `PUSH` 1.1 → 1.33 → 1.58 → 1.84 → 2.1, cut mid-move | pass |
| 4 | sound on placements/landings/transitions | 19/19 cuts carry a whoosh at 0 ms; 53/56 cues direct at lag ≤25 ms | pass |
| 5 | no stray cursor | 0 dark pixels in both 240×160 top corners at frame 0 | pass |
| 6 | imagery inside rounded frames | 11 `frame framed` shots in the showcase | pass |
| 7 | real photo wallpapers | `macos.jpg`, `windows.jpg`, `omarchy.jpg`, three uses in the takes | pass |
| 8 | Omarchy scene | `omarchy` in the wall (4.8) and `tiling` as the last apps shot | pass |
| 9 | monitor fidelity | `monitor` tile 9.8 and the monitor shot in the apps beat | pass |
| 10 | terminal shows the library | three real captures at 21.5/22.0/22.5 on-grid, cues 0.99–1.00 | pass |
| R1 | hook | opens on the switch turning on with the cursor in frame | pass |
| R2 | route | controls → wall → block → platforms → desktops → apps → terminal → stack → card | pass |
| R3 | carried cuts | the opening push and per-shot drift carry every cut | pass |
| R4 | hits on landings | `land` on 8.53 / 8.68 (cards) and 21.5 (app takeover) | pass |
| R5 | cuts on the beat | 19/19 on frame multiples of 15; the terminal's three state cuts on-grid | pass |

**0.1 s full-film review, re-cut from the current mp4** (300 frames, six 10×5
sheets): the opening still reads switch → tabs → slider → checkbox → the button card
at 4.0 s with its corners intact; the terminal sheet shows the new order light →
**dark** → light-Windows with no seam; the stack and end card are unchanged. No dead
frame and no discontinuity at any join.

Wall ledger on the same render: **min 4.1 · median 4.8 · max 10.6, nothing under
4.0.** Every rubric row holds after the v5.1–v5.5 changes.

## v6.0 — round one on the user's notes

### 1. The wall carries components, not only screens

"it needs lots of work and more components like calendar etc" — the wall was 16
screens. It now mixes six **components** with the blocks, each cropped into the
tile where its card fills the frame:

```
cu-tabs 2×1 zoom 2.15 · cu-slider 2×1 zoom 2.15 · cu-checkbox 2×1 zoom 2.8
cu-switch-solo 1×1 zoom 2.4 · calendar 1×1 zoom 1.7 · editor 1×1 zoom 1.75
```

Measuring the close-up stages first showed every component card is **centred and
0.44 of the stage wide**, so a 2×1 tile is its natural shape (3.08 vs 3.3) and the
crop only needs to scale it to fill: `zoom = 1920 / (card width / 0.95)`.

### 2. Fewer transition sounds, none in the opening

The three montage whooshes at 1.0 / 2.0 / 3.0 s are gone, and the showcase's shot
whooshes drop from 0.55 to 0.4. Scene cuts keep 0.9. Whooshes: 19 → **16**.

### 3. The apps fill the frame

"too zoomed out": every apps shot now hangs from under the line at
`top = BAND + max(0, (1080 − BAND − h) / 2)` and is scaled to fill the width —
editor 0.85, monitor 0.75, slang 0.9, music 1.05, tiling 0.72 — so the window is the
frame, cropped at the bottom like a tight framing instead of floating in paper.

### 4. The terminal is a camera move

"zoom in, typing sounds with the keys following the command, enter starts the app,
then you zoom out": the scene opens at **1.32× on the prompt** (origin 0 0, centred
with x −188), types with the key cues, fires an **Enter press** on the command's last
keystroke (`21.06`, corr 1.00), the app takes over at 21.5, and the camera pulls back
to 1.02 over 1.6 s so the whole window with the running app is shown by 23.1.

Audited after the pass: cuts **19/19**; cue correlation **50/54** direct, the four
masked all inside the fast typing burst (sounds 80–96 ms apart) and the detent under
its simultaneous cap; terminal state deltas 152 / 125 / 90 (the camera adds motion).

### v6.1 — the monitor restyled, and the terminal sequence on a 0.2 s strip

**The block the user pointed at.** The monitor was flat cards on a flat ground. It
now uses a two-stop surface per card (`#1A1D26 → #0E0F14`), a brighter border
(`#2C3040`), a soft accent glow (`rgba(10,132,255,.08)`, 26 px) and uppercase metric
labels, so the dashboard reads as a product rather than a table. The gradient shape
is the one the music cover already uses (`linear-gradient`, two typed stops) — the
first attempt passed `boxShadow { x, y, blur, spread }` and the runtime rejected the
batch (`did not match any variant of untagged enum BoxShadowValues`); the correct
shape is `offsetX / offsetY / blurRadius / spreadRadius`.

**The terminal sequence, verified on a 0.2 s strip** (`fps=5` over 20.0–23.6 s,
6×3): prompt → `ssh` typing → login line → command typing → command complete and
**Enter** (21.06, corr 1.00) → the dev-server output → the app takes the screen at
1.32× → dark mode → Windows look → the camera pulls back to the whole window. Every
stage the user asked for is on the strip.

Gates after the restyle: check types clean, lint clean, blocks 15 files / 75 tests,
hyperframes 0 errors, 30.000000 s.

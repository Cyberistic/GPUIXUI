# Launch film — "Feel it" (v2)

`gpuixui-launch.mp4`: 42 seconds, 1920×1080, 30 fps. An Apple-style launch for
gpuixui.sudokw.com, cut to an original piano score, with a designed tactile sound on
every press. Plan: `.agents/slop/plans/064-launch-film-v2.md` (v1 and the reference
analysis: `060`).

## Every frame of product is the product

Each shot is a real GPUIxUI tree under real input (`apps/playground/src/film/take.ts`:
GPUI hit testing, the motion clock paused and stepped per frame), or the real
terminal-mode stream:

| Bars (104 BPM) | Shot | Take |
| --- | --- | --- |
| 0–2 | Switch, Slider, Button close-ups, rendered at 6–8× | `switch`, `slider`, `button` |
| 2–5 | pull-back into Settings; its Look control restyles it: macOS, Windows, Linux | `settings` |
| 6 | `nub run dev settings --terminal`, typed and run: the block in the terminal, Dark mode pressed | `terminal` (`terminal-take.ts` runs that exact command) |
| 7–8 | the XP-era and Aero-era desktop block: Start opens, a window is raised | `desktop-luna`, `desktop-aero` |
| 9 | Omarchy, one real `colors.toml` per beat | `omarchy` |
| 10–11 | twelve blocks on one tilted wall, the camera travelling across | the block takes |
| 12 | the stats window turns a quarter, then Month is pressed | `stats` |
| 13 | the agent chat: typed, sent | `agent` |
| 14–15 | GPUI · React · shadcn · Tailwind, a word per beat | — |
| 16–17 | the outline mark pressed, wordmark, URL, "Made with ☕ by @sudo_kw" | — |

Drawn by the film, not the library: window frames and traffic lights (an offscreen
capture has no OS chrome), the terminal window, captions, the cursor, the end card.
The terminal repaint arrives ~0.8 s after its click through the capture rig's pty
pipe; the press is drawn 3 frames before the measured repaint.

## Build

```sh
nub run --filter playground build
for take in switch slider button settings omarchy desktop-luna desktop-aero \
            pipeline notes calendar viewer welcome stats launcher agent; do
  nub apps/playground/dist/film/takes.js $take media/launch/takes/$take
done
nub apps/playground/dist/film/terminal-take.js media/launch/takes/terminal
for take in media/launch/takes/*/; do t=$(basename "$take")
  ffmpeg -framerate 30 -pattern_type glob -i "$take*.png" -c:v libx264 -crf 14 \
    -pix_fmt yuv420p media/launch/assets/footage/$t.mp4
done
ffmpeg -sseof -0.05 -i media/launch/assets/footage/button.mp4 -frames:v 1 media/launch/assets/footage/button-last.png
sh media/launch/sound/kit.sh ~/.claude/skills/media-use/audio/assets/sfx
sh media/launch/sound/score.sh <SalamanderGrandPiano-V3+20200602.sf2>
cd media/launch && npx hyperframes check && npx hyperframes render -o gpuixui-launch.mp4 --crf 14
```

The cursor paths in `compositions/*.html` are the takes' `cursor.json`, scaled to the
display; re-paste them if a take's pointer changes.

## Sound

- **Score:** `sound/piano.ts` (an original piece, written as notes) rendered by
  `sound/score.sh` with fluidsynth and the Salamander Grand Piano.
- **Tactile kit:** `sound/kit.sh`, one sound per kind of press, placed one frame
  after its picture (67 cues in `index.html`).

## Credits

Piano samples: Salamander Grand Piano by Alexander Holm, CC BY 3.0
(freepats.zenvoid.org). Omarchy palettes and wallpapers: basecamp/omarchy (MIT);
Kanagawa's wallpaper is Hokusai's *The Great Wave off Kanagawa* (public domain).
Clicks: HyperFrames' bundled sound library.

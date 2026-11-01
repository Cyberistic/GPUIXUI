# Launch film (v3)

`gpuixui-launch.mp4`: 27.5 seconds, 1920×1080, 30 fps, cut to an original piano score
at 120 BPM (a beat every 15 frames) with a designed tactile sound on every press.
Plan: `.agents/slop/plans/064-launch-film-v2.md`, v3 section.

## Every frame of product is the product

Each shot is a real GPUIxUI tree under real input (`apps/playground/src/film/take.ts`:
GPUI hit testing, the motion clock paused and stepped per frame), or the real
terminal-mode stream:

| Time | Shot | Take |
| --- | --- | --- |
| 0–4 s | eight controls, one press per beat: Switch, Checkbox, Slider, Tabs, ToggleGroup, Button, RadioGroup, Input | `cu-*` |
| 4–6 s | Settings: Windows, Linux, Dark mode on beats 1–3 | `settings` |
| 6–10 s | the console block in a terminal: the sidebar collapses, toasts arrive | `term-console` (`terminal-take.ts`: `nub run dev console --terminal`) |
| 10–12 s | the XP-era and Aero-era desktop block, Start pressed | `desktop-luna`, `desktop-aero` |
| 12–14 s | Omarchy, one real `colors.toml` per beat | `omarchy` |
| 14–16 s | twelve blocks on one tilted wall | the block takes |
| 16–18 s | stats, Month pressed | `stats` |
| 18–20 s | the agent chat, typed and sent | `agent` |
| 20–22 s | GPUI · React · shadcn · Tailwind, on the score's chord stabs | — |
| 22–27.5 s | the outline mark, wordmark, URL, "Made with ☕ by @sudo_kw" | — |

The terminal shot's frames are the real terminal-mode stream. Terminal mode paints a
sidebar's collapse only with the next committing press (TODO in `terminal-take.ts`),
so the take presses Deploy right after the trigger, and the film draws each tap
just before its measured repaint. The ssh line is the owner's own test; the take
runs the same command in a local pty.

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
  after its picture (58 cues in `index.html`, mixed at 0.5× under the score at 0.55).

## Credits

Piano samples: Salamander Grand Piano by Alexander Holm, CC BY 3.0
(freepats.zenvoid.org). Omarchy palettes and wallpapers: basecamp/omarchy (MIT);
Kanagawa's wallpaper is Hokusai's *The Great Wave off Kanagawa* (public domain).
Clicks: HyperFrames' bundled sound library.

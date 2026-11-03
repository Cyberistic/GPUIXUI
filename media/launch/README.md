# Launch film (v7)

`gpuixui-launch.mp4`: 30 seconds, 1920×1080, 30 fps, cut to an original piano score
at 120 BPM with a designed tactile sound on every press. Paper's pace and ground
(`~/Documents/paper.mp4`): one lowercase line held at a time, crossfades instead
of cuts. Plan: `.agents/slop/plans/068-launch-film-v7.md` (the v4 history is
`066-launch-film-v4.md`).

## Every frame of product is the product

| Time | Line | Shot | Source |
| --- | --- | --- | --- |
| 0–1 s | — | the Switch, camera pushing from 1.1× | `cu-switch-solo` |
| 1–2 s | no browser in sight | Tabs, resuming the push at 1.33× | `cu-tabs` |
| 2–3 s | — | Slider, 1.58× | `cu-slider` |
| 3–4 s | — | Checkbox, 1.84× — the cut lands at 2.1×, the same scale the page opens on | `cu-checkbox` |
| 4–8.5 s | (title block) | **the page**: a title, a one-line claim and two pills over a wall of **fifteen real cards** in six columns — the wall bleeds off both edges and past the fold; it opens on the button card the montage left, pulls back, and the page settles | one still of each take |
| 8.5–10.5 s | every block is a real screen | the report dashboard: its range control is pressed and the chart re-reads | `dashboard` |
| 10.5–13.5 s | one tree, every platform | **the same Settings window** in three looks — macOS, Windows, Linux | `settings` |
| 13.5–16 s | your theme, live · omarchy | **five Omarchy themes**, each with its own wallpaper, cut a beat apart: Tokyo Night → Rosé Pine → Gruvbox → Catppuccin Latte → Everforest | `omarchy-*` stills |
| 16–20 s | apps, not mockups | Slang’s fx-991, the editor, the hardware monitor, the music player | Slang still, `editor`, `monitor`, `music` |
| 20–24 s | the same app, over ssh | the ssh session; the Settings block takes the whole terminal over, then its look moves to Windows and its dark mode comes on — three real terminal states, cut on the press beats | `term-light-linux`, `term-dark`, `term-light-win` |
| 24–26 s | — | the stack | film |
| 26–30 s | — | the end card | film |

Takes are the real tree under real input (`apps/playground/src/film/take.ts`);
the stage shot is a stageshow recording of real takes (`stage/README.md`). The
film draws the ground, the lines, the platform names, the cursor, the terminal
window and the end card.

The terminal paints only on input — measured: three batches for a whole take,
and kitty-key, wheel and in-band-resize pulses add none (`terminal-take.ts`
carries the note) — so the app area inside the terminal is that same tree
rendered by the window renderer at the terminal's own 1024×576 and darwin
theme (`console-term`). The chrome, the ssh session and the cursor are the
film's; the sidebar and toast animations are the component's, which is the only
way they can appear inside that frame until the platform drives its own
frames.

## Build

```sh
nub run --filter playground build
for take in cu-switch-solo cu-switch cu-tabs cu-slider cu-checkbox cu-toggle cu-button cu-radio cu-input settings stats blueprint slang console-term desktop-aero tiling chat-mac chat-win chat-linux editor music monitor dashboard kanban notes pipeline welcome license; do
  nub apps/playground/dist/film/takes.js $take media/launch/takes/$take
done
# Slang's own captures (its `src/capture.tsx`), as the film's three stills
cp ~/Documents/slang/media/slang-result.png media/launch/takes/slang-app-result.png
cp ~/Documents/slang/media/slang-latex.png media/launch/takes/slang-app-latex.png
cp ~/Documents/slang/media/slang-ti84-graph.png media/launch/takes/slang-app-ti84.png
# the app area inside the terminal: the Settings block at 1024×576, its look and
# dark switch pressed there, so each press repaints a real change
nub apps/playground/dist/film/terminal-take.js media/launch/takes/term-settings settings \
  dark@0.6 look-win32@1.2 look-linux@1.8
sh media/launch/stage/setup.sh            # then record the two stage shots (stage/README.md)
# the five Omarchy themes: one still each, the desktop repainted by the palette file
for theme in tokyo rose-pine gruvbox catppuccin-latte everforest; do
  nub apps/playground/dist/film/takes.js omarchy-$theme media/launch/takes/omarchy-$theme
done
sh media/launch/sound/kit.sh ~/.claude/skills/media-use/audio/assets/sfx
sh media/launch/sound/score.sh <SalamanderGrandPiano-V3+20200602.sf2>
nub media/launch/build.ts                 # encodes footage, writes index.html and compositions/
cd media/launch && npx hyperframes check && npx hyperframes render -o gpuixui-launch.mp4 --crf 14
ffmpeg -i gpuixui-launch.mp4 -c:v copy -af loudnorm=I=-18:TP=-1:LRA=11 -c:a aac -b:a 256k master.mp4  # the mastered file
```

## Sound

- **Score:** `sound/piano.ts` (an original piece, written as notes) rendered by
  `sound/score.sh` with fluidsynth and the Salamander Grand Piano.
- **Tactile kit:** `sound/kit.sh`, one sound per kind of press, placed one frame
  after its picture (the `CUES` table in `build.ts`, under the score at 0.55).

## Credits

Piano samples: Salamander Grand Piano by Alexander Holm, CC BY 3.0
(freepats.zenvoid.org). Omarchy palettes and theme wallpapers: basecamp/omarchy
(MIT; each wallpaper's photographer is credited upstream, see
`assets/wallpaper/SOURCES.md`). Stage shots: the stageshow skill (MIT, Benji
Taylor).
Clicks: HyperFrames' bundled sound library.

# Launch film (v4)

`gpuixui-launch.mp4`: 30 seconds, 1920×1080, 30 fps, cut to an original piano score
at 120 BPM with a designed tactile sound on every press. Paper's pace and ground
(`~/Documents/paper.mp4`): one lowercase line held at a time, crossfades instead
of cuts. Plan: `.agents/slop/plans/066-launch-film-v4.md`.

## Every frame of product is the product

| Time | Line | Shot | Source |
| --- | --- | --- | --- |
| 0–4.8 s | — | four close-ups, 1.2 s each, static framings cut on the settle: the Switch alone (the thumbnail), then Tabs, Slider, Checkbox | `cu-*` |
| 4.8–8.4 s | every component you need | a field of live components in columns sliding opposite ways; the camera pulls back | stage of takes |
| 8.4–11.3 s | — | the stats block's blueprint, its real cards falling into place | `stage-assemble` (`blueprint`) |
| 11.3–14.8 s | one tree, every platform | **the same Settings window** in three looks — macOS, Windows, Linux — named under the line as each cut lands | `settings` |
| 14.8–19.45 s | real apps, built with it | a chat typed and sent, Slang computing | `agent`, `slang` |
| 19.45–24 s | can you believe this is in a terminal through ssh? | the ssh session: the command, its output, the app painting below the shell, the sidebar collapsing, Deploy's toasts | `term-console` |
| 24–26 s | — | GPUI · React · shadcn · Tailwind on the chord stabs | — |
| 26–30 s | — | the mark, the URL, "Made with ☕ by @sudo_kw" | — |

Takes are the real tree under real input (`apps/playground/src/film/take.ts`) or
the real terminal stream (`terminal-take.ts`); the two stage shots are
stageshow recordings of real takes (`stage/README.md`). The film draws the
ground, the lines, the platform names, the cursor, the terminal window and the
end card.

## Build

```sh
nub run --filter playground build
for take in cu-switch-solo cu-switch cu-tabs cu-slider cu-checkbox cu-toggle cu-button cu-radio cu-input settings stats blueprint slang desktop-aero tiling; do
  nub apps/playground/dist/film/takes.js $take media/launch/takes/$take
done
nub apps/playground/dist/film/terminal-take.js media/launch/takes/term-console console \
  deploy@0.5 sidebar-trigger@1.5
sh media/launch/stage/setup.sh            # then record the two stage shots (stage/README.md)
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
(freepats.zenvoid.org). Omarchy palettes: basecamp/omarchy (MIT). Stage shots: the stageshow skill
(MIT, Benji Taylor).
Clicks: HyperFrames' bundled sound library.

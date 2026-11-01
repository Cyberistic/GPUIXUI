# Launch film (v4)

`gpuixui-launch.mp4`: 30 seconds, 1920×1080, 30 fps, cut to an original piano score
at 120 BPM with a designed tactile sound on every press. Paper's pace and ground
(`~/Documents/paper.mp4`): one lowercase line held at a time, crossfades instead
of cuts. Plan: `.agents/slop/plans/066-launch-film-v4.md`.

## Every frame of product is the product

| Time | Line | Shot | Source |
| --- | --- | --- | --- |
| 0–3 s | native apps, now in react | the mark pressed, Settings opens out of it | `settings` |
| 3–8.4 s | with the components you know / drawn by the gpu, every frame | Switch, Tabs, Slider close-ups at 1×, pushed in | `cu-*` |
| 8.4–12.4 s | composed into blocks | a stageshow bento of real footage | `stage-bento` |
| 12.4–16.4 s | put together in seconds | the stats block's blueprint, its real cards falling into place | `stage-assemble` (`blueprint`) |
| 16.4–20.4 s | on every desktop | Settings across looks, the Aero desktop, the Linux tiling block | `settings`, `desktop-aero`, `tiling` |
| 20.4–24 s | can you believe this is in a terminal through ssh? | the console block in a terminal | `term-console` |
| 24–26 s | — | GPUI · React · shadcn · Tailwind on the chord stabs | — |
| 26–30 s | — | the mark, the URL, "Made with ☕ by @sudo_kw" | — |

Takes are the real tree under real input (`apps/playground/src/film/take.ts`) or
the real terminal stream (`terminal-take.ts`); the two stage shots are
stageshow recordings of real takes (`stage/README.md`). The film draws the
ground, the lines, the cursor, the terminal window and the end card.

## Build

```sh
nub run --filter playground build
for take in cu-switch cu-tabs cu-slider settings stats blueprint slang desktop-aero tiling; do
  nub apps/playground/dist/film/takes.js $take media/launch/takes/$take
done
nub apps/playground/dist/film/terminal-take.js media/launch/takes/term-console console \
  sidebar-trigger@0.4 deploy@2.0
sh media/launch/stage/setup.sh            # then record the two stage shots (stage/README.md)
sh media/launch/sound/kit.sh ~/.claude/skills/media-use/audio/assets/sfx
sh media/launch/sound/score.sh <SalamanderGrandPiano-V3+20200602.sf2>
nub media/launch/build.ts                 # encodes footage, writes index.html and compositions/
cd media/launch && npx hyperframes check && npx hyperframes render -o gpuixui-launch.mp4 --crf 14
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

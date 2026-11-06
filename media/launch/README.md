# Launch film (v8)

`gpuixui-launch.mp4`: 30 seconds, 1920×1080, 30 fps, on the original 120 BPM piano
score, with a designed sound on every press. Plan:
`.agents/slop/plans/069-launch-film-v8.md`. Not a one-take: that attempt was
rejected (`agent/launch-film-v4`). Each scene is carried into the next by an
object or a press.

## Every frame of product is the product

| Time | Line | Scene | Source |
| --- | --- | --- | --- |
| 0–4 s | — | Switch, Tabs, Slider, Checkbox | `cu-*` |
| 4–8 s | every component you need | 83 tiles drop onto a tilted plane, opening from the Checkbox | `tile-*`, `dark-tile-*`: the packages' own examples |
| 8–13 s | real apps, in react | ⌘K: Launcher → Vault (a link and a graph node pressed) → Dashboard (range pressed, chart punched in) | `launcher-v8`, `vault-v8`, `dashboard-v8` |
| 13–16 s | and every chart | all 17 chart types drop and draw on landing; Settings falls last and levels into the desktop | `chart-*`, `dark-chart-*` |
| 16–19 s | native on mac, windows & linux | one Settings window; each Look press wipes the desktop from the pointer | `settings-v8` |
| 19–21 s | follows your omarchy theme | full-bleed tiling desktop, four real palettes and wallpapers | `omarchy-*` |
| 21–24 s | the same app, over ssh | ssh, the command, the app; presses repaint on their own frames | `term-v8` |
| 24–26 s | works with your npm packages | package tabs on the score's chord stabs | film |
| 26–30 s | — | the mark, wordmark, URL, maker's line | film |

**Drawn by the film, not the library:** the menu bars, docks, taskbar and GNOME top
bar around the windows; the terminal shell and status line; the lines, cursor,
package tabs and end card. The desktops' dock icons are plain tiles, not real apps.

**The terminal scene is not the terminal stream.** Terminal mode commits a paint
only on input (`terminal-take.ts`), so the app inside the shell is the same tree
through the window renderer at the terminal's 1024×576.

**Sync.** A press and its repaint come from one take. State commits on mouse-up, so
the v8 takes release one frame after the press: the change lands on press + 1, the
frame its sound is placed on. The close-ups change on press + 3 and their cues follow.

## The npm line

`apps/playground/src/film/npm-proof.test.tsx` runs TanStack DB, TanStack AI and Better
Auth under a real GPUix tree. Effect and TanStack Table, Virtual, Hotkeys and Form are
the library's own dependencies. react-doctor is a CLI and scans `examples/blocks`.

Known limit: Better Auth's `useSession` never fetches here, because it returns early
when `window` is undefined and a native app runs under Node. `getSession()` works.

## Build

```sh
nub run --filter playground build
nub apps/playground/dist/film/takes.js --list          # every take
sh media/launch/stage/take.sh <take>                   # one take; build.ts names the ones it needs
sh media/launch/sound/kit.sh ~/.claude/skills/media-use/audio/assets/sfx
sh media/launch/sound/score.sh <SalamanderGrandPiano-V3+20200602.sf2>
nub media/launch/build.ts                              # encodes footage, writes index.html and compositions/
cd media/launch
npx hyperframes snapshot -o /tmp/wall --no-end --at 7.95 && cp /tmp/wall/frame-00*.png assets/footage/wall-end.png
npx hyperframes check && npx hyperframes render -o gpuixui-launch.mp4 --crf 14
ffmpeg -i gpuixui-launch.mp4 -t 30 -c:v copy -af loudnorm=I=-18:TP=-1:LRA=11 -ar 48000 -c:a aac -b:a 256k master.mp4
```

## Sound

- **Score:** `sound/piano.ts` (an original piece, written as notes) rendered by
  `sound/score.sh` with fluidsynth and the Salamander Grand Piano.
- **Tactile kit:** `sound/kit.sh`, one sound per kind of press, placed one frame
  after its picture (the `CUES` table in `build.ts`, under the score at 0.55).

## Credits

Podcast artwork: the owner's own cover (`~/Downloads/hxh-wp.jpg`), cropped
square. Piano samples: Salamander Grand Piano by Alexander Holm, CC BY 3.0
(freepats.zenvoid.org). Omarchy palettes and theme wallpapers: basecamp/omarchy
(MIT; each wallpaper's photographer is credited upstream, see
`assets/wallpaper/SOURCES.md`). Stage shots: the stageshow skill (MIT, Benji
Taylor).
Clicks: HyperFrames' bundled sound library.
TanStack, Effect and Better Auth marks: simple-icons (CC0), `assets/logos/`.

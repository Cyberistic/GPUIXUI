# Launch film (v8)

`gpuixui-launch.mp4`: 38 seconds, 1920×1080, 30 fps, on the original 120 BPM piano
score with bars 5–8 played twice, so its stabs land the stack and its last chord the
mark. Plan: `.agents/slop/plans/069-launch-film-v8.md`. Not a one-take: that attempt
was rejected (`agent/launch-film-v4`).

## Every frame of product is the product

| Time | Line | Scene | Source |
| --- | --- | --- | --- |
| 0–4 s | — | Switch, Tabs, Slider, Checkbox | `cu-*` |
| 4–9 s | it's just shadcn · paste a theme from the shadcn builder | code typed beside the card it builds; three builder themes pasted, read by `shadcnTheme` | `shadcn-v8` |
| 9–12 s | works with your npm packages | package tabs | film |
| 12–16 s | every component you need · and they all go dark | 60 real tiles drop onto a tilted plane; a swipe crosses it to dark | `tile-*`, `dark-tile-*` |
| 16–20 s | real apps, in react | ⌘K, "vault" typed: Launcher → Vault → Dashboard | `launcher-v8`, `vault-v8`, `dashboard-v8` |
| 20–23 s | and every chart | all 17 chart types in three sliding rows, drawing as they arrive | `dark-chart-*` |
| 23–26 s | native on mac, windows & linux | one Settings window; each Look press wipes the desktop from the pointer | `settings-v8` |
| 26–28 s | follows your omarchy theme | full-bleed tiling desktop, four real palettes | `omarchy-*` |
| 28–32 s | the same app, over ssh | ssh, then the whole terminal is the page: sidebar collapses, dark to light, Deploy raises a toast | `console-v8` |
| 32–34 s | — | GPUI · React · shadcn · Tailwind | film |
| 34–38 s | — | the mark, wordmark, URL, maker's line | film |

**Drawn by the film, not the library:** the menu bars, docks, taskbar and GNOME top
bar around the windows; the terminal shell and status line; the lines, cursor,
package tabs and end card. The macOS and Windows docks are plain tiles, not real apps; the GNOME dash carries GNOME's own icons over its Adwaita wallpaper.

**The terminal scene is not the terminal stream.** Terminal mode commits a paint
only on input (`terminal-take.ts`), so the app inside the shell is the same tree
through the window renderer.

**Sync.** A press and its repaint come from one take, and a slider's ticks are the frames its value changed, read from the take (`changes.json`). State commits on mouse-up, so the v8 takes release one frame after the press: the change lands on press + 1, the frame its sound is placed on. The close-ups change on press + 3 and their cues follow.

## The npm line

`apps/playground/src/film/npm-proof.test.tsx` runs TanStack DB, TanStack AI, oRPC and
Better Auth under a real GPUix tree. Effect and TanStack Table, Virtual and Hotkeys are
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
npx hyperframes snapshot -o /tmp/wall --no-end --at 15.95 && cp /tmp/wall/frame-00*.png assets/footage/wall-end.png
npx hyperframes check && npx hyperframes render -o gpuixui-launch.mp4 --crf 14
ffmpeg -i gpuixui-launch.mp4 -t 38 -c:v copy -af loudnorm=I=-18:TP=-1:LRA=11 -ar 48000 -c:a aac -b:a 256k master.mp4
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
GNOME wallpaper and app icons: GNOME project (CC BY-SA 3.0), `assets/gnome/`. oRPC mark: oRPC's own, `assets/logos/orpc.svg`.

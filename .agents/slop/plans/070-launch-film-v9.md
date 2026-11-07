# 070 — Launch film v9: the owner's notes on v8

Same 40 s, same scene order plus one new scene. Everything is edited in
`media/launch/build.ts` and `apps/playground/src/film/shadcn-timeline.ts`, then rebuilt.

| Note | Cause in v8 | Change |
| ---- | ---- | ---- |
| Text blurs on zoom in the opening | `PUSH` 1.1→2.1 upscales 1920 px takes. The renderer captures at a fixed 2× (no option in `TestRendererOptions`) and magnified themes fail on fixed recipe metrics (plan 066) | `PUSH` 0.76→1, so a take never passes 1:1 |
| shadcn is slow and leaves on blank code | 87 typing frames, six themes at 14 frames; `n-out` slides an empty `.a` panel | Typing 40 frames, four themes at 12 frames, scene 7 s → 4 s; `n-out` carries the final code panel |
| Too many lines | — | Only "zero web views" over the wall; apps and charts lose their lines and reclaim the space; desktops say "Mac, Windows, Linux", one word per press |
| Omarchy transitions broken | A half-opacity fade over a dim plate, and flips during the title | The train below; flips arrive as carriages from the right |
| Terminal command and text | `nub run dev console --terminal`, a line cut on and off | `huntercli --terminal`; "Run in the terminal, in tmux, over ssh, with animations." rolls in clause by clause and out as the app paints row by row |
| Mock Rust GPUI and createElement | no scene | `mock`: 2.5 s, one card in both, before "it's just shadcn" |

## Timeline

| s | Scene |
| ---- | ---- |
| 0–4 | `montage` |
| 4–6.5 | `mock` |
| 6.5–10.5 | `shadcn` |
| 10.5–13 | `npm` |
| 13–16.5 | `wall` |
| 16.5–20.5 | `apps` |
| 20.5–23 | `charts` |
| 23–26 | `desktops` |
| 26–30 | `omarchy` |
| 30–34 | `terminal` |
| 34–40 | `stack`, `end`: unchanged times, so the score's stabs still land |

## The train

A black plate, 240 px white type, `mix-blend-mode: multiply`: the letters are windows
onto the Omarchy desktop. Its rounded nose wipes the GNOME desktop off, on one tween
shared with the desktop's clip. It brakes with "omarchy" centred, then the camera dives
through a stem of the h and the desktop is full-bleed. Palettes follow as carriages.

## Commands

```sh
nub run --filter playground build
sh media/launch/stage/take.sh shadcn-v8
nub media/launch/build.ts
cd media/launch
npx hyperframes snapshot -o <dir> --no-end --at 16.45 && cp <dir>/frame-00*.png assets/footage/wall-end.png
npx hyperframes check
npx hyperframes render -o gpuixui-launch.mp4 --crf 14
```

## Acceptance

- `hyperframes check`: 0 errors; 40.000 s.
- Frames: no code panel blank during the npm slide; the h-stem dive fills the frame; the opening's largest scale is 1.
- `nub run check`, `lint`, `test` on the branch.

## STOP conditions

- `take.sh shadcn-v8` fails: the film's take no longer matches the timeline; do not encode stale frames.
- A press's sound no longer lands within a frame of its repaint.

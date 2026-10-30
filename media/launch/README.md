# Launch film

`gpuixui-launch.mp4`: 22 seconds, 1920×1080, 30 fps, H.264 + AAC. A
[HyperFrames](https://hyperframes.ai) composition over one recording of the real
window, with a sound design made in code.

**Play:** open the file, or `ffplay -autoexit gpuixui-launch.mp4`.

## The cut

| Time | What | Type |
| --- | --- | --- |
| 0.0–2.6 | the window arrives, the stack names light in order | React · Tailwind · shadcn · GPUI |
| 2.6–5.0 | the board, camera push and pull | Blocks, from the same parts |
| 5.0–7.5 | the same tree, Windows 11 chrome | Windows 11 · same tree |
| 7.5–10.0 | Linux chrome | Linux · same tree |
| 10.0–12.5 | Omarchy dark | Omarchy · a look, not a fork |
| 12.5–15.3 | Omarchy light | Follows your desktop theme |
| 15.3–22.0 | the end card, performed | mark, ring, wordmark, address |

## Where the pictures come from

One **native GPUix window**, captured frame by frame, then cut into the six
sections by `src/edit-blocks.py` (slow push, rounded mask, no captions — the
captions are the composition's job):

```
nub run --filter playground build
nub apps/playground/dist/film/blocks.js capture /tmp/film/take-blocks 1100
python3 media/launch/src/edit-blocks.py      # b-clean.mp4 → assets/footage.mp4
```

`apps/playground/src/film/blocks.tsx` renders three of the site's blocks — file
manager, kanban, inbox — as real trees, with the block, the platform, the look,
the selected row and a drawn cursor all computed from the frame number. That is
why the same window restyles from macOS to Windows to Linux to Omarchy while the
content stays.

The film itself is `src/hyperframes/index.html`: one footage clip, kinetic
captions, the end card, and the audio bed with earshot's cues, rendered by

```
npx hyperframes render
```

Contract kept: every timed element is a `clip` with `data-start` and
`data-duration`, the root declares `data-duration="22"`, and one paused GSAP
timeline is registered as `window.__timelines.main`.

## Sound

[earshot](https://github.com/Leonxlnx/earshot)'s code-made bank: a sub hit on
the open, a flick whoosh on every platform change, a bright swish and glock on
the Omarchy flip, a swell and chime into the end card, over a 55 Hz triad bed.

`poster/launch.png` is the frame at 6.0 s.

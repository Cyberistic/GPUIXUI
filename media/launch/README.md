# Launch film

`gpuixui-launch.mp4`: 20.5 seconds, 1920×1080, 60 fps, H.264 + AAC. The library's
blocks running as one native GPUix window, with a cursor, four platform dresses
and the Omarchy look.

**Play:** open the file, or `ffplay -autoexit gpuixui-launch.mp4`.

## The cut

| Time | Shot | Caption |
| --- | --- | --- |
| 0.0–1.6 | logo | — |
| 1.6–4.1 | File manager, macOS | React, Tailwind, shadcn — and GPUI under it. |
| 4.1–6.6 | Kanban board, macOS | Blocks, with real state. |
| 6.6–9.1 | File manager, Windows 11 chrome | Windows 11. |
| 9.1–11.6 | Kanban board, Linux chrome | Linux. |
| 11.6–14.1 | File manager, Omarchy dark | Omarchy, dark. |
| 14.1–16.9 | Inbox, Omarchy light | Follows your theme. |
| 16.9–20.5 | end card | — |

## Where the pictures come from

One **native GPUix window**, captured frame by frame:

```
nub run --filter playground build
nub apps/playground/dist/film/blocks.js capture /tmp/film/take-blocks 1100
```

`apps/playground/src/film/blocks.tsx` renders three of the site's blocks — the
file manager, the kanban board and the inbox — as real trees. Every frame is a
pure function of its index:

- **the block and its platform** come from the frame number, so the window
  restyles itself from macOS to Windows to Linux to the Omarchy look while the
  content stays (`platformTheme`, `retroTheme`);
- **the selection** advances through the rows, so the UI is alive without a
  pointer;
- **the cursor** is drawn in the tree (an arrow path plus a press ring) because
  an offscreen capture has no OS pointer: waypoints are eased between, and three
  presses ripple at frames 70, 260, 460, 700 and 900.

`media/launch/src/edit-blocks.py` cuts the take into sections with a slow push,
the window's rounded mask and its caption; `mix.py` places the sound design.

## Sound

[earshot](https://github.com/Leonxlnx/earshot)'s code-made bank, no recordings:
a flick whoosh and a wood knock on every section, a soft click on every press,
a bright swish and a glock on the Omarchy flip, a swell and chime into the end
card, over a 55 Hz triad with a slow breath. The delivered file measures
−18.8 LUFS and −0.4 dBTP.

## Rebuild

```
python3 media/launch/src/edit-blocks.py     # b-picture.mp4, from the take
python3 media/launch/src/mix.py             # mix3.wav
ffmpeg -i b-picture.mp4 -i mix3.wav -c:v copy -c:a aac -b:a 192k -shortest \
  -movflags +faststart gpuixui-launch.mp4
```

`poster/launch.png` is the frame at 3.0 s.

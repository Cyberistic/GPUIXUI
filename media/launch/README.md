# Launch film

`gpuixui-launch.mp4`: 19.4 seconds, 1920×1080, 60 fps, H.264 + AAC. Three real
GPUix windows on a Mac wallpaper, cut fast, with a sound design made in code.

**Play:** open the file, or `ffplay -autoexit gpuixui-launch.mp4`.

## The cut

| Time | Shot | Caption |
| --- | --- | --- |
| 0.0–1.8 | logo, wordmark, tagline | — |
| 1.8–3.4 | Files, the whole window | files, now native. |
| 3.4–4.6 | Files, punched into the list | — |
| 4.6–6.0 | Tasks, the whole board | boards that hold state. |
| 6.0–7.2 | Tasks, punched into a column | — |
| 7.2–8.6 | Workspace, the command palette | command-k. |
| 8.6–9.8 | Workspace, punched into the results | — |
| 9.8–10.8 | `60` | fps, on the GPU |
| 10.8–13.2 | Files and Tasks again, tighter | — |
| 13.2–15.6 | all three at once | a whole library, one runtime. |
| 15.6–19.4 | end card | — |

## Where the pictures come from

The three windows are **real GPUix applications**, not drawings: `apps/playground/src/film/main.tsx`
mounts each one on the native renderer and writes a PNG per frame. The demos are
pure functions of the frame number, so the capture is frame-accurate and does
not depend on what else is on the screen.

```
nub run --filter playground build
nub apps/playground/dist/film/main.js files   capture /tmp/film/take-files   420
nub apps/playground/dist/film/main.js tasks   capture /tmp/film/take-tasks   420
nub apps/playground/dist/film/main.js palette capture /tmp/film/take-palette 420
```

`media/launch/src/edit.py` cuts the takes into shots: the wallpaper, the window
cropped to the shot's framing, scaled and rounded through an alpha mask, and the
caption. `mix.py` places the sound design, and `ffmpeg` muxes the two.

The sound design is [earshot](https://github.com/Leonxlnx/earshot)'s shipped
bank, made from recipes rather than recordings (`cut_hit/kick`, `cut_hit/punch`,
`swish/flick`, `knock/wood`, `mallet/glock`,
`notify/mid_tine`, `reverse_swell/short`), placed on every cut over a 45 Hz bed.

## Rebuild

```
python3 media/launch/src/edit.py          # picture.mp4, from the takes
python3 media/launch/src/mix.py           # mix2.wav
ffmpeg -i picture.mp4 -i mix2.wav -c:v copy -c:a aac -b:a 192k -shortest \
  -movflags +faststart gpuixui-launch.mp4
```

`poster/launch.png` is the frame at 3.0 s.

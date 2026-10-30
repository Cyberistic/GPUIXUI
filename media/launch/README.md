# Launch film

`gpuixui-launch.mp4`: 27 seconds, 1920×1080, 60 fps, H.264 + AAC. Black stage,
Apple-style typography, real screenshots of the shipped site, and a sound design
made in code.

**Play:** open the file, or `ffplay -autoexit gpuixui-launch.mp4`.

## The cut

| Time | What | Sound |
| --- | --- | --- |
| 0.0–3.4 | Logo, wordmark tracking in, "React. Rendered by the GPU." | sub hit, soft click, tick |
| 3.4–7.2 | Three lines: the React you know / a runtime you don't / every frame, drawn by the GPU | two UI pops, then a punch under the third line |
| 7.2–12.6 | Footage: Windows 7 rebuilt, the Obsidian note, 83 icons, the theme editor | a swish and a wood knock on every cut |
| 12.6–17.4 | `60` counting up, 60 ticks lighting, "0 canvas elements / 1 native window / GPU draws every frame", the shipped spinner's stepped arc | a tick run rising into a punch |
| 17.4–21.8 | "Sound." over a live waveform | sub, pop, three knocks, a zing |
| 21.8–27.2 | Composed blocks, then the end card | swell, glock, chime, a low rumble on the fade |

## How it is made

The film is a single HTML page whose `renderAt(t)` places every element from
its own timeline, with no CSS transitions. Playwright steps `t` frame by frame
at 60 fps and screenshots 1 080p PNGs, so the picture never drops a frame and the
same `t` always draws the same image. `ffmpeg` turns the frames into H.264.

The sound design is [earshot](https://github.com/Leonxlnx/earshot)'s shipped
bank, made from recipes rather than recordings (`earshot sfx render click/soft`,
`ui_pop/soft`, `swish/flick`, `cut_hit/punch`, `knock/wood`, `mallet/glock`,
`notify/mid_tine`, `reverse_swell/short`). `mix.py` places each take at its cue
with its own gain, adds a 45 Hz bed with the octaves above it, and prints a
24-bit master; `ffmpeg loudnorm` brings it to −17.6 LUFS with −1.4 dBTP of
headroom.

```
# 1. stills of the shipped site (needs apps/docs running)
node media/launch/src/stills.mjs

# 2. frames: 1 632 × 1 080p, ~9 minutes
node media/launch/src/render.mjs

# 3. sound: earshot renders + the mixer
earshot sfx render <id> -o audio/sfx/<name>.wav
python media/launch/src/mix.py

# 4. picture, then sound
ffmpeg -framerate 60 -i frames/%05d.png -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -movflags +faststart silent.mp4
ffmpeg -i silent.mp4 -i mix.wav -c:v copy -c:a aac -b:a 192k -shortest \
  -movflags +faststart gpuixui-launch.mp4
```

The screenshots are the site's own drawings: the Windows 7 Personalization
screen from `/themes`, the licence note from `/blocks/hunter-pipeline`, the icon
grid from `/icons/icon`, and the theme editor — no mock-up of a component the
library does not ship.

`poster/launch.png` is the frame at 7.6 s.

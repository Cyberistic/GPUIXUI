# `@gpuixui/media`

Image, upload, drop and clip-player surfaces rendered by GPUix through React — a
**preview** with a loading and an error state plus a pointer zoom, a **file
queue** with a pure state machine, a **drop zone** over the runtime's OS
file-drop path, and a **player** whose clock and transport are the app's because
the runtime has no playback element.

| Surface | What it owns | Runtime rule it honours |
| ------- | ------------ | ----------------------- |
| `ImagePreview` | loading/error/caption around the shipped `ImageZoom` | the `<img>` host has no `onLoad`/`onError`, so `status` is caller-driven and a blank `src` is the one error it detects itself |
| `DropZone` | `onFileDrop` → `{ files }`, a pointer highlight, a pick action | no drag preview and no drag-over event, so the highlight is the pointer wash and the pick is the guaranteed path |
| `FileUpload` | the queue and `upload/queue.ts`'s state machine | the transfer is the caller's `upload(file, onProgress)`; the package owns no network |
| `CropArea` | a controlled crop hole, its mask and its gestures | four veil bars are the only mask the runtime paints; each is pointer-transparent so the press reaches the frame |
| `QrCode` | the symbol, its quiet zone and the refusal of a value that does not fit | the encoder is the package's; the paint is one tinted `<svg>` mask, the route `qr-matrix` measured |
| `MediaPlayer` | the clip's frames, a progress track, a waveform and a transport with a seek pad | no `video`/`audio` host, so the caller supplies each frame's bytes and the player owns the clock; `setImagePixels` is the measured paint route |

## Why a package

A file queue owns a state machine (progress, retry, cancellation) and a drop
zone owns the OS file-drop path. Folding those into `@gpuixui/components` would
make every consumer of a badge pay for a transfer it never runs.

## Shape

```
src/
  image-preview.tsx   the frame, states and caption; composes ImageZoom
  drop-zone.tsx       the drop target and the pick action
  file-upload.tsx     the queue view and the upload wiring
  upload/queue.ts     the pure state machine (idle | uploading | done | error)
  crop-area.tsx       the frame, the veil bars and the four corner handles
  behaviour/          the crop gestures, the player transport and a picture's name, in the real GPUix renderer
  crop/logic.ts       the crop arithmetic (bounds, bars, drag, keyboard)
  qr-code.tsx         the symbol's frame, quiet zone and overflow state
  qr/encode.ts        the encoder (numeric, alphanumeric and byte mode, versions 1-10, Reed-Solomon)
  media-player.tsx    the frames, the waveform and the transport
  player/logic.ts     the player's arithmetic (playhead, clock, keys, waveform)
  internal.ts         the tw + tokens seam
examples/             one mountable screen per surface
docs/                 image-preview.mdx, drop-zone.mdx, file-upload.mdx,
                      crop-area.mdx, qr-code.mdx, media-player.mdx
```

## Commands

```sh
nub run --filter @gpuixui/media test          # queue + render-function suites
nub run --filter @gpuixui/media test:behaviour # the crop gestures, the player transport and the picture names, in the real renderer
nub run --filter @gpuixui/media check-types
```

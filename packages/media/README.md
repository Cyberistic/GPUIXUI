# `@gpuixui/media`

Image, upload and drop surfaces rendered by GPUix through React — a **preview**
with a loading and an error state plus a pointer zoom, a **file queue** with a
pure state machine, and a **drop zone** over the runtime's OS file-drop path.

| Surface | What it owns | Runtime rule it honours |
| ------- | ------------ | ----------------------- |
| `ImagePreview` | loading/error/caption around the shipped `ImageZoom` | the `<img>` host has no `onLoad`/`onError`, so `status` is caller-driven and a blank `src` is the one error it detects itself |
| `DropZone` | `onFileDrop` → `{ files }`, a pointer highlight, a pick action | no drag preview and no drag-over event, so the highlight is the pointer wash and the pick is the guaranteed path |
| `FileUpload` | the queue and `upload/queue.ts`'s state machine | the transfer is the caller's `upload(file, onProgress)`; the package owns no network |
| `QrCode` | the symbol, its quiet zone and the refusal of a value that does not fit | the encoder is the package's; the paint is one tinted `<svg>` mask, the route `qr-matrix` measured |

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
  qr-code.tsx         the symbol's frame, quiet zone and overflow state
  qr/encode.ts        the encoder (byte mode, versions 1-10, Reed-Solomon)
  internal.ts         the tw + tokens seam
examples/             one mountable screen per surface
docs/                 image-preview.mdx, drop-zone.mdx, file-upload.mdx, qr-code.mdx
```

## Commands

```sh
nub run --filter @gpuixui/media test          # queue + render-function suites
nub run --filter @gpuixui/media check-types
```

/**
 * `@gpuixui/media` — image, upload and drop surfaces rendered by GPUix through
 * React.
 *
 * The package is deliberately not part of `@gpuixui/components`: a file queue
 * owns a state machine (progress, retry, cancellation) and a drop zone owns the
 * OS file-drop path, and folding those into the component package would make
 * every consumer of a badge pay for a transfer it never runs.
 *
 * Shape:
 *
 * - `image-preview` — an `<img>` surface with a loading and an error state, a
 *   caption and the shipped `ImageZoom` composed in (never a second magnifier).
 * - `drop-zone` — a labelled target that reports `{ files }` from the runtime's
 *   `onFileDrop` and offers a pick action; the drag-over highlight is the
 *   pointer wash, because the host exposes no drag-enter/drag-over event.
 * - `file-upload` — a queue over `upload/queue.ts`, the pure state machine
 *   (`idle | uploading | done | error`) with a monotonic progress and a token
 *   that cancels a removed file.
 * - `qr-code` — a QR symbol painted from the package's own encoder
 *   (`qr/encode.ts`): byte mode, versions 1–10, every error correction level,
 *   one tinted `<svg>` mask with the quiet zone inside it.
 */

export {
  ImagePreview,
  renderImagePreview,
  type ImagePreviewProps,
  type ImagePreviewStatus,
} from "./image-preview.js";

export {
  DropZone,
  renderDropZone,
  dropEntries,
  type DropEntry,
  type DropPayload,
  type DropZoneProps,
  type DropZoneSurface,
} from "./drop-zone.js";

export {
  FileUpload,
  renderFileUpload,
  type FileUploadActions,
  type FileUploadProps,
  type UploadFunction,
} from "./file-upload.js";

export {
  complete,
  emptyQueue,
  enqueue,
  fail,
  findItem,
  remove,
  reportProgress,
  start,
  type UploadFile,
  type UploadItem,
  type UploadQueue,
  type UploadStatus,
} from "./upload/queue.js";

export {
  QrCode,
  renderQrCode,
  qrOverflowMessage,
  QR_INK,
  QR_PAPER,
  type QrCodeProps,
} from "./qr-code.js";

export {
  encodeQr,
  qrByteCapacity,
  qrModules,
  qrPlacement,
  qrSvgSource,
  qrVersionFor,
  QrEncoding,
  QrLevel,
  QrOverflow,
  QrSymbol,
  QR_LEVELS,
  QR_MAX_VERSION,
  QR_QUIET_ZONE,
  QR_VERSIONS,
  type QrEncodeOptions,
  type QrPlacement,
  type QrVersion,
} from "./qr/encode.js";

export { ThemeProvider, useTheme, type Theme } from "./internal.js";

/**
 * The media-package example registry: `id → example`, for the native playground.
 *
 * The docs site cannot render these live (they are GPUix host elements, not
 * DOM), so the docs pages carry the same source as a code block.
 */

import type { ComponentType } from "react";
import { DropZoneExample } from "./drop-zone.example.js";
import { FileUploadExample } from "./file-upload.example.js";
import { ImagePreviewExample } from "./image-preview.example.js";
import { QrCodeExample } from "./qr-code.example.js";

/** One mountable screen per surface. */
export const examples: Readonly<Record<string, ComponentType>> = {
  "image-preview": ImagePreviewExample,
  "qr-code": QrCodeExample,
  "drop-zone": DropZoneExample,
  "file-upload": FileUploadExample,
};

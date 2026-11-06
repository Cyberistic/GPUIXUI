import type { ComponentType } from "react";
import { CropAreaExample } from "./crop-area.example.js";
import { DropZoneExample } from "./drop-zone.example.js";
import { FileUploadExample } from "./file-upload.example.js";
import { ImagePreviewExample } from "./image-preview.example.js";
import { MediaPlayerExample } from "./media-player.example.js";
import { QrCodeExample } from "./qr-code.example.js";

export const examples: Readonly<Record<string, ComponentType>> = {
  "image-preview": ImagePreviewExample,
  "qr-code": QrCodeExample,
  "drop-zone": DropZoneExample,
  "crop-area": CropAreaExample,
  "file-upload": FileUploadExample,
  "media-player": MediaPlayerExample,
};

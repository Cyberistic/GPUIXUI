import { readFileSync } from "node:fs";

/**
 * Test helper: a PNG's real geometry, read from its IHDR.
 *
 * Both brand-asset suites need it, and the failure it guards is the one a path
 * check cannot see — a committed image whose pixels do not match the size the
 * head or the manifest declares (plan 510, plan 516). Test-only; the app never
 * imports it.
 */
export interface PngSize {
  readonly width: number;
  readonly height: number;
}

const signature = [0x89, 0x50, 0x4e, 0x47];

export const isPng = (path: string): boolean => {
  const bytes = readFileSync(path);
  return signature.every((byte, index) => bytes[index] === byte);
};

/** Signature (8), chunk length (4), type (4), then width (4) and height (4). */
export const pngSize = (path: string): PngSize => {
  const bytes = readFileSync(path);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

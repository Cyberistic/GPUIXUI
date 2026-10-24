/**
 * A stored text value, read at the boundary.
 *
 * A draft restored from storage, or read out of a saved record, writes `null`
 * where it carried no text, and the render paths read the value directly
 * (`.trim()`, `.length`, a key handler). Anything that is not a string carries
 * nothing. The text is **not** trimmed: the document's own spacing and newlines
 * are content.
 */
export const textOf = (value: unknown): string =>
  typeof value === "string" ? value : "";

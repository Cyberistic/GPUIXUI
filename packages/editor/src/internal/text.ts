/**
 * A stored text value, read at the boundary.
 *
 * A draft restored from storage, or read out of a saved record, writes `null`
 * where it carried no document, and the re-render paths read the text directly
 * (`.length`, `.trim()`, a tokenizer). Anything that is not a string carries
 * nothing. The text is **not** trimmed: leading spaces and newlines are the
 * document's own.
 */
export const draftOf = (value: unknown): string =>
  typeof value === "string" ? value : "";

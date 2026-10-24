/**
 * Stored text, read at the boundary.
 *
 * A draft or a name restored from storage writes `null` where it carried no
 * text, and the render paths read the value directly (`.length`, `.trim()`, a
 * tokenizer, `accessibleName`). Anything that is not a string carries nothing.
 */

import { accessibleName } from "@gpuixui/primitives/core";

/**
 * A stored document, read as text or nothing.
 *
 * The text is **not** trimmed: leading spaces and newlines are the document's
 * own.
 */
export const draftOf = (value: unknown): string =>
  typeof value === "string" ? value : "";

/**
 * The name a control publishes: a stored label as text, or its default.
 *
 * A label is copy from an i18n table or a saved panel as often as it is a
 * literal, and `accessibleName` trims the string it is handed — so a record that
 * kept a number or an object threw `self.trim is not a function` out of the
 * first paint. The label is read as text or nothing (the rule {@link draftOf}
 * takes for a stored document), then trimmed; a name that says nothing is the
 * component's documented default.
 */
export const labelOf = (label: unknown, fallback: string): string =>
  accessibleName(draftOf(label)) ?? fallback;

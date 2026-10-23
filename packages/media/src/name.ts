/**
 * The name a media surface publishes.
 *
 * A label is copy from an i18n table or a saved record as often as it is a
 * literal, so an empty or whitespace-only string is an **absence**, not a name.
 * A component that published one would reach assistive technology unnamed while
 * every documented default sat unused beside it.
 */

import * as Str from "effect/String";

/** A blank label reads as `fallback`; any other reads trimmed. */
export const accessibleName = (label: unknown, fallback: string): string => {
  const text = typeof label === "string" ? Str.trim(label) : "";
  return Str.isEmpty(text) ? fallback : text;
};

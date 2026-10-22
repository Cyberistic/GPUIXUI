/**
 * The editing decisions a code editor makes, apart from painting.
 *
 * These are pure so they are provable without a rendering runtime: what the Tab
 * key means under each `tabMode`, and the indentation a new line inherits from
 * the line above it. The component wires them into the `<textarea>`'s key
 * handlers; the runtime owns the caret, the selection, the IME and the paste.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** What Tab does while the editor holds focus. */
export type TabMode = "insert" | "focus";

/**
 * Whether a Tab press inserts indentation rather than moving focus.
 *
 * `"focus"` keeps the platform's own Tab traversal; `"insert"` swallows the
 * traversal and inserts the editor's indent string instead.
 */
export const tabInserts = (mode: TabMode): boolean => mode === "insert";

/**
 * The leading whitespace of a line — the indentation a new line after it keeps.
 *
 * Space and tab are the indentation characters an editor writes; a line with no
 * leading whitespace indents nothing.
 */
export const leadingIndent = (line: string): string =>
  Arr.join(
    Arr.takeWhile(Str.split(line, ""), (c) => c === " " || c === "\t"),
    "",
  );

/**
 * The indentation a new line keeps after Enter at the end of the value: the
 * leading whitespace of the value's last line, or nothing for an empty value.
 */
export const enterIndent = (value: string): string =>
  Option.match(Arr.last(Str.split(/\r\n?|\n/)(value)), {
    onNone: () => "",
    onSome: leadingIndent,
  });

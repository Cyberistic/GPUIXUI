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
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/** The two things Tab can do while the editor holds focus. */
export const TAB_MODES = ["insert", "focus"] as const;

/** The two things Tab can do while the editor holds focus. */
export const TabModes = Schema.Literals(TAB_MODES);
/** The two things Tab can do while the editor holds focus. */
export type TabMode = typeof TabModes.Type;

/** Whether a stored value names a Tab mode this editor paints. */
export const isTabMode = Schema.is(TabModes);

/**
 * The Tab mode a stored value names, or the documented default.
 *
 * A tab mode is a saved preference as often as a literal, so the value reaching
 * the component may be a name this release no longer declares. Comparing it raw
 * read such a name as not-insert and sent Tab out of the field, while the prop
 * documents `"insert"` — so the mode is read once here and the keyboard
 * decision, its JSDoc and its page all answer the same name.
 */
export const tabModeOf = (value: unknown): TabMode =>
  isTabMode(value) ? value : "insert";

/** The indentation a Tab inserts when the caller names none. */
export const TAB_INDENT = "  ";

/**
 * The indentation a Tab inserts: the caller's string, or the default.
 *
 * An indent restored from a preference arrives untyped, so a value that is not
 * a string reads as {@link TAB_INDENT} rather than being concatenated into the
 * document (`value + null` would insert `"null"`).
 */
export const tabIndent = (indent: unknown): string =>
  typeof indent === "string" ? indent : TAB_INDENT;

/**
 * Whether a Tab press inserts indentation rather than moving focus.
 *
 * `"focus"` keeps the platform's own Tab traversal; `"insert"` swallows the
 * traversal and inserts the editor's indent string instead. An empty indent
 * inserts nothing, so Tab keeps the traversal — a key that does nothing must
 * not trap a keyboard reader in the field.
 */
export const tabInserts = (
  mode: TabMode,
  indent: string = TAB_INDENT,
): boolean => mode === "insert" && indent.length > 0;

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
 * The rows the highlight layer paints: every line the field shows, and at least
 * the caller's `minRows` floor.
 *
 * The layer is the only thing that sizes the editor — the field is positioned
 * absolutely over it — so a floor is painted as empty rows; a floor that cannot
 * be read adds none rather than collapsing the box.
 */
export const visibleRows = (documentRows: number, minRows?: number): number =>
  Math.max(
    Number.isFinite(documentRows) ? Math.max(1, Math.floor(documentRows)) : 1,
    minRows !== undefined && Number.isFinite(minRows)
      ? Math.max(0, Math.floor(minRows))
      : 0,
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

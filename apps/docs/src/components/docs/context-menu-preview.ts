/**
 * The context menu preview's placement, focus and type-ahead model.
 *
 * A right-click menu is mostly invisible state: where the surface lands, which
 * gesture opened it, and where focus goes when it closes. A drawing shows the
 * first frame only, so those rules live here as pure functions and
 * `context-menu-preview.test.ts` reads `context-menu.tsx` and the shared
 * type-ahead module to keep this file from becoming a second source of truth.
 *
 * Points are window coordinates, as the native component records them; the
 * browser preview translates its own pointer into the frame it draws in.
 */

/** A point in window coordinates. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A measured element box, as the runtime reports it. */
export interface Box extends Point {
  readonly width: number;
  readonly height: number;
}

/** Which gesture opened the surface. */
export type OpenSource = "pointer" | "keyboard";

/** Why a menu closed, which decides where focus goes afterwards. */
export type CloseReason = "activate" | "dismiss" | "leave" | "outside";

/**
 * The point `Shift+F10` opens at: the trigger's bottom-left corner.
 *
 * The keyboard route has no pointer, so the menu opens where a menu belongs —
 * under the element the reader is on — rather than at a remembered click.
 */
export const keyboardAnchor = (bounds: Box): Point => ({
  x: bounds.x,
  y: bounds.y + bounds.height,
});

/**
 * The point an aux click records.
 *
 * The payload's coordinates are optional at the type level, and the component
 * falls back to the origin rather than refusing to open, so a click the runtime
 * reports without a point still opens a menu (at the wrong place, which the
 * component's own behaviour makes visible).
 */
export const pointerAnchor = (payload: {
  readonly x?: number | null;
  readonly y?: number | null;
}): Point => ({ x: payload.x ?? 0, y: payload.y ?? 0 });

/** What one press does to the surface. */
export type PressAction = "ignore" | "open" | "close";

/**
 * Apply one press to the menu, from the trigger's point of view.
 *
 * A primary press is not the trigger's business. A right press **on** the
 * trigger closes whatever surface was open and opens a new one at the new
 * point, because opening always sets the point first. A right press outside the
 * trigger belongs to the dismiss layer: it closes an open menu and can never
 * open another, because the trigger is the only element listening for the aux
 * click.
 */
export const rightPress = (press: {
  readonly isRightClick: boolean;
  readonly onTrigger: boolean;
  readonly open: boolean;
}): PressAction => {
  if (!press.isRightClick) return "ignore";
  if (press.onTrigger) return "open";
  return press.open ? "close" : "ignore";
};

/**
 * Whether closing returns focus to the trigger.
 *
 * Only a keyboard-opened menu records a restore target, and only `activate` and
 * `dismiss` use it: `Tab` is the reader leaving, and an outside press puts
 * focus wherever the reader pressed. A pointer-opened menu therefore closes
 * with the native focus `none`, which a real window measured
 * (`context-menu-lifecycle`).
 */
export const restoresFocus = (
  source: OpenSource,
  reason: CloseReason,
): boolean =>
  source === "keyboard" && (reason === "activate" || reason === "dismiss");

/** Where focus is after a close, in the words the preview prints. */
export const focusAfterClose = (
  source: OpenSource,
  reason: CloseReason,
): "trigger" | "none" => (restoresFocus(source, reason) ? "trigger" : "none");

/** How long a typed prefix stays alive, in milliseconds. */
export const TYPEAHEAD_WINDOW_MS = 500;

/** The typed prefix and when its last keystroke arrived (milliseconds). */
export interface TypedBuffer {
  readonly text: string;
  readonly at: number;
}

/** Nothing typed. */
export const idleTyped: TypedBuffer = { text: "", at: 0 };

/**
 * Add one character to the buffer.
 *
 * A keystroke after the window starts a fresh prefix. Repeating the buffer's
 * only letter keeps it as it is, so the match advances to the next row that
 * starts with that letter — the desktop convention. Matching is
 * case-insensitive, so the buffer is stored lower-cased.
 */
export const typed = (
  buffer: TypedBuffer,
  char: string,
  now: number,
): TypedBuffer => {
  const letter = char.toLowerCase();
  if (buffer.text === "" || now - buffer.at > TYPEAHEAD_WINDOW_MS) {
    return { text: letter, at: now };
  }
  const repeating = [...buffer.text].every((seen) => seen === letter);
  return repeating
    ? { text: buffer.text, at: now }
    : { text: `${buffer.text}${letter}`, at: now };
};

/** Anything type-ahead can search: a label and whether it accepts input. */
export interface TypedRow {
  readonly label: string;
  readonly disabled?: boolean;
}

const normalise = (value: string): string => value.trim().toLowerCase();

/**
 * The row a typed prefix selects: the first **enabled** row after `from` whose
 * label starts with `prefix`, wrapping to the first match; `undefined` when
 * nothing matches or the prefix is empty.
 *
 * "After the current row" is what makes a repeated letter advance instead of
 * staying on the first match.
 */
export const typedMatch = (
  rows: ReadonlyArray<TypedRow>,
  from: number | undefined,
  prefix: string,
): number | undefined => {
  const needle = normalise(prefix);
  if (needle === "") return undefined;

  const candidates = rows.flatMap((row, index) => {
    const label = normalise(row.label);
    return row.disabled === true || label === "" || !label.startsWith(needle)
      ? []
      : [index];
  });
  const after = candidates.find((index) => index > (from ?? -1));

  return after ?? candidates[0];
};

/** The buffer and match after one typed character. */
export interface TypeaheadStep {
  readonly buffer: TypedBuffer;
  /** The row the highlight moves to, or `undefined` when nothing matched. */
  readonly index?: number;
}

/**
 * One typed character: extend the prefix and jump to its row.
 *
 * A miss clears the buffer rather than poisoning later keystrokes with a prefix
 * that can never match — the rule the shared hook applies.
 */
export const typeChar = (
  rows: ReadonlyArray<TypedRow>,
  from: number | undefined,
  buffer: TypedBuffer,
  char: string,
  now: number,
): TypeaheadStep => {
  const next = typed(buffer, char, now);
  const index = typedMatch(rows, from, next.text);
  return index === undefined ? { buffer: idleTyped } : { buffer: next, index };
};

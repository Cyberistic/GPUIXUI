/**
 * The `text-undo-lifecycle` probe's fixture: what a field's own undo does to a
 * controlled component's value.
 *
 * MISSION lists **input editing** among the interactions a real runtime has to
 * verify, and editing means more than typing: the pinned binding's field holds
 * an undo and a redo (`cmd-z` / `shift-cmd-z`, coalescing edits made within
 * `UNDO_COALESCE` into one step) and restores a snapshot through the same
 * `change` event a keystroke uses. Nothing in this repository had driven it, so
 * three questions a consumer asks were open:
 *
 * 1. **Does undo reach a controlled component?** The field restores its text
 *    natively; unless the app is told, its state and the paint disagree.
 * 2. **What clears the history?** A value pushed in from outside the field
 *    (`setValue` from a surrounding action) is not an edit, and the binding
 *    clears both stacks for it — so a field the app rewrites on every change
 *    loses undo silently.
 * 3. **Who owns the chord?** `cmd-z` while the field has focus must stay in the
 *    field, exactly as `cmd-a`/`cmd-c`/`cmd-x` do, or the window's own undo runs
 *    as well.
 *
 * The ids, the typed words, the chords and the readout live here so the view,
 * the checks, the README and the unit test read one source. Native-free, as
 * every fixture is.
 */

/** The `testId`s the view and the steps share. */
export const TEXT_UNDO_IDS = {
  probe: "text-undo-probe",
  field: "text-undo-field",
  area: "text-undo-area",
  rerender: "text-undo-rerender",
  load: "text-undo-load",
  control: "text-undo-control",
  readout: "text-undo-readout",
  areaReadout: "text-undo-area-readout",
  keys: "text-undo-keys",
} as const;

/** The text every step types or pushes in, so a check reads words not counts. */
export const TEXT_UNDO_TEXT = {
  typed: "a",
  later: "b",
  loaded: "loaded",
  areaTyped: "x",
} as const;

/**
 * The chords the probe drives.
 *
 * All three are the binding's own: `cmd-z` undoes, `shift-cmd-z` redoes, and
 * `cmd-k` is the positive control that proves the window handler is registered
 * (a chord no field binds must arrive there).
 */
export const TEXT_UNDO_KEYS = {
  undo: "cmd-z",
  redo: "shift-cmd-z",
  control: "cmd-k",
} as const;

/**
 * What the single-line field's readout prints: the controlled value, its edits
 * and the surrounding re-renders.
 *
 * `renders` is the app's own state, not the field's: a probe presses a control
 * that re-renders the page and reads this count back, so "a re-render kept the
 * history" is a claim about a render that really happened.
 */
export const textUndoReadout = (
  value: string,
  changes: number,
  renders: number,
): string => `input=${value} changes=${changes} renders=${renders}`;

/** What the text area's readout prints, kept apart from the field's. */
export const textUndoAreaReadout = (value: string, changes: number): string =>
  `area=${value} changes=${changes}`;

/** The chords that reached the app-level window handler, in arrival order. */
export const textUndoKeyLog = (keys: ReadonlyArray<string>): string =>
  `keys=${keys.join(",")}`;

/**
 * How many checks the probe asserts.
 *
 * Every step above is one paint of the readout; the count is the floor a
 * planted assertion is held to by `text-undo.test.ts`.
 */
export const TEXT_UNDO_CHECKS = 15;

/**
 * How long the probe waits between two edits it wants in separate undo steps.
 *
 * The binding coalesces consecutive inserts made within `UNDO_COALESCE` (700 ms)
 * into one snapshot, so a pause longer than that is what makes the second edit
 * its own step. The probe copies one key at a time for the same reason.
 */
export const TEXT_UNDO_GROUP_MS = 900;

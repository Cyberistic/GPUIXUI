/**
 * The `inline-edit-lifecycle` fixture: the shipped `InlineEdit`, the page it is
 * measured on, and the readout the probe prints.
 *
 * An inline edit's state is a **swap**: a painted value becomes a real `<input>`
 * and back. The package's behaviour suite drives that swap through the offscreen
 * renderer, where `focusElement` is synchronous and every handler a component
 * passes is called. A window is the only place that says the focus really
 * follows the replaced element — the component moves it with the renderer's
 * `focusElement` after the swap, because focus does not follow a new element —
 * and that the committed value is what the window paints afterwards.
 *
 * The probe mounts no parts of its own: every measurement is the shipped
 * component's, addressed by the `testId` it is handed.
 */

/** The `testId`s the view, the steps and the unit suite share. */
export const INLINE_EDIT_IDS = {
  probe: "inline-edit-probe",
  field: "inline-edit-field",
  readout: "inline-edit-readout",
  disabled: "inline-edit-disabled",
  disabledReadout: "inline-edit-disabled-readout",
  empty: "inline-edit-empty",
  emptyReadout: "inline-edit-empty-readout",
} as const;

/** The value the caller starts with. */
export const INLINE_EDIT_VALUE = "Untitled workspace";

/** What the empty control paints instead of a value. */
export const INLINE_EDIT_PLACEHOLDER = "Name this project";

/**
 * The words on the probe's caption.
 *
 * The same sentence the README section leads with, so a reader of the window
 * and a reader of the page are told the same thing.
 */
export const INLINE_EDIT_CAPTION =
  "The shipped InlineEdit: Enter or a press swaps the painted value for an input, the window focuses the input, Enter commits once and returns the focus, and Escape discards the draft.";

/** What one control's caller has seen: its value and the events it reported. */
export interface InlineEditMarks {
  readonly value: string;
  /** The last draft `onChange` reported; a window cannot read an input's value. */
  readonly draft: string;
  readonly commits: number;
  /** How many edit sessions the control opened. */
  readonly edits: number;
  /** The edit state the caller was told about, which a swap must report. */
  readonly editing: boolean;
}

/**
 * One control's line.
 *
 * The `editing` counter is what makes a swap measurable from a readout: a
 * component that stayed in the display state would report no edit at all, and a
 * commit with no edit before it is a value the window never let a reader change.
 * The draft is the caller's own `onChange` channel: a window's painted text of an
 * `<input>` is empty, so the draft a key reaches is read where a consumer reads
 * it, and a draft that outlives Escape shows up here.
 */
export const inlineEditReadout = ({
  value,
  draft,
  commits,
  edits,
  editing,
}: InlineEditMarks): string =>
  `value=${value} commits=${commits} edits=${edits} draft=${draft} editing=${editing}`;

/**
 * How many checks the probe asserts.
 *
 * The README section prints this figure, and `inline-edit.test.ts` derives it
 * from the steps' own direct assertions plus one per `capture`/`readout` call,
 * so a check added without its count fails the suite.
 */
export const INLINE_EDIT_CHECKS = 22;

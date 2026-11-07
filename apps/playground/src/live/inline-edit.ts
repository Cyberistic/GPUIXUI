export const INLINE_EDIT_IDS = {
  probe: "inline-edit-probe",
  field: "inline-edit-field",
  readout: "inline-edit-readout",
  disabled: "inline-edit-disabled",
  disabledReadout: "inline-edit-disabled-readout",
  empty: "inline-edit-empty",
  emptyReadout: "inline-edit-empty-readout",
} as const;

export const INLINE_EDIT_VALUE = "Untitled workspace";

export const INLINE_EDIT_PLACEHOLDER = "Name this project";

export const INLINE_EDIT_CAPTION =
  "The shipped InlineEdit: Enter or a press swaps the painted value for an input, the window focuses the input, Enter commits once and returns the focus, and Escape discards the draft.";

export interface InlineEditMarks {
  readonly value: string;

  readonly draft: string;
  readonly commits: number;

  readonly edits: number;

  readonly editing: boolean;
}

export const inlineEditReadout = ({
  value,
  draft,
  commits,
  edits,
  editing,
}: InlineEditMarks): string =>
  `value=${value} commits=${commits} edits=${edits} draft=${draft} editing=${editing}`;

export const INLINE_EDIT_CHECKS = 22;

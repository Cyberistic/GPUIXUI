export const BLUR_IDS = {
  probe: "blur-probe",
  readout: "blur-readout",
  fieldA: "blur-field-a",
  fieldB: "blur-field-b",
  fieldC: "blur-field-c",
  target: "blur-target",
  plain: "blur-plain",
  toggle: "blur-toggle",
  edit: "blur-edit",
  after: "blur-after",
} as const;

export const TRACE_PREFIX = "trace=";

export const TRACE_EMPTY = "none";

export const traceOf = (entries: ReadonlyArray<string>): string =>
  `${TRACE_PREFIX}${entries.length === 0 ? TRACE_EMPTY : entries.join(" ")}`;

export const BLUR_CAPTION =
  "A window's focus events: two fields, a button, a plain surface and an edit. The readout prints every focus and blur the window delivered, in order — and a window whose app never activates delivers none.";

export const BLUR_CHECKS = 10;

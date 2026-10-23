/**
 * The `blur-delivery-lifecycle` probe's fixture: which routes a window delivers
 * the runtime's `onBlur` through, and in what order relative to a press.
 *
 * `focus-delivery` measured the opposite direction — a window's `Tab` traversal
 * moves the focus without running React's `onFocus` — and the components are
 * built on the answer: `InlineEdit` commits a draft on blur, a field's help and
 * validation read the focus pair, and a surface that follows the focus closes
 * when it leaves. The offscreen renderer fires every handler a component passes,
 * so no unit or behaviour suite can tell a route that arrives from one that
 * never does; only a window can.
 *
 * The fixture records every focus event in the order the window delivers it, so
 * one readout answers both questions a consumer has: **does the route deliver
 * `onBlur` at all**, and **does the blur land before the press handler** — the
 * order a form that submits on a press depends on when its draft commits on
 * blur.
 *
 * Native-free, as every fixture is: the view, the steps, the README and the
 * unit test read one source.
 */

/** The `testId`s the view and the steps share. */
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

/** The prefix every readout line carries, so a trace cannot read as a value. */
export const TRACE_PREFIX = "trace=";

/** What an empty trace prints; a missing readout and an empty one stay apart. */
export const TRACE_EMPTY = "none";

/** The one readout line: every event the window delivered, in its order. */
export const traceOf = (entries: ReadonlyArray<string>): string =>
  `${TRACE_PREFIX}${entries.length === 0 ? TRACE_EMPTY : entries.join(" ")}`;

/** The words on the probe's caption. */
export const BLUR_CAPTION =
  "A window's focus events: two fields, a button, a plain surface and an edit. The readout prints every focus and blur the window delivered, in order — and a window whose app never activates delivers none.";

/**
 * How many checks the probe asserts: the window's activation, the two field
 * presses, the traversal, the plain press, the programmatic blur, the edit's
 * press, the delivered trace and the focus it is left with.
 */
export const BLUR_CHECKS = 10;

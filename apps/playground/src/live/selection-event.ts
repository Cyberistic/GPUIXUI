/**
 * The app's record of the window's selection events, and the terms the checks
 * read it in.
 *
 * The runtime has no clipboard write and no selection API a component can call,
 * so the event is the only way a toolbar, an inspector or a command palette
 * learns that the reader picked a run of text. The probe's readout is the
 * evidence: one line per event, with the joined run the payload carried (or
 * `none` when the selection became empty). The arithmetic lives here so
 * `selection-event.test.ts` can hold the numbers and the wording the window's
 * checks depend on.
 *
 * The runtime reports the empty case by omitting `value`, so the boundary
 * converts with `Option.fromNullishOr` and the app never stores `undefined`.
 */
import * as Option from "effect/Option";

/** The selectable line a pointer drag selects. */
export const SELECTION_EVENT_LINE =
  "The window publishes the run a reader selects.";

/** The words the drag reaches: a selection starts mid-line and runs to the end. */
export const SELECTION_EVENT_TAIL = "selects.";

/** The non-selectable line beside it: a drag over it must publish nothing. */
export const SELECTION_EVENT_CHROME = "This chrome line is not selectable.";

/** The control the probe reads its record from. */
export const SELECTION_EVENT_READOUT = "window-selection-readout";

/** What the app has seen: how many changes, and the last run one carried. */
export interface SelectionLog {
  readonly fires: number;
  readonly last: Option.Option<string>;
}

/** The record before the window has reported anything. */
export const initialSelectionLog: SelectionLog = {
  fires: 0,
  last: Option.none(),
};

/**
 * Adds one window event to the record.
 *
 * An empty selection arrives with no `value`, and it still counts: a reader who
 * clears a selection is a change the app has to act on, not a missing event.
 */
export const recordSelection = (
  log: SelectionLog,
  value: string | undefined,
): SelectionLog => ({
  fires: log.fires + 1,
  last: Option.fromNullishOr(value),
});

/** The `fires=N last=…` line the probe paints. */
export const selectionReadout = (log: SelectionLog): string =>
  `fires=${log.fires} last=${Option.getOrElse(log.last, () => "none")}`;

/** The count a painted readout carries, or `None` when it is not one. */
export const firesOf = (readout: string): Option.Option<number> =>
  Option.flatMap(
    Option.fromNullishOr(/^fires=(\d+) last=/.exec(readout)),
    (match) =>
      Option.map(Option.fromNullishOr(match[1]), (digits) =>
        Number.parseInt(digits, 10),
      ),
  );

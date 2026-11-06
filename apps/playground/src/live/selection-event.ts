import * as Option from "effect/Option";

export const SELECTION_EVENT_LINE =
  "The window publishes the run a reader selects.";

export const SELECTION_EVENT_TAIL = "selects.";

export const SELECTION_EVENT_CHROME = "This chrome line is not selectable.";

export const SELECTION_EVENT_READOUT = "window-selection-readout";

export interface SelectionLog {
  readonly fires: number;
  readonly last: Option.Option<string>;
}

export const initialSelectionLog: SelectionLog = {
  fires: 0,
  last: Option.none(),
};

export const recordSelection = (
  log: SelectionLog,
  value: string | undefined,
): SelectionLog => ({
  fires: log.fires + 1,
  last: Option.fromNullishOr(value),
});

export const selectionReadout = (log: SelectionLog): string =>
  `fires=${log.fires} last=${Option.getOrElse(log.last, () => "none")}`;

export const firesOf = (readout: string): Option.Option<number> =>
  Option.flatMap(
    Option.fromNullishOr(/^fires=(\d+) last=/.exec(readout)),
    (match) =>
      Option.map(Option.fromNullishOr(match[1]), (digits) =>
        Number.parseInt(digits, 10),
      ),
  );

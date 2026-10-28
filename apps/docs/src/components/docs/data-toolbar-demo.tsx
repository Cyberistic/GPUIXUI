import {
  DEFAULT_SEARCH_DEBOUNCE_MS,
  DEFAULT_SEARCH_LABEL,
} from "@gpuixui/data";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { useEffect, useMemo, useState } from "react";

/**
 * Browser preview for the Data toolbars page.
 *
 * `@gpuixui/data`'s `DataToolbar` is a GPUix host row, so the package page
 * cannot mount it and this drawing is a labelled approximation. What it does
 * not approximate is the row's contract: the toolbar **owns no query**, it
 * reports a **debounced** value, and the wait is the package's — a
 * `debounceMs` the timer cannot read (`NaN`, an infinity, a negative) is
 * `DEFAULT_SEARCH_DEBOUNCE_MS`, and a blank `label` is `DEFAULT_SEARCH_LABEL`.
 * The two constants are imported from the package, so the drawing cannot teach
 * a default the field does not ship.
 */

/** One width the wait can take, named for the reader. */
export interface WaitChoice {
  readonly id: string;
  readonly label: string;
  readonly wait: number;
}

const DEFAULT_WAIT: WaitChoice = {
  id: "default",
  label: `${DEFAULT_SEARCH_DEBOUNCE_MS} ms (default)`,
  wait: DEFAULT_SEARCH_DEBOUNCE_MS,
};

/** The waits the drawing offers: the default, the caller's zero, and a NaN. */
export const WAITS: ReadonlyArray<WaitChoice> = [
  DEFAULT_WAIT,
  { id: "immediate", label: "0 ms", wait: 0 },
  { id: "unusable", label: "NaN", wait: Number.NaN },
];

/**
 * The wait the field schedules, mirroring `toolbar.tsx`'s own guard.
 *
 * A wait is often computed — a per-surface policy, a stored setting — and the
 * timer reads `NaN` and the infinities as immediate, so the debounce would
 * exist only on paper. Any value that is not a finite, non-negative number is
 * the documented default; **zero** is the caller's immediate reporting.
 */
export const searchWait = (
  debounceMs: number = DEFAULT_SEARCH_DEBOUNCE_MS,
): number =>
  Number.isFinite(debounceMs) && debounceMs >= 0
    ? debounceMs
    : DEFAULT_SEARCH_DEBOUNCE_MS;

/** The field's accessible name, mirroring the package's blank-name rule. */
export const searchLabel = (label: string): string => {
  const trimmed = Str.trim(label);
  return Str.isNonEmpty(trimmed) ? trimmed : DEFAULT_SEARCH_LABEL;
};

/** A reporter a caller can hand a keystroke to. */
export interface SearchReporter {
  /** Queue a value; only the last one within the wait is reported. */
  readonly type: (next: string) => void;
  /** Drop a pending value, so an unmounted toolbar reports nothing. */
  readonly cancel: () => void;
}

/**
 * The field's debounce, as a value a test can drive.
 *
 * The shipped field runs `@tanstack/pacer`'s debouncer; the drawing owns the
 * same three rules with a timer — one report per pause, the last value wins,
 * and a cancelled field reports nothing — because a browser preview has no
 * native toolbar to hand the wait to.
 */
export const createSearchReporter = (
  report: (next: string) => void,
  wait: number,
): SearchReporter => {
  let pending: ReturnType<typeof setTimeout> | undefined;

  const cancel = (): void => {
    if (pending !== undefined) clearTimeout(pending);
    pending = undefined;
  };

  return {
    type: (next) => {
      cancel();
      if (wait <= 0) {
        report(next);
        return;
      }
      pending = setTimeout(() => {
        pending = undefined;
        report(next);
      }, wait);
    },
    cancel,
  };
};

/** One record the toolbar's row list paints. */
export interface QueueRow {
  readonly id: string;
  readonly service: string;
  readonly environment: string;
  readonly state: string;
}

/** The records the drawing opens on: a deploy queue's last six runs. */
export const QUEUE_ROWS: ReadonlyArray<QueueRow> = [
  { id: "r1", service: "reports", environment: "production", state: "queued" },
  { id: "r2", service: "search", environment: "staging", state: "running" },
  { id: "r3", service: "media", environment: "production", state: "done" },
  { id: "r4", service: "gateway", environment: "staging", state: "queued" },
  { id: "r5", service: "billing", environment: "production", state: "done" },
  { id: "r6", service: "identity", environment: "staging", state: "running" },
];

/** The cells a query is matched against. */
const fieldsOf = (row: QueueRow): string =>
  `${row.service} ${row.environment} ${row.state}`;

/** The records a query keeps; an empty query keeps every row. */
export const matchingRows = (query: string): ReadonlyArray<QueueRow> => {
  const needle = Str.toLowerCase(Str.trim(query));
  return Str.isNonEmpty(needle)
    ? Arr.filter(QUEUE_ROWS, (row) =>
        Str.includes(needle)(Str.toLowerCase(fieldsOf(row))),
      )
    : QUEUE_ROWS;
};

/** The page's preview: a toolbar whose reported query filters its own rows. */
export function DataToolbarDemo() {
  const [typed, setTyped] = useState("");
  const [reported, setReported] = useState("");
  const [choice, setChoice] = useState<WaitChoice>(DEFAULT_WAIT);
  const wait = searchWait(choice.wait);
  const reporter = useMemo(
    () => createSearchReporter(setReported, wait),
    [wait],
  );
  const rows = matchingRows(reported);

  useEffect(() => () => reporter.cancel(), [reporter]);

  const type = (next: string): void => {
    setTyped(next);
    reporter.type(next);
  };

  const reset = (): void => {
    reporter.cancel();
    setTyped("");
    setReported("");
  };

  return (
    <div className="gx-demo-frame">
      <div aria-label="Deploy queue" className="gx-toolbar" role="toolbar">
        <input
          aria-label={searchLabel("")}
          className="gx-field gx-toolbar-search"
          onChange={(event) => type(event.target.value)}
          placeholder="Filter services…"
          type="search"
          value={typed}
        />
        <button
          className="gx-btn gx-btn-sm gx-btn-secondary"
          onClick={reset}
          type="button"
        >
          Reset
        </button>
      </div>
      <ul aria-label="Matching records" className="gx-toolbar-rows">
        {rows.map((row) => (
          <li className="gx-toolbar-row" key={row.id}>
            <span className="gx-toolbar-service">{row.service}</span>
            <span className="gx-toolbar-meta">{row.environment}</span>
            <span className="gx-toolbar-state" data-state={row.state}>
              {row.state}
            </span>
          </li>
        ))}
      </ul>
      <div aria-label="Debounce" className="gx-demo-choices" role="group">
        {WAITS.map((candidate) => (
          <button
            aria-pressed={candidate.id === choice.id}
            className="gx-demo-choice"
            key={candidate.id}
            onClick={() => setChoice(candidate)}
            type="button"
          >
            {candidate.label}
          </button>
        ))}
      </div>
      <p className="gx-demo-readout">
        typed “{typed}” · reported “{reported}” · {rows.length} of{" "}
        {QUEUE_ROWS.length} rows · wait {wait} ms
      </p>
    </div>
  );
}

export const dataToolbarDemoSource = `import { DataToolbar } from "@gpuixui/data";
import { Button } from "@gpuixui/primitives";
import { useState } from "react";

const [query, setQuery] = useState("");

// The toolbar owns no state: \`onValueChange\` receives the query once the
// debounce ends (150 ms by default), and a \`debounceMs\` the timer cannot read
// (NaN, an infinity, a negative) is that default. The caller does the filtering.
<DataToolbar
  search={{
    value: query,
    label: "Filter services",
    onValueChange: setQuery,
  }}
>
  <Button size="sm" variant="secondary" onActivate={() => setQuery("")}>
    Reset
  </Button>
</DataToolbar>;`;

import {
  DEFAULT_SEARCH_DEBOUNCE_MS,
  DEFAULT_SEARCH_LABEL,
} from "@gpuixui/data";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { useEffect, useMemo, useState } from "react";

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

export const WAITS: ReadonlyArray<WaitChoice> = [
  DEFAULT_WAIT,
  { id: "immediate", label: "0 ms", wait: 0 },
  { id: "unusable", label: "NaN", wait: Number.NaN },
];

export const searchWait = (
  debounceMs: number = DEFAULT_SEARCH_DEBOUNCE_MS,
): number =>
  Number.isFinite(debounceMs) && debounceMs >= 0
    ? debounceMs
    : DEFAULT_SEARCH_DEBOUNCE_MS;

export const searchLabel = (label: string): string => {
  const trimmed = Str.trim(label);
  return Str.isNonEmpty(trimmed) ? trimmed : DEFAULT_SEARCH_LABEL;
};

export interface SearchReporter {
  readonly type: (next: string) => void;

  readonly cancel: () => void;
}

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

export interface QueueRow {
  readonly id: string;
  readonly service: string;
  readonly environment: string;
  readonly state: string;
}

export const QUEUE_ROWS: ReadonlyArray<QueueRow> = [
  { id: "r1", service: "reports", environment: "production", state: "queued" },
  { id: "r2", service: "search", environment: "staging", state: "running" },
  { id: "r3", service: "media", environment: "production", state: "done" },
  { id: "r4", service: "gateway", environment: "staging", state: "queued" },
  { id: "r5", service: "billing", environment: "production", state: "done" },
  { id: "r6", service: "identity", environment: "staging", state: "running" },
];

const fieldsOf = (row: QueueRow): string =>
  `${row.service} ${row.environment} ${row.state}`;

export const matchingRows = (query: string): ReadonlyArray<QueueRow> => {
  const needle = Str.toLowerCase(Str.trim(query));
  return Str.isNonEmpty(needle)
    ? Arr.filter(QUEUE_ROWS, (row) =>
        Str.includes(needle)(Str.toLowerCase(fieldsOf(row))),
      )
    : QUEUE_ROWS;
};

const stateTone = (state: QueueRow["state"]): string =>
  state === "done"
    ? "gx-badge-success"
    : state === "running"
      ? "gx-badge-info"
      : "gx-badge-neutral";

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
    <div className="gx-data-scene">
      <div aria-label="Deploy queue" className="gx-dtoolbar" role="toolbar">
        <label className="gx-dfield gx-dfield-sm">
          <input
            aria-label={searchLabel("")}
            onChange={(event) => type(event.target.value)}
            placeholder="Filter services…"
            type="search"
            value={typed}
          />
        </label>
        <button
          className="gx-btn gx-btn-sm gx-btn-secondary"
          onClick={reset}
          type="button"
        >
          Reset
        </button>
      </div>
      <div aria-label="Matching records" className="gx-dt" role="table">
        <div className="gx-dt-head" role="rowgroup">
          <div className="gx-dt-row" role="row">
            <div className="gx-dt-hcell" role="columnheader">
              Service
            </div>
            <div className="gx-dt-hcell" role="columnheader">
              Environment
            </div>
            <div className="gx-dt-hcell" role="columnheader">
              State
            </div>
          </div>
        </div>
        <div role="rowgroup">
          {rows.map((row) => (
            <div
              className="gx-dt-row"
              data-row={row.id}
              key={row.id}
              role="row"
            >
              <div className="gx-dt-cell" role="cell">
                {row.service}
              </div>
              <div className="gx-dt-cell" role="cell">
                {row.environment}
              </div>
              <div className="gx-dt-cell" role="cell">
                <span
                  className={`gx-badge gx-badge-sm ${stateTone(row.state)}`}
                >
                  {row.state}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div aria-label="Debounce" className="gx-data-row" role="group">
        {WAITS.map((candidate) => (
          <button
            aria-pressed={candidate.id === choice.id}
            className="gx-btn gx-btn-sm gx-toggle"
            data-pressed={candidate.id === choice.id ? "" : undefined}
            key={candidate.id}
            onClick={() => setChoice(candidate)}
            type="button"
          >
            {candidate.label}
          </button>
        ))}
      </div>
      <p className="gx-data-readout">
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

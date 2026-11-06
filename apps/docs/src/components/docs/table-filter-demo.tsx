import {
  DEFAULT_FILTER_LABEL,
  DEFAULT_FILTER_PLACEHOLDER,
} from "@gpuixui/data";
import { spokenText, visibleCopy } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useState } from "react";

export interface FilterRow {
  readonly id: string;
  readonly service: string;
  readonly environment: string;
  readonly state: string;
}

export const FILTER_ROWS: ReadonlyArray<FilterRow> = [
  { id: "f1", service: "reports", environment: "production", state: "healthy" },
  { id: "f2", service: "search", environment: "staging", state: "degraded" },
  { id: "f3", service: "media", environment: "production", state: "healthy" },
  { id: "f4", service: "gateway", environment: "staging", state: "healthy" },
  { id: "f5", service: "billing", environment: "production", state: "paused" },
];

const fieldsOf = (row: FilterRow): string =>
  `${row.service} ${row.environment} ${row.state}`;

export const matchingRows = (query: string): ReadonlyArray<FilterRow> => {
  const needle = Str.toLowerCase(Str.trim(query));
  return Str.isNonEmpty(needle)
    ? Arr.filter(FILTER_ROWS, (row) =>
        Str.includes(needle)(Str.toLowerCase(fieldsOf(row))),
      )
    : FILTER_ROWS;
};

export const filterLabel = (label: string | undefined): string =>
  spokenText(Option.fromNullishOr(label), DEFAULT_FILTER_LABEL);

export const filterHint = (placeholder: string | undefined): string =>
  visibleCopy(placeholder) ?? DEFAULT_FILTER_PLACEHOLDER;

const stateTone = (state: FilterRow["state"]): string =>
  state === "healthy"
    ? "gx-badge-success"
    : state === "degraded"
      ? "gx-badge-warning"
      : "gx-badge-neutral";

export function TableFilterDemo() {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState("");
  const rows = matchingRows(query);

  return (
    <div className="gx-data-scene">
      <label className="gx-dfield gx-dfield-sm">
        <input
          aria-label={filterLabel(label)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={filterHint("")}
          type="search"
          value={query}
        />
      </label>
      <div aria-label="Matching services" className="gx-dt" role="table">
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
      <div aria-label="Accessible name" className="gx-data-row" role="group">
        <button
          aria-pressed={label === ""}
          className="gx-btn gx-btn-sm gx-toggle"
          data-pressed={label === "" ? "" : undefined}
          onClick={() => setLabel("")}
          type="button"
        >
          blank (default)
        </button>
        <button
          aria-pressed={label !== ""}
          className="gx-btn gx-btn-sm gx-toggle"
          data-pressed={label !== "" ? "" : undefined}
          onClick={() => setLabel("Find a service")}
          type="button"
        >
          Find a service
        </button>
      </div>
      <p className="gx-data-readout">
        “{query}” · {rows.length} of {FILTER_ROWS.length} rows · name “
        {filterLabel(label)}” · hint “{filterHint("")}”
      </p>
    </div>
  );
}

export const tableFilterDemoSource = `import { TableFilterField } from "@gpuixui/data";
import { useState } from "react";

const [query, setQuery] = useState("");

// The field owns no query and reports every edit: the table holds the value
// and narrows on it. A blank label reads as "Filter rows" and a blank
// placeholder as "Filter…", so a missing locale row cannot unname the field.
<TableFilterField
  value={query}
  label="Filter services"
  onValueChange={setQuery}
/>;`;

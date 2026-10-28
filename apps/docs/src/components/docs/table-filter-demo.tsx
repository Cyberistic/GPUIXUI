import {
  DEFAULT_FILTER_LABEL,
  DEFAULT_FILTER_PLACEHOLDER,
} from "@gpuixui/data";
import { spokenText, visibleCopy } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useState } from "react";

/**
 * Browser preview for the Filtering controls page.
 *
 * `TableFilterField` is a GPUix host field, so the drawing is a labelled
 * approximation. What it does not approximate is the field's contract: it owns
 * no query, it reports **every** edit (the wait in `DataToolbar` is the
 * toolbar's), a blank name reads as `DEFAULT_FILTER_LABEL` and a blank hint as
 * `DEFAULT_FILTER_PLACEHOLDER`. The two constants and the two readers are the
 * package's, so the drawing cannot teach a default or a rule the field does not
 * ship.
 */

/** One record the drawing narrows: a service a reader is looking for. */
export interface FilterRow {
  readonly id: string;
  readonly service: string;
  readonly environment: string;
  readonly state: string;
}

/** The records the drawing opens on. */
export const FILTER_ROWS: ReadonlyArray<FilterRow> = [
  { id: "f1", service: "reports", environment: "production", state: "healthy" },
  { id: "f2", service: "search", environment: "staging", state: "degraded" },
  { id: "f3", service: "media", environment: "production", state: "healthy" },
  { id: "f4", service: "gateway", environment: "staging", state: "healthy" },
  { id: "f5", service: "billing", environment: "production", state: "paused" },
];

/** The cells a query is matched against. */
const fieldsOf = (row: FilterRow): string =>
  `${row.service} ${row.environment} ${row.state}`;

/**
 * The records a query keeps — the table's rule, not the field's.
 *
 * A literal match, case ignored, and an empty query keeps every row. The field
 * only reports the text; this is the narrowing the grid would do with it.
 */
export const matchingRows = (query: string): ReadonlyArray<FilterRow> => {
  const needle = Str.toLowerCase(Str.trim(query));
  return Str.isNonEmpty(needle)
    ? Arr.filter(FILTER_ROWS, (row) =>
        Str.includes(needle)(Str.toLowerCase(fieldsOf(row))),
      )
    : FILTER_ROWS;
};

/** The field's accessible name, read the way the component reads it. */
export const filterLabel = (label: string | undefined): string =>
  spokenText(Option.fromNullishOr(label), DEFAULT_FILTER_LABEL);

/** The hint the empty field shows, read the way the component reads it. */
export const filterHint = (placeholder: string | undefined): string =>
  visibleCopy(placeholder) ?? DEFAULT_FILTER_PLACEHOLDER;

/** The theme's status tone for one state, as the Badge recipe paints it. */
const stateTone = (state: FilterRow["state"]): string =>
  state === "healthy"
    ? "gx-badge-success"
    : state === "degraded"
      ? "gx-badge-warning"
      : "gx-badge-neutral";

/** The page's preview: the field narrows the rows it sits above. */
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

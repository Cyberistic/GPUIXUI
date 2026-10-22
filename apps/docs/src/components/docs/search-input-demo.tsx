import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  countLabel,
  escapeClears,
  filterRows,
  type PreviewRow,
} from "./search-input-preview";

/**
 * Browser previews for the Search input page.
 *
 * The shipped field paints its own hint (the native host is handed no
 * `placeholder`), reports every edit and clears through a 24px control that only
 * exists while there is text. The preview takes the field's geometry from the
 * theme bridge — the height from density, the 6px radius and 8px padding the
 * recipe compiles — and mirrors three decisions a drawing cannot show: Escape
 * clears only a non-empty field, clearing returns focus to the input, and a
 * disabled field's clear control leaves the tab order. The last one is a
 * property of the shipped source, including its gap: the target keeps its press
 * handler, which the page records. Matching and the count are the app's.
 */

const deployments: ReadonlyArray<PreviewRow> = [
  { name: "api-gateway", region: "fra1 · edge" },
  { name: "billing-worker", region: "iad1 · queue" },
  { name: "docs-site", region: "sfo1 · static" },
  { name: "postgres-primary", region: "iad1 · database" },
  { name: "search-index", region: "fra1 · worker" },
  { name: "web-console", region: "sfo1 · frontend" },
];

/** The leading search mark, drawn in the browser's own SVG. */
const SearchGlyph = () => (
  <svg
    aria-hidden="true"
    className="gx-search-glyph"
    fill="none"
    height={14}
    viewBox="0 0 24 24"
    width={14}
  >
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/** The clear control's glyph. */
const ClearGlyph = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height={12}
    viewBox="0 0 24 24"
    width={12}
  >
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" />
  </svg>
);

interface PreviewFieldProps {
  /** The accessible name, the way a caller names the field. */
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly onChange?: (value: string) => void;
  readonly onSubmit?: (value: string) => void;
  readonly onClear?: () => void;
}

/**
 * One search field: the field surface, the hint and the conditional clear
 * control.
 *
 * Clearing goes through the input's ref, because the shipped component returns
 * the focus to the field after a clear. Escape is read before the browser's own
 * handling: on an empty field the preview does nothing, which is the case that
 * leaves the key for an enclosing dialog.
 */
const PreviewField = ({
  label,
  value,
  placeholder = "Search…",
  disabled = false,
  onChange,
  onSubmit,
  onClear,
}: PreviewFieldProps) => {
  const input = useRef<HTMLInputElement>(null);

  const clear = (): void => {
    onChange?.("");
    onClear?.();
    input.current?.focus();
  };

  return (
    <div className="gx-search-field" data-disabled={disabled ? "" : undefined}>
      <span className="gx-search-mark">
        <SearchGlyph />
      </span>
      <input
        aria-label={label}
        className="gx-search-input"
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={(event: ReactKeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit?.(value);
            return;
          }
          if (event.key === "Escape" && escapeClears(value)) {
            event.preventDefault();
            clear();
          }
        }}
        placeholder={placeholder}
        ref={input}
        type="search"
        value={value}
      />
      {value === "" ? null : (
        <button
          aria-label="Clear search"
          className="gx-search-clear"
          onClick={clear}
          tabIndex={disabled ? -1 : 0}
          type="button"
        >
          <ClearGlyph />
        </button>
      )}
    </div>
  );
};

/** A filter bar over a deployment list: live count, Enter, Escape, clear. */
const SearchWorkflow = () => {
  const [query, setQuery] = useState("");
  const [submits, setSubmits] = useState(0);
  const [clears, setClears] = useState(0);
  const shown = filterRows(deployments, query);
  const needle = query.trim();

  return (
    <div className="gx-demo gx-search">
      <div className="gx-search-card">
        <div>
          <p className="gx-search-title">Deployments</p>
          <p className="gx-search-meta" role="status">
            {countLabel(shown.length, deployments.length)} · submits={submits} ·
            clears={clears}
          </p>
        </div>
        <PreviewField
          label="Filter deployments"
          onChange={setQuery}
          onClear={() => setClears((count) => count + 1)}
          onSubmit={() => setSubmits((count) => count + 1)}
          placeholder="Filter by service or region…"
          value={query}
        />
        <ul className="gx-search-rows">
          {shown.map((row) => (
            <li className="gx-search-row" key={row.name}>
              <span className="gx-search-row-name">{row.name}</span>
              <span className="gx-search-row-region">{row.region}</span>
            </li>
          ))}
          {shown.length === 0 ? (
            <li className="gx-search-empty">
              No deployment matches “{needle}”.
            </li>
          ) : null}
        </ul>
        <p className="gx-search-note">
          Enter submits the query · Escape clears only when there is text
        </p>
      </div>
    </div>
  );
};

/** Rest, filled, disabled and the page-role fill on a muted toolbar. */
const SearchStates = () => {
  const [empty, setEmpty] = useState("");
  const [filled, setFilled] = useState("invoice");
  const [disabled, setDisabled] = useState("invoice · archived");
  const [toolbar, setToolbar] = useState("graph");

  return (
    <div className="gx-demo gx-search gx-search-states">
      <div className="gx-search-state">
        <span className="gx-search-state-label">
          Rest — the hint, and no clear control
        </span>
        <PreviewField
          label="Empty search field"
          onChange={setEmpty}
          value={empty}
        />
      </div>
      <div className="gx-search-state">
        <span className="gx-search-state-label">
          With text — the clear control is a 24px target
        </span>
        <PreviewField
          label="Filled search field"
          onChange={setFilled}
          value={filled}
        />
      </div>
      <div className="gx-search-state">
        <span className="gx-search-state-label">
          Disabled — read-only, half opacity, and the target leaves the tab
          order
        </span>
        <PreviewField
          disabled
          label="Disabled search field"
          onChange={setDisabled}
          value={disabled}
        />
      </div>
      <div className="gx-search-state">
        <span className="gx-search-state-label">
          On a muted toolbar — the field keeps the page role as its own fill
        </span>
        <div className="gx-search-toolbar">
          <PreviewField
            label="Filter the toolbar"
            onChange={setToolbar}
            placeholder="Filter…"
            value={toolbar}
          />
        </div>
      </div>
    </div>
  );
};

const workflowSource = `import { SearchInput } from "@gpuixui/components/search-input";
import { Text } from "@gpuixui/primitives";
import { useState } from "react";

const FILES = ["card.tsx", "dialog.tsx", "list.tsx", "toast.tsx"];

export const FileFilter = () => {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("none");
  const matches = FILES.filter((file) =>
    file.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <SearchInput
        aria-label="Filter files"
        placeholder="Filter files…"
        value={query}
        onValueChange={setQuery}
        onSubmit={setSubmitted}
        onClear={() => setSubmitted("none")}
      />
      <Text role="caption">
        {matches.length} of {FILES.length} · submitted: {submitted}
      </Text>
    </>
  );
};`;

const statesSource = `import { SearchInput } from "@gpuixui/components/search-input";

const theme = useTheme();

<>
  {/* The hint is painted by the field while the value is empty. */}
  <SearchInput aria-label="Empty search" />

  {/* With text, the 24px clear control appears; clearing returns focus. */}
  <SearchInput aria-label="Filled search" defaultValue="invoice" />

  {/* Disabled is read-only plus half opacity; no ring, and the clear
      control leaves the tab order. */}
  <SearchInput aria-label="Archived search" disabled defaultValue="invoice" />

  {/* A composite field paints the page role, so it stands apart on a
      muted toolbar. */}
  <div style={{ backgroundColor: theme.colors.muted }}>
    <SearchInput aria-label="Filter the toolbar" placeholder="Filter…" />
  </div>
</>;`;

/** One exported example per preview, with the usage its Code tab shows. */
export {
  SearchStates,
  SearchWorkflow,
  statesSource as searchStatesSource,
  workflowSource as searchWorkflowSource,
};

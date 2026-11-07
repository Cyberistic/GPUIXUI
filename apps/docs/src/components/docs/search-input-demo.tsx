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

const deployments: ReadonlyArray<PreviewRow> = [
  { name: "api-gateway", region: "fra1 · edge" },
  { name: "billing-worker", region: "iad1 · queue" },
  { name: "docs-site", region: "sfo1 · static" },
  { name: "postgres-primary", region: "iad1 · database" },
  { name: "search-index", region: "fra1 · worker" },
  { name: "web-console", region: "sfo1 · frontend" },
];

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

const ClearGlyph = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height={14}
    viewBox="0 0 24 24"
    width={14}
  >
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" />
  </svg>
);

interface PreviewFieldProps {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly onChange?: (value: string) => void;
  readonly onSubmit?: (value: string) => void;
  readonly onClear?: () => void;
}

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
    if (disabled) return;
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
          if (event.key === "Escape" && escapeClears(value, disabled)) {
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
          disabled={disabled}
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
      </div>
    </div>
  );
};

const SearchStates = () => {
  const [empty, setEmpty] = useState("");
  const [filled, setFilled] = useState("invoice");
  const [disabled, setDisabled] = useState("invoice · archived");
  const [toolbar, setToolbar] = useState("graph");

  return (
    <div className="gx-demo gx-search gx-search-states">
      <div className="gx-search-state">
        <span className="gx-search-state-label">Rest</span>
        <PreviewField
          label="Empty search field"
          onChange={setEmpty}
          value={empty}
        />
      </div>
      <div className="gx-search-state">
        <span className="gx-search-state-label">With text</span>
        <PreviewField
          label="Filled search field"
          onChange={setFilled}
          value={filled}
        />
      </div>
      <div className="gx-search-state">
        <span className="gx-search-state-label">Disabled</span>
        <PreviewField
          disabled
          label="Disabled search field"
          onChange={setDisabled}
          value={disabled}
        />
      </div>
      <div className="gx-search-state">
        <span className="gx-search-state-label">On a muted toolbar</span>
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

export {
  SearchStates,
  SearchWorkflow,
  statesSource as searchStatesSource,
  workflowSource as searchWorkflowSource,
};

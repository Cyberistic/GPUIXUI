import type { CSSProperties, ReactNode } from "react";
import {
  captionType,
  column,
  fieldChrome,
  fieldRow,
  labelType,
  row,
  type PreviewProps,
} from "./preview-styles";
import { PreviewSurface } from "./theme-surface";

/**
 * Static rest previews for the Tier 2 compositions (plan 452). A list, an empty
 * state or a breadcrumb has a resting layout worth showing; a menu or a dialog
 * does not, so those pages stay at tier V. Everything here obeys the tier-A
 * rules: no host input, no role, no handler, no palette literal.
 */

const errorType: CSSProperties = {
  ...captionType,
  color: "var(--preview-color-destructive)",
};

function Action({
  quiet,
  children,
}: {
  readonly quiet?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <span
      style={{
        ...labelType,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: "var(--preview-control-height-md)",
        padding: "0 var(--preview-control-padding-x-md)",
        boxSizing: "border-box",
        borderRadius: "var(--preview-radius-md)",
        border: quiet
          ? "var(--preview-border-thin) solid var(--preview-color-border)"
          : "none",
        backgroundColor: quiet ? "transparent" : "var(--preview-color-primary)",
        color: quiet
          ? "var(--preview-color-foreground)"
          : "var(--preview-color-primaryForeground)",
      }}
    >
      {children}
    </span>
  );
}

interface ListRow {
  readonly label: string;
  readonly selected?: boolean;
  readonly disabled?: boolean;
}

const listRows: ReadonlyArray<ListRow> = [
  { label: "Design system", selected: true },
  { label: "Documentation site" },
  { label: "Onboarding", disabled: true },
  { label: "Release checklist" },
  { label: "Archive" },
];

export function ListPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, gap: "var(--preview-space-xs)" }}>
        <span style={{ ...captionType, textTransform: "uppercase" }}>
          Projects
        </span>
        <div style={{ ...column, gap: 0 }}>
          {listRows.map((item) => (
            <span
              key={item.label}
              aria-disabled={item.disabled === true ? true : undefined}
              style={{
                ...labelType,
                display: "flex",
                alignItems: "center",
                height: "var(--preview-row-height)",
                padding: "0 var(--preview-control-padding-x-md)",
                borderRadius: "var(--preview-radius-sm)",
                backgroundColor: item.selected
                  ? "var(--preview-color-selected)"
                  : "transparent",
                color: item.selected
                  ? "var(--preview-color-selectedForeground)"
                  : "var(--preview-color-foreground)",
                opacity: item.disabled === true ? 0.5 : 1,
              }}
            >
              {item.label}
            </span>
          ))}
        </div>
        <span style={captionType}>
          One selected row; disabled rows are skipped by the arrows.
        </span>
      </div>
    </PreviewSurface>
  );
}

export function EmptyStatePreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div
        style={{
          ...column,
          alignItems: "center",
          textAlign: "center",
          maxWidth: "22rem",
        }}
      >
        <span
          style={{
            ...labelType,
            fontWeight: 600,
            color: "var(--preview-color-foreground)",
          }}
        >
          No projects yet
        </span>
        <span style={captionType}>
          A project holds the screens, components and releases for one product.
        </span>
        <div style={row}>
          <Action>Create project</Action>
          <Action quiet>Browse templates</Action>
        </div>
      </div>
    </PreviewSurface>
  );
}

export function InlineValidationPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <div style={fieldRow}>
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            Workspace name
          </span>
          <div style={fieldChrome()}>Acme Design</div>
          <span style={captionType}>Shown in the window title.</span>
        </div>
        <div style={fieldRow}>
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            Email
          </span>
          <div style={fieldChrome({ invalid: true })}>ada@</div>
          <span style={errorType}>Enter a complete email address.</span>
        </div>
      </div>
    </PreviewSurface>
  );
}

const crumbs = ["Workspace", "Settings", "Members"];

export function BreadcrumbPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={row}>
          {crumbs.map((crumb, index) => (
            <span key={crumb} style={row}>
              {index > 0 ? <span style={captionType}>/</span> : null}
              <span
                style={{
                  ...captionType,
                  color:
                    index === crumbs.length - 1
                      ? "var(--preview-color-foreground)"
                      : "var(--preview-color-mutedForeground)",
                }}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>
        <span style={captionType}>
          The current page is text and colour; 0.10.0 has no aria-current.
        </span>
      </div>
    </PreviewSurface>
  );
}

interface PageCell {
  readonly label: string;
  readonly state?: "current" | "disabled";
}

const pageCells: ReadonlyArray<PageCell> = [
  { label: "‹", state: "disabled" },
  { label: "1" },
  { label: "2" },
  { label: "3", state: "current" },
  { label: "4" },
  { label: "…" },
  { label: "12" },
  { label: "›" },
];

export function PaginationPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={row}>
          {pageCells.map((cell) => (
            <span
              key={cell.label}
              style={{
                ...labelType,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "var(--preview-control-height-sm)",
                height: "var(--preview-control-height-sm)",
                padding: "0 var(--preview-space-xs)",
                boxSizing: "border-box",
                borderRadius: "var(--preview-radius-sm)",
                backgroundColor:
                  cell.state === "current"
                    ? "var(--preview-color-primary)"
                    : "transparent",
                color:
                  cell.state === "current"
                    ? "var(--preview-color-primaryForeground)"
                    : "var(--preview-color-foreground)",
                opacity: cell.state === "disabled" ? 0.5 : 1,
              }}
            >
              {cell.label}
            </span>
          ))}
        </div>
        <span style={captionType}>
          The window keeps a stable width; the current page never navigates.
        </span>
      </div>
    </PreviewSurface>
  );
}

export function SearchInputPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <div style={fieldRow}>
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            Search
          </span>
          <div style={{ ...fieldChrome(), justifyContent: "space-between" }}>
            <span style={row}>
              <span style={captionType}>⌕</span>
              <span>button</span>
            </span>
            <span style={captionType}>×</span>
          </div>
          <span style={captionType}>
            Enter submits; Escape clears only when the field is not empty.
          </span>
        </div>
      </div>
    </PreviewSurface>
  );
}

function AccordionHeader({
  label,
  expanded,
}: {
  readonly label: string;
  readonly expanded: boolean;
}) {
  return (
    <span
      style={{
        ...labelType,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--preview-space-md)",
        color: "var(--preview-color-foreground)",
      }}
    >
      {label}
      <span style={captionType}>{expanded ? "⌄" : "›"}</span>
    </span>
  );
}

export function AccordionPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <div style={fieldRow}>
          <AccordionHeader label="Notifications" expanded />
          <span style={captionType}>Email me when a deployment finishes.</span>
        </div>
        <div style={fieldRow}>
          <AccordionHeader label="Billing" expanded={false} />
        </div>
      </div>
    </PreviewSurface>
  );
}

export function CollapsiblePreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <AccordionHeader label="Advanced settings" expanded />
        <span style={captionType}>
          The panel unmounts while closed, so its fields never hold a stale
          draft.
        </span>
      </div>
    </PreviewSurface>
  );
}

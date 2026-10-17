import type { CSSProperties, ReactNode } from "react";
import {
  captionType,
  column,
  labelType,
  row,
  type PreviewProps,
} from "./preview-styles";
import { PreviewSurface } from "./theme-surface";

/**
 * Static rest previews for the layout and typography pages (plan 453). These
 * show the scales a component is built from — the type roles, a gap, a rule, a
 * padding step — not a live control. The tier-A rules are unchanged: no host
 * input, no role, no handler, no palette literal.
 */

type TextRole =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodyStrong"
  | "label"
  | "caption"
  | "code"
  | "codeBlock";

const textRole = (role: TextRole, mono = false): CSSProperties => ({
  fontSize: `var(--preview-text-${role}-size)`,
  lineHeight: `var(--preview-text-${role}-leading)`,
  fontWeight: `var(--preview-text-${role}-weight)`,
  fontFamily: mono ? "var(--preview-font-mono)" : "var(--preview-font-sans)",
  color: "var(--preview-color-foreground)",
});

const typeRows: ReadonlyArray<readonly [TextRole, string]> = [
  ["display", "GPUIXUI"],
  ["h1", "Design system"],
  ["h2", "Typography"],
  ["h3", "Named roles"],
  ["body", "Every role resolves from the active theme."],
  ["bodyStrong", "Strong body copy for emphasis."],
  ["label", "Label for a control"],
  ["caption", "Caption and metadata"],
];

export function TextPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        {typeRows.map(([role, sample]) => (
          <div key={role} style={row}>
            <span style={{ ...textRole(role, role.startsWith("code")) }}>
              {sample}
            </span>
            <span style={captionType}>{role}</span>
          </div>
        ))}
        <div style={column}>
          <span style={textRole("code", true)}>
            {'const theme = createTheme({ mode: "dark" })'}
          </span>
          <span style={captionType}>code · inline</span>
        </div>
      </div>
    </PreviewSurface>
  );
}

function Rule({ vertical = false }: { readonly vertical?: boolean }) {
  return (
    <span
      style={{
        display: "block",
        flexShrink: 0,
        width: vertical ? "var(--preview-border-thin)" : "100%",
        height: vertical
          ? "var(--preview-icon-md)"
          : "var(--preview-border-thin)",
        backgroundColor: "var(--preview-color-border)",
      }}
    />
  );
}

export function SeparatorPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <span
          style={{ ...labelType, color: "var(--preview-color-foreground)" }}
        >
          Appearance
        </span>
        <Rule />
        <span style={captionType}>A horizontal rule separates sections.</span>
        <div style={row}>
          <span style={captionType}>Docs</span>
          <Rule vertical />
          <span style={captionType}>API</span>
          <Rule vertical />
          <span style={captionType}>Source</span>
        </div>
        <span style={captionType}>
          A vertical rule separates links in a row.
        </span>
      </div>
    </PreviewSurface>
  );
}

function Edge({ label }: { readonly label: string }) {
  return (
    <span
      style={{
        ...captionType,
        padding: "var(--preview-space-sm) var(--preview-space-lg)",
        border: "var(--preview-border-thin) solid var(--preview-color-border)",
        borderRadius: "var(--preview-radius-md)",
      }}
    >
      {label}
    </span>
  );
}

export function SpacerPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={{ ...row, flexWrap: "nowrap", width: "100%" }}>
          <Edge label="Start" />
          <span
            style={{
              flex: 1,
              height: "var(--preview-border-thin)",
              backgroundColor: "var(--preview-color-border)",
            }}
          />
          <Edge label="End" />
        </div>
        <span style={captionType}>
          The spacer is the flexible gap; the edges keep their size.
        </span>
      </div>
    </PreviewSurface>
  );
}

function Tile({ children }: { readonly children: ReactNode }) {
  return (
    <span
      style={{
        ...captionType,
        padding: "var(--preview-space-sm) var(--preview-space-md)",
        backgroundColor: "var(--preview-color-muted)",
        borderRadius: "var(--preview-radius-sm)",
      }}
    >
      {children}
    </span>
  );
}

export function StackPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={column}>
          <Tile>Column · one</Tile>
          <Tile>Column · two</Tile>
          <Tile>Column · three</Tile>
        </div>
        <div style={row}>
          <Tile>Row · one</Tile>
          <Tile>Row · two</Tile>
          <Tile>Row · three</Tile>
        </div>
        <span style={captionType}>
          The gap is the theme's step, in both directions.
        </span>
      </div>
    </PreviewSurface>
  );
}

export function BoxPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <div
          style={{
            padding: "var(--preview-space-lg)",
            backgroundColor: "var(--preview-color-background)",
            border:
              "var(--preview-border-thin) solid var(--preview-color-border)",
            borderRadius: "var(--preview-radius-lg)",
          }}
        >
          <div
            style={{
              padding: "var(--preview-space-md)",
              backgroundColor: "var(--preview-color-card)",
              border:
                "var(--preview-border-thin) solid var(--preview-color-border)",
              borderRadius: "var(--preview-radius-md)",
            }}
          >
            <span
              style={{
                ...labelType,
                color: "var(--preview-color-cardForeground)",
              }}
            >
              Nested surface
            </span>
            <span style={captionType}>
              Padding, border and radius all come from the theme.
            </span>
          </div>
        </div>
        <span style={captionType}>
          Every primitive merges a caller's style last.
        </span>
      </div>
    </PreviewSurface>
  );
}

type GroupPosition = "first" | "middle" | "last" | "only";

function GroupButton({
  label,
  position,
  separated = false,
  pressed = false,
}: {
  readonly label: string;
  readonly position: GroupPosition;
  readonly separated?: boolean;
  readonly pressed?: boolean;
}) {
  const radius = "var(--preview-radius-md)";
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
        backgroundColor: pressed
          ? "var(--preview-color-selected)"
          : "var(--preview-color-background)",
        color: pressed
          ? "var(--preview-color-selectedForeground)"
          : "var(--preview-color-foreground)",
        border: "var(--preview-border-thin) solid var(--preview-color-border)",
        borderLeftWidth:
          separated || position === "first"
            ? "var(--preview-border-thin)"
            : "0",
        borderTopLeftRadius: separated || position === "first" ? radius : "0",
        borderBottomLeftRadius:
          separated || position === "first" ? radius : "0",
        borderTopRightRadius: separated || position === "last" ? radius : "0",
        borderBottomRightRadius:
          separated || position === "last" ? radius : "0",
      }}
    >
      {label}
    </span>
  );
}

export function ButtonGroupPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={row}>
          <GroupButton label="Day" position="first" pressed />
          <GroupButton label="Week" position="middle" />
          <GroupButton label="Month" position="last" />
        </div>
        <div style={row}>
          <GroupButton label="Bold" position="only" separated />
          <GroupButton label="Italic" position="only" separated />
          <GroupButton label="Underline" position="only" separated />
        </div>
        <span style={captionType}>
          Attached children are 0px apart; separated ones use the small gap.
        </span>
      </div>
    </PreviewSurface>
  );
}

export function LabelPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <div style={{ ...column, gap: "var(--preview-space-2xs)" }}>
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            Workspace name
          </span>
          <span style={captionType}>Shown in the window title.</span>
        </div>
        <div style={{ ...column, gap: "var(--preview-space-2xs)" }}>
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            Region{" "}
            <span style={{ color: "var(--preview-color-destructive)" }}>*</span>
          </span>
          <span style={captionType}>
            Required before the form can be saved.
          </span>
        </div>
        <div
          style={{
            ...column,
            gap: "var(--preview-space-2xs)",
            opacity: 0.5,
          }}
        >
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            Legacy field
          </span>
          <span style={captionType}>Disabled with its control.</span>
        </div>
      </div>
    </PreviewSurface>
  );
}

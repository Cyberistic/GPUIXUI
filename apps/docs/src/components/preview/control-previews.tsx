import type { CSSProperties } from "react";
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
 * Static rest previews for the form controls (plan 449).
 *
 * Each one paints the control's documented states as they look at rest — never
 * as something to click. The real component's keyboard and pointer behaviour is
 * a native suite's job; a `div` here may not pretend otherwise, which is why
 * `approximations.test.tsx` rejects a `role`, a `tabIndex` or a host input.
 */

const errorType: CSSProperties = {
  ...captionType,
  color: "var(--preview-color-destructive)",
};

function Field({
  label,
  value,
  hint,
  invalid,
  disabled,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
}) {
  return (
    <div style={fieldRow}>
      <span style={labelType}>{label}</span>
      <div style={fieldChrome({ invalid, disabled })}>{value}</div>
      <span style={invalid === true ? errorType : captionType}>{hint}</span>
    </div>
  );
}

export function TextInputPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <Field
          label="Workspace name"
          value="Acme Design"
          hint="Shown in the window title."
        />
        <Field
          label="Slug"
          value="acme design"
          hint="Use lowercase letters, numbers and dashes."
          invalid
        />
        <Field
          label="Region"
          value="Managed by your organisation"
          hint="The data residency cannot be changed here."
          disabled
        />
      </div>
    </PreviewSurface>
  );
}

function Checkbox({
  state,
  disabled,
}: {
  readonly state: "unchecked" | "checked" | "indeterminate";
  readonly disabled?: boolean;
}) {
  const filled = state !== "unchecked";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "var(--preview-icon-md)",
        height: "var(--preview-icon-md)",
        flexShrink: 0,
        boxSizing: "border-box",
        borderRadius: "var(--preview-radius-sm)",
        border: `var(--preview-border-thin) solid ${
          filled ? "var(--preview-color-primary)" : "var(--preview-color-input)"
        }`,
        backgroundColor: filled ? "var(--preview-color-primary)" : undefined,
        color: "var(--preview-color-primary-foreground)",
        fontSize: "var(--preview-text-caption-size)",
        lineHeight: 1,
        opacity: disabled === true ? 0.5 : 1,
      }}
    >
      {state === "checked" ? "✓" : state === "indeterminate" ? "–" : ""}
    </div>
  );
}

interface CheckboxRow {
  readonly label: string;
  readonly state: "unchecked" | "checked" | "indeterminate";
  readonly disabled?: boolean;
}

const checkboxRows: ReadonlyArray<CheckboxRow> = [
  { label: "Email notifications", state: "checked" },
  { label: "Weekly digest", state: "unchecked" },
  { label: "Select all", state: "indeterminate" },
  { label: "Locked by policy", state: "checked", disabled: true },
];

export function CheckboxPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        {checkboxRows.map((item) => (
          <div key={item.label} style={row}>
            <Checkbox state={item.state} disabled={item.disabled} />
            <span
              style={{
                ...labelType,
                color: "var(--preview-color-foreground)",
                opacity: item.disabled === true ? 0.5 : 1,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

function Switch({ on }: { readonly on: boolean }) {
  const thumb = "calc(var(--preview-icon-md) - 2 * var(--preview-space-2xs))";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: on ? "flex-end" : "flex-start",
        width: "calc(var(--preview-icon-md) * 1.75)",
        height: "var(--preview-icon-md)",
        flexShrink: 0,
        boxSizing: "border-box",
        padding: "var(--preview-space-2xs)",
        borderRadius: "var(--preview-radius-full)",
        border: `var(--preview-border-thin) solid ${
          on ? "var(--preview-color-primary)" : "var(--preview-color-input)"
        }`,
        backgroundColor: on
          ? "var(--preview-color-primary)"
          : "var(--preview-color-muted)",
      }}
    >
      <span
        style={{
          width: thumb,
          height: thumb,
          borderRadius: "var(--preview-radius-full)",
          backgroundColor: on
            ? "var(--preview-color-primary-foreground)"
            : "var(--preview-color-foreground)",
        }}
      />
    </div>
  );
}

const switchRows = [
  { label: "Sync automatically", on: true },
  { label: "Ask before deleting", on: false },
] as const;

export function SwitchPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        {switchRows.map((item) => (
          <div key={item.label} style={row}>
            <Switch on={item.on} />
            <span
              style={{ ...labelType, color: "var(--preview-color-foreground)" }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

const sliderRows = [
  { label: "Minimum", value: 0 },
  { label: "Halfway", value: 50 },
  { label: "Maximum", value: 100 },
] as const;

function Slider({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div style={fieldRow}>
      <div style={{ ...row, justifyContent: "space-between" }}>
        <span
          style={{ ...labelType, color: "var(--preview-color-foreground)" }}
        >
          {label}
        </span>
        <span style={captionType}>{value}%</span>
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          height: "var(--preview-icon-md)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "var(--preview-space-xs)",
            borderRadius: "var(--preview-radius-full)",
            backgroundColor: "var(--preview-color-muted)",
          }}
        >
          <div
            style={{
              width: `${value}%`,
              height: "100%",
              borderRadius: "var(--preview-radius-full)",
              backgroundColor: "var(--preview-color-primary)",
            }}
          />
        </div>
        <span
          style={{
            position: "absolute",
            left: `${value}%`,
            width: "var(--preview-icon-md)",
            height: "var(--preview-icon-md)",
            marginLeft: "calc(var(--preview-icon-md) / -2)",
            boxSizing: "border-box",
            borderRadius: "var(--preview-radius-full)",
            backgroundColor: "var(--preview-color-input)",
            border:
              "var(--preview-border-strong) solid var(--preview-color-primary)",
          }}
        />
      </div>
    </div>
  );
}

export function SliderPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        {sliderRows.map((item) => (
          <Slider key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </PreviewSurface>
  );
}

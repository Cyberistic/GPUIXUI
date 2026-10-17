import type { CSSProperties } from "react";
import {
  bodyType,
  captionType,
  column,
  fieldChrome,
  fieldRow,
  labelType,
  monoType,
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
        color: "var(--preview-color-primaryForeground)",
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
            ? "var(--preview-color-primaryForeground)"
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

function TextArea({
  value,
  hint,
  invalid,
  disabled,
}: {
  readonly value: string;
  readonly hint: string;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
}) {
  return (
    <div style={fieldRow}>
      <div
        style={{
          ...bodyType,
          minHeight: "calc(var(--preview-control-height-md) * 3)",
          padding:
            "var(--preview-space-sm) var(--preview-control-padding-x-md)",
          boxSizing: "border-box",
          borderRadius: "var(--preview-radius-md)",
          border: `var(--preview-border-thin) solid ${
            invalid === true
              ? "var(--preview-color-destructive)"
              : "var(--preview-color-border)"
          }`,
          backgroundColor: "var(--preview-color-input)",
          color: "var(--preview-color-inputForeground)",
          whiteSpace: "pre-wrap",
          opacity: disabled === true ? 0.5 : 1,
        }}
      >
        {value}
      </div>
      <span style={invalid === true ? errorType : captionType}>{hint}</span>
    </div>
  );
}

export function TextAreaPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <TextArea
          value={"Release notes\nEverything in this build."}
          hint="Three rows minimum; scrolls after eight."
        />
        <TextArea
          value="acme design"
          hint="Use lowercase letters, numbers and dashes."
          invalid
        />
        <TextArea
          value="Managed by your organisation"
          hint="The description cannot be changed here."
          disabled
        />
      </div>
    </PreviewSurface>
  );
}

function Radio({
  selected,
  disabled,
}: {
  readonly selected: boolean;
  readonly disabled?: boolean;
}) {
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
        borderRadius: "var(--preview-radius-full)",
        border: `var(--preview-border-thin) solid ${
          selected
            ? "var(--preview-color-primary)"
            : "var(--preview-color-borderStrong)"
        }`,
        opacity: disabled === true ? 0.5 : 1,
      }}
    >
      {selected ? (
        <span
          style={{
            width: "calc(var(--preview-icon-md) / 2)",
            height: "calc(var(--preview-icon-md) / 2)",
            borderRadius: "var(--preview-radius-full)",
            backgroundColor: "var(--preview-color-primary)",
          }}
        />
      ) : null}
    </div>
  );
}

interface RadioRow {
  readonly label: string;
  readonly description: string;
  readonly selected: boolean;
  readonly disabled?: boolean;
}

const radioRows: ReadonlyArray<RadioRow> = [
  { label: "Daily", description: "One email each morning.", selected: true },
  { label: "Weekly", description: "Every Monday.", selected: false },
  {
    label: "Never",
    description: "Policy requires a digest.",
    selected: false,
    disabled: true,
  },
];

export function RadioGroupPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <span
          style={{ ...labelType, color: "var(--preview-color-foreground)" }}
        >
          Digest cadence
        </span>
        {radioRows.map((item) => (
          <div key={item.label} style={{ ...row, alignItems: "flex-start" }}>
            <Radio selected={item.selected} disabled={item.disabled} />
            <div style={fieldRow}>
              <span
                style={{
                  ...labelType,
                  color: "var(--preview-color-foreground)",
                  opacity: item.disabled === true ? 0.5 : 1,
                }}
              >
                {item.label}
              </span>
              <span style={captionType}>{item.description}</span>
            </div>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

export function SelectPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <div style={fieldRow}>
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            Region
          </span>
          <div style={{ ...fieldChrome(), justifyContent: "space-between" }}>
            <span>Europe — West</span>
            <span style={captionType}>⌄</span>
          </div>
          <span style={captionType}>
            Opens a list with Europe, the United States and a disabled legacy
            region.
          </span>
        </div>
      </div>
    </PreviewSurface>
  );
}

function RangeSlider({
  start,
  end,
}: {
  readonly start: number;
  readonly end: number;
}) {
  const thumb = (at: number): CSSProperties => ({
    position: "absolute",
    left: `${at}%`,
    width: "var(--preview-icon-md)",
    height: "var(--preview-icon-md)",
    marginLeft: "calc(var(--preview-icon-md) / -2)",
    boxSizing: "border-box",
    borderRadius: "var(--preview-radius-full)",
    backgroundColor: "var(--preview-color-input)",
    border: "var(--preview-border-strong) solid var(--preview-color-primary)",
  });
  return (
    <div style={fieldRow}>
      <div style={{ ...row, justifyContent: "space-between" }}>
        <span
          style={{ ...labelType, color: "var(--preview-color-foreground)" }}
        >
          Budget
        </span>
        <span style={captionType}>
          ${start} – ${end}
        </span>
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
              marginLeft: `${start}%`,
              width: `${end - start}%`,
              height: "100%",
              borderRadius: "var(--preview-radius-full)",
              backgroundColor: "var(--preview-color-primary)",
            }}
          />
        </div>
        <span style={thumb(start)} />
        <span style={thumb(end)} />
      </div>
    </div>
  );
}

export function RangeSliderPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <RangeSlider start={20} end={80} />
        <span style={captionType}>
          The ends may touch; a press picks the nearer one.
        </span>
      </div>
    </PreviewSurface>
  );
}

const meterRows = [
  { label: "Disk usage · 68 of 100 GB", value: 68, tone: "primary" },
  { label: "Memory · 42 of 64 GB", value: 66, tone: "success" },
  { label: "Quota · 96 of 100 GB", value: 96, tone: "destructive" },
] as const;

export function MeterPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        {meterRows.map((item) => (
          <div key={item.label} style={fieldRow}>
            <span style={captionType}>{item.label}</span>
            <div
              style={{
                height: "var(--preview-space-xs)",
                borderRadius: "var(--preview-radius-full)",
                backgroundColor: "var(--preview-color-muted)",
              }}
            >
              <div
                style={{
                  width: `${item.value}%`,
                  height: "100%",
                  borderRadius: "var(--preview-radius-full)",
                  backgroundColor: `var(--preview-color-${item.tone})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

function SpinButtons() {
  return (
    <span style={{ ...captionType, lineHeight: 1, textAlign: "center" }}>
      ▲<br />▼
    </span>
  );
}

export function NumberFieldPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        <div style={fieldRow}>
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            Copies
          </span>
          <div style={{ ...fieldChrome(), justifyContent: "space-between" }}>
            <span>12</span>
            <SpinButtons />
          </div>
          <span style={captionType}>1–99; arrows step, PageUp pages.</span>
        </div>
        <div style={fieldRow}>
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            Retries
          </span>
          <div
            style={{
              ...fieldChrome({ invalid: true }),
              justifyContent: "space-between",
            }}
          >
            <span>1000</span>
            <SpinButtons />
          </div>
          <span style={errorType}>Must be between 1 and 99.</span>
        </div>
      </div>
    </PreviewSurface>
  );
}

const otpDigits = ["4", "2", "8", "1", "", ""] as const;

export function OTPFieldPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <span
          style={{ ...labelType, color: "var(--preview-color-foreground)" }}
        >
          Verification code
        </span>
        <span style={captionType}>Six digits from your authenticator.</span>
        <div style={row}>
          {otpDigits.map((digit, index) => (
            <span
              key={index}
              style={{
                ...monoType,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "var(--preview-icon-xl)",
                height: "var(--preview-control-height-md)",
                boxSizing: "border-box",
                borderRadius: "var(--preview-radius-md)",
                border: `var(--preview-border-${
                  index === 4 ? "strong" : "thin"
                }) solid ${
                  index === 4
                    ? "var(--preview-color-primary)"
                    : "var(--preview-color-border)"
                }`,
                backgroundColor: "var(--preview-color-input)",
                color: "var(--preview-color-inputForeground)",
              }}
            >
              {digit}
            </span>
          ))}
        </div>
        <span style={captionType}>
          Backspace clears the previous cell when this one is empty.
        </span>
      </div>
    </PreviewSurface>
  );
}

function Toggle({
  label,
  pressed,
  variant = "default",
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly variant?: "default" | "outline";
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
        border:
          variant === "outline"
            ? "var(--preview-border-thin) solid var(--preview-color-border)"
            : "none",
        backgroundColor: pressed
          ? variant === "outline"
            ? "var(--preview-color-selected)"
            : "var(--preview-color-accent)"
          : "transparent",
        color: pressed
          ? variant === "outline"
            ? "var(--preview-color-selectedForeground)"
            : "var(--preview-color-accentForeground)"
          : "var(--preview-color-foreground)",
      }}
    >
      {label}
    </span>
  );
}

export function TogglePreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={row}>
          <Toggle label="Pin to sidebar" pressed />
          <Toggle label="Show grid" pressed={false} />
          <Toggle label="Locked" pressed={false} variant="outline" />
        </div>
        <div style={row}>
          <Toggle label="Bold" pressed variant="outline" />
          <Toggle label="Italic" pressed={false} variant="outline" />
        </div>
        <span style={captionType}>
          Enter activates on key down; Space on key up.
        </span>
      </div>
    </PreviewSurface>
  );
}

const starCount = 5;

function Stars({ value }: { readonly value: number }) {
  return (
    <span style={{ ...row, gap: "var(--preview-space-2xs)" }}>
      {Array.from({ length: starCount }, (_, index) => (
        <span
          key={index}
          style={{
            fontSize: "var(--preview-icon-md)",
            lineHeight: 1,
            color:
              index < value
                ? "var(--preview-color-primary)"
                : "var(--preview-color-mutedForeground)",
          }}
        >
          {index < value ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

export function RatingPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={row}>
          <Stars value={4} />
          <span
            style={{ ...labelType, color: "var(--preview-color-foreground)" }}
          >
            4 of 5
          </span>
        </div>
        <div style={{ ...row, opacity: 0.5 }}>
          <Stars value={0} />
          <span style={captionType}>No rating yet</span>
        </div>
        <span style={captionType}>
          Arrows move the filled star; Delete clears to zero.
        </span>
      </div>
    </PreviewSurface>
  );
}

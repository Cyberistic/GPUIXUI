import type { ReactElement } from "react";
import {
  captionType,
  column,
  fieldChrome,
  fieldRow,
  keycap,
  labelType,
  monoType,
  row,
  type PreviewProps,
} from "./preview-styles";
import { PreviewSurface } from "./theme-surface";

/**
 * Tier-A approximations for the Tier 2 supplement (plan 461). Each is a static
 * rest state built from `--preview-*` values only: a drawer, a nav panel or a
 * mention popup exists only while open, so those pages stay at tier V instead.
 */

const muted = { color: "var(--preview-color-mutedForeground)" } as const;

const field = (text: string, invalid = false) => (
  <div style={fieldChrome({ invalid })}>{text}</div>
);

const labelled = (label: string, control: ReactElement) => (
  <div style={fieldRow}>
    <span style={captionType}>{label}</span>
    {control}
  </div>
);

export function FieldsetPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <span style={{ ...labelType, fontWeight: 600 }}>Billing address</span>
        {labelled("Street", field("12 Market Street"))}
        {labelled("City", field("Lisbon"))}
      </div>
    </PreviewSurface>
  );
}

export function FormPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        {labelled("Email", field("ada@example.com"))}
        {labelled("Name", field("", true))}
        <div
          style={{
            ...column,
            gap: "var(--preview-space-2xs)",
            ...captionType,
            color: "var(--preview-color-destructive)",
          }}
        >
          <span>Name is required.</span>
          <span>Enter at least two characters.</span>
        </div>
        <div
          style={{
            ...labelType,
            alignSelf: "flex-start",
            padding: "0 var(--preview-control-padding-x-md)",
            lineHeight: "var(--preview-control-height-md)",
            borderRadius: "var(--preview-radius-md)",
            background: "var(--preview-color-primary)",
            color: "var(--preview-color-primaryForeground)",
          }}
        >
          Create account
        </div>
      </div>
    </PreviewSurface>
  );
}

const steps = [
  { value: "1", label: "Account", tone: "secondary" },
  { value: "2", label: "Billing", tone: "primary" },
  { value: "3", label: "Review", tone: "muted" },
] as const;

export function StepperPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...row, gap: "var(--preview-space-xl)" }}>
        {steps.map((step) => (
          <div
            key={step.value}
            style={{ ...row, gap: "var(--preview-space-xs)" }}
          >
            <span
              style={{
                ...captionType,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "var(--preview-control-height-md)",
                height: "var(--preview-control-height-md)",
                borderRadius: "var(--preview-radius-lg)",
                background: `var(--preview-color-${step.tone})`,
                color: `var(--preview-color-${step.tone}Foreground)`,
              }}
            >
              {step.value}
            </span>
            <span
              style={
                step.tone === "muted" ? { ...labelType, ...muted } : labelType
              }
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

const events = [
  { time: "09:41", title: "Build started", current: false },
  { time: "09:44", title: "Tests passed", current: false },
  { time: "09:52", title: "Deploying to production", current: true },
] as const;

export function TimelinePreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        {events.map((event) => (
          <div key={event.time} style={{ ...row, alignItems: "flex-start" }}>
            <span style={{ ...monoType, ...muted }}>{event.time}</span>
            <span
              style={{
                width: "var(--preview-icon-xs)",
                height: "var(--preview-icon-xs)",
                marginTop: "var(--preview-space-2xs)",
                borderRadius: "var(--preview-radius-lg)",
                background: event.current
                  ? "var(--preview-color-primary)"
                  : "var(--preview-color-foreground)",
              }}
            />
            <span style={labelType}>{event.title}</span>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

const swatches = [
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive",
  "foreground",
] as const;

export function ColorPickerPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={row}>
          {swatches.map((role, index) => (
            <span
              key={role}
              style={{
                width: "var(--preview-icon-lg)",
                height: "var(--preview-icon-lg)",
                borderRadius: "var(--preview-radius-sm)",
                background: `var(--preview-color-${role})`,
                border:
                  index === 0
                    ? "var(--preview-border-strong) solid var(--preview-color-foreground)"
                    : "var(--preview-border-thin) solid var(--preview-color-border)",
              }}
            />
          ))}
        </div>
        <div style={{ ...row, gap: "var(--preview-space-sm)" }}>
          <div style={{ ...fieldChrome(), ...monoType }}>{"#"}3b82f6</div>
          <span
            style={{
              width: "var(--preview-control-height-md)",
              height: "var(--preview-control-height-md)",
              borderRadius: "var(--preview-radius-md)",
              border:
                "var(--preview-border-thin) solid var(--preview-color-border)",
              background: "var(--preview-color-primary)",
            }}
          />
        </div>
      </div>
    </PreviewSurface>
  );
}

export function TagInputPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div
        style={{
          ...row,
          ...fieldChrome(),
          gap: "var(--preview-space-xs)",
        }}
      >
        {["design", "tokens"].map((tag) => (
          <span
            key={tag}
            style={{
              ...captionType,
              padding: "0 var(--preview-space-xs)",
              borderRadius: "var(--preview-radius-sm)",
              background: "var(--preview-color-muted)",
              color: "var(--preview-color-mutedForeground)",
            }}
          >
            {tag} ✕
          </span>
        ))}
        <span style={muted}>Add a tag…</span>
      </div>
    </PreviewSurface>
  );
}

export function CountdownPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={row}>
          <span style={captionType}>Offer ends in</span>
          <span
            style={{ ...monoType, fontSize: "var(--preview-text-label-size)" }}
          >
            01:30
          </span>
        </div>
        <div style={row}>
          <span style={captionType}>Release in</span>
          <span style={{ ...monoType, ...muted }}>1d 01:00:00</span>
        </div>
      </div>
    </PreviewSurface>
  );
}

export function CarouselPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div
        style={{
          maxWidth: "20rem",
          background: "var(--preview-color-card)",
          border:
            "var(--preview-border-thin) solid var(--preview-color-border)",
          borderRadius: "var(--preview-radius-lg)",
          padding: "var(--preview-space-lg)",
          ...column,
          gap: "var(--preview-space-xs)",
        }}
      >
        <span style={{ ...labelType, fontWeight: 600 }}>Workspace preview</span>
        <span style={captionType}>
          Panels, tabs and a persisted layout in one frame.
        </span>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <span style={{ ...monoType, ...muted }}>‹</span>
          <span style={captionType}>1 of 3</span>
          <span style={{ ...monoType, ...muted }}>›</span>
        </div>
      </div>
    </PreviewSurface>
  );
}

export function InlineEditPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <span
          style={{
            ...labelType,
            borderBottom:
              "var(--preview-border-thin) dashed var(--preview-color-border)",
          }}
        >
          Untitled workspace
        </span>
        <span style={captionType}>
          Click to rename · Enter commits · Esc cancels
        </span>
      </div>
    </PreviewSurface>
  );
}

const shortcuts = [
  { label: "New file", chord: ["mod", "n"] },
  { label: "Save", chord: ["mod", "s"] },
  { label: "Go to line", chord: ["ctrl", "g"] },
] as const;

const glyphs: Readonly<Record<string, string>> = {
  mod: "⌘",
  ctrl: "Ctrl",
};

export function KeycapPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <span style={{ ...labelType, fontWeight: 600 }}>File</span>
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.label}
            style={{
              ...row,
              justifyContent: "space-between",
              maxWidth: "18rem",
            }}
          >
            <span style={labelType}>{shortcut.label}</span>
            <span style={row}>
              {shortcut.chord.map((key) => (
                <kbd key={key} style={keycap}>
                  {glyphs[key] ?? key.toUpperCase()}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

export function TimePickerPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...row, gap: "var(--preview-space-xs)" }}>
        <div style={{ ...fieldChrome(), ...monoType }}>09</div>
        <span style={{ ...monoType, ...muted }}>:</span>
        <div style={{ ...fieldChrome(), ...monoType }}>30</div>
        <span style={muted}>✕</span>
      </div>
    </PreviewSurface>
  );
}

const messages = [
  "The build finished in 12.4 s.",
  "Two tests were skipped.",
  "Deploying to production…",
] as const;

export function MessageScrollerPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={{ ...column, maxWidth: "22rem" }}>
        {messages.map((message) => (
          <span
            key={message}
            style={{
              ...captionType,
              padding: "var(--preview-space-xs) var(--preview-space-sm)",
              borderRadius: "var(--preview-radius-md)",
              background: "var(--preview-color-muted)",
            }}
          >
            {message}
          </span>
        ))}
        <span
          style={{
            ...captionType,
            alignSelf: "flex-start",
            padding: "0 var(--preview-space-sm)",
            lineHeight: "var(--preview-control-height-sm)",
            borderRadius: "var(--preview-radius-md)",
            border:
              "var(--preview-border-thin) solid var(--preview-color-border)",
          }}
        >
          Jump to latest · 2 new
        </span>
      </div>
    </PreviewSurface>
  );
}

export function PreviewCardPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div
        style={{
          maxWidth: "18rem",
          background: "var(--preview-color-popover)",
          color: "var(--preview-color-popoverForeground)",
          border:
            "var(--preview-border-thin) solid var(--preview-color-border)",
          borderRadius: "var(--preview-radius-lg)",
          boxShadow: "var(--preview-shadow-md)",
          padding: "var(--preview-space-md)",
          ...column,
          gap: "var(--preview-space-xs)",
        }}
      >
        <span style={{ ...labelType, fontWeight: 600 }}>design-system.md</span>
        <span style={captionType}>
          Tokens, semantic roles and the theme extension mechanism.
        </span>
        <span style={{ ...captionType, color: "var(--preview-color-primary)" }}>
          Open file
        </span>
      </div>
    </PreviewSurface>
  );
}

/** Registered by `approximations.tsx`; one entry per supplement page. */
export const supplementPreviews: Readonly<
  Array<[string, (props: PreviewProps) => ReactElement]>
> = [
  ["time-picker", TimePickerPreview],
  ["message-scroller", MessageScrollerPreview],
  ["fieldset", FieldsetPreview],
  ["form", FormPreview],
  ["preview-card", PreviewCardPreview],
  ["stepper", StepperPreview],
  ["timeline", TimelinePreview],
  ["color-picker", ColorPickerPreview],
  ["tag-input", TagInputPreview],
  ["countdown", CountdownPreview],
  ["carousel", CarouselPreview],
  ["inline-edit", InlineEditPreview],
  ["keycap", KeycapPreview],
];

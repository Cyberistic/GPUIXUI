import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { Theme } from "@gpuixui/tokens";
import { PreviewSurface } from "./theme-surface";

/**
 * Tier-A previews: labelled browser approximations of a delivered component's
 * rest layout (plan 412, plan 434). They read the whole active `Theme` through
 * `PreviewSurface`, so the platform toggle re-renders them and a future
 * per-platform palette reaches them with no edit here.
 *
 * They are deliberately not interactive: tier A may show static
 * layout/typography/spacing, never an interaction presented as native
 * behaviour.
 */

export interface PreviewProps {
  /** A resolved theme, for tests and the Theming showcase. */
  readonly theme?: Theme;
}

const labelType: CSSProperties = {
  fontSize: "var(--preview-text-label-size)",
  lineHeight: "var(--preview-text-label-leading)",
  fontWeight: "var(--preview-text-label-weight)",
  fontFamily: "var(--preview-font-sans)",
};

const captionType: CSSProperties = {
  fontSize: "var(--preview-text-caption-size)",
  lineHeight: "var(--preview-text-caption-leading)",
  fontWeight: "var(--preview-text-caption-weight)",
  fontFamily: "var(--preview-font-sans)",
  color: "var(--preview-color-muted-foreground)",
};

const monoType: CSSProperties = {
  fontFamily: "var(--preview-font-mono)",
  fontSize: "var(--preview-text-code-size)",
  lineHeight: "var(--preview-text-code-leading)",
};

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "var(--preview-space-sm)",
};

const column: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--preview-space-md)",
};

const keycap: CSSProperties = {
  ...monoType,
  padding: "0 var(--preview-space-xs)",
  border: "var(--preview-border-thin) solid var(--preview-color-border)",
  borderRadius: "var(--preview-radius-sm)",
  color: "var(--preview-color-muted-foreground)",
};

const control = (variant: ButtonVariant, size: ButtonSize = "md") => {
  const heights = {
    sm: "var(--preview-control-height-sm)",
    md: "var(--preview-control-height-md)",
    lg: "var(--preview-control-height-lg)",
  } as const;
  const padding = {
    sm: "var(--preview-control-padding-x-sm)",
    md: "var(--preview-control-padding-x-md)",
    lg: "var(--preview-control-padding-x-lg)",
  } as const;
  return {
    ...labelType,
    ...variantStyle[variant],
    height: heights[size],
    padding: `0 ${padding[size]}`,
  };
};

interface VariantLook {
  readonly background?: string;
  readonly color: string;
  readonly border?: string;
  readonly textDecoration?: string;
}

const variantStyle: Readonly<Record<ButtonVariant, VariantLook>> = {
  primary: {
    background: "var(--preview-color-primary)",
    color: "var(--preview-color-primary-foreground)",
  },
  secondary: {
    background: "var(--preview-color-secondary)",
    color: "var(--preview-color-secondary-foreground)",
  },
  outline: {
    color: "var(--preview-color-foreground)",
    border: "var(--preview-border-thin) solid var(--preview-color-border)",
  },
  ghost: { color: "var(--preview-color-foreground)" },
  destructive: {
    background: "var(--preview-color-destructive)",
    color: "var(--preview-color-destructive-foreground)",
  },
  link: {
    color: "var(--preview-color-primary)",
    textDecoration: "underline",
  },
};

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

/** A non-interactive span with the button's geometry and role colours. */
function Button({
  variant = "primary",
  size = "md",
  children,
}: {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly children: ReactNode;
}) {
  return (
    <span
      style={{
        ...control(variant, size),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--preview-radius-md)",
        boxSizing: "border-box",
      }}
    >
      {children}
    </span>
  );
}

export function ButtonPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div style={row}>
          <Button variant="primary">Save changes</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="link">Learn more</Button>
        </div>
        <div style={row}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <span style={{ ...control("primary"), opacity: 0.5 }}>Disabled</span>
          <span style={{ ...row, ...captionType }}>
            <kbd style={keycap}>Enter</kbd> activates on key down
          </span>
        </div>
      </div>
    </PreviewSurface>
  );
}

const tabs = [
  { label: "Overview", selected: true },
  { label: "Members", selected: false },
  { label: "Settings", selected: false },
] as const;

export function TabsPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div style={column}>
        <div
          style={{
            ...row,
            gap: "var(--preview-space-lg)",
            borderBottom:
              "var(--preview-border-thin) solid var(--preview-color-border)",
          }}
        >
          {tabs.map((tab) => (
            <span
              key={tab.label}
              style={{
                ...labelType,
                padding: "var(--preview-space-sm) 0",
                color: tab.selected
                  ? "var(--preview-color-primary)"
                  : "var(--preview-color-muted-foreground)",
                borderBottom: tab.selected
                  ? "var(--preview-border-strong) solid var(--preview-color-primary)"
                  : "var(--preview-border-strong) solid transparent",
              }}
            >
              {tab.label}
            </span>
          ))}
        </div>
        <div style={{ ...captionType, ...row }}>
          <span>Overview panel</span>
          <kbd style={keycap}>← →</kbd>
          <span>moves the tab stop</span>
        </div>
      </div>
    </PreviewSurface>
  );
}

const menuRows = [
  { label: "Command palette", shortcut: "⌘K", tone: "normal" },
  { label: "Open settings", shortcut: "⇧⌘P", tone: "normal" },
  { label: "Delete workspace", shortcut: "⌫", tone: "destructive" },
] as const;

export function MenuPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div
        style={{
          maxWidth: "18rem",
          background: "var(--preview-color-popover)",
          color: "var(--preview-color-popover-foreground)",
          border:
            "var(--preview-border-thin) solid var(--preview-color-border)",
          borderRadius: "var(--preview-radius-lg)",
          boxShadow: "var(--preview-shadow-md)",
          padding: "var(--preview-space-xs)",
          ...column,
          gap: 0,
        }}
      >
        {menuRows.map((item, index) => (
          <span
            key={item.label}
            style={{
              ...labelType,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--preview-space-md)",
              height: "var(--preview-row-height)",
              padding: "0 var(--preview-space-sm)",
              borderRadius: "var(--preview-radius-sm)",
              background:
                index === 0 ? "var(--preview-color-selected)" : "transparent",
              color:
                item.tone === "destructive"
                  ? "var(--preview-color-destructive)"
                  : index === 0
                    ? "var(--preview-color-selected-foreground)"
                    : "var(--preview-color-popover-foreground)",
            }}
          >
            <span>{item.label}</span>
            <kbd style={{ ...keycap, border: "none" }}>{item.shortcut}</kbd>
          </span>
        ))}
      </div>
    </PreviewSurface>
  );
}

export function CardPreview({ theme }: PreviewProps) {
  return (
    <PreviewSurface theme={theme}>
      <div
        style={{
          maxWidth: "22rem",
          background: "var(--preview-color-card)",
          color: "var(--preview-color-card-foreground)",
          border:
            "var(--preview-border-thin) solid var(--preview-color-border)",
          borderRadius: "var(--preview-radius-lg)",
          boxShadow: "var(--preview-shadow-sm)",
        }}
      >
        <div
          style={{
            padding: "var(--preview-space-lg)",
            borderBottom:
              "var(--preview-border-thin) solid var(--preview-color-border)",
            ...column,
            gap: "var(--preview-space-xs)",
          }}
        >
          <span style={{ ...labelType, fontWeight: 600 }}>Project access</span>
          <span style={captionType}>Three people can edit this workspace.</span>
        </div>
        <div style={{ padding: "var(--preview-space-lg)", ...captionType }}>
          <code style={monoType}>nub run --filter @gpuixui/basic-app dev</code>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "var(--preview-space-md) var(--preview-space-lg)",
            borderTop:
              "var(--preview-border-thin) solid var(--preview-color-border)",
          }}
        >
          <Button size="sm">Manage access</Button>
        </div>
      </div>
    </PreviewSurface>
  );
}

/**
 * The preview registry, keyed by the component registry's slug. A slug outside
 * the component registry is a test failure (`component-preview.test.tsx`), so a
 * page cannot invent a component preview.
 */
export const previewsBySlug: ReadonlyMap<
  string,
  (props: PreviewProps) => ReactElement
> = new Map([
  ["button", ButtonPreview],
  ["tabs", TabsPreview],
  ["dropdown-menu", MenuPreview],
  ["card", CardPreview],
]);

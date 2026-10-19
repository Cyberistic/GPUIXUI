import type { ReactElement, ReactNode } from "react";
import {
  CheckboxPreview,
  MeterPreview,
  NumberFieldPreview,
  OTPFieldPreview,
  RadioGroupPreview,
  RangeSliderPreview,
  RatingPreview,
  SelectPreview,
  SliderPreview,
  SwitchPreview,
  TextAreaPreview,
  TextInputPreview,
  TogglePreview,
} from "./control-previews";
import {
  AccordionPreview,
  BreadcrumbPreview,
  CollapsiblePreview,
  EmptyStatePreview,
  InlineValidationPreview,
  ListPreview,
  PaginationPreview,
  SearchInputPreview,
} from "./composition-previews";
import {
  AlertPreview,
  AvatarPreview,
  BadgePreview,
  ProgressPreview,
} from "./feedback-previews";
import {
  BoxPreview,
  ButtonGroupPreview,
  LabelPreview,
  SeparatorPreview,
  SpacerPreview,
  StackPreview,
  TextPreview,
} from "./layout-previews";
import {
  captionType,
  column,
  keycap,
  labelType,
  monoType,
  row,
  type PreviewProps,
} from "./preview-styles";
import { supplementPreviews } from "./supplement-previews";
import { PreviewSurface } from "./theme-surface";

/**
 * Tier-A previews: labelled browser approximations of a delivered component's
 * rest layout (plan 412, plans 434 and 449). They read the whole active `Theme`
 * through `PreviewSurface`, so the platform toggle re-renders them and a future
 * per-platform palette reaches them with no edit here.
 *
 * They are deliberately not interactive: tier A may show static
 * layout/typography/spacing, never an interaction presented as native
 * behaviour.
 */

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
    color: "var(--preview-color-primaryForeground)",
  },
  secondary: {
    background: "var(--preview-color-secondary)",
    color: "var(--preview-color-secondaryForeground)",
  },
  outline: {
    color: "var(--preview-color-foreground)",
    border: "var(--preview-border-thin) solid var(--preview-color-border)",
  },
  ghost: { color: "var(--preview-color-foreground)" },
  destructive: {
    background: "var(--preview-color-destructive)",
    color: "var(--preview-color-destructiveForeground)",
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

export function ButtonPreview({ theme, locked }: PreviewProps) {
  return (
    <PreviewSurface theme={theme} locked={locked}>
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
          <span
            style={{ ...control("primary"), opacity: 0.5 }}
            aria-disabled="true"
          >
            Disabled
          </span>
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
                  : "var(--preview-color-mutedForeground)",
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
          color: "var(--preview-color-popoverForeground)",
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
                    ? "var(--preview-color-selectedForeground)"
                    : "var(--preview-color-popoverForeground)",
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
          color: "var(--preview-color-cardForeground)",
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
  ["text-input", TextInputPreview],
  ["checkbox", CheckboxPreview],
  ["switch", SwitchPreview],
  ["slider", SliderPreview],
  ["badge", BadgePreview],
  ["alert", AlertPreview],
  ["progress", ProgressPreview],
  ["avatar", AvatarPreview],
  ["text-area", TextAreaPreview],
  ["radio-group", RadioGroupPreview],
  ["select", SelectPreview],
  ["range-slider", RangeSliderPreview],
  ["meter", MeterPreview],
  ["number-field", NumberFieldPreview],
  ["otp-field", OTPFieldPreview],
  ["toggle", TogglePreview],
  ["rating", RatingPreview],
  ["list", ListPreview],
  ["empty-state", EmptyStatePreview],
  ["inline-validation", InlineValidationPreview],
  ["breadcrumb", BreadcrumbPreview],
  ["pagination", PaginationPreview],
  ["search-input", SearchInputPreview],
  ["accordion", AccordionPreview],
  ["collapsible", CollapsiblePreview],
  ["text", TextPreview],
  ["separator", SeparatorPreview],
  ["spacer", SpacerPreview],
  ["stack", StackPreview],
  ["box", BoxPreview],
  ["button-group", ButtonGroupPreview],
  ["label", LabelPreview],
  ...supplementPreviews,
]);

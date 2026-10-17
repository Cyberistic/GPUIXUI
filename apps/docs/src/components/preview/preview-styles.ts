import type { CSSProperties } from "react";
import type { Theme } from "@gpuixui/tokens";

/**
 * Shared paint for the tier-A previews (plan 412, plan 434, plan 449).
 *
 * Every value is a `--preview-*` custom property supplied by `PreviewSurface`
 * from the active `Theme`; no colour, space or radius is written here. The
 * pieces below are what several previews agree on — a type role, a row, a field
 * box — so a control preview does not re-implement the surface's chrome.
 */

export interface PreviewProps {
  /** A resolved theme, for tests and the Theming showcase. */
  readonly theme?: Theme;
}

export const labelType: CSSProperties = {
  fontSize: "var(--preview-text-label-size)",
  lineHeight: "var(--preview-text-label-leading)",
  fontWeight: "var(--preview-text-label-weight)",
  fontFamily: "var(--preview-font-sans)",
};

export const captionType: CSSProperties = {
  fontSize: "var(--preview-text-caption-size)",
  lineHeight: "var(--preview-text-caption-leading)",
  fontWeight: "var(--preview-text-caption-weight)",
  fontFamily: "var(--preview-font-sans)",
  color: "var(--preview-color-mutedForeground)",
};

export const bodyType: CSSProperties = {
  fontSize: "var(--preview-text-body-size)",
  lineHeight: "var(--preview-text-body-leading)",
  fontWeight: "var(--preview-text-body-weight)",
  fontFamily: "var(--preview-font-sans)",
};

export const monoType: CSSProperties = {
  fontFamily: "var(--preview-font-mono)",
  fontSize: "var(--preview-text-code-size)",
  lineHeight: "var(--preview-text-code-leading)",
};

export const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "var(--preview-space-sm)",
};

export const column: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--preview-space-md)",
};

export const keycap: CSSProperties = {
  ...monoType,
  padding: "0 var(--preview-space-xs)",
  border: "var(--preview-border-thin) solid var(--preview-color-border)",
  borderRadius: "var(--preview-radius-sm)",
  color: "var(--preview-color-mutedForeground)",
};

/** The chrome `Input` and `TextArea` draw, with the invalid and disabled states. */
export const fieldChrome = (
  state: { readonly invalid?: boolean; readonly disabled?: boolean } = {},
): CSSProperties => ({
  ...labelType,
  display: "flex",
  alignItems: "center",
  height: "var(--preview-control-height-md)",
  paddingLeft: "var(--preview-control-padding-x-md)",
  paddingRight: "var(--preview-control-padding-x-md)",
  borderRadius: "var(--preview-radius-md)",
  border: `var(--preview-border-thin) solid ${
    state.invalid === true
      ? "var(--preview-color-destructive)"
      : "var(--preview-color-border)"
  }`,
  backgroundColor: "var(--preview-color-input)",
  color: "var(--preview-color-inputForeground)",
  opacity: state.disabled === true ? 0.5 : 1,
});

/** One labelled row: a control and the text that names it. */
export const fieldRow: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--preview-space-2xs)",
};

/** Spacing scale in pixels, shared by padding, margin and gap. */
export interface Spacing {
  /** 2px — hairline separation. */
  readonly "2xs": number;
  /** 4px. */
  readonly xs: number;
  /** 6px. */
  readonly sm: number;
  /** 8px — default inner spacing. */
  readonly md: number;
  /** 12px. */
  readonly lg: number;
  /** 16px — default section padding. */
  readonly xl: number;
  /** 24px. */
  readonly "2xl": number;
  /** 32px. */
  readonly "3xl": number;
  /** 48px. */
  readonly "4xl": number;
  /** 64px — page-level separation. */
  readonly "5xl": number;
}

/** Default spacing scale. */
export const spacing: Spacing = {
  "2xs": 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  "3xl": 32,
  "4xl": 48,
  "5xl": 64,
};

/** Corner radius scale in pixels. */
export interface Radius {
  /** Square corners. */
  readonly none: number;
  /** 4px — small controls and tags. */
  readonly sm: number;
  /** 6px — default controls. */
  readonly md: number;
  /** 8px — cards and popovers. */
  readonly lg: number;
  /** 12px — dialogs and large surfaces. */
  readonly xl: number;
  /** As round as the shape allows (pills, avatars). */
  readonly full: number;
}

/** Default radius scale. */
export const radius: Radius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
};

/** Border thickness in pixels. */
export interface BorderWidth {
  /** Decorative dividers and default control borders. */
  readonly thin: number;
  /** Emphasis and focus outlines. */
  readonly strong: number;
}

/** Default border widths. */
export const borderWidth: BorderWidth = { thin: 1, strong: 2 };

/** Square icon sizes in pixels. */
export interface IconSize {
  /** 12px — inline with caption text. */
  readonly xs: number;
  /** 14px — inline with label text. */
  readonly sm: number;
  /** 16px — default control icon. */
  readonly md: number;
  /** 20px — toolbar icon. */
  readonly lg: number;
  /** 24px — navigation and empty-state icon. */
  readonly xl: number;
}

/** Default icon sizes. */
export const iconSize: IconSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 };

/** Diameters for identity marks (avatars) in pixels. */
export interface AvatarSize {
  /** 20px — inline with a dense row. */
  readonly xs: number;
  /** 26px. */
  readonly sm: number;
  /** 32px — the default. */
  readonly md: number;
  /** 40px — profile headers and detail panes. */
  readonly lg: number;
}

/** Default avatar diameters. */
export const avatarSize: AvatarSize = { xs: 20, sm: 26, md: 32, lg: 40 };

/**
 * Named control density presets, in documentation order. `DensityName` derives
 * from this list, so a new preset must also gain a value in `densityPresets`.
 */
export const densityNames = ["compact", "comfortable", "spacious"] as const;

/** A named control density preset. */
export type DensityName = (typeof densityNames)[number];

/**
 * Narrow an unknown value — a stored preference or a settings row — to a shipped
 * density preset. A consumer never retypes the three names.
 */
export const isDensityName = (value: unknown): value is DensityName =>
  densityNames.some((name) => name === value);

/** Control sizes every interactive component supports. */
export type ControlSize = "sm" | "md" | "lg";

/** Density-dependent control metrics. Spacing and type are unaffected. */
export interface Density {
  /** Preset name, or the base preset name for a partially overridden density. */
  readonly name: DensityName;
  /** Control and input height per size. */
  readonly controlHeight: Readonly<Record<ControlSize, number>>;
  /** Horizontal control padding per size. */
  readonly controlPaddingX: Readonly<Record<ControlSize, number>>;
  /** Table, list, menu and tree row height. */
  readonly rowHeight: number;
}

/** Density presets. Compact is for dense desktop workspaces. */
export const densityPresets: Readonly<Record<DensityName, Density>> = {
  compact: {
    name: "compact",
    controlHeight: { sm: 24, md: 28, lg: 32 },
    controlPaddingX: { sm: 6, md: 8, lg: 10 },
    rowHeight: 28,
  },
  comfortable: {
    name: "comfortable",
    controlHeight: { sm: 28, md: 32, lg: 36 },
    controlPaddingX: { sm: 8, md: 10, lg: 12 },
    rowHeight: 32,
  },
  spacious: {
    name: "spacious",
    controlHeight: { sm: 32, md: 36, lg: 40 },
    controlPaddingX: { sm: 10, md: 12, lg: 14 },
    rowHeight: 36,
  },
};

/** Default density. */
export const defaultDensity: Density = densityPresets.comfortable;

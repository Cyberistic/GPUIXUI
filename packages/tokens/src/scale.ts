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
 * Fixed surface metrics shared by components. Unlike `Density`, these do not
 * change with density: an overlay keeps its width and a field its adornment
 * when the workspace gets denser.
 */
export interface Dimensions {
  /** 180px — the narrowest menu surface. */
  readonly overlayMinWidth: number;
  /** 220px — default popover, combobox and calendar width. */
  readonly overlayWidth: number;
  /** 320px — the height at which a long overlay list starts to scroll. */
  readonly overlayMaxHeight: number;
  /** 200px — the narrowest field that still shows a query and an action. */
  readonly fieldMinWidth: number;
  /** 16px — an icon or clear control inside a field. */
  readonly fieldAdornmentSize: number;
  /** 80px — the minimum content width of a token-input chip. */
  readonly chipMinWidth: number;
  /** 380px — the fixed width of a toast card. */
  readonly toastWidth: number;
  /** 240px — the narrowest preview card. */
  readonly previewCardMinWidth: number;
  /** 360px — the widest preview card. */
  readonly previewCardMaxWidth: number;
  /** 20px — the fixed keycap a shortcut label sits in. */
  readonly keycapSize: number;
  /** 320px — a small drawer's width. */
  readonly drawerWidthSm: number;
  /** 400px — the default drawer width. */
  readonly drawerWidthMd: number;
  /** 560px — a large drawer's width. */
  readonly drawerWidthLg: number;
  /** 240px — a small bottom drawer's height. */
  readonly drawerHeightSm: number;
  /** 320px — the default bottom drawer's height. */
  readonly drawerHeightMd: number;
  /** 420px — a large bottom drawer's height. */
  readonly drawerHeightLg: number;
  /** 160px — the shortest message viewport. */
  readonly chatViewportMinHeight: number;
  /** 8px — an inactive carousel indicator. */
  readonly carouselIndicatorSize: number;
  /** 18px — the active carousel indicator's width. */
  readonly carouselIndicatorActiveWidth: number;
}

/** Default component dimensions. */
export const dimensions: Dimensions = {
  overlayMinWidth: 180,
  overlayWidth: 220,
  overlayMaxHeight: 320,
  fieldMinWidth: 200,
  fieldAdornmentSize: 16,
  chipMinWidth: 80,
  toastWidth: 380,
  previewCardMinWidth: 240,
  previewCardMaxWidth: 360,
  keycapSize: 20,
  drawerWidthSm: 320,
  drawerWidthMd: 400,
  drawerWidthLg: 560,
  drawerHeightSm: 240,
  drawerHeightMd: 320,
  drawerHeightLg: 420,
  chatViewportMinHeight: 160,
  carouselIndicatorSize: 8,
  carouselIndicatorActiveWidth: 18,
};

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

/**
 * Control sizes every interactive component supports, in documentation order.
 * `ControlSize` derives from this list, so a new size must also gain a value in
 * every density preset.
 */
export const controlSizes = ["sm", "md", "lg"] as const;

/** A control size accepted by every interactive component. */
export type ControlSize = (typeof controlSizes)[number];

/**
 * Narrow an unknown value — a stored preference or a URL parameter — to a
 * control size. A consumer never retypes the three names.
 */
export const isControlSize = (value: unknown): value is ControlSize =>
  controlSizes.some((size) => size === value);

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

/**
 * Partial density metrics. A size-keyed record merges size by size, so an
 * omitted size keeps the base preset's value; `rowHeight` is a single metric.
 * The preset's name is never overridable — a metric override is still the base
 * preset with edits.
 */
export interface DensityOverrides {
  readonly controlHeight?: Partial<Readonly<Record<ControlSize, number>>>;
  readonly controlPaddingX?: Partial<Readonly<Record<ControlSize, number>>>;
  readonly rowHeight?: number;
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

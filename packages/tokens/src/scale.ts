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

/**
 * The spacing steps, in the order the scale is documented.
 *
 * A spacing step is a stored choice as often as a literal — a saved panel's
 * inset, a restored toolbar's gap, a spacer in a layout record — so a value
 * restored from storage is `unknown` and this index is what a consumer narrows
 * it with, without retyping the union or casting the value. It is the **release's
 * vocabulary**: whether the active theme paints a step is the theme's question,
 * and a paint seam that needs the number asks its own scale (the primitives'
 * `spaceStep` reads the theme's group, and `missingTokens` refuses a theme that
 * lost one).
 */
export const spacingSteps = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const satisfies readonly (keyof Spacing)[];

/** A step of the spacing scale, by name. */
export type SpacingStep = (typeof spacingSteps)[number];

/**
 * A spacing step the index forgets, as a build error.
 *
 * The scale is the source of truth for its steps and the index is how a stored
 * one is narrowed, so a step added to `Spacing` without a line here would be a
 * step no consumer can narrow. The assignment below fails the package's type
 * check with the missing step named.
 */
type EverySpacingStepListed<Listed extends SpacingStep> =
  Exclude<keyof Spacing, Listed> extends never
    ? true
    : [
        "a spacing step is missing from the index",
        Exclude<keyof Spacing, Listed>,
      ];

const spacingIndex: EverySpacingStepListed<(typeof spacingSteps)[number]> =
  true;
// Keep the guard live under `noUnusedLocals`; the value is never produced.
void spacingIndex;

/**
 * Narrow unknown input — a restored inset, a saved layout's gap — to a step of
 * this release's spacing scale.
 *
 * Membership is the index's, not the record's: `name in spacing` also answers
 * true for the names `Object.prototype` carries (`toString`, `constructor`), so
 * a persisted name would pass the guard and the lookup would hand the runtime a
 * method where a length belongs.
 */
export const isSpacingStep = (value: unknown): value is SpacingStep =>
  spacingSteps.some((step) => step === value);

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

/**
 * The corners of the radius scale, in the order the scale is documented.
 *
 * A corner is a stored choice as often as a literal — a saved panel's radius,
 * a restored placeholder's shape — so this is the index a consumer narrows a
 * restored value with, beside {@link isRadiusStep}. As with the spacing scale it
 * is the **release's vocabulary**: a theme still owns which numbers it paints
 * (a theme a store truncated paints the library's number for a step it lost, and
 * a name no release carries has no number at all).
 */
export const radiusSteps = [
  "none",
  "sm",
  "md",
  "lg",
  "xl",
  "full",
] as const satisfies readonly (keyof Radius)[];

/** A corner of the radius scale, by name. */
export type RadiusStep = (typeof radiusSteps)[number];

/**
 * A corner the index forgets, as a build error — the spacing index's rule.
 */
type EveryRadiusStepListed<Listed extends RadiusStep> =
  Exclude<keyof Radius, Listed> extends never
    ? true
    : [
        "a radius step is missing from the index",
        Exclude<keyof Radius, Listed>,
      ];

const radiusIndex: EveryRadiusStepListed<(typeof radiusSteps)[number]> = true;
// Keep the guard live under `noUnusedLocals`; the value is never produced.
void radiusIndex;

/**
 * Narrow unknown input — a restored corner, a saved panel's radius — to a corner
 * of this release's radius scale.
 *
 * The index's membership, not the record's, for the reason {@link isSpacingStep}
 * states: `name in radius` answers true for `toString` too.
 */
export const isRadiusStep = (value: unknown): value is RadiusStep =>
  radiusSteps.some((step) => step === value);

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

/**
 * The icon steps, in the order the scale is documented.
 *
 * A glyph's size is a stored choice as often as a literal — a saved toolbar's
 * density, a restored inspector row, a settings row that says how large its
 * icons are — so a value restored from storage is `unknown` and this index is
 * what a consumer narrows it with. It is the argument an `Icon`'s `size` prop
 * takes, and the scale it selects is a theme group: a brand can change a step
 * with `extendTheme`, so the index is the **release's vocabulary** rather than
 * the numbers a theme paints.
 */
export const iconSizes = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
] as const satisfies readonly (keyof IconSize)[];

/** A step of the icon scale, by name. */
export type IconStep = (typeof iconSizes)[number];

/**
 * An icon step the index forgets, as a build error — the spacing index's rule.
 */
type EveryIconStepListed<Listed extends IconStep> =
  Exclude<keyof IconSize, Listed> extends never
    ? true
    : [
        "an icon step is missing from the index",
        Exclude<keyof IconSize, Listed>,
      ];

const iconIndex: EveryIconStepListed<(typeof iconSizes)[number]> = true;
// Keep the guard live under `noUnusedLocals`; the value is never produced.
void iconIndex;

/**
 * Narrow unknown input — a saved toolbar's icon size, a restored row's — to a
 * step of this release's icon scale.
 *
 * The index's membership, not the record's, for the reason {@link isSpacingStep}
 * states: `name in iconSize` answers true for `toString` too, and the lookup
 * would hand the renderer a method where a pixel count belongs.
 */
export const isIconSize = (value: unknown): value is IconStep =>
  iconSizes.some((step) => step === value);

/** Diameters for identity marks (avatars), in pixels. */
export interface AvatarSize {
  /** 20px — inline with a dense row. */
  readonly xs: number;
  /** 26px — inline with body text. */
  readonly sm: number;
  /** 32px — the default. */
  readonly md: number;
  /** 40px — profile headers and detail panes. */
  readonly lg: number;
}

/**
 * Default avatar diameters.
 *
 * A fixed scale, not a theme group: the four steps are the contract between a
 * component's `size` prop and the layouts an avatar sits in, and an identity
 * mark is content — like an image — rather than chrome, so it follows neither
 * the theme nor density.
 */
export const avatarSize: AvatarSize = { xs: 20, sm: 26, md: 32, lg: 40 };

/**
 * The avatar steps, in documentation order.
 *
 * The index a size picker iterates and the guard reads, so a stored diameter —
 * a saved contact list's density, a settings row's preview — is narrowed
 * without retyping the four names or casting the value. It is the fixed
 * scale's own keys in the order the catalogue prints them.
 */
export const avatarSizes = [
  "xs",
  "sm",
  "md",
  "lg",
] as const satisfies readonly (keyof AvatarSize)[];

/** A step of the avatar scale, by name. */
export type AvatarSizeName = (typeof avatarSizes)[number];

/**
 * An avatar step the index forgets, as a build error — the spacing index's rule.
 *
 * The scale is fixed rather than a theme group, so its steps are the whole
 * persisted vocabulary a contact list or a settings row can name: a step added
 * to `AvatarSize` without a line here would be a stored name no guard can
 * narrow and no resolver answers.
 */
type EveryAvatarStepListed<Listed extends AvatarSizeName> =
  Exclude<keyof AvatarSize, Listed> extends never
    ? true
    : [
        "an avatar step is missing from the index",
        Exclude<keyof AvatarSize, Listed>,
      ];

const avatarIndex: EveryAvatarStepListed<(typeof avatarSizes)[number]> = true;
// Keep the guard live under `noUnusedLocals`; the value is never produced.
void avatarIndex;

/**
 * Narrow unknown input — a stored avatar size — to a step of the scale.
 *
 * Membership is the index's, not the record's: `name in avatarSize` also
 * answers true for the names `Object.prototype` carries (`toString`,
 * `constructor`), so a persisted name would pass the guard and the lookup would
 * hand the runtime a method where a diameter belongs.
 */
export const isAvatarSize = (value: unknown): value is AvatarSizeName =>
  avatarSizes.some((step) => step === value);

/**
 * The diameter an avatar size names.
 *
 * `size` is as often a saved preference as a literal, so a name this release
 * does not ship reads as the default `md` — the rule `iconPixels` follows. A
 * bare lookup answered `undefined`, which the renderer drops, so the mark
 * painted with no side.
 */
export const avatarPixels = (size: unknown): number =>
  isAvatarSize(size) ? avatarSize[size] : avatarSize.md;

/**
 * Pressable-target floors in pixels.
 *
 * A control may paint smaller than its pressable box — a checkbox draws at an
 * icon step, a tree chevron is a 14px glyph — but the area a pointer must hit
 * has a floor. Fixed, not a theme group: a floor is an accessibility contract,
 * and a brand that could lower it would make the library's own components
 * non-conforming.
 */
export interface TargetSize {
  /** 24px — the floor every pointer target keeps (WCAG 2.2 SC 2.5.8, AA). */
  readonly minimum: number;
  /** 44px — a touch-first surface's floor (WCAG 2.1 SC 2.5.5, AAA). */
  readonly comfortable: number;
}

/** Default pressable-target floors. */
export const targetSize: TargetSize = { minimum: 24, comfortable: 44 };

/**
 * Padding each side of a `visual`-sized control needs to reach `floor`.
 *
 * A control whose painted box is below the floor keeps its drawn size and
 * reserves the difference as padding, so the press target grows without the
 * control looking heavier. Rounding up means a fractional gap never leaves the
 * target short, and two neighbours at this inset have 24px target circles that
 * touch rather than overlap — WCAG 2.2 SC 2.5.8's spacing alternative. The
 * result is `0` when the control already reaches the floor, and for a
 * non-finite size or floor, which cannot describe a box.
 *
 * @example
 * ```ts
 * targetInset(iconSize.md); // 4 — a 16px checkbox needs 4px each side
 * targetInset(iconSize.md, targetSize.comfortable); // 14
 * ```
 */
export function targetInset(
  visual: number,
  floor: number = targetSize.minimum,
): number {
  if (!Number.isFinite(visual) || !Number.isFinite(floor)) {
    return 0;
  }
  return Math.max(0, Math.ceil((floor - visual) / 2));
}

/**
 * Named control density presets, in documentation order. `DensityName` derives
 * from this list, so a new preset must also gain metrics in `densityPresets`.
 */
export const densityNames = ["compact", "comfortable", "spacious"] as const;

/** Named control density presets. */
export type DensityName = (typeof densityNames)[number];

/**
 * Narrow unknown input — a stored preference or a URL parameter — to a density
 * preset. A consumer iterates {@link densityNames} instead of retyping them.
 */
export const isDensityName = (value: unknown): value is DensityName =>
  densityNames.some((name) => name === value);

/**
 * Control sizes every interactive component supports, in documentation order.
 * `ControlSize` derives from this list, so a new size must also gain a metric in
 * every density preset.
 */
export const controlSizes = ["sm", "md", "lg"] as const;

/** Control sizes every interactive component supports. */
export type ControlSize = (typeof controlSizes)[number];

/**
 * Narrow unknown input — a stored preference or a URL parameter — to a control
 * size. A consumer iterates {@link controlSizes} instead of retyping them.
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
  /**
   * The height a **row** is built at: a dense list row
   * (`packages/components/src/list.tsx`), a tree row and its virtual twin
   * (`packages/data/src/tree/row.tsx`, `packages/data/src/virtual/tree.tsx`),
   * a log viewer's row (`packages/files/src/log/log-viewer.tsx`) and the line a
   * scroller moves per arrow key
   * (`packages/primitives/src/components/ScrollArea.tsx`); `@gpuixui/tw` also
   * registers it as its `row-height` utility (`packages/tw/src/calc.ts`). The
   * scroller takes the primitives' `rowHeightOf` seam rather than the group
   * (`packages/primitives/src/core/theme.ts`), which paints this step and the
   * library's row for a theme a store gave back without the group. A **menu**
   * row is a `controlHeight.sm` box
   * (`packages/components/src/menu/item.tsx`) and a data-table row is laid out
   * by its cells, so neither reads this step. Every preset sets it to
   * `controlHeight.md`, so a row and the default control beside it share a
   * height (`scale.test.ts`).
   */
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

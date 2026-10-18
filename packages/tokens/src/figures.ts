import type { ThemeColors } from "./color.js";
import {
  compositeOver,
  contrastRatio,
  inactivePanelActionPairs,
  toastTonePairs,
  trackSurfacePairs,
  type ContrastPair,
} from "./contrast.js";
import type { PlatformRecipeName } from "./platform-recipes.js";
import {
  shippedThemes,
  type PlatformVariant,
  type ShippedTheme,
} from "./shipped-themes.js";
import type { ThemeContrast, ThemeMode } from "./theme.js";

/**
 * A figure `docs/tokens.md` states in the present tense about the shipped
 * package, beside the measurement that produces it.
 *
 * A documented ratio is measured once, quoted in a page, and then left behind
 * when a later plan moves a role: three figures had drifted while every suite
 * stayed green — the Toast's tone margin, the disabled panel action after plan
 * `520` moved `disabledForeground`, and the value groove's "tightest" pair,
 * which `docs.test.ts` measured on one surface while the sentence claimed the
 * whole list. This table derives each figure from {@link shippedThemes} with the
 * same measurement the contrast checker uses, and names the shipped set the
 * sentence points at, so a sentence that names the wrong set fails even when
 * its number is right.
 *
 * Test-shaped source, like `full-set-claims.ts`: it is not part of the package
 * entry, and the suites are its only consumers.
 */

/** How a pair list is measured, matching the contrast checker. */
export type FigureKind =
  /** The foreground role on the background role. */
  | "plain"
  /** The foreground through the composited `selection` wash. */
  | "selection"
  /** The `overlay` wash composited over the background, held to the background. */
  | "overlay";

/** A document a figure is quoted in. */
export type FigureDocument =
  | "COMPONENTS.md"
  | "docs/design-system.md"
  | "docs/tokens.md"
  | "packages/tokens/README.md";

/** Which shipped axis produced a theme, with the axes read from the theme. */
export type ShippedThemeProvenance =
  | {
      readonly source: "identity";
      readonly mode: ThemeMode;
      readonly contrast: ThemeContrast;
    }
  | {
      readonly source: "platform";
      readonly platform: PlatformVariant;
      readonly mode: ThemeMode;
      readonly contrast: ThemeContrast;
    }
  | {
      readonly source: "recipe";
      readonly recipe: PlatformRecipeName;
      readonly mode: ThemeMode;
      readonly contrast: ThemeContrast;
    };

/**
 * What a sentence claims about its set: that it produces the lowest ratio of
 * the list, or that it measures a named pair.
 */
export type FigureClaim = "tightest" | "value";

/** A figure a document quotes, and the list and set it must come from. */
export interface DocumentedFigure {
  readonly document: FigureDocument;
  /** The failure message: what the sentence claims. */
  readonly name: string;
  /** The pair list the sentence measures; one pair when the sentence names one. */
  readonly pairs: ReadonlyArray<ContrastPair>;
  readonly kind: FigureKind;
  readonly claim: FigureClaim;
  /** The shipped set the sentence names. */
  readonly provenance: ShippedThemeProvenance;
  /** The precision the sentence quotes. */
  readonly decimals: number;
  /** The sentence, with `{figure}` where the derived ratio belongs. */
  readonly sentence: string;
}

/** The provenance of one {@link shippedThemes} entry. */
export const provenanceOf = (entry: ShippedTheme): ShippedThemeProvenance =>
  entry.source === "identity"
    ? {
        source: "identity",
        mode: entry.theme.mode,
        contrast: entry.theme.contrast,
      }
    : entry.source === "platform"
      ? {
          source: "platform",
          platform: entry.platform,
          mode: entry.theme.mode,
          contrast: entry.theme.contrast,
        }
      : {
          source: "recipe",
          recipe: entry.recipe,
          mode: entry.theme.mode,
          contrast: entry.theme.contrast,
        };

/** Two provenances name the same shipped set. */
export const sameProvenance = (
  left: ShippedThemeProvenance,
  right: ShippedThemeProvenance,
): boolean => {
  if (
    left.source !== right.source ||
    left.mode !== right.mode ||
    left.contrast !== right.contrast
  ) {
    return false;
  }
  if (left.source === "platform" && right.source === "platform") {
    return left.platform === right.platform;
  }
  if (left.source === "recipe" && right.source === "recipe") {
    return left.recipe === right.recipe;
  }
  return left.source === "identity" && right.source === "identity";
};

const measure = (
  kind: FigureKind,
  [foreground, background]: ContrastPair,
  colors: ThemeColors,
): number => {
  switch (kind) {
    case "plain":
      return contrastRatio(colors[foreground], colors[background]);
    case "selection":
      return contrastRatio(
        colors[foreground],
        compositeOver(colors.selection, colors[background]),
      );
    case "overlay": {
      const painted = compositeOver(colors[foreground], colors[background]);
      return contrastRatio(painted, colors[background]);
    }
  }
};

/** The lowest ratio one set measures across the entry's pairs. */
const within = (entry: DocumentedFigure, colors: ThemeColors): number =>
  entry.pairs
    .map((pair) => measure(entry.kind, pair, colors))
    .reduce((best, current) => (current < best ? current : best));

/** The result of deriving a documented figure. */
export type FigureDerivation =
  | {
      readonly kind: "derived";
      readonly ratio: number;
      readonly figure: string;
      readonly provenance: ShippedThemeProvenance;
    }
  | { readonly kind: "missing" };

const derivedAt = (
  entry: DocumentedFigure,
  shipped: ShippedTheme,
): FigureDerivation => {
  const ratio = within(entry, shipped.theme.colors);
  return {
    kind: "derived",
    ratio,
    figure: ratio.toFixed(entry.decimals),
    provenance: provenanceOf(shipped),
  };
};

/**
 * The figure the set the sentence names produces, rendered at the entry's
 * precision. `missing` means the named set is not part of {@link shippedThemes}
 * — a table error the suites report rather than a value it silently invents.
 */
export function deriveFigure(entry: DocumentedFigure): FigureDerivation {
  const shipped = shippedThemes.find((candidate: ShippedTheme) =>
    sameProvenance(provenanceOf(candidate), entry.provenance),
  );
  return shipped === undefined
    ? { kind: "missing" }
    : derivedAt(entry, shipped);
}

/**
 * The shipped set that produces the entry's lowest ratio. A `"tightest"`
 * sentence is held to it, so naming a set that measures higher — the track's
 * pre-536 identity dark, at 1.058 against Linux light's 1.050 — fails.
 */
export function tightestProvenance(
  entry: DocumentedFigure,
): ShippedThemeProvenance {
  return shippedThemes
    .map((shipped: ShippedTheme) => ({
      ratio: within(entry, shipped.theme.colors),
      provenance: provenanceOf(shipped),
    }))
    .reduce((best, current) => (current.ratio < best.ratio ? current : best))
    .provenance;
}

/**
 * True when a document quotes the entry's sentence with `figure` substituted,
 * after collapsing whitespace so a reflowed paragraph still matches.
 */
export const quotesFigure = (
  document: string,
  entry: DocumentedFigure,
  figure: string,
): boolean =>
  document
    .replaceAll(/\s+/g, " ")
    .includes(
      entry.sentence.replaceAll("{figure}", figure).replaceAll(/\s+/g, " "),
    );

/** The provenance of a platform variant in a given mode and contrast. */
const platformTheme = (
  platform: PlatformVariant,
  mode: ThemeMode,
  contrast: ThemeContrast,
): ShippedThemeProvenance => ({ source: "platform", platform, mode, contrast });

/** The provenance of the identity in a given mode and contrast. */
const identityTheme = (
  mode: ThemeMode,
  contrast: ThemeContrast,
): ShippedThemeProvenance => ({ source: "identity", mode, contrast });

/** The Toast's tone on its floating card, the one unsplit status composition. */
export const toastToneFigure: DocumentedFigure = {
  document: "docs/tokens.md",
  name: "the Toast's tone on its floating card",
  pairs: toastTonePairs,
  kind: "plain",
  claim: "tightest",
  provenance: platformTheme("linux", "dark", "default"),
  decimals: 2,
  sentence:
    "every shipped set clears it with a wide margin (**{figure}:1** at the tightest, Linux dark `infoSoftForeground`)",
};

/** The disabled action inside a status panel, in the two dark palettes. */
export const inactivePanelActionFigures: ReadonlyArray<DocumentedFigure> = [
  {
    document: "docs/tokens.md",
    name: "the disabled action inside a status panel, identity dark",
    pairs: inactivePanelActionPairs,
    kind: "plain",
    claim: "value",
    provenance: identityTheme("dark", "default"),
    decimals: 3,
    sentence:
      "`inactivePanelActionPairs` holds the resting label ({figure}:1 identity dark",
  },
  {
    document: "docs/tokens.md",
    name: "the disabled action inside a status panel, AAA dark",
    pairs: inactivePanelActionPairs,
    kind: "plain",
    claim: "value",
    provenance: identityTheme("dark", "high"),
    decimals: 3,
    sentence: "{figure}:1 AAA dark), and the label",
  },
];

/**
 * The value groove: the tightest surface pair across the whole list, and the
 * persistent row fill the sentence names beside it.
 */
export const trackSurfaceFigure: DocumentedFigure = {
  document: "docs/tokens.md",
  name: "the value indicator's groove on a surface",
  pairs: trackSurfacePairs,
  kind: "plain",
  claim: "tightest",
  provenance: platformTheme("linux", "light", "default"),
  decimals: 3,
  sentence:
    "The tightest shipped pair is Linux light `track` on the `active` wash at **{figure}:1**",
};

/** The groove on the selected call it measures beside the minimum. */
export const trackSelectedFigure: DocumentedFigure = {
  document: "docs/tokens.md",
  name: "the value indicator's groove on the selected row",
  pairs: [["track", "selected", "surface"]],
  kind: "plain",
  claim: "value",
  provenance: identityTheme("dark", "default"),
  decimals: 3,
  sentence:
    "identity dark's `track` on its `selected` fill measures **{figure}:1**",
};

/** Every figure this table holds. */
export const documentedFigures: ReadonlyArray<DocumentedFigure> = [
  toastToneFigure,
  ...inactivePanelActionFigures,
  trackSurfaceFigure,
  trackSelectedFigure,
];

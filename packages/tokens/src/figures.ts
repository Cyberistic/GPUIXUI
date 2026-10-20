import { alpha, type ThemeColors } from "./color.js";
import {
  compositeOver,
  contrastPairs,
  contrastRatio,
  inactivePanelActionPairs,
  selectionSurfaces,
  toastTonePairs,
  trackSurfacePairs,
  type ContrastPair,
} from "./contrast.js";
import type { PlatformRecipeName } from "./platform-recipes.js";
import type { PlatformVariant } from "./platform-types.js";
import { shippedThemes, type ShippedTheme } from "./shipped-themes.js";
import { statusTones, type StatusTone } from "./styles.js";
import type { ThemeContrast, ThemeMode } from "./theme.js";

/**
 * A figure a document states in the present tense about the shipped package,
 * beside the measurement that produces it.
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
 * A document is not only a page: `ring.ts`, the modules that own the native
 * contract and a copyable example quote current figures in their own JSDoc, and
 * the table reads them like any other (plan 717).
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
  | "overlay"
  /**
   * A control an author dimmed with `opacity`, composited the way GPUI paints
   * it: "this element and its children, composited together as one group"
   * (`references/gpui-ce/crates/gpui/src/styled.rs`, which GPUix reaches through
   * `StyleDesc.opacity`). The pair's foreground is the label and its background
   * the fill; {@link DocumentedFigure.panel} is the surface the control sits on,
   * because a dim takes its colour from behind the control.
   */
  | "dim"
  /**
   * A two-tone content ring's worst case over an arbitrary content colour: the
   * geometric mean of the tone pair's contrast,
   * `sqrt(contrast(outer, inner))`.
   */
  | "ring"
  /**
   * A role painted at a fraction on the tone, the way the native runtime fades
   * a document's text: the painted result is held to the tone it sits on.
   */
  | "fade"
  /**
   * A role painted whole on a wash of a role, the way a changed diff token sits
   * on the add/delete tint: the text is held to the washed tone, not the plain
   * one.
   */
  | "over-wash";

/** The opacity the shipped consumers dim a disabled control with. */
export const disabledDimOpacity = 0.5;

/** A document a figure is quoted in. */
export type FigureDocument =
  | "COMPONENTS.md"
  | "docs/design-system.md"
  | "docs/tokens.md"
  | "packages/tokens/README.md"
  | "packages/tokens/src/contrast.ts"
  | "packages/tokens/src/native-text-check.ts"
  | "packages/tokens/src/ring.ts"
  | "packages/tokens/src/styles.ts"
  | "packages/tokens/src/toast-countdown.example.ts";

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
  /**
   * The surface a `"dim"` composition sits on. Omitted for every other kind,
   * whose pair already names its background.
   */
  readonly panel?: keyof ThemeColors;
  /**
   * The paints a `fade` or `over-wash` entry composes: the fraction the
   * foreground role is painted at, and — for `over-wash` — the role painted
   * behind it and its own fraction. Every other kind leaves it undefined, and
   * the suite fails an entry that needs it and omits it.
   */
  readonly composition?: {
    readonly opacity: number;
    readonly wash?: {
      readonly role: keyof ThemeColors;
      readonly opacity: number;
    };
  };
  /** The precision the sentence quotes. */
  readonly decimals: number;
  /** The sentence, with `{figure}` where the derived ratio belongs. */
  readonly sentence: string;
}

/** The provenance of one {@link shippedThemes} entry. */
const provenanceOf = (entry: ShippedTheme): ShippedThemeProvenance =>
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
  entry: DocumentedFigure,
  [foreground, background]: ContrastPair,
  colors: ThemeColors,
): number => {
  const composition = entry.composition;
  switch (entry.kind) {
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
    case "dim": {
      if (entry.panel === undefined) {
        return Number.NaN;
      }
      // One group: the fill composites onto the panel first, then the label
      // composites onto the fill. A dimmed label is measured against its own
      // dimmed fill, not against the panel.
      const fill = compositeOver(
        alpha(colors[background], disabledDimOpacity),
        colors[entry.panel],
      );
      const label = compositeOver(
        alpha(colors[foreground], disabledDimOpacity),
        fill,
      );
      return contrastRatio(label, fill);
    }
    case "ring":
      // The two tones' ratios against any content colour multiply to the tone
      // pair's own ratio, so the worst case over every colour is its square
      // root.
      return Math.sqrt(contrastRatio(colors[foreground], colors[background]));
    case "fade": {
      if (composition === undefined) {
        return Number.NaN;
      }
      const tone = colors[background];
      const painted = compositeOver(
        alpha(colors[foreground], composition.opacity),
        tone,
      );
      return contrastRatio(painted, tone);
    }
    case "over-wash": {
      const wash = composition?.wash;
      if (composition === undefined || wash === undefined) {
        return Number.NaN;
      }
      const washed = compositeOver(
        alpha(colors[wash.role], wash.opacity),
        colors[background],
      );
      const painted = compositeOver(
        alpha(colors[foreground], composition.opacity),
        washed,
      );
      return contrastRatio(painted, washed);
    }
  }
};

/** The lowest ratio one set measures across the entry's pairs. */
const within = (entry: DocumentedFigure, colors: ThemeColors): number =>
  entry.pairs
    .map((pair) => measure(entry, pair, colors))
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
  entry: { readonly sentence: string },
  figure: string,
): boolean =>
  document
    .replaceAll(/\s+/g, " ")
    .includes(
      entry.sentence.replaceAll("{figure}", figure).replaceAll(/\s+/g, " "),
    );

/**
 * A text tier a document quotes, beside the set and surface it names.
 *
 * A tier is not a pair: it is one role's contrast held a perceivable step below
 * the role above it **on the same surface**, so its figure is a ratio of two
 * ratios. `textTiers` publishes the pairs; this table publishes the numbers the
 * pages state about them, and the same provenance rule the pair figures use.
 */
export interface TierFigure {
  readonly document: FigureDocument;
  /** The failure message: what the sentence claims. */
  readonly name: string;
  /** The `[dimmer, brighter]` pair from `textTiers`. */
  readonly tier: readonly [keyof ThemeColors, keyof ThemeColors];
  readonly claim: FigureClaim;
  /** The shipped set the sentence names. */
  readonly provenance: ShippedThemeProvenance;
  /**
   * The surface the sentence names. Omitted when the sentence says the minimum
   * holds on every shared surface, so the entry measures the whole list.
   */
  readonly surface?: keyof ThemeColors;
  /** The precision the sentence quotes. */
  readonly decimals: number;
  /** The sentence, with `{figure}` where the derived ratio belongs. */
  readonly sentence: string;
}

/** The surfaces a role is documented on, straight from the contract. */
const surfacesOf = (
  role: keyof ThemeColors,
): ReadonlyArray<keyof ThemeColors> =>
  contrastPairs
    .flatMap(([foreground, background]) =>
      foreground === role ? [background] : [],
    )
    .filter((surface, index, all) => all.indexOf(surface) === index);

/**
 * The surfaces a tier is compared on: the ones both roles are painted on. The
 * rule is `themeTextTierFailures`', so a surface joins the comparison by joining
 * both roles' pairs and the table cannot quote a step the checker never measures.
 */
export const tierSurfaces = ([
  dimmer,
  brighter,
]: TierFigure["tier"]): ReadonlyArray<keyof ThemeColors> => {
  const brighterSurfaces = surfacesOf(brighter);
  return surfacesOf(dimmer).filter((surface) =>
    brighterSurfaces.includes(surface),
  );
};

/** One role's ratio divided by the other's on the same surface. */
const tierStep = (
  colors: ThemeColors,
  [dimmer, brighter]: TierFigure["tier"],
  surface: keyof ThemeColors,
): number =>
  contrastRatio(colors[brighter], colors[surface]) /
  contrastRatio(colors[dimmer], colors[surface]);

/** The result of deriving a documented tier figure. */
export type TierDerivation =
  | {
      readonly kind: "derived";
      readonly ratio: number;
      readonly figure: string;
    }
  | { readonly kind: "missing" };

/**
 * The figure the set the sentence names produces, measured at the surface it
 * names or at the weakest of its shared surfaces. `missing` means the named set
 * is not part of {@link shippedThemes} — a table error the suites report rather
 * than a value they silently invent.
 */
export function deriveTierFigure(entry: TierFigure): TierDerivation {
  const shipped = shippedThemes.find((candidate: ShippedTheme) =>
    sameProvenance(provenanceOf(candidate), entry.provenance),
  );
  if (shipped === undefined) {
    return { kind: "missing" };
  }
  const surfaces =
    entry.surface === undefined ? tierSurfaces(entry.tier) : [entry.surface];
  const ratio = Math.min(
    ...surfaces.map((surface) =>
      tierStep(shipped.theme.colors, entry.tier, surface),
    ),
  );
  return { kind: "derived", ratio, figure: ratio.toFixed(entry.decimals) };
}

/** The lowest step any shipped set measures across a tier's shared surfaces. */
export function tierMinimum(tier: TierFigure["tier"]): number {
  return Math.min(
    ...shippedThemes.flatMap((shipped: ShippedTheme) =>
      tierSurfaces(tier).map((surface) =>
        tierStep(shipped.theme.colors, tier, surface),
      ),
    ),
  );
}

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

/** The provenance of a recipe in a given mode and contrast. */
const recipeTheme = (
  recipe: PlatformRecipeName,
  mode: ThemeMode,
  contrast: ThemeContrast,
): ShippedThemeProvenance => ({ source: "recipe", recipe, mode, contrast });

/** The Toast's tone on its floating card, the one unsplit status composition. */
const toastToneFigure: DocumentedFigure = {
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
const inactivePanelActionFigures: ReadonlyArray<DocumentedFigure> = [
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
 * The disabled dim the consumer packages still paint, the composition the
 * documents quote. GPUI composites an element and its children as one group, so
 * the label is dimmed with the fill it sits on: the primary label measures
 * **1.575:1** on the identity light canvas and **1.468:1** at worst (Linux
 * light, a card), and a dimmed field's typed text **3.273:1** on macOS light's
 * `input` fill. Plan 306 quoted 2.25:1 for the light canvas, which no
 * composition in the current palette produces; the figures are derived here so
 * the pages cannot drift again.
 */
const disabledDimFigures: ReadonlyArray<DocumentedFigure> = [
  {
    document: "docs/design-system.md",
    name: "the disabled primary action, dimmed on the identity light canvas",
    pairs: [["primaryForeground", "primary", "secondary"]],
    kind: "dim",
    panel: "background",
    claim: "value",
    provenance: identityTheme("light", "default"),
    decimals: 3,
    sentence:
      "A filled primary action at 50% opacity measures **{figure}:1** on the identity light canvas",
  },
  {
    document: "docs/design-system.md",
    name: "the disabled primary action, dimmed on the worst shipped card",
    pairs: [["primaryForeground", "primary", "secondary"]],
    kind: "dim",
    panel: "card",
    claim: "tightest",
    provenance: platformTheme("linux", "light", "default"),
    decimals: 3,
    sentence: "the primary label measures **{figure}:1** on a Linux light card",
  },
  {
    document: "docs/tokens.md",
    name: "the disabled field's typed text, dimmed on its input fill",
    pairs: [["inputForeground", "input", "body"]],
    kind: "dim",
    panel: "input",
    claim: "tightest",
    provenance: platformTheme("darwin", "light", "default"),
    decimals: 3,
    sentence:
      "the shipped primitives still dim the field at 50%, which measures **{figure}:1** on the macOS light `input` fill",
  },
  {
    document: "packages/tokens/README.md",
    name: "the disabled dim's worst shipped card",
    pairs: [["primaryForeground", "primary", "secondary"]],
    kind: "dim",
    panel: "card",
    claim: "tightest",
    provenance: platformTheme("linux", "light", "default"),
    decimals: 3,
    sentence: "the dim measures **{figure}:1** at worst (Linux light, a card)",
  },
];

/**
 * The value groove: the tightest surface pair across the whole list, and the
 * persistent row fill the sentence names beside it.
 */
const trackSurfaceFigure: DocumentedFigure = {
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
const trackSelectedFigure: DocumentedFigure = {
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

/**
 * The fill `docs/tokens.md` rejects as a selectable row's press, and the figure
 * the rejection rests on. `accentActive` is the accent *family's* pressed fill —
 * a filled control's press, not a row wash — and on macOS dark a row label on it
 * measures 6.677:1, under the 7:1 body floor. The row keeps `active` instead.
 * Plan 698 moved the macOS dark accent family one step after this sentence was
 * written, so the figure is derived rather than trusted; the sibling premise
 * (every set clears the floor on `active`) lives in
 * `row-press-direction.test.ts`.
 */
const rowPressFillFigure: DocumentedFigure = {
  document: "docs/tokens.md",
  name: "the row label on the pressed accent fill",
  pairs: [["foreground", "accentActive", "body"]],
  kind: "plain",
  claim: "value",
  provenance: platformTheme("darwin", "dark", "default"),
  decimals: 3,
  sentence:
    "on macOS dark a row label measures **{figure}:1** on it, under the 7:1 body floor",
};

/**
 * The native field's caret on its own `input` fill. `caretPairs` publishes the
 * pair, and `docs/tokens.md` quotes its tightest set — which drifted: the page
 * said **7.831:1** on Linux dark, measured before the light platform inks moved,
 * while no shipped set measures near it and `Light` is the tightest at
 * **8.204:1**. The entry derives both the figure and the set, so the sentence
 * cannot survive another palette move.
 */
const caretPairFigure: DocumentedFigure = {
  document: "docs/tokens.md",
  name: "the native field's caret on its input fill",
  pairs: [["primaryText", "input", "mark"]],
  kind: "plain",
  claim: "tightest",
  provenance: identityTheme("light", "default"),
  decimals: 3,
  sentence:
    "Every shipped set clears the new pair (**{figure}:1** at the tightest, `Light`)",
};

/**
 * The two roles `docs/tokens.md` rejects as a groove, and the figures the
 * rejection rests on. `border` is a line role: as a groove it would have to
 * carry the four `PROGRESS_TONES` as marks, and the tightest of them measures
 * 1.324:1 on the AAA dark divider, under the 4.5:1 the mark class demands.
 * `active` is a pressed wash, and its ratio is *not* the objection — `primary`
 * measures 3.317:1 on macOS dark's, over the 3:1 mark floor — because a press
 * exists only under the pointer while a groove must be there at rest. Plan 347
 * had quoted 1.432:1 for `primary` on the AAA divider (that is `success`'s
 * figure) and the pre-698 2.84:1 for macOS dark's pressed wash.
 */
const trackRejectedRoleFigures: ReadonlyArray<DocumentedFigure> = [
  {
    document: "docs/tokens.md",
    name: "the tightest progress tone on the divider",
    pairs: [
      ["primary", "border", "mark"],
      ["success", "border", "mark"],
      ["destructive", "border", "mark"],
      ["mutedForeground", "border", "mark"],
    ],
    kind: "plain",
    claim: "tightest",
    provenance: identityTheme("dark", "high"),
    decimals: 3,
    sentence:
      "the tightest of the four `PROGRESS_TONES` on the AAA dark divider measures **{figure}:1**",
  },
  {
    document: "docs/tokens.md",
    name: "the pressed wash's primary mark",
    pairs: [["primary", "active", "mark"]],
    kind: "plain",
    claim: "value",
    provenance: platformTheme("darwin", "dark", "default"),
    decimals: 3,
    sentence: "`primary` measures **{figure}:1** on macOS dark's pressed wash",
  },
];

/** A sentence quoting the ring's derived bound, with the set it names. */
const ringFigure = (
  document: FigureDocument,
  name: string,
  provenance: ShippedThemeProvenance,
  claim: FigureClaim,
  sentence: string,
): DocumentedFigure => ({
  document,
  name,
  pairs: [["foreground", "background", "mark"]],
  kind: "ring",
  claim,
  provenance,
  decimals: 2,
  sentence,
});

const linuxDark = platformTheme("linux", "dark", "default");
const identityLight = identityTheme("light", "default");
const identityLightHigh = identityTheme("light", "high");

/**
 * The content ring's figures, one entry per sentence that states one. The ring
 * is the one composition whose worst case is not a pair ratio: it is
 * `sqrt(contrast(outer, inner))`, so `figures.ts` measures the kind instead of
 * wrapping the pair. `Dark · Linux` is the tightest shipped set at 3.70:1; the
 * identity light pair is 15.86:1 (3.98:1) and both AAA sets are 21:1 (4.58:1).
 */
const ringFigures: ReadonlyArray<DocumentedFigure> = [
  ringFigure(
    "docs/tokens.md",
    "the content ring on the identity light pair",
    identityLight,
    "value",
    "The identity light pair guarantees **{figure}:1**",
  ),
  ringFigure(
    "docs/tokens.md",
    "the content ring at AAA",
    identityLightHigh,
    "value",
    "the AAA pairs **{figure}:1**",
  ),
  ringFigure(
    "docs/tokens.md",
    "the content ring's tightest shipped set",
    linuxDark,
    "tightest",
    "the tightest shipped set (`Dark · Linux`) guarantees **{figure}:1**",
  ),
  ringFigure(
    "docs/design-system.md",
    "the content ring's tightest shipped set",
    linuxDark,
    "tightest",
    "{figure}:1 at the tightest shipped set, above the mark floor",
  ),
  ringFigure(
    "packages/tokens/README.md",
    "the content ring's tightest shipped set",
    linuxDark,
    "tightest",
    "({figure}:1 at the tightest shipped set, above the mark floor)",
  ),
  ringFigure(
    "COMPONENTS.md",
    "the content ring's tightest shipped set",
    linuxDark,
    "tightest",
    "{figure}:1 at the tightest shipped set, `Dark · Linux`",
  ),
  ringFigure(
    "COMPONENTS.md",
    "the content ring at AAA",
    identityLightHigh,
    "value",
    "{figure}:1 at AAA",
  ),
  {
    document: "packages/tokens/src/ring.ts",
    name: "the identity light pair's contrast",
    pairs: [["foreground", "background", "body"]],
    kind: "plain",
    claim: "value",
    provenance: identityLight,
    decimals: 2,
    sentence: "identity light pair ({figure}:1) guarantees",
  },
  ringFigure(
    "packages/tokens/src/ring.ts",
    "the ring's identity light guarantee",
    identityLight,
    "value",
    "guarantees **{figure}:1**, the AAA pairs",
  ),
  {
    document: "packages/tokens/src/ring.ts",
    name: "the AAA pair's contrast",
    pairs: [["foreground", "background", "body"]],
    kind: "plain",
    claim: "value",
    provenance: identityLightHigh,
    decimals: 0,
    sentence: "the AAA pairs ({figure}:1)",
  },
  ringFigure(
    "packages/tokens/src/ring.ts",
    "the ring's AAA guarantee",
    identityLightHigh,
    "value",
    "**{figure}:1**, and the tightest shipped set",
  ),
  ringFigure(
    "packages/tokens/src/ring.ts",
    "the ring's tightest shipped set",
    linuxDark,
    "tightest",
    "the tightest shipped set (`Dark · Linux`) **{figure}:1**",
  ),
];

/**
 * The field's caret and the native document's fades — the compositions the
 * table could not express until it learned `fade` and `over-wash`. Quoted in
 * the two modules that own the contract and in the two pages that teach it;
 * none was held, so a falsified figure in any of the six places left the whole
 * suite green (plan 717).
 */

/**
 * The nine surfaces a native field's caret sits on: its own `input` fill, where
 * the caret pair is a `mark`, and the eight text surfaces `primaryTextPairs`
 * holds — the four plain tones and the four washes a row or an in-place editor
 * paints. Derived from `contrastPairs` over {@link selectionSurfaces}, so a new
 * persistent surface joins the entry with the contract.
 */
const caretInkPairs: ReadonlyArray<ContrastPair> = contrastPairs.filter(
  ([foreground, background]) =>
    foreground === "primaryText" &&
    selectionSurfaces.some((surface) => surface === background),
);

const caretFigures: ReadonlyArray<DocumentedFigure> = [
  {
    document: "packages/tokens/src/contrast.ts",
    name: "the caret's nine surfaces, in caretPairs' JSDoc",
    pairs: caretInkPairs,
    kind: "plain",
    claim: "tightest",
    provenance: platformTheme("win32", "dark", "default"),
    decimals: 3,
    sentence: "({figure}:1 at the tightest, Windows dark on",
  },
  {
    document: "packages/tokens/src/styles.ts",
    name: "the caret's nine surfaces, in nativeFieldTheme's JSDoc",
    pairs: caretInkPairs,
    kind: "plain",
    claim: "tightest",
    provenance: platformTheme("win32", "dark", "default"),
    decimals: 3,
    sentence: "every shipped set (**{figure}:1** at the tightest)",
  },
  {
    document: "docs/tokens.md",
    name: "the caret's nine surfaces, in the catalogue",
    pairs: caretInkPairs,
    kind: "plain",
    claim: "tightest",
    provenance: platformTheme("win32", "dark", "default"),
    decimals: 3,
    sentence: "(**{figure}:1** at the tightest, Windows dark on `active`)",
  },
  {
    document: "docs/design-system.md",
    name: "the caret's nine surfaces, in the design system",
    pairs: caretInkPairs,
    kind: "plain",
    claim: "tightest",
    provenance: platformTheme("win32", "dark", "default"),
    decimals: 3,
    sentence: "surface with margin (**{figure}:1** at the tightest)",
  },
];

/** The gutter number: `textFaint` at the runtime's 80% on the quiet panel. */
const gutterNumberFigure = (
  document: FigureDocument,
  sentence: string,
): DocumentedFigure => ({
  document,
  name: "the native gutter number",
  pairs: [["placeholder", "muted", "surface"]],
  kind: "fade",
  claim: "value",
  provenance: recipeTheme("aero", "light", "default"),
  composition: { opacity: 0.8 },
  decimals: 3,
  sentence,
});

/** The unchanged marker: `textFaint` at the runtime's 50% on the quiet panel. */
const unchangedMarkerFigure = (
  document: FigureDocument,
  sentence: string,
): DocumentedFigure => ({
  document,
  name: "the native unchanged marker",
  pairs: [["placeholder", "muted", "surface"]],
  kind: "fade",
  claim: "value",
  provenance: recipeTheme("aero", "light", "default"),
  composition: { opacity: 0.5 },
  decimals: 3,
  sentence,
});

/** The 28% word-level diff wash: the token's own ink on a wash of itself. */
const wordLevelWashFigure = (
  document: FigureDocument,
  sentence: string,
): DocumentedFigure => ({
  document,
  name: "the word-level diff wash",
  pairs: [["destructiveText", "card", "body"]],
  kind: "over-wash",
  claim: "value",
  provenance: platformTheme("linux", "dark", "default"),
  composition: {
    opacity: 1,
    wash: { role: "destructiveText", opacity: 0.28 },
  },
  decimals: 3,
  sentence,
});

/** The Toast's designed groove on its floating card, tightest shipped set. */
const countdownGrooveFigure: DocumentedFigure = {
  document: "packages/tokens/src/toast-countdown.example.ts",
  name: "the Toast countdown's groove",
  pairs: [["track", "popover", "surface"]],
  kind: "plain",
  claim: "tightest",
  provenance: platformTheme("win32", "dark", "default"),
  decimals: 3,
  sentence: "it clears the floor on the toast card at **{figure}:1**",
};

const nativePaintFigures: ReadonlyArray<DocumentedFigure> = [
  ...caretFigures,
  gutterNumberFigure(
    "packages/tokens/src/native-text-check.ts",
    "the line number measures **{figure}:1** at 80% on Aero light's",
  ),
  unchangedMarkerFigure(
    "packages/tokens/src/native-text-check.ts",
    "and the unchanged marker **{figure}:1** at 50%",
  ),
  gutterNumberFigure("docs/tokens.md", "they measure {figure}:1 at 80%"),
  unchangedMarkerFigure(
    "docs/tokens.md",
    "and {figure}:1 at 50% on Aero light's quiet panel",
  ),
  wordLevelWashFigure(
    "packages/tokens/src/native-text-check.ts",
    "28% wash measures **{figure}:1** in `Dark · Linux`",
  ),
  wordLevelWashFigure(
    "docs/tokens.md",
    "on its own 28% wash measures **{figure}:1** (`Dark · Linux`)",
  ),
  countdownGrooveFigure,
];

/** Every figure this table holds. */
export const documentedFigures: ReadonlyArray<DocumentedFigure> = [
  toastToneFigure,
  ...inactivePanelActionFigures,
  ...disabledDimFigures,
  trackSurfaceFigure,
  trackSelectedFigure,
  rowPressFillFigure,
  caretPairFigure,
  ...trackRejectedRoleFigures,
  ...ringFigures,
  ...nativePaintFigures,
];

/** One body-role tier: secondary text below the role a surface paints. */
const bodyTierFigure = (
  brighter: keyof ThemeColors,
  surface: keyof ThemeColors,
): TierFigure => ({
  document: "docs/tokens.md",
  name: `secondary text below ${brighter} on ${surface}`,
  tier: ["mutedForeground", brighter],
  claim: "tightest",
  provenance: identityTheme("light", "high"),
  surface,
  decimals: 3,
  sentence: `**{figure}:1** (\`mutedForeground\` vs \`${brighter}\`, high-contrast light on \`${surface}\`)`,
});

/**
 * The caption below a tone-tinted status panel's own ink. At the default floors
 * the 7:1 body floor implied the step above the 4.5:1 caption, but at AAA both
 * floors are 7:1, so the six high-contrast light sets measured 1.003–1.042:1
 * between an Alert's caption and its title before plan 729 moved the four light
 * inks. The minimum sits in the AAA dark set for `info` and `destructive` and in
 * the AAA light set for the two warm inks.
 */
const panelTierFigure = (tone: StatusTone): TierFigure => {
  const mode: ThemeMode =
    tone === "success" || tone === "warning" ? "light" : "dark";
  return {
    document: "docs/tokens.md",
    name: `the caption below the ${tone} panel's ink`,
    tier: ["mutedForeground", `${tone}SoftForeground`],
    claim: "tightest",
    provenance: identityTheme(mode, "high"),
    surface: `${tone}Soft`,
    decimals: 3,
    sentence: `**{figure}:1** (\`mutedForeground\` vs \`${tone}SoftForeground\`, high-contrast ${mode} on \`${tone}Soft\`)`,
  };
};

/** The unavailable label below secondary text. */
const inactiveTierFigure: TierFigure = {
  document: "docs/tokens.md",
  name: "the unavailable label below secondary text",
  tier: ["disabledForeground", "mutedForeground"],
  claim: "tightest",
  provenance: identityTheme("dark", "high"),
  surface: "active",
  decimals: 3,
  sentence:
    "**{figure}:1** (`disabledForeground` vs `mutedForeground`, high-contrast dark on `active`)",
};

/** The field's hint below secondary text, the minimum of the whole list. */
const hintTierFigure: TierFigure = {
  document: "docs/tokens.md",
  name: "the hint below secondary text",
  tier: ["placeholder", "mutedForeground"],
  claim: "tightest",
  provenance: identityTheme("dark", "high"),
  decimals: 3,
  sentence:
    "**{figure}:1** (`placeholder` vs `mutedForeground`, high-contrast dark on every surface the two share)",
};

/**
 * The disabled label of a status-panel action below the enabled one. Plan 392
 * wrote this sentence against identity dark, but the minimum is the
 * high-contrast dark set: the AAA `disabledForeground` moved in plan 520, and
 * identity dark measures 1.877:1 — the provenance, not the figure, was wrong.
 */
const panelActionTierFigure: TierFigure = {
  document: "docs/tokens.md",
  name: "the disabled panel action below the enabled one",
  tier: ["disabledForeground", "softActionForeground"],
  claim: "tightest",
  provenance: identityTheme("dark", "high"),
  surface: "successSoft",
  decimals: 3,
  sentence:
    "**{figure}:1** (`disabledForeground` vs `softActionForeground`, high-contrast dark on `successSoft`)",
};

/**
 * The selected row's inherited label below the title painted on the same fill.
 * Plan 623 added the pair: both roles already cleared their own floors, so only
 * the hierarchy can report a label raised to (or above) the title's strength.
 * The minimum is `Dark · Windows` on the `hover` fill.
 */
const selectedLabelTierFigure: TierFigure = {
  document: "docs/tokens.md",
  name: "the selected row's label below its title",
  tier: ["selectedForeground", "foreground"],
  claim: "tightest",
  provenance: platformTheme("win32", "dark", "default"),
  surface: "hover",
  decimals: 3,
  sentence:
    "**{figure}:1** (`selectedForeground` vs `foreground`, `Dark · Windows` on `hover`)",
};

/**
 * Every tier figure the catalogue states, in the order the paragraph lists
 * them. A tier in `textTiers` without an entry fails the suite, so the page
 * cannot silently drop one.
 */
export const documentedTierFigures: ReadonlyArray<TierFigure> = [
  bodyTierFigure("foreground", "warningSoft"),
  bodyTierFigure("cardForeground", "card"),
  bodyTierFigure("popoverForeground", "popover"),
  bodyTierFigure("inputForeground", "muted"),
  ...statusTones.map(panelTierFigure),
  inactiveTierFigure,
  hintTierFigure,
  panelActionTierFigure,
  selectedLabelTierFigure,
];

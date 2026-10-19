import { alpha, type ThemeColors } from "./color.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  type ContrastPairClass,
} from "./contrast.js";
import { nativeInk, nativeInkOpacity } from "./native-ink.js";
import {
  nativeSyntaxRoles,
  nativeTextRoles,
  nativeTextSurfaces,
} from "./native-text.js";
import type { Theme, ThemeContrast } from "./theme.js";

/**
 * A colour field of {@link NativeTextTheme} the runtime paints at a fixed
 * fraction of its value. The fractions are the runtime's own and a theme cannot
 * change them; the role behind each field is `nativeTextRoles[field]`.
 */
export interface NativeTextFade {
  /** The `NativeTextTheme` field whose role is faded. */
  readonly field: keyof typeof nativeTextRoles;
  /** The fraction of the role's alpha the runtime paints, `0…1`. */
  readonly opacity: number;
  /** The floor the painted result must clear. */
  readonly pairClass: ContrastPairClass;
}

/**
 * The values the runtime fades in a native `<code>`, `<diff>` or `<markdown>`,
 * each measured on every {@link nativeTextSurfaces} tone.
 *
 * A diff line's body is `text` at 92%, its gutter number `textFaint` at 80% and
 * its unchanged marker `textFaint` at 50%; an add/delete marker is 90% of the
 * status text role, its 3px accent bar 55% and its row tint 5.5%; a markdown
 * list marker and ordered number are 85% of the accent ink, the blockquote rail
 * 60% and its wash 5%.
 *
 * The gutter fades sit below the secondary floor in shipped sets — 3.595:1 at
 * 80% and 2.082:1 at 50% on Aero light's quiet panel — because the runtime dims
 * chrome, so they are held to the perceivability floor rather than to a text
 * one.
 */
export const nativeTextFades: readonly NativeTextFade[] = [
  { field: "text", opacity: 0.92, pairClass: "body" },
  { field: "textFaint", opacity: 0.8, pairClass: "surface" },
  { field: "textFaint", opacity: 0.5, pairClass: "surface" },
  { field: "diffAdd", opacity: 0.9, pairClass: "secondary" },
  { field: "diffDel", opacity: 0.9, pairClass: "secondary" },
  { field: "diffAdd", opacity: 0.55, pairClass: "surface" },
  { field: "diffDel", opacity: 0.55, pairClass: "surface" },
  { field: "diffAdd", opacity: 0.055, pairClass: "surface" },
  { field: "diffDel", opacity: 0.055, pairClass: "surface" },
  { field: "accent", opacity: 0.85, pairClass: "mark" },
  { field: "accent", opacity: 0.6, pairClass: "surface" },
  { field: "accent", opacity: 0.05, pairClass: "surface" },
];

/**
 * Text the runtime paints over a second faded role: a diff line's body over the
 * row tint, and a blockquote's body over the accent wash.
 */
export interface NativeTextOverFade {
  /** The text field whose role is painted. */
  readonly field: keyof typeof nativeTextRoles;
  /** The fraction of the text role's alpha, `0…1`. */
  readonly opacity: number;
  /** The wash field painted behind the text. */
  readonly wash: keyof typeof nativeTextRoles;
  /** The fraction of the wash's alpha, `0…1`. */
  readonly washOpacity: number;
  /** The floor the painted text must clear. */
  readonly pairClass: ContrastPairClass;
}

/**
 * The two-fade compositions a native document paints, on every
 * {@link nativeTextSurfaces} tone.
 *
 * A changed diff line's `text` is 92% over 5.5% of the add/delete role. A
 * blockquote paints its body role whole over 5% of the accent ink. The
 * runtime's 28% word-level diff wash is deliberately absent: it paints a
 * changed token's own syntax colour over a wash of the add/delete family, which
 * measures **4.389:1** for `destructiveText` on its own wash in `Dark · Linux`
 * and cannot clear a text floor while staying visible; `docs/tokens.md` states
 * the omission.
 */
export const nativeTextOverFades: readonly NativeTextOverFade[] = [
  {
    field: "text",
    opacity: 0.92,
    wash: "diffAdd",
    washOpacity: 0.055,
    pairClass: "body",
  },
  {
    field: "text",
    opacity: 0.92,
    wash: "diffDel",
    washOpacity: 0.055,
    pairClass: "body",
  },
  {
    field: "textMuted",
    opacity: 1,
    wash: "accent",
    washOpacity: 0.05,
    pairClass: "body",
  },
];

/**
 * A text-theme field the runtime paints on one of its fixed neutral ink washes.
 *
 * Unlike a {@link NativeTextFade}, the role is painted whole; the ink is behind
 * it. The four washes are the code block's language header (2%), its separator
 * (the theme's `border` on that same wash), a diff file header (2.5%) and the
 * header's hover (5%, also the show-more row). None is a token the theme owns,
 * so a theme that clears the plain-surface pairs can still lose its chrome.
 */
export interface NativeTextWash {
  /** The `NativeTextTheme` field whose role is painted. */
  readonly field: keyof typeof nativeTextRoles;
  /** The fraction of black or white the runtime washes the document tone with. */
  readonly ink: number;
  /** The floor the painted pair must clear. */
  readonly pairClass: ContrastPairClass;
}

/**
 * The chrome the runtime paints on its own ink washes, each measured on every
 * {@link nativeTextSurfaces} tone.
 *
 * A code block's language header is a 2% ink wash under `textMuted`, and the
 * separator below it is the theme's `border` on that same wash. A diff file
 * header is a 2.5% wash under its path (`textMuted`) and its two counts
 * (`diffAdd`/`diffDel`), and the hover wash — shared by the show-more row — is
 * 5%. The fades in {@link nativeTextFades} name the code body and the per-role
 * fades, not these four. On `Dark · macOS` the accepted `border: "#303030"`
 * theme measures **1.002:1** on the code header's 2% wash while every other
 * check returns `[]`.
 */
export const nativeTextWashes: readonly NativeTextWash[] = [
  { field: "border", ink: 0.02, pairClass: "divider" },
  { field: "textMuted", ink: 0.02, pairClass: "secondary" },
  { field: "textMuted", ink: 0.025, pairClass: "secondary" },
  { field: "diffAdd", ink: 0.025, pairClass: "secondary" },
  { field: "diffDel", ink: 0.025, pairClass: "secondary" },
  { field: "textMuted", ink: 0.05, pairClass: "secondary" },
  { field: "diffAdd", ink: 0.05, pairClass: "secondary" },
  { field: "diffDel", ink: 0.05, pairClass: "secondary" },
];

/** One native document paint that misses its floor. */
export interface NativeTextFailure {
  /**
   * The text-theme field whose role was painted; absent for the code block's
   * ink wash, whose role is a syntax capture.
   */
  readonly field?: keyof typeof nativeTextRoles;
  /** The semantic role measured. */
  readonly role: keyof ThemeColors;
  /** The document tone the paint sat on. */
  readonly surface: keyof ThemeColors;
  /** The fraction of the role painted; `1` when it is painted whole. */
  readonly opacity: number;
  /** The role painted behind the text, for a two-fade composition. */
  readonly wash?: keyof ThemeColors;
  /** The fraction of the wash, when one is painted. */
  readonly washOpacity?: number;
  /** The ink wash the document painted over the tone; its fraction. */
  readonly ink?: number;
  /** The floor the paint missed. */
  readonly pairClass: ContrastPairClass;
  /** The floor value at the theme's declared contrast level. */
  readonly floor: number;
  /** The measured ratio. */
  readonly ratio: number;
}

/**
 * Every native document paint that misses its floor in a theme.
 *
 * The runtime fades a document's text, markers, tints, rails and gutter at fixed
 * fractions, paints a code block on a black-or-white ink wash, and washes its
 * own chrome — a code header, a diff file header, their hover — with a lighter
 * ink the theme does not own; none of them is a token, so
 * {@link themeContrastFailures} cannot see them. This is the ninth check: it
 * holds {@link nativeTextFades}, {@link nativeTextOverFades},
 * {@link nativeTextWashes} and every syntax role through {@link nativeInk} on
 * all four {@link nativeTextSurfaces} tones, at the floors
 * {@link contrastFloors} owns.
 *
 * The check is what makes the extension guarantee whole for a native document: a
 * role lifted until its opaque pair just passes is still under the floor once
 * the runtime fades or washes it. A copied theme with `successText: "#bebebe"`
 * on identity dark returns `[]` from the other checks while a string token
 * measures **6.405:1** through the ink wash, and a `mutedForeground` of
 * `"#bebebe"` paints a blockquote at **6.335:1**, both under the body floor. A
 * `border: "#303030"` theme on `Dark · macOS` clears every plain-surface pair
 * and measures **1.002:1** on the code header's 2% wash.
 *
 * @example
 * ```ts
 * import { getTheme, themeNativeTextFailures } from "@gpuixui/tokens";
 *
 * themeNativeTextFailures(getTheme("dark")); // []
 * ```
 */
export function themeNativeTextFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<NativeTextFailure> {
  const floors = contrastFloors[contrast];
  const fadeFailures = nativeTextFades.flatMap((fade) => {
    const role = nativeTextRoles[fade.field];
    return nativeTextSurfaces.flatMap((surface) => {
      const tone = theme.colors[surface];
      const painted = compositeOver(
        alpha(theme.colors[role], fade.opacity),
        tone,
      );
      const ratio = contrastRatio(painted, tone);
      return ratio >= floors[fade.pairClass]
        ? []
        : [
            {
              field: fade.field,
              role,
              surface,
              opacity: fade.opacity,
              pairClass: fade.pairClass,
              floor: floors[fade.pairClass],
              ratio,
            },
          ];
    });
  });
  const overFadeFailures = nativeTextOverFades.flatMap((fade) => {
    const role = nativeTextRoles[fade.field];
    const washRole = nativeTextRoles[fade.wash];
    return nativeTextSurfaces.flatMap((surface) => {
      const tone = theme.colors[surface];
      const washed = compositeOver(
        alpha(theme.colors[washRole], fade.washOpacity),
        tone,
      );
      const ratio = contrastRatio(
        compositeOver(alpha(theme.colors[role], fade.opacity), washed),
        washed,
      );
      return ratio >= floors[fade.pairClass]
        ? []
        : [
            {
              field: fade.field,
              role,
              surface,
              opacity: fade.opacity,
              wash: washRole,
              washOpacity: fade.washOpacity,
              pairClass: fade.pairClass,
              floor: floors[fade.pairClass],
              ratio,
            },
          ];
    });
  });
  const washFailures = nativeTextWashes.flatMap((wash) => {
    const role = nativeTextRoles[wash.field];
    return nativeTextSurfaces.flatMap((surface) => {
      const ratio = contrastRatio(
        theme.colors[role],
        nativeInk(theme, surface, wash.ink),
      );
      return ratio >= floors[wash.pairClass]
        ? []
        : [
            {
              field: wash.field,
              role,
              surface,
              opacity: 1,
              ink: wash.ink,
              pairClass: wash.pairClass,
              floor: floors[wash.pairClass],
              ratio,
            },
          ];
    });
  });
  const inkFailures = [...new Set(Object.values(nativeSyntaxRoles))].flatMap(
    (role) =>
      nativeTextSurfaces.flatMap((surface) => {
        const painted = nativeInk(theme, surface);
        const ratio = contrastRatio(theme.colors[role], painted);
        return ratio >= floors.body
          ? []
          : [
              {
                role,
                surface,
                opacity: 1,
                ink: nativeInkOpacity,
                pairClass: "body" as const,
                floor: floors.body,
                ratio,
              },
            ];
      }),
  );
  return [
    ...fadeFailures,
    ...overFadeFailures,
    ...washFailures,
    ...inkFailures,
  ];
}

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
 * The gutter fades sit below the secondary floor in shipped sets, because the
 * runtime dims chrome, so they are held to the perceivability floor rather than
 * to a text one: the line number measures **3.595:1** at 80% on Aero light's
 * quiet panel, and the unchanged marker **2.082:1** at 50%.
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
 * The inline-code composition: `codeText` is body copy painted on the opaque
 * `codeWash` quad the runtime draws under the runs, so the wash is the surface.
 */
export interface NativeInlineCode {
  /** The `NativeTextTheme` field painted. */
  readonly text: keyof typeof nativeTextRoles;
  /** The field painted behind it, as an opaque surface. */
  readonly wash: keyof typeof nativeTextRoles;
  /** The floor the painted text must clear. */
  readonly pairClass: ContrastPairClass;
}

/**
 * Inline code is `codeText` (`primaryText`) on the opaque `codeWash` (`accent`)
 * quad the runtime paints under the runs. Unlike a fade, nothing is composited:
 * the wash *is* the surface. The text is body copy, so the pair is held to the
 * body floor — the secondary floor the accent row fill already has for a link
 * is too weak. Four shipped sets measured 6.506–6.960:1 before their ink took
 * one designed step.
 */
export const nativeInlineCode: NativeInlineCode = {
  text: "codeText",
  wash: "codeWash",
  pairClass: "body",
};

/**
 * Text the runtime paints over a second faded role: a diff line's body over the
 * row tint, and a blockquote's body run (and its container fallback role) over
 * the accent wash.
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
 * A changed diff line's `text` is 92% over 5.5% of the add/delete role, and its
 * gutter, number/marker and accent bar sit on that same tint.
 *
 * A blockquote is the one composition with two roles. Its paragraph runs carry
 * `theme.text` (`foreground`): `flatten_runs` gives every non-code run that
 * colour and `SelectableText` paints the runs, so the container's
 * `text_color(theme.text_muted)` is overridden. The container still names
 * `text_muted`, and the pinned 0.10.0 package ships a binary whose inheritance
 * cannot be inspected, so both the painted run colour and the container
 * fallback are held over the 5% accent wash at the body floor. The runtime's 28%
 * word-level diff wash is deliberately absent: it paints a changed token's own
 * syntax colour over a wash of the add/delete family. `destructiveText` on its
 * own 28% wash measures **4.389:1** in `Dark · Linux` and cannot clear a text
 * floor while staying visible; `docs/tokens.md` states the omission.
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
    field: "textFaint",
    opacity: 0.8,
    wash: "diffAdd",
    washOpacity: 0.055,
    pairClass: "surface",
  },
  {
    field: "textFaint",
    opacity: 0.8,
    wash: "diffDel",
    washOpacity: 0.055,
    pairClass: "surface",
  },
  {
    field: "diffAdd",
    opacity: 0.9,
    wash: "diffAdd",
    washOpacity: 0.055,
    pairClass: "secondary",
  },
  {
    field: "diffDel",
    opacity: 0.9,
    wash: "diffDel",
    washOpacity: 0.055,
    pairClass: "secondary",
  },
  {
    field: "diffAdd",
    opacity: 0.55,
    wash: "diffAdd",
    washOpacity: 0.055,
    pairClass: "surface",
  },
  {
    field: "diffDel",
    opacity: 0.55,
    wash: "diffDel",
    washOpacity: 0.055,
    pairClass: "surface",
  },
  {
    field: "text",
    opacity: 1,
    wash: "accent",
    washOpacity: 0.05,
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
 * A syntax role painted on one of the runtime's row tints. The tint is a role
 * at a fixed fraction, so the palette is measured on it rather than on the
 * document tone alone.
 */
export interface NativeSyntaxTint {
  /** The `NativeTextTheme` field whose role is the row tint. */
  readonly wash: keyof typeof nativeTextRoles;
  /** The fraction of the role painted, `0…1`. */
  readonly opacity: number;
}

/**
 * The two row tints a native diff paints under every line of a changed hunk —
 * `diffAdd` (`successText`) at 5.5% and `diffDel` (`destructiveText`) at 5.5%.
 * The runtime paints the gutter, marker and body over them, and a syntax run at
 * full alpha. Five shipped sets measured a syntax capture below the body floor
 * on these tints before their inks took one designed step.
 */
export const nativeSyntaxTints: readonly NativeSyntaxTint[] = [
  { wash: "diffAdd", opacity: 0.055 },
  { wash: "diffDel", opacity: 0.055 },
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
 * A code block's own frame is the theme's `border` on the 3.5% body ink wash,
 * and its language header's separator is the same role on the 2% header wash.
 * A diff file header is a 2.5% wash under its path (`textMuted`) and its two
 * counts (`diffAdd`/`diffDel`), and the hover wash — shared by the show-more row
 * — is 5%. The fades in {@link nativeTextFades} name the code body and the
 * per-role fades, not these washes. On `Dark · macOS` the accepted
 * `border: "#303030"` theme measures **1.002:1** on the code header's 2% wash,
 * and on `Dark` a `border: "#222222"` that clears every plain pair measures
 * **1.036:1** on the block's own body wash, while every other check returns
 * `[]`.
 */
export const nativeTextWashes: readonly NativeTextWash[] = [
  { field: "border", ink: 0.035, pairClass: "divider" },
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
  /** The document tone, or the opaque wash, the paint sat on. */
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
 * fractions, paints a code block on a black-or-white ink wash, frames it with
 * the theme's `border` on that same wash, and washes its own chrome — a code
 * header, a diff file header, their hover — with a lighter ink the theme does
 * not own; none of those compositions is a token pair, so
 * {@link themeContrastFailures} cannot see them. `themeNativeTextFailures` is
 * the seventh check: it holds {@link nativeTextFades}, {@link nativeTextOverFades},
 * {@link nativeSyntaxTints}, {@link nativeInlineCode},
 * {@link nativeTextWashes} and every syntax role
 * through {@link nativeInk} on all four {@link nativeTextSurfaces} tones, at the
 * floors {@link contrastFloors} owns.
 *
 * The check is what makes the extension guarantee whole for a native document: a
 * role lifted until its opaque pair just passes is still under the floor once
 * the runtime fades or washes it. A copied theme with `successText: "#bebebe"`
 * on identity dark returns `[]` from the other checks while a string token
 * measures **6.405:1** through the ink wash, and a blockquote's body — the
 * `foreground` run the reference paints, with the container's `mutedForeground`
 * held as the fallback — measures **6.315:1** over the 5% accent wash on
 * `Dark · Linux`, both under the body floor. A
 * `border: "#303030"` theme on `Dark · macOS` clears every plain-surface pair
 * and measures **1.002:1** on the code header's 2% wash; on `Dark`, a
 * `border: "#222222"` measures **1.036:1** on the block's own 3.5% body wash.
 * A changed diff line is the same story one surface over: its gutter, marker,
 * accent bar and syntax runs sit on a 5.5% tint of the add/delete status role,
 * which {@link nativeSyntaxTints} and the extended {@link nativeTextOverFades}
 * measure. Five shipped pairs measured 6.950–6.990:1 there while every other
 * check returned `[]`; their inks took one designed step.
 *
 * Inline code is a text-on-fill pair, not a fade: `codeText` (`primaryText`) is
 * painted on the opaque `codeWash` (`accent`) quad. Four shipped sets measured
 * 6.506–6.960:1 there, under the body floor, while every other check returned
 * `[]`; their ink takes one designed step. {@link nativeInlineCode} owns the
 * pair and reports any theme that resolves it below the body floor.
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
  const syntaxTintFailures = nativeSyntaxTints.flatMap((tint) => {
    const washRole = nativeTextRoles[tint.wash];
    return [...new Set(Object.values(nativeSyntaxRoles))].flatMap((role) =>
      nativeTextSurfaces.flatMap((surface) => {
        const tinted = compositeOver(
          alpha(theme.colors[washRole], tint.opacity),
          theme.colors[surface],
        );
        const ratio = contrastRatio(theme.colors[role], tinted);
        return ratio >= floors.body
          ? []
          : [
              {
                role,
                surface,
                opacity: 1,
                wash: washRole,
                washOpacity: tint.opacity,
                pairClass: "body" as const,
                floor: floors.body,
                ratio,
              },
            ];
      }),
    );
  });
  const inlineRole = nativeTextRoles[nativeInlineCode.text];
  const inlineWash = nativeTextRoles[nativeInlineCode.wash];
  const inlineRatio = contrastRatio(
    theme.colors[inlineRole],
    theme.colors[inlineWash],
  );
  const inlineFailures =
    inlineRatio >= floors[nativeInlineCode.pairClass]
      ? []
      : [
          {
            field: nativeInlineCode.text,
            role: inlineRole,
            surface: inlineWash,
            opacity: 1,
            pairClass: nativeInlineCode.pairClass,
            floor: floors[nativeInlineCode.pairClass],
            ratio: inlineRatio,
          },
        ];
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
    ...syntaxTintFailures,
    ...inlineFailures,
    ...washFailures,
    ...inkFailures,
  ];
}

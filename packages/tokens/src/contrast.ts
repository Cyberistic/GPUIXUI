/**
 * The accessibility contract a theme is held to, as data plus one function.
 *
 * A brand that edits a role needs the same check the built-in themes pass, so
 * the floors and the pairs they apply to are exported rather than hidden in the
 * test suite.
 */

import { themeColors, type ThemeColors } from "./color.js";
import { opaqueRgb } from "./measure.js";
import type { ThemeContrast } from "./theme.js";

const channel = (rgb: string, at: number): number => {
  const srgb = Number.parseInt(rgb.slice(at, at + 2), 16) / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.1 relative luminance of an opaque colour. */
const relativeLuminance = (color: string | undefined): number | undefined => {
  const rgb = color === undefined ? undefined : opaqueRgb(color);
  return rgb === undefined
    ? undefined
    : 0.2126 * channel(rgb, 1) +
        0.7152 * channel(rgb, 3) +
        0.0722 * channel(rgb, 5);
};

/**
 * The WCAG 2.1 contrast ratio between two opaque colours: 1 for identical
 * colours, 21 for black on white.
 *
 * The measured dialect is the colour grammar the renderer paints minus the
 * perceptual spaces: hex in every length the runtime paints, with or without the
 * `#` — shorthand `#fff` is widened, because a hand-written brand reaches for
 * it, and an eight-digit value whose alpha byte is `FF` is the opaque colour it
 * is, because `alpha(color, 1)` produces that form — a CSS named colour, and an
 * `rgb`/`hsl`/`hwb`/`hsv` function with an optional alpha channel. Returns
 * `undefined` when either value is not one of those: a translucent colour's
 * contrast depends on the surface painted behind it, so a single ratio would be
 * a guess (composite it first if it needs measuring), and a perceptual space
 * (`lab`, `lch`, `oklab`, `oklch`), a relative colour or a channel expression
 * resolves through a conversion this does not approximate. An absent role — a
 * theme restored from storage that predates it — is the same unmeasurable
 * answer rather than a crash.
 *
 * @example
 * ```ts
 * import { contrastFloors, contrastRatio, type Theme } from "@gpuixui/tokens";
 *
 * const ratio = contrastRatio(
 *   brand.colors.mutedForeground,
 *   brand.colors.muted,
 * );
 * const readable = ratio !== undefined && ratio >= contrastFloors.secondary;
 * ```
 */
export function contrastRatio(
  foreground: string | undefined,
  background: string | undefined,
): number | undefined {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  if (first === undefined || second === undefined) {
    return undefined;
  }
  const high = Math.max(first, second);
  const low = Math.min(first, second);
  return (high + 0.05) / (low + 0.05);
}

/** The contrast floors every shipped theme meets. */
export interface ContrastFloors {
  /** Body text. AAA. */
  readonly body: number;
  /** Secondary text, and text on a coloured fill. AA. */
  readonly secondary: number;
  /** Essential boundaries and focus rings. AA for non-text. */
  readonly boundary: number;
  /**
   * Inactive text and the control it labels. WCAG exempts a disabled component
   * from the text and non-text floors, so this is not a readability claim: it
   * says a disabled control is still *seen* as one, rather than as an empty box.
   */
  readonly disabled: number;
}

/** The floors of a default-contrast theme. */
export const contrastFloors: ContrastFloors = {
  body: 7,
  secondary: 4.5,
  boundary: 3,
  disabled: 1.5,
};

/**
 * The floors of a high-contrast theme: every text pair reaches AAA and every
 * boundary AA, so a high-contrast theme is a real accessibility mode rather
 * than a darker palette. Inactive text is held higher too, because a reader who
 * needs the mode still has to find the control that is unavailable.
 */
export const highContrastFloors: ContrastFloors = {
  body: 7,
  secondary: 7,
  boundary: 4.5,
  disabled: 3,
};

/**
 * The floors a theme's own contrast variant is held to.
 *
 * A theme that declares `contrast: "high"` is held to the AAA floors, not to the
 * default ones — the floors follow the declaration rather than the caller's
 * memory. A hand-built theme declares nothing and gets the default floors.
 *
 * @example
 * ```ts
 * contrastFloorsFor(highContrastDarkTheme); // { body: 7, secondary: 7, boundary: 4.5 }
 * ```
 */
export function contrastFloorsFor(theme: {
  readonly contrast?: ThemeContrast;
}): ContrastFloors {
  return theme.contrast === "high" ? highContrastFloors : contrastFloors;
}

/** One role pair a theme is measured on, and the floor it must reach. */
export interface ContrastPair {
  /** The role carrying text, an icon or a boundary. */
  readonly foreground: keyof ThemeColors;
  /** The role painted behind it. */
  readonly background: keyof ThemeColors;
  /** Which floor applies to this pair. */
  readonly floor: keyof ContrastFloors;
}

/**
 * The role pairs the floors apply to. Every theme the library ships — both
 * modes, both contrast variants and every platform style — is measured on all
 * of them, so a palette edit that makes text unreadable fails a test rather
 * than shipping.
 */
export const contrastPairs: readonly ContrastPair[] = [
  { foreground: "foreground", background: "background", floor: "body" },
  { foreground: "foreground", background: "card", floor: "body" },
  // A container paints a surface and the default `Text` inside it keeps
  // `foreground`: `surfaceStyle`'s `muted` and `popover` tones both carry body
  // copy (a message bubble is `bg-muted`, a panel is a popover), and no pair
  // measured either — the design system already claimed the popover.
  { foreground: "foreground", background: "popover", floor: "body" },
  { foreground: "foreground", background: "muted", floor: "body" },
  { foreground: "cardForeground", background: "card", floor: "body" },
  { foreground: "popoverForeground", background: "popover", floor: "body" },
  { foreground: "inputForeground", background: "input", floor: "body" },
  // A composite field — a search, tag or mention field, the chat composer, the
  // inline edit, the colour picker's hex field — paints the **page** role as
  // its own fill (`bg-background` in `@gpuixui/tw`'s recipes) and keeps
  // `text-input-foreground` inside it, so the page is a field surface too. The
  // placeholder sits on the same fill: a plain field's is measured on `input`,
  // and the composite field's is the second fill a host can be handed through
  // `nativeTextTheme(theme, "background")`.
  { foreground: "inputForeground", background: "background", floor: "body" },
  { foreground: "placeholder", background: "background", floor: "secondary" },
  // A field's own fill holds a third text role: the **muted** one. A time
  // picker paints its separator and its clear glyph `mutedForeground` inside a
  // root filled `input`, a number field's stepper chevrons the same, and
  // `nativeTextTheme` hands the runtime `mutedForeground` as `textMuted` over
  // `bg: input`. The role was measured on every surface *around* a field and on
  // none a field paints for itself, so a brand with a tinted fill could swallow
  // the colon between its time segments with every report empty.
  { foreground: "mutedForeground", background: "input", floor: "secondary" },
  {
    foreground: "mutedForeground",
    background: "background",
    floor: "secondary",
  },
  { foreground: "mutedForeground", background: "card", floor: "secondary" },
  { foreground: "mutedForeground", background: "muted", floor: "secondary" },
  {
    foreground: "mutedForeground",
    background: "popover",
    floor: "secondary",
  },
  {
    foreground: "secondaryForeground",
    background: "secondary",
    floor: "secondary",
  },
  {
    foreground: "primaryForeground",
    background: "primary",
    floor: "secondary",
  },
  {
    foreground: "destructiveForeground",
    background: "destructive",
    floor: "secondary",
  },
  {
    foreground: "successForeground",
    background: "success",
    floor: "secondary",
  },
  {
    foreground: "warningForeground",
    background: "warning",
    floor: "secondary",
  },
  { foreground: "infoForeground", background: "info", floor: "secondary" },
  { foreground: "infoSoftForeground", background: "infoSoft", floor: "body" },
  // A tinted message surface carries a second text role. An `Alert`'s
  // description is `text-foreground` (`ALERT_DESCRIPTION`) and its dismiss
  // control paints the page role too (`alert.tsx`), so the body copy and the
  // close glyph sit on `xSoft` in the page's own ink — not in the tone's
  // readable role. That paint is deliberate (the page role is the most readable
  // text a theme has), so the pair belongs in the table: a brand that repaints
  // `foreground` or authors its own tint could swallow the alert's copy while
  // every report stayed empty.
  { foreground: "foreground", background: "infoSoft", floor: "body" },
  { foreground: "foreground", background: "successSoft", floor: "body" },
  { foreground: "foreground", background: "warningSoft", floor: "body" },
  { foreground: "foreground", background: "destructiveSoft", floor: "body" },
  // A tinted surface carries a second, quieter role too: the diff viewer fills a
  // changed line with the tone's soft role and paints that line's numbers and its
  // `+`/`-` marker in `mutedForeground` (`lineTint` and `quiet` in
  // `packages/editor/src/diff/diff-viewer.tsx`). The table held the tone's own ink
  // and the page role on a tint, so the line numbers of exactly the rows a reader
  // is reading were measured by nothing — a brand whose grey sits near its pale
  // green or red would erase them with every report empty.
  {
    foreground: "mutedForeground",
    background: "successSoft",
    floor: "secondary",
  },
  {
    foreground: "mutedForeground",
    background: "destructiveSoft",
    floor: "secondary",
  },
  {
    foreground: "successSoftForeground",
    background: "successSoft",
    floor: "body",
  },
  {
    foreground: "warningSoftForeground",
    background: "warningSoft",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "destructiveSoft",
    floor: "body",
  },
  // A status message written as text on the page rather than on its own tinted
  // surface: a field error or an inline warning. The same role carries it, so
  // the page it sits on is measured too.
  { foreground: "infoSoftForeground", background: "background", floor: "body" },
  { foreground: "infoSoftForeground", background: "card", floor: "body" },
  {
    foreground: "successSoftForeground",
    background: "background",
    floor: "body",
  },
  { foreground: "successSoftForeground", background: "card", floor: "body" },
  {
    foreground: "warningSoftForeground",
    background: "background",
    floor: "body",
  },
  { foreground: "warningSoftForeground", background: "card", floor: "body" },
  {
    foreground: "destructiveSoftForeground",
    background: "background",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "card",
    floor: "body",
  },
  // A status message also sits on a floating surface: a destructive menu row
  // inside a popover, an inline warning on a command panel. The popover paints
  // the same role, so it is the third page a tone's text is measured on.
  { foreground: "infoSoftForeground", background: "popover", floor: "body" },
  {
    foreground: "successSoftForeground",
    background: "popover",
    floor: "body",
  },
  {
    foreground: "warningSoftForeground",
    background: "popover",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "popover",
    floor: "body",
  },
  // And on a **muted strip**, the fourth page a message sits on: a field error
  // under a settings form in a muted sidebar, an inline warning in a toolbar.
  // `decorativeSurfaces` already places the tone's soft tint and its edge on
  // `muted` ("a soft badge in a muted sidebar"), so the strip was a measured
  // *surface* for everything about a message except the text painted straight
  // on it — the role a `FieldError` and a `Text tone="destructive"` use with no
  // tint of their own.
  { foreground: "infoSoftForeground", background: "muted", floor: "body" },
  { foreground: "successSoftForeground", background: "muted", floor: "body" },
  { foreground: "warningSoftForeground", background: "muted", floor: "body" },
  {
    foreground: "destructiveSoftForeground",
    background: "muted",
    floor: "body",
  },
  // A navigation row and a highlighted mention suggestion paint their label in
  // `accentForeground` on `accent` (`navigation-menu.tsx`, `mention-input.tsx`),
  // and a row label is body text — the same claim `selectedForeground` and
  // `popoverForeground` are held to on the washes they sit on. It was measured
  // at the secondary floor, so a brand whose row label measured 4.68:1 passed
  // while the page's reading floor is 7:1. The two macOS styles were the only
  // shipped placements under it (6.53:1 and 6.74:1), so their foreground takes
  // the smallest step that clears it.
  {
    foreground: "accentForeground",
    background: "accent",
    floor: "body",
  },
  // A state wash is painted under a control's existing text, which keeps its
  // resting role: hovering a ghost button or a menu row tints the surface and
  // leaves the label `foreground`, and secondary text keeps `mutedForeground`.
  // So the wash is a surface those roles are measured on.
  { foreground: "foreground", background: "hover", floor: "body" },
  { foreground: "foreground", background: "active", floor: "body" },
  { foreground: "foreground", background: "accent", floor: "body" },
  { foreground: "mutedForeground", background: "hover", floor: "secondary" },
  { foreground: "mutedForeground", background: "active", floor: "secondary" },
  { foreground: "mutedForeground", background: "accent", floor: "secondary" },
  // A *secondary action* rests on the `secondary` role (measured above) and now
  // moves to a **derived** fill on a pointer — `filledHover`/`filledPressed` of
  // `secondary` — so its label's pointer contrast is `styles.test.ts`'s filled
  // role contract, not a role pair: a derived fill is not a role this table can
  // name. It carried `secondaryForeground` on the `hover`/`active` washes while
  // the variant swapped those washes in; the wash is the fill it replaced in
  // several styles (15 of its 32 placements under the floor), so those two pairs
  // retired with the paint.
  // An unfilled control paints no fill of its own, so the **group strip** it
  // sits in is its background: the design system's segmented `secondary` panel
  // (the strip `ring`, `borderStrong` and a disabled label are already measured
  // on, and the one a `ButtonGroup` or a toolbar option row is drawn in). An
  // `outline` or `ghost` action keeps `foreground`, and a quiet label or icon
  // keeps `mutedForeground`, so both roles were read on every strip a control
  // sits on except this one — a brand whose panel drifted toward its text could
  // ship a label that disappears inside the group while the edge beside it
  // passed.
  {
    foreground: "foreground",
    background: "secondary",
    floor: "body",
  },
  {
    foreground: "mutedForeground",
    background: "secondary",
    floor: "secondary",
  },
  // A selected row is the fourth wash, and it carries a row's **title**, which
  // is body text. The components' `ListItemTitle` overrides its recipe's colour
  // with the row's own role (`theme.colors.selectedForeground`) and paints it on
  // the `selected` fill the row sets behind it — or on the wash the same row
  // tints while the pointer moves — so that role is held to the **body** floor
  // on all four surfaces, not to the secondary floor a label on a filled action
  // gets. It measured 7.31:1 or better in every shipped, high-contrast, platform
  // and authored theme, so the floor moved without a palette.
  //
  // `foreground` on `selected` is the primitives' painter for the same slot: a
  // `Box surface="selected"` keeps the default `Text`'s page role.
  { foreground: "foreground", background: "selected", floor: "body" },
  {
    foreground: "selectedForeground",
    background: "selected",
    floor: "body",
  },
  { foreground: "selectedForeground", background: "hover", floor: "body" },
  { foreground: "selectedForeground", background: "active", floor: "body" },
  { foreground: "selectedForeground", background: "accent", floor: "body" },
  // A row floating on a popover keeps the *surface's* text role, not the page's:
  // a menu or combobox row is `popoverForeground`, and a destructive row is the
  // tone's readable role. So a wash painted under either is a surface those
  // roles are measured on — the row tints `hover` under the pointer and
  // `active` while it is pressed.
  { foreground: "popoverForeground", background: "hover", floor: "body" },
  { foreground: "popoverForeground", background: "active", floor: "body" },
  // A selected row inside a floating list is the third wash that role sits on:
  // the primitives' `Select` paints `selectItemClass` as `text-popover-foreground`
  // over `bg-selected`, so a selection that drifted toward the popover's own
  // text role would erase the row it just chose while its hover state passed.
  { foreground: "popoverForeground", background: "selected", floor: "body" },
  {
    foreground: "destructiveSoftForeground",
    background: "hover",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "active",
    floor: "body",
  },
  // A **list** row wears the other two washes, and it carries the same status
  // label: `Text tone="destructive"` resolves to the tone's readable role
  // (`toneColor` in the primitives), while `list.tsx` tints `accent` under the
  // pointer and fills `selected` once the row is chosen — so a destructive
  // caption in an inbox row or a failed item is painted on both. The two
  // floating-row pairs above measured the washes a *menu* row tints, and the
  // list row's own two were measured by nothing: a brand whose status text sat
  // near its selection would erase the failure exactly when the reader picked
  // the row. All sixteen shipped styles clear the body floor here, the tightest
  // being Luna dark's chosen row at 7.97:1.
  {
    foreground: "destructiveSoftForeground",
    background: "selected",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "accent",
    floor: "body",
  },
  { foreground: "placeholder", background: "input", floor: "secondary" },
  { foreground: "borderStrong", background: "background", floor: "boundary" },
  { foreground: "borderStrong", background: "card", floor: "boundary" },
  { foreground: "borderStrong", background: "input", floor: "boundary" },
  { foreground: "ring", background: "background", floor: "boundary" },
  { foreground: "ring", background: "card", floor: "boundary" },
  { foreground: "ring", background: "popover", floor: "boundary" },
  // A focused control inside a tinted strip — a toolbar on `muted`, a
  // segmented group on `secondary` — draws its ring on that strip, not on the
  // page beneath it.
  { foreground: "ring", background: "muted", floor: "boundary" },
  { foreground: "ring", background: "secondary", floor: "boundary" },
  // A focused control is drawn with its line **separated** from its own fill by
  // one border width (`keyboardFocusRing`), so the ring lies on the strip behind
  // the control rather than on the fill it paints. A control inside a filled
  // surface sits on that surface — a field's clear action inside `input`, a row
  // inside `selected`, a trailing action in the `accent` a row tints under the
  // pointer, the `active` wash a row keeps while pressed — and the gap shows
  // exactly that strip.
  { foreground: "ring", background: "input", floor: "boundary" },
  { foreground: "ring", background: "selected", floor: "boundary" },
  { foreground: "ring", background: "hover", floor: "boundary" },
  { foreground: "ring", background: "active", floor: "boundary" },
  { foreground: "ring", background: "accent", floor: "boundary" },
  // A control boundary sits on the same strips: an outline button in a toolbar
  // draws its edge on `muted`, and a bordered control in a filled panel draws it
  // on `secondary`. The edge must stay findable there for the same reason.
  { foreground: "borderStrong", background: "muted", floor: "boundary" },
  { foreground: "borderStrong", background: "secondary", floor: "boundary" },
  // A floating surface is a strip a control sits on too, and the ring was
  // measured there while the edge was not: a dialog's footer holds the
  // `secondary` cancel action (`confirm-dialog.tsx`, no `variant` so the default
  // paints `borderStrong`) on the `popover` fill `DIALOG_CONTENT` paints, and a
  // popover holding a form holds the same control. The two boundary roles are
  // drawn around the same elements, so they are measured on the same strips.
  { foreground: "borderStrong", background: "popover", floor: "boundary" },
  // A bordered control tints its own surface while it is hovered or pressed and
  // keeps its edge — the secondary action paints `borderStrong` and hands the
  // same element to the `hover` and `active` washes — so those washes are strips
  // the edge must stay findable on, not just the resting surface.
  { foreground: "borderStrong", background: "hover", floor: "boundary" },
  { foreground: "borderStrong", background: "active", floor: "boundary" },
  // And a control sits inside a **row's** wash, not only under its own: a list
  // row offers its `trailing` slot to an explicit action (a `secondary` button,
  // the one variant that owns a `borderStrong` edge), tints `accent` under the
  // pointer and fills `selected` once chosen. Those are the two washes the ring
  // is already measured on and the edge was not, so a brand whose edge matched
  // the row it sits in could ship a button with no outline while every strip it
  // rests on passed.
  { foreground: "borderStrong", background: "accent", floor: "boundary" },
  { foreground: "borderStrong", background: "selected", floor: "boundary" },
  // A control also sits on a **message's own tint**, the one strip this table
  // missed. An `Alert` paints its tone's `xSoft` fill (`ALERT_TONES`) and its
  // description is a container, so an action a consumer places there — the
  // package's own documented action is the text `AlertLink`, which paints no
  // boundary, but a filled action is the default `Button`, which paints
  // `borderStrong` — draws its edge on the tint. The edge is what
  // identifies a control there, as it does on a field: the neutral fill band is
  // one lightness and the pale tints share it (a `secondary` action reads
  // 1.01–1.04:1 on the green and amber tints of the light styles), so only the
  // boundary can carry the control. Measured, thirteen of the sixteen styles
  // missed it, the worst being the base dark theme's edge on `warningSoft` at
  // 2.23:1; the values moved by the smallest step that clears all four.
  { foreground: "borderStrong", background: "infoSoft", floor: "boundary" },
  { foreground: "borderStrong", background: "successSoft", floor: "boundary" },
  { foreground: "borderStrong", background: "warningSoft", floor: "boundary" },
  {
    foreground: "borderStrong",
    background: "destructiveSoft",
    floor: "boundary",
  },
  // A focused control draws its **ring** on the same strip its edge is measured
  // on — the line is separated from the control's own fill, so the tint behind
  // it is the surface it is read on — and the ring is measured on every strip a
  // control sits on except these four. A filled action placed in an alert's
  // description — the default `Button` — declares the keyboard ring at rest, so
  // a focus cue inside the one component built to be noticed was measured by
  // nothing: on
  // iris 500 the light ring read 2.94:1 on `infoSoft` and 2.84:1 on
  // `destructiveSoft`, and the high-contrast ring 4.41:1 and 4.16:1 against its
  // 4.5:1 floor. Both palettes move one ramp step deeper rather than the pairs
  // being dropped.
  { foreground: "ring", background: "infoSoft", floor: "boundary" },
  { foreground: "ring", background: "successSoft", floor: "boundary" },
  { foreground: "ring", background: "warningSoft", floor: "boundary" },
  { foreground: "ring", background: "destructiveSoft", floor: "boundary" },
  // A failed validation swaps a control's edge — and the focus line it paints
  // while invalid — to the `destructive` role, so that role is a boundary on
  // every strip a control sits on. The page, card, popover and `muted` strips
  // are already held to the same floor as an indicator mark; a field's own fill
  // and a filled panel are the two strips no contract measured.
  { foreground: "destructive", background: "input", floor: "boundary" },
  { foreground: "destructive", background: "secondary", floor: "boundary" },
  // A disabled control is exempt from WCAG's text floors, not from being found:
  // a field whose unavailable value matches its fill reads as an empty box.
  {
    foreground: "disabledForeground",
    background: "disabled",
    floor: "disabled",
  },
  // A disabled label also sits on the page beside enabled text — a fieldset
  // legend, a field's value the component leaves unfilled, an unavailable item
  // in a popover.
  {
    foreground: "disabledForeground",
    background: "background",
    floor: "disabled",
  },
  { foreground: "disabledForeground", background: "card", floor: "disabled" },
  {
    foreground: "disabledForeground",
    background: "popover",
    floor: "disabled",
  },
  // A disabled control also sits inside a group strip: a toolbar's `muted`
  // surface, a segmented `secondary` panel. The disabled fill can be the strip's
  // own value (base light `disabled` *is* `muted`), so the label's only
  // background is the toolbar or the panel around it.
  { foreground: "disabledForeground", background: "muted", floor: "disabled" },
  {
    foreground: "disabledForeground",
    background: "secondary",
    floor: "disabled",
  },
  // A selected row keeps the secondary text role its siblings use, so the
  // selection tint is a surface that text sits on.
  {
    foreground: "mutedForeground",
    background: "selected",
    floor: "secondary",
  },
];

/** One role pair that does not meet its floor. */
export interface ContrastFailure {
  /** The role carrying text, an icon or a boundary. */
  readonly foreground: keyof ThemeColors;
  /** The role painted behind it. */
  readonly background: keyof ThemeColors;
  /**
   * The measured ratio, or `undefined` when the pair could not be measured
   * because a value is translucent or not hex. An unmeasurable pair is reported
   * rather than skipped: a pair nobody can verify is not a pass.
   */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/**
 * Every role pair in a theme's colours that misses its floor.
 *
 * An empty array means the theme meets the contract. Runs the same pairs the
 * built-in themes are tested against, so a brand theme is held to the floors
 * the library publishes rather than to a second set. The floors follow the
 * theme's own `contrast` declaration unless one is passed — a brand derived from
 * a high-contrast theme is held to the AAA floors without the caller remembering
 * to say so, which is the rule `auditTheme` already applied. A pair whose role
 * the theme does not carry is reported unmeasurable (`ratio: undefined`) — the
 * absence is named by `invalidColorRoles`, and a pair nobody can verify is not a
 * pass. A theme that lost the whole `colors` group is read through
 * {@link themeColors}, so every pair is unmeasurable rather than a throw.
 *
 * @example
 * ```ts
 * import { contrastFailures, type Theme } from "@gpuixui/tokens";
 *
 * const failures = contrastFailures(brandTheme);
 * failures.length === 0; // the theme is readable
 * ```
 */
export function contrastFailures(
  theme: {
    readonly colors?: Partial<ThemeColors>;
    readonly contrast?: ThemeContrast;
  },
  floors: ContrastFloors = contrastFloorsFor(theme),
): readonly ContrastFailure[] {
  const colors = themeColors(theme);
  return contrastPairs.flatMap(({ foreground, background, floor }) => {
    const ratio = contrastRatio(colors[foreground], colors[background]);
    return ratio !== undefined && ratio >= floors[floor]
      ? []
      : [{ foreground, background, ratio, floor: floors[floor] }];
  });
}

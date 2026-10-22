/**
 * The color picker preview's model: the hex grammar and the commit rule.
 *
 * The shipped picker normalises a typed value on commit
 * (`packages/components/src/color/hex.ts`), reports a pressed swatch at once,
 * and marks the chosen swatch with a two-tone pip. A browser preview cannot
 * mount the native component, so it mirrors those rules here.
 *
 * `color-picker-preview.test.ts` executes the component's own normaliser beside
 * this one, so the grammar cannot drift, and reads the component for the six
 * default roles and the swatch's tab stop. The component is right: if this
 * module and the component disagree, the preview is the bug.
 */

import type { Theme } from "@gpuixui/tokens";

/** The six theme roles the picker offers when a caller passes no swatches. */
export const swatchRoles = [
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive",
  "foreground",
] as const;

/** A role from the theme's palette. */
export type SwatchRole = (typeof swatchRoles)[number];

/** One swatch: the role it is named for and the hex it commits. */
export interface Swatch {
  /** The role a default swatch takes from the theme, or a caller's own name. */
  readonly role: string;
  /** The colour the picker commits when this swatch is pressed. */
  readonly value: string;
}

/**
 * The picker's default grid: six theme colours, in the order the component
 * reads them. `swatchRoles` is held to the component's `defaultSwatches`.
 */
export const defaultSwatches = (theme: Theme): ReadonlyArray<Swatch> =>
  swatchRoles.map((role) => ({ role, value: theme.colors[role] }));

/**
 * The preview's own palette, to show that `swatches` is the caller's list.
 *
 * These are a brand's colours rather than theme roles, so the selected mark is
 * the caller's to check: the pip carries the page fill and the body ink, so at
 * most one of them disappears into a swatch, but a custom palette is not the
 * six defaults the component's own suite measures.
 */
export const brandSwatches: ReadonlyArray<Swatch> = [
  { role: "ink", value: "#0f172a" },
  { role: "ocean", value: "#2563eb" },
  { role: "teal", value: "#0d9488" },
  { role: "amber", value: "#d97706" },
];

/**
 * The component's normal form: a lowercase six-digit hex, or `undefined`.
 *
 * Shorthand (`#abc`) and a missing `#` are accepted; 4/8-digit alpha forms are
 * refused because the picker has no alpha control.
 */
export const normalizeHex = (input: string): string | undefined => {
  const bare = input.trim().replace(/^#/, "").toLowerCase();
  const expanded =
    bare.length === 3
      ? [...bare].map((digit) => `${digit}${digit}`).join("")
      : bare;
  const value = `#${expanded}`;
  return /^#[0-9a-f]{6}$/.test(value) ? value : undefined;
};

/** Whether a draft would commit, which is what the field's edge reports. */
export const isDraftValid = (draft: string): boolean =>
  normalizeHex(draft) !== undefined;

/** Whether two hex inputs describe the same colour, in normal form. */
export const sameHex = (left: string, right: string): boolean => {
  const a = normalizeHex(left);
  const b = normalizeHex(right);
  return a !== undefined && a === b;
};

/** The three values a commit or a press produces. */
export interface Committed {
  /** The value the picker now holds. */
  readonly value: string;
  /** The draft the field now shows. */
  readonly draft: string;
  /** Whether the value actually moved. */
  readonly changed: boolean;
}

/**
 * Commit a typed draft.
 *
 * A valid draft is normalised and becomes the value; an invalid one is
 * discarded and the field returns to the committed value, which is what the
 * component's `commit` does on both `Enter` and blur.
 */
export const commit = (draft: string, value: string): Committed => {
  const hex = normalizeHex(draft);
  return hex === undefined
    ? { value, draft: value, changed: false }
    : { value: hex, draft: hex, changed: !sameHex(hex, value) };
};

/**
 * Choose a swatch: a press commits at once, with no separate draft step.
 *
 * A swatch the picker cannot normalise is still the caller's string, which is
 * why the component falls back to it rather than dropping the press.
 */
export const choose = (swatch: string, value: string): Committed => {
  const hex = normalizeHex(swatch) ?? swatch;
  return { value: hex, draft: hex, changed: !sameHex(hex, value) };
};

/** The role of the swatch the value names, or `undefined` for a custom hex. */
export const chosenRole = (
  swatches: ReadonlyArray<Swatch>,
  value: string,
): string | undefined =>
  swatches.find((swatch) => sameHex(swatch.value, value))?.role;

/** The readout the workflow prints under the picker. */
export const describe = (value: string, draft: string): string =>
  `value=${value} draft=${draft} ${isDraftValid(draft) ? "valid" : "invalid"}`;

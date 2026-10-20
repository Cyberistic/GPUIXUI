import { type GeneratedSearchEntry } from "./generated-search";
import { absentStylingConcepts, familyOf, styleFieldNames } from "./styling";

/**
 * The style fields a query can name (plan 606). `<StyleFields />` is rendered by
 * `fumadocs-typescript` from the installed `@gpuix/native` declarations, and
 * generated type-table rows are deliberately dropped from search (plan 479), so
 * without this document no field name has a home: measured 2026-10-20 at
 * `f84d20fa`, `pointerEvents` reached Toast's keyboard section, `userSelect`
 * reached Text's theming section, and `lineClamp`, `rowGap`,
 * `gridTemplateColumns`, `selectionColor` and `textOverflow` returned nothing.
 *
 * Every field name here is a spelling no other document owns: Theming promotes
 * the token names (`radius.md`, `spacing.md`) and the helper
 * `elevationShadow`, and Typography promotes its text roles (`body`,
 * `displayLg`). A plain field name (`gap`, `color`, `padding`) is indexed but
 * never promoted, so the page that owns the word keeps the first result.
 *
 * The four text fields stay out of `names` for a different reason: a promoted
 * camelCase name also matches its spaced phrase through `promotedNameRank`'s
 * variant tier, and `font size`, `line height`, `font weight` and `font family`
 * are Typography's subjects (plan 574 measured them there). They remain indexed
 * here, so the field is still found in this document's text; only the promotion
 * that would steal the phrase is withheld.
 */
export const STYLE_FIELDS_KEPT_AS_PROSE: ReadonlySet<string> = new Set([
  "fontSize",
  "lineHeight",
  "fontWeight",
  "fontFamily",
]);

const promotes = (name: string): boolean =>
  /[A-Z]/.test(name) && !STYLE_FIELDS_KEPT_AS_PROSE.has(name);

export const promotedStyleFieldNames = (): ReadonlyArray<string> =>
  styleFieldNames.filter(promotes);

export const stylingSearchEntry: GeneratedSearchEntry = {
  names: promotedStyleFieldNames(),
  index: {
    title: "Styling",
    description:
      "The style prop, every StyleDesc field, and the CSS concepts the runtime does not have.",
    content: [
      "The style prop accepts a StyleDesc. GPUix has no CSS, no className and no stylesheets.",
      ...styleFieldNames.map(
        (name) => `${name}: ${familyOf(name)?.title ?? "unclassified"}`,
      ),
      ...absentStylingConcepts.map(
        (row) => `${row.concept}: ${row.replacement}`,
      ),
    ].join("\n"),
    url: "/docs/styling",
    breadcrumbs: ["Styling"],
    keywords: styleFieldNames.join(" "),
  },
};

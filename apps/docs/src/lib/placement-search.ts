import {
  isDistinctiveName,
  type GeneratedSearchEntry,
} from "./generated-search";
import {
  layerMapping,
  placementAbsences,
  placementProps,
  placementSurfaces,
} from "./placement";

/**
 * The Overlay placement page renders its tables from `placement.ts`, so the
 * page index cannot see the five prop names, the `<anchored>` mapping or the
 * per-surface matrix (plan 636). The simple index also tokenises `sideOffset`
 * and `collisionPadding` as one word each, so the distinctive names are
 * promoted, the rule plans 587 and 635 set.
 *
 * Only distinctive names are promoted. Plain words (`side`, `align`, `fit`,
 * `snap`, `flip`) stay prose so the pages and components that own them keep
 * them, and `AnchoredProps` is not promoted: Native elements owns the element.
 */
export const placementSearchEntry: GeneratedSearchEntry = {
  names: [
    "FloatingContentProps",
    "FloatingLayer",
    "sideOffset",
    "alignOffset",
    "collisionPadding",
    "snapMargin",
    "resolvePlacement",
    "resolveSide",
    "usePlacement",
  ].filter(isDistinctiveName),
  index: {
    title: "Overlay placement",
    description:
      "How floating surfaces are positioned: the five placement props, the anchored layer, which components correct the measured centre and snap defects, and what is not possible.",
    content: [
      ...placementProps.map(
        (row) =>
          `${row.name} (${row.type}, default ${row.default}): ${row.summary}`,
      ),
      ...layerMapping.map(
        (row) => `${row.from} becomes ${row.to}: ${row.value}. ${row.summary}`,
      ),
      ...placementSurfaces.map(
        (row) =>
          `${row.surface} (${row.source}): ${row.correction}. ${row.summary}`,
      ),
      ...placementAbsences.map(
        (absence) => `${absence.subject}: ${absence.statement}`,
      ),
    ].join("\n"),
    url: "/docs/overlay-placement",
    breadcrumbs: ["Overlay placement"],
    keywords:
      "overlay placement side align collision padding flip snap anchored anchored props collision padding reposition",
  },
};

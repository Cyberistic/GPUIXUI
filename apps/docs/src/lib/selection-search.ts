import type { GeneratedSearchEntry } from "./generated-search";
import {
  findRangeFields,
  highlightFields,
  selectionAbsences,
  selectionMethods,
  textSearchFields,
} from "./selection";

/**
 * The selection catalogue's search document (plan 627). The page renders its
 * tables React, and generated type-table rows are dropped from search (plan
 * 479), so without this document the API spellings have no home: measured
 * 2026-10-20, `getSelectedText`, `onSelectionChange`, `observeSelectedText`
 * and `useTextSearch` returned nothing or the roadmap.
 *
 * Only distinctive spellings are promoted — the type names, the renderer
 * methods and the camelCase fields. Plain words (`highlight`, `selection`,
 * `find`) stay indexed so Radio group keeps `selection` and Search input keeps
 * `search`.
 */
export const selectionSearchEntry: GeneratedSearchEntry = {
  names: [
    "HighlightSpec",
    "HighlightMatch",
    "TextSearchOptions",
    "TextSearchController",
    "TextSearchSnapshot",
    ...highlightFields
      .map((field) => field.name)
      .filter((name) => /[A-Z]/u.test(name)),
    ...textSearchFields
      .map((field) => field.name)
      .filter((name) => /[A-Z]/u.test(name)),
    ...selectionMethods.map((method) => method.name),
  ],
  index: {
    title: "Selection and find",
    description:
      "How a GPUix app reads the native text selection, highlights matches, and drives a find bar: the selection API, every HighlightSpec field, the virtualized match offset and the missing clipboard.",
    content: [
      "The operating system owns text selection. The renderer reports what is selected and paints match washes; the library ships no component for either.",
      "A selection is read with render options' onSelectionChange, renderer.getSelectedText, observeSelectedText, or cleared with clearSelection.",
      ...selectionMethods.map((method) => `${method.name}: ${method.summary}`),
      ...highlightFields.map(
        (field) => `highlight ${field.name}: ${field.summary}`,
      ),
      ...textSearchFields.map(
        (field) => `text search ${field.name}: ${field.summary}`,
      ),
      ...findRangeFields.map(
        (field) => `findRanges ${field.name}: ${field.summary}`,
      ),
      "A find bar uses useTextSearch: spread its props onto the container and read total, active, next, previous and goTo. createTextSearchController is the framework-neutral controller; findRanges computes [start, end) pairs you already know.",
      "A virtual list mounts a window of rows, so a global active match needs matchIndexOffset — a match count, not a row index — summed with findRanges over the rows before windowStart.",
      "Native text (code, diff, markdown) is outside the subtree text, so highlight it with query rather than ranges. A match never crosses a line and a range that splits a surrogate pair is rejected.",
      ...selectionAbsences.map(
        (absence) => `${absence.subject}: ${absence.statement}`,
      ),
    ].join("\n"),
    url: "/docs/selection",
    breadcrumbs: ["Selection and find"],
    keywords: [
      "text selection",
      "select text",
      "find in page",
      "find text",
      "highlight matches",
      "match count",
      ...highlightFields.map((field) => field.name),
      ...selectionMethods.map((method) => method.name),
    ].join(" "),
  },
};

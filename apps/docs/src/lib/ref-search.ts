import { instanceRows } from "./element-instance";
import type { GeneratedSearchEntry } from "./generated-search";

/**
 * `## Refs and element handles` is authored prose plus a rendered table, and
 * every generated type-table row is dropped from search (plan 479). Without
 * this document `scrollIntoView` and `PublicInstance` have no home (plan 624),
 * and `ref` finds the API reference page instead of the contract.
 *
 * Only the two distinctive camelCase names are promoted; the plain members
 * (`id`, `type`, `props`) stay indexed but unpromoted, because each already has
 * an owner elsewhere. The phrase forms a reader types (`ref`, `forwardRef`,
 * `element handle`, `scroll into view`) are page aliases, not names.
 */
export const refSearchEntry: GeneratedSearchEntry = {
  names: ["scrollIntoView", "PublicInstance"],
  index: {
    title: "Component API",
    description:
      "The element instance a ref receives, the focus recipe, and the merged-ref helper.",
    content: instanceRows
      .map((member) => `${member.name}: ${member.summary}`)
      .join("\n"),
    url: "/docs/component-api#refs-and-element-handles",
    breadcrumbs: ["Component API"],
    keywords: instanceRows.map((member) => member.name).join(" "),
  },
};

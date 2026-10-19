import type { GeneratedSearchEntry } from "./generated-search";

/**
 * `## Layering` on Component API is authored prose, but the words a web reader
 * types for the concept do not occur in it: `z-index` and `zindex` are the DOM
 * mechanism GPUix lacks, and `layering`/`stacking` name the section itself
 * (plan 589). Measured before: `z-index` reached the Values API, `zindex` a
 * Toast limitation and `layering` nothing.
 *
 * `overlay` is deliberately not promoted: it is a plain word the Tooltip page
 * also uses, and plan 569's rule leaves a word to the page that owns it.
 */
export const layeringSearchEntry: GeneratedSearchEntry = {
  names: ["z-index", "zindex", "layering", "stacking"],
  index: {
    title: "Component API",
    description:
      "Overlay layering: paint order, no portal and the topmost dismiss stack.",
    content:
      "GPUix has no z-index and no portal. Overlays stack in paint order, the last mounted surface is on top, and Escape or an outside press reaches only the topmost dismiss layer.",
    url: "/docs/component-api#layering",
    breadcrumbs: ["Component API"],
    keywords: "z-index zindex layering stacking overlay portal",
  },
};

import type { GeneratedSearchEntry } from "./generated-search";
import { iconCatalogue } from "./icon-catalogue.generated";

/**
 * The icon names, indexed for ⌘K (plan 507). The Icons page renders the names
 * React from a generated catalogue, so the MDX page index never sees them — the
 * same gap plans 419, 490, 504 and 505 closed for components, values, tokens and
 * scenario ids.
 *
 * Only **hyphenated** names are promoted. A plain word such as `search`, `copy`,
 * `filter`, `list`, `star`, `user` or `x` is also an icon name, and promoting it
 * would push Search input, Copy button prose and the rest of the pages that own
 * the word out of the first result (the rule plan 504 proved for tokens and
 * plan 505 for scenario ids). A distinctive name (`chevrons-up-down`,
 * `star-filled`) has no such collision.
 */
const names = iconCatalogue.map((icon) => icon.name);

/**
 * The names that outrank prose: a hyphenated icon name is distinctive, so it
 * cannot be mistaken for the page that owns a plain word.
 */
export const promotedIconNames: ReadonlyArray<string> = names.filter((name) =>
  name.includes("-"),
);

export const iconSearchEntry: GeneratedSearchEntry = {
  index: {
    title: "Icon names",
    description:
      "Every name the icon set ships, with the geometry the runtime paints.",
    content: [...names, "icon", "glyph"].join("\n"),
    url: "/docs/components/icon",
    breadcrumbs: ["Components"],
    keywords: names.join(" "),
  },
  names: promotedIconNames,
};

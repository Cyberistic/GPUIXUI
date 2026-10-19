import { components } from "@/component-meta/registry";
import {
  missingAria,
  supportedAria,
  supportedHostProps,
} from "./accessibility";
import type { GeneratedSearchEntry } from "./generated-search";

/**
 * `<AriaSupportTable />` and `<AccessibilityIndex />` are rendered React, so
 * the Fumadocs page index sees neither their rows nor the limitation strings
 * (D32; plans 419, 490, 504, 505). This document gives the page its own index
 * entry: `aria-valuenow` reaches the table that explains its absence, and a
 * limitation a reader remembers from a page reaches the aggregate.
 *
 * Only the `aria-*` attributes are promoted. `role`, `tabIndex` and
 * `autoFocus` are ordinary words that would steal pages which own them, and a
 * component title (`Checkbox`) still outranks this document.
 */
const promoted = [...supportedAria, ...missingAria];

const attributeContent = [
  ...supportedAria.map((row) => `${row.attribute}: ${row.meaning}`),
  ...missingAria.map(
    (row) => `${row.attribute} (not available): ${row.substitute}`,
  ),
  ...supportedHostProps.map((row) => `${row.attribute}: ${row.meaning}`),
].join("\n");

const limitationContent = components
  .filter(
    (component) =>
      component.status !== "planned" && component.limitations.length > 0,
  )
  .map((component) => `${component.title}: ${component.limitations.join(" ")}`)
  .join("\n");

export const accessibilitySearchEntry: GeneratedSearchEntry = {
  names: promoted.map((row) => row.attribute),
  index: {
    title: "Accessibility",
    description:
      "The runtime's ARIA surface, the substitute for every missing attribute, and each component's recorded limitations.",
    content: `${attributeContent}\n\n${limitationContent}`,
    url: "/docs/accessibility",
    breadcrumbs: ["Accessibility"],
    keywords: promoted.map((row) => row.attribute).join(" "),
  },
};

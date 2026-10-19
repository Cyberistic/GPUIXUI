import {
  isDistinctiveName,
  type GeneratedSearchEntry,
} from "./generated-search";
import { sharedHostProps } from "./host-props";

/**
 * `<HostPropsTable />` is rendered React from the installed `HostProps`, and
 * every generated type-table row is deliberately dropped from search (plan
 * 479). Without this document `testId` and `onKeyDown` have no home at all
 * (plan 587): measured `testId` reached Meter and `onKeyDown` reached Cards.
 *
 * Distinctive camelCase names are promoted; plain words (`style`, `highlight`,
 * `motion`) stay prose so Theming and the component pages keep them.
 */
export const hostPropsSearchEntry: GeneratedSearchEntry = {
  names: sharedHostProps.map((prop) => prop.name).filter(isDistinctiveName),
  index: {
    title: "Component API",
    description:
      "The conventions every component follows, including the host props every part inherits.",
    content: sharedHostProps
      .map((prop) => `${prop.name}: ${prop.summary}`)
      .join("\n"),
    url: "/docs/component-api#shared-host-props",
    breadcrumbs: ["Component API"],
    keywords: sharedHostProps.map((prop) => prop.name).join(" "),
  },
};

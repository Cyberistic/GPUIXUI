import {
  isDistinctiveName,
  type GeneratedSearchEntry,
} from "./generated-search";
import { stateTypes } from "./part-states.generated";

/**
 * `<PartStates />` is rendered React from the package, so the page index never
 * sees its rows (plan 623). Each state type is a distinctive camelCase name and
 * is promoted; a field (`editing`, `pinned`, `status`) is indexed by the
 * content but never promoted, because a plain word already has an owner
 * elsewhere (plan 569).
 */
export const partStatesSearchEntry: GeneratedSearchEntry = {
  exactNamesOnly: true,
  names: stateTypes.map((state) => state.name).filter(isDistinctiveName),
  index: {
    title: "Part states",
    description:
      "Every exported state type in @gpuixui/components and the fields it declares.",
    content: stateTypes
      .map(
        (state) => `${state.name} (${state.file}): ${state.fields.join(", ")}`,
      )
      .join("\n"),
    url: "/docs/component-api#every-state-type",
    breadcrumbs: ["Component API"],
    keywords: stateTypes
      .flatMap((state) => [state.name, ...state.fields])
      .join(" "),
  },
};

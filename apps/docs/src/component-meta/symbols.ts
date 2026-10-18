import type { ComponentMetaInput } from "./schema";

const PROPS_SUFFIX = "Props";

/**
 * The component names a record's documented props types imply. A page that
 * documents `SpinnerProps` is the page for `Spinner`, even when its inventory
 * title is "Loading indicators", so a reader who types the real export reaches
 * it (plan 500). Derived, never authored: the record already lists its props
 * types for `/docs/api-reference`.
 */
export const componentSymbols = (
  component: Pick<ComponentMetaInput, "api">,
): ReadonlyArray<string> => [
  ...new Set(
    component.api
      .filter(
        (name) =>
          name.endsWith(PROPS_SUFFIX) && name.length > PROPS_SUFFIX.length,
      )
      .map((name) => name.slice(0, -PROPS_SUFFIX.length)),
  ),
];

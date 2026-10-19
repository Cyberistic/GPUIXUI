import { valueExports } from "./api-values.generated";
import {
  isDistinctiveName,
  type GeneratedSearchEntry,
} from "./generated-search";

/**
 * `/docs/tokens-api` documents every exported helper in an authored table, so
 * the Fumadocs page index sees the rows. A camelCase helper is one lexical
 * token, though, and `focus ring` never retrieves it (plan 569), so this
 * document promotes the real helper names, derived from the package exports so
 * it cannot drift from the table the page renders.
 */
const helperNames = valueExports
  .filter(
    (value) =>
      value.package.startsWith("@gpuixui/tokens") &&
      value.visibility === "public" &&
      (value.kind === "function" || value.kind === "hook"),
  )
  .map((value) => value.name);

export const tokensApiSearchEntry: GeneratedSearchEntry = {
  names: helperNames.filter(isDistinctiveName),
  index: {
    title: "Tokens API",
    description:
      "Theme shapes, extension helpers and the React provider in @gpuixui/tokens.",
    content:
      "The exported helpers documented in the Functions table, with their signatures and return values.",
    url: "/docs/tokens-api#functions",
    breadcrumbs: ["Tokens API"],
  },
};

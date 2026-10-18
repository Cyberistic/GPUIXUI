import { capabilities } from "./capabilities";
import type { GeneratedSearchEntry } from "./generated-search";

/**
 * `/docs/capabilities` renders its matrix from `capabilities.ts`, so the MDX
 * page index never sees a scenario id. The page invites the reader to run one
 * ("the scenario id is what you can run yourself"), so search must reach it:
 * `modal-focus-trap` found command-menu prose before this document existed
 * (plan 505).
 *
 * Promoted names are the hyphenated ones — every scenario id, plus a capability
 * such as `virtual-list`. A plain capability word (`theme`, `text`, `log`) is
 * indexed in the content but never promoted, so its own page keeps the first
 * result.
 */
const promotedNames = [
  ...capabilities.flatMap((entry) => entry.scenarios),
  ...capabilities
    .map((entry) => entry.capability)
    .filter((name) => name.includes("-")),
];

const content = capabilities
  .map(
    (entry) =>
      `${entry.label} (${entry.capability}): ${entry.verdict}. ${entry.proves} ` +
      `Scenarios: ${entry.scenarios.join(", ")}. ` +
      `Plans: ${entry.plans.map((plan) => `plan ${plan}`).join(", ")}.`,
  )
  .join("\n");

export const capabilitySearchEntry: GeneratedSearchEntry = {
  names: promotedNames,
  index: {
    title: "GPUix capabilities",
    description: "The measured 0.10.0 matrix and the scenarios that prove it.",
    content,
    url: "/docs/capabilities",
    breadcrumbs: ["GPUix capabilities"],
    keywords: promotedNames.join(" "),
  },
};

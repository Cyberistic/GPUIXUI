import { plainNote } from "./roadmap-note";
import { roadmapAliasTerms } from "./roadmap-aliases";
import { roadmapTargets } from "./roadmap.generated";
import type { GeneratedSearchEntry } from "./generated-search";

/**
 * `/docs/roadmap` renders its rows from `roadmap.generated.ts`, so the MDX page
 * index never sees a target name (plan 518). Without this document a reader
 * searching for `Resizable split panes` would find nothing, which is the same
 * gap plans 504, 505 and 507 closed for tokens, scenario ids and icons.
 *
 * Only **multiword** names are promoted. A single word (`Tables`, `Toolbars`,
 * `Charts`) is indexed but keeps its prose result, the rule plans 504 and 505
 * established for plain words such as `input` and `theme`. A target whose
 * subject has no other owner may add the one word a reader uses in
 * `roadmap-aliases.ts` (plan 585); that table is guarded against shadowing a
 * component, a page title or another alias.
 */
const PROMOTED_NAMES = [
  ...roadmapTargets
    .map((target) => target.name)
    .filter((name) => name.includes(" ")),
  ...roadmapAliasTerms,
];

const describe = (target: {
  readonly tier: number;
  readonly name: string;
  readonly status: string;
  readonly support: string;
  readonly note: string;
}): string =>
  `${target.name} (Tier ${target.tier}): ${target.status}; ` +
  `GPUix support ${target.support}. ${plainNote(target.note)}`;

export const roadmapSearchEntry: GeneratedSearchEntry = {
  names: PROMOTED_NAMES,
  index: {
    title: "Roadmap",
    description:
      "Every tracked component target, its status and the measured GPUix support.",
    content: roadmapTargets.map(describe).join("\n"),
    url: "/docs/roadmap",
    breadcrumbs: ["Roadmap"],
    keywords: roadmapTargets.map((target) => target.name).join(" "),
  },
};

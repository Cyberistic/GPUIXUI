import type { SortedResult } from "fumadocs-core/search";
import type { GeneratedSearchEntry } from "./generated-search";
import { liveSceneRows } from "./live-scenes";

/**
 * The scene index itself: every shipped scene, including the ones no gesture
 * opens, so `live scene` reaches `/docs/previews` rather than the maintainer
 * guide that happens to use the words. This is the generated surface's one
 * search document: a second document at a component page's URL would collide
 * with the registry document in the same index (plan 582).
 */
export const scenesIndexEntry: GeneratedSearchEntry = {
  index: {
    title: "Live scenes",
    description:
      "Every shipped GPUix scene, the page that mounts it and what a reader does to see its state.",
    content: liveSceneRows()
      .map(
        (row) => `${row.scene} ${row.title}: ${row.interaction} ${row.gesture}`,
      )
      .join("\n"),
    url: "/docs/previews",
    breadcrumbs: ["Previews"],
    keywords: liveSceneRows()
      .map((row) => `${row.scene} ${row.title}`)
      .join(" "),
  },
  names: ["Live scenes"],
};

/**
 * A scene's instruction is a phrase the page owns, not a name. It ranks above
 * prose and a page-title **token** match (`type the workspace name` reached
 * Workspace), but below an exact title, because `TOKEN_MATCH_RANK` is 4.
 */
export const SCENE_MATCH_RANK = 3;

/** Words that cannot identify a scene on their own. */
const STOP_WORDS = new Set([
  "and",
  "at",
  "by",
  "for",
  "in",
  "it",
  "of",
  "on",
  "the",
  "then",
  "to",
  "with",
]);

const words = (value: string): ReadonlyArray<string> =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));

/**
 * `SCENE_MATCH_RANK` when every meaningful query word prefixes a word of the
 * instruction, otherwise `undefined`. A one-word query is never promoted: many
 * scenes start with "Click" and a plain word must keep the page that owns it.
 */
export const sceneInstructionRank = (
  instruction: string | undefined,
  query: string,
): number | undefined => {
  if (instruction === undefined) return undefined;
  const terms = words(query);
  if (terms.length < 2) return undefined;
  const instructionWords = words(instruction);
  return terms.every((term) =>
    instructionWords.some((word) => word.startsWith(term)),
  )
    ? SCENE_MATCH_RANK
    : undefined;
};

/** The instruction each gesture scene's page shows, keyed by that page. */
export const sceneInstructionByUrl: ReadonlyMap<string, string> = new Map(
  liveSceneRows().flatMap((row) =>
    row.href === null || row.gesture.length === 0
      ? []
      : [[row.href, row.interaction] as const],
  ),
);

/**
 * One page candidate per scene whose instruction matches, even when the lexical
 * index never returned the document. The rank comes from
 * `sceneInstructionRank` in `mergeResults`.
 */
export const sceneInstructionHits = (
  query: string,
): ReadonlyArray<SortedResult> =>
  liveSceneRows().flatMap((row) =>
    row.href === null ||
    sceneInstructionRank(row.interaction, query) === undefined
      ? []
      : [
          {
            id: `scene:${row.scene}`,
            url: row.href,
            type: "page" as const,
            content: row.title,
          },
        ],
  );

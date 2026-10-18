import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The public roadmap's derivation (plan 518). `COMPONENTS.md` owns the target
 * inventory; this module reads its Tier 3–5 tables so the page can render them,
 * the same build-time boundary `icon-catalogue.ts` and `capabilities.ts` use.
 * Only `roadmap.generated.ts` reaches the browser.
 *
 * The generated row keeps the note **verbatim**; `roadmap-note.ts` turns the
 * Markdown-lite into spans at render time, so the committed module is a faithful
 * copy of the inventory row rather than a second representation of its format.
 *
 * `node:fs`/`node:path` and native array helpers are deliberate here: this is a
 * build-and-test boundary, never client code, and `effect/*` in a non-test
 * module of `apps/docs` would fail the architecture guard.
 */

export type RoadmapTier = 3 | 4 | 5;

export interface RoadmapTarget {
  readonly tier: RoadmapTier;
  /** The heading's label, verbatim after the em dash: `"data presentation"`. */
  readonly tierTitle: string;
  readonly name: string;
  readonly status: string;
  readonly support: string;
  /** The inventory's note, verbatim. */
  readonly note: string;
}

const TIER_HEADING = /^## Tier ([345]) — (.+)$/;
const TABLE_ROW = /^\| (.*?) \| (.*?) \| (.*?) \| (.*?) \|$/;
const INVENTORY_FILE = "COMPONENTS.md";

const tierOf = (value: string): RoadmapTier | null =>
  value === "3" ? 3 : value === "4" ? 4 : value === "5" ? 5 : null;

interface ParseState {
  readonly tier: RoadmapTier | null;
  readonly tierTitle: string;
  readonly targets: ReadonlyArray<RoadmapTarget>;
}

/**
 * Every Tier 3–5 row, in file order. The inventory's four cells are name,
 * status, GPUix support and notes; its header and separator rows are skipped.
 */
export const parseInventory = (
  markdown: string,
): ReadonlyArray<RoadmapTarget> =>
  markdown.split("\n").reduce<ParseState>(
    (state, line): ParseState => {
      const heading = TIER_HEADING.exec(line);
      if (heading !== null) {
        const [, number = "", title = ""] = heading;
        const tier = tierOf(number);
        return tier === null
          ? { ...state, tier: null, tierTitle: "" }
          : { ...state, tier, tierTitle: title.trim().toLowerCase() };
      }
      if (line.startsWith("## "))
        return { ...state, tier: null, tierTitle: "" };
      if (state.tier === null) return state;

      const cells = TABLE_ROW.exec(line);
      if (cells === null) return state;
      const [, name = "", status = "", support = "", note = ""] = cells;
      if (name === "Component" || /^-+$/.test(name)) return state;

      return {
        ...state,
        targets: [
          ...state.targets,
          {
            tier: state.tier,
            tierTitle: state.tierTitle,
            name: name.trim(),
            status: status.trim(),
            support: support.trim(),
            note: note.trim(),
          },
        ],
      };
    },
    { tier: null, tierTitle: "", targets: [] },
  ).targets;

/** Why the derived inventory cannot be published; an empty list is publishable. */
export const roadmapProblems = (
  targets: ReadonlyArray<RoadmapTarget>,
): ReadonlyArray<string> => {
  const empty = targets
    .filter(
      (target) =>
        target.name === "" ||
        target.status === "" ||
        target.support === "" ||
        target.note === "",
    )
    .map((target) => `${target.name || "(unnamed)"}: an empty cell`);

  const duplicates = targets.reduce<{
    readonly seen: ReadonlySet<string>;
    readonly found: ReadonlyArray<string>;
  }>(
    (state, target) => ({
      seen: new Set([...state.seen, target.name]),
      found: state.seen.has(target.name)
        ? [...state.found, `${target.name}: duplicate target`]
        : state.found,
    }),
    { seen: new Set(), found: [] },
  ).found;

  const tiers = new Set(targets.map((target) => target.tier));
  const missing = ([3, 4, 5] as const)
    .filter((tier) => !tiers.has(tier))
    .map((tier) => `Tier ${tier}: no targets`);

  return [...empty, ...duplicates, ...missing];
};

/** Read the inventory from a repository root. */
export const deriveRoadmap = ({
  root,
}: {
  readonly root: string;
}): ReadonlyArray<RoadmapTarget> =>
  parseInventory(readFileSync(join(root, INVENTORY_FILE), "utf8"));

/**
 * A JS string literal oxfmt keeps as written: the formatter picks single quotes
 * only when the value contains double quotes and no apostrophe, and `JSON.stringify`
 * would otherwise be escaped on every regeneration.
 */
const quote = (value: string): string =>
  value.includes('"') && !value.includes("'")
    ? `'${value}'`
    : JSON.stringify(value);

/** The committed module; `roadmap.test.ts` fails while it is stale. */
export const renderGeneratedModule = (
  targets: ReadonlyArray<RoadmapTarget>,
): string => {
  const entries = targets.map((target) =>
    [
      "  {",
      `    tier: ${target.tier},`,
      `    tierTitle: ${quote(target.tierTitle)},`,
      `    name: ${quote(target.name)},`,
      `    status: ${quote(target.status)},`,
      `    support: ${quote(target.support)},`,
      `    note: ${quote(target.note)},`,
      "  },",
    ].join("\n"),
  );

  return [
    "// Generated by `nub run --filter docs roadmap` from COMPONENTS.md (plan 518).",
    "// Do not edit: `src/lib/roadmap.test.ts` fails when this file is stale.",
    'import type { RoadmapTarget } from "./roadmap.js";',
    "",
    "export const roadmapTargets: readonly RoadmapTarget[] = [",
    ...entries,
    "];",
    "",
  ].join("\n");
};

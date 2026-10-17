import { entries } from "./entries";
import type { ComponentMetaInput } from "./schema";

/**
 * Runtime access to the component registry. The browser bundle reads these
 * plain records; it never imports `effect` (the schema is validated in
 * `registry.test.ts`, not here). Native array helpers are deliberate at this
 * boundary — `effect/Array` would pull the Effect runtime into the client.
 */
export const components: readonly ComponentMetaInput[] = entries;

export const bySlug: ReadonlyMap<string, ComponentMetaInput> = new Map(
  components.map((component) => [component.slug, component]),
);

export interface ComponentGroup {
  readonly tier: string;
  readonly group: string;
  readonly items: readonly ComponentMetaInput[];
}

/**
 * The heading a tier/group section uses in the index and the sidebar. One rule
 * for both surfaces, so a new tier cannot be named differently in each.
 */
export const groupTitles: Readonly<Record<string, string>> = {
  foundational: "Foundational",
  composition: "Composition and feedback",
  "data-display": "Data presentation",
  workspace: "Desktop workspace",
  specialised: "Specialised",
};

export const tierGroupTitle = (tier: string, group: string): string =>
  `Tier ${tier} — ${groupTitles[group] ?? group}`;

/**
 * Groups consecutive entries by tier and group. `entries.ts` authors the
 * records in tier/group order; `registry.test.ts` asserts that order, so a
 * misordered entry fails the suite instead of silently splitting a group.
 */
export const groups: readonly ComponentGroup[] = components.reduce<
  ComponentGroup[]
>((grouped, component) => {
  const last = grouped.at(-1);
  if (last && last.tier === component.tier && last.group === component.group) {
    return [
      ...grouped.slice(0, -1),
      { ...last, items: [...last.items, component] },
    ];
  }
  return [
    ...grouped,
    { tier: component.tier, group: component.group, items: [component] },
  ];
}, []);

export const statusCounts = (): ReadonlyMap<string, number> =>
  components.reduce(
    (counts, component) =>
      counts.set(component.status, (counts.get(component.status) ?? 0) + 1),
    new Map<string, number>(),
  );

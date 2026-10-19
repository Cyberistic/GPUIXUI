import type { Theme } from "@gpuixui/tokens";

/**
 * The `Theme` groups the platform table compares, in the order Theming reads
 * them. `name` and `mode` are excluded: the name is compared on its own and the
 * mode can never change through a platform style.
 */
export const STYLE_GROUPS = [
  { key: "colors", label: "Palette" },
  { key: "typography", label: "Typography" },
  { key: "spacing", label: "Spacing" },
  { key: "radius", label: "Radius" },
  { key: "density", label: "Density" },
  { key: "elevation", label: "Elevation" },
  { key: "borderWidth", label: "Border widths" },
  { key: "iconSize", label: "Icon sizes" },
] as const satisfies ReadonlyArray<{
  readonly key: Exclude<keyof Theme, "name" | "mode">;
  readonly label: string;
}>;

export interface StyleDiff {
  /** The reader-facing group name, e.g. `Typography`. */
  readonly label: string;
  /** `same`, the changed keys with their shipped values, or a count. */
  readonly detail: string;
  /** The top-level keys of the group that differ. */
  readonly changed: ReadonlyArray<string>;
}

type GroupKey = (typeof STYLE_GROUPS)[number]["key"];

const entries = (value: object): ReadonlyArray<readonly [string, unknown]> =>
  Object.entries(value);

const lookup = (value: object): ReadonlyMap<string, unknown> =>
  new Map(entries(value));

/**
 * Structural equality for plain theme data. `extendTheme` copies untouched
 * groups into new objects, so reference equality would call every group changed.
 */
const same = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => same(item, right[index]))
    );
  }
  if (
    typeof left !== "object" ||
    left === null ||
    typeof right !== "object" ||
    right === null
  ) {
    return false;
  }
  const leftEntries = entries(left);
  const rightEntries = lookup(right);
  return (
    leftEntries.length === rightEntries.size &&
    leftEntries.every(
      ([key, value]) =>
        rightEntries.has(key) && same(value, rightEntries.get(key)),
    )
  );
};

const summarize = (changed: ReadonlyArray<string>, applied: object): string => {
  if (changed.length === 0) return "same";
  if (changed.length > 2) return `${changed.length} values`;
  const values = lookup(applied);
  return changed
    .map((key) => {
      const value = values.get(key);
      return typeof value === "string" || typeof value === "number"
        ? `${key} · ${value}`
        : key;
    })
    .join(" · ");
};

const groupOf = (theme: Theme, key: GroupKey): object => theme[key];

const diffGroup = (
  label: string,
  key: GroupKey,
  base: Theme,
  applied: Theme,
): StyleDiff => {
  const before = lookup(groupOf(base, key));
  const changed = entries(groupOf(applied, key))
    .filter(([name, value]) => !same(before.get(name), value))
    .map(([name]) => name);
  return { label, changed, detail: summarize(changed, groupOf(applied, key)) };
};

/**
 * Which `Theme` groups and keys a platform style changed, read from the two
 * values rather than a remembered list. The caller supplies the pair, so the
 * table survives the tokens workstream replacing `platformTheme` with a full
 * platform style.
 */
export const styleDiff = (
  base: Theme,
  applied: Theme,
): ReadonlyArray<StyleDiff> =>
  STYLE_GROUPS.map((group) => diffGroup(group.label, group.key, base, applied));

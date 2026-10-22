import { describe, expect, it } from "vitest";
import {
  collapse as componentCollapse,
  type Crumb as ComponentCrumb,
} from "../../../../../packages/components/src/breadcrumb/logic.js";
import {
  BUDGETS,
  CRUMBS,
  MIN_VISIBLE,
  collapseCrumbs,
  openLabel,
  separatorCount,
  type CrumbEntry,
} from "./breadcrumb-preview";

/**
 * A breadcrumb's collapse is the one thing a drawing cannot show: a trail with
 * an ellipsis looks the same whether the rule kept the current page or dropped
 * it, and a hidden entry that leaves its separator behind still reads as a
 * path. These cases hold the preview's copy of `collapse` to the component's
 * function over a sweep, and pin the budgets the page prints.
 */

/** The component's crumbs in the preview's shape. */
const shape = (
  entries: ReadonlyArray<ComponentCrumb<ComponentCrumbLabel>>,
): ReadonlyArray<CrumbEntry> =>
  entries.map((entry) =>
    entry.kind === "item"
      ? {
          kind: "item",
          item: { label: entry.item.label },
        }
      : { kind: "ellipsis" },
  );

interface ComponentCrumbLabel {
  readonly label: string;
}

/** The trail as a page prints it: labels, with `…` for the hidden middle. */
const trail = (entries: ReadonlyArray<CrumbEntry>): string =>
  entries
    .map((entry) => (entry.kind === "item" ? entry.item.label : "…"))
    .join(" / ");

const budgetSweep = [0, 1, 2, 3, 4, 5, 6, 8];
const lengthSweep = [0, 1, 2, 3, 4, 5, 6, 7, 9];

describe("the preview's collapse", () => {
  it("matches the component for every trail length and budget", () => {
    // The equality is the guard: every trail the preview paints is the trail
    // the component paints, including the clamped budgets below three.
    interface Drift {
      readonly input: string;
      readonly preview: string;
      readonly component: string;
    }

    const drifted = lengthSweep.flatMap((length) => {
      const items = Array.from({ length }, (_, index) => ({
        label: `level-${index}`,
      }));
      return budgetSweep.flatMap((maxItems): ReadonlyArray<Drift> => {
        const preview = collapseCrumbs(items, maxItems);
        const component = shape(componentCollapse(items, maxItems));
        return trail(preview) === trail(component)
          ? []
          : [
              {
                input: `${length} entries at maxItems ${maxItems}`,
                preview: trail(preview),
                component: trail(component),
              },
            ];
      });
    });

    expect(drifted).toEqual([]);
  });

  it("keeps both ends and the current page at every budget", () => {
    // The budgets the workflow control offers, over the six-entry trail.
    expect(BUDGETS).toEqual([3, 4, 5]);
    expect(trail(collapseCrumbs(CRUMBS, 3))).toBe(
      "Projects / … / breadcrumb.tsx",
    );
    expect(trail(collapseCrumbs(CRUMBS, 4))).toBe(
      "Projects / … / src / breadcrumb.tsx",
    );
    expect(trail(collapseCrumbs(CRUMBS, 5))).toBe(
      "Projects / … / components / src / breadcrumb.tsx",
    );
    // A trail that fits renders whole; no ellipsis to make room for.
    expect(trail(collapseCrumbs(CRUMBS, 6))).toBe(
      "Projects / GPUIXUI / packages / components / src / breadcrumb.tsx",
    );
  });

  it("clamps a budget below the three entries a trail needs", () => {
    expect(trail(collapseCrumbs(CRUMBS, 0))).toBe(
      "Projects / … / breadcrumb.tsx",
    );
    expect(trail(collapseCrumbs(CRUMBS, 1))).toBe(
      "Projects / … / breadcrumb.tsx",
    );
    expect(trail(collapseCrumbs(CRUMBS, 2))).toBe(
      "Projects / … / breadcrumb.tsx",
    );
    expect(MIN_VISIBLE).toBe(3);
  });

  it("hides an entry's separator with the entry", () => {
    // The separator count follows the rendered entries, never the authored
    // trail: a collapsed middle takes its separators with it.
    expect(separatorCount(collapseCrumbs(CRUMBS, 6))).toBe(5);
    expect(separatorCount(collapseCrumbs(CRUMBS, 3))).toBe(2);
    expect(separatorCount(collapseCrumbs(CRUMBS, 4))).toBe(3);
    expect(separatorCount([])).toBe(0);
  });

  it("reports the path a crumb opens", () => {
    expect(openLabel(CRUMBS, 2)).toBe("Open Projects / GPUIXUI / packages");
    expect(openLabel(CRUMBS, 0)).toBe("Open Projects");
    expect(openLabel(CRUMBS, 99)).toBe("Nothing to open");
  });
});

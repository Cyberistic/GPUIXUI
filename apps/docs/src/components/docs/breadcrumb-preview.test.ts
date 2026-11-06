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

const trail = (entries: ReadonlyArray<CrumbEntry>): string =>
  entries
    .map((entry) => (entry.kind === "item" ? entry.item.label : "…"))
    .join(" / ");

const budgetSweep = [0, 1, 2, 3, 4, 5, 6, 8];
const lengthSweep = [0, 1, 2, 3, 4, 5, 6, 7, 9];

describe("the preview's collapse", () => {
  it("matches the component for every trail length and budget", () => {
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

import { describe, expect, it } from "vitest";
import {
  pageWindow as componentWindow,
  type PageItem as ComponentPageItem,
} from "../../../../../packages/components/src/pagination/logic.js";
import {
  DEPLOYMENTS,
  PAGE_SIZE,
  clampPage,
  pageCountFor,
  pageWindow,
  rangeLabel,
  rowsOn,
  stepPage,
  type PageItem,
} from "./pagination-preview";

/**
 * The pagination preview's arithmetic is the component's, and a drawing cannot
 * show whether it is: a window that grows at the edges still looks like a
 * pagination control, and an ellipsis over a single hidden page still reads as
 * "more pages" until the reader counts. These cases hold the preview's copy of
 * `pageWindow` to the component's own function over a sweep, and pin the two
 * things the page prints — the crops and the row range.
 */

/** The component's entries, in the preview's shape: the ellipsis carries no page. */
const shape = (
  entries: ReadonlyArray<ComponentPageItem>,
): ReadonlyArray<PageItem> =>
  entries.map((entry) =>
    entry.kind === "page"
      ? { kind: "page", page: entry.page }
      : { kind: "ellipsis" },
  );

/** The window as a page prints it: numbers, with `…` for a gap. */
const trail = (entries: ReadonlyArray<PageItem>): string =>
  entries
    .map((entry) => (entry.kind === "page" ? String(entry.page) : "…"))
    .join(" ");

const siblings = [0, 1, 2, 3] as const;
const pagesFrom = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count + 6 }, (_, index) => index - 2);

describe("the preview's page window", () => {
  it("matches the component for every page, sibling count and edge setting", () => {
    // The equality is the guard: every crop the preview paints is the crop the
    // component would paint, including the clamped ones outside the range.
    interface Drift {
      readonly input: string;
      readonly preview: string;
      readonly component: string;
    }

    const drifted = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 20].flatMap((pageCount) =>
      pagesFrom(pageCount).flatMap((page) =>
        siblings.flatMap((siblingCount) =>
          [true, false].flatMap((showEdges): ReadonlyArray<Drift> => {
            const input = { page, pageCount, siblingCount, showEdges };
            const preview = pageWindow(input);
            const component = shape(componentWindow(input));
            return trail(preview) === trail(component)
              ? []
              : [
                  {
                    input: `page ${page} of ${pageCount}, siblings ${siblingCount}, edges ${showEdges}`,
                    preview: trail(preview),
                    component: trail(component),
                  },
                ];
          }),
        ),
      ),
    );

    expect(drifted).toEqual([]);
  });

  it("prints the crops the page teaches", () => {
    expect(trail(pageWindow({ page: 1, pageCount: 10 }))).toBe(
      "1 2 3 4 5 … 10",
    );
    expect(trail(pageWindow({ page: 5, pageCount: 10 }))).toBe(
      "1 … 4 5 6 … 10",
    );
    expect(trail(pageWindow({ page: 10, pageCount: 10 }))).toBe(
      "1 … 6 7 8 9 10",
    );
    // A gap of one renders the page itself, so the crop collapses to the trail.
    expect(trail(pageWindow({ page: 8, pageCount: 8 }))).toBe("1 … 4 5 6 7 8");
    expect(trail(pageWindow({ page: 2, pageCount: 7 }))).toBe("1 2 3 4 5 6 7");
    // The two knobs the page documents.
    expect(trail(pageWindow({ page: 3, pageCount: 20, siblingCount: 2 }))).toBe(
      "1 2 3 4 5 6 7 … 20",
    );
    expect(
      trail(pageWindow({ page: 3, pageCount: 20, showEdges: false })),
    ).toBe("2 3 4");
    expect(pageWindow({ page: 1, pageCount: 0 })).toEqual([]);
  });

  it("never puts an ellipsis over a gap of one or less", () => {
    // The defect the component's own sweep guards: `1 … 2 3 4 5 6 7 8` was wider
    // than the trail it was cropping.
    const broken = pagesFrom(12).flatMap((page) =>
      [{ page, pageCount: 12 }].flatMap((input) => {
        const entries = pageWindow(input);
        return entries.flatMap((entry, index) => {
          if (entry.kind !== "ellipsis") return [];
          const before = entries[index - 1];
          const after = entries[index + 1];
          if (before?.kind !== "page" || after?.kind !== "page") {
            return [
              `${trail(entries)}: an ellipsis without a page on each side`,
            ];
          }
          return after.page - before.page <= 2
            ? [
                `${trail(entries)}: … hides ${after.page - before.page - 1} page(s)`,
              ]
            : [];
        });
      }),
    );

    expect(broken).toEqual([]);
  });

  it("clamps a stored page into the range the control paints", () => {
    expect(clampPage(99, 10)).toBe(10);
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(-4, 10)).toBe(1);
    expect(clampPage(3, 0)).toBe(1);
    expect(stepPage(1, 10, -1)).toBe(1);
    expect(stepPage(10, 10, 1)).toBe(10);
    expect(stepPage(4, 10, 1)).toBe(5);
  });
});

describe("the preview's rows", () => {
  it("shows five rows a page and a short last page", () => {
    expect(DEPLOYMENTS.length).toBe(23);
    expect(PAGE_SIZE).toBe(5);
    expect(pageCountFor(DEPLOYMENTS)).toBe(5);
    expect(rowsOn(DEPLOYMENTS, 1).map((row) => row.id)).toEqual([
      "deploy-1",
      "deploy-2",
      "deploy-3",
      "deploy-4",
      "deploy-5",
    ]);
    expect(rowsOn(DEPLOYMENTS, 5).map((row) => row.id)).toEqual([
      "deploy-21",
      "deploy-22",
      "deploy-23",
    ]);
    expect(rowsOn(DEPLOYMENTS, 99).map((row) => row.id)).toHaveLength(3);
  });

  it("prints the range the page shows, and never past the rows that exist", () => {
    expect(rangeLabel(DEPLOYMENTS, 1)).toBe("Rows 1–5 of 23");
    expect(rangeLabel(DEPLOYMENTS, 3)).toBe("Rows 11–15 of 23");
    expect(rangeLabel(DEPLOYMENTS, 5)).toBe("Rows 21–23 of 23");
    expect(rangeLabel(DEPLOYMENTS, 99)).toBe("Rows 21–23 of 23");
    expect(rangeLabel([], 1)).toBe("No rows");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  describeIssues,
  dismissTop,
  filterIssues,
  initialFilter,
  isVertical,
  matchesFilter,
  type DismissLayer,
  type Issue,
} from "./drawer-preview";

/**
 * The drawer preview's model has to say two things the component does: an edge
 * either lays the surface across the window or down it, and one Escape/outside
 * gesture is offered to the topmost layer only.
 *
 * Both are easy to get subtly wrong in a browser drawing and impossible to
 * notice by looking at it: a non-dismissible drawer that lets the gesture
 * through closes the dialog the reader was told to answer. These cases fail when
 * the preview's arithmetic drifts from `drawer.tsx`.
 */

const source = readFileSync(
  new URL("../../../../../packages/components/src/drawer.tsx", import.meta.url),
  "utf8",
);

const issues: ReadonlyArray<Issue> = [
  {
    id: "1",
    title: "Export fails",
    status: "open",
    assigned: true,
    attachment: false,
  },
  {
    id: "2",
    title: "Keyboard trap",
    status: "open",
    assigned: false,
    attachment: true,
  },
  {
    id: "3",
    title: "Colour pass",
    status: "closed",
    assigned: true,
    attachment: true,
  },
  {
    id: "4",
    title: "Slow paint",
    status: "open",
    assigned: false,
    attachment: false,
  },
];

const layers: ReadonlyArray<DismissLayer> = [
  { name: "dialog", dismissible: true },
  { name: "drawer", dismissible: true },
];

describe("a drawer's edge", () => {
  it("lays a top or bottom sheet across the window, and a column down it", () => {
    // The component's `isVertical` is the one rule the box, the layout and the
    // travel read; a drawing that treated `top` as a column painted a panel on
    // the wrong axis.
    expect(isVertical("top")).toBe(true);
    expect(isVertical("bottom")).toBe(true);
    expect(isVertical("left")).toBe(false);
    expect(isVertical("right")).toBe(false);
    expect(source.replace(/\s+/g, " ")).toContain(
      'side === "bottom" || side === "top"',
    );
  });
});

describe("the dismiss stack", () => {
  it("closes the topmost layer and leaves the one beneath it open", () => {
    const result = dismissTop(layers);

    expect(result.closed).toBe("drawer");
    expect(result.consumedBy).toBe("drawer");
    expect(result.layers.map((layer) => layer.name)).toEqual(["dialog"]);
  });

  it("consumes the gesture without closing a layer that is not dismissible", () => {
    // The dialog must not close either: the drawer is the surface the reader is
    // being asked to answer, and one gesture closes at most one overlay.
    const result = dismissTop([
      { name: "dialog", dismissible: true },
      { name: "drawer", dismissible: false },
    ]);

    expect(result.consumedBy).toBe("drawer");
    expect(result.closed).toBeUndefined();
    expect(result.layers.map((layer) => layer.name)).toEqual([
      "dialog",
      "drawer",
    ]);
  });

  it("consumes nothing when no surface is open", () => {
    expect(dismissTop([])).toEqual({ layers: [] });
  });
});

describe("the filter drawer", () => {
  it("starts from every issue, so an untouched drawer changes nothing", () => {
    expect(filterIssues(issues, initialFilter)).toEqual(issues);
    expect(activeFilterCount(initialFilter)).toBe(0);
  });

  it("keeps open issues, assigned issues and attachments as separate rules", () => {
    const open = filterIssues(issues, { ...initialFilter, status: "open" });
    expect(open.map((issue) => issue.id)).toEqual(["1", "2", "4"]);

    const assigned = filterIssues(issues, {
      ...initialFilter,
      assignedOnly: true,
    });
    expect(assigned.map((issue) => issue.id)).toEqual(["1", "3"]);

    const attachments = filterIssues(issues, {
      ...initialFilter,
      attachmentsOnly: true,
    });
    expect(attachments.map((issue) => issue.id)).toEqual(["2", "3"]);
  });

  it("composes the rules, so two narrowings intersect", () => {
    const both = filterIssues(issues, {
      status: "open",
      assignedOnly: true,
      attachmentsOnly: false,
    });

    expect(both.map((issue) => issue.id)).toEqual(["1"]);
    expect(
      activeFilterCount({
        status: "open",
        assignedOnly: true,
        attachmentsOnly: false,
      }),
    ).toBe(2);
  });

  it("applies the three rules to one row without dropping a false one", () => {
    const closedAssigned = issues[2];
    expect(closedAssigned).toBeDefined();
    if (closedAssigned === undefined) return;

    expect(matchesFilter(closedAssigned, initialFilter)).toBe(true);
    expect(
      matchesFilter(closedAssigned, { ...initialFilter, status: "open" }),
    ).toBe(false);
  });

  it("words the count from the rows the filter kept", () => {
    expect(describeIssues(3, 4)).toBe("Showing 3 of 4 issues");
  });
});

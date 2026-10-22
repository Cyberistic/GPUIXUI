import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DRAWER_HEIGHT,
  DRAWER_WIDTH,
  activeFilterCount,
  describeIssues,
  dismissTop,
  drawerBox,
  filterIssues,
  initialFilter,
  matchesFilter,
  type DismissLayer,
  type Issue,
} from "./drawer-preview";

/**
 * The drawer preview's model has to say two things the component does: a
 * surface is clamped to the window it opens in, and one Escape/outside gesture
 * is offered to the topmost layer only.
 *
 * Both are easy to get subtly wrong in a browser drawing and impossible to
 * notice by looking at it: a clamped drawer stops short of the edge, and a
 * non-dismissible drawer that lets the gesture through closes the dialog the
 * reader was told to answer. These cases fail when the preview's arithmetic
 * drifts from `drawer.tsx`.
 */

const source = readFileSync(
  new URL("../../../../../packages/components/src/drawer.tsx", import.meta.url),
  "utf8",
);

/** The `name: number` pairs of one exported size table in the component. */
const sizeTable = (
  name: "WIDTH" | "HEIGHT",
): Readonly<Record<string, number>> => {
  const block =
    new RegExp(
      `const ${name}: Readonly<Record<DrawerSize, number>> = \\{([\\s\\S]*?)\\};`,
    ).exec(source)?.[1] ?? "";
  return Object.fromEntries(
    [...block.matchAll(/(\w+): (\d+)/g)].flatMap((match) => {
      const [, key, value] = match;
      return key === undefined || value === undefined
        ? []
        : [[key, Number(value)]];
    }),
  );
};

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

describe("a drawer's box", () => {
  it("takes the requested column width and the window's height", () => {
    expect(drawerBox("right", "md", { width: 1280, height: 800 })).toEqual({
      width: 400,
      height: 800,
    });
    expect(drawerBox("left", "sm", { width: 1280, height: 800 })).toEqual({
      width: 320,
      height: 800,
    });
  });

  it("clamps a column to a window narrower than the request", () => {
    // A `lg` drawer asks for 560; a 300px window is the whole surface it gets.
    expect(drawerBox("right", "lg", { width: 300, height: 800 })).toEqual({
      width: 300,
      height: 800,
    });
  });

  it("makes a bottom sheet the window's width and caps its height", () => {
    expect(drawerBox("bottom", "md", { width: 1280, height: 800 })).toEqual({
      width: 1280,
      height: 320,
    });
    expect(drawerBox("bottom", "lg", { width: 180, height: 300 })).toEqual({
      width: 180,
      height: 300,
    });
  });

  it("mirrors the size tables the component ships", () => {
    // The preview cannot become a second source of truth for a size. If the
    // component moves a step, this fails before the page prints the old number.
    expect(sizeTable("WIDTH")).toEqual(DRAWER_WIDTH);
    expect(sizeTable("HEIGHT")).toEqual(DRAWER_HEIGHT);
    const flat = source.replace(/\s+/g, " ");
    expect(flat).toContain("Math.min(HEIGHT[size], window.height)");
    expect(flat).toContain("Math.min(WIDTH[size], window.width)");
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

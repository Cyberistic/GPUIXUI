/**
 * PinnedList in the real GPUix renderer.
 *
 * The bugs these guard: a header that jumps to the top before its section
 * arrives; one that scrolls away instead of holding; one that outlives its
 * section and paints over the next; a header painted twice (the bug the spacer
 * exists to prevent); a layer that swallows the press on the row under a held
 * header; a header that paints the page role on a list sitting on a card; and a
 * list whose measurements never reach the overlay, so no header paints at all;
 * and a section list a store handed back as `null` or with a hole in it, which
 * threw before the first header painted.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { nodesWithRole } from "../internal/a11y.js";
import { pressKey, requireBounds, settle } from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { PinnedList } from "../pinned-list.js";

/** Two 200px sections under a 32px header each, in a 160px reader. */
const Reader = ({ surfaceColor }: { readonly surfaceColor?: string }) => (
  <PinnedList
    testId="list"
    surfaceColor={surfaceColor}
    style={{ height: 160, width: 300 }}
    sections={[
      {
        title: "Today",
        children: <div testId="row-today" style={{ height: 200 }} />,
      },
      {
        title: "Yesterday",
        children: <div testId="row-yesterday" style={{ height: 200 }} />,
      },
    ]}
  />
);

const elementId = (page: ReturnType<typeof renderComponent>, testId: string) =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(page.renderer.findByTestId(testId)),
      (element) => element.id,
    ),
    () => {
      throw new Error(`behaviour: no element with testId "${testId}"`);
    },
  );

const scrollTo = (
  page: ReturnType<typeof renderComponent>,
  offsetY: number,
): void => {
  page.renderer.scrollTo(elementId(page, "list"), 0, offsetY);
  settle(page);
};

/** How far a header's top sits from the list's own top. */
const headerTop = (
  page: ReturnType<typeof renderComponent>,
  index: number,
): number =>
  requireBounds(page, `pinned-header-${index}`).y -
  requireBounds(page, "list").y;

const has = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): boolean => page.renderer.findByTestId(testId) !== undefined;

/** Mount and let the section measurements arrive. */
const mount = (surfaceColor?: string) => {
  const page = renderComponent(<Reader surfaceColor={surfaceColor} />);
  settle(page);
  settle(page);
  return page;
};

/** Two sections of different heights, in a caller-chosen order. */
const Ordered = ({ reversed }: { readonly reversed: boolean }) => {
  const today = {
    title: "Today",
    children: <div testId="row-today" style={{ height: 200 }} />,
  };
  const yesterday = {
    title: "Yesterday",
    children: <div testId="row-yesterday" style={{ height: 400 }} />,
  };
  return (
    <PinnedList
      testId="list"
      style={{ height: 160, width: 300 }}
      sections={reversed ? [yesterday, today] : [today, yesterday]}
    />
  );
};

describe("PinnedList", () => {
  it("keeps each section's measured height when the caller reorders them", () => {
    // A section reports its height once, and a keyed element that moves keeps
    // the measurement it gave. Held by slot instead, the height stayed behind:
    // the section that took the slot was placed with its neighbour's height, so
    // the first header was buried and the second pinned where no row began.
    const page = renderComponent(<Ordered reversed={false} />);
    try {
      settle(page);
      settle(page);

      page.rerender(<Ordered reversed />);
      settle(page);
      scrollTo(page, -300);

      // Yesterday (432 with its header row) now leads: its own header holds at
      // the top, and Today's travels at 132 — its section starts at 432 and the
      // list is scrolled 300 past it.
      expect(has(page, "pinned-header-0")).toBe(true);
      expect(headerTop(page, 0)).toBe(0);
      expect(headerTop(page, 1)).toBe(132);
    } finally {
      page.unmount();
    }
  });

  it("reserves the header's row above the section's own content", () => {
    const page = mount();
    try {
      const section = requireBounds(page, "pinned-section-0");
      const row = requireBounds(page, "row-today");
      const header = requireBounds(page, "pinned-header-0");

      // The spacer is the header's row, so the title and the content agree.
      expect(row.y - section.y).toBe(32);
      expect(header.y - section.y).toBe(0);
      expect(header.height).toBe(32);
    } finally {
      page.unmount();
    }
  });

  it("holds a header at the top once its section reaches it", () => {
    const page = mount();
    try {
      expect(headerTop(page, 0)).toBe(0);

      scrollTo(page, -100);

      // The title moved 100px with its content but is held at the viewport top.
      expect(headerTop(page, 0)).toBe(0);
    } finally {
      page.unmount();
    }
  });

  it("paints the held header opaquely and gives it a bottom edge", () => {
    const page = mount();
    try {
      const travelling = page.renderer.findByTestId("pinned-header-0");
      expect(travelling?.style.backgroundColor).toBe(
        darkTheme.colors.background,
      );
      expect(travelling?.style.borderBottomWidth).toBeUndefined();

      scrollTo(page, -100);
      const held = page.renderer.findByTestId("pinned-header-0");
      expect(held?.style.backgroundColor).toBe(darkTheme.colors.background);
      expect(held?.style.borderBottomWidth).toBe(darkTheme.borderWidth.thin);
      // The rows below it are still reachable: the layer is not a hit target.
      expect(
        page.renderer.findByTestId("pinned-layer")?.style.pointerEvents,
      ).toBe("none");
    } finally {
      page.unmount();
    }
  });

  it("lets a press through the held header reach the row under it", () => {
    // The bug guarded: the header layer declares `pointerEvents: "none"` and
    // the comment beside it promised a press on the row under a held header
    // still reaches the row — but the layer is not the element that paints.
    // Each header paints its own surface and its own `<text>`, so the runtime's
    // hit test stopped there and the row under the held title lost the press.
    // The window read the defect as `presses` staying at 1 and now reads
    // `presses=2,0` on the same probe (`pinned-list-lifecycle`); this case reads
    // the same hit test off the renderer.
    let presses = 0;
    const page = renderComponent(
      <PinnedList
        testId="list"
        style={{ height: 160, width: 300 }}
        sections={[
          {
            title: "Today",
            children: (
              <div
                testId="row-today"
                onClick={() => {
                  presses += 1;
                }}
                style={{ height: 200 }}
              />
            ),
          },
          {
            title: "Yesterday",
            children: <div style={{ height: 200 }} />,
          },
        ]}
      />,
    );
    try {
      settle(page);
      settle(page);
      scrollTo(page, -100);

      const list = requireBounds(page, "list");
      // The row's visible band starts above the viewport, so 16 points below
      // the list's top is inside the row and inside the held header.
      page.renderer.nativeSimulateClick(list.x + 10, list.y + 16);
      expect(presses).toBe(1);

      // The negative control: the same row below the header still takes a press.
      page.renderer.nativeSimulateClick(list.x + 10, list.y + 100);
      expect(presses).toBe(2);
    } finally {
      page.unmount();
    }
  });

  it("passes the surface the caller names to the held header", () => {
    const page = mount("#101010");
    try {
      scrollTo(page, -100);
      expect(
        page.renderer.findByTestId("pinned-header-0")?.style.backgroundColor,
      ).toBe("#101010");
    } finally {
      page.unmount();
    }
  });

  it("pushes a header out as its section ends", () => {
    const page = mount();
    try {
      // 220px into a 232px section, the header has 20px above the viewport.
      scrollTo(page, -220);
      expect(headerTop(page, 0)).toBe(-20);

      // At the section's end there is nothing left for it to cover.
      scrollTo(page, -232);
      expect(has(page, "pinned-header-0")).toBe(false);
      expect(headerTop(page, 1)).toBe(0);
    } finally {
      page.unmount();
    }
  });

  it("paints each title once while it is held", () => {
    const page = mount();
    try {
      scrollTo(page, -100);

      expect(
        page.renderer.getAllText().filter((text) => text === "Today"),
      ).toEqual(["Today"]);
    } finally {
      page.unmount();
    }
  });

  it("scrolls from the keyboard and keeps a header pinned", () => {
    const page = mount();
    try {
      page.renderer.focusElement(elementId(page, "list"));
      pressKey(page, "End");
      settle(page);

      // The last section's header is the one holding at the end of the travel.
      expect(has(page, "pinned-header-1")).toBe(true);
      expect(has(page, "pinned-header-0")).toBe(false);
    } finally {
      page.unmount();
    }
  });

  it("names every section and publishes no second title", () => {
    const page = mount();
    try {
      const groups = nodesWithRole(page.renderer, "group").map(
        (node) => node.name,
      );

      // The scroller is a named group of its own now: it is the keyboard
      // region the reading measures. Each section is still named once.
      expect(groups.filter((name) => name !== "Scroll region")).toEqual([
        "Today",
        "Yesterday",
      ]);
      expect(groups.filter((name) => name === "Scroll region")).toHaveLength(1);
      expect(nodesWithRole(page.renderer, "heading")).toEqual([]);
    } finally {
      page.unmount();
    }
  });

  it("paints nothing for a stored section list that is not a list", () => {
    // The bug guarded: a sectioned list restored with a saved layout carries
    // JSON's `null` for the list its record never held, and `Arr.map` over it
    // threw `self is not iterable` from the render, taking the screen with it
    // where the empty list paints nothing.
    const page = renderComponent(
      <div>
        <text testId="before">Before</text>
        <PinnedList
          testId="list"
          style={{ height: 160, width: 300 }}
          // @ts-expect-error — the list a store wrote where it carried none.
          sections={null}
        />
      </div>,
    );
    try {
      settle(page);
      settle(page);
      // The sibling is the counter: a render that threw takes the tree with it.
      expect(page.renderer.getAllText()).toContain("Before");
      expect(has(page, "pinned-section-0")).toBe(false);
      expect(has(page, "pinned-header-0")).toBe(false);
    } finally {
      page.unmount();
    }
  });

  it("keeps the sections beside a stored entry that names none", () => {
    // A deleted record leaves `null` inside the list, and a title that is not
    // text has no key for the section's measured height and no words for its
    // header: the row threw on that title while its neighbours painted.
    const page = renderComponent(
      <PinnedList
        testId="list"
        style={{ height: 160, width: 300 }}
        sections={[
          // @ts-expect-error — a deleted record a store left in the list.
          null,
          // @ts-expect-error — a title a store wrote as something else.
          { title: 42 },
          { title: "Today", children: <div style={{ height: 200 }} /> },
        ]}
      />,
    );
    try {
      settle(page);
      settle(page);
      const groups = nodesWithRole(page.renderer, "group").map(
        (node) => node.name,
      );
      expect(groups.filter((name) => name !== "Scroll region")).toEqual([
        "Today",
      ]);
      expect(has(page, "pinned-section-0")).toBe(true);
      expect(has(page, "pinned-section-1")).toBe(false);
    } finally {
      page.unmount();
    }
  });
});

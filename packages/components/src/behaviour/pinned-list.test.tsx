/**
 * PinnedList in the real GPUix renderer.
 *
 * The bugs these guard: a header that jumps to the top before its section
 * arrives; one that scrolls away instead of holding; one that outlives its
 * section and paints over the next; a header painted twice (the bug the spacer
 * exists to prevent); a layer that swallows the press on the row under a held
 * header; a header that paints the page role on a list sitting on a card; and a
 * list whose measurements never reach the overlay, so no header paints at all.
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

describe("PinnedList", () => {
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
});

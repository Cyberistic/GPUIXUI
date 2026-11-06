import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { nodesWithRole } from "../internal/a11y.js";
import { pressKey, requireBounds, settle } from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { PinnedList } from "../pinned-list.js";

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

const mount = (surfaceColor?: string) => {
  const page = renderComponent(<Reader surfaceColor={surfaceColor} />);
  settle(page);
  settle(page);
  return page;
};

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
    const page = renderComponent(<Ordered reversed={false} />);
    try {
      settle(page);
      settle(page);

      page.rerender(<Ordered reversed />);
      settle(page);
      scrollTo(page, -300);

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

      expect(
        page.renderer.findByTestId("pinned-layer")?.style.pointerEvents,
      ).toBe("none");
    } finally {
      page.unmount();
    }
  });

  it("lets a press through the held header reach the row under it", () => {
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

      page.renderer.nativeSimulateClick(list.x + 10, list.y + 16);
      expect(presses).toBe(1);

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
      scrollTo(page, -220);
      expect(headerTop(page, 0)).toBe(-20);

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

      expect(page.renderer.getAllText()).toContain("Before");
      expect(has(page, "pinned-section-0")).toBe(false);
      expect(has(page, "pinned-header-0")).toBe(false);
    } finally {
      page.unmount();
    }
  });

  it("keeps the sections beside a stored entry that names none", () => {
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

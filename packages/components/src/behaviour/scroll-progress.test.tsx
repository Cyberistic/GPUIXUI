import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { ScrollProgress } from "../scroll-progress.js";
import { pressKey, settle } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

const Reader = ({
  rows = 30,
  side,
}: {
  readonly rows?: number;
  readonly side?: "top" | "bottom";
}) => (
  <ScrollProgress
    testId="progress"
    label="Reading progress"
    side={side}
    style={{ height: 160, width: 300 }}
  >
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} testId={`row-${index}`} style={{ height: 24 }} />
    ))}
  </ScrollProgress>
);

const elementId = (page: ComponentTestRoot, testId: string): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(page.renderer.findByTestId(testId)),
      (element) => element.id,
    ),
    () => {
      throw new Error(`behaviour: no element with testId "${testId}"`);
    },
  );

const widthOf = (page: ComponentTestRoot) =>
  page.renderer.findByTestId("progress-bar")?.style.width;

const scrollTo = (page: ComponentTestRoot, offsetY: number): void => {
  page.renderer.scrollTo(elementId(page, "progress"), 0, offsetY);
  settle(page);
};

describe("ScrollProgress", () => {
  it("reads the start, half way and the end of the travel", () => {
    const page = renderComponent(<Reader />);
    try {
      settle(page);
      settle(page);
      expect(widthOf(page)).toBe(0);

      scrollTo(page, -280);
      expect(widthOf(page)).toBe(0.5);

      scrollTo(page, -100_000);
      expect(widthOf(page)).toBe(1);

      scrollTo(page, 0);
      expect(widthOf(page)).toBe(0);
    } finally {
      page.unmount();
    }
  });

  it("reads zero when the content fits its box", () => {
    const page = renderComponent(<Reader rows={4} />);
    try {
      settle(page);
      settle(page);
      expect(widthOf(page)).toBe(0);
      scrollTo(page, -100);
      expect(widthOf(page)).toBe(0);
    } finally {
      page.unmount();
    }
  });

  it("sits on the edge the caller names", () => {
    const bottom = renderComponent(<Reader />);
    try {
      settle(bottom);
      const track = bottom.renderer.findByTestId("progress-track");
      expect(track?.style.bottom).toBe(0);
      expect(track?.style.top).toBeUndefined();
      expect(track?.style.pointerEvents).toBe("none");
    } finally {
      bottom.unmount();
    }

    const top = renderComponent(<Reader side="top" />);
    try {
      settle(top);
      const track = top.renderer.findByTestId("progress-track");
      expect(track?.style.top).toBe(0);
      expect(track?.style.bottom).toBeUndefined();
    } finally {
      top.unmount();
    }
  });

  it("announces the percentage as a progressbar", () => {
    const page = renderComponent(<Reader />);
    try {
      settle(page);
      settle(page);
      scrollTo(page, -280);
      const track = page.renderer.findByTestId("progress-track");
      expect(track?.customProps?.role).toBe("progressbar");
      expect(track?.customProps?.["aria-valuetext"]).toBe("50%");
      expect(track?.customProps?.["aria-label"]).toBe("Reading progress");
    } finally {
      page.unmount();
    }
  });

  it("re-reads the content when the list grows under the reader", () => {
    const page = renderComponent(<Reader />);
    try {
      settle(page);
      settle(page);
      scrollTo(page, -100_000);
      expect(widthOf(page)).toBe(1);

      page.rerender(<Reader rows={40} />);
      settle(page);
      settle(page);
      expect(widthOf(page)).toBe(0.7);
    } finally {
      page.unmount();
    }
  });

  it("reads the same box the keyboard scrolls", () => {
    const page = renderComponent(<Reader />);
    try {
      settle(page);
      settle(page);
      const id = elementId(page, "progress");
      page.renderer.focusElement(id);

      pressKey(page, "Down");
      settle(page);
      expect(widthOf(page)).toBeGreaterThan(0);

      pressKey(page, "End");
      settle(page);
      expect(widthOf(page)).toBe(1);

      pressKey(page, "Home");
      settle(page);
      expect(widthOf(page)).toBe(0);
    } finally {
      page.unmount();
    }
  });

  it("keeps a non-finite thickness from reaching the runtime", () => {
    const page = renderComponent(
      <ScrollProgress testId="progress" thickness={Number.NaN} />,
    );
    try {
      settle(page);
      expect(page.renderer.findByTestId("progress-track")?.style.height).toBe(
        3,
      );
    } finally {
      page.unmount();
    }
  });
});

/**
 * ScrollFade in the real GPUix renderer.
 *
 * The bugs these guard: a fade over content that fits (a lie about more to
 * read); both edges painted at the start, or neither at the middle; a top edge
 * that stays painted at the start or a bottom edge at the end; a gradient that
 * fades the wrong way at the bottom; a strip that swallows a press on the row
 * under it; a caller's surface colour ignored; and a measured content height that
 * stops tracking a list that grows.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { ScrollFade } from "../scroll-fade.js";
import { pressKey, settle } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** A bounded reader of `rows` 24px rows. */
const Reader = ({ rows = 30 }: { readonly rows?: number }) => (
  <ScrollFade
    testId="fade"
    color="#101010"
    edgeSize={24}
    style={{ height: 160, width: 300 }}
  >
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} testId={`row-${index}`} style={{ height: 24 }} />
    ))}
  </ScrollFade>
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

const scrollTo = (page: ComponentTestRoot, offsetY: number): void => {
  page.renderer.scrollTo(elementId(page, "fade"), 0, offsetY);
  settle(page);
};

const has = (page: ComponentTestRoot, testId: string): boolean =>
  page.renderer.findByTestId(testId) !== undefined;

describe("ScrollFade", () => {
  it("offers the bottom edge at the start and hides it at the end", () => {
    const page = renderComponent(<Reader />);
    try {
      settle(page);
      settle(page);
      expect(has(page, "fade-top")).toBe(false);
      expect(has(page, "fade-bottom")).toBe(true);

      scrollTo(page, -280);
      expect(has(page, "fade-top")).toBe(true);
      expect(has(page, "fade-bottom")).toBe(true);

      scrollTo(page, -100_000);
      expect(has(page, "fade-top")).toBe(true);
      expect(has(page, "fade-bottom")).toBe(false);

      scrollTo(page, 0);
      expect(has(page, "fade-top")).toBe(false);
      expect(has(page, "fade-bottom")).toBe(true);
    } finally {
      page.unmount();
    }
  });

  it("paints no edge over content that fits", () => {
    const page = renderComponent(<Reader rows={4} />);
    try {
      settle(page);
      settle(page);
      expect(has(page, "fade-top")).toBe(false);
      expect(has(page, "fade-bottom")).toBe(false);
    } finally {
      page.unmount();
    }
  });

  it("fades each edge into the surface the caller names", () => {
    const page = renderComponent(<Reader />);
    try {
      settle(page);
      settle(page);
      const bottom = page.renderer.findByTestId("fade-bottom");
      expect(bottom?.style.background).toMatchObject({
        type: "linear-gradient",
        angle: 0,
        stops: [
          { color: "#101010", position: 0 },
          { color: "#10101000", position: 1 },
        ],
      });
      expect(bottom?.style.height).toBe(24);
      expect(bottom?.style.pointerEvents).toBe("none");
      expect(bottom?.style.bottom).toBe(0);

      scrollTo(page, -280);
      expect(
        page.renderer.findByTestId("fade-top")?.style.background,
      ).toMatchObject({
        type: "linear-gradient",
        angle: 180,
        stops: [
          { color: "#101010", position: 0 },
          { color: "#10101000", position: 1 },
        ],
      });
    } finally {
      page.unmount();
    }
  });

  it("follows the keyboard scroll the same box answers", () => {
    const page = renderComponent(<Reader />);
    try {
      settle(page);
      settle(page);
      page.renderer.focusElement(elementId(page, "fade"));

      pressKey(page, "Down");
      settle(page);
      expect(has(page, "fade-top")).toBe(true);

      pressKey(page, "End");
      settle(page);
      expect(has(page, "fade-bottom")).toBe(false);

      pressKey(page, "Home");
      settle(page);
      expect(has(page, "fade-top")).toBe(false);
      expect(has(page, "fade-bottom")).toBe(true);
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
      expect(has(page, "fade-bottom")).toBe(false);

      // 40 rows no longer fit in the same box, so the bottom owes a hint again.
      page.rerender(<Reader rows={40} />);
      settle(page);
      settle(page);
      expect(has(page, "fade-top")).toBe(true);
      expect(has(page, "fade-bottom")).toBe(true);
    } finally {
      page.unmount();
    }
  });

  it("falls back to the house edge for a size that cannot paint", () => {
    const page = renderComponent(
      <ScrollFade testId="fade" edgeSize={Number.NaN} style={{ height: 160 }}>
        <div style={{ height: 900 }} />
      </ScrollFade>,
    );
    try {
      settle(page);
      settle(page);
      expect(page.renderer.findByTestId("fade-bottom")?.style.height).toBe(32);
    } finally {
      page.unmount();
    }
  });
});

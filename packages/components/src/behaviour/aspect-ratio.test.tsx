/**
 * AspectRatio in the real GPUix renderer.
 *
 * The bugs these guard: a box that ignores the width its parent gives it; a
 * ratio painted as the reciprocal (a 2:1 box that is twice as tall as it is
 * wide); and a shape that keeps the height it was first laid out with when the
 * parent's width changes, so a resized pane shows a letterboxed child for a
 * frame. The height is the renderer's arithmetic, so every claim is read from
 * painted bounds rather than from the style the component asked for.
 */

import { describe, expect, it } from "vitest";
import { AspectRatio } from "../aspect-ratio.js";
import { requireBounds, settle } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** A parent of a known width, holding a ratio box and a filling child. */
const Frame = ({
  width,
  ratio,
}: {
  readonly width: number;
  readonly ratio: number;
}) => (
  <div style={{ padding: 20 }}>
    <div style={{ width }}>
      <AspectRatio ratio={ratio} testId="box">
        <div testId="child" style={{ width: "100%", height: "100%" }} />
      </AspectRatio>
    </div>
  </div>
);

/** The painted width and height of `testId`. */
const size = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): { readonly width: number; readonly height: number } => {
  const { width, height } = requireBounds(page, testId);
  return { width, height };
};

describe("AspectRatio", () => {
  it("paints the height its width and ratio ask for", () => {
    const page = renderComponent(<Frame width={200} ratio={2} />);
    try {
      settle(page);
      expect(size(page, "box")).toMatchObject({ width: 200, height: 100 });
      // The child fills the box it was given, not a box of its own.
      expect(size(page, "child")).toMatchObject({ width: 200, height: 100 });
    } finally {
      page.unmount();
    }
  });

  it("keeps a portrait ratio below one taller than it is wide", () => {
    const page = renderComponent(<Frame width={100} ratio={0.5} />);
    try {
      settle(page);
      expect(size(page, "box")).toMatchObject({ width: 100, height: 200 });
    } finally {
      page.unmount();
    }
  });

  it("re-measures when the parent's width changes", () => {
    // The bug this guards: a height captured from the first layout, so the
    // resized box kept the old shape until something forced a second pass.
    const page = renderComponent(<Frame width={200} ratio={2} />);
    try {
      settle(page);
      expect(size(page, "box").height).toBe(100);

      page.rerender(<Frame width={300} ratio={2} />);
      settle(page);

      expect(size(page, "box")).toMatchObject({ width: 300, height: 150 });
      expect(size(page, "child")).toMatchObject({ width: 300, height: 150 });
    } finally {
      page.unmount();
    }
  });

  it("paints no ratio it cannot divide by", () => {
    const page = renderComponent(<Frame width={200} ratio={0} />);
    try {
      settle(page);
      expect(
        page.renderer.findByTestId("box")?.style.aspectRatio,
      ).toBeUndefined();
    } finally {
      page.unmount();
    }
  });
});

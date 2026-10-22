/**
 * ThemeToggler in the real GPUix renderer.
 *
 * The bugs these guard: a control whose accessible name describes the current
 * theme instead of the press (so a reader cannot tell what pressing it does); a
 * press that reports the mode it is already in, or one that reports nothing at
 * all; a glyph that swaps without the house entrance, or an entrance that
 * ignores `level="none"` and the reduced preference; and a caller's own copy
 * being ignored.
 *
 * The entrance is measured on the runtime's motion clock as geometry: the glyph
 * arrives 3 px low and settles. The fade itself is a paint value the tree does
 * not expose — the `surface-fade` live probe proves it for the seam this control
 * shares with every overlay.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import type { TestRenderer } from "@gpuix/react/testing";
import { nodesWithRole } from "../internal/a11y.js";
import {
  clickCentreOf,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { ThemeToggler } from "../theme-toggler.js";

/** The one `button` node's accessible name, `""` when there is none. */
const buttonName = (renderer: TestRenderer): string =>
  nodesWithRole(renderer, "button")[0]?.name ?? "";

/** The glyph's offset from its centred place inside the control, in pixels. */
const glyphOffset = (page: ReturnType<typeof renderComponent>): number => {
  const button = requireBounds(page, "theme-toggler");
  const glyph = requireBounds(page, "theme-toggler-glyph");
  const centred = button.y + (button.height - glyph.height) / 2;
  return glyph.y - centred;
};

describe("ThemeToggler", () => {
  it("names the press and paints one decorative glyph", () => {
    const page = renderComponent(
      <ThemeToggler mode="dark" onChange={() => undefined} />,
    );
    try {
      expect(buttonName(page.renderer)).toBe("Switch to light theme");
      expect(page.renderer.getAllText()).toEqual([]);
      const glyph = page.renderer.findByTestId("theme-toggler-glyph");
      const child = Option.getOrUndefined(
        Option.fromNullishOr(glyph?.children[0]),
      );
      expect(
        child === undefined ? undefined : page.renderer.getElement(child)?.type,
      ).toBe("svg");
    } finally {
      page.unmount();
    }
  });

  it("reports the other mode on a press, both ways", () => {
    const requested: Array<string> = [];
    const page = renderComponent(
      <ThemeToggler mode="dark" onChange={(mode) => requested.push(mode)} />,
    );
    try {
      clickCentreOf(page, "theme-toggler");
      settle(page);
      page.rerender(
        <ThemeToggler mode="light" onChange={(mode) => requested.push(mode)} />,
      );
      settle(page);
      clickCentreOf(page, "theme-toggler");
      settle(page);

      expect(requested).toEqual(["light", "dark"]);
      expect(buttonName(page.renderer)).toBe("Switch to dark theme");
    } finally {
      page.unmount();
    }
  });

  it("takes the caller's names per direction", () => {
    const page = renderComponent(
      <ThemeToggler
        mode="light"
        lightLabel="Go light"
        darkLabel="Go dark"
        onChange={() => undefined}
      />,
    );
    try {
      expect(buttonName(page.renderer)).toBe("Go dark");
      page.rerender(
        <ThemeToggler
          mode="dark"
          lightLabel="Go light"
          darkLabel="Go dark"
          onChange={() => undefined}
        />,
      );
      settle(page);
      expect(buttonName(page.renderer)).toBe("Go light");
    } finally {
      page.unmount();
    }
  });

  it("rises the glyph 3px into place on the fast level", () => {
    const page = renderComponent(
      <ThemeToggler mode="dark" onChange={() => undefined} />,
    );
    try {
      page.renderer.clockPause();
      page.rerender(<ThemeToggler mode="light" onChange={() => undefined} />);
      settle(page);
      expect(glyphOffset(page)).toBeCloseTo(3, 1);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(glyphOffset(page)).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("paints the glyph at rest for level none", () => {
    const page = renderComponent(
      <ThemeToggler mode="dark" level="none" onChange={() => undefined} />,
    );
    try {
      page.renderer.clockPause();
      page.rerender(
        <ThemeToggler mode="light" level="none" onChange={() => undefined} />,
      );
      settle(page);
      expect(glyphOffset(page)).toBeCloseTo(0, 1);
      expect(
        page.renderer.findByTestId("theme-toggler-glyph")?.customProps?.motion,
      ).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("paints the glyph at rest under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <ThemeToggler mode="dark" onChange={() => undefined} />
      </MotionProvider>,
    );
    try {
      page.renderer.clockPause();
      page.rerender(
        <MotionProvider preference="reduced">
          <ThemeToggler mode="light" onChange={() => undefined} />
        </MotionProvider>,
      );
      settle(page);
      expect(glyphOffset(page)).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });
});

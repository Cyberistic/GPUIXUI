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
import { MotionProvider, surfaceLevelOf } from "../motion.js";
import { ThemeToggler } from "../theme-toggler.js";

const buttonName = (renderer: TestRenderer): string =>
  nodesWithRole(renderer, "button")[0]?.name ?? "";

const layer = (
  page: ReturnType<typeof renderComponent>,
  part: "sun" | "moon",
) => requireBounds(page, `theme-toggler-${part}`);

const centreX = (bounds: { readonly x: number; readonly width: number }) =>
  bounds.x + bounds.width / 2;

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

  it("paints the rest frames for a stored none read through the reader", () => {
    const saved: unknown = "none";
    const page = renderComponent(
      <ThemeToggler
        mode="dark"
        level={surfaceLevelOf(saved)}
        onChange={() => undefined}
      />,
    );
    try {
      page.renderer.clockPause();
      page.rerender(
        <ThemeToggler
          mode="light"
          level={surfaceLevelOf(saved)}
          onChange={() => undefined}
        />,
      );
      settle(page);
      expect(layer(page, "sun").width).toBeLessThan(layer(page, "moon").width);
      expect(
        page.renderer.findByTestId("theme-toggler-sun")?.customProps?.motion,
      ).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("keeps the control's box identical when the mode flips", () => {
    const page = renderComponent(
      <ThemeToggler mode="dark" onChange={() => undefined} />,
    );
    try {
      const before = requireBounds(page, "theme-toggler");
      page.renderer.clockPause();
      page.rerender(<ThemeToggler mode="light" onChange={() => undefined} />);
      settle(page);
      page.renderer.clockFastForward(400);
      settle(page);
      expect(requireBounds(page, "theme-toggler")).toStrictEqual(before);
    } finally {
      page.unmount();
    }
  });

  it("crosses the sun into the crescent, both glyphs centred", () => {
    const page = renderComponent(
      <ThemeToggler mode="dark" onChange={() => undefined} />,
    );
    try {
      const sun = layer(page, "sun");
      const moon = layer(page, "moon");

      expect(sun.width).toBeGreaterThan(moon.width);
      expect(centreX(sun)).toBeCloseTo(centreX(moon), 0);

      page.renderer.clockPause();
      page.rerender(<ThemeToggler mode="light" onChange={() => undefined} />);
      settle(page);

      page.renderer.clockFastForward(160);
      settle(page);
      const crossingSun = layer(page, "sun");
      const crossingMoon = layer(page, "moon");
      expect(crossingSun.width).toBeLessThan(sun.width);
      expect(crossingSun.width).toBeGreaterThan(moon.width);
      expect(crossingMoon.width).toBeGreaterThan(moon.width);
      expect(crossingMoon.width).toBeLessThan(sun.width);
      expect(centreX(crossingSun)).toBeCloseTo(centreX(crossingMoon), 0);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(layer(page, "sun").width).toBeCloseTo(moon.width, 1);
      expect(layer(page, "moon").width).toBeCloseTo(sun.width, 1);
      expect(centreX(layer(page, "sun"))).toBeCloseTo(
        centreX(layer(page, "moon")),
        0,
      );
    } finally {
      page.unmount();
    }
  });

  it("snaps the crossover under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <ThemeToggler mode="dark" onChange={() => undefined} />
      </MotionProvider>,
    );
    try {
      const sun = layer(page, "sun").width;
      page.renderer.clockPause();
      page.rerender(
        <MotionProvider preference="reduced">
          <ThemeToggler mode="light" onChange={() => undefined} />
        </MotionProvider>,
      );
      settle(page);

      expect(layer(page, "moon").width).toBeCloseTo(sun, 1);
      expect(layer(page, "sun").width).toBeLessThan(sun);
    } finally {
      page.unmount();
    }
  });
});

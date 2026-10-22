/**
 * GradientText in the real GPUix renderer.
 *
 * The bugs these guard: a ramp that paints every glyph the same colour; an
 * untagged end that leaves holes instead of the start colour; a word split into
 * one accessibility node per letter; a two-line phrase painted as one row; and
 * a reduced-motion reader whose text still fades in.
 */

import type { TestElement } from "@gpuix/react/testing";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { requireBounds } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { lightTheme } from "../internal/theme.js";
import { MotionProvider } from "../motion.js";
import { GradientText } from "../gradient-text.js";

/** The styled text hosts, in paint order (the run child carries the string). */
const glyphs = (
  page: ReturnType<typeof renderComponent>,
): ReadonlyArray<TestElement> =>
  page.renderer.findByType("text").filter((element) => element.text === null);

/** Every painted glyph, joined, and every colour in the same order. */
const painted = (
  page: ReturnType<typeof renderComponent>,
): {
  readonly text: string;
  readonly colors: ReadonlyArray<string>;
} => ({
  text: page.renderer.getAllText().join(""),
  colors: glyphs(page).map((glyph) => String(glyph.style.color ?? "")),
});

/** The painted y of one named element. */
const yOfWord = (
  page: ReturnType<typeof renderComponent>,
  key: string,
): number => requireBounds(page, `gradient-word-${key}`).y;

describe("GradientText", () => {
  it("paints every glyph of the phrase in reading order", () => {
    const page = renderComponent(
      <GradientText testId="gradient-text" text="Ship it" />,
    );
    try {
      expect(painted(page).text).toBe("Shipit");
      expect(page.renderer.getAllText()).toEqual([..."Shipit"]);
    } finally {
      page.unmount();
    }
  });

  it("samples the ramp from the start colour to the end colour", () => {
    const page = renderComponent(
      <GradientText
        testId="gradient-text"
        text="abcd"
        from="#000000"
        to="#ffffff"
      />,
    );
    try {
      expect(painted(page).colors).toEqual([
        "#000000",
        "#555555",
        "#aaaaaa",
        "#ffffff",
      ]);
    } finally {
      page.unmount();
    }
  });

  it("defaults the ramp to the theme's foreground and primary roles", () => {
    const page = renderComponent(
      <GradientText testId="gradient-text" text="ab" />,
      "light",
    );
    try {
      expect(painted(page).colors).toEqual([
        Str.toLowerCase(lightTheme.colors.foreground),
        Str.toLowerCase(lightTheme.colors.primary),
      ]);
    } finally {
      page.unmount();
    }
  });

  it("paints the run flat in the start colour when an end is not hex", () => {
    const page = renderComponent(
      <GradientText
        testId="gradient-text"
        text="abc"
        from="#123456"
        to="tomato"
      />,
    );
    try {
      expect(painted(page).colors).toEqual(["#123456", "#123456", "#123456"]);
    } finally {
      page.unmount();
    }
  });

  it("keeps each word on one row and starts an explicit newline on the next", () => {
    const page = renderComponent(
      <GradientText testId="gradient-text" text={"Ship it\nNow"} />,
    );
    try {
      expect(yOfWord(page, "0:0:Ship")).toBe(yOfWord(page, "0:4:it"));
      expect(yOfWord(page, "1:0:Now")).toBeGreaterThan(
        yOfWord(page, "0:0:Ship"),
      );
    } finally {
      page.unmount();
    }
  });

  it("names each word once instead of publishing one node per glyph", () => {
    const page = renderComponent(
      <GradientText testId="gradient-text" text="Ship it" />,
    );
    try {
      const names = a11yNodes(page.renderer).map((node) => node.name);
      expect(names).toContain("Ship");
      expect(names).toContain("it");
      expect(names).not.toContain("S");
      expect(names).not.toContain("h");
    } finally {
      page.unmount();
    }
  });

  it("paints at rest on the first frame under the reduced preference", () => {
    const reduced = renderComponent(
      <MotionProvider preference="reduced">
        <GradientText testId="reduced" text="ab" />
      </MotionProvider>,
    );
    try {
      expect(
        reduced.renderer.findByTestId("reduced")?.customProps?.motion,
      ).toMatchObject({
        transition: { duration: 0 },
      });
    } finally {
      reduced.unmount();
    }

    const animated = renderComponent(
      <GradientText testId="animated" text="ab" />,
    );
    try {
      expect(
        animated.renderer.findByTestId("animated")?.customProps?.motion,
      ).toMatchObject({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      });
    } finally {
      animated.unmount();
    }
  });
});

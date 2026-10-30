/**
 * Shimmer behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a text run that still paints the surface band, a
 * highlight that replaces the content instead of inking it, a band that takes
 * the presses aimed at the content, a reduced-motion preference that still
 * schedules the sweep, an inactive surface that still shimmers, and a highlight
 * whose position never moves.
 */

import type { TestElement } from "@gpuix/react/testing";
import { describe, expect, it } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { Shimmer } from "../shimmer.js";

type Root = ReturnType<typeof renderComponent>;

const overlayOf = (root: Root) => root.renderer.findByTestId("shimmer-overlay");

/** The text host per code point, in paint order. */
const glyphs = (root: Root): ReadonlyArray<TestElement> =>
  root.renderer.findByType("text").filter((element) => element.text === null);

/** The ink each glyph paints this frame. */
const inks = (root: Root): ReadonlyArray<string> =>
  glyphs(root).map((glyph) => String(glyph.style.color ?? ""));

/** The strips of the band, in tree order. */
const bandOf = (root: Root) => {
  const overlay = overlayOf(root);
  return overlay === undefined
    ? null
    : (overlay.children ?? []).map((id) => root.renderer.getElement(id));
};

describe("Shimmer", () => {
  it("keeps the content and paints the band over it", () => {
    const shimmer = renderComponent(
      <Shimmer testId="shimmer">
        <text>Thinking…</text>
      </Shimmer>,
      "light",
    );

    expect(shimmer.renderer.getAllText()).toEqual(["Thinking…"]);
    expect(bandOf(shimmer)).toHaveLength(16);
    shimmer.unmount();
  });

  it("inks a text run instead of laying a band over it", () => {
    const shimmer = renderComponent(
      <Shimmer testId="shimmer">Thinking…</Shimmer>,
      "light",
    );
    try {
      expect(bandOf(shimmer)).toBeNull();
      expect(shimmer.renderer.getAllText()).toEqual([..."Thinking…"]);
      expect(inks(shimmer)).toHaveLength([..."Thinking…"].length);
    } finally {
      shimmer.unmount();
    }
  });

  it("moves the ink across the run as the profile travels", async () => {
    const shimmer = renderComponent(
      <Shimmer testId="shimmer">Shop it</Shimmer>,
      "light",
    );
    try {
      const start = inks(shimmer);
      await waitFor(() => expect(inks(shimmer)).not.toEqual(start));
      expect(new Set(inks(shimmer)).size).toBeGreaterThan(1);
    } finally {
      shimmer.unmount();
    }
  });

  it("lets presses through to the content", () => {
    const shimmer = renderComponent(
      <Shimmer testId="shimmer">
        <text>Thinking…</text>
      </Shimmer>,
      "light",
    );
    const overlay = overlayOf(shimmer);
    if (overlay === undefined) throw new Error("no overlay");

    expect(overlay.style.pointerEvents).toBe("none");
    shimmer.unmount();
  });

  it("advances the band while motion is allowed", async () => {
    const shimmer = renderComponent(
      <Shimmer testId="shimmer">
        <text>Thinking…</text>
      </Shimmer>,
      "light",
    );
    const start = JSON.stringify(bandOf(shimmer));
    await waitFor(() =>
      expect(JSON.stringify(bandOf(shimmer))).not.toBe(start),
    );
    shimmer.unmount();
  });

  it("paints no band when the reader asked for less motion", () => {
    const shimmer = renderComponent(
      <Shimmer reducedMotion testId="shimmer">
        <text>Thinking…</text>
      </Shimmer>,
      "light",
    );

    expect(bandOf(shimmer)).toBeNull();
    expect(shimmer.renderer.getAllText()).toEqual(["Thinking…"]);
    shimmer.unmount();
  });

  it("paints no band when it is inactive", () => {
    const shimmer = renderComponent(
      <Shimmer active={false} testId="shimmer">
        <text>Done</text>
      </Shimmer>,
      "light",
    );

    expect(bandOf(shimmer)).toBeNull();
    shimmer.unmount();
  });

  it("announces the surface only when it has a name", () => {
    const named = renderComponent(
      <Shimmer label="Generating a reply" testId="shimmer">
        <text>Thinking…</text>
      </Shimmer>,
      "light",
    );
    expect(
      nodesWithRole(named.renderer, "status").map((node) => node.name),
    ).toEqual(["Generating a reply"]);
    named.unmount();

    const decoration = renderComponent(
      <Shimmer label="   " testId="shimmer">
        <text>Thinking…</text>
      </Shimmer>,
      "light",
    );
    expect(nodesWithRole(decoration.renderer, "status")).toEqual([]);
    decoration.unmount();
  });
});

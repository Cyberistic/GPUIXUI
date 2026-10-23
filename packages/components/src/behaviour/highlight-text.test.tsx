/**
 * HighlightText in the real GPUix renderer.
 *
 * The bugs these guard: a wash that never paints (the spec is on the wrong
 * host); a sweep that is already complete when it mounts, so nothing moves; a
 * step that marks the whole word at once; a reduced run that still waits; a
 * changed query that keeps the previous mark; and ranges that lose to the query
 * they were meant to override.
 *
 * The wash is a painted quad, not text, so `getPaintedHighlights()` is the only
 * seam that can see it; `getAllText()` reports the phrase either way.
 */

import type { TestRoot } from "@gpuix/react/testing";
import { describe, expect, it } from "vitest";
import { waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { HighlightText } from "../highlight-text.js";
import { MotionProvider } from "../motion.js";

/** The washes the last frame painted, after a flush. */
const washes = (renderer: TestRoot["renderer"]) => {
  renderer.flush();
  return renderer.getPaintedHighlights();
};

/** The matched text of every wash, in paint order. */
const marked = (renderer: TestRoot["renderer"]): ReadonlyArray<string> =>
  washes(renderer).map((wash) => wash.text.slice(wash.start, wash.end));

describe("HighlightText", () => {
  it("marks every occurrence of the query with a painted box", () => {
    const page = renderComponent(
      <HighlightText
        testId="hint"
        text="native by native"
        query="native"
        stepMs={0}
      />,
    );
    try {
      expect(page.renderer.getAllText()).toEqual(["native by native"]);
      expect(marked(page.renderer)).toEqual(["native", "native"]);
      expect(
        washes(page.renderer).every((wash) =>
          wash.rects.some((rect) => rect.width > 0 && rect.height > 0),
        ),
      ).toBe(true);
    } finally {
      page.unmount();
    }
  });

  it("starts with no wash and sweeps a code point at a time", async () => {
    const page = renderComponent(
      <HighlightText text="native" query="native" stepMs={1000} />,
    );
    try {
      expect(marked(page.renderer)).toEqual([]);

      await waitFor(() => expect(marked(page.renderer)).toEqual(["n"]), 4000);
    } finally {
      page.unmount();
    }
  });

  it("finishes the sweep on the last code point of every mark", async () => {
    const page = renderComponent(
      <HighlightText text="ab ab" query="ab" stepMs={20} />,
    );
    try {
      await waitFor(
        () => expect(marked(page.renderer)).toEqual(["ab", "ab"]),
        4000,
      );
    } finally {
      page.unmount();
    }
  });

  it("paints the whole wash on the first frame under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <HighlightText text="native" query="native" stepMs={1000} />
      </MotionProvider>,
    );
    try {
      expect(marked(page.renderer)).toEqual(["native"]);
    } finally {
      page.unmount();
    }
  });

  it("takes the caller's ranges over the query", () => {
    const page = renderComponent(
      <HighlightText text="native" query="zzz" ranges={[[0, 3]]} stepMs={0} />,
    );
    try {
      expect(marked(page.renderer)).toEqual(["nat"]);
    } finally {
      page.unmount();
    }
  });

  it("marks a whole word only when asked", () => {
    const page = renderComponent(
      <HighlightText
        text="alpha alphabet"
        query="alpha"
        wholeWord
        stepMs={0}
      />,
    );
    try {
      expect(marked(page.renderer)).toEqual(["alpha"]);
    } finally {
      page.unmount();
    }
  });

  it("paints only the mark the caller names as the active match", () => {
    const mark = (activeIndex: number | undefined) => (
      <HighlightText
        text="native by native"
        query="native"
        activeIndex={activeIndex}
        stepMs={0}
      />
    );
    const page = renderComponent(mark(1));
    try {
      expect(washes(page.renderer).map((wash) => wash.active)).toEqual([
        false,
        true,
      ]);

      page.rerender(mark(0));
      expect(washes(page.renderer).map((wash) => wash.active)).toEqual([
        true,
        false,
      ]);

      page.rerender(mark(undefined));
      expect(washes(page.renderer).map((wash) => wash.active)).toEqual([
        false,
        false,
      ]);
    } finally {
      page.unmount();
    }
  });

  it("replays the sweep when the query changes", async () => {
    const page = renderComponent(
      <HighlightText text="native by design" query="native" stepMs={1000} />,
    );
    try {
      await waitFor(() => expect(marked(page.renderer)).toEqual(["n"]), 4000);

      page.rerender(
        <HighlightText text="native by design" query="by" stepMs={1000} />,
      );
      expect(marked(page.renderer)).toEqual([]);

      await waitFor(() => expect(marked(page.renderer)).toEqual(["b"]), 4000);
    } finally {
      page.unmount();
    }
  });
});

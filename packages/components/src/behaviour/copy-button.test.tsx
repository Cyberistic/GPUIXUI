/**
 * CopyButton in the real GPUix renderer.
 *
 * The bugs these guard: a press that acknowledges without handing the text to
 * the caller's write (or hands it twice); an acknowledgement that never clears,
 * or clears early because a second press did not restart its window; a checked
 * glyph that arrives without the house entrance, or one that still moves for
 * `level="none"` and the reduced preference; and a disabled action that copies.
 *
 * The acknowledgement's arrival is measured on the runtime's motion clock as
 * geometry: the checked glyph starts 3 px low and settles. The fade itself is a
 * paint value the tree does not expose — the `surface-fade` live probe proves it
 * for the seam this action shares with every overlay.
 */

import { describe, expect, it } from "vitest";
import type { TestRenderer } from "@gpuix/react/testing";
import { nodesWithRole } from "../internal/a11y.js";
import {
  after,
  clickCentreOf,
  requireBounds,
  settle,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { CopyButton } from "../copy-button.js";
import { MotionProvider } from "../motion.js";

/** The one `button` node's accessible name, `""` when there is none. */
const buttonName = (renderer: TestRenderer): string =>
  nodesWithRole(renderer, "button")[0]?.name ?? "";

/** The glyph's offset from its centred place inside the control, in pixels. */
const glyphOffset = (page: ReturnType<typeof renderComponent>): number => {
  const button = requireBounds(page, "copy-button");
  const glyph = requireBounds(page, "copy-button-glyph");
  const centred = button.y + (button.height - glyph.height) / 2;
  return glyph.y - centred;
};

describe("CopyButton", () => {
  it("hands the text to the caller and acknowledges the press", async () => {
    const copies: Array<string> = [];
    const page = renderComponent(
      <CopyButton
        text="npm i @gpuixui/components"
        onCopy={(text) => copies.push(text)}
        acknowledgeMs={40}
      />,
    );
    try {
      expect(buttonName(page.renderer)).toBe("Copy");

      clickCentreOf(page, "copy-button");
      settle(page);
      expect(copies).toEqual(["npm i @gpuixui/components"]);
      expect(buttonName(page.renderer)).toBe("Copied");

      await waitFor(
        () => expect(buttonName(page.renderer)).toBe("Copy"),
        2_000,
      );
    } finally {
      page.unmount();
    }
  });

  it("restarts the window on a second press instead of clearing early", async () => {
    const copies: Array<number> = [];
    const window = 400;
    const page = renderComponent(
      <CopyButton
        text="value"
        onCopy={() => copies.push(1)}
        acknowledgeMs={window}
      />,
    );
    try {
      clickCentreOf(page, "copy-button");
      settle(page);
      await after(window * 0.5);
      clickCentreOf(page, "copy-button");
      settle(page);

      // Past the first window, before the restarted one: a stacked timer has
      // cleared the acknowledgement by now, a restarted one has not.
      await after(window * 0.75);
      expect(copies).toHaveLength(2);
      expect(buttonName(page.renderer)).toBe("Copied");

      await waitFor(
        () => expect(buttonName(page.renderer)).toBe("Copy"),
        2_000,
      );
    } finally {
      page.unmount();
    }
  });

  it("rises the acknowledged glyph into place on the fast level", () => {
    const page = renderComponent(
      <CopyButton text="value" onCopy={() => undefined} />,
    );
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "copy-button");
      settle(page);
      expect(glyphOffset(page)).toBeCloseTo(3, 1);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(glyphOffset(page)).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("paints the acknowledged glyph at rest for none and reduced", () => {
    const plain = renderComponent(
      <CopyButton text="value" onCopy={() => undefined} level="none" />,
    );
    try {
      plain.renderer.clockPause();
      clickCentreOf(plain, "copy-button");
      settle(plain);
      expect(glyphOffset(plain)).toBeCloseTo(0, 1);
      expect(
        plain.renderer.findByTestId("copy-button-glyph")?.customProps?.motion,
      ).toBeUndefined();
    } finally {
      plain.unmount();
    }

    const reduced = renderComponent(
      <MotionProvider preference="reduced">
        <CopyButton text="value" onCopy={() => undefined} />
      </MotionProvider>,
    );
    try {
      reduced.renderer.clockPause();
      clickCentreOf(reduced, "copy-button");
      settle(reduced);
      expect(glyphOffset(reduced)).toBeCloseTo(0, 1);
    } finally {
      reduced.unmount();
    }
  });

  it("takes a caller's names, and never copies from a disabled action", () => {
    const copies: Array<string> = [];
    const page = renderComponent(
      <CopyButton
        text="value"
        onCopy={(text) => copies.push(text)}
        label="Copy the token"
        copiedLabel="Token copied"
        disabled
      />,
    );
    try {
      expect(buttonName(page.renderer)).toBe("Copy the token");
      expect(
        page.renderer.findByTestId("copy-button")?.customProps?.tabIndex,
      ).toBe(-1);

      clickCentreOf(page, "copy-button");
      settle(page);
      expect(copies).toEqual([]);
      expect(buttonName(page.renderer)).toBe("Copy the token");
    } finally {
      page.unmount();
    }
  });
});

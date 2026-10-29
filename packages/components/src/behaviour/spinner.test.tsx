/**
 * Spinner behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a spinner with no accessible name (a decorative ring a
 * screen reader walks into), a name the caller sets being ignored, a size name
 * that does not reach the ring, a ring whose ticks paint outside its box (the
 * arc loses a piece), and a reduced-motion preference that leaves the mark
 * stepping.
 */

import { SPINNER_RING_TICKS } from "@gpuixui/primitives/spinner";
import { describe, expect, it } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { waitFor } from "../internal/interaction.js";
import { lightTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { Spinner, type SpinnerSize } from "../spinner.js";

type Root = ReturnType<typeof renderComponent>;

/** The elements a spinner painted, plus the ring's own box. */
const ringOf = (root: Root) => {
  const element = root.renderer.findByTestId("spinner");
  if (element === undefined) throw new Error("the spinner painted no ring");
  return {
    width: element.style.width,
    height: element.style.height,
    ticks: (element.children ?? []).map((id) => {
      const tick = root.renderer.getElement(id);
      if (tick === undefined || tick === null) {
        throw new Error("a ring tick was not painted");
      }
      return tick.style;
    }),
  };
};

/** The opacity each tick painted on the frame just read. */
const tickOpacities = (root: Root): ReadonlyArray<unknown> =>
  ringOf(root).ticks.map((style) => style.opacity);

describe("Spinner", () => {
  it("defaults its accessible name to Loading", () => {
    const spinner = renderComponent(<Spinner testId="spinner" />, "light");

    expect(
      nodesWithRole(spinner.renderer, "status").map((node) => node.name),
    ).toEqual(["Loading"]);

    spinner.unmount();
  });

  it("announces the caller's label instead", () => {
    const spinner = renderComponent(
      <Spinner testId="spinner" label="Saving changes" />,
      "light",
    );

    expect(
      nodesWithRole(spinner.renderer, "status").map((node) => node.name),
    ).toEqual(["Saving changes"]);

    spinner.unmount();
  });

  it("paints a ring at the icon step the size names", () => {
    const sizes = (size: SpinnerSize): { readonly width: unknown } => {
      const spinner = renderComponent(
        <Spinner testId="spinner" size={size} />,
        "light",
      );
      const painted = ringOf(spinner);
      spinner.unmount();
      return { width: painted.width };
    };

    expect(sizes("sm")).toEqual({ width: lightTheme.iconSize.sm });
    expect(sizes("md")).toEqual({ width: lightTheme.iconSize.md });
    expect(sizes("lg")).toEqual({ width: lightTheme.iconSize.lg });
  });

  it("keeps every tick inside the ring's box", () => {
    // The bug guarded: a tick placed at a radius that ignored its own side
    // painted past the ring's edge, and a parent clip removed part of the arc.
    const spinner = renderComponent(
      <Spinner testId="spinner" size="lg" />,
      "light",
    );
    const ring = ringOf(spinner);

    expect(ring.ticks).toHaveLength(SPINNER_RING_TICKS);
    for (const tick of ring.ticks) {
      expect(Number(tick.left)).toBeGreaterThanOrEqual(0);
      expect(Number(tick.top)).toBeGreaterThanOrEqual(0);
      expect(Number(tick.left) + Number(tick.width)).toBeLessThanOrEqual(
        Number(ring.width),
      );
      expect(Number(tick.top) + Number(tick.height)).toBeLessThanOrEqual(
        Number(ring.height),
      );
    }
    spinner.unmount();
  });

  it("advances the lit arc while motion is allowed", async () => {
    const moving = renderComponent(<Spinner testId="spinner" />, "light");
    const start = tickOpacities(moving);
    await waitFor(() => expect(tickOpacities(moving)).not.toEqual(start));
    moving.unmount();
  });

  it("holds the resting arc when the reader asked for less motion", async () => {
    const still = renderComponent(
      <Spinner testId="spinner" reducedMotion />,
      "light",
    );
    const start = tickOpacities(still);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(tickOpacities(still)).toEqual(start);
    still.unmount();
  });
});

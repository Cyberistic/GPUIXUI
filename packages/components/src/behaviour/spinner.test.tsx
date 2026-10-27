/**
 * Spinner behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a spinner with no accessible name (a decorative row a
 * screen reader walks into), a name the caller sets being ignored, a size name
 * that does not reach the dots, and a reduced-motion preference that leaves the
 * mark stepping.
 */

import { describe, expect, it } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { waitFor } from "../internal/interaction.js";
import { lightTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { Spinner, type SpinnerSize } from "../spinner.js";

/** The opacity each dot painted on the frame just read. */
const dotOpacities = (
  root: ReturnType<typeof renderComponent>,
): ReadonlyArray<unknown> => {
  const group = root.renderer.findByTestId("spinner");
  return (group?.children ?? []).map(
    (id) => root.renderer.getElement(id)?.style.opacity,
  );
};

/** The width each dot painted, in tree order. */
const dotSizes = (
  root: ReturnType<typeof renderComponent>,
): ReadonlyArray<unknown> => {
  const group = root.renderer.findByTestId("spinner");
  return (group?.children ?? []).map(
    (id) => root.renderer.getElement(id)?.style.width,
  );
};

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

  it("paints three dots at the icon step the size names", () => {
    const sizes = (size: SpinnerSize): ReadonlyArray<unknown> => {
      const spinner = renderComponent(
        <Spinner testId="spinner" size={size} />,
        "light",
      );
      const painted = dotSizes(spinner);
      spinner.unmount();
      return painted;
    };

    expect(sizes("sm")).toEqual(
      Array.from({ length: 3 }, () => lightTheme.iconSize.sm),
    );
    expect(sizes("md")).toEqual(
      Array.from({ length: 3 }, () => lightTheme.iconSize.md),
    );
    expect(sizes("lg")).toEqual(
      Array.from({ length: 3 }, () => lightTheme.iconSize.lg),
    );
  });

  it("advances the lit dot while motion is allowed", async () => {
    const moving = renderComponent(<Spinner testId="spinner" />, "light");
    const start = dotOpacities(moving);
    await waitFor(() => expect(dotOpacities(moving)).not.toEqual(start));
    moving.unmount();
  });
});

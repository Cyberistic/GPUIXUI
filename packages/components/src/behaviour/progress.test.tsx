/**
 * Progress behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: `max` was ignored (a bar stated in bytes painted the
 * same share as one stated in percent), a stored `null` painted an empty
 * determinate bar instead of the indeterminate one, and a bar painted a role
 * from a literal rather than the active platform theme.
 */

import { platformTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { lightTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { Progress, ProgressValue } from "../progress.js";

/** The background colours the tree painted, top to bottom. */
const painted = (
  root: ReturnType<typeof renderComponent>,
): ReadonlyArray<unknown> =>
  root.renderer
    .findByType("div")
    .map((element) => element.style.backgroundColor);

describe("Progress", () => {
  it("states the value as a share of the caller's maximum", () => {
    const upload = renderComponent(
      <Progress testId="bar" label="Uploading" value={30} max={120}>
        <ProgressValue testId="share" />
      </Progress>,
    );

    expect(upload.renderer.getAllText()).toEqual(["25%"]);
    expect(
      upload.renderer.findByTestId("bar")?.customProps?.["aria-valuetext"],
    ).toBe("25%");
    expect(
      a11yNodes(upload.renderer).find(
        (node) => node.role === "progressindicator",
      )?.name,
    ).toBe("Uploading");

    upload.unmount();
  });

  it("paints the indeterminate segment when the record carries no share", () => {
    const pending = renderComponent(
      <Progress testId="bar" label="Preparing" />,
    );
    expect(
      pending.renderer.findByTestId("bar")?.customProps?.["aria-valuetext"],
    ).toBe("loading");
    pending.unmount();

    const stored = renderComponent(
      <Progress testId="bar" label="Preparing" value={null} />,
    );
    expect(
      stored.renderer.findByTestId("bar")?.customProps?.["aria-valuetext"],
    ).toBe("loading");
    stored.unmount();
  });

  it("keeps the track and fill on the active platform's roles", () => {
    const paint = (theme: typeof lightTheme) => {
      const root = renderComponent(<Progress value={40} />, theme);
      const colours = painted(root);
      root.unmount();
      return colours;
    };
    const macOS = platformTheme(lightTheme, "darwin");
    const windows = platformTheme(lightTheme, "win32");

    expect(paint(macOS)).toEqual(
      expect.arrayContaining([macOS.colors.muted, macOS.colors.primary]),
    );
    expect(paint(windows)).toEqual(
      expect.arrayContaining([windows.colors.muted, windows.colors.primary]),
    );
    // The premise: the two styles do not paint the same track.
    expect(macOS.colors.muted).not.toBe(windows.colors.muted);
  });
});

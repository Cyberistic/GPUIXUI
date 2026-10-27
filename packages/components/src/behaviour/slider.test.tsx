/**
 * Slider behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a stored pair reached the one-thumb primitive (so only
 * its first end painted), a disabled slider still answered a key, the two ends
 * could cross under the keyboard, and the track painted a literal instead of the
 * active platform's roles.
 */

import { platformTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { pressKey } from "../internal/interaction.js";
import { lightTheme, type Theme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { Slider } from "../slider.js";

/** Every `slider` node, in tree order, with its announced value. */
const thumbs = (
  root: ComponentTestRoot,
): ReadonlyArray<{
  readonly id: number;
  readonly label: string;
  readonly value: string;
  readonly tabIndex: unknown;
}> =>
  root.renderer
    .findByType("div")
    .filter((element) => element.customProps?.role === "slider")
    .map((element) => ({
      id: element.id,
      label: String(element.customProps?.["aria-label"] ?? ""),
      value: String(element.customProps?.["aria-valuetext"] ?? ""),
      tabIndex: element.customProps?.["tabIndex"],
    }));

/** The values the slider announces, in tree order. */
const values = (root: ComponentTestRoot): ReadonlyArray<string> =>
  thumbs(root).map((thumb) => thumb.value);

/** The background colours the tree painted. */
const painted = (root: ComponentTestRoot): ReadonlyArray<unknown> =>
  root.renderer
    .findByType("div")
    .map((element) => element.style.backgroundColor);

describe("Slider", () => {
  it("steps by one, ten on PageUp and PageDown, and to the ends", () => {
    const slider = renderComponent(
      <Slider testId="s" label="Volume" defaultValue={50} />,
    );
    const track = thumbs(slider)[0];

    if (track === undefined) throw new Error("the slider painted no thumb");
    slider.renderer.focusElement(track.id);

    pressKey(slider, "right");
    expect(values(slider)).toEqual(["51"]);
    pressKey(slider, "pagedown");
    expect(values(slider)).toEqual(["41"]);
    pressKey(slider, "pageup");
    expect(values(slider)).toEqual(["51"]);
    pressKey(slider, "home");
    expect(values(slider)).toEqual(["0"]);
    pressKey(slider, "end");
    expect(values(slider)).toEqual(["100"]);

    slider.unmount();
  });

  it("answers no key while it is disabled", () => {
    const slider = renderComponent(
      <Slider testId="s" label="Volume" defaultValue={50} disabled />,
    );
    const track = thumbs(slider)[0];

    if (track === undefined) throw new Error("the slider painted no thumb");
    expect(track.tabIndex).toBeUndefined();
    slider.renderer.focusElement(track.id);

    pressKey(slider, "right");
    pressKey(slider, "pageup");

    expect(values(slider)).toEqual(["50"]);

    slider.unmount();
  });

  it("paints a pair as a range whose ends cannot cross", () => {
    const slider = renderComponent(
      <Slider testId="r" label="Price" defaultValue={[70, 20]} />,
    );

    expect(thumbs(slider).map((thumb) => thumb.label)).toEqual([
      "Price minimum",
      "Price maximum",
    ]);
    expect(values(slider)).toEqual(["20", "70"]);

    const start = thumbs(slider)[0];
    if (start === undefined) throw new Error("the range painted no start");
    slider.renderer.focusElement(start.id);
    pressKey(slider, "end");

    // The start stops on the end rather than passing it: from ≤ to.
    expect(values(slider)).toEqual(["70", "70"]);

    slider.unmount();
  });

  it("keeps the rail and fill on the active platform's roles", () => {
    const paint = (theme: Theme) => {
      const root = renderComponent(
        <Slider label="Volume" defaultValue={40} />,
        theme,
      );
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
    // The premise: the two styles do not paint the same rail.
    expect(macOS.colors.muted).not.toBe(windows.colors.muted);
  });
});

/**
 * Toggle behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: the pressed state was not announced at all (0.11.0
 * carries no `aria-pressed`, so `aria-valuetext` is the only channel), an
 * icon-only toggle published no name, a controlled toggle repainted itself, and
 * the pressed face painted a literal instead of the active platform's accent.
 */

import { platformTheme } from "@gpuixui/tokens";
import { Icon } from "@gpuixui/icons";
import { describe, expect, it, vi } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { clickCentreOf, pressKey } from "../internal/interaction.js";
import { lightTheme, type Theme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { Toggle } from "../toggle.js";

/** What the toggle tells assistive technology. */
const announced = (root: ReturnType<typeof renderComponent>): unknown =>
  root.renderer.findByTestId("t")?.customProps?.["aria-valuetext"];

describe("Toggle", () => {
  it("announces its pressed state through the one channel 0.11.0 carries", () => {
    const toggle = renderComponent(
      <Toggle testId="t" label="Bold">
        Bold
      </Toggle>,
    );
    const props = toggle.renderer.findByTestId("t")?.customProps;

    expect(props).toMatchObject({
      role: "button",
      "aria-label": "Bold",
      "aria-valuetext": "not pressed",
      tabIndex: 0,
    });
    // The runtime ignores it, so the component must not pretend it published one.
    expect(props?.["aria-pressed"]).toBeUndefined();

    toggle.unmount();
  });

  it("toggles on a press and on the Enter key", () => {
    const toggle = renderComponent(
      <Toggle testId="t" label="Bold">
        Bold
      </Toggle>,
    );

    clickCentreOf(toggle, "t");
    expect(announced(toggle)).toBe("pressed");

    pressKey(toggle, "enter");
    expect(announced(toggle)).toBe("not pressed");

    toggle.unmount();
  });

  it("reports a controlled toggle without repainting it itself", () => {
    const onPressedChange = vi.fn();
    const toggle = renderComponent(
      <Toggle
        testId="t"
        label="Italic"
        pressed={false}
        onPressedChange={onPressedChange}
      >
        Italic
      </Toggle>,
    );

    clickCentreOf(toggle, "t");

    expect(onPressedChange).toHaveBeenCalledWith(true);
    expect(announced(toggle)).toBe("not pressed");

    toggle.rerender(
      <Toggle
        testId="t"
        label="Italic"
        pressed
        onPressedChange={onPressedChange}
      >
        Italic
      </Toggle>,
    );
    expect(announced(toggle)).toBe("pressed");

    toggle.unmount();
  });

  it("names an icon-only toggle by its label", () => {
    const theme = lightTheme;
    const toggle = renderComponent(
      <Toggle
        testId="t"
        label="Grid view"
        square
        leading={<Icon name="grid" color={theme.colors.foreground} />}
      />,
    );

    expect(toggle.renderer.getAllText()).toEqual([]);
    expect(
      a11yNodes(toggle.renderer).find((node) => node.role === "button")?.name,
    ).toBe("Grid view");

    toggle.unmount();
  });

  it("keeps the pressed face on the active platform's accents", () => {
    const paint = (theme: Theme) => {
      const root = renderComponent(
        <Toggle testId="t" label="Bold" pressed />,
        theme,
      );
      const style = root.renderer.findByTestId("t")?.style;
      root.unmount();
      return style;
    };
    const macOS = platformTheme(lightTheme, "darwin");
    const windows = platformTheme(lightTheme, "win32");

    expect(paint(macOS)).toMatchObject({
      backgroundColor: macOS.colors.accent,
      color: macOS.colors.accentForeground,
    });
    expect(paint(windows)).toMatchObject({
      backgroundColor: windows.colors.accent,
      color: windows.colors.accentForeground,
    });
    // The premise: the two styles do not paint the same pressed face.
    expect(macOS.colors.accent).not.toBe(windows.colors.accent);
  });
});

/**
 * Countdown behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a display that ignores a new remaining value, an expired
 * countdown that still reads as live, an unsigned label, a style callback that
 * cannot see the expiry, and a remaining time the clock cannot read painted as
 * the literal word `NaN` while the countdown still read as live.
 */

import { describe, expect, it } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { darkTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { Countdown } from "../countdown.js";

describe("Countdown", () => {
  it("renders the formatted remaining time", () => {
    const countdown = renderComponent(<Countdown remainingMs={90_000} />);

    expect(countdown.renderer.getAllText()).toEqual(["01:30"]);

    countdown.unmount();
  });

  it("renders a new value when the application ticks", () => {
    const countdown = renderComponent(<Countdown remainingMs={90_000} />);

    countdown.rerender(<Countdown remainingMs={61_000} />);
    expect(countdown.renderer.getAllText()).toEqual(["01:01"]);

    countdown.unmount();
  });

  it("renders an expired countdown as 00:00 in the muted role", () => {
    const countdown = renderComponent(<Countdown remainingMs={-1} />);

    const leaf = countdown.renderer.findByText("00:00");
    const text =
      leaf?.parentId == null
        ? undefined
        : countdown.renderer.getElement(leaf.parentId);
    expect(text?.style.color).toBe(darkTheme.colors.mutedForeground);

    countdown.unmount();
  });

  it("renders an unreadable remaining time as the empty clock, expired", () => {
    const countdown = renderComponent(
      <Countdown
        testId="countdown"
        remainingMs={Number.NaN}
        style={(state) => ({ opacity: state.expired ? 1 : 0.5 })}
      />,
    );

    const painted = countdown.renderer.getAllText();
    const leaf = countdown.renderer.findByText("00:00");
    const text =
      leaf?.parentId == null
        ? undefined
        : countdown.renderer.getElement(leaf.parentId);
    const ink = text?.style.color;
    const opacity = countdown.renderer.findByTestId("countdown")?.style.opacity;
    countdown.unmount();

    expect(painted).toEqual(["00:00"]);
    expect(ink).toBe(darkTheme.colors.mutedForeground);
    expect(opacity).toBe(1);
  });

  it("names the value with the label", () => {
    const countdown = renderComponent(
      <Countdown remainingMs={90_000} label="Offer ends in" />,
    );

    expect(a11yNodes(countdown.renderer).map((node) => node.name)).toContain(
      "Offer ends in",
    );

    countdown.unmount();
  });

  it("offers the expiry to a style callback and lets a style win", () => {
    const countdown = renderComponent(
      <Countdown
        testId="countdown"
        remainingMs={5_000}
        style={(state) => ({ opacity: state.expired ? 1 : 0.5 })}
      />,
    );

    expect(countdown.renderer.findByTestId("countdown")?.style.opacity).toBe(
      0.5,
    );

    countdown.unmount();

    const expired = renderComponent(
      <Countdown
        testId="countdown"
        remainingMs={0}
        style={(state) => ({ opacity: state.expired ? 1 : 0.5 })}
      />,
      "light",
    );

    expect(expired.renderer.findByTestId("countdown")?.style.opacity).toBe(1);
    expired.unmount();
  });
});

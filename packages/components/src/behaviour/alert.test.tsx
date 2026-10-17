/**
 * Alert behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a tone that does not tint the surface; a body that
 * inherits the tone's text colour and becomes unreadable; a dismiss control that
 * renders without `onDismiss`, disappears with it, or cannot be reached and fired
 * by keyboard; a click that fires twice; a lost alert role; and a body slot that
 * swallows the click of the action inside it.
 */

import * as Arr from "effect/Array";
import { describe, expect, it, vi } from "vitest";
import { Alert, type AlertTone } from "../alert.js";
import { nodesWithRole } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import { clickCentreOf } from "../internal/interaction.js";
import { darkTheme, lightTheme, tone } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";

/** Every tone, so a missing case fails rather than going unnoticed. */
const tones: ReadonlyArray<AlertTone> = [
  "info",
  "success",
  "warning",
  "danger",
];

describe("Alert", () => {
  it("is a live region that renders its title and body in order", () => {
    const alert = renderComponent(
      <Alert testId="alert" title="Sync paused">
        Two files could not be uploaded.
      </Alert>,
    );

    expect(alert.renderer.getAllText()).toEqual([
      "Sync paused",
      "Two files could not be uploaded.",
    ]);
    expect(nodesWithRole(alert.renderer, "alert")).toHaveLength(1);

    alert.unmount();
  });

  it("paints every tone's surface and heading from the shared palette", () => {
    Arr.forEach(tones, (value) => {
      const alert = renderComponent(
        <Alert testId="alert" tone={value} title="Heads up" />,
      );

      expect(alert.renderer.findByTestId("alert")?.style).toMatchObject({
        backgroundColor: tone(darkTheme, value).bg,
        borderColor: tone(darkTheme, value).border,
        color: tone(darkTheme, value).fg,
      });

      alert.unmount();
    });
  });

  it("keeps body prose in the foreground colour, not the tone's", () => {
    const alert = renderComponent(
      <Alert testId="alert" tone="warning" title="Heads up">
        Details
      </Alert>,
    );

    // A warning tone's text colour on its own tint is the tone's dark shade;
    // if the body inherited it, no container would carry the page foreground.
    expect(
      Arr.some(
        alert.renderer.findByType("div"),
        (element) => element.style.color === darkTheme.colors.foreground,
      ),
    ).toBe(true);

    alert.unmount();
  });

  it("reads the theme for a tone fill", () => {
    const dark = renderComponent(
      <Alert testId="alert" tone="danger" title="Failed" />,
      "dark",
    );
    expect(dark.renderer.findByTestId("alert")?.style.backgroundColor).toBe(
      tone(darkTheme, "danger").bg,
    );
    dark.unmount();

    const light = renderComponent(
      <Alert testId="alert" tone="danger" title="Failed" />,
      "light",
    );
    expect(light.renderer.findByTestId("alert")?.style.backgroundColor).toBe(
      tone(lightTheme, "danger").bg,
    );
    light.unmount();
  });

  it("renders no dismiss control without onDismiss", () => {
    const alert = renderComponent(<Alert testId="alert" title="Heads up" />);

    expect(alert.renderer.findByTestId("alert-dismiss")).toBeUndefined();
    expect(alert.renderer.getAllText()).toEqual(["Heads up"]);

    alert.unmount();
  });

  it("dismisses when its control is clicked", () => {
    const onDismiss = vi.fn();
    const alert = renderComponent(
      <Alert testId="alert" title="Heads up" onDismiss={onDismiss} />,
    );

    clickCentreOf(alert, "alert-dismiss");

    expect(onDismiss).toHaveBeenCalledTimes(1);

    alert.unmount();
  });

  it("dismisses from the keyboard through a focusable control", () => {
    const onDismiss = vi.fn();
    const alert = renderComponent(
      <Alert testId="alert" title="Heads up" onDismiss={onDismiss} />,
    );

    const dismiss = alert.renderer.findByTestId("alert-dismiss");
    expect(dismiss).toBeDefined();
    if (dismiss === undefined) return;

    alert.renderer.focusElement(dismiss.id);
    alert.renderer.simulateKeystrokes("enter");

    expect(onDismiss).toHaveBeenCalledTimes(1);

    alert.unmount();
  });

  it("names its dismiss control for assistive technology", () => {
    const alert = renderComponent(
      <Alert
        testId="alert"
        title="Heads up"
        onDismiss={() => undefined}
        dismissLabel="Close the notice"
      />,
    );

    const buttons = nodesWithRole(alert.renderer, "button");
    expect(buttons.map((node) => node.name)).toEqual(["Close the notice"]);

    alert.unmount();
  });

  it("renders an interactive body without swallowing its click", () => {
    const onRetry = vi.fn();
    const alert = renderComponent(
      <Alert testId="alert" tone="danger" title="Upload failed">
        <Button testId="retry" onClick={onRetry}>
          Try again
        </Button>
      </Alert>,
    );

    clickCentreOf(alert, "retry");

    expect(onRetry).toHaveBeenCalledTimes(1);

    alert.unmount();
  });

  it("lets a consumer's style win", () => {
    const alert = renderComponent(
      <Alert testId="alert" title="Heads up" style={{ borderRadius: 0 }} />,
    );

    expect(alert.renderer.findByTestId("alert")?.style.borderRadius).toBe(0);

    alert.unmount();
  });
});

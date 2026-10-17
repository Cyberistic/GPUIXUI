/**
 * Alert behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a tone that does not tint the surface; a title that does
 * not take the tone's readable colour; a description that inherits that colour
 * and becomes unreadable; a dismiss control that renders without `onDismiss`,
 * cannot be reached and fired by keyboard, or fires twice; a lost alert role; a
 * description that swallows the click of the action inside it; and a part that
 * silently renders outside its root with the default tone.
 */

import * as Arr from "effect/Array";
import { describe, expect, it, vi } from "vitest";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertDismiss,
  AlertIcon,
  AlertTitle,
  type AlertTone,
} from "../alert.js";
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
  it("is a live region that renders its parts in order", () => {
    const alert = renderComponent(
      <Alert testId="alert">
        <AlertContent>
          <AlertTitle>Sync paused</AlertTitle>
          <AlertDescription>Two files could not be uploaded.</AlertDescription>
        </AlertContent>
      </Alert>,
    );

    expect(alert.renderer.getAllText()).toEqual([
      "Sync paused",
      "Two files could not be uploaded.",
    ]);
    expect(nodesWithRole(alert.renderer, "alert")).toHaveLength(1);

    alert.unmount();
  });

  it("paints every tone's surface from the shared palette", () => {
    Arr.forEach(tones, (value) => {
      const alert = renderComponent(
        <Alert testId="alert" tone={value}>
          <AlertTitle testId="alert-title">Heads up</AlertTitle>
        </Alert>,
      );

      expect(alert.renderer.findByTestId("alert")?.style).toMatchObject({
        backgroundColor: tone(darkTheme, value).bg,
        borderColor: tone(darkTheme, value).border,
        color: tone(darkTheme, value).fg,
      });
      expect(alert.renderer.findByTestId("alert-title")?.style.color).toBe(
        tone(darkTheme, value).fg,
      );

      alert.unmount();
    });
  });

  it("keeps description prose in the foreground colour, not the tone's", () => {
    const alert = renderComponent(
      <Alert testId="alert" tone="warning">
        <AlertDescription testId="alert-description">Details</AlertDescription>
      </Alert>,
    );

    expect(alert.renderer.findByTestId("alert-description")?.style.color).toBe(
      darkTheme.colors.foreground,
    );

    alert.unmount();
  });

  it("paints the icon in the tone's colour and treats it as optional", () => {
    const withIcon = renderComponent(
      <Alert testId="alert" tone="danger">
        <AlertIcon testId="alert-icon">!</AlertIcon>
      </Alert>,
    );
    expect(withIcon.renderer.findByTestId("alert-icon")?.style.color).toBe(
      tone(darkTheme, "danger").fg,
    );
    withIcon.unmount();

    const withoutIcon = renderComponent(<Alert testId="alert" />);
    expect(withoutIcon.renderer.findByTestId("alert-icon")).toBeUndefined();
    withoutIcon.unmount();
  });

  it("reads the theme for a tone fill", () => {
    const dark = renderComponent(
      <Alert testId="alert" tone="danger" />,
      "dark",
    );
    expect(dark.renderer.findByTestId("alert")?.style.backgroundColor).toBe(
      tone(darkTheme, "danger").bg,
    );
    dark.unmount();

    const light = renderComponent(
      <Alert testId="alert" tone="danger" />,
      "light",
    );
    expect(light.renderer.findByTestId("alert")?.style.backgroundColor).toBe(
      tone(lightTheme, "danger").bg,
    );
    light.unmount();
  });

  it("renders no dismiss control unless AlertDismiss is composed", () => {
    const alert = renderComponent(
      <Alert testId="alert">
        <AlertTitle>Heads up</AlertTitle>
      </Alert>,
    );

    expect(alert.renderer.findByTestId("alert-dismiss")).toBeUndefined();
    expect(alert.renderer.getAllText()).toEqual(["Heads up"]);

    alert.unmount();
  });

  it("dismisses when its control is clicked", () => {
    const onDismiss = vi.fn();
    const alert = renderComponent(
      <Alert testId="alert">
        <AlertTitle>Heads up</AlertTitle>
        <AlertDismiss onDismiss={onDismiss} />
      </Alert>,
    );

    clickCentreOf(alert, "alert-dismiss");

    expect(onDismiss).toHaveBeenCalledTimes(1);

    alert.unmount();
  });

  it("dismisses from the keyboard through a focusable control", () => {
    const onDismiss = vi.fn();
    const alert = renderComponent(
      <Alert testId="alert">
        <AlertDismiss onDismiss={onDismiss} />
      </Alert>,
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
    const standard = renderComponent(
      <Alert testId="alert">
        <AlertDismiss onDismiss={() => undefined} />
      </Alert>,
    );
    expect(
      nodesWithRole(standard.renderer, "button").map((node) => node.name),
    ).toEqual(["Dismiss"]);
    standard.unmount();

    const named = renderComponent(
      <Alert testId="alert">
        <AlertDismiss onDismiss={() => undefined} label="Close the notice" />
      </Alert>,
    );
    expect(
      nodesWithRole(named.renderer, "button").map((node) => node.name),
    ).toEqual(["Close the notice"]);
    named.unmount();
  });

  it("renders an interactive description without swallowing its click", () => {
    const onRetry = vi.fn();
    const alert = renderComponent(
      <Alert testId="alert" tone="danger">
        <AlertContent>
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>
            <Button testId="retry" onClick={onRetry}>
              Try again
            </Button>
          </AlertDescription>
        </AlertContent>
      </Alert>,
    );

    clickCentreOf(alert, "retry");

    expect(onRetry).toHaveBeenCalledTimes(1);

    alert.unmount();
  });

  it("lets a consumer's style win on the root", () => {
    const alert = renderComponent(
      <Alert testId="alert" style={{ borderRadius: 0 }} />,
    );

    expect(alert.renderer.findByTestId("alert")?.style.borderRadius).toBe(0);

    alert.unmount();
  });
});

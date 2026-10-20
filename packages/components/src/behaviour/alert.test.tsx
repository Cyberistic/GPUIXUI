/**
 * Alert behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a tone that does not tint the surface; a title that does
 * not take the tone's readable colour; a description that inherits that colour
 * and becomes unreadable; a dismiss control that renders without `onDismiss`,
 * cannot be reached and fired by keyboard, or fires twice; a lost alert role; a
 * description that swallows the click of the action inside it; a part that
 * silently renders outside its root with the default tone; and a dismiss
 * control whose handle discards the caller's `testId` (plan 675).
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

    expect(alert.renderer.findByType("svg")).toHaveLength(1);

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

  /**
   * The bug these guard (plan 675): `AlertDismiss` hard-coded its testId after
   * `...rest`, so a caller's `testId` — part of the GPUix host props — was
   * silently discarded and two alerts on a screen shared one handle. The
   * shipped default stays `alert-dismiss`.
   */
  it("keeps the caller's testId on its dismiss control", () => {
    const onDismiss = vi.fn();
    const alert = renderComponent(
      <Alert testId="alert">
        <AlertDismiss testId="close-notice" onDismiss={onDismiss} />
      </Alert>,
    );

    const dismiss = alert.renderer.findByTestId("close-notice");
    expect(dismiss).toBeDefined();
    if (dismiss === undefined) return;

    alert.renderer.focusElement(dismiss.id);
    alert.renderer.simulateKeystrokes("enter");

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(alert.renderer.findByTestId("alert-dismiss")).toBeUndefined();

    alert.unmount();
  });

  it("gives two alerts' dismiss controls distinct handles", () => {
    const first = vi.fn();
    const second = vi.fn();
    const alerts = renderComponent(
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Alert testId="first">
          <AlertDismiss onDismiss={first} />
        </Alert>
        <Alert testId="second">
          <AlertDismiss testId="second-dismiss" onDismiss={second} />
        </Alert>
      </div>,
    );

    const dismiss = alerts.renderer.findByTestId("second-dismiss");
    expect(dismiss).toBeDefined();
    expect(alerts.renderer.findByTestId("alert-dismiss")).toBeDefined();
    if (dismiss === undefined) return;

    alerts.renderer.focusElement(dismiss.id);
    alerts.renderer.simulateKeystrokes("enter");

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    alerts.unmount();
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

  it("composes the caller's click with the dismiss handler", () => {
    const onDismiss = vi.fn();
    const onClick = vi.fn();
    const alert = renderComponent(
      <Alert testId="alert">
        <AlertDismiss onDismiss={onDismiss} onClick={onClick} />
      </Alert>,
    );

    clickCentreOf(alert, "alert-dismiss");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    alert.unmount();
  });

  /**
   * The bug these guard (plan 788): 0.10.0 does not lift a `div`'s contents into
   * its accessible name, so every `role="alert"` region — the one thing a screen
   * reader announces — was unnamed while its title sat beside it as loose text.
   */
  it("names the region from its title", () => {
    const alert = renderComponent(
      <Alert testId="alert">
        <AlertContent>
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>Try another card.</AlertDescription>
        </AlertContent>
      </Alert>,
    );

    expect(
      nodesWithRole(alert.renderer, "alert").map((node) => node.name),
    ).toEqual(["Payment failed"]);

    alert.unmount();
  });

  it("names an untitled region from its description", () => {
    const alert = renderComponent(
      <Alert testId="alert">
        <AlertDescription>Saved to the workspace.</AlertDescription>
      </Alert>,
    );

    expect(
      nodesWithRole(alert.renderer, "alert").map((node) => node.name),
    ).toEqual(["Saved to the workspace."]);

    alert.unmount();
  });

  it("follows a renamed title and falls back when the title is removed", () => {
    const alert = renderComponent(
      <Alert testId="alert">
        <AlertTitle>Syncing</AlertTitle>
        <AlertDescription>Two files remain.</AlertDescription>
      </Alert>,
    );

    alert.rerender(
      <Alert testId="alert">
        <AlertTitle>Sync paused</AlertTitle>
        <AlertDescription>Two files remain.</AlertDescription>
      </Alert>,
    );
    expect(
      nodesWithRole(alert.renderer, "alert").map((node) => node.name),
    ).toEqual(["Sync paused"]);

    alert.rerender(
      <Alert testId="alert">
        <AlertDescription>Two files remain.</AlertDescription>
      </Alert>,
    );
    expect(
      nodesWithRole(alert.renderer, "alert").map((node) => node.name),
    ).toEqual(["Two files remain."]);

    alert.unmount();
  });

  it("keeps a caller's aria-label over the computed name", () => {
    const alert = renderComponent(
      <Alert testId="alert" aria-label="Card declined">
        <AlertTitle>Payment failed</AlertTitle>
      </Alert>,
    );

    expect(
      nodesWithRole(alert.renderer, "alert").map((node) => node.name),
    ).toEqual(["Card declined"]);

    alert.unmount();
  });
});

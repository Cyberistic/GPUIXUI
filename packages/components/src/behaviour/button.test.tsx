/**
 * `Button` and `IconButton` behaviour, in the real GPUix renderer.
 *
 * These two are this package's stand-in for `@gpuixui/primitives` (plan 110 §7),
 * so every later overlay inherits their correctness. The bugs these guard: a
 * click that fires twice (once from the pointer, once from a synthesised key); a
 * disabled control that still runs its handler or still takes a tab stop; a
 * keyboard activation that works for Enter but not Space; and an icon-only
 * control with no accessible name.
 */

import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { Button, IconButton } from "../internal/button.js";
import { clickCentreOf, sizeOf } from "../internal/interaction.js";
import { controlHeight, darkTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";

describe("Button", () => {
  it("runs its handler once per click", () => {
    const onClick = vi.fn();
    const button = renderComponent(
      <Button testId="button" onClick={onClick}>
        Save
      </Button>,
    );

    clickCentreOf(button, "button");

    expect(onClick).toHaveBeenCalledTimes(1);

    button.unmount();
  });

  it("activates from the keyboard with Enter and with Space", () => {
    const onClick = vi.fn();
    const button = renderComponent(
      <Button testId="button" onClick={onClick}>
        Save
      </Button>,
    );

    const element = button.renderer.findByTestId("button");
    expect(element).toBeDefined();
    if (element === undefined) return;

    button.renderer.nativeSimulateKeyDown(element.id, "enter");
    expect(onClick).toHaveBeenCalledTimes(1);

    button.renderer.nativeSimulateKeyDown(element.id, "space");
    expect(onClick).toHaveBeenCalledTimes(2);

    button.unmount();
  });

  it("ignores pointer and keyboard input while disabled", () => {
    const onClick = vi.fn();
    const button = renderComponent(
      <Button testId="button" disabled onClick={onClick}>
        Save
      </Button>,
    );

    const element = button.renderer.findByTestId("button");
    expect(element).toBeDefined();
    if (element === undefined) return;

    clickCentreOf(button, "button");
    button.renderer.nativeSimulateKeyDown(element.id, "enter");

    expect(onClick).not.toHaveBeenCalled();
    expect(button.renderer.findByTestId("button")?.style.opacity).toBe(0.5);

    button.unmount();
  });

  it("is a button that a tab stop can reach", () => {
    const button = renderComponent(<Button testId="button">Save</Button>);

    expect(button.renderer.findByTestId("button")?.customProps?.role).toBe(
      "button",
    );
    expect(button.renderer.findByTestId("button")?.customProps?.tabIndex).toBe(
      0,
    );

    button.unmount();
  });

  it("takes its height from the theme's density", () => {
    const button = renderComponent(<Button testId="button">Save</Button>);

    expect(
      Option.map(sizeOf(button, "button"), ({ height }) => height),
    ).toEqual(Option.some(controlHeight(darkTheme, "md")));

    button.unmount();
  });

  it("lets a consumer's style win", () => {
    const button = renderComponent(
      <Button testId="button" variant="primary" style={{ height: 48 }}>
        Save
      </Button>,
    );

    expect(button.renderer.findByTestId("button")?.style.height).toBe(48);

    button.unmount();
  });
});

describe("IconButton", () => {
  it("is square and carries its accessible name", () => {
    const button = renderComponent(
      <IconButton testId="icon-button" label="Close">
        ✕
      </IconButton>,
    );

    expect(sizeOf(button, "icon-button")).toEqual(
      Option.some({
        // Square: the density's control height on both axes.
        width: controlHeight(darkTheme, "md"),
        height: controlHeight(darkTheme, "md"),
      }),
    );
    expect(
      nodesWithRole(button.renderer, "button").map((node) => node.name),
    ).toEqual(["Close"]);

    button.unmount();
  });

  it("paints its icon from the muted foreground role", () => {
    const button = renderComponent(
      <IconButton testId="icon-button" label="Close">
        ✕
      </IconButton>,
    );

    expect(button.renderer.findByTestId("icon-button")?.style.color).toBe(
      darkTheme.colors.mutedForeground,
    );

    button.unmount();
  });

  it("runs its handler when clicked", () => {
    const onClick = vi.fn();
    const button = renderComponent(
      <IconButton testId="icon-button" label="Close" onClick={onClick}>
        ✕
      </IconButton>,
    );

    clickCentreOf(button, "icon-button");

    expect(onClick).toHaveBeenCalledTimes(1);

    button.unmount();
  });
});

/**
 * `Button` and `IconButton` behaviour, in the real GPUix renderer.
 *
 * These two are this package's stand-in for `@gpuixui/primitives` (plan 110 §7),
 * so every later overlay inherits their correctness. The bugs these guard: a
 * click that fires twice (once from the pointer, once from a synthesised key); a
 * disabled control that still runs its handler or still takes a tab stop; a
 * keyboard activation that works for Enter but not Space; Space firing on key
 * down so it cannot be cancelled before release; a held Enter activating once
 * per repeat; a caller `onKeyUp` being dropped; and an icon-only control with no
 * accessible name.
 */

import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { Button, IconButton } from "../internal/button.js";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
  sizeOf,
  until,
} from "../internal/interaction.js";
import { FOCUS_SAMPLE_MS } from "../internal/native-focus.js";
import { controlHeight, darkTheme, focusRing } from "../internal/theme.js";
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

  it("keeps the caller's pointer handlers outside a hover group", () => {
    // `Button` joins a List row's hover group when there is one; a control
    // rendered anywhere else must not lose the handlers its caller passed.
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const button = renderComponent(
      <Button
        testId="button"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        Save
      </Button>,
    );

    hoverCentreOf(button, "button");
    expect(onMouseEnter).toHaveBeenCalledTimes(1);

    const bounds = requireBounds(button, "button");
    button.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width + 200,
      bounds.y + bounds.height + 200,
    );
    expect(onMouseLeave).toHaveBeenCalledTimes(1);

    button.unmount();
  });

  it("activates Enter on key down and Space on release", () => {
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
    expect(onClick).toHaveBeenCalledTimes(1);

    button.renderer.nativeSimulateKeyUp(element.id, "space");
    expect(onClick).toHaveBeenCalledTimes(2);

    button.unmount();
  });

  it("does not activate again while Enter repeats", () => {
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
    button.renderer.nativeSimulateKeyDown(element.id, "enter", true);

    expect(onClick).toHaveBeenCalledTimes(1);

    button.unmount();
  });

  it("composes a caller onKeyUp with its own activation", () => {
    const onClick = vi.fn();
    const onKeyUp = vi.fn();
    const button = renderComponent(
      <Button testId="button" onClick={onClick} onKeyUp={onKeyUp}>
        Save
      </Button>,
    );

    const element = button.renderer.findByTestId("button");
    expect(element).toBeDefined();
    if (element === undefined) return;

    button.renderer.nativeSimulateKeyUp(element.id, "space");

    expect(onKeyUp).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);

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

  it("carries no hover or press fill while disabled", () => {
    // A control that cannot be pressed must not light up under the pointer: the
    // variant's hover/active diffs have to be cleared, not merely muted
    // (plan 394).
    const pair = renderComponent(
      <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
        <Button testId="disabled" variant="primary" disabled>
          Save
        </Button>
        <Button testId="enabled" variant="primary">
          Save
        </Button>
      </div>,
    );

    const disabled = pair.renderer.findByTestId("disabled")?.style;
    const enabled = pair.renderer.findByTestId("enabled")?.style;

    expect(disabled?.hover).toBeUndefined();
    expect(disabled?.active).toBeUndefined();
    expect(enabled?.hover).toBeDefined();

    pair.unmount();
  });

  it("strips a caller's interaction style while disabled", () => {
    // A wrapper's own hover must not survive the merge on an inert control
    // (plan 691).
    const pair = renderComponent(
      <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
        <Button
          testId="disabled"
          disabled
          style={{
            hover: { backgroundColor: darkTheme.colors.accent },
            active: { backgroundColor: darkTheme.colors.active },
          }}
        >
          Save
        </Button>
        <Button
          testId="enabled"
          style={{
            hover: { backgroundColor: darkTheme.colors.accent },
            active: { backgroundColor: darkTheme.colors.active },
          }}
        >
          Save
        </Button>
      </div>,
    );

    const disabled = pair.renderer.findByTestId("disabled")?.style;
    const enabled = pair.renderer.findByTestId("enabled")?.style;

    expect(disabled?.hover).toBeUndefined();
    expect(disabled?.active).toBeUndefined();
    expect(enabled?.hover).toBeDefined();
    expect(enabled?.active).toBeDefined();

    pair.unmount();
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

  /**
   * Native focus (plan 752). The bug this guards, measured: `focusElement` and a
   * real click both left the focused host on a button painting no ring, because
   * the ring came from React `onFocus` alone and 0.10.0 delivers no React event
   * for a native focus move (plans 536/540).
   */
  it("paints the ring when native focus arrives and gives it up when it leaves", async () => {
    const button = renderComponent(
      <div>
        <Button testId="first">One</Button>
        <Button testId="second">Two</Button>
      </div>,
    );

    button.renderer.focusElement(
      button.renderer.findByTestId("first")?.id ?? -1,
    );
    await until(
      () =>
        button.renderer.findByTestId("first")?.style.boxShadow !== undefined,
    );

    expect(focusedTestId(button)).toEqual(Option.some("first"));
    expect(button.renderer.findByTestId("first")?.style.boxShadow).toEqual(
      focusRing(darkTheme).boxShadow,
    );

    button.renderer.focusElement(
      button.renderer.findByTestId("second")?.id ?? -1,
    );
    await until(
      () =>
        button.renderer.findByTestId("second")?.style.boxShadow !== undefined,
    );

    expect(focusedTestId(button)).toEqual(Option.some("second"));
    expect(
      button.renderer.findByTestId("first")?.style.boxShadow,
    ).toBeUndefined();

    button.unmount();
  });

  it("paints no ring on a disabled button that holds native focus", async () => {
    const button = renderComponent(
      <Button testId="disabled" disabled>
        Save
      </Button>,
    );

    button.renderer.focusElement(
      button.renderer.findByTestId("disabled")?.id ?? -1,
    );
    await new Promise((resolve) => setTimeout(resolve, FOCUS_SAMPLE_MS + 20));

    expect(focusedTestId(button)).toEqual(Option.some("disabled"));
    expect(
      button.renderer.findByTestId("disabled")?.style.boxShadow,
    ).toBeUndefined();

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

  it("reflects autoFocus in its focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the ring and the state have to start truthful (plan 388).
    const button = renderComponent(
      <Button testId="button" autoFocus>
        Save
      </Button>,
    );

    expect(focusedTestId(button)).toEqual(Option.some("button"));
    expect(
      button.renderer.findByTestId("button")?.style.boxShadow,
    ).toBeDefined();
    button.unmount();

    const disabled = renderComponent(
      <Button testId="disabled" autoFocus disabled>
        Save
      </Button>,
    );

    expect(
      disabled.renderer.findByTestId("disabled")?.style.boxShadow,
    ).toBeUndefined();
    disabled.unmount();

    const icon = renderComponent(
      <IconButton testId="icon" label="Close" autoFocus>
        ✕
      </IconButton>,
    );

    expect(focusedTestId(icon)).toEqual(Option.some("icon"));
    expect(icon.renderer.findByTestId("icon")?.style.boxShadow).toBeDefined();
    icon.unmount();
  });
});

/**
 * `Button` and `IconButton` behaviour, in the real GPUix renderer.
 *
 * These two are this package's stand-in for `@gpuixui/primitives` (plan 110 §7),
 * so every later overlay inherits their correctness. The bugs these guard: a
 * click that fires twice (once from the pointer, once from a synthesised key); a
 * disabled control that still runs its handler or still takes a tab stop; a
 * keyboard activation that works for Enter but not Space; a **held** key that
 * re-ran the activation on every repeat, so holding Enter on a focused row ran
 * its action more than once; an icon-only
 * control with no accessible name; a filled action whose hover was a
 * half-alpha fill, so the same button read two colours on two surfaces; and an
 * outlined action that drew its edge in the decorative `border` role — the same
 * value as the fill it outlined — so the control had no outline at all.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  contrastFloors,
  contrastRatio,
  disabledAction,
  disabledOpacity,
  keyboardDimFailures,
} from "@gpuixui/tokens";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { Button, IconButton } from "../internal/button.js";
import {
  clickCentreOf,
  hoverCentreOf,
  sizeOf,
} from "../internal/interaction.js";
import {
  alpha,
  controlHeight,
  darkTheme,
  filledHover,
  filledPressed,
  lightTheme,
} from "../internal/theme.js";
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

    // Space activates on the release, the way a platform button does: the press
    // starts the gesture and the release finishes it.
    button.renderer.nativeSimulateKeyDown(element.id, "space");
    expect(onClick).toHaveBeenCalledTimes(1);
    button.renderer.nativeSimulateKeyUp(element.id, "space");
    expect(onClick).toHaveBeenCalledTimes(2);

    button.unmount();
  });

  it("activates once per keypress while Enter or Space is held", () => {
    const onClick = vi.fn();
    const button = renderComponent(
      <Button testId="button" onClick={onClick}>
        Save
      </Button>,
    );

    const element = button.renderer.findByTestId("button");
    expect(element).toBeDefined();
    if (element === undefined) return;

    // The platform sends key-down again, with `isHeld`, while a key is held.
    button.renderer.nativeSimulateKeyDown(element.id, "enter");
    button.renderer.nativeSimulateKeyDown(element.id, "enter", true);
    expect(onClick).toHaveBeenCalledTimes(1);

    button.renderer.nativeSimulateKeyDown(element.id, "space");
    button.renderer.nativeSimulateKeyDown(element.id, "space", true);
    expect(onClick).toHaveBeenCalledTimes(1);
    button.renderer.nativeSimulateKeyUp(element.id, "space");
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
    // The default variant is filled, so it wears the neutral pair rather than a
    // fade — see `paints a disabled filled action with the measured pair`.
    expect(
      button.renderer.findByTestId("button")?.style.opacity,
    ).toBeUndefined();

    button.unmount();
  });

  it("paints a disabled filled action with the measured pair, not a fade", () => {
    // The bug: every disabled action faded itself to 50%. A fade composites the
    // label into the strip behind the control, so the same disabled primary read
    // a different colour on a page and a card — and on the card of four shipped
    // light styles the pair landed at 1.47:1–1.49:1, under the disabled floor
    // (`disabled.test.ts` in `@gpuixui/tokens` measures that premise). A filled
    // action now wears the neutral pair the contrast contract measures on every
    // surface a control can sit on.
    Arr.forEach(
      [
        ["primary", "dark"],
        ["primary", "light"],
        ["secondary", "dark"],
        ["secondary", "light"],
        ["danger", "dark"],
        ["danger", "light"],
      ] as const,
      ([variant, mode]) => {
        const theme = mode === "light" ? lightTheme : darkTheme;
        const paint = disabledAction(theme);
        const button = renderComponent(
          <Button testId="button" variant={variant} disabled>
            Save
          </Button>,
          mode,
        );

        const style = button.renderer.findByTestId("button")?.style;
        expect(style?.backgroundColor, `${variant} ${mode}`).toBe(
          paint.backgroundColor,
        );
        expect(style?.color, `${variant} ${mode}`).toBe(paint.color);
        expect(style?.opacity, `${variant} ${mode}`).toBeUndefined();
        expect(
          contrastRatio(paint.color, paint.backgroundColor) ?? 0,
        ).toBeGreaterThanOrEqual(contrastFloors.disabled);

        button.unmount();
      },
    );
  });

  it("keeps the measured fade on a disabled ghost action", () => {
    // An unfilled action has no fill to collapse into: the dim is the surface
    // behind it, and the tokens' `disabledFadeFailures` measures that composite.
    // This is the negative control for the pair above.
    const button = renderComponent(
      <Button testId="button" variant="ghost" disabled>
        Cancel
      </Button>,
    );

    hoverCentreOf(button, "button");

    const style = button.renderer.findByTestId("button")?.style;
    expect(style?.opacity).toBe(disabledOpacity);
    // The dim is the whole state: there is no fill to move under the pointer.
    expect(style?.hover).not.toMatchObject({
      backgroundColor: disabledAction(darkTheme).backgroundColor,
    });
    expect(style?.active).not.toMatchObject({
      backgroundColor: disabledAction(darkTheme).backgroundColor,
    });

    button.unmount();
  });

  it("does not repaint a disabled action under the pointer", () => {
    // A disabled control that tints on hover still answers the pointer, so the
    // reader is told the control is live. A filled action's hover and press are
    // the resting fill; a ghost's are absent (the case below).
    const resting = {
      backgroundColor: disabledAction(darkTheme).backgroundColor,
    };

    Arr.forEach(["primary", "secondary", "danger"] as const, (variant) => {
      const button = renderComponent(
        <Button testId="button" variant={variant} disabled>
          Save
        </Button>,
      );

      hoverCentreOf(button, "button");

      const style = button.renderer.findByTestId("button")?.style;
      expect(style?.hover, variant).toMatchObject(resting);
      expect(style?.active, variant).toMatchObject(resting);

      button.unmount();
    });
  });

  it("still answers the pointer on an enabled action", () => {
    // The control for the case above: the live control keeps its feedback.
    const button = renderComponent(
      <Button testId="button" variant="primary">
        Save
      </Button>,
    );

    hoverCentreOf(button, "button");

    expect(button.renderer.findByTestId("button")?.style.hover).toMatchObject({
      backgroundColor: filledHover(darkTheme, "primary"),
    });

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

  it("paints an opaque derived hover and press on a filled action", () => {
    Arr.forEach(
      [
        ["primary", "primary"],
        ["danger", "destructive"],
      ] as const,
      ([variant, action]) => {
        const button = renderComponent(
          <Button testId="button" variant={variant}>
            Save
          </Button>,
        );

        hoverCentreOf(button, "button");

        const style = button.renderer.findByTestId("button")?.style;
        expect(style?.hover).toMatchObject({
          backgroundColor: filledHover(darkTheme, action),
        });
        expect(style?.active).toMatchObject({
          backgroundColor: filledPressed(darkTheme, action),
        });
        // The half-alpha fill let the surface through and depended on it.
        expect(style?.hover).not.toMatchObject({
          backgroundColor: alpha(darkTheme.colors[action], 0.5),
        });

        button.unmount();
      },
    );
  });

  it("keeps the measured hover roles on a secondary action", () => {
    const button = renderComponent(
      <Button testId="button" variant="secondary">
        Save
      </Button>,
    );

    hoverCentreOf(button, "button");

    expect(button.renderer.findByTestId("button")?.style.hover).toMatchObject({
      backgroundColor: darkTheme.colors.hover,
    });
    expect(button.renderer.findByTestId("button")?.style.active).toMatchObject({
      backgroundColor: darkTheme.colors.active,
    });

    button.unmount();
  });

  it("keeps a filled action's label while another control holds keyboard focus", () => {
    Arr.forEach(
      [
        ["primary", "primary", "primaryForeground"],
        ["danger", "destructive", "destructiveForeground"],
        ["secondary", "secondary", "secondaryForeground"],
      ] as const,
      ([variant, fill, label]) => {
        Arr.forEach(
          [
            ["dark", darkTheme],
            ["light", lightTheme],
          ] as const,
          ([mode, theme]) => {
            // The mechanism: the runtime keeps 40% of every other focusable
            // element, which composites this label into its own fill.
            const dimmed = Arr.filter(
              keyboardDimFailures(theme, contrastFloors.secondary),
              (failure) => failure.fill === fill && failure.label === label,
            );
            expect(Arr.length(dimmed)).toBeGreaterThan(0);
            Arr.forEach(dimmed, (failure) => {
              expect(failure.ratio ?? 1).toBeLessThan(contrastFloors.secondary);
            });

            // The pair this opts out of is the one the design holds to 4.5:1.
            expect(
              contrastRatio(theme.colors[label], theme.colors[fill]) ?? 0,
            ).toBeGreaterThanOrEqual(contrastFloors.secondary);

            const button = renderComponent(
              <Button testId="button" variant={variant}>
                Save
              </Button>,
              mode,
            );

            expect(
              button.renderer.findByTestId("button")?.style.keyboardFocusDim,
            ).toBe(false);

            button.unmount();
          },
        );
      },
    );
  });

  it("leaves the dim on an action with no fill to collapse into", () => {
    const button = renderComponent(
      <Button testId="button" variant="ghost">
        Cancel
      </Button>,
    );

    expect(
      button.renderer.findByTestId("button")?.style.keyboardFocusDim,
    ).toBeUndefined();

    button.unmount();
  });

  it("lets a consumer put the dim back on a filled action", () => {
    const button = renderComponent(
      <Button
        testId="button"
        variant="primary"
        style={{ keyboardFocusDim: true }}
      >
        Save
      </Button>,
    );

    expect(button.renderer.findByTestId("button")?.style.keyboardFocusDim).toBe(
      true,
    );

    button.unmount();
  });

  it("draws an outlined action's edge in the measured boundary role", () => {
    Arr.forEach(
      [
        ["dark", darkTheme],
        ["light", lightTheme],
      ] as const,
      ([mode, theme]) => {
        const button = renderComponent(
          <Button testId="button" variant="secondary">
            Save
          </Button>,
          mode,
        );

        expect(button.renderer.findByTestId("button")?.style.borderColor).toBe(
          theme.colors.borderStrong,
        );

        // The decorative role this replaced sits under the boundary floor on
        // the fill it outlines; in the dark theme it is that fill's own value,
        // so the outline was not painted at all.
        const decorative = contrastRatio(
          theme.colors.border,
          theme.colors.secondary,
        );
        expect(decorative ?? Infinity).toBeLessThan(contrastFloors.boundary);

        // A control's edge is measured on every strip an outline button sits on.
        Arr.forEach(
          ["background", "card", "muted", "secondary"] as const,
          (surface) => {
            const ratio = contrastRatio(
              theme.colors.borderStrong,
              theme.colors[surface],
            );
            expect(ratio ?? 0).toBeGreaterThanOrEqual(contrastFloors.boundary);
          },
        );

        button.unmount();
      },
    );
  });

  it("paints every variant's label in the role its own fill carries", () => {
    // A glyph inside the action takes this same role, so the pair is stated
    // once: a chevron is the label drawn in vectors, not a second colour.
    Arr.forEach(
      [
        ["primary", "primaryForeground"],
        ["danger", "destructiveForeground"],
        ["secondary", "secondaryForeground"],
        ["ghost", "foreground"],
      ] as const,
      ([variant, role]) => {
        Arr.forEach(
          [
            ["dark", darkTheme],
            ["light", lightTheme],
          ] as const,
          ([mode, theme]) => {
            const button = renderComponent(
              <Button testId="button" variant={variant}>
                Save
              </Button>,
              mode,
            );

            expect(button.renderer.findByTestId("button")?.style.color).toBe(
              theme.colors[role],
            );

            button.unmount();
          },
        );
      },
    );
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

  it("keeps the keyboard dim on a ghost icon control", () => {
    // The opt-out belongs to a filled action, whose label collapses into its
    // own fill. An icon control paints no fill, so it keeps the cue.
    const button = renderComponent(
      <IconButton testId="icon-button" label="Close">
        ✕
      </IconButton>,
    );

    expect(
      button.renderer.findByTestId("icon-button")?.style.keyboardFocusDim,
    ).toBeUndefined();

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

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import {
  actionFeedbackFailures,
  contrastFloors,
  contrastRatio,
  disabledAction,
  disabledOpacity,
  keyboardDimFailures,
} from "@gpuixui/tokens";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { Button, IconButton, type ButtonVariant } from "../internal/button.js";
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

    expect(
      button.renderer.findByTestId("button")?.style.opacity,
    ).toBeUndefined();

    button.unmount();
  });

  it("keeps its label and swaps the leading icon for the spinner while loading", () => {
    const onClick = vi.fn();
    const button = renderComponent(
      <Button
        testId="button"
        loading
        leading={
          <Icon
            name="save"
            size="sm"
            color={lightTheme.colors.foreground}
            label="Save"
          />
        }
        onClick={onClick}
      >
        Save changes
      </Button>,
      "light",
    );

    try {
      expect(button.renderer.getAllText()).toContain("Save changes");

      expect(button.renderer.findByType("svg")).toHaveLength(0);
      expect(
        nodesWithRole(button.renderer, "status").map((node) => node.name),
      ).toEqual(["Loading"]);

      clickCentreOf(button, "button");
      expect(onClick).not.toHaveBeenCalled();
      expect(
        button.renderer.findByTestId("button")?.customProps?.tabIndex,
      ).toBe(0);
    } finally {
      button.unmount();
    }
  });

  it("paints a disabled filled action with the measured pair, not a fade", () => {
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
    const button = renderComponent(
      <Button testId="button" variant="ghost" disabled>
        Cancel
      </Button>,
    );

    hoverCentreOf(button, "button");

    const style = button.renderer.findByTestId("button")?.style;
    expect(style?.opacity).toBe(disabledOpacity);

    expect(style?.hover).not.toMatchObject({
      backgroundColor: disabledAction(darkTheme).backgroundColor,
    });
    expect(style?.active).not.toMatchObject({
      backgroundColor: disabledAction(darkTheme).backgroundColor,
    });

    button.unmount();
  });

  it("does not repaint a disabled action under the pointer", () => {
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

        expect(style?.hover).not.toMatchObject({
          backgroundColor: alpha(darkTheme.colors[action], 0.5),
        });

        button.unmount();
      },
    );
  });

  it("keeps the measured wash on an action with no fill", () => {
    const button = renderComponent(
      <Button testId="button" variant="ghost">
        Cancel
      </Button>,
    );

    hoverCentreOf(button, "button");

    const style = button.renderer.findByTestId("button")?.style;

    button.unmount();

    expect(style?.backgroundColor).toBeUndefined();
    expect(style?.hover).toMatchObject({
      backgroundColor: darkTheme.colors.hover,
    });
    expect(style?.active).toMatchObject({
      backgroundColor: darkTheme.colors.active,
    });
  });

  it("paints a secondary action's pointer step in a fill that changes", () => {
    Arr.forEach(
      [
        ["light", lightTheme],
        ["dark", darkTheme],
      ] as const,
      ([mode, theme]) => {
        const button = renderComponent(
          <Button testId="button" variant="secondary">
            Save
          </Button>,
          mode,
        );

        hoverCentreOf(button, "button");

        const style = button.renderer.findByTestId("button")?.style;

        button.unmount();

        expect(style?.hover, mode).toMatchObject({
          backgroundColor: filledHover(theme, "secondary"),
        });
        expect(style?.active, mode).toMatchObject({
          backgroundColor: filledPressed(theme, "secondary"),
        });
        expect(style?.hover, mode).not.toMatchObject({
          backgroundColor: theme.colors.hover,
        });

        expect(
          Arr.filter(
            actionFeedbackFailures(theme),
            ({ role }) => role === "secondary",
          ),
          mode,
        ).toEqual([]);
      },
    );
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
            const dimmed = Arr.filter(
              keyboardDimFailures(theme, contrastFloors.secondary),
              (failure) => failure.fill === fill && failure.label === label,
            );
            expect(Arr.length(dimmed)).toBeGreaterThan(0);
            Arr.forEach(dimmed, (failure) => {
              expect(failure.ratio ?? 1).toBeLessThan(contrastFloors.secondary);
            });

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

        const decorative = contrastRatio(
          theme.colors.border,
          theme.colors.secondary,
        );
        expect(decorative ?? Infinity).toBeLessThan(contrastFloors.boundary);

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

  it("paints the documented default for a stored variant name it does not ship", () => {
    // @ts-expect-error — a variant a store wrote, not the union the props declare.
    const stored: ButtonVariant = "tertiary";
    const onClick = vi.fn();

    const button = renderComponent(
      <Button testId="button" variant={stored} onClick={onClick}>
        Save
      </Button>,
    );

    const element = button.renderer.findByTestId("button");
    expect(element?.style.color).toBe(darkTheme.colors.secondaryForeground);
    expect(element?.style.borderColor).toBe(darkTheme.colors.borderStrong);

    clickCentreOf(button, "button");
    expect(onClick).toHaveBeenCalledTimes(1);

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

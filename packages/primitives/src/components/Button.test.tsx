import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  blend,
  brandText,
  brandTextSurfaces,
  contrastFloors,
  contrastFloorsFor,
  contrastRatio,
  darkTheme,
  decorativeFloor,
  disabledAction,
  disabledOpacity,
  filledHover,
  filledPressed,
  highContrastDarkTheme,
  highContrastLightTheme,
  keyboardDimFailures,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import { testTheme } from "../core/testing/theme.fixture.js";
import type { ControlSize } from "../core/theme.js";
import { renderButton, type ButtonState } from "./Button.js";
import {
  actionOnColor,
  buttonVariants,
  BUTTON_VARIANTS,
  type ButtonVariant,
} from "../core/variants.js";
import { keyEvent, keyUpEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
  hostStyleRecord,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

const press = (
  element: ReactElement,
  key: string,
  phase: "down" | "up",
  held = false,
): void => {
  const handler = expectSome(
    hostHandler(element, phase === "down" ? "onKeyDown" : "onKeyUp"),
  );
  handler(keyEvent(key, held ? { isHeld: true } : {}));
};

const resting = (props: Parameters<typeof renderButton>[0]): ReactElement =>
  renderButton(props, testTheme, { focused: false });

describe("Button", () => {
  it("paints a size name the scale does not carry as the default size", () => {
    const stored = resting({ size: "xl" as ControlSize, children: "Save" });
    const fallback = resting({ size: "md", children: "Save" });
    expect(expectSome(hostStyleRecord(stored))).toEqual(
      expectSome(hostStyleRecord(fallback)),
    );
    expect(expectSome(hostStyle(stored, "height"))).toBe(
      testTheme.density.controlHeight.md,
    );
  });

  it("paints a variant name the table does not carry as the default action", () => {
    const stored = resting({
      variant: "brand" as ButtonVariant,
      children: "Save",
    });
    const fallback = resting({ variant: "primary", children: "Save" });
    expect(expectSome(hostStyleRecord(stored))).toEqual(
      expectSome(hostStyleRecord(fallback)),
    );
    expect(expectSome(hostStyle(stored, "backgroundColor"))).toBe(
      testTheme.colors.primary,
    );
  });

  it("activates on Enter key down, never on key up", () => {
    const onActivate = vi.fn();
    const element = resting({ onActivate });
    press(element, "enter", "down");
    press(element, "enter", "up");
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("activates on Space key up, never on key down", () => {
    const onActivate = vi.fn();
    const element = resting({ onActivate });
    press(element, "space", "down");
    expect(onActivate).toHaveBeenCalledTimes(0);
    press(element, "space", "up");
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("ignores a repeating key", () => {
    const onActivate = vi.fn();
    press(resting({ onActivate }), "enter", "down", true);
    expect(onActivate).toHaveBeenCalledTimes(0);
  });

  it("hands the activation the event that caused it", () => {
    const onActivate = vi.fn();
    const element = resting({ onActivate });
    const click = {
      elementId: 7,
      eventType: "click",
      x: 12,
      y: 34,
      button: 0,
    } as const;
    expectSome(hostHandler(element, "onClick"))(click);
    expect(onActivate).toHaveBeenLastCalledWith(click);
    expect(onActivate).toHaveBeenCalledTimes(1);

    const enter = keyEvent("enter");
    expectSome(hostHandler(element, "onKeyDown"))(enter);
    expect(onActivate).toHaveBeenLastCalledWith(enter);

    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("space"));
    expect(onActivate).toHaveBeenCalledTimes(2);
    const space = keyUpEvent("space");
    expectSome(hostHandler(element, "onKeyUp"))(space);
    expect(onActivate).toHaveBeenLastCalledWith(space);
    expect(onActivate).toHaveBeenCalledTimes(3);
  });

  it("reaches the action from a key and never the caller's press", () => {
    const onActivate = vi.fn();
    const onClick = vi.fn();
    const element = resting({ onActivate, onClick });

    press(element, "enter", "down");
    press(element, "space", "down");
    press(element, "space", "up");

    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is a named button the runtime can hit-test", () => {
    const element = resting({ children: "Save changes" });
    expect(expectSome(hostTag(element))).toBe("div");
    expect(expectSome(hostProp(element, "role"))).toBe("button");
  });

  it("publishes its plain text child as the name", () => {
    expect(
      expectSome(hostProp(resting({ children: "Save" }), "aria-label")),
    ).toBe("Save");
  });

  it("prefers an explicit label and omits a blank one", () => {
    expect(
      expectSome(
        hostProp(
          resting({ label: "Save file", children: "Save" }),
          "aria-label",
        ),
      ),
    ).toBe("Save file");
    expect(
      hostProp(resting({ label: "", children: "Save" }), "aria-label"),
    ).toStrictEqual(Option.some("Save"));
    expect(
      hostProp(resting({ label: "   ", children: "Save" }), "aria-label"),
    ).toStrictEqual(Option.some("Save"));
  });

  it("draws an outlined action's edge in the measured boundary role", () => {
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      const element = renderButton(
        { variant: "outline", children: "Cancel" },
        theme,
        { focused: false },
      );
      const edge = expectSome(hostStyleString(element, "borderColor"));
      expect(edge).toBe(theme.colors.borderStrong);
      Arr.forEach(
        ["background", "card", "popover", "muted", "secondary"] as const,
        (surface) => {
          expect(
            contrastRatio(edge, theme.colors[surface]) ?? 0,
          ).toBeGreaterThanOrEqual(contrastFloors.boundary);
        },
      );

      expect(
        contrastRatio(theme.colors.border, theme.colors.background) ?? Infinity,
      ).toBeLessThan(contrastFloors.boundary);
    });
  });

  it("gives the secondary action an edge a row's wash cannot swallow", () => {
    const styled: ReadonlyArray<readonly [string, Theme]> = [
      [lightTheme.name, lightTheme],
      [darkTheme.name, darkTheme],
      [highContrastLightTheme.name, highContrastLightTheme],
      [highContrastDarkTheme.name, highContrastDarkTheme],
      ...Arr.flatMap(platformNames, (platform) =>
        Arr.map(
          ["light", "dark"] as const,
          (mode) =>
            [
              `${mode} ${platform}`,
              platformTheme(themes[mode], platform),
            ] as const,
        ),
      ),
      ...Arr.flatMap(retroNames, (retro) =>
        Arr.map(
          ["light", "dark"] as const,
          (mode) =>
            [`${mode} ${retro}`, retroTheme(themes[mode], retro)] as const,
        ),
      ),
    ];
    const washes = ["hover", "active", "accent", "selected"] as const;

    Arr.forEach(styled, ([name, theme]) => {
      const element = renderButton(
        { variant: "secondary", children: "Save" },
        theme,
        { focused: false },
      );
      const edge = expectSome(hostStyleString(element, "borderColor"));
      expect(edge, name).toBe(theme.colors.borderStrong);
      Arr.forEach(washes, (wash) => {
        expect(
          contrastRatio(edge, theme.colors[wash]) ?? 0,
          `${name} edge on ${wash}`,
        ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).boundary);
      });
    });

    const swallowed = Arr.flatMap(styled, ([name, theme]) =>
      Arr.flatMap(washes, (wash) =>
        (contrastRatio(theme.colors.secondary, theme.colors[wash]) ??
          Infinity) < decorativeFloor
          ? [{ name, wash }]
          : [],
      ),
    );
    expect(swallowed.length).toBe(36);
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      expect(
        contrastRatio(theme.colors.secondary, theme.colors.accent) ?? Infinity,
      ).toBeLessThan(decorativeFloor);
    });
  });

  it("paints a link in the derived brand text, not the fill role", () => {
    const linkColour = (theme: typeof lightTheme): string =>
      expectSome(
        hostStyleString(
          renderButton({ variant: "link", children: "Details" }, theme, {
            focused: false,
          }),
          "color",
        ),
      );

    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      const painted = linkColour(theme);
      expect(painted).toBe(brandText(theme));
      Arr.forEach(brandTextSurfaces, (surface) => {
        expect(
          contrastRatio(painted, theme.colors[surface]) ?? 0,
        ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).secondary);
      });
    });

    const lightUnderFloor = Arr.filter(
      brandTextSurfaces,
      (surface) =>
        (contrastRatio(lightTheme.colors.primary, lightTheme.colors[surface]) ??
          Infinity) < contrastFloorsFor(lightTheme).secondary,
    );
    expect(lightUnderFloor.length).toBeGreaterThan(0);
    expect(linkColour(lightTheme)).not.toBe(lightTheme.colors.primary);

    expect(linkColour(darkTheme)).toBe(darkTheme.colors.primary);
  });

  it("paints every variant's label in the role the action route publishes", () => {
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      Arr.forEach(BUTTON_VARIANTS, (variant) => {
        const element = renderButton({ variant, children: "Save" }, theme, {
          focused: false,
        });
        expect(expectSome(hostStyleString(element, "color")), variant).toBe(
          actionOnColor(theme, variant),
        );
      });
    });
  });

  it("stays focusable while loading but refuses to activate", () => {
    const onActivate = vi.fn();
    const loading = resting({ loading: true, onActivate });
    press(loading, "enter", "down");
    expect(onActivate).toHaveBeenCalledTimes(0);
    expect(expectSome(hostProp(loading, "tabIndex"))).toBe(0);
    expect(expectSome(hostProp(loading, "aria-description"))).toBe("Loading");
  });

  it("forwards a tooltip trigger's pointer pair and description", () => {
    const entered = vi.fn();
    const left = vi.fn();
    const element = resting({
      onMouseEnter: entered,
      onMouseLeave: left,
      "aria-description": "  Save the document  ",
    });
    expect(Option.getOrUndefined(hostHandler(element, "onMouseEnter"))).toBe(
      entered,
    );
    expect(Option.getOrUndefined(hostHandler(element, "onMouseLeave"))).toBe(
      left,
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Save the document",
    );
  });

  it("squares its own corners inside an attached group", () => {
    const radius = (attached: boolean): unknown =>
      expectSome(
        hostStyleRecord(
          renderButton(
            { children: "One" },
            testTheme,
            { focused: false },
            attached,
          ),
        ),
      )["borderRadius"];
    expect(radius(false)).toBe(testTheme.radius.md);
    expect(radius(true)).toBe(0);

    const rounded = expectSome(
      hostStyleRecord(
        renderButton(
          { children: "One", style: { borderRadius: 3 } },
          testTheme,
          { focused: false },
          true,
        ),
      ),
    );
    expect(rounded["borderRadius"]).toBe(3);
  });

  it("hands a trigger's own element the host props it opens with", () => {
    const ref = vi.fn();
    const layout = vi.fn();
    const element = resting({
      ref,
      "aria-expanded": true,
      "aria-selected": false,
      onLayout: layout,
    });
    expect(Option.getOrUndefined(hostProp(element, "ref"))).toBe(ref);
    expect(expectSome(hostProp(element, "aria-expanded"))).toBe(true);
    expect(expectSome(hostProp(element, "aria-selected"))).toBe(false);
    expect(Option.getOrUndefined(hostHandler(element, "onLayout"))).toBe(
      layout,
    );
    expect(expectSome(hostProp(element, "role"))).toBe("button");
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(0);
  });

  it("announces the busy state over a trigger's description", () => {
    const busy = resting({
      loading: true,
      "aria-description": "Save the document",
    });
    expect(expectSome(hostProp(busy, "aria-description"))).toBe("Loading");
  });

  it("says the busy state in the caller's words, in both channels", () => {
    const localised = resting({ loading: true, loadingLabel: "Chargement" });
    expect(expectSome(hostProp(localised, "aria-description"))).toBe(
      "Chargement",
    );
    expect(
      expectSome(
        elementProp(
          elementChildren(localised)[0] ?? expect.fail("no busy spinner"),
          "label",
        ),
      ),
    ).toBe("Chargement");

    const silent = resting({ loading: true, loadingLabel: "" });
    expect(Option.isNone(hostProp(silent, "aria-description"))).toBe(true);
    const silentSpinner =
      elementChildren(silent)[0] ?? expect.fail("no busy spinner");
    expect(expectSome(elementProp(silentSpinner, "label"))).toBe("");
  });

  it("gives a busy button a spinner that reads on its fill", () => {
    const accentOf = (variant: ButtonVariant, disabled = false): unknown =>
      expectSome(
        elementProp(
          elementChildren(resting({ variant, loading: true, disabled }))[0] ??
            expect.fail("the busy button drew no spinner"),
          "accent",
        ),
      );

    expect(accentOf("primary")).toBe("on-primary");
    expect(accentOf("secondary")).toBe("on-secondary");
    expect(accentOf("destructive")).toBe("on-destructive");
    expect(accentOf("outline")).toBe("primary");
    expect(accentOf("ghost")).toBe("primary");
    expect(accentOf("link")).toBe("primary");
  });

  it("hands the busy spinner the caller's reduced-motion preference", () => {
    const preference = (reducedMotion: boolean): Option.Option<unknown> =>
      elementProp(
        elementChildren(resting({ loading: true, reducedMotion }))[0] ??
          expect.fail("the busy button drew no spinner"),
        "reducedMotion",
      );
    expect(preference(true)).toStrictEqual(Option.some(true));
    expect(preference(false)).toStrictEqual(Option.some(false));

    const omitted = elementProp(
      elementChildren(resting({ loading: true }))[0] ??
        expect.fail("the busy button drew no spinner"),
      "reducedMotion",
    );
    expect(omitted).toStrictEqual(Option.none());
  });

  it("moves a disabled busy button's spinner onto the neutral pair", () => {
    const accentOf = (variant: ButtonVariant): unknown =>
      expectSome(
        elementProp(
          elementChildren(
            resting({ variant, loading: true, disabled: true }),
          )[0] ?? expect.fail("the disabled busy button drew no spinner"),
          "accent",
        ),
      );

    Arr.forEach(["primary", "secondary", "destructive"] as const, (variant) => {
      expect(accentOf(variant), variant).toBe("on-disabled");
    });

    Arr.forEach(["outline", "ghost", "link"] as const, (variant) => {
      expect(accentOf(variant), variant).toBe("primary");
    });
  });

  it("keeps a disabled button out of the Tab order, and reachable from code", () => {
    expect(hostProp(resting({ disabled: true }), "tabIndex")).toStrictEqual(
      Option.some(-1),
    );
    expect(
      hostProp(resting({ disabled: true, loading: true }), "tabIndex"),
    ).toStrictEqual(Option.some(-1));

    expect(hostProp(resting({ loading: true }), "tabIndex")).toStrictEqual(
      Option.some(0),
    );
  });

  it("lets the surface an action sits in name its Tab stop", () => {
    expect(hostProp(resting({}), "tabIndex")).toStrictEqual(Option.some(0));
    expect(hostProp(resting({ tabIndex: -1 }), "tabIndex")).toStrictEqual(
      Option.some(-1),
    );
    expect(
      hostProp(resting({ disabled: true, tabIndex: 0 }), "tabIndex"),
    ).toStrictEqual(Option.some(0));

    const acted = vi.fn();
    const leaving = resting({ tabIndex: -1, onActivate: acted });
    expect(hostProp(leaving, "tabIndex")).toStrictEqual(Option.some(-1));
    press(leaving, "enter", "down");
    expect(acted).toHaveBeenCalledTimes(1);
  });

  it("declares the keyboard ring once, so focus does not repaint the chrome", () => {
    const idle = expectSome(hostStyleRecord(resting({})));
    const focused = expectSome(
      hostStyleRecord(renderButton({}, testTheme, { focused: true })),
    );
    expect(focused).toStrictEqual(idle);
    expect(idle["focusVisible"]).toBeDefined();
    expect(Option.fromNullishOr(idle["boxShadow"])).toStrictEqual(
      Option.none(),
    );
  });

  it("hands a style callback the live state and lets its result win", () => {
    const seen: ButtonState[] = [];
    const element = renderButton(
      {
        disabled: true,
        style: (state) => {
          seen.push(state);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      testTheme,
      { focused: true },
    );

    expect(seen).toEqual([{ disabled: true, focused: true }]);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });

  it("tells a style callback that a busy button is disabled, because it refuses activation", () => {
    const seen: ButtonState[] = [];
    renderButton(
      {
        loading: true,
        style: (state) => {
          seen.push(state);
          return {};
        },
      },
      testTheme,
      { focused: false },
    );
    expect(seen).toEqual([{ disabled: true, focused: false }]);

    const rested: ButtonState[] = [];
    renderButton(
      {
        style: (state) => {
          rested.push(state);
          return {};
        },
      },
      testTheme,
      { focused: false },
    );
    expect(rested).toEqual([{ disabled: false, focused: false }]);
  });

  it("paints a filled action's feedback as an opaque, derived fill", () => {
    const filled = [
      ["primary", "primary"],
      ["secondary", "secondary"],
      ["destructive", "destructive"],
    ] as const;

    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      Arr.forEach(filled, ([variant, action]) => {
        const element = renderButton({ variant, children: "Save" }, theme, {
          focused: false,
        });
        expect(expectSome(hostStyle(element, "hover"))).toEqual({
          backgroundColor: filledHover(theme, action),
        });
        expect(expectSome(hostStyle(element, "active"))).toEqual({
          backgroundColor: filledPressed(theme, action),
        });

        expect(
          contrastRatio(filledHover(theme, action), theme.colors.background),
        ).toBeDefined();

        const label = theme.colors[`${action}Foreground`];
        Arr.forEach(
          [filledHover(theme, action), filledPressed(theme, action)],
          (fill) => {
            expect(contrastRatio(label, fill) ?? 0).toBeGreaterThanOrEqual(
              contrastFloorsFor(theme).secondary,
            );
          },
        );
      });
    });
  });

  it("paints a disabled filled action with the measured pair, not a fade", () => {
    const cards = [
      ["macOS light", platformTheme(themes.light, "darwin")],
      ["Linux light", platformTheme(themes.light, "linux")],
      ["Windows 7 (Aero) light", retroTheme(lightTheme, "aero")],
      ["Windows XP (Luna) light", retroTheme(lightTheme, "luna")],
    ] as const;

    Arr.forEach(cards, ([name, theme]) => {
      const fadedFill = blend(
        theme.colors.primary,
        theme.colors.card,
        1 - disabledOpacity,
      );
      const fadedLabel = blend(
        theme.colors.primaryForeground,
        fadedFill,
        1 - disabledOpacity,
      );

      expect(contrastRatio(fadedLabel, fadedFill), name).toBeLessThan(
        contrastFloors.disabled,
      );
    });

    const filled = ["primary", "secondary", "destructive"] as const;
    const surfaces = [
      "background",
      "card",
      "popover",
      "muted",
      "secondary",
    ] as const;

    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      const pair = disabledAction(theme);
      Arr.forEach(filled, (variant) => {
        const element = renderButton(
          { variant, disabled: true, children: "Save" },
          theme,
          { focused: false },
        );
        expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
          pair.backgroundColor,
        );
        expect(expectSome(hostStyleString(element, "color"))).toBe(pair.color);

        expect(hostStyle(element, "opacity")).toStrictEqual(Option.none());

        expect(expectSome(hostStyle(element, "hover"))).toEqual({
          backgroundColor: pair.backgroundColor,
        });
        expect(expectSome(hostStyle(element, "active"))).toEqual({
          backgroundColor: pair.backgroundColor,
        });

        Arr.forEach(surfaces, (surface) => {
          expect(
            contrastRatio(pair.color, theme.colors[surface]) ?? 0,
          ).toBeGreaterThanOrEqual(contrastFloors.disabled);
        });
      });
    });
  });

  it("keeps the fade on a disabled action with no fill to collapse", () => {
    Arr.forEach(["outline", "ghost", "link"] as const, (variant) => {
      const element = resting({ variant, disabled: true, children: "Cancel" });
      expect(expectSome(hostStyle(element, "opacity"))).toBe(0.5);

      expect(expectSome(hostStyleString(element, "color"))).toBe(
        buttonVariants[variant].foreground(testTheme),
      );
    });
  });

  it("keeps a filled action's label while Tab is elsewhere", () => {
    const filled = [
      ["primary", "primary", "primaryForeground"],
      ["secondary", "secondary", "secondaryForeground"],
      ["destructive", "destructive", "destructiveForeground"],
    ] as const;
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      Arr.forEach(filled, ([variant, fill, label]) => {
        expect(
          contrastRatio(theme.colors[label], theme.colors[fill]) ?? 0,
        ).toBeGreaterThanOrEqual(contrastFloors.secondary);
        expect(
          Arr.filter(
            keyboardDimFailures(theme, contrastFloors.secondary),
            (failure) => failure.fill === fill && failure.label === label,
          ).length,
        ).toBeGreaterThan(0);
        const element = renderButton({ variant, children: "Save" }, theme, {
          focused: false,
        });
        expect(expectSome(hostStyleRecord(element))["keyboardFocusDim"]).toBe(
          false,
        );
      });
    });
  });

  it("leaves the dim on an action with no fill to collapse into", () => {
    Arr.forEach(["outline", "ghost", "link"] as const, (variant) => {
      const element = resting({ variant, children: "Cancel" });
      expect(
        Option.isNone(
          Option.fromNullishOr(
            expectSome(hostStyleRecord(element))["keyboardFocusDim"],
          ),
        ),
      ).toBe(true);
    });
  });

  it("lets a caller put the dim back on a filled action", () => {
    const element = resting({
      variant: "primary",
      style: { keyboardFocusDim: true },
    });
    expect(expectSome(hostStyleRecord(element))["keyboardFocusDim"]).toBe(true);
  });

  it("still merges an object style last", () => {
    const element = resting({ style: { opacity: 0.4 } });
    expect(expectSome(hostStyleRecord(element))["opacity"]).toBe(0.4);
  });
});

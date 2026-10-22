/**
 * The Button keyboard contract.
 *
 * The published `@gpuix/react` ships **no** button (see `docs/gpuix-capabilities.md`), so this is
 * behaviour the library owns — and the part most worth guarding. Each test
 * below flips a real bug: Enter firing on key *up* (double activation with the
 * platform's own click), Space on key *down* (repeating while held), a held key
 * activating, a busy button still firing, and a disabled button keeping its tab
 * stop.
 */

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
  disabledAction,
  disabledOpacity,
  filledHover,
  filledPressed,
  keyboardDimFailures,
  lightTheme,
  platformTheme,
  retroTheme,
  themes,
} from "@gpuixui/tokens";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton, type ButtonState } from "./Button.js";
import { buttonVariants, type ButtonVariant } from "../core/variants.js";
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
    // The bug (plan 160's measured Phase 2 STOP): `onActivate` carried no
    // event, so an adapter mapping a trigger's `onClick` to it either dropped
    // the payload or ran the handler twice, and a ripple had no press point.
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

    // Enter reports the key-down it decided on...
    const enter = keyEvent("enter");
    expectSome(hostHandler(element, "onKeyDown"))(enter);
    expect(onActivate).toHaveBeenLastCalledWith(enter);

    // ...and Space the release, which is the event that activated.
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("space"));
    expect(onActivate).toHaveBeenCalledTimes(2);
    const space = keyUpEvent("space");
    expectSome(hostHandler(element, "onKeyUp"))(space);
    expect(onActivate).toHaveBeenLastCalledWith(space);
    expect(onActivate).toHaveBeenCalledTimes(3);
  });

  it("is a named button the runtime can hit-test", () => {
    const element = resting({ children: "Save changes" });
    expect(expectSome(hostTag(element))).toBe("div");
    expect(expectSome(hostProp(element, "role"))).toBe("button");
  });

  it("publishes its plain text child as the name", () => {
    // The bug: a div named by its text has no accessible name unless the
    // wrapper writes it, so `<Button>Save</Button>` was announced unnamed.
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
    // The bug: the outline variant painted `border`, the decorative role a
    // divider uses — 1.16:1 on the light page against the design system's 3:1
    // control-boundary claim. `borderStrong` is the role the boundary pairs
    // measure on every strip a control sits on.
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
      // The premise: the role it replaced cannot carry a control's shape.
      expect(
        contrastRatio(theme.colors.border, theme.colors.background) ?? Infinity,
      ).toBeLessThan(contrastFloors.boundary);
    });
  });

  it("paints a link in the derived brand text, not the fill role", () => {
    // The bug: `link` painted `primary`, which is a *fill*: it carries
    // `primaryForeground` and no contract reads it as text. On the base light
    // theme it measures 4.30:1 on the `active` wash a pressed link tints behind
    // itself, and 3.10:1 in macOS dark. `brandText` is the brand moved toward
    // `foreground` until the least readable surface a link can sit on clears the
    // text floor — and the brand itself where it already reads.
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

    // The premise: where the shipped brand cannot carry a link's text, the fill
    // role misses the floor on a surface the link tints.
    const lightUnderFloor = Arr.filter(
      brandTextSurfaces,
      (surface) =>
        (contrastRatio(lightTheme.colors.primary, lightTheme.colors[surface]) ??
          Infinity) < contrastFloorsFor(lightTheme).secondary,
    );
    expect(lightUnderFloor.length).toBeGreaterThan(0);
    expect(linkColour(lightTheme)).not.toBe(lightTheme.colors.primary);
    // ...and where it already reads, the derivation leaves the brand alone.
    expect(linkColour(darkTheme)).toBe(darkTheme.colors.primary);
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
    // Bug guarded: GPUix's `TooltipTrigger asChild` merges its handlers into
    // the child element and the runtime delivers a hover only to the element
    // that registered the listener, so an action could not open a tooltip on
    // hover and the tip's `aria-description` was dropped at the component.
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
    // The bug: an attached group only rounded and clipped the container, so two
    // adjacent rounded fills left a notch at every seam and the page showed
    // through — the buttons did not read as one control.
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
    // The ends are the container's; a caller who wants one rounded says so.
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
    // Bug guarded (plan 160's measured Phase 1 STOP): six triggers pass a `ref`
    // so the surface they open can be anchored, five pass `aria-expanded`,
    // pagination passes `aria-selected` and the hover-opened surfaces pass the
    // pointer pair — and none of them reached the element while `Button`
    // accepted only its own fields, so the components package had to keep a
    // second button implementation. The runtime's own host props now pass
    // through, and the props the control owns are written after the spread.
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

  it("gives a busy button a spinner that reads on its fill", () => {
    // The bug: a filled button rendered the default brand spinner on its own
    // brand fill (1.00:1), so the busy indicator disappeared.
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
    // The bug guarded: the button's busy state is a spinner, so a reader who
    // asked not to see motion still got three dots advancing every 120 ms
    // inside the action that was already reporting itself as busy.
    const preference = (reducedMotion: boolean): Option.Option<unknown> =>
      elementProp(
        elementChildren(resting({ loading: true, reducedMotion }))[0] ??
          expect.fail("the busy button drew no spinner"),
        "reducedMotion",
      );
    expect(preference(true)).toStrictEqual(Option.some(true));
    expect(preference(false)).toStrictEqual(Option.some(false));
    // Omitted stays omitted, so the spinner's own default decides.
    const omitted = elementProp(
      elementChildren(resting({ loading: true }))[0] ??
        expect.fail("the busy button drew no spinner"),
      "reducedMotion",
    );
    expect(omitted).toStrictEqual(Option.none());
  });

  it("moves a disabled busy button's spinner onto the neutral pair", () => {
    // The bug: a disabled filled action paints `disabled` behind
    // `disabledForeground`, but its spinner kept the action's on-colour — white
    // dots on the light theme's neutral fill, which is a 1.0x:1 indicator.
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
    // A disabled action with no fill keeps the page accent: it is not painted
    // on the neutral pair, so there is no fill to read against.
    Arr.forEach(["outline", "ghost", "link"] as const, (variant) => {
      expect(accentOf(variant), variant).toBe("primary");
    });
  });

  it("takes a disabled button out of the tab order", () => {
    // The bug: `loading` won the tab-stop condition, so a button that was
    // disabled **and** busy (the `disabled={pending} loading={pending}` pair)
    // stayed in the tab order — while the disabled rule declares no ring, so
    // Tab landed on a control with no cue that refuses every key.
    expect(hostProp(resting({ disabled: true }), "tabIndex")).toStrictEqual(
      Option.none(),
    );
    expect(
      hostProp(resting({ disabled: true, loading: true }), "tabIndex"),
    ).toStrictEqual(Option.none());
    // Loading alone still keeps its stop: the action is the reader's place.
    expect(hostProp(resting({ loading: true }), "tabIndex")).toStrictEqual(
      Option.some(0),
    );
  });

  it("declares the keyboard ring once, so focus does not repaint the chrome", () => {
    // The bug: focus merged a shadow ring, so a mouse press looked like a Tab and
    // the resting style changed when focus moved.
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
    // The bug: the callback was handed the `disabled` prop alone, so a button
    // that was busy but not disabled reported `disabled: false` while refusing
    // every press and key — the one state a caller styles from was the state
    // the control was not in.
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
    // The bug: the hover was a half-alpha lift (`bg-primary/90`), so the
    // surface behind the control showed through — the same action read as two
    // colours on a card and on a dialog — and a translucent fill cannot be
    // measured for label contrast at all. The fill is derived from the theme
    // instead: it moves toward the theme's foreground and stays opaque.
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
        // The fill is opaque, so it measures against every surface it sits on.
        expect(
          contrastRatio(filledHover(theme, action), theme.colors.background),
        ).toBeDefined();
        // And the label keeps the text floor on it, which is the reason the
        // fill is derived rather than lifted.
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
    // The bug: a disabled filled action faded itself. A fade composites the
    // label into whatever sits behind the control, so on the card of the four
    // light platform/look styles it lands at 1.47:1–1.49:1 — under the disabled
    // floor — while the neutral pair (`disabledAction`) is the pair
    // `contrastPairs` measures on every surface a control sits on.
    const cards = [
      ["macOS light", platformTheme(themes.light, "darwin")],
      ["Linux light", platformTheme(themes.light, "linux")],
      ["Windows 7 (Aero) light", retroTheme(lightTheme, "aero")],
      ["Windows XP (Luna) light", retroTheme(lightTheme, "luna")],
    ] as const;

    Arr.forEach(cards, ([name, theme]) => {
      // The fade's composite: the control shows half its fill over the card,
      // and the label fades the same way over that faded fill.
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
      // The premise: the fade is under the floor on the card, which is where a
      // dialog's action lives. A palette that fixes it makes this case fail.
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
        // No fade is left on top of the opaque pair.
        expect(hostStyle(element, "opacity")).toStrictEqual(Option.none());
        // And the pointer states are paint-stable: a disabled action does not
        // change colour under the pointer.
        expect(expectSome(hostStyle(element, "hover"))).toEqual({
          backgroundColor: pair.backgroundColor,
        });
        expect(expectSome(hostStyle(element, "active"))).toEqual({
          backgroundColor: pair.backgroundColor,
        });
        // The pair reads on every surface a disabled action can sit on.
        Arr.forEach(surfaces, (surface) => {
          expect(
            contrastRatio(pair.color, theme.colors[surface]) ?? 0,
          ).toBeGreaterThanOrEqual(contrastFloors.disabled);
        });
      });
    });
  });

  it("keeps the fade on a disabled action with no fill to collapse", () => {
    // `outline`, `ghost` and `link` paint no fill of their own, so the neutral
    // pair would turn each into a grey box instead of the action it is.
    Arr.forEach(["outline", "ghost", "link"] as const, (variant) => {
      const element = resting({ variant, disabled: true, children: "Cancel" });
      expect(expectSome(hostStyle(element, "opacity"))).toBe(0.5);
      // The label keeps its resting role; the fade is the whole state.
      expect(expectSome(hostStyleString(element, "color"))).toBe(
        buttonVariants[variant].foreground(testTheme),
      );
    });
  });

  it("keeps a filled action's label while Tab is elsewhere", () => {
    // The bug: the runtime dims every other focusable element to 40% while one
    // control has keyboard focus, which on a filled action composites the label
    // into its own fill. The pair is held to 4.5:1 at rest; dimmed it lands
    // between 1.3:1 and 3.2:1, so the label has to stay at full opacity.
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

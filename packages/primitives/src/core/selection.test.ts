import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  contrastFloorsFor,
  contrastRatio,
  darkTheme,
  disabledOpacity,
  filledHover,
  filledPressed,
  lightTheme,
  platformTheme,
  targetInset,
  targetSize,
  type Theme,
} from "@gpuixui/tokens";
import {
  SELECTION_STATES,
  selectionBoxStyle,
  selectionMarkColor,
  selectionTargetStyle,
  switchBox,
  switchTargetStyle,
  switchThumbInset,
  switchThumbStyle,
  switchThumbTravel,
  switchTrackStyle,
  type SelectionSpec,
  type SwitchPaintTheme,
} from "./selection.js";
import { pressWash } from "./pointer.js";
import { testTheme } from "./testing/theme.fixture.js";
import { inventory } from "../inventory.js";

/**
 * Guards the three-state selection paint.
 *
 * The bug this is aimed at: a checkbox whose mark is invisible in one state, or
 * a switch whose thumb and track are painted the same colour in the checked
 * state so the state cannot be read. Both are one wrong role away, and neither
 * the compiler nor a DOM-free test can see them unless the roles are asserted
 * directly.
 */

const spec = (over: Partial<SelectionSpec> = {}): SelectionSpec => ({
  state: "unchecked",
  size: "md",
  accent: "primary",
  ...over,
});

describe("selectionBoxStyle", () => {
  it("leaves an unchecked box unfilled, on the measured boundary role", () => {
    // The bug this guarded: the edge was the `input` role — a field *fill* in
    // this system — so an empty box on a card was `#FFFFFF` on `#FFFFFF`
    // (1.00:1). The whole resting state of a checkbox is that edge.
    const style = selectionBoxStyle(spec(), testTheme);
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderColor).toBe(testTheme.colors.borderStrong);
  });

  it("fills a checked box with the accent and makes the mark legible", () => {
    const style = selectionBoxStyle(spec({ state: "checked" }), testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.primary);
    expect(style.borderColor).toBe(testTheme.colors.primary);
    expect(style.color).toBe(testTheme.colors.primaryForeground);
    expect(style.color).not.toBe(style.backgroundColor);
  });

  it("treats indeterminate as filled, not as a third fill", () => {
    const checked = selectionBoxStyle(spec({ state: "checked" }), testTheme);
    const mixed = selectionBoxStyle(
      spec({ state: "indeterminate" }),
      testTheme,
    );
    expect(mixed.backgroundColor).toBe(checked.backgroundColor);
    expect(mixed.borderColor).toBe(checked.borderColor);
  });

  it("paints a filled box in the accent and leaves an empty one unpainted", () => {
    const empty = selectionBoxStyle(spec(), testTheme);
    const filledStates = Arr.filter(
      SELECTION_STATES,
      (state) => state !== "unchecked",
    );
    const filledPaint = Arr.map(
      filledStates,
      (state) => selectionBoxStyle(spec({ state }), testTheme).backgroundColor,
    );
    expect(empty.backgroundColor).toBeUndefined();
    expect(
      Arr.every(filledPaint, (bg) => bg === testTheme.colors.primary),
    ).toBe(true);
  });

  it("switches the border to the destructive role when invalid", () => {
    expect(
      selectionBoxStyle(spec({ invalid: true }), testTheme).borderColor,
    ).toBe(testTheme.colors.destructive);
  });

  it("paints no ring of its own: the component declares the keyboard ring", () => {
    // The resting paint is what the recipe oracle compares, so the ring is a
    // component-level declaration (`core/focus.ts`), not part of the box's
    // geometry — and it must never be a shadow again.
    const style = selectionBoxStyle(spec(), testTheme);
    expect(style.focusVisible).toBeUndefined();
    expect(style.boxShadow).toBeUndefined();
  });

  it("gives a filled box pointer feedback that is not its resting fill", () => {
    const style = selectionBoxStyle(spec({ state: "checked" }), testTheme);
    expect(style.hover?.backgroundColor).not.toBe(style.backgroundColor);
    expect(style.hover?.backgroundColor).toBeDefined();
  });

  it("paints a filled box's feedback as the theme's opaque derived fill", () => {
    // The bug: the hover and the press were an alpha lift
    // (`alpha(primary, 0.9)`), so the surface behind the box showed through —
    // the same checked box read as two colours on a card and on a dialog — and
    // the mark painted over it could not be measured for contrast at all. The
    // fill is derived instead: opaque, and it belongs to the theme.
    const accents = ["primary", "destructive"] as const;
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      Arr.forEach(accents, (accent) => {
        Arr.forEach(["checked", "indeterminate"] as const, (state) => {
          const current = spec({ state, accent });
          const style = selectionBoxStyle(current, theme);
          expect(style.hover?.backgroundColor, `${accent} hover`).toBe(
            filledHover(theme, accent),
          );
          expect(style.active?.backgroundColor, `${accent} press`).toBe(
            filledPressed(theme, accent),
          );
          // Opaque: an eight-digit value is an alpha lift, which is exactly the
          // shape this fix removes.
          Arr.forEach(
            [style.hover?.backgroundColor, style.active?.backgroundColor],
            (fill) => {
              expect(fill).toMatch(/^#[0-9A-F]{6}$/);
            },
          );
          // The edge goes with the fill: a resting role left on the border
          // would draw a 1px ring of the old colour around the new fill.
          expect(style.hover?.borderColor).toBe("transparent");
          expect(style.active?.borderColor).toBe("transparent");
          // And the mark keeps the text floor on both fills, which is the
          // reason the fill is derived rather than lifted.
          const mark = selectionMarkColor(current, theme);
          Arr.forEach(
            [style.hover?.backgroundColor, style.active?.backgroundColor],
            (fill) => {
              expect(
                contrastRatio(mark, fill ?? "") ?? 0,
              ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).secondary);
            },
          );
        });
      });
    });
  });

  it("tints an empty box under the pointer without moving its edge", () => {
    // Feedback used to move the edge itself (`borderStrong` on hover, the ring
    // on press), which also erased an invalid box's destructive edge on hover.
    const style = selectionBoxStyle(spec(), testTheme);
    expect(style.hover).toEqual({ backgroundColor: testTheme.colors.hover });
    // The press replaces the hover, so it is the derived wash, not the raw
    // `active` role (`core/pointer.ts`).
    expect(style.active).toEqual({ backgroundColor: pressWash(testTheme) });
    expect(selectionBoxStyle(spec({ invalid: true }), testTheme).hover).toEqual(
      {
        backgroundColor: testTheme.colors.hover,
      },
    );
  });

  it("removes pointer feedback while disabled", () => {
    const style = selectionBoxStyle(spec({ disabled: true }), testTheme);
    expect(style.opacity).toBe(disabledOpacity);
    expect(style.cursor).toBe("not-allowed");
    expect(style.hover?.borderColor).toBe(testTheme.colors.borderStrong);
    expect(style.hover?.backgroundColor).toBeUndefined();
  });

  it("writes a disabled fade from the token package's share, not a copy", () => {
    // The bug guarded: the box and the switch track faded themselves with a
    // written `0.5`, while `@gpuixui/tokens`' `disabledFadeFailures` composites
    // `disabledOpacity`. The two agree today, so nothing painted differently —
    // but the fade's share would drift the moment the constant moved, and a
    // control's fade is the mechanism that contract measures. The tokens'
    // guard only reads `core/style.ts`, so these two sites had no reader.
    const source = readFileSync(
      new URL("./selection.ts", import.meta.url),
      "utf8",
    );
    expect(source).toMatch(
      /import\s*\{[^}]*\bdisabledOpacity\b[^}]*\}\s*from\s*"@gpuixui\/tokens"/,
    );
    const writes = [...source.matchAll(/style\.opacity = ([^;]+);/g)].map(
      ([, written]) => written,
    );
    expect(writes).toHaveLength(2);
    expect(writes).not.toContain("0.5");
    writes.forEach((written) => expect(written).toBe("disabledOpacity"));
    // Both states paint it: the checkbox/radio box and the switch's track. A
    // resolver that grew a third fade would fail the count above until the
    // share it writes is the package's.
    expect(switchTrackStyle(spec({ disabled: true }), testTheme).opacity).toBe(
      disabledOpacity,
    );
  });

  it("honours a destructive accent over the brand", () => {
    const style = selectionBoxStyle(
      spec({ state: "checked", accent: "destructive" }),
      testTheme,
    );
    expect(style.backgroundColor).toBe(testTheme.colors.destructive);
  });

  it("sizes the box from the theme's icon scale, so it aligns with the label", () => {
    expect(selectionBoxStyle(spec({ size: "lg" }), testTheme).width).toBe(
      testTheme.iconSize.lg,
    );
  });
});

describe("selectionMarkColor", () => {
  it("uses the accent foreground when filled", () => {
    expect(selectionMarkColor(spec({ state: "checked" }), testTheme)).toBe(
      testTheme.colors.primaryForeground,
    );
  });

  it("warns in the destructive role when invalid and empty", () => {
    expect(selectionMarkColor(spec({ invalid: true }), testTheme)).toBe(
      testTheme.colors.destructive,
    );
  });
});

describe("switch", () => {
  it("fills the track and contrasts the thumb when checked", () => {
    const on = switchTrackStyle(spec({ state: "checked" }), testTheme);
    expect(on.backgroundColor).toBe(testTheme.colors.primary);
    const thumb = switchThumbStyle(spec({ state: "checked" }), testTheme);
    expect(thumb.backgroundColor).toBe(testTheme.colors.primaryForeground);
    expect(thumb.backgroundColor).not.toBe(on.backgroundColor);
  });

  it("paints a checked track's feedback as the theme's opaque derived fill", () => {
    // The same defect the box had, on the other filled selection control: a
    // half-alpha lift let the page through, so a checked switch read differently
    // on a card and on a dialog, and the thumb on the track could not be
    // measured against it.
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      const style = switchTrackStyle(spec({ state: "checked" }), theme);
      expect(style.hover?.backgroundColor).toBe(filledHover(theme, "primary"));
      expect(style.active?.backgroundColor).toBe(
        filledPressed(theme, "primary"),
      );
      expect(style.hover?.backgroundColor).toMatch(/^#[0-9A-F]{6}$/);
      expect(style.active?.backgroundColor).toMatch(/^#[0-9A-F]{6}$/);
      expect(style.hover?.borderColor).toBe("transparent");
      expect(style.active?.borderColor).toBe("transparent");
      // The knob is painted on the fill, so it keeps its floor on both.
      const thumb = switchThumbStyle(spec({ state: "checked" }), theme);
      Arr.forEach(
        [style.hover?.backgroundColor, style.active?.backgroundColor],
        (fill) => {
          expect(
            contrastRatio(thumb.backgroundColor ?? "", fill ?? "") ?? 0,
          ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).secondary);
        },
      );
    });
  });

  it("moves the thumb across the pill by the travel it can animate", () => {
    // The bug guarded: the thumb was positioned by the track's `justifyContent`,
    // which the runtime cannot animate, so the knob jumped. Both positions are
    // now a `left` inset, and the slide is the difference between them.
    const off = switchThumbStyle(spec(), testTheme);
    const on = switchThumbStyle(spec({ state: "checked" }), testTheme);
    expect(Number(on.left) - Number(off.left)).toBe(
      switchThumbTravel(spec(), testTheme),
    );
    expect(off.left).toBe(switchThumbInset(testTheme));
    expect(on.top).toBe(off.top);
  });

  it("keeps the thumb a whole pixel inside the track", () => {
    const track = switchTrackStyle(spec({ size: "lg" }), testTheme);
    const thumb = switchThumbStyle(spec({ size: "lg" }), testTheme);
    expect(Number(thumb.width)).toBeLessThan(Number(track.height));
    expect(Arr.every([thumb.width, thumb.height], Number.isInteger)).toBe(true);
  });

  it("takes the destructive border when invalid, like a checkbox", () => {
    // The bug guarded: `invalid` reached the spec and was dropped, while
    // `docs/switch.mdx` promised the destructive role.
    expect(
      switchTrackStyle(spec({ invalid: true }), testTheme).borderColor,
    ).toBe(testTheme.colors.destructive);
    expect(switchTrackStyle(spec(), testTheme).borderColor).toBe(
      testTheme.colors.borderStrong,
    );
  });

  it("paints no ring of its own: the component declares the keyboard ring", () => {
    const style = switchTrackStyle(spec(), testTheme);
    expect(style.focusVisible).toBeUndefined();
    expect(style.boxShadow).toBeUndefined();
  });
});

describe("a stored switch paint", () => {
  const apple = platformTheme(lightTheme, "darwin");
  /** The macOS style's own paint, which a declared table must still win with. */
  const applePaint =
    apple.switch ?? expect.fail("the macOS style declares no switch");
  /** The box a theme with no declared paint draws, on this theme's scale. */
  const derivedBox = {
    width: Math.round(apple.iconSize.md * 1.75),
    height: apple.iconSize.md,
    border: apple.borderWidth.thin,
  };
  /** The shape a store hands back: JSON has no `undefined`, so a lost table is `null`. */
  const stored = (theme: Theme, paint: unknown): SwitchPaintTheme => ({
    ...theme,
    switch: paint,
  });

  it("paints the accent toggle for the null a store writes", () => {
    // The bug guarded: `switchBox`/`switchFill`/`switchThumbPaint` compared
    // `theme.switch !== undefined`, so the `null` a stored theme writes for the
    // paint it did not carry counted as a declaration and `theme.switch.on` threw
    // `TypeError: Cannot read properties of null (reading 'on')` at the first
    // `Switch` paint.
    const restored = stored(apple, null);

    expect(switchBox("md", restored)).toStrictEqual(derivedBox);
    const on = switchTrackStyle(spec({ state: "checked" }), restored);
    expect(on.backgroundColor).toBe(apple.colors.primary);
    // The pointer feedback follows the same table, so it is the derived fill.
    expect(on.hover?.backgroundColor).toBe(filledHover(apple, "primary"));
    expect(on.active?.backgroundColor).toBe(filledPressed(apple, "primary"));
    expect(
      switchThumbStyle(spec({ state: "checked" }), restored).backgroundColor,
    ).toBe(apple.colors.primaryForeground);
  });

  it("keeps the paint a theme actually declares", () => {
    // The counterweight: the absence rule must not silence a declared platform.
    expect(switchBox("md", apple)).toStrictEqual({
      width: 51,
      height: 31,
      border: 0,
    });
    expect(
      switchTrackStyle(spec({ state: "checked" }), apple).backgroundColor,
    ).toBe(applePaint.on);
    expect(switchThumbStyle(spec(), apple).backgroundColor).toBe(
      applePaint.knob,
    );
  });

  it("paints the accent toggle for a table that lost a slot", () => {
    // A declaration is whole or it is nothing: the slots are one control's
    // paint, so a stored table missing one keeps the accent toggle and the
    // tokens' `switchFailures` names the slot to repair.
    Arr.forEach(
      [
        { on: null, off: "#DCDCE1", knob: "#FFFFFF" },
        { on: applePaint.on },
        {},
        "#30D158",
      ],
      (paint) => {
        const lost = stored(apple, paint);
        expect(switchBox("md", lost)).toStrictEqual(derivedBox);
        expect(
          switchTrackStyle(spec({ state: "checked" }), lost).backgroundColor,
        ).toBe(apple.colors.primary);
        expect(switchThumbStyle(spec(), lost).backgroundColor).toBe(
          apple.colors.foreground,
        );
      },
    );
  });

  it("paints the same table the theme carries, slot for slot", () => {
    // A stored theme that kept its paint must paint exactly what the shipped
    // style paints, or the read would have traded one silent change for another.
    const roundTripped = stored(apple, { ...applePaint });
    Arr.forEach(SELECTION_STATES, (state) => {
      expect(switchTrackStyle(spec({ state }), roundTripped)).toStrictEqual(
        switchTrackStyle(spec({ state }), apple),
      );
    });
  });
  it("teaches the fallback a stored theme gets", () => {
    // The rule a reader needs when a restored theme paints the accent toggle:
    // the page and the inventory record name it, so neither can keep silence
    // about the table while the seam decodes it.
    const page = readFileSync(
      new URL("../../docs/switch.mdx", import.meta.url),
      "utf8",
    );
    const record = Option.getOrUndefined(
      Arr.findFirst(inventory, (meta) => meta.name === "Switches"),
    );

    expect(page).toContain("switchFailures");
    expect(page).toMatch(/accent family/);
    expect(record?.limitations.join(" ")).toContain("switchFailures");
  });
});

describe("selectionTargetStyle", () => {
  const sizes = ["sm", "md", "lg"] as const;

  it("reserves the pressable floor around every box size", () => {
    // The bug these guard: the icon-sized box was its own press target — 14/16/
    // 20px against WCAG 2.2 SC 2.5.8's 24px floor.
    const sides = Arr.map(sizes, (size) => {
      const style = selectionTargetStyle(spec({ size }), testTheme);
      return { size, width: style.width, height: style.height };
    });
    expect(sides).toStrictEqual(
      Arr.map(sizes, (size) => ({
        size,
        width:
          testTheme.iconSize[size] + targetInset(testTheme.iconSize[size]) * 2,
        height:
          testTheme.iconSize[size] + targetInset(testTheme.iconSize[size]) * 2,
      })),
    );
    expect(
      Arr.every(sides, (side) => Number(side.width) >= targetSize.minimum),
    ).toBe(true);
  });

  it("keeps the drawing's filled square out of the press", () => {
    expect(
      selectionTargetStyle(spec(), testTheme).backgroundColor,
    ).toBeUndefined();
  });

  it("refuses the pointer feedback a disabled control would invite", () => {
    expect(
      selectionTargetStyle(spec({ disabled: true }), testTheme).cursor,
    ).toBe("not-allowed");
    expect(selectionTargetStyle(spec(), testTheme).cursor).toBe("pointer");
  });
});

describe("switchTargetStyle", () => {
  it("grows only the band a track cannot fill", () => {
    // The track keeps the pill's width and is one icon-height tall; the target
    // adds the height to reach the floor and leaves the width to the track.
    const style = switchTargetStyle(spec());
    expect(style.minHeight).toBe(targetSize.minimum);
    expect(style.width).toBeUndefined();
    expect(style.height).toBeUndefined();
  });

  it("refuses the pointer feedback a disabled switch would invite", () => {
    expect(switchTargetStyle(spec({ disabled: true })).cursor).toBe(
      "not-allowed",
    );
    expect(switchTargetStyle(spec()).cursor).toBe("pointer");
  });
});

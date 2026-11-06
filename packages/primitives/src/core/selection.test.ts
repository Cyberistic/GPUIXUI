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
  switchThumbStyle,
  switchThumbTravel,
  switchTrackStyle,
  type SelectionSpec,
  type SwitchPaintTheme,
} from "./selection.js";
import { pressWash } from "./pointer.js";
import { testTheme } from "./testing/theme.fixture.js";
import { inventory } from "../inventory.js";

const spec = (over: Partial<SelectionSpec> = {}): SelectionSpec => ({
  state: "unchecked",
  size: "md",
  accent: "primary",
  ...over,
});

describe("selectionBoxStyle", () => {
  it("leaves an unchecked box unfilled, on the measured boundary role", () => {
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

          Arr.forEach(
            [style.hover?.backgroundColor, style.active?.backgroundColor],
            (fill) => {
              expect(fill).toMatch(/^#[0-9A-F]{6}$/);
            },
          );

          expect(style.hover?.borderColor).toBe("transparent");
          expect(style.active?.borderColor).toBe("transparent");

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
    const style = selectionBoxStyle(spec(), testTheme);
    expect(style.hover).toEqual({ backgroundColor: testTheme.colors.hover });

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
    const off = switchThumbStyle(spec(), testTheme);
    const on = switchThumbStyle(spec({ state: "checked" }), testTheme);
    expect(Number(on.left) - Number(off.left)).toBe(
      switchThumbTravel(spec(), testTheme),
    );
    expect(off.left).toBe(
      switchBox("md", testTheme).inset - switchBox("md", testTheme).border,
    );
    expect(on.top).toBe(off.top);
  });

  it("keeps the knob's gap to each edge equal in both states", () => {
    const themes = [testTheme, platformTheme(lightTheme, "darwin")];
    Arr.forEach(["sm", "md", "lg"] as const, (size) => {
      Arr.forEach(themes, (theme) => {
        const rest = spec({ size });
        const checked = spec({ size, state: "checked" });
        const box = switchBox(size, theme);
        const padding =
          Number(switchTrackStyle(rest, theme).width) - box.border * 2;
        expect(Number(switchThumbStyle(rest, theme).left)).toBe(
          box.inset - box.border,
        );
        expect(Number(switchThumbStyle(checked, theme).left) + box.knob).toBe(
          padding - (box.inset - box.border),
        );
        const thumb = switchThumbStyle(rest, theme);
        expect(thumb.top).toBe((box.height - box.border * 2 - box.knob) / 2);
        expect(Number(thumb.top) * 2 + box.knob).toBe(
          box.height - box.border * 2,
        );
      });
    });
  });

  it("keeps the thumb a whole pixel inside the track", () => {
    const track = switchTrackStyle(spec({ size: "lg" }), testTheme);
    const thumb = switchThumbStyle(spec({ size: "lg" }), testTheme);
    expect(Number(thumb.width)).toBeLessThan(Number(track.height));
    expect(Arr.every([thumb.width, thumb.height], Number.isInteger)).toBe(true);
  });

  it("takes the destructive border when invalid, like a checkbox", () => {
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

  const applePaint =
    apple.switch ?? expect.fail("the macOS style declares no switch");

  const derivedBox = {
    width: Math.round(apple.iconSize.md * 1.75),
    height: apple.iconSize.md,
    knob: apple.iconSize.md - apple.spacing["2xs"] * 2,
    inset: apple.spacing["2xs"],
    border: apple.borderWidth.thin,
  };

  const stored = (theme: Theme, paint: unknown): SwitchPaintTheme => ({
    ...theme,
    switch: paint,
  });

  it("paints the accent toggle for the null a store writes", () => {
    const restored = stored(apple, null);

    expect(switchBox("md", restored)).toStrictEqual(derivedBox);
    const on = switchTrackStyle(spec({ state: "checked" }), restored);
    expect(on.backgroundColor).toBe(apple.colors.primary);

    expect(on.hover?.backgroundColor).toBe(filledHover(apple, "primary"));
    expect(on.active?.backgroundColor).toBe(filledPressed(apple, "primary"));
    expect(
      switchThumbStyle(spec({ state: "checked" }), restored).backgroundColor,
    ).toBe(apple.colors.primaryForeground);
  });

  it("keeps the paint a theme actually declares", () => {
    expect(switchBox("md", apple)).toStrictEqual({
      width: 38,
      height: 22,
      knob: 20,
      inset: 1,
      border: 0,
    });
    expect(
      switchTrackStyle(spec({ state: "checked" }), apple).backgroundColor,
    ).toBe(applePaint.on);
    expect(switchThumbStyle(spec(), apple).backgroundColor).toBe(
      applePaint.knob,
    );
  });

  it("paints the off knob a declared switch table carries", () => {
    const windows = platformTheme(lightTheme, "win32");
    expect(switchThumbStyle(spec(), windows).backgroundColor).toBe("#616161");
    expect(
      switchThumbStyle(spec({ state: "checked" }), windows).backgroundColor,
    ).toBe("#FFFFFF");
  });

  it("keeps the edge a declared switch table carries", () => {
    const windows = platformTheme(lightTheme, "win32");
    const off = switchTrackStyle(spec(), windows);
    expect(off.backgroundColor).toBe("transparent");
    expect(off.borderColor).toBe("#8A8A8A");
    expect(off.hover).toStrictEqual({
      backgroundColor: "transparent",
      borderColor: "#8A8A8A",
    });

    const apple = switchTrackStyle(spec(), platformTheme(lightTheme, "darwin"));
    expect(apple.borderColor).toBe("#C7C7CC");
    expect(apple.boxShadow).toStrictEqual({
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: 1,
      color: "#C7C7CC",
    });

    expect(
      switchTrackStyle(
        spec(),
        stored(windows, {
          on: "#0078D4",
          off: "transparent",
          knob: "#FFFFFF",
          edge: "#8A8A8A",
        }),
      ),
    ).toStrictEqual(off);
    expect(
      switchTrackStyle(
        spec(),
        stored(windows, { on: "#0078D4", off: "transparent", knob: "#FFFFFF" }),
      ).borderColor,
    ).toBe("transparent");
  });

  it("paints the accent toggle for a table that lost a slot", () => {
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
    const roundTripped = stored(apple, { ...applePaint });
    Arr.forEach(SELECTION_STATES, (state) => {
      expect(switchTrackStyle(spec({ state }), roundTripped)).toStrictEqual(
        switchTrackStyle(spec({ state }), apple),
      );
    });
  });
  it("records the fallback a stored theme gets", () => {
    const record = Option.getOrUndefined(
      Arr.findFirst(inventory, (meta) => meta.name === "Switches"),
    );

    expect(record?.limitations.join(" ")).toContain("switchFailures");
  });
});

describe("selectionTargetStyle", () => {
  const sizes = ["sm", "md", "lg"] as const;

  it("reserves the pressable floor around every box size", () => {
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

describe("the platform switch boxes", () => {
  const platforms = [
    {
      platform: "darwin",
      width: 38,
      height: 22,
      knob: 20,
      inset: 1,
      border: 0,
    },
    { platform: "win32", width: 40, height: 20, knob: 12, inset: 4, border: 1 },
    { platform: "linux", width: 44, height: 24, knob: 18, inset: 3, border: 0 },
  ] as const;

  it.each(platforms)(
    "centres $platform's $width×$height track and $knob knob",
    ({ platform, width, height, knob, inset, border }) => {
      const theme = platformTheme(lightTheme, platform);
      const metrics = theme.switchMetrics ?? expect.fail("no metrics");
      const box = switchBox("md", theme);
      const thumb = switchThumbStyle(spec(), theme);

      expect(box).toEqual({ width, height, knob, inset, border });
      expect(thumb.width).toBe(knob);
      expect(thumb.height).toBe(knob);
      expect(thumb.left).toBe(inset - border);
      expect(thumb.top).toBe((height - knob) / 2 - border);

      const taller = switchThumbStyle(spec(), {
        ...theme,
        switchMetrics: { ...metrics, height: height + 2 },
      });
      expect(taller.top).toBe((height + 2 - knob) / 2 - border);
      expect(taller.top).not.toBe(thumb.top);

      const larger = switchThumbStyle(spec(), {
        ...theme,
        switchMetrics: { ...metrics, knob: knob + 2 },
      });
      expect(larger.width).toBe(knob + 2);
      expect(larger.height).toBe(knob + 2);
    },
  );
});

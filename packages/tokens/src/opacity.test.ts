/**
 * Guards the gap plan 540 closes: the total theme check could see a role's hex
 * bytes but not its alpha channel, so two edits that paint something other than
 * what the author wrote returned `[]`.
 *
 * `shadow: "#191D2580"` asked for a 50% elevation tint; `elevationShadow`
 * composes each level with `alpha(theme.colors.shadow, levelAlpha)`, and `alpha`
 * writes the fourth byte, so the authored 50% was discarded and the shipped 12%
 * painted instead — while `themeFailures` returned `[]`. `overlay: "#000000"` is
 * a solid modal scrim, which hides the window the role's documentation says must
 * stay recognisable, and it too returned `[]`. A six-digit `selection` or
 * `selectionOnFill` is a solid block; it happened to fail the contrast check
 * because a solid wash erases the text measured through it, but that is a
 * contrast defect with 104 and 9 unrelated pairs, not a report about the form.
 */
import { describe, expect, it } from "vitest";
import { colorRoles } from "./color.js";
import { themeColorFailures, themeContrastFailures } from "./contrast.js";
import { elevationShadow } from "./elevation.js";
import { themeChecks, themeFailures } from "./theme-check.js";
import { extendTheme, getTheme, lightTheme } from "./theme.js";
import { roleForm, themeOpacityFailures, translucentRoles } from "./opacity.js";
import { shippedThemes } from "./shipped-themes.js";
import {
  solidScrimFailures,
  translucentTintFailures,
} from "./opacity.example.js";

const hexVeil = /^#[0-9A-Fa-f]{6}[0-9A-Fa-f]{2}$/;

const kinds = (failures: ReadonlyArray<{ readonly kind: string }>) =>
  failures.map((failure) => failure.kind);

describe("colour role opacity", () => {
  it("passes every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeOpacityFailures(theme), theme.name).toEqual([]);
    });
  });

  it("ships every veil with the alpha byte it needs", () => {
    translucentRoles.forEach((role) => {
      expect(colorRoles, role).toContain(role);
      expect(roleForm(role)).toBe("translucent");
      shippedThemes.forEach(({ theme }) => {
        expect(theme.colors[role], `${theme.name}/${role}`).toMatch(hexVeil);
        expect(themeOpacityFailures(theme), `${theme.name}/${role}`).toEqual(
          [],
        );
      });
    });
  });

  it("calls every other role opaque", () => {
    colorRoles
      .filter((role) => !translucentRoles.some((veil) => veil === role))
      .forEach((role) => expect(roleForm(role), role).toBe("opaque"));
  });

  it("reports a translucent elevation tint the paint discards", () => {
    const tinted = extendTheme(getTheme("light"), {
      colors: { shadow: "#191D2580" },
    });

    expect(themeContrastFailures(tinted)).toEqual([]);
    expect(themeOpacityFailures(tinted)).toEqual([
      { role: "shadow", value: "#191D2580", expected: "opaque" },
    ]);
    expect(kinds(themeFailures(tinted))).toEqual(["opacity"]);
    expect(themeFailures(tinted)).toContainEqual({
      kind: "opacity",
      role: "shadow",
      value: "#191D2580",
      expected: "opaque",
    });
  });

  it("reports a solid or fully opaque scrim", () => {
    const solid = extendTheme(getTheme("light"), {
      colors: { overlay: "#000000" },
    });
    const opaqueByte = extendTheme(getTheme("light"), {
      colors: { overlay: "#000000FF" },
    });

    expect(themeContrastFailures(solid)).toEqual([]);
    expect(themeOpacityFailures(solid)).toEqual([
      { role: "overlay", value: "#000000", expected: "translucent" },
    ]);
    expect(themeOpacityFailures(opaqueByte)).toEqual([
      { role: "overlay", value: "#000000FF", expected: "translucent" },
    ]);
  });

  it("reports a solid or invisible veil", () => {
    const solid = extendTheme(getTheme("light"), {
      colors: { selection: "#5F4BDB" },
    });
    const invisible = extendTheme(getTheme("light"), {
      colors: { selection: "#5F4BDB00" },
    });
    const fill = extendTheme(getTheme("light"), {
      colors: { selectionOnFill: "#808080" },
    });

    expect(themeOpacityFailures(solid)).toEqual([
      { role: "selection", value: "#5F4BDB", expected: "translucent" },
    ]);
    expect(themeOpacityFailures(invisible)).toEqual([
      { role: "selection", value: "#5F4BDB00", expected: "translucent" },
    ]);
    expect(themeOpacityFailures(fill)).toEqual([
      {
        role: "selectionOnFill",
        value: "#808080",
        expected: "translucent",
      },
    ]);
  });

  it("accepts a redundant opaque byte on an opaque role", () => {
    const redundant = extendTheme(getTheme("light"), {
      colors: { primary: "#5F4BDBFF" },
    });

    expect(themeOpacityFailures(redundant)).toEqual([]);
  });

  it("leaves a value the format check owns", () => {
    const named = extendTheme(getTheme("light"), {
      colors: { scrollbar: "rebeccapurple" },
    });
    const tinted = extendTheme(getTheme("light"), {
      colors: { shadow: "black" },
    });

    expect(themeOpacityFailures(named)).toEqual([]);
    expect(themeColorFailures(named)).toEqual([
      { role: "scrollbar", value: "rebeccapurple" },
    ]);
    expect(themeOpacityFailures(tinted)).toEqual([]);
    expect(themeColorFailures(tinted)).toEqual([
      { role: "shadow", value: "black" },
    ]);
  });

  it("measures the tint byte the paint replaces", () => {
    const tinted = extendTheme(lightTheme, {
      colors: { shadow: "#191D2580" },
    });

    expect(elevationShadow(tinted, "md")).toEqual(
      elevationShadow(lightTheme, "md"),
    );
  });

  it("is the seventh check, directly after the format check", () => {
    expect(themeChecks.indexOf("opacity")).toBe(
      themeChecks.indexOf("color") + 1,
    );
    expect(themeChecks.indexOf("opacity")).toBeLessThan(
      themeChecks.indexOf("typeface"),
    );
  });

  it("runs the documented example", () => {
    expect(translucentTintFailures).toEqual([
      { role: "shadow", value: "#191D2580", expected: "opaque" },
    ]);
    expect(solidScrimFailures).toEqual([
      { role: "overlay", value: "#000000", expected: "translucent" },
    ]);
  });
});

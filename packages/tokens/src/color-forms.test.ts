/**
 * Guards the ordered index of the alpha forms.
 *
 * The unit plan 558 deferred: `ColorForm` was the package's last exported union
 * without an ordered owner, so a docs table, a diagnostics view and the opacity
 * example retyped `"opaque"` / `"translucent"`. A third form would join the type
 * with nothing to notice it had no role behind it. These cases hold the index,
 * the total `roleForm` rule, the executed grouping and the shipped sets
 * together.
 */
import { describe, expect, it } from "vitest";
import { colorRoles } from "./color.js";
import { colorForms, roleForm, themeOpacityFailures } from "./opacity.js";
import { rolesByForm } from "./opacity.example.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme } from "./theme.js";

describe("colorForms", () => {
  it("is the ordered domain of the form type", () => {
    expect(colorForms).toEqual(["opaque", "translucent"]);
  });

  it("is total over the palette: every role takes an indexed form", () => {
    colorRoles.forEach((role) => {
      expect(colorForms, role).toContain(roleForm(role));
    });
    const produced = new Set(colorRoles.map(roleForm));
    expect(produced.size).toBe(colorForms.length);
  });

  it("has no member without a role", () => {
    colorForms.forEach((form) => {
      const roles = colorRoles.filter((role) => roleForm(role) === form);
      expect(roles.length, form).toBeGreaterThan(0);
    });
  });

  it("names the form a failure expects, in both directions", () => {
    const tinted = extendTheme(getTheme("light"), {
      colors: { shadow: "#191D2580" },
    });
    const [opaque] = themeOpacityFailures(tinted);
    expect(opaque?.expected).toBe("opaque");
    expect(colorForms).toContain(opaque?.expected);

    const solid = extendTheme(getTheme("light"), {
      colors: { overlay: "#000000" },
    });
    const [translucent] = themeOpacityFailures(solid);
    expect(translucent?.expected).toBe("translucent");
    expect(colorForms).toContain(translucent?.expected);
  });

  it("groups every role once in the executed example", () => {
    expect(rolesByForm.map(({ form }) => form)).toEqual(colorForms);
    rolesByForm.forEach(({ form, roles }) => {
      expect(roles.length, form).toBeGreaterThan(0);
      roles.forEach((role) => expect(roleForm(role), role).toBe(form));
    });
    const grouped = rolesByForm.flatMap(({ roles }) => roles);
    expect(grouped).toHaveLength(colorRoles.length);
    expect(new Set(grouped).size).toBe(colorRoles.length);
  });

  it("leaves every shipped set passing", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeOpacityFailures(theme), theme.name).toEqual([]);
    });
  });
});

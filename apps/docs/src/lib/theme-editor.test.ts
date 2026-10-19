import { darkTheme, densityPresets, lightTheme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  defaultEdits,
  editableRoles,
  fromQuery,
  isDefault,
  roleLabel,
  themeFor,
  themeSource,
  toQuery,
  type ThemeEdits,
} from "./theme-editor";

/**
 * Guards plan 595: the editor's state is a real `Theme`, not a second palette.
 *
 * The failures these tests catch: reading the wrong built-in theme, rebuilding
 * a palette instead of merging (a role the base owns would disappear), dropping
 * the density or the mode, a share URL that records every role instead of the
 * edit, a URL parser that accepts malformed input, and copyable source that
 * differs from the theme the preview rendered.
 */

const edited = (): ThemeEdits => {
  const base = defaultEdits("light");
  return {
    ...base,
    density: "compact",
    colors: {
      ...base.colors,
      primary: "#7c5cff",
      border: "#112233",
    },
  };
};

describe("defaultEdits", () => {
  it("reads every editable role from the chosen built-in theme", () => {
    const edits = defaultEdits("dark");
    expect(edits.base).toBe("dark");
    expect(edits.density).toBe(darkTheme.density.name);
    expect(
      Arr.every(
        editableRoles,
        (role) => edits.colors[role] === darkTheme.colors[role],
      ),
    ).toBe(true);
  });
});

describe("themeFor", () => {
  it("merges the edit and keeps a role the editor does not expose", () => {
    const theme = themeFor(edited());
    expect(theme.colors.primary).toBe("#7c5cff");
    expect(theme.colors.border).toBe("#112233");
    expect(theme.colors.warning).toBe(lightTheme.colors.warning);
    expect(theme.mode).toBe("light");
  });

  it("applies the density preset without mutating the base", () => {
    const theme = themeFor(edited());
    expect(theme.density.name).toBe("compact");
    expect(theme.density.controlHeight.md).toBe(
      densityPresets.compact.controlHeight.md,
    );
    expect(lightTheme.density.name).toBe("comfortable");
  });

  it("starts a dark edit from the dark theme", () => {
    const theme = themeFor(defaultEdits("dark"));
    expect(theme.mode).toBe("dark");
    expect(theme.colors.background).toBe(darkTheme.colors.background);
  });
});

describe("the share URL", () => {
  it("records the base, the density and only the changed roles", () => {
    expect(toQuery(edited())).toBe(
      "light.compact.primary:7c5cff,border:112233",
    );
  });

  it("round-trips an edit", () => {
    const edits = edited();
    expect(fromQuery(toQuery(edits))).toEqual(edits);
  });

  it("round-trips an untouched theme without a trailing change list", () => {
    const edits = defaultEdits("dark");
    expect(toQuery(edits)).toBe(`dark.${darkTheme.density.name}`);
    expect(fromQuery(toQuery(edits))).toEqual(edits);
  });

  it("rejects malformed values instead of applying half a theme", () => {
    const invalid = [
      null,
      undefined,
      "",
      "light",
      "purple.comfortable",
      "light.loose",
      "light.comfortable.primary:12345",
      "light.comfortable.purple:7c5cff",
      "light.comfortable.primary:7c5cff:extra",
      "light.comfortable.primary:7c5cff.extra",
      "light.comfortable.primary:7c5cff,border",
    ];
    const accepted = Arr.filter(invalid, (value) => {
      return fromQuery(value) !== undefined;
    });
    expect(accepted).toEqual([]);
  });

  it("is default only for the untouched light theme", () => {
    expect(isDefault(defaultEdits("light"))).toBe(true);
    expect(isDefault(edited())).toBe(false);
    expect(isDefault(defaultEdits("dark"))).toBe(false);
  });
});

describe("themeSource", () => {
  it("emits a real module with only the changed roles", () => {
    const source = themeSource(edited());
    expect(source).toContain(
      'import { extendTheme, lightTheme } from "@gpuixui/tokens";',
    );
    expect(source).toContain(
      "export const brandTheme = extendTheme(lightTheme, {",
    );
    expect(source).toContain('primary: "#7c5cff"');
    expect(source).toContain('border: "#112233"');
    expect(source).toContain('density: "compact"');
    expect(source).not.toContain("background:");
    expect(source).not.toContain("mutedForeground:");
  });

  it("emits only the name when nothing changed", () => {
    const source = themeSource(defaultEdits("dark"));
    expect(source).toContain(
      'import { extendTheme, darkTheme } from "@gpuixui/tokens";',
    );
    expect(source).toContain('name: "My theme"');
    expect(source).not.toContain("colors:");
    expect(source).not.toContain("density:");
  });
});

describe("roleLabel", () => {
  it("turns a camel-case role into a readable label", () => {
    expect(roleLabel("primaryForeground")).toBe("Primary foreground");
    expect(roleLabel("card")).toBe("Card");
  });
});

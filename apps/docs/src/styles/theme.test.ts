import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";
import { DOCS_COLOR_ROLES, themeColors } from "@/lib/docs-theme";

/**
 * Guards the docs theme (plan 410 §3, plan 416): the palette is the library's
 * own `@gpuixui/tokens` identity, in both modes, with no untethered literals.
 * The interesting failure is a role that drifts — the site keeps rendering an
 * old brand while the docs claim the package's values.
 */
const css = readFileSync(
  fileURLToPath(new URL("./app.css", import.meta.url)),
  "utf8",
);

/** The declarations between `selector {` and its closing brace. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("}", start));
};

const roleNames = (selector: string): ReadonlyArray<string> =>
  Arr.sort(
    Arr.dedupe(
      Arr.map(
        Arr.fromIterable(block(selector).matchAll(/(--color-fd-[a-z-]+):/g)),
        (match) => match[1] ?? "",
      ),
    ),
    Order.String,
  );

const roleValue = (selector: string, role: string): string =>
  block(selector)
    .match(new RegExp(`${role}:\\s*([^;]+);`))?.[1]
    ?.trim()
    .toLowerCase() ?? "";

const mappedRoles = Object.keys(DOCS_COLOR_ROLES);

describe("docs theme", () => {
  it("defines the same semantic roles in light and dark", () => {
    const light = roleNames(":root");
    const dark = roleNames(".dark");
    expect(light.length).toBeGreaterThan(0);
    expect({ onlyInLight: Arr.difference(light, dark) }).toEqual({
      onlyInLight: [],
    });
    expect({ onlyInDark: Arr.difference(dark, light) }).toEqual({
      onlyInDark: [],
    });
  });

  it("renders the two themes as distinct palettes", () => {
    // A copy-paste that left both blocks identical would pass the parity check
    // above while the site had only one real theme.
    const differing = ["--color-fd-background", "--color-fd-primary"].filter(
      (role) => roleValue(":root", role) !== roleValue(".dark", role),
    );
    expect(differing).toEqual(["--color-fd-background", "--color-fd-primary"]);
  });

  it("pins every role to the library's light theme", () => {
    Arr.forEach(Object.entries(DOCS_COLOR_ROLES), ([variable, role]) => {
      expect({ variable, value: roleValue(":root", variable) }).toEqual({
        variable,
        value: themeColors.light[role].toLowerCase(),
      });
    });
  });

  it("pins every role to the library's dark theme", () => {
    Arr.forEach(Object.entries(DOCS_COLOR_ROLES), ([variable, role]) => {
      expect({ variable, value: roleValue(".dark", variable) }).toEqual({
        variable,
        value: themeColors.dark[role].toLowerCase(),
      });
    });
  });

  it("declares no colour role that is not tied to a token", () => {
    expect(Arr.difference(roleNames(":root"), mappedRoles)).toEqual([]);
    expect(Arr.difference(roleNames(".dark"), mappedRoles)).toEqual([]);
  });
});

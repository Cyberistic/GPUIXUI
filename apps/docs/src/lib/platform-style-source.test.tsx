import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  platformNames,
  platformStyles,
  radiusSteps,
  retroStyles,
  type PlatformName,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { PlatformStyleSource } from "../components/docs/platform-style-source";
import {
  platformStyleLiteral,
  platformStyleSource,
} from "./platform-style-source";

/**
 * The copyable platform styles the Theming page prints.
 *
 * The page tells a reader to take a platform style, edit it and ship it, and
 * the values are the library's — generated from `platformStyles`, never typed
 * into Markdown. The guard is the whole point: a style the package gains,
 * loses or repaints has to move the block, so each emitted file is evaluated
 * and compared with the table it claims to be, field for field. A block that
 * dropped `syntax`, `switch` or a radius step would still look plausible and
 * would ship a theme that is not the platform's.
 */

const read = (path: string): string =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

/** The object literal a copied file declares, evaluated as JavaScript. */
// check-tests-ok: the literal has no identifiers beyond the keys it prints,
// so evaluating it is the only way to compare it with the table it copies.
const evaluate = (literal: string): unknown =>
  new Function(`return (${literal});`)();

const literalOf = (source: string): unknown => {
  const marker = "export const myStyle: PlatformStyle = ";
  const start = source.indexOf(marker);
  expect(start, "the file declares a PlatformStyle").toBeGreaterThan(-1);
  const end = source.lastIndexOf(";");
  return evaluate(source.slice(start + marker.length, end));
};

describe("the copyable platform style", () => {
  it.each(platformNames)(
    "prints %s as the table's own style, field for field",
    (name: PlatformName) => {
      const style = platformStyles[name];
      const source = platformStyleSource(name);
      const value = literalOf(source) as Record<string, unknown>;

      expect(value).toEqual(style);
      // `toEqual` ignores a key neither side carries; the key sets make a
      // dropped optional field (the switch, the series scale) a failure.
      expect(Object.keys(value).sort()).toEqual(Object.keys(style).sort());
    },
  );

  it("prints every radius step the scale defines", () => {
    const radius = literalOf(platformStyleSource("win32")) as {
      readonly radius: Record<string, number>;
    };

    expect(Object.keys(radius.radius)).toEqual([...radiusSteps]);
  });

  it("leaves out the optional tables the identity does not declare", () => {
    // A copy that printed `switch: undefined` would read as a declared switch
    // and paint the library's own control nothing, so absence is absence.
    const source = platformStyleSource("default");

    expect(source).not.toContain("switch:");
    expect(source).not.toContain("syntax:");
    expect(platformStyles.default.switch).toBeUndefined();
    expect(platformStyles.default.syntax).toBeUndefined();
  });

  it("prints the optional tables an authored look declares", () => {
    // The platform table carries no `series`, so the scale branch would be
    // dead code if an authored look did not exercise it — and a look that
    // repaints a plot's surfaces is exactly who declares one.
    const luna = retroStyles.luna;
    expect(luna.series).toBeDefined();

    expect(evaluate(platformStyleLiteral(luna))).toEqual(luna);
  });

  it("names the platform, its table and the route a reader applies it by", () => {
    for (const name of platformNames) {
      const source = platformStyleSource(name);

      expect(source).toContain(`copied from \`platformStyles.${name}\` in`);
      expect(source).toContain("applyStyle(themes.light, myStyle)");
      expect(source).toContain("auditTheme(theme)");
      expect(source).toContain(
        'import type { PlatformStyle } from "@gpuixui/tokens";',
      );
    }
  });

  it("is the same file every time it is printed", () => {
    for (const name of platformNames) {
      expect(platformStyleSource(name)).toBe(platformStyleSource(name));
      expect(platformStyleLiteral(platformStyles[name])).toBe(
        platformStyleLiteral(platformStyles[name]),
      );
    }
  });
});

describe("the platform style source on the page", () => {
  const page = read("content/docs/theming.mdx");
  const registry = read("src/components/mdx.tsx");

  it("mounts the control the page teaches", () => {
    expect(page).toContain("### Take a platform style");
    expect(page).toContain("<PlatformStyleSource />");
    expect(registry).toContain("PlatformStyleSource");
  });

  it("says the copy is the library's and what inherits", () => {
    const section = page
      .slice(
        page.indexOf("### Take a platform style"),
        page.indexOf("### The look picker"),
      )
      .replace(/\s+/g, " ");

    expect(section).toContain("`platformStyles`");
    expect(section).toContain(
      "A colour role you delete from `colors` keeps the base theme's value",
    );
    expect(section).toContain(
      "the required fields are what make the object a style",
    );
    expect(section).toContain("edit any value");
  });

  it("offers every platform the switch carries", () => {
    const markup = renderToStaticMarkup(<PlatformStyleSource />);

    for (const name of platformNames) {
      expect(markup).toContain(`>${platformStyles[name].label}</button>`);
    }
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Copy style");
    expect(markup).toContain('data-platform-style="darwin"');
  });
});

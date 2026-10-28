import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  classesToStyle,
} from "@gpuixui/tw";
import { themes } from "@gpuixui/tokens";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every control a drawing presents as a button paints the library's Button.
 *
 * Guarded bug: the badge page's `All` / `Failed` / `Running` filters were
 * bordered boxes with their own padding, font and hover — a second button shape
 * that no component owned. The same hand-rolled chrome was spread across the
 * drawings (carousel arrows, table paging, the copy action, the settings
 * toggles), so this scans the whole docs app rather than one page: a class used
 * on a `<button>` or `<a>` that declares a 1px border and padding must be part
 * of the `.gx-btn` family, or belong to the component whose surface it is.
 *
 * The allowlist names the non-Button affordances the library itself ships: a
 * Select/DatePicker/Combobox trigger is the field recipe, a NumberField stepper
 * and a Slider thumb are the control's own parts, a ColorPicker swatch is a
 * colour, a context menu row is a row, and the skip link is the site's own
 * accessibility utility rather than a drawing.
 */

const root = new URL("../", import.meta.url);

const read = (relative: string): string =>
  readFileSync(new URL(relative, root), "utf8");

const COMPONENT_AFFORDANCES = new Set([
  "gx-select-trigger",
  "gx-date-trigger",
  "gx-combobox-trigger",
  "gx-nfield-step",
  "gx-slider-thumb",
  "gx-color-swatch",
  "gx-context-row",
]);

/** Files that are the site's own chrome, not a drawing of a component. */
const isChrome = (path: string): boolean =>
  path.includes("/landing/") ||
  path.endsWith("/theme-editor.tsx") ||
  path.endsWith("/recipe-source.tsx") ||
  path.endsWith("/platform-style-source.tsx") ||
  path.endsWith("/skip-link.tsx");

/** `class { … }` blocks whose declarations paint a bordered, padded box. */
const chromeClasses = (): ReadonlySet<string> => {
  const found = new Set<string>();
  for (const sheet of readdirSync(new URL("styles/", root))) {
    const css = read(`styles/${sheet}`).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, selectors = "", body = ""] of css.matchAll(
      /([^{}]+)\{([^{}]*)\}/g,
    )) {
      if (!/\bborder:\s*1px solid/.test(body) || !/\bpadding:/.test(body)) {
        continue;
      }
      for (const selector of selectors.split(",")) {
        const name = selector.trim().match(/^\.([\w-]+)/)?.[1];
        if (name !== undefined) found.add(name);
      }
    }
  }
  return found;
};

/** The class tokens of every `className` on a button or a link. */
const buttonClasses = (): ReadonlyArray<{
  readonly file: string;
  readonly tag: string;
  readonly classes: ReadonlyArray<string>;
}> => {
  const elements: Array<{
    file: string;
    tag: string;
    classes: ReadonlyArray<string>;
  }> = [];

  const walk = (directory: URL): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const child = new URL(
        `${entry.name}${entry.isDirectory() ? "/" : ""}`,
        directory,
      );
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(child);
        continue;
      }
      if (!entry.name.endsWith(".tsx") || entry.name.includes(".test.")) {
        continue;
      }
      if (isChrome(child.pathname)) continue;

      const source = readFileSync(child, "utf8");
      for (const [, tag = "", attrs = ""] of source.matchAll(
        /<(button|a)\b([^>]*)>/g,
      )) {
        const value = attrs.match(
          /className=(?:"([^"]*)"|`([^`]*)`|\{([^}]*)\})/,
        );
        const classes = (value?.[1] ?? value?.[2] ?? value?.[3] ?? "").match(
          /[A-Za-z][\w-]*/g,
        );
        if (classes !== null && classes !== undefined) {
          elements.push({ file: child.pathname, tag, classes });
        }
      }
    }
  };

  walk(new URL("components/", root));
  return elements;
};

describe("drawing buttons", () => {
  it("paint the shared .gx-btn family, never a second button chrome", () => {
    const chrome = chromeClasses();
    const offenders = buttonClasses().flatMap(({ file, tag, classes }) => {
      if (classes.some((name) => name.startsWith("gx-btn"))) return [];
      return classes
        .filter((name) => chrome.has(name) && !COMPONENT_AFFORDANCES.has(name))
        .map((name) => `${file.split("/docs/").at(-1)}: <${tag}> .${name}`);
    });

    expect(offenders.join("\n")).toBe("");
  });

  it("read the Button recipe's size and the theme's variant fills", () => {
    // The drawings transcribe the recipe, so the small action is the recipe's
    // `sm` height — the density step, not a number the sheet chose — and the
    // pressed filter's fill is the recipe's `secondary` variant.
    const sm = classesToStyle(
      `${BUTTON_BASE} ${BUTTON_SIZES.sm} ${BUTTON_VARIANTS.secondary}`,
      themes.dark,
    ).style;
    const css = read("styles/demos.css");
    const block = (selector: string): string => {
      const start = css.indexOf(`\n${selector} {`);
      if (start === -1) throw new Error(`no ${selector} block`);
      return css.slice(start, css.indexOf("}", start));
    };

    expect(sm.height).toBe(themes.dark.density.controlHeight.sm);
    expect(block(".gx-btn-sm")).toContain("height: var(--control-height-sm);");
    expect(sm.backgroundColor).toBe(themes.dark.colors.secondary);
    expect(block(".gx-btn-secondary")).toContain(
      "background: var(--secondary);",
    );
    expect(block(".gx-btn-outline")).toContain("border-color: var(--border);");
  });
});

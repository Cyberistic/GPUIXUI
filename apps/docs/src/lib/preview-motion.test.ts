import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A preview may move; it may not move a reader who asked it not to.
 *
 * The library ships a motion policy (`prefers-reduced-motion`, a zero-duration
 * assignment on the native side), and the previews that draw the same
 * components animate their own keyframes — a chart growing in, a toast leaving,
 * a spinner turning, a skeleton pulsing. Those drawings are browser code, so
 * none of them reach the runtime's policy: each needs its own
 * `@media (prefers-reduced-motion: reduce)` rule. Measured before this guard,
 * four animated parts kept moving under the preference: a chart column, a
 * leaving toast, a collapsing body and a copy button's glyph.
 *
 * The scan is structural rather than a list: every rule that declares an
 * `animation` names the class it animates (the selector's last compound), and
 * that class has to appear in a reduced-motion block in the same style sheet.
 * A new animated part without a guard fails by name, and a guard whose class no
 * rule animates is not counted, so the two sides cannot drift.
 */

const styles = new URL("../styles/", import.meta.url);
const root = new URL("../../../../", import.meta.url);
const policy = readFileSync(new URL("docs/preview-strategy.md", root), "utf8");

interface StyleSheet {
  readonly name: string;
  readonly css: string;
}

const sheets: ReadonlyArray<StyleSheet> = readdirSync(styles)
  .filter((name) => name.endsWith(".css"))
  .toSorted()
  .map((name) => ({
    name,
    css: readFileSync(new URL(name, styles), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    ),
  }));

/** The bodies of every block opened by `needle`, brace-matched. */
const blocksAt = (css: string, needle: string): ReadonlyArray<string> => {
  const blocks: Array<string> = [];
  let from = 0;

  for (;;) {
    const at = css.indexOf(needle, from);
    if (at === -1) return blocks;
    const open = css.indexOf("{", at);
    if (open === -1) return blocks;

    let depth = 0;
    let end = open;
    for (; end < css.length; end += 1) {
      if (css[end] === "{") depth += 1;
      if (css[end] === "}" && (depth -= 1) === 0) break;
    }

    blocks.push(css.slice(open + 1, end));
    from = end + 1;
  }
};

const reduceBlocks = (css: string): ReadonlyArray<string> =>
  blocksAt(css, "@media (prefers-reduced-motion: reduce)");

const classesIn = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(/\.([a-zA-Z][\w-]*)/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

/** A reduced-motion block's classes: the parts that stop under the preference. */
const guardedClasses = (css: string): ReadonlySet<string> =>
  new Set(reduceBlocks(css).flatMap(classesIn));

interface AnimatedRule {
  readonly selector: string;
  /** The class the rule animates; a selector with no class cannot be guarded. */
  readonly subject: string | undefined;
}

/** Every rule that turns an animation on, with the class it applies to. */
const animatedRules = (css: string): ReadonlyArray<AnimatedRule> =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((match) => {
    const selector = (match[1] ?? "").trim();
    const body = match[2] ?? "";
    if (selector.startsWith("@")) return [];
    if (!/animation(?:-name)?\s*:/.test(body)) return [];
    if (/animation\s*:\s*none/.test(body)) return [];
    return selector.split(",").flatMap((part) => {
      const classes = classesIn(part);
      return [{ selector, subject: classes.at(-1) }];
    });
  });

describe("the previews' motion", () => {
  it("collapses every drawn animation when the reader asks for less motion", () => {
    const unguarded = sheets.flatMap((sheet) => {
      const guarded = guardedClasses(sheet.css);
      return animatedRules(sheet.css).flatMap((rule) =>
        rule.subject !== undefined && guarded.has(rule.subject)
          ? []
          : [`${sheet.name}: ${rule.selector}`],
      );
    });

    expect(unguarded).toEqual([]);
  });

  it("scans the style sheets rather than passing on an empty walk", () => {
    // Floors: a parser that stopped matching would otherwise report no gap.
    const animated = sheets.flatMap((sheet) => animatedRules(sheet.css));
    const guarded = sheets.flatMap((sheet) => [...guardedClasses(sheet.css)]);

    expect(animated.length).toBeGreaterThanOrEqual(20);
    expect(guarded.length).toBeGreaterThanOrEqual(10);
  });

  it("states the policy and the guard that holds it", () => {
    expect(policy).toContain(
      "### A preview honours the reader's motion preference",
    );
    expect(policy).toContain("prefers-reduced-motion");
    expect(policy).toContain("preview-motion.test.ts");
  });
});

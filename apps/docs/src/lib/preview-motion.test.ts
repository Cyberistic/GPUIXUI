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
 * `@media (prefers-reduced-motion: reduce)` rule. A movement transition is the
 * same kind of journey — a thumb sliding, a chart growing, a picture zooming —
 * and is collapsed the same way.
 *
 * A source scan before this guard found four animated parts still moving (a
 * chart column, a leaving toast, a collapsing body, a copy button's glyph) and
 * eight movement transitions still travelling (a settings knob, a switch thumb,
 * a carousel dot, a liquid fill, a magnetic card, an image zoom, a motion-grid
 * cell and a preview picture).
 *
 * The scan is structural rather than a list: every rule that turns on
 * `animation` or a geometric transition names the selector it applies to, and
 * that selector (or its subject compound) has to appear in a reduced-motion
 * block that stops the same property in the same style sheet. A new moving part
 * without a guard fails by name.
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

/** A selector's subject compound, without the state that narrows it. */
const subjectOf = (selector: string): string =>
  (
    selector
      .trim()
      .split(/[\s>+~]+/)
      .at(-1) ?? selector.trim()
  )
    .replace(/\[[^\]]*\]/g, "")
    .replace(/::?[a-zA-Z-]+(?:\([^)]*\))?/g, "");

/**
 * The selectors a reduced-motion block collapses for one property.
 *
 * The property matters: a block that stops an animation does not stop a
 * movement transition. The selector matters too: `.gx-imagezoom` stopping its
 * own transition does not stop the `img` inside it, so a rule is covered only
 * by a guard for itself or for its subject compound.
 */
const surrendered = (
  css: string,
  property: "animation" | "transition",
): ReadonlySet<string> => {
  const stopped = new RegExp(`${property}\\s*:\\s*none`);
  return new Set(
    reduceBlocks(css).flatMap((block) =>
      [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((match) =>
        stopped.test(match[2] ?? "")
          ? (match[1] ?? "").split(",").map(subjectOf)
          : [],
      ),
    ),
  );
};

interface MotionRule {
  readonly selector: string;
}

/** The selectors that turn on a property. */
const motionRules = (
  css: string,
  picks: (body: string) => boolean,
): ReadonlyArray<MotionRule> =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((match) => {
    const selector = (match[1] ?? "").trim();
    const body = match[2] ?? "";
    if (selector.startsWith("@") || !picks(body)) return [];
    return selector.split(",").map((part) => ({
      selector: part.trim(),
    }));
  });

const animated = (css: string): ReadonlyArray<MotionRule> =>
  motionRules(
    css,
    (body) =>
      /animation(?:-name)?\s*:/.test(body) &&
      !/animation\s*:\s*none/.test(body),
  );

/** A transition that moves a part: the properties a reader would see travel. */
const MOVEMENT = /\b(?:left|right|top|bottom|width|height|transform)\b/;

const travelling = (css: string): ReadonlyArray<MotionRule> =>
  motionRules(css, (body) => {
    const transition = /transition\s*:\s*([^;]+)/.exec(body)?.[1];
    return transition !== undefined && MOVEMENT.test(transition);
  });

/** A rule's class, guarded for the property that rule turns on. */
const unguarded = (
  sheet: StyleSheet,
  rules: ReadonlyArray<MotionRule>,
  property: "animation" | "transition",
): ReadonlyArray<string> => {
  const guarded = surrendered(sheet.css, property);
  return rules.flatMap((rule) =>
    guarded.has(rule.selector) || guarded.has(subjectOf(rule.selector))
      ? []
      : [`${sheet.name}: ${rule.selector}`],
  );
};

describe("the previews' motion", () => {
  it("collapses every drawn animation when the reader asks for less motion", () => {
    expect(
      sheets.flatMap((sheet) =>
        unguarded(sheet, animated(sheet.css), "animation"),
      ),
    ).toEqual([]);
  });

  it("collapses every movement transition too", () => {
    expect(
      sheets.flatMap((sheet) =>
        unguarded(sheet, travelling(sheet.css), "transition"),
      ),
    ).toEqual([]);
  });

  it("scans the style sheets rather than passing on an empty walk", () => {
    // Floors: a parser that stopped matching would otherwise report no gap.
    const animations = sheets.flatMap((sheet) => animated(sheet.css));
    const transitions = sheets.flatMap((sheet) => travelling(sheet.css));
    const guards = sheets.flatMap((sheet) => [
      ...surrendered(sheet.css, "animation"),
      ...surrendered(sheet.css, "transition"),
    ]);

    expect(animations.length).toBeGreaterThanOrEqual(20);
    expect(transitions.length).toBeGreaterThanOrEqual(10);
    expect(guards.length).toBeGreaterThanOrEqual(20);
  });

  it("states the policy and the guard that holds it", () => {
    expect(policy).toContain(
      "### A preview honours the reader's motion preference",
    );
    expect(policy).toContain("prefers-reduced-motion");
    expect(policy).toContain("preview-motion.test.ts");
  });
});

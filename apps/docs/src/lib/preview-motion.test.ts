import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

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

const subjectOf = (selector: string): string =>
  (
    selector
      .trim()
      .split(/[\s>+~]+/)
      .at(-1) ?? selector.trim()
  )
    .replace(/\[[^\]]*\]/g, "")
    .replace(/::?[a-zA-Z-]+(?:\([^)]*\))?/g, "");

const surrendered = (
  css: string,
  property: "animation" | "transition",
): ReadonlySet<string> => {
  const stopped = new RegExp(`${property}\\s*:\\s*none`);
  return new Set(
    reduceBlocks(css).flatMap((block) =>
      [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((match) =>
        stopped.test(match[2] ?? "")
          ? (match[1] ?? "").split(",").map((part) => part.trim())
          : [],
      ),
    ),
  );
};

interface MotionRule {
  readonly selector: string;
}

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

const MOVEMENT = /\b(?:left|right|top|bottom|width|height|transform)\b/;

const travelling = (css: string): ReadonlyArray<MotionRule> =>
  motionRules(css, (body) => {
    const transition = /transition\s*:\s*([^;]+)/.exec(body)?.[1];
    return transition !== undefined && MOVEMENT.test(transition);
  });

const unguarded = (
  sheet: StyleSheet,
  rules: ReadonlyArray<MotionRule>,
  property: "animation" | "transition",
): ReadonlyArray<string> => {
  const guarded = surrendered(sheet.css, property);
  return rules.flatMap((rule) => {
    const subject = subjectOf(rule.selector);
    const stopped =
      guarded.has(rule.selector) ||
      (subject.includes(".") && guarded.has(subject));
    return stopped ? [] : [`${sheet.name}: ${rule.selector}`];
  });
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

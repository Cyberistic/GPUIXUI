import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { installedNativeDeclarations } from "./lib/native-declarations.testing";

/**
 * The bug guarded: `/docs/theming` had no motion section, so `motion` returned
 * Card, `animation` returned an Accordion limitation and `easing` returned
 * nothing, while the facts lived scattered across five component pages. The
 * section now states the runtime's animation surface, and this test reads the
 * installed declarations so it cannot outlive the API: a property the runtime
 * gains must be documented, a property it loses must be deleted, and the
 * page's "no transform" claim is checked against the declaration itself.
 *
 * `readFileSync` is deliberate: `apps/docs` has no Effect runtime and its
 * bundle must not import `effect`; every content guard here reads repository
 * files the same way (`typography-truth.test.ts`, `accessibility.test.ts`).
 */
const page = readFileSync(
  fileURLToPath(new URL("../content/docs/theming.mdx", import.meta.url)),
  "utf8",
);

const nativeDeclarations = installedNativeDeclarations().join("\n");

const reactDeclarations = readFileSync(
  join(
    dirname(createRequire(import.meta.url).resolve("@gpuix/react")),
    "index.d.ts",
  ),
  "utf8",
);

const tokensEntry = readFileSync(
  fileURLToPath(
    new URL("../../../packages/tokens/src/index.ts", import.meta.url),
  ),
  "utf8",
);

/** The body of one `interface`/`type` block, with brace nesting respected. */
export const interfaceBody = (source: string, name: string): string => {
  const start = source.search(
    new RegExp(`\\b(?:interface|type)\\s+${name}\\b[^{]*\\{`),
  );
  if (start === -1) return "";
  const open = source.indexOf("{", start);
  if (open === -1) return "";
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(open + 1, index);
  }
  return "";
};

/** The top-level property names of an interface body. */
export const propertyNames = (body: string): ReadonlyArray<string> =>
  body
    .split("\n")
    .filter((line) => !line.includes("{"))
    .flatMap((line) => {
      const match = /^\s*(\w+)\??:/.exec(line)?.[1];
      return match === undefined ? [] : [match];
    });

/** The string-literal members of a union type alias. */
export const unionLiterals = (
  source: string,
  name: string,
): ReadonlyArray<string> => {
  const declaration = new RegExp(`type\\s+${name}\\s*=([^;]+);`).exec(source);
  const body = declaration?.[1];
  if (body === undefined) return [];
  return [...body.matchAll(/"([^"]+)"/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

const section = ((): string => {
  const start = page.indexOf("## Motion");
  if (start === -1) return "";
  const end = page.indexOf("\n## ", start + 1);
  return end === -1 ? page.slice(start) : page.slice(start, end);
})();

/** The `MotionStyle` rows the section's table declares. */
const documentedFields = [...section.matchAll(/^\| `(\w+)` \|/gm)].flatMap(
  (match) => (match[1] === undefined ? [] : [match[1]]),
);

/** Whether the runtime's animated style can transform a layer (plan 600). */
export const hasTransformStyle = (declarations: string): boolean =>
  propertyNames(interfaceBody(declarations, "MotionStyle")).includes(
    "transform",
  );

const styleFields = propertyNames(
  interfaceBody(nativeDeclarations, "MotionStyle"),
);
const transitionFields = propertyNames(
  interfaceBody(nativeDeclarations, "MotionTransition"),
);
const easingNames = unionLiterals(nativeDeclarations, "MotionEase");

const pageNames = (name: string): boolean =>
  new RegExp(`\\b${name.replace(".", "\\.")}\\b`).test(section);

describe("the motion section is the installed runtime's", () => {
  it("parses an interface body and skips a nested block", () => {
    const fixture = `export interface MotionStyle {
  opacity?: number;
  nested?: { hidden?: number };
  top?: number;
}`;
    expect(propertyNames(interfaceBody(fixture, "MotionStyle"))).toEqual([
      "opacity",
      "top",
    ]);
  });

  it("finds the runtime's animated properties", () => {
    expect(styleFields.length).toBeGreaterThan(0);
    expect(styleFields).toContain("opacity");
  });

  it("documents every property the runtime can animate", () => {
    expect(
      documentedFields.filter((field) => !styleFields.includes(field)),
    ).toEqual([]);
    expect(
      styleFields.filter((field) => !documentedFields.includes(field)),
    ).toEqual([]);
  });

  it("claims no transform only while the runtime has none", () => {
    expect(hasTransformStyle(nativeDeclarations)).toBe(false);
    expect(section).toMatch(/no transform/i);
  });

  it("notices a runtime that gains a transform", () => {
    const withTransform = `export interface MotionStyle {
  opacity?: number;
  transform?: string;
}`;
    expect(hasTransformStyle(withTransform)).toBe(true);
  });

  it("names every timing field and easing literal", () => {
    expect(transitionFields.length).toBe(3);
    expect(transitionFields.filter((field) => !pageNames(field))).toEqual([]);
    expect(easingNames.filter((name) => !pageNames(name))).toEqual([]);
  });

  it("names the animation API the package exports", () => {
    const api = [
      "motion.div",
      "AnimatePresence",
      "usePresence",
      "useIsPresent",
    ];
    expect(api.filter((name) => !pageNames(name))).toEqual([]);
    const exports = [
      "motion",
      "AnimatePresence",
      "usePresence",
      "useIsPresent",
    ];
    expect(exports.filter((name) => !reactDeclarations.includes(name))).toEqual(
      [],
    );
  });

  it("states the token gap the package still has", () => {
    expect(tokensEntry).not.toMatch(/"\.\/motion\.js"/);
    expect(section).toMatch(/no motion group/i);
    expect(tokensEntry.match(/from "\.\/([\w-]+)\.js"/g)).toEqual([
      'from "./color.js"',
      'from "./elevation.js"',
      'from "./platforms.js"',
      'from "./scale.js"',
      'from "./styles.js"',
      'from "./theme.js"',
      'from "./typography.js"',
    ]);
  });
});

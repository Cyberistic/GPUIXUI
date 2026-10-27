import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A scene that aligns its children must be a flex container — unless it is an
 * element that already carries `gx-demo`, whose rules make it one.
 *
 * Guarded bug: `.gx-demo-list` declared `justify-content: center` on a plain
 * div, so the property did nothing and the list card sat at the start of the
 * row instead of centred.
 */

const css = readFileSync(
  new URL("../../src/styles/demos.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const docs = new URL("../../src/components/docs/", import.meta.url);
const sources = readdirSync(docs)
  .filter((file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"))
  .map((file) => readFileSync(new URL(file, docs), "utf8"));

/** Classes that appear beside `gx-demo` in one className string. */
const withDemo = new Set(
  sources.flatMap((source) =>
    [...source.matchAll(/className="([^"]*)"/g)]
      .map((match) => match[1] ?? "")
      .filter((value) => value.split(/\s+/).includes("gx-demo"))
      .flatMap((value) => value.split(/\s+/)),
  ),
);

const scenes = [
  ...css.matchAll(/(\.gx-(?:demo-[a-z-]+|[a-z-]+-scene))\s*\{([^}]*)\}/g),
];

describe("the demo scenes", () => {
  it("makes every scene that aligns its children a flex container", () => {
    const broken = scenes
      .filter(([, , body]) => /justify-content|align-items/.test(body ?? ""))
      .filter(([, , body]) => !/display\s*:/.test(body ?? ""))
      .map(([, selector]) => selector)
      .filter(
        (selector) =>
          selector !== undefined && !withDemo.has(selector.slice(1)),
      );

    expect(broken).toEqual([]);
  });

  it("reads the scenes and the elements that already carry gx-demo", () => {
    expect(scenes.length).toBeGreaterThan(20);
    expect(withDemo.has("gx-demo")).toBe(true);
  });
});

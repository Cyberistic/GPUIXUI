import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accessibilityViolations,
  ariaAttributesInHostProps,
  missingAria,
  supportedAria,
} from "./accessibility";

/**
 * The bug guarded: `/docs/accessibility` tells a reader which ARIA attributes
 * the pinned runtime accepts and which it lacks. That is a claim about the
 * installed `@gpuix/native` package, and a dependency change can falsify it
 * silently — the page still builds, the tables still render, and a reader is
 * told a capability exists (or does not) when the opposite is true. The test
 * parses `interface HostProps` from the installed declarations, so the module
 * is the only authored copy and the package is the source.
 *
 * `node:fs` is test-only and deliberate: `apps/docs` has no Effect runtime, its
 * bundle must not import `effect` (`architecture.test.ts`), and every content
 * guard here reads repository files the same way (`typography-truth.test.ts`,
 * `component-truth.test.ts`). The Effect FileSystem service has no place in a
 * Vitest content check that never reaches the browser.
 */
const resolve = createRequire(import.meta.url).resolve;
const nativeRoot = dirname(resolve("@gpuix/native"));

/** Every declaration file the installed native package ships. */
const declarations = (root: string): ReadonlyArray<string> =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const path = join(root, entry.name);
    if (entry.isDirectory()) return declarations(path);
    return entry.name.endsWith(".d.ts") ? [readFileSync(path, "utf8")] : [];
  });

const fixture = `export interface BaseProps { testId?: string }
export interface HostProps extends BaseProps {
  role?: string;
  "aria-label"?: string;
  "aria-valuetext"?: string;
  aria_hidden?: string;
}
export interface VirtualListShared { "aria-hidden"?: boolean }`;

const supported = [
  { attribute: "aria-label", meaning: "The name." },
  { attribute: "aria-valuetext", meaning: "The value." },
];

const missing = [
  { attribute: "aria-checked", substitute: "State rides on aria-valuetext." },
];

describe("the ARIA surface is the installed runtime's", () => {
  it("parses only quoted keys inside HostProps", () => {
    expect(ariaAttributesInHostProps(fixture)).toEqual([
      "aria-label",
      "aria-valuetext",
    ]);
  });

  it("reports a supported attribute the declarations do not declare", () => {
    expect(
      accessibilityViolations({
        declarations: fixture,
        supported: [...supported, { attribute: "aria-checked", meaning: "x" }],
        missing,
      }),
    ).toContain(
      "aria-checked is listed as supported but HostProps does not declare it",
    );
  });

  it("reports an absent attribute the declarations do declare", () => {
    expect(
      accessibilityViolations({
        declarations: fixture,
        supported,
        missing: [
          ...missing,
          { attribute: "aria-label", substitute: "not a real gap" },
        ],
      }),
    ).toContain("aria-label is listed as absent but HostProps declares it");
  });

  it("reports an attribute the declarations gained and neither list classifies", () => {
    expect(
      accessibilityViolations({
        declarations: fixture.replace(
          '"aria-valuetext"?: string;',
          '"aria-valuetext"?: string;\n  "aria-expanded"?: boolean;',
        ),
        supported,
        missing,
      }),
    ).toContain(
      "aria-expanded is declared by HostProps but neither list classifies it",
    );
  });

  it("reports an attribute classified twice and a repeated row", () => {
    expect(
      accessibilityViolations({
        declarations: fixture,
        supported: [
          ...supported,
          { attribute: "aria-label", meaning: "The name, again." },
        ],
        missing: [...missing, { attribute: "aria-label", substitute: "x" }],
      }),
    ).toEqual(
      expect.arrayContaining([
        "the supported list repeats an attribute",
        "aria-label is classified as both supported and absent",
      ]),
    );
  });

  it("reports a row with no meaning or substitute", () => {
    expect(
      accessibilityViolations({
        declarations: fixture,
        supported: [{ attribute: "aria-label", meaning: " " }],
        missing: [{ attribute: "aria-checked", substitute: "" }],
      }),
    ).toEqual(
      expect.arrayContaining([
        "aria-label has no meaning",
        "aria-checked has no substitute",
      ]),
    );
  });

  it("agrees with the installed package in both directions", () => {
    expect(
      accessibilityViolations({
        declarations: declarations(nativeRoot).join("\n"),
        supported: supportedAria,
        missing: missingAria,
      }),
    ).toEqual([]);
  });
});

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  allStateFields,
  fieldFrequency,
  partStates,
  type StateSource,
} from "./lib/part-states";

/**
 * The bug guarded (plan 622): `/docs/component-api#state-aware-styles` said the
 * state vocabulary was fixed to ten fields, but the package declares 25
 * exported `*State` interfaces with 27 distinct fields; five of the ten appear
 * in one type each, `status` appears twice and was unlisted, and
 * `ComboboxItemState` is imported from `@gpuix/react` rather than exported here.
 * The paragraph now states the ownership rule and the real examples.
 *
 * This suite reads the component sources so a renamed field, a moved example or
 * a type that stops being exported fails by name. `node:fs` is test-only, as on
 * the other content guards.
 */

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const componentRoot = join(repoRoot, "packages/components/src");
const page = readFileSync(
  join(repoRoot, "apps/docs/content/docs/component-api.mdx"),
  "utf8",
);

const isComponentSource = (name: string): boolean =>
  /\.(ts|tsx)$/.test(name) &&
  !/\.test\.(ts|tsx)$/.test(name) &&
  !name.startsWith("behaviour/");

const sources: ReadonlyArray<StateSource> = readdirSync(componentRoot, {
  recursive: true,
  encoding: "utf8",
})
  .filter(isComponentSource)
  .map((name) => ({
    path: `packages/components/src/${name}`,
    text: readFileSync(join(componentRoot, name), "utf8"),
  }));

const states = partStates(sources);
const names = new Set(states.map((state) => state.name));
const fields = allStateFields(states);
const componentSource = sources.map((source) => source.text).join("\n");

const section = ((): string => {
  const start = page.indexOf("## State-aware styles");
  const next = page.indexOf("\n## ", start + "## State-aware styles".length);
  return start === -1 ? "" : page.slice(start, next === -1 ? undefined : next);
})();

/** A state type is real when the package exports it or a part imports it. */
const importedFromRuntime = (name: string): boolean =>
  new RegExp(
    `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*"@gpuix/react"`,
    "s",
  ).test(componentSource);

const RECURRING = ["active", "disabled", "focused", "highlighted", "open"];
const PART_SPECIFIC = ["editing", "pinned", "unread", "status"];
const PAIRS = [
  ["editing", "InlineEditState"],
  ["pinned", "MessageScrollerState"],
  ["unread", "MessageScrollerState"],
  ["status", "StepperStepState"],
  ["status", "TimelineItemState"],
] as const;

describe("the part-state contract", () => {
  it("parses the real package, not a remembered list", () => {
    expect(states.length).toBeGreaterThanOrEqual(20);
    expect(fields.size).toBeGreaterThanOrEqual(20);
  });

  it("names recurring fields that really recur", () => {
    const missing = RECURRING.filter(
      (field) => !fields.has(field) || fieldFrequency(states, field) < 2,
    );
    expect(missing).toEqual([]);
  });

  it("names part-specific fields and the types that declare them", () => {
    const missing = PART_SPECIFIC.filter((field) => !fields.has(field));
    expect(missing).toEqual([]);

    const missingFromPage = [...RECURRING, ...PART_SPECIFIC].filter(
      (field) => !section.includes(`\`${field}\``),
    );
    expect(missingFromPage).toEqual([]);

    const missingTypes = [...new Set(PAIRS.map(([, type]) => type))].filter(
      (type) => !section.includes(`\`${type}\``),
    );
    expect(missingTypes).toEqual([]);

    const wrong = PAIRS.filter(
      ([field, type]) =>
        !states.some(
          (state) => state.name === type && state.fields.includes(field),
        ),
    ).map(([field, type]) => `${field} is not on ${type}`);
    expect(wrong).toEqual([]);
  });

  it("resolves every state type the section names", () => {
    const named = [...section.matchAll(/`(\w+State)`/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    );
    expect(named.length).toBeGreaterThan(2);
    expect(
      named.filter((name) => !names.has(name) && !importedFromRuntime(name)),
    ).toEqual([]);
    expect(importedFromRuntime("ComboboxItemState")).toBe(true);
  });

  it("does not return to claiming one fixed vocabulary", () => {
    expect(section).not.toContain("vocabulary is fixed");
    expect(section).toContain("no single fixed vocabulary");
  });
});

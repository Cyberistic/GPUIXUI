/**
 * Holds `property-panel-lifecycle` to the shipped component and its own scene.
 *
 * The gap this guards: Tier 3's *Property panels* row cited `inspector-lifecycle`,
 * whose inspector is composed in the probe from primitives — no window had
 * mounted `@gpuixui/data`'s `PropertyPanel`, pressed an editable row's field or
 * measured the label column the panel's own header promises. If this probe is
 * rewritten around a local label/value list, the registry, the README and the
 * row would still name the shipped surface.
 *
 * The label column is derived from the package's `DEFAULT_LABEL_WIDTH` and the
 * scene's wide width, so the offset the record prints cannot drift from the
 * component's default without this file failing first.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own component, probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import { DEFAULT_LABEL_WIDTH } from "@gpuixui/data";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  PROPERTY_CHECKS,
  PROPERTY_IDS,
  PROPERTY_REST,
  PROPERTY_TYPED,
  PROPERTY_WIDE_LABEL,
  propertyField,
  propertyReadout,
  withTyped,
} from "./property-panel.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./property-panel-probe.tsx");
const readme = read("../../README.md");

/** The probe's README section, so a value printed elsewhere cannot pass. */
const section = (() => {
  const heading = "### `property-panel-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + heading.length);
  return readme.slice(start, end === -1 ? undefined : end);
})();

describe("the property scene's arithmetic", () => {
  it("paints the object it was handed and one typed value per row", () => {
    expect(propertyReadout(PROPERTY_REST)).toBe(
      "name= note= tag=internal owner=core",
    );
    const named = withTyped(PROPERTY_REST, "name");
    expect(named.name).toBe(PROPERTY_TYPED.name);
    expect(named.note).toBe("");
    // The whole object is reported, and the caller's is not mutated.
    expect(withTyped(named, "note").note).toBe(PROPERTY_TYPED.note);
    expect(withTyped(named, "note").name).toBe(PROPERTY_TYPED.name);
    expect(PROPERTY_REST.name).toBe("");
  });

  it("derives the value column's offset from the label width it is given", () => {
    // The wide panel's column is the width it adds over the package's default,
    // so the probe's 80-point check follows a changed `DEFAULT_LABEL_WIDTH`.
    expect(PROPERTY_WIDE_LABEL - DEFAULT_LABEL_WIDTH).toBe(80);
    expect(propertyField("name")).toBe("property-name");
  });

  it("counts the checks the probe asserts, the repeated helper included", () => {
    const sites = probe.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    const reads = probe.match(/box\(/g)?.length ?? 0;
    expect(PROPERTY_CHECKS).toBe(sites + reads - 1);
    expect(PROPERTY_CHECKS).toBe(18);
    expect(Arr.dedupe([PROPERTY_IDS.panel, PROPERTY_IDS.wide])).toHaveLength(2);
  });
});

describe("the probe mounts the shipped property panel", () => {
  it("composes the package's panel with both kinds of row", () => {
    expect(probe).toContain('from "@gpuixui/data"');
    expect(probe).toContain("<PropertyPanel");
    expect(probe).toContain('kind: "readonly"');
    expect(probe).toContain('kind: "editable"');
    // A read-only row carries no change; an editable one reports it.
    expect(probe).toContain("onChange:");
    expect(probe).not.toContain("LabelValue");
  });

  it("gives each panel the title and the label width it measures", () => {
    expect(probe).toContain('title="Properties"');
    expect(probe).toContain('title="Wide"');
    expect(probe).toContain("labelWidth={PROPERTY_WIDE_LABEL}");
    expect(probe).toContain("testId={PROPERTY_IDS.panel}");
    expect(probe).toContain("testId={PROPERTY_IDS.wide}");
  });
});

describe("the property-panel-lifecycle probe's record", () => {
  it("registers the probe once, over the workspace capability", () => {
    const entries = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "property-panel-lifecycle",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capability).toBe("workspace");
    expect(entries[0]?.title).toContain("PropertyPanel");
  });

  it("documents it under the version it was measured on", () => {
    expect(section).not.toBe("");
    const printed = Number(
      /(\d+) checks, `--only property-panel-lifecycle`/.exec(section)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(PROPERTY_CHECKS);
  });

  it("prints the columns the window read", () => {
    // The shared value column, the wide panel's column, the offset and the two
    // row tops are the measurement the panel's fixed-label rule rests on.
    Arr.forEach(
      ["**152**", "**232**", "**80**", "property-panel-edited"],
      (fact) => {
        expect(section).toContain(fact);
      },
    );
    expect(section).toContain("no field");
  });
});

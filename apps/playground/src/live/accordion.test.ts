/**
 * Holds `accordion-lifecycle` to the shipped component and to its own arithmetic.
 *
 * The gap this guards: every accordion rule was an offscreen read — one section
 * open, a disabled header refused, arrows moving focus — and no window had
 * painted the coordinated section or measured the body the reveal reports. If
 * this probe is rewritten around a local disclosure, the registry, the README
 * and the inventory row would still claim the library's `Accordion` while
 * measuring the fixture.
 *
 * The body heights are the scene's arithmetic: the shift a switch produces is
 * the difference of the two measured bodies, and the focus chain starts at the
 * header the press leaves focused, so a reordered move set fails here rather
 * than in a window.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe, component and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  ACCORDION_BODIES,
  ACCORDION_CHECKS,
  ACCORDION_DISABLED,
  ACCORDION_ENABLED,
  ACCORDION_IDS,
  ACCORDION_MOVES,
  ACCORDION_ORDER,
  ACCORDION_REST,
  ACCORDION_START,
  accordionBody,
  accordionClip,
  accordionReadout,
  accordionShift,
  accordionTrigger,
} from "./accordion.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./accordion-probe.tsx");
const readme = read("../../README.md");

/** The probe's README section, so a value printed elsewhere cannot pass. */
const section = (() => {
  const heading = "### `accordion-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + heading.length);
  return readme.slice(start, end === -1 ? undefined : end);
})();

describe("the accordion scene's arithmetic", () => {
  it("gives every section a distinct body, so a shift names its pair", () => {
    const heights = Arr.map(ACCORDION_ORDER, (section) => ACCORDION_BODIES[section]);
    expect(heights).toEqual([120, 200, 80, 60]);
    expect(Arr.dedupe(heights)).toHaveLength(heights.length);
    // The switch the probe reads, derived from the two bodies it switches
    // between: a taller section below a shorter one, so the sign is not zero.
    expect(accordionShift(ACCORDION_START, "beta")).toBe(80);
    expect(accordionShift("beta", ACCORDION_START)).toBe(-80);
  });

  it("starts on a reachable section and skips exactly one disabled header", () => {
    expect(Arr.contains(ACCORDION_ENABLED, ACCORDION_START)).toBe(true);
    expect(Arr.contains(ACCORDION_ENABLED, ACCORDION_DISABLED)).toBe(false);
    expect(ACCORDION_ENABLED).toEqual(["alpha", "beta", "delta"]);
  });

  it("drives one unbroken focus chain from the header a press leaves focused", () => {
    // A press on beta focuses beta; every later move starts where the one
    // before it landed, so the sequence is drivable by a reader in one pass.
    expect(ACCORDION_MOVES[0]?.from).toBe("beta");
    Arr.forEach(ACCORDION_MOVES, (move, index) => {
      expect(move.to).not.toBe(ACCORDION_DISABLED);
      expect(ACCORDION_MOVES[index + 1]?.from ?? move.to).toBe(move.to);
    });
    // Both edges wrap, and the two jumps reach the enabled ends.
    expect(ACCORDION_MOVES[0]?.to).toBe("delta");
    expect(ACCORDION_MOVES[1]?.to).toBe("alpha");
  });

  it("prints the one readout shape every state is checked against", () => {
    expect(accordionReadout(ACCORDION_REST)).toBe("open=alpha changes=0");
    expect(accordionReadout({ open: "none", changes: 0 })).toBe(
      "open=none changes=0",
    );
    expect(accordionReadout({ open: "delta", changes: 3 })).toBe(
      "open=delta changes=3",
    );
  });

  it("counts the checks the probe asserts, loop included", () => {
    // The move loop makes one assertion site five times, so the sites in the
    // source are one per check except for the four the loop repeats.
    const sites = probe.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(sites).toBe(ACCORDION_CHECKS - (ACCORDION_MOVES.length - 1));
    expect(ACCORDION_CHECKS).toBe(29);
  });

  it("keeps every locator apart", () => {
    const ids = Arr.flatten(
      Arr.map(ACCORDION_ORDER, (section) => [
        accordionTrigger(section),
        accordionClip(section),
        accordionBody(section),
      ]),
    );
    expect(Arr.dedupe([...ids, ACCORDION_IDS.probe, ACCORDION_IDS.readout]))
      .toHaveLength(ACCORDION_ORDER.length * 3 + 2);
    expect(accordionTrigger("gamma")).toBe("accordion-gamma-trigger");
  });
});

describe("the accordion-lifecycle probe's record", () => {
  it("registers the probe once, over the input capability", () => {
    const entries = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "accordion-lifecycle",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capability).toBe("input");
    expect(entries[0]?.title).toContain("Accordion");
  });

  it("documents it under the version it was measured on", () => {
    expect(section).not.toBe("");
    const printed = Number(
      /(\d+) checks, `--only accordion-lifecycle`/.exec(section)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(ACCORDION_CHECKS);
  });

  it("prints the scene and the shift the window read", () => {
    // A page that printed only fixture constants would claim no measurement.
    Arr.forEach(["120", "200", "80", "60"], (height) => {
      expect(section).toContain(`**${height}**`);
    });
    expect(section).toContain("accordion-single");
    expect(section).toContain("non-collapsible");
  });
});

describe("the probe mounts the shipped accordion", () => {
  it("composes the package's parts instead of a local disclosure", () => {
    expect(probe).toContain('} from "@gpuixui/components"');
    Arr.forEach(
      ["<Accordion", "<AccordionItem", "<AccordionTrigger", "<AccordionContent"],
      (part) => {
        expect(probe).toContain(part);
      },
    );
    expect(probe).not.toContain("<Collapsible");
  });

  it("drives single, non-collapsible mode with the disabled section in place", () => {
    expect(probe).toContain('type="single"');
    expect(probe).toContain("collapsible={false}");
    expect(probe).toContain("section === ACCORDION_DISABLED");
  });

  it("drops the content recipe's padding, so the clip is the body's number", () => {
    expect(probe).toContain('className="p-0 gap-0"');
    // The class is on the content part, not on a caller's own box.
    const content = probe.slice(probe.indexOf("<AccordionContent"));
    expect(content.slice(0, content.indexOf(">"))).toContain(
      'className="p-0 gap-0"',
    );
  });
});

/**
 * Holds the `radio-group-lifecycle` fixture, the probe that paints it and the
 * section a plan reads.
 *
 * The gap this guards: a radio group states its whole visible choice as one
 * filled disc in the chosen row, and its keyboard contract is one Tab stop with
 * the arrows selecting **and** moving real focus. The package's suites read
 * `aria-valuetext` and the resolved `StyleDesc`, so a disc that never reached
 * the glass, a ring that painted two stops wide, or a roving base taken from
 * the value a controlled owner kept would pass them. A window is the only place
 * those are measurable — and the group forwards its `testId` to the wrapper and
 * gives its rows none, so the probe presses the text a row paints and proves the
 * key arrived by the value it reported.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  fieldOf,
  countOf,
  isDiscWidth,
  isRingWidth,
  planReadout,
  RADIO_CHECKS,
  RADIO_CHOICES,
  RADIO_NONE,
  RADIO_OFF_CHOICES,
  RADIO_PLAN_CHOICES,
  RADIO_PLAN_VALUE,
  RADIO_SKIP_AFTER,
  RADIO_SKIP_CHOICES,
  RADIO_SKIP_INITIAL,
  radioReadout,
  radioRowId,
  selectionInk,
} from "./radio-group.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./radio-group-probe.tsx");
const registry = read("./registry.ts");
const readme = read("../../README.md");

/** The probe's own steps, so a count cannot be read out of another probe. */
const stepsOf = (): string => {
  const start = probe.indexOf("export const radioGroupSteps");
  return start === -1 ? "" : probe.slice(start);
};

/** This probe's README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `radio-group-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the readout", () => {
  it("prints a group's choice and its report count", () => {
    expect(radioReadout({ value: "", reports: 0 })).toBe("value= reports=0");
    expect(radioReadout({ value: "a1", reports: 2 })).toBe(
      "value=a1 reports=2",
    );
    expect(fieldOf("value= reports=0", "value")).toEqual(Option.some(""));
    expect(fieldOf("value=a1 reports=2", "value")).toEqual(Option.some("a1"));
    expect(countOf("value=a1 reports=2", "reports")).toEqual(Option.some(2));
    expect(fieldOf("value=a1 reports=2", "last")).toEqual(Option.none());
    // The field is matched after the start or a space, so an unbounded read for
    // `ports` cannot answer out of `reports`.
    expect(fieldOf("value=a1 reports=2", "ports")).toEqual(Option.none());
    expect(fieldOf("a(b=1", "a(b")).toEqual(Option.some("1"));
  });

  it("prints the value a declining owner kept beside the last report", () => {
    expect(
      planReadout({ value: RADIO_PLAN_VALUE, last: RADIO_NONE, reports: 0 }),
    ).toBe("value=p1 last=none reports=0");
    expect(
      planReadout({ value: RADIO_PLAN_VALUE, last: "p3", reports: 2 }),
    ).toBe("value=p1 last=p3 reports=2");
  });
});

describe("the fixture", () => {
  it("names every row once across the four groups", () => {
    const all = [
      ...RADIO_CHOICES,
      ...RADIO_SKIP_CHOICES,
      ...RADIO_OFF_CHOICES,
      ...RADIO_PLAN_CHOICES,
    ];
    // A repeated label would make a text press ambiguous, and a repeated value
    // would let one group's report stand in for another's.
    const labels = Arr.map(all, (choice) => choice.label);
    const values = Arr.map(all, (choice) => choice.value);
    expect(new Set(labels).size).toBe(labels.length);
    expect(new Set(values).size).toBe(values.length);
    // The rows are pressed by the words they paint, so a label may not be a
    // substring of another (the protocol's text locator is a contains match).
    expect(
      Arr.filter(
        labels,
        (label) =>
          Arr.length(
            Arr.filter(
              labels,
              (other) => other !== label && other.includes(label),
            ),
          ) > 0,
      ),
    ).toEqual([]);
  });

  it("carries exactly one disabled option, on the group an arrow has to cross", () => {
    const disabled = Arr.filter(
      [
        ...RADIO_CHOICES,
        ...RADIO_SKIP_CHOICES,
        ...RADIO_OFF_CHOICES,
        ...RADIO_PLAN_CHOICES,
      ],
      (choice) => choice.disabled === true,
    );
    expect(Arr.map(disabled, (choice) => choice.value)).toEqual(["s2"]);
    expect(RADIO_SKIP_INITIAL).toBe("s1");
    expect(RADIO_SKIP_AFTER).toBe("s3");
    // The option the disabled one sits between is what the arrow has to skip,
    // so the two ends are one step apart in the list.
    expect(Arr.map(RADIO_SKIP_CHOICES, (choice) => choice.value)).toEqual([
      "s1",
      "s2",
      "s3",
    ]);
  });

  it("addresses a row through the content it paints", () => {
    expect(radioRowId("pointer", "a1")).toBe("radio-row-pointer-a1");
    expect(radioRowId("skip", "s2")).toBe("radio-row-skip-s2");
    // Every group/value pair is its own address.
    const ids = Arr.flatMap(
      [
        ["pointer", RADIO_CHOICES],
        ["skip", RADIO_SKIP_CHOICES],
        ["off", RADIO_OFF_CHOICES],
        ["plan", RADIO_PLAN_CHOICES],
      ] as const,
      ([group, choices]) =>
        Arr.map(choices, (choice) => radioRowId(group, choice.value)),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tells the selection disc from the keyboard ring by width", () => {
    // The window measured a 16-point disc as 32 device pixels and the ring
    // around a row as 516 device pixels, in a 250-point group at scale 2.
    const groupWidth = 250 * 2;
    expect(isDiscWidth(32, groupWidth)).toBe(true);
    expect(isRingWidth(516, groupWidth)).toBe(true);
    // Neither test can be satisfied by the other shape.
    expect(isRingWidth(32, groupWidth)).toBe(false);
    expect(isDiscWidth(516, groupWidth)).toBe(false);
  });

  it("paints the disc and the ring in the theme's primary role", () => {
    // One role, so a width is the only thing a frame can use to tell them apart.
    expect(selectionInk("#A7A9FF")).toBe("#A7A9FF");
  });
});

describe("the probe", () => {
  it("mounts the shipped group in both of its option shapes", () => {
    expect(probe).toContain('from "@gpuixui/primitives"');
    expect(probe).toContain("RadioGroupItem");
    // Five groups: the pointer, keys, skip, off and declined measurements.
    expect(Arr.fromIterable(probe.matchAll(/<RadioGroup\n/g))).toHaveLength(5);
    // The keys group is data-driven (the other `radioItems` path) …
    expect(probe).toContain("options={RADIO_CHOICES}");
    // … and the four pressed groups list items so each row's text is named.
    expect(Arr.fromIterable(probe.matchAll(/choiceRow\("/g))).toHaveLength(4);
    expect(probe).toContain('choiceRow("pointer", theme)');
    expect(probe).toContain('choiceRow("skip", theme)');
    expect(probe).toContain('choiceRow("off", theme)');
    expect(probe).toContain('choiceRow("plan", theme)');
    expect(probe).toContain("testId={RADIO_IDS.pointer}");
    expect(probe).toContain("testId={RADIO_IDS.keys}");
    expect(probe).toContain("testId={RADIO_IDS.skip}");
    expect(probe).toContain("testId={RADIO_IDS.off}");
    expect(probe).toContain("testId={RADIO_IDS.plan}");
    // The Tab-stop pair is addressable, which is what the one-stop read needs.
    expect(probe).toContain("testId={RADIO_IDS.before}");
    expect(probe).toContain("testId={RADIO_IDS.after}");
  });

  it("presses a row through the address the fixture gives it", () => {
    expect(probe).toContain('ctx.host.click(radioRowId("pointer", "a1"))');
    expect(probe).toContain('ctx.host.click(radioRowId("skip", "s2"))');
    expect(probe).toContain('ctx.host.click(radioRowId("skip", "s1"))');
    expect(probe).toContain('ctx.host.click(radioRowId("off", "o1"))');
    expect(probe).toContain('ctx.host.click(radioRowId("plan", "p1"))');
    // The shipped rows carry no `testId`, and a text press is ambiguous
    // because the row and the text it paints both carry the label.
    expect(stepsOf()).not.toContain("clickText");
  });

  it("drives the pointer, the traversal, the keys, the skip and the roving base", () => {
    expect(stepsOf()).toContain("an unchosen group paints no primary ink");
    expect(stepsOf()).toContain("the chosen row paints the primary ink");
    expect(stepsOf()).toContain(
      "a press paints the selection disc, not the keyboard ring",
    );
    expect(stepsOf()).toContain(
      "keyboard focus paints the ring around its row",
    );
    expect(stepsOf()).toContain(
      "the keyboard ring is wider than a selection disc",
    );
    expect(stepsOf()).toContain(
      "Tab enters the group and the first arrow chooses the next row",
    );
    expect(stepsOf()).toContain("a typed prefix chooses the row it names");
    expect(stepsOf()).toContain("Home chooses the first row");
    expect(stepsOf()).toContain("End chooses the last row");
    expect(stepsOf()).toContain(
      "an arrow past the last row wraps to the first",
    );
    expect(stepsOf()).toContain("Space on the chosen row reports nothing");
    expect(stepsOf()).toContain("one Tab leaves the whole group");
    expect(stepsOf()).toContain("a disabled row refuses a press");
    expect(stepsOf()).toContain("an arrow steps over the disabled row");
    expect(stepsOf()).toContain("a disabled group reports nothing");
    expect(stepsOf()).toContain(
      "the second arrow continues from the focused row, not the kept value",
    );
    expect(stepsOf()).toContain(
      "Space chooses the row that holds focus, not the kept value",
    );
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    // The box, capture and crop helpers assert once per call, so the printed
    // count floors the sites in the steps.
    expect(RADIO_CHECKS).toBeGreaterThanOrEqual(sites);
    expect(RADIO_CHECKS).toBe(39);
  });
});

describe("the registry and the record", () => {
  it("declares the probe as an input the window can prove", () => {
    const meta = Arr.findFirst(
      liveRegistry,
      (entry) => entry.id === "radio-group-lifecycle",
    );
    expect(Option.map(meta, (entry) => entry.capability)).toEqual(
      Option.some("input"),
    );
    expect(registry).toContain('id: "radio-group-lifecycle"');
  });

  it("documents the probe under the version it was measured on", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${RADIO_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only radio-group-lifecycle`");
    expect(sectionOf()).toContain("radio-rest");
    expect(sectionOf()).toContain("radio-choice");
    expect(sectionOf()).toContain("radio-ring");
  });

  it("prints the readings the window took", () => {
    const section = sectionOf();
    // The disc's count, its 32x32 device box, and the ring's 4576 pixels in a
    // 516x64 box, inside one 250-point group at the capture's scale.
    expect(section).toContain("**0**");
    expect(section).toContain("**540**");
    expect(section).toContain("**32x32**");
    expect(section).toContain("**4576**");
    expect(section).toContain("**516x64**");
  });

  it("states the rules a plan needs", () => {
    const section = sectionOf();
    expect(section).toContain("The choice is a disc, the ring is the row");
    expect(section).toContain("The arrows wrap, and Space acts on the row");
    expect(section).toContain("The roving base is the focused row");
    expect(section).toContain("A row has no address of its own");
  });

  it("names the negative control the probe was held to", () => {
    expect(sectionOf()).toContain("horizontal");
    expect(sectionOf()).toContain("expected true, got false");
  });
});

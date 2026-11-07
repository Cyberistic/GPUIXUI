import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  Z_INDEX_BOX,
  Z_INDEX_CHECKS,
  Z_INDEX_FILLS,
  Z_INDEX_FLOW,
  Z_INDEX_FLOW_LEVEL,
  Z_INDEX_IDS,
  Z_INDEX_LEVELS,
  Z_INDEX_STACK,
  namesIn,
  namesOf,
  zIndexReadout,
} from "./z-index.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./z-index-probe.tsx");
const registry = read("./registry.ts");
const scenarios = read("./scenarios.tsx");
const augmentation = read("../gpuix-zindex.d.ts");
const readme = read("../../README.md");

const stepsOf = (): string => {
  const start = probe.indexOf("export const zIndexSteps");
  const next = probe.indexOf("\nexport ", start + 1);
  return probe.slice(start, next === -1 ? undefined : next);
};

const sectionOf = (): string => {
  const heading = "### `z-index-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the fixture", () => {
  it("orders the levels so tree order and paint order disagree", () => {
    expect(Z_INDEX_LEVELS.high).toBeGreaterThan(Z_INDEX_LEVELS.mid);
    expect(Z_INDEX_LEVELS.mid).toBeGreaterThan(Z_INDEX_LEVELS.low);
    expect(Z_INDEX_LEVELS.high).not.toBe(Z_INDEX_LEVELS.low);
  });

  it("gives every layer its own fill and every element its own id", () => {
    const fills = Object.values(Z_INDEX_FILLS);
    expect(new Set(fills).size).toBe(fills.length);
    const ids = Object.values(Z_INDEX_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the overlapping box inside its stack, so one point is all layers", () => {
    const centre = {
      x: Z_INDEX_BOX.left + Z_INDEX_BOX.width / 2,
      y: Z_INDEX_BOX.top + Z_INDEX_BOX.height / 2,
    };
    expect(centre.x).toBeLessThan(Z_INDEX_STACK.width);
    expect(centre.y).toBeLessThan(Z_INDEX_STACK.height);
  });

  it("gives the in-flow child a level above every positioned one", () => {
    expect(Z_INDEX_FLOW_LEVEL).toBeGreaterThan(Z_INDEX_LEVELS.high);
    expect(Z_INDEX_FLOW.width).toBe(Z_INDEX_STACK.width);
  });

  it("prints a hit list topmost first with unknown ids dropped", () => {
    const handles = [
      { id: 7, name: "high" },
      { id: 8, name: "mid" },
    ];
    expect(namesIn([8, 99, 7], handles)).toEqual(["mid", "high"]);
    expect(namesIn([], handles)).toEqual([]);
    expect(namesOf([])).toBe("none");
    expect(namesOf(["high", "mid"])).toBe("high,mid");
  });

  it("prints the three orders and the presses in one line", () => {
    expect(
      zIndexReadout({
        stack: ["high", "mid", "low"],
        plain: ["plain-mid", "plain-low", "plain-high"],
        flow: ["flow-cover", "flow-base"],
        presses: [],
      }),
    ).toBe(
      "stack=high,mid,low plain=plain-mid,plain-low,plain-high flow=flow-cover,flow-base presses=none",
    );
  });

  it("counts the checks the steps assert", () => {
    const assertions = stepsOf().match(/ctx\.expect/g) ?? [];
    expect(assertions.length).toBe(Z_INDEX_CHECKS);
  });
});

describe("the probe", () => {
  it("is registered under the layout capability and mounted by the runner", () => {
    expect(registry).toContain('id: "z-index-lifecycle"');
    expect(scenarios).toContain('"z-index-lifecycle": {');
    expect(scenarios).toContain("view: () => <ZIndexProbe />");
    expect(scenarios).toContain("steps: zIndexSteps");
    const entry = liveRegistry.find(
      (probe) => probe.id === "z-index-lifecycle",
    );
    expect(entry?.capability).toBe("layout");
  });

  it("sets a level only on the positioned boxes", () => {
    const positioned = probe.slice(
      probe.indexOf("const positioned"),
      probe.indexOf("const layered"),
    );
    const layered = probe.slice(
      probe.indexOf("const layered"),
      probe.indexOf("type Remember"),
    );
    expect(positioned).not.toContain("zIndex");
    expect(layered).toContain("zIndex: level");

    expect(probe).toContain(
      "level === undefined ? positioned(fill) : layered(fill, level)",
    );
    const plain = probe.slice(
      probe.indexOf("testId={Z_INDEX_IDS.plain}"),
      probe.indexOf("In-flow first"),
    );
    expect(plain).not.toContain("level=");
    expect(probe).toContain("zIndex: Z_INDEX_FLOW_LEVEL");
  });

  it("reads paint, the hit order and the press as three separate channels", () => {
    expect(probe).toContain("getElementsAt");
    expect(probe).toContain("ctx.host.capture(CAPTURE)");
    expect(probe).toContain("ctx.host.click(Z_INDEX_IDS.stack)");
  });

  it("declares the local binding's type for the field it sets", () => {
    expect(augmentation).toContain('declare module "@gpuix/native/host"');
    expect(augmentation).toContain("zIndex?: number");
  });
});

describe("the record", () => {
  it("documents the probe in registry order, with its count", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${Z_INDEX_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only z-index-lifecycle`");
  });

  it("prints the measured orders the probe asserts", () => {
    const section = sectionOf();
    expect(section).toContain("stack=high,mid,low");
    expect(section).toContain("plain=plain-mid,plain-low,plain-high");
    expect(section).toContain("flow=flow-cover,flow-base");
    expect(section).toContain("presses=high,plain-mid");
  });

  it("names the probe among those measured alone, and the registry's size", () => {
    const intro = /the\s+(\d+) probes a real window can prove/.exec(readme);
    expect(intro?.[1]).toBe(`${liveRegistry.length}`);
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`z-index-lifecycle`");
    expect(
      Arr.contains(
        Arr.map(liveRegistry, (probe) => probe.id),
        "z-index-lifecycle",
      ),
    ).toBe(true);
  });
});

import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  decodeReadout,
  localPoint,
  MOVED_BY,
  SURFACE_ORIGIN_NUDGE,
  SURFACE_ORIGIN_PROBE,
  SURFACE_ORIGIN_TARGET,
} from "./surface-origin.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

const measured =
  "pad=120 surface=1 probe=3 originX=16 originY=208 pointX=136 pointY=238 reportedX=16 reportedY=88";

describe("the readout the probe decodes", () => {
  it("reads every count and coordinate it publishes", () => {
    expect(
      Option.map(decodeReadout(measured), (line) => [
        line.pad,
        line.surface,
        line.probe,
        line.originX,
        line.originY,
        line.pointX,
        line.pointY,
        line.reportedX,
        line.reportedY,
      ]),
    ).toEqual(Option.some([120, 1, 3, 16, 208, 136, 238, 16, 88]));
  });

  it("refuses a word that is not a number, rather than reading a zero", () => {
    expect(
      Option.isNone(
        decodeReadout(measured.replace("originY=208", "originY=none")),
      ),
    ).toBe(true);
  });

  it("refuses a line that lost a field", () => {
    expect(Option.isNone(decodeReadout(measured.replace(" probe=3", "")))).toBe(
      true,
    );
  });

  it("reads a line with no pointer yet as absent", () => {
    expect(
      Option.isNone(
        decodeReadout(
          measured.replace("pointX=136 pointY=238", "pointX=none pointY=none"),
        ),
      ),
    ).toBe(true);
  });

  it("prints the spelling its schema reads", () => {
    const rendered =
      /pad=\$\{pad\}[\s\S]*?reportedY=\$\{yOf\(reported\)\}/.exec(scenarios);
    expect(rendered?.[0]).toContain("originX=${xOf(origin)}");
    expect(rendered?.[0]).toContain("pointY=${yOf(point)}");
    expect(rendered?.[0]).not.toContain("originx=");
  });
});

describe("the local point a pointer is read at", () => {
  const origin = { x: 16, y: 88 };

  it("subtracts the origin the box has now", () => {
    expect(localPoint(origin, { x: 136, y: 118 })).toEqual({ x: 120, y: 30 });
  });

  it("reads a point a panel's height off when the origin is the stale one", () => {
    expect(localPoint(origin, { x: 136, y: 118 + MOVED_BY }).y - 30).toBe(
      MOVED_BY,
    );
  });
});

describe("the probe's fixture", () => {
  it("nudges a one-pixel probe, which is the whole repair", () => {
    expect(scenarios).toContain("width: 1 + nudge");
    expect(scenarios).toContain("setNudge((value) => (value === 0 ? 1 : 0))");
    expect(scenarios).toContain("SURFACE_ORIGIN_NUDGE");
  });

  it("moves the surface by opening a panel above it, not by resizing it", () => {
    expect(scenarios).toContain("height: pad,");
    expect(scenarios).toContain("onClick={() => setPad(MOVED_BY)}");
  });

  it("gives the surface and its two probes three distinct ids", () => {
    expect(
      new Set([
        SURFACE_ORIGIN_PROBE,
        SURFACE_ORIGIN_TARGET,
        SURFACE_ORIGIN_NUDGE,
      ]).size,
    ).toBe(3);
  });

  it("reads the pointer on the element the pointer moves over", () => {
    expect(scenarios).toContain("onMouseMove={(event) => {");
    expect(scenarios).toContain("SURFACE_ORIGIN_TARGET");
  });
});

describe("the steps the probe asserts", () => {
  const start = scenarios.indexOf("const surfaceOriginSteps");
  const steps = scenarios.slice(
    start,
    scenarios.indexOf("\n/** How many pixels paint", start),
  );

  it("holds the stale report and the nudged one to the same move", () => {
    expect(steps).toContain(
      '"a moved surface delivers no layout report of its own"',
    );
    expect(steps).toContain(
      '"the nudged probe reports the origin the surface has now"',
    );
    expect(steps).toContain(
      '"the surface\'s own report would read the point a panel too far down"',
    );
  });

  it("proves the surface itself never resized", () => {
    expect(steps).toContain(
      '"neither the move nor the pointer read resized the surface"',
    );
  });
});

describe("the registry and the README", () => {
  it("registers the probe as a layout measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "surface-origin",
      title:
        "Layout: a surface moved by a layout above delivers no layout report, and a nudged one-pixel probe reports the origin it has now",
      capability: "layout",
    });
  });

  it("documents what the probe measured", () => {
    expect(readme).toContain("### `surface-origin` — measured on 0.11.0 here");
    expect(readme).toContain("a moved surface delivers no layout report");
    expect(readme).toContain("nudged one-pixel probe");
  });
});

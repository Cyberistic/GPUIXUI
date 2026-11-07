import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { STAGE, STAGE_MARKER, STAGE_TARGET } from "./shell-stage.js";
import { registry } from "./registry.js";

const probe = readFileSync(
  new URL("./shell-stage.tsx", import.meta.url),
  "utf8",
);
const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);
const shell = readFileSync(new URL("../app.tsx", import.meta.url), "utf8");
const chartView = readFileSync(
  new URL(
    "../../../../packages/data/examples/chart.example.tsx",
    import.meta.url,
  ),
  "utf8",
);

const idOf = (found: Option.Option<{ readonly id: string }>): string =>
  Option.match(found, { onNone: () => "", onSome: (scenario) => scenario.id });

const tallId = idOf(
  Arr.findFirst(registry, (scenario) => scenario.id === STAGE_TARGET),
);
const firstId = idOf(Arr.head(registry));

const asserted = (text: string): number =>
  Arr.length(Arr.fromIterable(text.matchAll(/ctx\.expect[A-Za-z]*\(/g)));

describe("the shell-stage-scroll probe", () => {
  it("presses the tall entry, which the app does not open on", () => {
    expect(firstId).not.toBe("");
    expect(tallId).toBe(STAGE_TARGET);
    expect(tallId).not.toBe(firstId);
  });

  it("reads a marker the pressed entry's own view declares", () => {
    expect(chartView).toContain(`testId="${STAGE_MARKER}"`);
    expect(probe).toContain("STAGE_MARKER");
  });

  it("reads a stage the shell declares as a scroller", () => {
    expect(shell).toContain(`testId="${STAGE}"`);
    expect(shell).toContain('overflow: "scroll"');
  });

  it("prints the number of checks the probe asserts", () => {
    const count = asserted(probe);
    expect(count).toBeGreaterThan(8);
    expect(readme).toContain(`**${count} checks**`);
    expect(readme).toContain("--only shell-stage-scroll");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const source = readFileSync(
  new URL("../panels/split-pane.tsx", import.meta.url),
  "utf8",
);

const splitSteps = (() => {
  const start = scenarios.indexOf("const splitSteps");
  const end = scenarios.indexOf("\nconst ", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

const splitSection = (() => {
  const heading = "### `split-pane-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  const end = readme.indexOf("\n### ", start + heading.length);
  return start === -1 || end === -1 ? "" : readme.slice(start, end);
})();

describe("the split divider's keyboard contract", () => {
  it("prints the checks the probe runs, counting the paint reads", () => {
    const asserted = splitSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    const painted = splitSteps.match(/paintedBox\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(10);
    expect(painted).toBeGreaterThan(2);
    const printed = Number(
      /(\d+) checks, `--only split-pane-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(asserted + painted);
  });

  it("describes the divider as a control a keyboard can operate", () => {
    const prose = splitSection.replace(/\s+/g, " ");
    expect(prose).toContain('role="separator"');
    expect(prose).toContain("aria-valuetext");
    expect(prose).toContain("Home/End");
    expect(prose).toContain("keyboardFocusRing");
  });

  it("binds the keys the runtime reports, not the DOM's names", () => {
    expect(source).toContain("isResizeKey");
    expect(source).toContain("keySize");
    expect(splitSteps).toContain('ctx.host.key("left")');
    expect(splitSteps).toContain('ctx.host.key("home")');
    expect(splitSteps).not.toContain("ArrowLeft");
  });
});

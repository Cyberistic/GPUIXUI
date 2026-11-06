import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");

const stepsOf = (name: string): string => {
  const start = scenarios.indexOf(
    `const ${name}: Smoke.AsyncSmokeScenario["steps"]`,
  );
  expect(start, `${name} declares its steps`).toBeGreaterThan(-1);
  const end = scenarios.indexOf(
    "\nconst ",
    scenarios.indexOf("const ", start + 1),
  );
  return scenarios.slice(start, end === -1 ? undefined : end);
};

describe("the floating probes read a settled frame", () => {
  it("reads the popover's gap where the panel rests", () => {
    const steps = stepsOf("popoverSteps");
    expect(steps).toContain('settleNumber(boxAxis("y")(ctx, "popover-panel"))');

    expect(steps).toContain("panelY - (trigger.y + trigger.height)");
  });

  it("reads the keyboard-placed context menu at rest on both axes", () => {
    const steps = stepsOf("contextMenuSteps");
    expect(steps).toContain('settleNumber(boxAxis("x")(ctx, "context-menu"))');
    expect(steps).toContain('settleNumber(boxAxis("y")(ctx, "context-menu"))');
    expect(steps).not.toContain('paintedBox(ctx, "context-menu")');
  });

  it("waits for the header menu's exit tween instead of one read", () => {
    const steps = stepsOf("headerMenuSteps");
    expect(steps).toContain('settleGone(ctx, "header-menu")');
    expect(steps).toContain('settleGone(ctx, headerCellId("status"))');

    expect(steps).not.toContain("Option.isNone(Option.fromNullishOr(bounds))");
  });
});

describe("a modal records its opener before its children exist", () => {
  it("expects the auto-focused field to return the focus to the opener", () => {
    const steps = stepsOf("modalFocusRestoreSteps");
    expect(steps).toContain('"restore-auto-trigger"');
    expect(steps).not.toContain('"none"');
  });
});

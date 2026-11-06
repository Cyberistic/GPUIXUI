import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const registry = read("./registry.ts");
const offscreen = read("../scenarios/focus.tsx");

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

describe("a window's focus pair and React's handlers", () => {
  it("the tabs probe asserts the traversal delivers no focus event", () => {
    const steps = stepsOf("tabsSteps");
    expect(steps).toContain(
      "the traversal focuses the trigger without running its onFocus",
    );
    expect(steps).toContain('"focuses=0"');
    expect(steps).not.toContain('"focuses=1"');
  });

  it("the tooltip probe asserts the tip stays closed after a traversal", () => {
    const steps = stepsOf("tooltipSteps");
    expect(steps).toContain("the traversal does not open the tip");

    expect(steps).toContain("settleUntil(painted, (shown) => shown)");
    expect(steps).toContain("afterTraversal");
    expect(steps).not.toContain("a keyboard focus opens the tip");
  });

  it("the offscreen host still delivers it, because it fakes activation", () => {
    expect(offscreen).toContain('"traversal dispatched onFocus"');
    expect(offscreen).toContain("ctx.host.focusNext()");

    expect(readme).toContain("`focusNext` dispatching `onFocus`");
  });

  it("the README attributes the zero to the inactive window, not the traversal", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain(
      "this automation window delivers no focus event at all",
    );
    expect(flat).toContain(
      "The counter is a property of the window the probe opened, not of the event",
    );
    expect(flat).toContain("never becomes one (`blur-delivery-lifecycle`)");
    expect(flat).toContain(
      "a real active app is expected to deliver it — a claim no live probe on this host can prove",
    );
    expect(flat).not.toContain("**0** — a window's traversal moves the focus");
    expect(flat).not.toContain("the two hosts genuinely differ");
    expect(flat).not.toContain("does not survive into a real window");
    expect(flat).not.toContain(
      "A keyboard user therefore has **no open path**",
    );
  });

  it("the probe's own screen and the registry title say what it measures", () => {
    expect(scenarios).toContain("This window delivers no focus event at all");
    expect(scenarios).toContain("Tab traversal leaves the tip closed");
    expect(registry).toContain("leaves it closed in this window");
    expect(registry).not.toContain("opens on hover and on a keyboard focus");
  });
});

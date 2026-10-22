/**
 * Holds the probes, the README and the offscreen scenario to the measured
 * divergence: a window's `Tab` traversal focuses an element **without running
 * React's `onFocus`**, while the offscreen `focusNext` dispatches it.
 *
 * The bug this guards: both probes were flipped to "the traversal delivers
 * `onFocus`" (`focuses=1`, the tip opens) after one run read the counter at 1.
 * Three clean runs on 0.11.0 read `focuses=0` and a tip that never opens, so
 * the live suite failed deterministically while the README taught the opposite
 * of what the runtime does. A component may not rely on that handler — the
 * `Tabs` arrow origin and the `Tooltip`'s keyboard path both rest on this —
 * and the offscreen suite cannot prove it either way.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the
 * repository's own probe and prose, not a runtime path.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const registry = read("./registry.ts");
const offscreen = read("../scenarios/focus.tsx");

/** The body of one probe's steps, from its declaration to the next one. */
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

describe("a window's Tab traversal and React's onFocus", () => {
  it("the tabs probe asserts the traversal focuses without running the handler", () => {
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
    // The closed read is the value a bounded poll settled on, so a delivery
    // that merely arrives late cannot pass as "never delivered".
    expect(steps).toContain("settleUntil(painted, (shown) => shown)");
    expect(steps).toContain("afterTraversal");
    expect(steps).not.toContain("a keyboard focus opens the tip");
  });

  it("the offscreen host still proves the opposite, which is why the window wins", () => {
    expect(offscreen).toContain('"traversal dispatched onFocus"');
    expect(offscreen).toContain("ctx.host.focusNext()");
    // The prose may not quietly drop the divergence: the README explains it.
    expect(readme).toContain("`focusNext` dispatching `onFocus`");
  });

  it("the README records the measured direction and not the retracted one", () => {
    expect(readme).toContain("**0** — a window's traversal moves the focus");
    expect(readme).toContain("stays closed");
    expect(readme).toContain("three runs on 0.11.0");
    expect(readme).not.toContain("a keyboard focus opens the tip");
    expect(readme).not.toContain("the traversal **does** deliver `onFocus`");
  });

  it("the probe's own screen and the registry title say what it measures", () => {
    // The caption wraps in the JSX source, so the claim is two fragments.
    expect(scenarios).toContain("A Tab traversal focuses the trigger without");
    expect(scenarios).toContain("running its onFocus, so the tip stays closed");
    expect(registry).toContain("while a Tab traversal leaves it closed");
    expect(registry).not.toContain("opens on hover and on a keyboard focus");
  });
});

/**
 * Guards the resting frame each floating probe reads.
 *
 * `@gpuixui/motion` gives every overlay an entry and an exit tween, so a probe
 * that reads one frame after the input measures the journey:
 *
 * 1. `popover-lifecycle` read the panel's gap 40ms into its 200ms entry and saw
 *    `0.5` where the panel rests at `6`;
 * 2. `context-menu-lifecycle` read the keyboard-placed surface the same way and
 *    saw `201` where it rests at `204`;
 * 3. `header-menu-lifecycle`'s local `gone` was a one-shot read, so `Escape
 *    unpaints the menu` saw the 200ms exit still painted;
 * 4. `modal-focus-restore` pinned the auto-focus bug the modal fixed: the
 *    restore target is recorded in the render that opens the surface, before a
 *    child's `autoFocus` runs, so the opener gets the focus back.
 *
 * A window is the only place these are proven, and a run costs a window — so a
 * revert to the mid-tween read would otherwise be reported as a runtime defect
 * rather than as the stale probe it is.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");

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

describe("the floating probes read a settled frame", () => {
  it("reads the popover's gap where the panel rests", () => {
    const steps = stepsOf("popoverSteps");
    expect(steps).toContain('settleNumber(boxAxis("y")(ctx, "popover-panel"))');
    // The check must compare the settled value, not the box read beside it.
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
    // The one-shot predicate that read the still-painted exit.
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

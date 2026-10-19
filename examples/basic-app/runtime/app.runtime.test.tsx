/**
 * The composed Tier 1 workflow, mounted in the real GPUix `TestRenderer`.
 *
 * `packages/primitives/runtime/` proves each component and each in-package
 * example; this suite proves the **application** — the validation that gates
 * Save, the consent row, the skeleton→form transition, the save lifecycle and
 * the fact that the lower half of the form is actually reachable. Until plan
 * `327` the README said this composition had never been executed.
 *
 * The defects it guards, in the order they appear:
 * - the consent checkbox's `label` was an accessible name only, so a sighted
 *   user saw an empty square over a caption that never named the agreement;
 * - Save must be refused until the consent row is activated, and an invalid
 *   email must keep it refused;
 * - the form is taller than its scroll region, so a row below the fold must be
 *   reachable by a wheel gesture before it can be clicked;
 * - the Select must paint the option's label, not its raw value.
 *
 * The app's loading and saving states are JavaScript timers, which
 * `runtime.advance` cannot pump; `settle` waits the real interval and then asks
 * the runtime to paint. A `TestRenderer` has no page scroll: only the app's own
 * scroll region can reveal the consent row.
 */

import { expect, it } from "vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  a11yValueOf,
  createRuntime,
  type Runtime,
} from "@gpuixui/primitives/testing";
import { App } from "../src/App.js";

/** The app's demo timings, plus room for the timer to fire. */
const LOADING_MS = 950;
const SAVING_MS = 1500;

/** The scroll region's `testId`; the consent row sits below its fold. */
const SETTINGS = "settings-form";

const openWindow = (): Promise<Runtime> =>
  Effect.runPromise(createRuntime({ width: 960, height: 720 }));

/** Wait out a JavaScript timer, then let the runtime repaint. */
const settle = async (
  runtime: Runtime,
  milliseconds: number,
): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
  runtime.flush();
};

const labelled = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.customProps?.["aria-label"] === label,
    ),
    () => expect.fail(`the app painted no element labelled "${label}"`),
  );

const click = (runtime: Runtime, label: string): void =>
  runtime.clickElement(labelled(runtime, label));

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(
    a11yValueOf(runtime.a11y(), { role: "CheckBox", label }),
    () => expect.fail(`no checkbox announced "${label}"`),
  );

const boundsOf = (runtime: Runtime, label: string) => {
  const element = labelled(runtime, label);
  return Option.getOrElse(runtime.boundsOfId(element.id), () =>
    expect.fail(`the app painted no box for "${label}"`),
  );
};

/**
 * The scroll region's **visible** box.
 *
 * A scroller's own report is its content origin, slid by the scroll offset
 * (measured: `y 91 → -18` for an offset of `-109`), while its children report
 * painted positions. `paintBounds` subtracts the offset, so both boxes are in
 * the same space (plan `598`).
 */
const viewportOf = (runtime: Runtime) =>
  Option.getOrElse(runtime.paintBounds(SETTINGS), () =>
    expect.fail(`the app painted no box for #${SETTINGS}`),
  );

const text = (runtime: Runtime): ReadonlyArray<string> => runtime.allText();

/** Mount the app and wait for the skeleton to hand over to the form. */
const openApp = async (): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<App />);
  runtime.flush();
  await settle(runtime, LOADING_MS);
  return runtime;
};

it("mounts the composed workflow after the skeleton", async () => {
  const runtime = await openWindow();
  runtime.render(<App />);
  runtime.flush();

  // The header paints immediately; the form is still a skeleton.
  expect(text(runtime)).toContain("Settings");
  expect(text(runtime)).not.toContain("Workspace name");

  await settle(runtime, LOADING_MS);
  expect(text(runtime)).toEqual(
    expect.arrayContaining([
      "Workspace name",
      "Contact email",
      "About this workspace",
      "Plan",
    ]),
  );
});

it("focuses the first field when the form replaces the skeleton", async () => {
  // The bug guarded (plan 584): the app said a later mount could not take
  // `autoFocus`, because `runtime.focused()` was empty after the skeleton. The
  // field had no `testId`, and `focused()` names the focused element's
  // `testId` — the probe could not see a working field. It is focused.
  const runtime = await openApp();
  expect(Option.getOrUndefined(runtime.focused())).toBe("settings-workspace");
});

it("paints the consent copy the user has to agree to", async () => {
  const runtime = await openApp();

  // The bug guarded: the visible label existed only as the checkbox's
  // accessible name, so the screen showed an empty box and this caption.
  expect(text(runtime)).toContain("I accept the terms");
  expect(text(runtime)).toContain(
    "Required before the workspace can be saved.",
  );
});

it("reaches the consent row, refuses Save, then saves once accepted", async () => {
  const runtime = await openApp();

  // The row starts below the fold, so it must be revealed by the region's own
  // scroll before it can be clicked. A row that cannot be revealed is a bug,
  // not a layout detail. Both boxes are painted-space: a child reports its
  // painted position, and `paintBounds` puts the scroller in the same space
  // (plan `598`).
  const hidden = boundsOf(runtime, "I accept the terms");
  const fold = viewportOf(runtime);
  expect(hidden.y).toBeGreaterThanOrEqual(fold.y + fold.height);

  click(runtime, "Save changes");
  runtime.flush();
  expect(text(runtime)).not.toContain("Saving your changes…");

  runtime.wheel(SETTINGS, 0, -400);
  runtime.flush();
  expect(
    Option.getOrElse(runtime.scrollOffset(SETTINGS), () => ({ x: 0, y: 0 })).y,
  ).toBeLessThan(0);

  const row = boundsOf(runtime, "I accept the terms");
  const region = viewportOf(runtime);
  expect(row.y).toBeGreaterThanOrEqual(region.y);
  expect(row.y + row.height).toBeLessThanOrEqual(region.y + region.height);

  expect(announced(runtime, "I accept the terms")).toBe("unchecked");
  click(runtime, "I accept the terms");
  runtime.flush();
  expect(announced(runtime, "I accept the terms")).toBe("checked");

  click(runtime, "Save changes");
  runtime.flush();
  expect(text(runtime)).toContain("Saving your changes…");

  await settle(runtime, SAVING_MS);
  expect(text(runtime)).not.toContain("Saving your changes…");
});

it("keeps Save refused while the email is invalid", async () => {
  const runtime = await openApp();

  click(runtime, "Contact email");
  runtime.type("nope");
  runtime.flush();
  expect(text(runtime)).toContain("Enter an address like you@example.com.");

  runtime.wheel(SETTINGS, 0, -400);
  runtime.flush();
  click(runtime, "I accept the terms");
  runtime.flush();
  click(runtime, "Save changes");
  runtime.flush();
  expect(text(runtime)).not.toContain("Saving your changes…");
});

it("Reset restores the form, not only the palette", async () => {
  const runtime = await openApp();

  runtime.wheel(SETTINGS, 0, -400);
  runtime.flush();
  click(runtime, "I accept the terms");
  runtime.flush();
  expect(announced(runtime, "I accept the terms")).toBe("checked");

  // The bug guarded: Reset used to call `setMode(initialMode)` only, so the
  // form stayed accepted while the button claimed to reset it.
  click(runtime, "Reset");
  runtime.flush();
  expect(announced(runtime, "I accept the terms")).toBe("unchecked");

  click(runtime, "Save changes");
  runtime.flush();
  expect(text(runtime)).not.toContain("Saving your changes…");
});

it("paints the Select's option label, not its value", async () => {
  const runtime = await openApp();
  expect(text(runtime)).toContain("Team — up to 20 members");
});

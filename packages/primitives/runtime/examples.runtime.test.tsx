/**
 * The examples, mounted in the real GPUix runtime.
 *
 * `src/components/*.test.tsx` decode an element tree and `runtime/*.runtime`
 * proves each component in isolation. Neither proves the thing a consumer
 * copies: an **example** is a composition of several components with caller-
 * owned state, and a composition can be wrong even when every part is right.
 * This suite is the only place where that claim is checked, by mounting each
 * example and reading what the frame actually painted.
 *
 * It is deliberately small. The per-component contracts belong to the other
 * runtime suites; here the assertions are "this screen renders", "this example
 * still exercises the control it exists to demonstrate", and the one
 * interaction each example is built around.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { ComponentType } from "react";
import { examples } from "../examples/index.js";
import { a11yNode, a11yValueOf, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme, testThemeDark } from "./fixture.js";

/** An element found by its accessible name — a group row has no `testId`. */
const byLabel = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.customProps?.["aria-label"] === label,
    ),
    () => expect.fail(`the runtime retained no element labelled ${label}`),
  );

/** The root and the headline each example must paint. */
const SCREENS = [
  { id: "layout", root: "layout-example", headline: "Inspector" },
  { id: "typography", root: "typography-example", headline: "Version 0.11.0" },
  { id: "form", root: "form-example", headline: "Project settings" },
  { id: "selection", root: "selection-example", headline: "Notifications" },
  { id: "feedback", root: "feedback-example", headline: "Revenue" },
  { id: "icons", root: "icons-example", headline: "Icon set" },
  {
    id: "iconButton",
    root: "icon-button-example",
    headline: "Layer toolbar",
  },
  { id: "value", root: "value-example", headline: "Render settings" },
  {
    id: "numberField",
    root: "number-field-example",
    headline: "Export settings",
  },
  { id: "otp", root: "otp-example", headline: "Two-factor verification" },
  { id: "rating", root: "rating-example", headline: "Rate this release" },
  { id: "toggle", root: "toggle-example", headline: "Canvas toolbar" },
] as const;

const renderExample = (
  runtime: Runtime,
  id: string,
  theme = testTheme,
): void => {
  const Example: ComponentType = Option.getOrElse(
    Option.fromNullishOr(examples[id]),
    () => expect.fail(`the example registry has no "${id}" entry`),
  );
  runtime.render(
    <Surface theme={theme}>
      <Example />
    </Surface>,
  );
};

it("lists a native screen for every registered example", () => {
  // Bug guarded: `rating` and `toggle` joined the registry (and the playground's
  // gallery) without a runtime screen, so the "every registered example" mount
  // and the dark-palette sweep silently covered ten of twelve. The list and the
  // registry have to agree, so a new example fails here by id.
  expect(
    Arr.filter(
      R.keys(examples),
      (id) => !Arr.some(SCREENS, (screen) => screen.id === id),
    ),
  ).toEqual([]);
});

it("mounts every registered example and paints its headline", async () => {
  const runtime = await openWindow();
  Arr.forEach(SCREENS, (screen) => {
    renderExample(runtime, screen.id);
    expect(runtime.allText(), screen.id).toContain(screen.headline);
    expect(
      Option.isSome(runtime.element(screen.root)),
      `${screen.id} did not retain its root`,
    ).toBe(true);
  });
});

it("composes the layout example around a scrolling property list", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "layout");
  expect(runtime.allText()).toContain("Corner radius");
  expect(runtime.allText()).toContain("Read-only");
  expect(Option.isSome(runtime.element("layout-example-properties"))).toBe(
    true,
  );
});

it("creates through the form example's busy action", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "form");
  expect(Option.getOrUndefined(runtime.focused())).toBe("form-example-name");
  runtime.click("form-example-save");
  // The bar says its share in the composition's own words (`formatValue`), not
  // the default percentage: this is the only example that proves the seam end to
  // end, and the value still describes the clamped fill.
  expect(
    Option.getOrUndefined(
      a11yValueOf(runtime.a11y(), { label: "Creating project" }),
    ),
  ).toBe("62% complete");
});

it("counts the form example's name and refuses a name past its limit", async () => {
  // The composition the field pages recommend instead of a `maxLength`: the
  // runtime cannot take a refused character back (a `value` is applied only
  // when it changed), so the form counts as the reader types and the action
  // refuses what is too long. Measured through the painted caption, not a
  // declared prop.
  const runtime = await openWindow();
  renderExample(runtime, "form");
  expect(Option.getOrUndefined(runtime.text("form-example-name-count"))).toBe(
    "5 of 60 characters",
  );
  runtime.type(Arr.join(Arr.replicate("a", 58), " "));
  expect(Option.getOrUndefined(runtime.text("form-example-name-count"))).toBe(
    "63 of 60 characters",
  );
  runtime.click("form-example-save");
  expect(runtime.allText()).not.toContain("Creating project");
});

it("pauses through the selection example's switch", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "selection");
  const announced = (): string =>
    Option.getOrElse(
      a11yValueOf(runtime.a11y(), { label: "Pause all notifications" }),
      () => expect.fail("the pause switch announced no state"),
    );
  expect(announced()).toBe("unchecked");
  runtime.click("selection-example-pause");
  expect(announced()).toBe("checked");
});

it("opens the feedback example's tooltip on hover", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "feedback");
  expect(runtime.allText()).not.toContain("Booked revenue, net of refunds.");
  runtime.hover("feedback-example-tooltip-trigger");
  expect(runtime.allText()).toContain("Booked revenue, net of refunds.");
});

it("announces the icons example's labelled status icon", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "icons");
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Image", label: "success" }),
    ),
  ).toBe(true);
});

it("moves the value example's quality slider and repaints its readout", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "value");
  expect(runtime.allText()).toContain("62%");
  runtime.click("value-example-quality");
  // A hit-tested click at the track's centre is 50% of 0–100.
  expect(
    Option.getOrUndefined(a11yValueOf(runtime.a11y(), { label: "Quality" })),
  ).toBe("50%");
  expect(runtime.allText()).toContain("50%");
});

it("rates the rating example in whole stars and halves", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "rating");
  expect(runtime.allText()).toContain(
    "Click a star — or its left half — or use the arrow keys.",
  );
  const four = Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.customProps?.["aria-label"] === "4 of 5",
    ),
    () => expect.fail("the rating painted no 4-of-5 star"),
  );
  runtime.clickElement(four);
  expect(
    Arr.some(runtime.allText(), (line) => line.startsWith("You rated 4 of 5.")),
  ).toBe(true);

  // The example scores halves, so the same star's left quarter is 3.5.
  const bounds = Option.getOrElse(runtime.boundsOfId(four.id), () =>
    expect.fail("the fourth star painted no bounds"),
  );
  runtime.clickAt(bounds.x + bounds.width / 4, bounds.y + bounds.height / 2);
  expect(
    Arr.some(runtime.allText(), (line) =>
      line.startsWith("You rated 3.5 of 5."),
    ),
  ).toBe(true);
});

it("flips the toggle example's snap mode and repaints its summary", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "toggle");
  expect(
    Option.getOrUndefined(
      a11yValueOf(runtime.a11y(), { label: "Snap to grid" }),
    ),
  ).toBe("not pressed");
  runtime.clickElement(byLabel(runtime, "Snap to grid"));
  expect(
    Option.getOrUndefined(
      a11yValueOf(runtime.a11y(), { label: "Snap to grid" }),
    ),
  ).toBe("pressed");
  expect(
    Arr.some(runtime.allText(), (line) => line.startsWith("Grid on · Snap on")),
  ).toBe(true);
});

it("steps the number-field example's copies and repaints its summary", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "numberField");
  const field = Option.getOrElse(
    runtime.bounds("number-field-example-copies"),
    () => expect.fail("the copies field painted no box"),
  );
  runtime.clickAt(field.x + field.width - 8, field.y + field.height * 0.25);
  expect(runtime.allText()).toContain("3 ×");
  expect(
    Arr.some(runtime.allText(), (line) =>
      line.startsWith("3 prints at 144 DPI."),
    ),
  ).toBe(true);
});

it("verifies the one-time-code example and repaints its status", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "otp");
  expect(runtime.allText()).toContain("6 digits to go.");
  Arr.forEach(["1", "2", "3", "4", "5", "6"], (digit) => runtime.type(digit));
  expect(runtime.allText()).toContain("Code complete — press Verify.");
  runtime.click("otp-example-verify");
  expect(
    Arr.some(runtime.allText(), (line) => line.startsWith("Verified.")),
  ).toBe(true);
});

it("paints every example from the dark palette", async () => {
  const runtime = await openWindow();
  Arr.forEach(SCREENS, (screen) => {
    renderExample(runtime, screen.id, testThemeDark);
    const fill = Option.getOrUndefined(
      Option.flatMap(runtime.element(screen.root), (element) =>
        Option.fromNullishOr(element.style.backgroundColor),
      ),
    );
    // Every example's root is a `card` surface; a literal colour here would
    // survive the theme switch and fail this assertion.
    expect(fill, screen.id).toBe(testThemeDark.colors.card);
  });
});

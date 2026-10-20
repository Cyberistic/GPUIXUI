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
import * as Order from "effect/Order";
import * as R from "effect/Record";
import type { ComponentType } from "react";
import { examples } from "../examples/index.js";
import { a11yNode, a11yValueOf, type Runtime } from "../src/testing/index.js";
import {
  Surface,
  awaitFrame,
  openWindow,
  testTheme,
  testThemeDark,
} from "./fixture.js";

/** The root and the headline each example must paint. */
const SCREENS = [
  { id: "layout", root: "layout-example", headline: "Inspector" },
  {
    id: "buttonGroup",
    root: "button-group-example",
    headline: "Document actions",
  },
  { id: "checkbox", root: "checkbox-example", headline: "Release assets" },
  { id: "typography", root: "typography-example", headline: "Version 0.10.0" },
  { id: "form", root: "form-example", headline: "Project settings" },
  { id: "selection", root: "selection-example", headline: "Notifications" },
  { id: "feedback", root: "feedback-example", headline: "Revenue" },
  { id: "icons", root: "icons-example", headline: "Icon set" },
  { id: "value", root: "value-example", headline: "Render settings" },
  {
    id: "numberField",
    root: "number-field-example",
    headline: "Export settings",
  },
  { id: "otp", root: "otp-example", headline: "Two-factor verification" },
  { id: "rating", root: "rating-example", headline: "Rate this release" },
  {
    id: "scrollTrigger",
    root: "scroll-trigger-example",
    headline: "Activity log",
  },
  { id: "toggle", root: "toggle-example", headline: "Canvas toolbar" },
  {
    id: "toggleGroup",
    root: "toggle-group-example",
    headline: "Document toolbar",
  },
  { id: "tooltip", root: "tooltip-example", headline: "Release 0.10.0" },
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

it("records a screen for every registered example", () => {
  // The registry is the list (plan 092). Without this, a new example mounts in
  // no test — or, worse, the "every example" test keeps its name while missing
  // one, and the dark-palette pass misses it too.
  expect(Arr.sort(R.keys(examples), Order.String)).toEqual(
    Arr.sort(
      Arr.map(SCREENS, (screen) => screen.id),
      Order.String,
    ),
  );
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

it("updates the inspector's position readout on a wheel scroll", async () => {
  // The example is the composed proof of the position contract (plan 337):
  // wheel → renderer offset → onScrollPositionChange → caller state → repaint.
  const runtime = await openWindow();
  renderExample(runtime, "layout");
  expect(runtime.allText()).toContain("Top");
  runtime.wheel("layout-example-properties", 0, -100);
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  const offset = Option.getOrElse(
    runtime.scrollOffset("layout-example-properties"),
    () => expect.fail("the inspector's property list did not scroll"),
  );
  expect(offset.y).toBeLessThan(0);
  expect(runtime.allText()).toContain(`${Math.round(-offset.y)} px`);
});

it("runs the button-group example's stacked action", async () => {
  // The vertical group is the shape plan 096 added; this proves the example
  // wires a press through to caller-owned state, not just that it paints.
  const runtime = await openWindow();
  renderExample(runtime, "buttonGroup");
  expect(runtime.allText()).toContain("No action yet.");
  runtime.click("button-group-example-archive");
  expect(runtime.allText()).toContain("Archived the document.");
});

it("creates through the form example's busy action", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "form");
  expect(Option.getOrUndefined(runtime.focused())).toBe("form-example-name");
  runtime.click("form-example-save");
  expect(
    Option.getOrUndefined(
      a11yValueOf(runtime.a11y(), { label: "Creating project" }),
    ),
  ).toBe("62%");
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

it("reaches the feedback example's tooltip by keyboard, with its description", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "feedback");
  const trigger = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Image", label: "Revenue definition" }),
    () => expect.fail("the tooltip trigger produced no accessibility node"),
  );
  expect(trigger.aria?.description).toBe("Booked revenue, net of refunds.");
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(
    () => runtime.allText().includes("Booked revenue, net of refunds."),
    "the feedback tooltip paints on focus",
  );
  expect(Option.getOrUndefined(runtime.focused())).toBe(
    "feedback-example-tooltip-trigger",
  );
  expect(runtime.allText()).toContain("Booked revenue, net of refunds.");
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), {
        role: "Tooltip",
        label: "Booked revenue, net of refunds.",
      }),
    ),
  ).toBe(true);
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

it("rates the rating example and repaints its summary", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "rating");
  expect(runtime.allText()).toContain("Click a star, or use the arrow keys.");
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
});

it("flips the toggle example's snap mode and repaints its summary", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "toggle");
  expect(
    Option.getOrUndefined(
      a11yValueOf(runtime.a11y(), { label: "Snap to grid" }),
    ),
  ).toBe("not pressed");
  runtime.click("toggle-example-snap");
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
    runtime.paintBounds("number-field-example-copies"),
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

it("switches the toggle-group example's mode and formatting set", async () => {
  const runtime = await openWindow();
  renderExample(runtime, "toggleGroup");
  const announced = (label: string): string =>
    Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
      expect.fail(`${label} announced no state`),
    );
  expect(announced("Align left")).toBe("pressed");
  runtime.click("toggle-group-example-align-centre");
  expect(announced("Align centre")).toBe("pressed");
  expect(announced("Align left")).toBe("not pressed");
  expect(announced("Bold")).toBe("pressed");
  runtime.click("toggle-group-example-format-italic");
  expect(announced("Italic")).toBe("pressed");
  expect(
    Arr.some(runtime.allText(), (line) =>
      line.startsWith("Align centre · Formatting bold, italic"),
    ),
  ).toBe(true);
});

it("selects release assets through the checkbox example", async () => {
  // The standalone `Checkbox` in its real role (plan 374): a tri-state header
  // over a column of boxes. The header announces `mixed` while some are
  // selected, and a row box repaints the caller's count.
  const runtime = await openWindow();
  renderExample(runtime, "checkbox");
  const header = (): string =>
    Option.getOrElse(
      a11yValueOf(runtime.a11y(), { label: "Select all assets" }),
      () => expect.fail("the select-all box announced no state"),
    );
  expect(header()).toBe("mixed");
  expect(runtime.allText()).toContain("1 of 3 selected");
  runtime.click("checkbox-example-asset-1");
  expect(runtime.allText()).toContain("2 of 3 selected");
  runtime.click("checkbox-example-all");
  expect(header()).toBe("checked");
  expect(runtime.allText()).toContain("3 of 3 selected");
});

it("opens the tooltip example's tips and publishes the release", async () => {
  // The composition the Tooltip page documents (plan 374): a tip over an
  // IconButton opens on hover, and the wrapped publish button still runs its
  // caller's action and repaints the status line.
  const runtime = await openWindow();
  renderExample(runtime, "tooltip");
  expect(runtime.allText()).toContain(
    "Draft — publish when the notes are ready.",
  );
  expect(runtime.allText()).not.toContain("Delete this draft permanently.");
  runtime.hover("tooltip-example-delete");
  expect(runtime.allText()).toContain("Delete this draft permanently.");
  runtime.click("tooltip-example-publish");
  expect(runtime.allText()).toContain("Published to the stable channel.");
  expect(runtime.allText()).toContain("Published");
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

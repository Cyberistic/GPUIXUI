/**
 * `Toggle` in the real GPUix runtime.
 *
 * `@gpuix/react` publishes no button (see `docs/gpuix-capabilities.md`), so a toggle's activation
 * is this package's contract: a hit-tested click, Enter on key down, Space on
 * key up, a held key ignored. The other thing only the runtime can show is that
 * the pressed state reaches the paint and the accessibility tree through the one
 * channel the runtime has — `aria-valuetext`, since `aria-pressed` does not exist.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Stack } from "../src/components/Stack.js";
import { Toggle } from "../src/components/Toggle.js";
import { a11yValueOf, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

it("toggles on a real click and announces the state it landed on", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Toggle testId="t" label="Bold" />
    </Surface>,
  );
  expect(announced(runtime, "Bold")).toBe("not pressed");
  runtime.click("t");
  expect(announced(runtime, "Bold")).toBe("pressed");
  runtime.click("t");
  expect(announced(runtime, "Bold")).toBe("not pressed");
});

it("paints the accent role while pressed", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Toggle testId="t" label="Bold" />
    </Surface>,
  );
  const background = (): unknown =>
    Option.getOrElse(runtime.element("t"), () =>
      expect.fail("the runtime retained no toggle"),
    ).style["backgroundColor"];
  expect(background()).toBeUndefined();
  runtime.click("t");
  expect(background()).toBe(testTheme.colors.accent);
});

it("activates once on Enter down, not again on the key up", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Toggle testId="t" label="Bold" />
    </Surface>,
  );
  runtime.keyDown("t", "enter");
  expect(announced(runtime, "Bold")).toBe("pressed");
  runtime.keyUp("t", "enter");
  expect(announced(runtime, "Bold")).toBe("pressed");
});

it("activates on Space up, and not on the key down before it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Toggle testId="t" label="Bold" />
    </Surface>,
  );
  runtime.keyDown("t", "space");
  expect(announced(runtime, "Bold")).toBe("not pressed");
  runtime.keyUp("t", "space");
  expect(announced(runtime, "Bold")).toBe("pressed");
});

it("refuses activation when disabled and stays out of the tab order", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="b">Before</Button>
        <Toggle testId="t" label="Bold" variant="outline" disabled />
      </Stack>
    </Surface>,
  );
  runtime.click("t");
  expect(announced(runtime, "Bold")).toBe("not pressed");
  runtime.keyDown("t", "enter");
  expect(announced(runtime, "Bold")).toBe("not pressed");
  runtime.click("b");
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("b"));
});

it("refuses activation while busy and paints a spinner a reader can see", async () => {
  // The bug this guards: a toolbar action awaiting a request could be pressed
  // again, starting the work twice. A busy toggle keeps its tab stop (so the
  // reader is not dropped mid-action) and refuses both activation paths.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Toggle testId="t" label="Sync" pressed loading />
    </Surface>,
  );
  expect(announced(runtime, "Sync")).toBe("pressed");
  runtime.click("t");
  runtime.keyDown("t", "enter");
  runtime.keyUp("t", "space");
  expect(announced(runtime, "Sync")).toBe("pressed");
  // The spinner is painted where the leading icon would be, in the pressed
  // face's own on-colour rather than the brand fill behind it.
  const dots = Arr.filter(
    runtime.all(),
    (element) =>
      element.style.backgroundColor === testTheme.colors.accentForeground,
  );
  expect(dots.length).toBeGreaterThan(0);
});

it("paints a disabled pressed toggle in the measured neutral pair", async () => {
  // A pressed toggle is a filled face, so the 50% fade is not the disabled
  // contract: the neutral pair `contrastPairs` measures is (the unit suite's
  // `wears the measured neutral pair while disabled and pressed`).
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Toggle testId="t" label="Bold" pressed disabled />
    </Surface>,
  );
  const style = Option.getOrElse(runtime.element("t"), () =>
    expect.fail("the runtime retained no toggle"),
  ).style;
  expect(style["backgroundColor"]).toBe(testTheme.colors.disabled);
  expect(style["color"]).toBe(testTheme.colors.disabledForeground);
  expect(style["opacity"]).toBeUndefined();
});

it("declares the keyboard ring and paints no shadow on a press", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="b">Elsewhere</Button>
        <Toggle testId="t" label="Bold" />
      </Stack>
    </Surface>,
  );
  const style = (): Record<string, unknown> =>
    Option.getOrElse(runtime.element("t"), () =>
      expect.fail("the runtime retained no toggle"),
    ).style;
  expect(style()["focusVisible"]).toBeDefined();
  runtime.click("t");
  runtime.flush();
  expect(style()["boxShadow"]).toBeUndefined();
  runtime.click("b");
  runtime.flush();
  expect(style()["boxShadow"]).toBeUndefined();
});

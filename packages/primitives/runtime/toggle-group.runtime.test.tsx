/**
 * `ToggleGroup` in the real GPUix runtime.
 *
 * What only the renderer can show: a hit-tested press changes the announced
 * set, arrows reach the group **and** move native focus to the next item, the
 * single tab stop is the one `focusNext` lands on, and a disabled item is
 * skipped by both arrows and Tab. The state channel is `aria-valuetext`
 * because 0.10.0 has no `aria-pressed` (plan 056 §2).
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Stack } from "../src/components/Stack.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { a11yValueOf, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const align = [
  { value: "left", label: "Left" },
  { value: "centre", label: "Centre" },
  { value: "right", label: "Right" },
] as const;

const format = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
  { value: "underline", label: "Underline" },
] as const;

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "nothing");

it("selects one item on a real click and unpresses the previous one", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="single"
        testId="tg"
        label="Alignment"
        options={align}
        defaultValue="left"
      />
    </Surface>,
  );
  expect(announced(runtime, "Left")).toBe("pressed");
  runtime.click("tg-centre");
  expect(announced(runtime, "Centre")).toBe("pressed");
  expect(announced(runtime, "Left")).toBe("not pressed");
  expect(announced(runtime, "Right")).toBe("not pressed");
});

it("toggles independent items in multiple mode", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="multiple"
        testId="tg"
        label="Formatting"
        options={format}
      />
    </Surface>,
  );
  runtime.click("tg-bold");
  runtime.click("tg-italic");
  expect(announced(runtime, "Bold")).toBe("pressed");
  expect(announced(runtime, "Italic")).toBe("pressed");
  runtime.click("tg-bold");
  expect(announced(runtime, "Bold")).toBe("not pressed");
  expect(announced(runtime, "Italic")).toBe("pressed");
});

it("activates on Enter down and Space up in a group", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="multiple"
        testId="tg"
        label="Formatting"
        options={format}
      />
    </Surface>,
  );
  runtime.keyDown("tg-bold", "enter");
  expect(announced(runtime, "Bold")).toBe("pressed");
  runtime.keyUp("tg-bold", "enter");
  expect(announced(runtime, "Bold")).toBe("pressed");
  runtime.keyDown("tg-italic", "space");
  expect(announced(runtime, "Italic")).toBe("not pressed");
  runtime.keyUp("tg-italic", "space");
  expect(announced(runtime, "Italic")).toBe("pressed");
});

it("moves focus and selection together with an arrow in single mode", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="single"
        testId="tg"
        label="Alignment"
        options={align}
        defaultValue="left"
      />
    </Surface>,
  );
  runtime.keyDown("tg-left", "right");
  expect(focused(runtime)).toBe("tg-centre");
  expect(announced(runtime, "Centre")).toBe("pressed");
  expect(announced(runtime, "Left")).toBe("not pressed");
});

it("moves only focus with an arrow in multiple mode", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="multiple"
        testId="tg"
        label="Formatting"
        options={format}
      />
    </Surface>,
  );
  runtime.keyDown("tg-bold", "right");
  expect(focused(runtime)).toBe("tg-italic");
  expect(announced(runtime, "Bold")).toBe("not pressed");
  expect(announced(runtime, "Italic")).toBe("not pressed");
});

it("skips a disabled item with arrows and refuses its press", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="single"
        testId="tg"
        label="Alignment"
        options={[
          { value: "left", label: "Left", disabled: true },
          { value: "centre", label: "Centre" },
          { value: "right", label: "Right" },
        ]}
        defaultValue="centre"
      />
    </Surface>,
  );
  runtime.click("tg-left");
  expect(announced(runtime, "Centre")).toBe("pressed");
  runtime.keyDown("tg-centre", "right");
  expect(focused(runtime)).toBe("tg-right");
  runtime.keyDown("tg-right", "right");
  expect(focused(runtime)).toBe("tg-centre");
  runtime.keyDown("tg-centre", "end");
  expect(focused(runtime)).toBe("tg-right");
  runtime.keyDown("tg-right", "home");
  expect(focused(runtime)).toBe("tg-centre");
});

it("takes one tab stop, on the selected item", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        <ToggleGroup
          type="single"
          testId="tg"
          label="Alignment"
          options={align}
          defaultValue="centre"
        />
      </Stack>
    </Surface>,
  );
  runtime.click("before");
  runtime.focusNext();
  expect(focused(runtime)).toBe("tg-centre");
  runtime.focusNext();
  expect(focused(runtime)).not.toBe("tg-right");
});

it("leaves a disabled group out of the tab order and inert", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        <ToggleGroup
          type="single"
          testId="tg"
          label="Alignment"
          options={align}
          defaultValue="left"
          disabled
        />
        <Button testId="after">After</Button>
      </Stack>
    </Surface>,
  );
  runtime.click("tg-centre");
  expect(announced(runtime, "Left")).toBe("pressed");
  runtime.click("before");
  runtime.focusNext();
  expect(focused(runtime)).toBe("after");
});

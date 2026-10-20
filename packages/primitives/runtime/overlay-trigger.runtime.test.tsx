/**
 * A slot trigger: the button family inside a `Tooltip`, in the real runtime.
 *
 * GPUix's `TooltipTrigger` composes with `asChild`, which **clones** the child
 * with its event handlers and `aria-description` (`@gpuix/react@0.10.0`,
 * `renderSlot`). A React component boundary drops any prop it does not declare,
 * so before plan 341 the documented example — a `Tooltip` around a `Button` —
 * painted no tip on hover and none on keyboard focus. Every existing tooltip
 * test used a raw `<div>`, which is why the class of bug was invisible.
 *
 * These cases guard the component half of the slot contract: the injected
 * handlers reach the host element, the component still owns its focus ring and
 * activation, and the tip's string reaches the accessibility tree.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { IconButton } from "../src/components/IconButton.js";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { Select } from "../src/components/Select.js";
import { Slider } from "../src/components/Slider.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { TextArea } from "../src/components/TextArea.js";
import { Toggle } from "../src/components/Toggle.js";
import { Tooltip } from "../src/components/Tooltip.js";
import { a11yNode } from "../src/testing/index.js";
import { awaitFrame, openWindow, Surface } from "./fixture.js";

const TIP = "A hint";

/** Whether the open tip's text is painted in the current frame. */
const tipPainted = (text: ReadonlyArray<string>): boolean => text.includes(TIP);

it("opens a Tooltip on hover when its trigger is a Button", async () => {
  // The bug guarded (plan 341): `onMouseEnter` was cloned onto the `Button`
  // component, which declared no such prop, so the tip never opened.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  expect(tipPainted(runtime.allText())).toBe(false);
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on keyboard focus when its trigger is a Button", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("closes a hovered Tooltip when its Button trigger is clicked", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
  runtime.click("target");
  expect(tipPainted(runtime.allText())).toBe(false);
});

it("opens a Tooltip on hover when its trigger is an IconButton", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <IconButton testId="target" icon="x" label="Close" />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on hover when its trigger is a Toggle", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Toggle testId="target" label="Bold">
          Bold
        </Toggle>
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("announces a Tooltip as a Button trigger's description", async () => {
  // The same slot passes `aria-description`, not only events. The documented
  // example is a `Button`, so its tip must be readable while the tip is shut.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  const trigger = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Button", label: "Delete" }),
    () => expect.fail("the Button produced no accessibility node"),
  );
  expect(trigger.aria?.description).toBe(TIP);
});

/**
 * The rest of the single-root Tier 1 controls (plan 345).
 *
 * The button family above is content-sized, so the tooltip's hugging root is
 * invisible. A `Slider`'s track is always 100 % wide, so it needs an explicit
 * root width — measured: without it the wrapper paints 16 × 32 px and the drag
 * has nowhere to go.
 */
const SLIDER_ROOT = { width: 320 } as const;

it("opens a Tooltip on hover when its trigger is a Checkbox", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Checkbox testId="target" label="Agree" />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on keyboard focus when its trigger is a Checkbox", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Checkbox testId="target" label="Agree" />
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on hover when its trigger is a Switch", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Switch testId="target" label="Pause" />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on keyboard focus when its trigger is a Switch", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Switch testId="target" label="Pause" />
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on hover when its trigger is a Slider, and keeps the drag", async () => {
  const runtime = await openWindow();
  const values: number[] = [];
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip" style={SLIDER_ROOT}>
        <Slider
          testId="target"
          label="Volume"
          onValueChange={(next) => values.push(next)}
        />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
  const box = Option.getOrElse(runtime.bounds("target"), () =>
    expect.fail("the slider painted no box"),
  );
  expect(box.width).toBe(SLIDER_ROOT.width);
  runtime.clickAt(box.x + box.width * 0.75, box.y + box.height / 2);
  expect(values.at(-1)).toBeGreaterThan(60);
});

it("opens a Tooltip on keyboard focus when its trigger is a Slider", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip" style={SLIDER_ROOT}>
        <Slider testId="target" label="Volume" />
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on hover when its trigger is a Select", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Select
          testId="target"
          label="Region"
          options={[{ value: "eu", label: "Europe" }]}
        />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target-trigger");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on keyboard focus when its trigger is a Select", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Select
          testId="target"
          label="Region"
          options={[{ value: "eu", label: "Europe" }]}
        />
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target-trigger");
  expect(tipPainted(runtime.allText())).toBe(true);
  // The slot must not have taken the trigger's own click: the list still opens.
  runtime.click("target-trigger");
  expect(runtime.allText()).toContain("Europe");
});

it("opens a Tooltip on keyboard focus when its trigger is an Input", async () => {
  // A native `<input>` receives no `onMouseEnter` (measured, plan 345 §0), so
  // focus is the only path — but it must work, and the field must keep typing.
  const runtime = await openWindow();
  const values: string[] = [];
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Input
          testId="target"
          label="Email"
          onValueChange={(next) => values.push(next)}
        />
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
  runtime.type("a");
  expect(values.at(-1)).toBe("a");
});

it("opens a Tooltip on keyboard focus when its trigger is a TextArea", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <TextArea testId="target" label="Notes" />
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on keyboard focus when its trigger is a NumberField", async () => {
  const runtime = await openWindow();
  const values: number[] = [];
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <NumberField
          testId="target"
          label="Quantity"
          onValueChange={(next) => values.push(next)}
        />
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(
    Option.exists(
      runtime.focusedElement(),
      (element) => element.type === "input",
    ),
  ).toBe(true);
  expect(tipPainted(runtime.allText())).toBe(true);
  runtime.type("7");
  expect(values.at(-1)).toBe(7);
});

it("carries the tip as the description of the controls it wraps", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP}>
        <Checkbox testId="check" label="Agree" />
      </Tooltip>
      <Tooltip content={TIP}>
        <Switch testId="switch" label="Pause" />
      </Tooltip>
      <Tooltip content={TIP} style={SLIDER_ROOT}>
        <Slider testId="slider" label="Volume" />
      </Tooltip>
      <Tooltip content={TIP}>
        <Input testId="input" label="Email" />
      </Tooltip>
      <Tooltip content={TIP}>
        <Select
          testId="select"
          label="Region"
          options={[{ value: "eu", label: "Europe" }]}
        />
      </Tooltip>
    </Surface>,
  );
  const dump = runtime.a11y();
  const description = (role: string, label: string) =>
    Option.flatMap(a11yNode(dump, { role, label }), (node) =>
      Option.fromNullishOr(node.aria?.description),
    );
  expect(Option.getOrUndefined(description("CheckBox", "Agree"))).toBe(TIP);
  expect(Option.getOrUndefined(description("Switch", "Pause"))).toBe(TIP);
  expect(Option.getOrUndefined(description("Slider", "Volume"))).toBe(TIP);
  expect(Option.getOrUndefined(description("TextInput", "Email"))).toBe(TIP);
  expect(Option.getOrUndefined(description("ComboBox", "Region"))).toBe(TIP);
});

it("opens a Tooltip on keyboard focus when its trigger is a Toggle", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Toggle testId="target" label="Bold">
          Bold
        </Toggle>
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on keyboard focus when its trigger is an IconButton", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <IconButton testId="target" icon="x" label="Close" />
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("closes a focus-opened tip on Escape while the trigger keeps focus", async () => {
  // The dismissal half of plan 596: the trigger still holds focus after
  // Escape, so the tracker would reopen the tip on the next render without the
  // remembered dismissal.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(tipPainted(runtime.allText())).toBe(true);
  runtime.keyDown("target", "escape");
  runtime.flush();
  await awaitFrame(() => !tipPainted(runtime.allText()), "the tip is absent");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(false);
});

it("closes a focus-opened tip on click while the trigger keeps focus", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(tipPainted(runtime.allText())).toBe(true);
  runtime.click("target");
  runtime.flush();
  await awaitFrame(() => !tipPainted(runtime.allText()), "the tip is absent");
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(false);
});

it("re-opens a focus-opened tip after focus leaves and returns", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Tooltip content={TIP} side="bottom" testId="tip">
          <Button testId="target" label="Delete">
            Delete
          </Button>
        </Tooltip>
        <Button testId="after">After</Button>
      </Stack>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(tipPainted(runtime.allText())).toBe(true);
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => !tipPainted(runtime.allText()), "the tip is absent");
  expect(tipPainted(runtime.allText())).toBe(false);
  const target = Option.getOrElse(runtime.element("target"), () =>
    expect.fail("the trigger painted no host"),
  );
  runtime.renderer.focusElement(target.id);
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");
  expect(tipPainted(runtime.allText())).toBe(true);
});

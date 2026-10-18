/**
 * A control's chrome is not selectable (plan `386`).
 *
 * **The gap this file closes.** The runtime's root starts `selectable: true`
 * and only an explicit `userSelect: "none"` opts a subtree out
 * (`references/gpuix/.../renderer.rs`, `Inherited::root`). `Text` opts out for
 * every role, so chrome written as `Text` is inert — but `Button`, `Toggle`,
 * `ToggleGroup` and the `Select` trigger/list paint a raw string inside their
 * own chrome and declared nothing. Measured: a drag across a button selected
 * `"Save changes"`, across a toggle `"Grid view"`, across a select trigger its
 * value, and across an option its label — and the trigger advertised a text
 * cursor, because the field recipe is written for a native `<input>`.
 *
 * Each case drags a real range across the painted box, not a style property: a
 * declared `userSelect` is not a selection, which is the lesson of plan `385`.
 * The positive case is content: a selectable `Text` still takes the drag, and a
 * caller who asks for `userSelect: "text"` on a button gets it (the documented
 * merge-last rule) — the fix is a default, not a cage.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Select } from "../src/components/Select.js";
import { Text } from "../src/components/Text.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { Tooltip } from "../src/components/Tooltip.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const boxOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** Drag across the middle of `testId`'s painted line, two pixels inside each edge. */
const dragAcross = (
  runtime: Runtime,
  testId: string,
): Option.Option<string> => {
  const box = boxOf(runtime, testId);
  const y = box.y + box.height / 2;
  return runtime.dragSelection(
    { x: box.x + 2, y },
    { x: box.x + box.width - 2, y },
  );
};

/** Drag across a painted `<text>` run found by its string. */
const dragText = (runtime: Runtime, content: string): Option.Option<string> => {
  const run = Option.getOrElse(
    Option.fromNullishOr(
      runtime.renderer
        .findByType("text")
        .find((element) => element.text === content),
    ),
    () => expect.fail(`the runtime painted no text ${content}`),
  );
  const bounds = Option.getOrElse(
    Option.fromNullishOr(runtime.renderer.getElementBounds(run.id)),
    () => expect.fail(`the text ${content} painted no box`),
  );
  return runtime.dragSelection(
    { x: bounds.x, y: bounds.y + bounds.height / 2 },
    { x: bounds.x + bounds.width - 1, y: bounds.y + bounds.height / 2 },
  );
};

const styleOf = (runtime: Runtime, testId: string): Record<string, unknown> =>
  Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`the runtime painted no element ${testId}`),
  ).style;

it("takes no text from a button, a toggle or a toggle-group item", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="button">Save changes</Button>
      <Toggle testId="toggle" defaultPressed>
        Grid view
      </Toggle>
      <ToggleGroup
        testId="group"
        type="single"
        defaultValue="left"
        options={[
          { value: "left", label: "Align left" },
          { value: "right", label: "Align right" },
        ]}
      />
    </Surface>,
  );

  expect(dragAcross(runtime, "button")).toStrictEqual(Option.none());
  expect(dragAcross(runtime, "toggle")).toStrictEqual(Option.none());
  expect(dragAcross(runtime, "group-left")).toStrictEqual(Option.none());
});

it("gives the select trigger a pointer cursor and no selection", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="fruit"
        label="Fruit"
        defaultValue="a"
        options={[{ value: "a", label: "Apple" }]}
      />
    </Surface>,
  );

  expect(dragAcross(runtime, "fruit-trigger")).toStrictEqual(Option.none());
  const style = styleOf(runtime, "fruit-trigger");
  expect(style["userSelect"]).toBe("none");
  expect(style["cursor"]).toBe("pointer");
});

it("keeps a disabled select's pointer inert in the paint", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="fruit"
        label="Fruit"
        defaultValue="a"
        disabled
        options={[{ value: "a", label: "Apple" }]}
      />
    </Surface>,
  );

  expect(styleOf(runtime, "fruit-trigger")["cursor"]).toBe("not-allowed");
});

it("takes no text from an open list's option or group heading", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="fruit"
        label="Fruit"
        defaultValue="apple"
        options={[
          {
            label: "Fruits",
            options: [
              { value: "apple", label: "Apple" },
              { value: "banana", label: "Banana" },
            ],
          },
        ]}
      />
    </Surface>,
  );
  runtime.click("fruit-trigger");
  runtime.flush();

  expect(dragText(runtime, "Banana")).toStrictEqual(Option.none());
  expect(dragText(runtime, "Fruits")).toStrictEqual(Option.none());
});

it("takes no text from an open tooltip", async () => {
  // Plan 398: plan 386 fixed the five raw-string chrome surfaces but missed
  // the tip; measured, a drag across it selected the whole hint.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="A hint that can be dragged" testId="tip">
        <Button testId="target" label="Explain">
          Hover
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  runtime.flush();
  // Keep the tip open while the drag crosses it.
  runtime.hover("tip");
  runtime.flush();

  expect(dragAcross(runtime, "tip")).toStrictEqual(Option.none());
  expect(styleOf(runtime, "tip")["userSelect"]).toBe("none");
});

it("still takes content, and honours a caller who opts back in", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Text selectable testId="content">
        Alpha bravo charlie
      </Text>
      <Button testId="hatch" style={{ userSelect: "text" }}>
        Copy me
      </Button>
    </Surface>,
  );

  expect(dragAcross(runtime, "content")).toEqual(
    Option.some("Alpha bravo charlie"),
  );
  // The control's `userSelect` is a default: the caller's style merges last.
  expect(dragAcross(runtime, "hatch")).toEqual(Option.some("Copy me"));
});

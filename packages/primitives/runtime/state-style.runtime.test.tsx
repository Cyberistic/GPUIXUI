/**
 * State-aware `style` in the real GPUix runtime (plans 079, 080).
 *
 * The offline suite (`src/components/state-style.test.tsx`) proves the state
 * object and the merge order against the element tree. This suite proves the
 * part the tree cannot: that a callback's **state is live** — focus moving,
 * a value flipping, an invalid prop differing per instance — reaches the
 * painted style, not just the props a render function was handed.
 *
 * Each case names the state it guards: `focused`, `checked`, `invalid`.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { Input } from "../src/components/Input.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Select } from "../src/components/Select.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import { Toggle } from "../src/components/Toggle.js";
import type { Runtime } from "../src/testing/index.js";
import { Surface, openWindow, settleFocus } from "./fixture.js";

const FOCUSED = "#ff0000";
const IDLE = "#00ff00";

/** The background a `testId` painted. */
const background = (runtime: Runtime, testId: string): unknown =>
  Option.getOrElse(
    Option.flatMap(runtime.element(testId), (element) =>
      Option.fromNullishOr(element.style.backgroundColor),
    ),
    () => expect.fail(`${testId} painted no background`),
  );

it("Button's callback repaints when focus arrives", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button
        testId="b"
        style={(state) => ({
          backgroundColor: state.focused ? FOCUSED : IDLE,
        })}
      >
        Save
      </Button>
    </Surface>,
  );
  expect(background(runtime, "b")).toBe(IDLE);
  runtime.focusNext();
  await settleFocus();
  expect(background(runtime, "b")).toBe(FOCUSED);
});

it("Checkbox's callback follows the checked state a click flips", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox
        testId="cb"
        label="Subscribe"
        style={(state) => ({
          backgroundColor: state.checked ? FOCUSED : IDLE,
        })}
      />
    </Surface>,
  );
  expect(background(runtime, "cb")).toBe(IDLE);
  runtime.click("cb");
  expect(background(runtime, "cb")).toBe(FOCUSED);
});

it("a field's callback sees its own invalid state, not a neighbour's", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <Input
          testId="valid"
          label="Valid"
          style={(state) => ({
            backgroundColor: state.invalid ? FOCUSED : IDLE,
          })}
        />
        <Input
          testId="invalid"
          label="Invalid"
          invalid
          style={(state) => ({
            backgroundColor: state.invalid ? FOCUSED : IDLE,
          })}
        />
      </Stack>
    </Surface>,
  );
  expect(background(runtime, "valid")).toBe(IDLE);
  expect(background(runtime, "invalid")).toBe(FOCUSED);
});

it("Toggle's callback follows the pressed state it reports", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Toggle
        testId="t"
        style={(state) => ({
          backgroundColor: state.checked ? FOCUSED : IDLE,
        })}
      >
        Bold
      </Toggle>
    </Surface>,
  );
  expect(background(runtime, "t")).toBe(IDLE);
  runtime.click("t");
  expect(background(runtime, "t")).toBe(FOCUSED);
});

it("a labelled ScrollArea's callback follows its own focus", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        testId="area"
        label="Files"
        axis="vertical"
        style={(state) => ({
          backgroundColor: state.focused ? FOCUSED : IDLE,
        })}
      >
        <Text>One</Text>
      </ScrollArea>
    </Surface>,
  );
  expect(background(runtime, "area")).toBe(IDLE);
  runtime.focusNext();
  await settleFocus();
  expect(background(runtime, "area")).toBe(FOCUSED);
});

it("a RadioGroup's option callback follows the selection", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Choice"
        defaultValue="alpha"
        options={[
          { value: "alpha", label: "Alpha" },
          { value: "beta", label: "Beta" },
        ]}
        optionStyle={(state) => ({
          backgroundColor: state.checked ? FOCUSED : IDLE,
        })}
      />
    </Surface>,
  );
  expect(background(runtime, "rg-alpha")).toBe(FOCUSED);
  expect(background(runtime, "rg-beta")).toBe(IDLE);
  runtime.click("rg-beta");
  expect(background(runtime, "rg-alpha")).toBe(IDLE);
  expect(background(runtime, "rg-beta")).toBe(FOCUSED);
});

it("a Rating's star callback follows the filled state", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating
        testId="rt"
        label="Rating"
        max={3}
        defaultValue={2}
        starStyle={(state) => ({
          backgroundColor: state.filled ? FOCUSED : IDLE,
        })}
      />
    </Surface>,
  );
  expect(background(runtime, "rt-star-1")).toBe(FOCUSED);
  expect(background(runtime, "rt-star-2")).toBe(FOCUSED);
  expect(background(runtime, "rt-star-3")).toBe(IDLE);
  runtime.click("rt-star-3");
  expect(background(runtime, "rt-star-3")).toBe(FOCUSED);
});

it("a CheckboxGroup's row callback sees the parent's mixed state", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="cg"
        label="Choices"
        selectAll="All"
        options={[
          { value: "alpha", label: "Alpha" },
          { value: "beta", label: "Beta" },
        ]}
        rowStyle={(state) => ({
          backgroundColor:
            state.parent && state.selection === "indeterminate"
              ? FOCUSED
              : IDLE,
        })}
      />
    </Surface>,
  );
  expect(background(runtime, "cg-all")).toBe(IDLE);
  runtime.click("cg-alpha");
  expect(background(runtime, "cg-all")).toBe(FOCUSED);
});

it("a Select trigger's callback follows the open state", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        placeholder="Pick one"
        options={[{ value: "apple", label: "Apple" }]}
        triggerStyle={(state) => ({
          backgroundColor: state.open ? FOCUSED : IDLE,
        })}
      />
    </Surface>,
  );
  const trigger = () =>
    Option.getOrElse(
      Option.flatMap(runtime.element("sel"), (element) =>
        Option.flatMap(Option.fromNullishOr(element.children[0]), (id) =>
          Option.fromNullishOr(runtime.renderer.getElement(id)),
        ),
      ),
      () => expect.fail("the Select painted no trigger"),
    );
  expect(trigger().style.backgroundColor).toBe(IDLE);
  runtime.clickElement(trigger());
  expect(trigger().style.backgroundColor).toBe(FOCUSED);
});

it("a Select's callback follows the open state", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        placeholder="Pick one"
        options={[{ value: "apple", label: "Apple" }]}
        style={(state) => ({
          backgroundColor: state.open ? FOCUSED : IDLE,
        })}
      />
    </Surface>,
  );
  expect(background(runtime, "sel")).toBe(IDLE);
  const trigger = Option.getOrElse(
    Option.flatMap(runtime.element("sel"), (element) =>
      Option.flatMap(Option.fromNullishOr(element.children[0]), (id) =>
        Option.fromNullishOr(runtime.renderer.getElement(id)),
      ),
    ),
    () => expect.fail("the Select painted no trigger"),
  );
  runtime.clickElement(trigger);
  expect(background(runtime, "sel")).toBe(FOCUSED);
});

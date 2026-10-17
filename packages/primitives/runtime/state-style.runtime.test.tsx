/**
 * State-aware `style` in the real GPUix runtime (plan 079).
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
import { Input } from "../src/components/Input.js";
import { Stack } from "../src/components/Stack.js";
import { Toggle } from "../src/components/Toggle.js";
import type { Runtime } from "./harness.js";
import { Surface, openWindow } from "./fixture.js";

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

/**
 * `autoFocus` must take focus whenever the field mounts, not only in the
 * window's first render.
 *
 * The bug this guards: the runtime applies a host element's `autoFocus` only
 * while the window is created. A field behind a loading skeleton (`show ? form
 * : skeleton`) is mounted later, so the prop was silently ignored — measured
 * in `examples/basic-app` (plan `327` §7.1), where the email field never took
 * focus after the skeleton was replaced and the app removed the prop.
 *
 * A component owns its mount, so a field can ask the renderer for focus once
 * its host exists. These cases mount the field in a second render and read the
 * renderer's own focused id; the control case proves the rule is tied to the
 * prop, and the disabled case proves an inert field is not focused.
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { Select } from "../src/components/Select.js";
import { TextArea } from "../src/components/TextArea.js";
import { Text } from "../src/components/Text.js";
import { isFocusRing } from "../src/testing/index.js";
import { Surface, awaitFrame, openWindow } from "./fixture.js";

/** The loading state a form shows before the field exists. */
const Loading = (): ReactElement => <Text role="caption">Loading</Text>;

/** The focused `testId`, or `"none"` so a failure names what was focused. */
const focused = (runtime: Awaited<ReturnType<typeof openWindow>>): string =>
  Option.getOrElse(runtime.focused(), () => "none");

/** Records the numbers a field reports. */
const recorder = () => {
  const values: number[] = [];
  return {
    values,
    onValueChange: (value: number) => {
      values.push(value);
    },
  };
};

it("focuses an Input that mounts after the first render", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <Input testId="field" label="Name" autoFocus />
    </Surface>,
  );
  expect(focused(runtime)).toBe("field");
});

it("focuses a controlled Input that mounts after the first render", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Email"
        value=""
        onValueChange={() => {}}
        autoFocus
      />
    </Surface>,
  );
  expect(focused(runtime)).toBe("field");
});

it("focuses a TextArea that mounts after the first render", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <TextArea testId="area" label="Notes" autoFocus />
    </Surface>,
  );
  expect(focused(runtime)).toBe("area");
});

it("focuses a NumberField that mounts after the first render", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <NumberField
        testId="number"
        label="Count"
        autoFocus
        onValueChange={field.onValueChange}
      />
    </Surface>,
  );
  expect(focused(runtime)).toBe("number-input");
  runtime.type("7");
  expect(
    Option.getOrElse(Arr.last(field.values), () =>
      expect.fail("typed nothing"),
    ),
  ).toBe(7);
});

it("focuses an OTPField's first cell when it mounts after the first render", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <OTPField testId="code" label="Code" length={4} autoFocus />
    </Surface>,
  );
  expect(focused(runtime)).toBe("code-cell-1");
});

it("does not focus a field that mounts later without autoFocus", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input testId="before" label="Before" autoFocus />
    </Surface>,
  );
  expect(focused(runtime)).toBe("before");
  runtime.render(
    <Surface>
      <Input testId="before" label="Before" autoFocus />
      <Input testId="field" label="Name" />
    </Surface>,
  );
  expect(focused(runtime)).toBe("before");
});

it("does not focus a disabled field that mounts later with autoFocus", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <Input testId="field" label="Name" disabled autoFocus />
    </Surface>,
  );
  expect(focused(runtime)).toBe("none");
});

it("rings a Select from the window's first render when autoFocus is set", async () => {
  // The seed half of plan 806: the runtime focuses the trigger without
  // dispatching `onFocus` (measured, plan 583), so the ring must start from the
  // prop or the first frame is blank. Measured: the seed paints it immediately.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        options={[{ value: "apple", label: "Apple" }]}
        autoFocus
      />
    </Surface>,
  );
  expect(focused(runtime)).toBe("sel-trigger");
  expect(
    Option.exists(runtime.element("sel-trigger"), (element) =>
      isFocusRing(element.style.boxShadow),
    ),
  ).toBe(true);
});

it("focuses a Select that mounts after the first render, rings included", async () => {
  // The gap guarded (plan 806): `autoFocus` is the field family's contract
  // (plan 584), but `Select` had no prop at all — its trigger is a `div`, and
  // the field whose host is not a native text input was left out. A focusable
  // `div` honours the host prop on a later mount too (probed). The ring follows
  // the tracker here, so a later mount may paint it one sample late.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        options={[{ value: "apple", label: "Apple" }]}
        autoFocus
      />
    </Surface>,
  );
  expect(focused(runtime)).toBe("sel-trigger");
  const ringed = (): boolean =>
    Option.exists(runtime.element("sel-trigger"), (element) =>
      isFocusRing(element.style.boxShadow),
    );
  await awaitFrame(ringed, "the mounted trigger paints its focus ring");
  expect(ringed()).toBe(true);
});

it("focuses a read-only Select, because the review state keeps its stop", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        options={[{ value: "apple", label: "Apple" }]}
        value="apple"
        readOnly
        autoFocus
      />
    </Surface>,
  );
  expect(focused(runtime)).toBe("sel-trigger");
});

it("does not focus a disabled Select that mounts later with autoFocus", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        options={[{ value: "apple", label: "Apple" }]}
        disabled
        autoFocus
      />
    </Surface>,
  );
  expect(focused(runtime)).toBe("none");
});

/**
 * `autoFocus` must take focus whenever the control mounts, not only in the
 * window's first render — and it must work for a control whose host is not a
 * native text input.
 *
 * The bug this guards: the field contract of plan `584`. A form behind a loading
 * skeleton (`show ? form : skeleton`) is mounted later, and the app had recorded
 * that a later mount never focused (`examples/basic-app`, plan `327` §7.1) —
 * measured, it does: the field's own host takes it, so the app's `autoFocus` was
 * correct all along. These cases mount each control in a second render and read
 * the renderer's own focused id; the control cases prove the rule is tied to the
 * prop, and the disabled cases prove an inert control is not focused.
 *
 * Plans `806` and `807` extended the same rule past the four text fields: first
 * `Select`, whose host is a `div` rather than an `<input>`, then the single-root
 * pressable controls (`Checkbox`, `Switch`, `Toggle`). The roving composites
 * (`RadioGroup`, `CheckboxGroup`, `ToggleGroup`, `Rating`, the sliders) are a
 * separate decision — which item receives the focus — recorded in `TODO.md`.
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Input } from "../src/components/Input.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { Select } from "../src/components/Select.js";
import { Switch } from "../src/components/Switch.js";
import { TextArea } from "../src/components/TextArea.js";
import { Text } from "../src/components/Text.js";
import { Toggle } from "../src/components/Toggle.js";
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

/**
 * The three pressable controls own one focusable root each, so the far edge of
 * `autoFocus` (plan `584`) applies to them too (plan `807`): a consent dialog or
 * a settings page whose first control is a checkbox, switch or toggle must be
 * able to put the keyboard there.
 */
interface PressableExtra {
  readonly autoFocus?: boolean;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
}

const pressable: ReadonlyArray<{
  readonly name: string;
  readonly node: (extra: PressableExtra) => ReactElement;
}> = [
  {
    name: "Checkbox",
    node: (extra) => <Checkbox testId="control" label="Accept" {...extra} />,
  },
  {
    name: "Switch",
    node: (extra) => <Switch testId="control" label="Pause" {...extra} />,
  },
  {
    name: "Toggle",
    node: (extra) => <Toggle testId="control" label="Grid" {...extra} />,
  },
];

/** A control mounted in a later render, with `extra` applied. */
const mountPressable = async (
  node: (extra: PressableExtra) => ReactElement,
  extra: PressableExtra,
): Promise<Awaited<ReturnType<typeof openWindow>>> => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Loading />
    </Surface>,
  );
  runtime.render(<Surface>{node(extra)}</Surface>);
  return runtime;
};

it.each(pressable)(
  "focuses a $name that mounts after the first render",
  async ({ node }) => {
    const runtime = await mountPressable(node, { autoFocus: true });
    expect(focused(runtime)).toBe("control");
  },
);

it.each(pressable)("focuses a read-only $name", async ({ node }) => {
  const runtime = await mountPressable(node, {
    autoFocus: true,
    readOnly: true,
  });
  expect(focused(runtime)).toBe("control");
});

it.each(pressable)("does not focus a disabled $name", async ({ node }) => {
  const runtime = await mountPressable(node, {
    autoFocus: true,
    disabled: true,
  });
  expect(focused(runtime)).toBe("none");
});

/**
 * A data option with a blank label is not an unnamed control (plan 589).
 *
 * The bug this guards: `CheckboxGroup`, `RadioGroup`, `ToggleGroup` and
 * `Select` passed `option.label` straight through `ariaName`, so a computed
 * empty label removed the row's name while its role, hit area and tab stop
 * stayed — an unnamed focus stop (the class plan 578 fixed for the select-all
 * parent). A selected blank `Select` option also announced and painted
 * whitespace. The option's `value` is its other identity, so a blank label must
 * fall back to it.
 *
 * Scoped per plan `529`: the host's binding delta breaks the full suite's
 * focus/geometry files, so this file mounts only the a11y and paint shapes and
 * is run by path.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { expect, it } from "vitest";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Select } from "../src/components/Select.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import {
  a11yNode,
  a11yNodes,
  a11yValueOf,
  type Runtime,
} from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

/** The names the tree publishes for one role, trimmed; absent reads as `""`. */
const namesOf = (runtime: Runtime, role: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(a11yNodes(runtime.a11y()), (node) => node.aria?.role === role),
    (node) => (node.aria?.label ?? "").trim(),
  );

/** The own text plus descendants the runtime painted for one test id. */
const textOf = (runtime: Runtime, testId: string): string =>
  Option.getOrElse(runtime.text(testId), () => "").trim();

it("names and paints a checkbox row by its value when the label is blank", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="cg"
        label="Channels"
        options={[
          { value: "apple", label: "   " },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  expect(namesOf(runtime, "CheckBox")).toStrictEqual(["apple", "Pear"]);
  expect(textOf(runtime, "cg-apple")).toBe("apple");
  expect(textOf(runtime, "cg-pear")).toBe("Pear");
});

it("names a radio option by its value when the label is blank", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Colour"
        options={[
          { value: "red", label: "" },
          { value: "blue", label: "Blue" },
        ]}
      />
    </Surface>,
  );
  expect(namesOf(runtime, "RadioButton")).toStrictEqual(["red", "Blue"]);
  expect(textOf(runtime, "rg-red")).toBe("red");
  expect(textOf(runtime, "rg-blue")).toBe("Blue");
});

it("names a toggle-group item by its value, including the tab stop", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        testId="tg"
        label="Align"
        type="single"
        options={[
          { value: "left", label: "  " },
          { value: "right", label: "Right" },
        ]}
      />
    </Surface>,
  );
  expect(namesOf(runtime, "Button")).toStrictEqual(["left", "Right"]);
  expect(textOf(runtime, "tg-left")).toBe("left");
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("tg-left");
});

it("shows and announces a selected select option by its value when its label is blank", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        options={[
          { value: "one", label: "   " },
          { value: "two", label: "Two" },
        ]}
        defaultValue="one"
      />
    </Surface>,
  );
  expect(
    Option.getOrUndefined(a11yValueOf(runtime.a11y(), { role: "ComboBox" })),
  ).toBe("one");
  expect(textOf(runtime, "sel-trigger")).toContain("one");
  const trigger = Option.getOrElse(runtime.element("sel-trigger"), () =>
    expect.fail("the select painted no trigger"),
  );
  runtime.clickElement(trigger);
  runtime.flush();
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "ListBoxOption", label: "one" }),
    ),
  ).toBe(true);
  expect(textOf(runtime, "sel-option-one")).toBe("one");
});

/**
 * A blank label is not a name — the runtime half.
 *
 * The bug this guards (plan 026): plans 396/399 stopped `Button`/`Toggle`/
 * `ScrollArea`/`Icon` publishing a blank name, but every other named surface
 * still passed the raw label into `aria-label`. `Spinner` lost its documented
 * "Loading" name, an OTP cell became `" digit 1"`, and a range thumb became
 * `"   minimum"`. The offline suites guard the props each component writes;
 * this file proves the accessibility tree the runtime actually builds.
 *
 * Scoped per plan `529`: the host's binding delta breaks the full suite's
 * focus/geometry files, so this file mounts only the a11y shapes and is run by
 * path.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { expect, it } from "vitest";
import { Checkbox } from "../src/components/Checkbox.js";
import { OTPField } from "../src/components/OTPField.js";
import { Progress } from "../src/components/Progress.js";
import { Select } from "../src/components/Select.js";
import { RangeSlider } from "../src/components/Slider.js";
import { Spinner } from "../src/components/Spinner.js";
import { a11yNode, a11yNodes, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

/** The names the tree publishes for one role, trimmed; absent reads as `""`. */
const namesOf = (runtime: Runtime, role: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(a11yNodes(runtime.a11y()), (node) => node.aria?.role === role),
    (node) => (node.aria?.label ?? "").trim(),
  );

it("keeps a spinner's documented name when its label is blank", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Spinner testId="spinner" label="   " />
    </Surface>,
  );
  expect(namesOf(runtime, "Status")).toStrictEqual(["Loading"]);
});

it("falls back to Code for an OTP field's blank label", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <OTPField testId="otp" label="   " />
    </Surface>,
  );
  const dump = runtime.a11y();
  expect(
    Option.isSome(a11yNode(dump, { role: "TextInput", label: "Code digit 1" })),
  ).toBe(true);
  expect(namesOf(runtime, "Group")).toStrictEqual([""]);
});

it("publishes no whitespace-composed name for a blank range label", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RangeSlider testId="range" label="   " defaultValue={[20, 60]} />
    </Surface>,
  );
  expect(namesOf(runtime, "Slider")).toStrictEqual(["", ""]);
});

it("leaves a blank progress label unnamed", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="progress" label="   " value={42} />
    </Surface>,
  );
  expect(namesOf(runtime, "ProgressIndicator")).toStrictEqual([""]);
});

it("leaves a blank checkbox label unnamed", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox testId="check" label="   " />
    </Surface>,
  );
  expect(namesOf(runtime, "CheckBox")).toStrictEqual([""]);
});

it("leaves a blank select trigger and list unnamed", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="select"
        label="   "
        placeholder="Pick one"
        options={[{ value: "apple", label: "Apple" }]}
      />
    </Surface>,
  );
  expect(namesOf(runtime, "ComboBox")).toStrictEqual([""]);
  const trigger = Option.getOrElse(runtime.element("select-trigger"), () =>
    expect.fail("the select painted no trigger"),
  );
  runtime.clickElement(trigger);
  runtime.flush();
  expect(namesOf(runtime, "ListBox")).toStrictEqual([""]);
});

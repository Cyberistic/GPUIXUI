/**
 * A `Select`'s announced value: trimmed like its option's name, absent when
 * blank.
 *
 * **The bug guarded (plan 635).** GPUix 0.10.0 has no `aria-valuenow`, so a
 * combobox's value reaches AccessKit through `aria-valuetext`. The wrapper wrote
 * `selectedLabel ?? placeholder` raw, while the same option's row announced a
 * trimmed `aria-label` (`ariaName`): a padded translation was announced with
 * its padding on the trigger, and a computed blank placeholder became a
 * whitespace value on a focusable combobox. This file is the AccessKit half of
 * the guard; `src/core/select.test.ts` and `src/components/Select.test.tsx`
 * hold the pure rule and the element tree.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Select } from "../src/components/Select.js";
import { a11yNode, a11yValueOf, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const options = [{ value: "apple", label: "  Apple  " }] as const;

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

/** The combobox's announced value, as AccessKit reports it. */
const announced = (runtime: Runtime): Option.Option<string> =>
  a11yValueOf(runtime.a11y(), { role: "ComboBox", label: "Fruit" });

it("announces a padded placeholder without its padding", async () => {
  const runtime = await mount(
    <Select
      testId="sel"
      label="Fruit"
      placeholder="  Pick one  "
      options={options}
    />,
  );
  expect(announced(runtime)).toEqual(Option.some("Pick one"));
});

it("announces no value for a blank placeholder", async () => {
  const runtime = await mount(
    <Select testId="sel" label="Fruit" placeholder="   " options={options} />,
  );
  expect(Option.isNone(announced(runtime))).toBe(true);
});

it("announces a chosen option with the same trimmed name as its row", async () => {
  const runtime = await mount(
    <Select
      testId="sel"
      label="Fruit"
      placeholder="Pick one"
      defaultValue="apple"
      options={options}
    />,
  );
  expect(announced(runtime)).toEqual(Option.some("Apple"));

  const trigger = Option.getOrElse(runtime.element("sel-trigger"), () =>
    expect.fail("the select painted no trigger"),
  );
  runtime.clickElement(trigger);
  runtime.flush();
  const row = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "ListBoxOption" }),
    () => expect.fail("the open list published no option node"),
  );
  expect(row.aria?.label).toBe("Apple");
});

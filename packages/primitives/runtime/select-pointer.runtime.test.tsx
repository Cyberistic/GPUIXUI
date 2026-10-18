/**
 * Pointer selection on a `Select` option, in the real GPUix runtime.
 *
 * Two bugs are guarded here.
 *
 * 1. A diagnostic probe (committed by `f51c5568`, deleted by plan `390`)
 *    asserted that clicking an enabled option's **painted label** reports
 *    nothing. It reports the option — the label is the part of the row a user
 *    actually aims at — so that expectation was wrong and the probe was never a
 *    contract. This file is the real contract: the label is a hit target, the
 *    list closes, the value is reported, and native focus returns to the
 *    trigger rather than being stranded in an unmounted layer.
 * 2. A disabled option must refuse the same gesture and leave the list open,
 *    because a click that silently closes a menu would look like a selection.
 *
 * The observations are values, focus and painted text only — no absolute
 * geometry — so they stay valid on a host whose artifact has degraded bounds
 * (plan `379` §6, plan `529`).
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { TestElement } from "@gpuix/react/testing";
import { Input } from "../src/components/Input.js";
import { Select } from "../src/components/Select.js";
import { Stack } from "../src/components/Stack.js";
import type { Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

interface Scene {
  readonly runtime: Runtime;
  readonly values: ReadonlyArray<string>;
}

/** An option list with one disabled row, mounted beside a field after it. */
const openSelect = async (): Promise<Scene> => {
  const runtime = await openWindow();
  const values: string[] = [];
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Select
          testId="s"
          label="Letter"
          placeholder="Pick a letter"
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta", disabled: true },
            { value: "c", label: "Gamma" },
          ]}
          onValueChange={(value) => values.push(value)}
        />
        <Input testId="after" label="After" />
      </Stack>
    </Surface>,
  );
  runtime.click("s-trigger");
  runtime.flush();
  return { runtime, values };
};

/** The painted `<text>` node for a label. */
const labelOf = (runtime: Runtime, text: string): TestElement =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.renderer.findByType("text"),
      (element) => element.text === text,
    ),
    () => expect.fail(`the list painted no "${text}" label`),
  );

const focusedId = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () =>
    expect.fail("no element holds native focus"),
  );

it("selects the option whose painted label is clicked, and returns focus to the trigger", async () => {
  const { runtime, values } = await openSelect();
  // The option row is addressable (plan 390) — proving the locator exists is
  // also the plan's STOP condition 1.
  expect(Option.isSome(runtime.element("s-option-c"))).toBe(true);

  runtime.clickElement(labelOf(runtime, "Gamma"));
  runtime.flush();

  expect(values).toStrictEqual(["c"]);
  // The list closed: its other labels are gone, and the trigger now paints the
  // chosen one.
  expect(runtime.allText()).not.toContain("Alpha");
  expect(runtime.allText()).toContain("Gamma");
  expect(focusedId(runtime)).toBe("s-trigger");
});

it("does not select a disabled option's label and keeps the list open", async () => {
  const { runtime, values } = await openSelect();

  runtime.clickElement(labelOf(runtime, "Beta"));
  runtime.flush();

  expect(values).toStrictEqual([]);
  expect(runtime.allText()).toContain("Beta");
});

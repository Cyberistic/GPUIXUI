/**
 * The group row's pointer feedback in the real GPUix runtime.
 *
 * The bug this guards (plan `355`): `CheckboxGroup` and `RadioGroup` make the
 * **row** the control — it carries the role, the accessible name, the tab stop
 * and both handlers — but only the inner selection box declared `hover`/
 * `active`. Measured, the row element's authored style had neither key, so
 * hovering the label column, most of the hit area, painted nothing at all.
 *
 * The renderer reports the authored `StyleDesc`, so these cases prove the
 * declaration reaches the runtime and that the row's painted box is the hit
 * area it covers. GPUI applies the declaration natively; the applied colour is
 * not observable through `TestElement.style` (the same limit the Button's own
 * hover has always had).
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { TestElement } from "@gpuix/react/testing";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import type { Runtime } from "../src/testing/runtime.js";
import { openWindow, Surface, testTheme } from "./fixture.js";

const NestedStyle = Schema.Record(Schema.String, Schema.Unknown);
const decodeNested = Schema.decodeUnknownOption(NestedStyle);

const elementOf = (runtime: Runtime, testId: string): TestElement =>
  Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`the runtime retained no element named ${testId}`),
  );

const washOf = (
  runtime: Runtime,
  testId: string,
  state: "hover" | "active",
): Option.Option<Record<string, unknown>> =>
  Option.flatMap(
    Option.fromNullishOr(elementOf(runtime, testId).style[state]),
    decodeNested,
  );

const expectWash = (
  runtime: Runtime,
  testId: string,
  expected: string,
): void => {
  expect(
    Option.getOrElse(washOf(runtime, testId, "hover"), () =>
      expect.fail(`${testId} declared no hover`),
    ),
  ).toMatchObject({ backgroundColor: expected });
};

const checkboxOptions = [
  { value: "email", label: "Email", description: "A digest." },
  { value: "push", label: "Push" },
] as const;

it("paints the hover and press wash on every enabled CheckboxGroup row", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="cg"
        label="Channels"
        selectAll="All channels"
        options={checkboxOptions}
        defaultValue={["email"]}
      />
    </Surface>,
  );
  Arr.forEach(["cg-all", "cg-email", "cg-push"], (testId) => {
    expectWash(runtime, testId, testTheme.colors.hover);
    expect(
      Option.getOrElse(washOf(runtime, testId, "active"), () =>
        expect.fail(`${testId} declared no active`),
      ),
    ).toMatchObject({ backgroundColor: testTheme.colors.active });
  });
});

it("paints the wash on every enabled RadioGroup row", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Cadence"
        defaultValue="daily"
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly", description: "Every Monday." },
        ]}
      />
    </Surface>,
  );
  Arr.forEach(["rg-daily", "rg-weekly"], (testId) => {
    expectWash(runtime, testId, testTheme.colors.hover);
    expect(
      Option.getOrElse(washOf(runtime, testId, "active"), () =>
        expect.fail(`${testId} declared no active`),
      ),
    ).toMatchObject({ backgroundColor: testTheme.colors.active });
  });
});

it("declares no wash on a disabled row or a disabled group", async () => {
  // Plan 332's rule reaches the row: a control that cannot act must not
  // respond to the pointer, and an absent key is the only honest declaration.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="cg"
        label="Channels"
        options={[
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
        ]}
      />
      <CheckboxGroup
        testId="off"
        label="Off"
        disabled
        options={[{ value: "sms", label: "SMS" }]}
      />
      <RadioGroup
        testId="rg"
        label="Cadence"
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly", disabled: true },
        ]}
      />
    </Surface>,
  );
  Arr.forEach(["cg-push", "off-sms", "rg-weekly"], (testId) => {
    expect(washOf(runtime, testId, "hover")).toStrictEqual(Option.none());
    expect(washOf(runtime, testId, "active")).toStrictEqual(Option.none());
  });
  // The enabled neighbours still declare it, so the case is not vacuous.
  expectWash(runtime, "cg-email", testTheme.colors.hover);
  expectWash(runtime, "rg-daily", testTheme.colors.hover);
});

it("makes the wash cover the row, which is the whole hit area", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup testId="cg" label="Channels" options={checkboxOptions} />
      <RadioGroup
        testId="rg"
        label="Cadence"
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
        ]}
      />
    </Surface>,
  );
  const widthOf = (testId: string): number =>
    Option.getOrElse(runtime.bounds(testId), () =>
      expect.fail(`${testId} painted no box`),
    ).width;
  // A vertical group stretches its rows, so the wash spans the clickable width.
  Arr.forEach(
    [
      { group: "cg", row: "cg-email" },
      { group: "cg", row: "cg-push" },
      { group: "rg", row: "rg-daily" },
      { group: "rg", row: "rg-weekly" },
    ],
    ({ group, row }) => {
      expect(widthOf(row)).toBe(widthOf(group));
    },
  );
});

it("lets a caller's optionStyle own the wash, merged last", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Cadence"
        options={[{ value: "daily", label: "Daily" }]}
        optionStyle={{ hover: { backgroundColor: "#123456" } }}
      />
    </Surface>,
  );
  expect(Option.isSome(washOf(runtime, "rg-daily", "hover"))).toBe(true);
  expectWash(runtime, "rg-daily", "#123456");
});

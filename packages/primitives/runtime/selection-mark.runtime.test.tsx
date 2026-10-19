/**
 * A selection mark scales with its box.
 *
 * The bug this guards (plan `640`): `Checkbox` and `CheckboxGroup` painted the
 * tick at `theme.iconSize.sm` (14 px) at **every** control size, while the box
 * is `theme.iconSize[size]` (14 / 16 / 20). Measured before the fix: the mark's
 * painted box was `14 × 14` at `sm`, `md` and `lg` — larger than `sm`'s 12 px
 * content square (it painted across the border band) and visibly small in a
 * 20 px `lg` box. The radio dot (`iconSize[size] / 2`) and the switch thumb
 * already scaled, so the tick was the one mark that ignored `size`.
 *
 * The tick is now the box's **content square** — `iconSize[size] − 2 × thin` —
 * so `md`'s 14 px is unchanged and `sm`/`lg` paint 12/18.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { TestElement } from "@gpuix/react/testing";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const elementOf = (runtime: Runtime, testId: string): TestElement =>
  Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`the runtime retained no element for ${testId}`),
  );

const childOfType = (
  runtime: Runtime,
  parent: TestElement,
  type: string,
): TestElement =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.parentId === parent.id && element.type === type,
    ),
    () => expect.fail(`no <${type}> under ${parent.testId ?? parent.id}`),
  );

const boundsOfId = (runtime: Runtime, id: number): Bounds =>
  Option.getOrElse(runtime.boundsOfId(id), () =>
    expect.fail(`the runtime painted no box for element ${id}`),
  );

const inside = (child: Bounds, parent: Bounds): boolean =>
  child.x >= parent.x &&
  child.y >= parent.y &&
  child.x + child.width <= parent.x + parent.width &&
  child.y + child.height <= parent.y + parent.height;

it.each([
  ["sm", 12],
  ["md", 14],
  ["lg", 18],
] as const)("paints a %s checkbox mark at %i px", async (size, expected) => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox testId="mark" size={size} defaultChecked label="Check" />
    </Surface>,
  );
  const host = elementOf(runtime, "mark");
  const mark = childOfType(runtime, host, "svg");
  const markBox = boundsOfId(runtime, mark.id);
  const box = Option.getOrElse(runtime.paintBounds("mark"), () =>
    expect.fail("the runtime painted no box for the checkbox"),
  );
  expect(markBox.width).toBe(expected);
  expect(markBox.height).toBe(expected);
  expect(inside(markBox, box)).toBe(true);
});

it("keeps the mark's side when the box is larger", async () => {
  // The failing half of the old direction: both boxes painted the same 14 px
  // mark, so `lg` was not larger than `md`.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox testId="sm" size="sm" defaultChecked label="Small" />
      <Checkbox testId="lg" size="lg" defaultChecked label="Large" />
    </Surface>,
  );
  const small = childOfType(runtime, elementOf(runtime, "sm"), "svg");
  const large = childOfType(runtime, elementOf(runtime, "lg"), "svg");
  expect(boundsOfId(runtime, large.id).width).toBeGreaterThan(
    boundsOfId(runtime, small.id).width,
  );
});

it.each([
  ["sm", 12],
  ["lg", 18],
] as const)("paints a %s group row's mark at %i px", async (size, expected) => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="group"
        size={size}
        label="Channels"
        defaultValue={["email"]}
        options={[{ value: "email", label: "Email" }]}
      />
    </Surface>,
  );
  const row = elementOf(runtime, "group-email");
  const box = childOfType(runtime, row, "div");
  const mark = childOfType(runtime, box, "svg");
  const markBox = boundsOfId(runtime, mark.id);
  expect(markBox.width).toBe(expected);
  expect(markBox.height).toBe(expected);
});

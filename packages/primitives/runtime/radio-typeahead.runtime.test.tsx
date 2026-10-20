/**
 * `RadioGroup` type-ahead, in the real runtime.
 *
 * The gap these guard (plan 741): a focused group answered every printable key
 * with nothing, so choosing a named option in a long group meant walking the
 * arrows, while `Select` already answered a typed prefix (plans 731/732). The
 * group now shares one rule with `Select`: the next enabled option whose text
 * starts with the typed prefix is selected and focused, the search starts after
 * the keyboard's cursor, a repeated letter advances, and a disabled group types
 * nothing.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { RadioGroup, type RadioOption } from "../src/components/RadioGroup.js";
import { a11yValueOf, type Runtime } from "../src/testing/index.js";
import { openWindow, Surface } from "./fixture.js";

const OPTIONS: ReadonlyArray<RadioOption> = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "eu", label: "Europe" },
  { value: "ee", label: "Estonia" },
];

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "none");

/** What the option named `label` announces. */
const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

/**
 * Type a key sequence, delivering each key to the element the group says holds
 * focus — the same walk a user performs. A group that never moves focus repeats
 * the first target, which is what makes the advance cases fail by name.
 */
const type = (
  runtime: Runtime,
  startId: string,
  keys: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  Arr.map(keys, (key) => {
    const before = focused(runtime);
    runtime.keyDown(before === "none" ? startId : before, key);
    return focused(runtime);
  });

it("selects the next option whose text starts with the typed letter", async () => {
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Country"
      defaultValue="a"
      options={OPTIONS}
    />,
  );
  runtime.focusNext();
  expect(focused(runtime)).toBe("rg-a");
  runtime.keyDown("rg-a", "e");
  expect(focused(runtime)).toBe("rg-eu");
  expect(announced(runtime, "Europe")).toBe("checked");
  expect(announced(runtime, "Alpha")).toBe("unchecked");
});

it("advances to the next match on a repeated letter", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Country"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  expect(type(runtime, "rg-a", ["e", "e"])).toStrictEqual(["rg-eu", "rg-ee"]);
  expect(reports).toStrictEqual(["eu", "ee"]);
  // The parent never applies a report, so the **paint** stays on its value; only
  // the ring and the reports advance. That is the deferring contract, not a bug.
  expect(announced(runtime, "Alpha")).toBe("checked");
  expect(announced(runtime, "Estonia")).toBe("unchecked");
});

it("wraps from the last match back to the first", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Country"
      defaultValue="ee"
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  expect(type(runtime, "rg-ee", ["e"])).toStrictEqual(["rg-eu"]);
  expect(reports).toStrictEqual(["eu"]);
});

it("skips a disabled and a blank-text match", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Country"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={[
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
        { value: "eu", label: "Europe", disabled: true },
        { value: "", label: "" },
        { value: "ee", label: "Estonia" },
      ]}
    />,
  );
  expect(type(runtime, "rg-a", ["e"])).toStrictEqual(["rg-ee"]);
  expect(reports).toStrictEqual(["ee"]);
});

it("changes nothing on an unmatched letter and does not poison the next one", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Country"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  runtime.focusNext();
  runtime.keyDown("rg-a", "z");
  expect(reports).toStrictEqual([]);
  expect(focused(runtime)).toBe("rg-a");
  expect(type(runtime, "rg-a", ["e"])).toStrictEqual(["rg-eu"]);
  expect(reports).toStrictEqual(["eu"]);
});

it("still advances for a controlled parent that defers the report", async () => {
  // The plan-359/732 trap: a parent that keeps its own value must not pin the
  // prefix on one option. The search starts from the group's cursor, so the
  // second `e` reaches Estonia even though the value stays "a".
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Country"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  expect(type(runtime, "rg-a", ["e", "e"])).toStrictEqual(["rg-eu", "rg-ee"]);
  expect(reports).toStrictEqual(["eu", "ee"]);
});

it("continues the prefix from the option the arrows reached", async () => {
  // The prefix searches after the keyboard's cursor, not the committed value: a
  // deferring parent keeps the value on Alpha while an arrow walks focus to
  // Europe, and `e` must then reach Estonia (plan 741).
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Country"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  expect(type(runtime, "rg-a", ["down", "down", "e"])).toStrictEqual([
    "rg-b",
    "rg-eu",
    "rg-ee",
  ]);
  expect(reports).toStrictEqual(["b", "eu", "ee"]);
});

it("types nothing while the group is disabled", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Country"
      value="a"
      disabled
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  runtime.keyDown("rg-eu", "e");
  expect(reports).toStrictEqual([]);
  expect(focused(runtime)).not.toBe("rg-ee");
});

it("treats a held key as a repeat, not as a character", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Country"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  runtime.focusNext();
  runtime.keyDown("rg-a", "e", true);
  expect(reports).toStrictEqual([]);
  expect(focused(runtime)).toBe("rg-a");
  // The refused repeat did not open a prefix: one real `e` still reaches Europe.
  runtime.keyDown("rg-a", "e");
  expect(reports).toStrictEqual(["eu"]);
  expect(focused(runtime)).toBe("rg-eu");
});

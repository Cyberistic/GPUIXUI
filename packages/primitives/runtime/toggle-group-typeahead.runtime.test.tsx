/**
 * `ToggleGroup` type-ahead, in the real runtime.
 *
 * The gap these guard (plan 751): a focused group answered every printable key
 * with nothing, so a long segmented control was arrow-only, while `RadioGroup`
 * and `Select` already answered a typed prefix over the same option shape. The
 * group now shares the one rule: in `single` the next enabled match is selected
 * **and** focused; in `multiple` it is only focused, so typing a name never
 * presses a formatting button. The search starts after the keyboard's cursor, a
 * repeated letter advances, and a disabled item, a chord, a held repeat or a
 * disabled group types nothing.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import type { ToggleGroupOption } from "../src/core/toggle-group.js";
import { a11yValueOf, type Runtime } from "../src/testing/index.js";
import { openWindow, Surface } from "./fixture.js";

const OPTIONS: ReadonlyArray<ToggleGroupOption> = [
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
  Option.getOrElse(runtime.focused(), () => "nothing");

/** What the item named `label` announces through `aria-valuetext`. */
const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

/**
 * Type a key sequence, delivering each key to the item the group says holds
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
    runtime.keyDown(before === "nothing" ? startId : before, key);
    return focused(runtime);
  });

it("selects and focuses the next item whose text starts with the typed letter", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="single"
      testId="tg"
      label="Country"
      defaultValue="a"
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  runtime.focusNext();
  expect(focused(runtime)).toBe("tg-a");
  runtime.keyDown("tg-a", "e");
  expect(focused(runtime)).toBe("tg-eu");
  expect(announced(runtime, "Europe")).toBe("pressed");
  expect(announced(runtime, "Alpha")).toBe("not pressed");
  expect(reports).toStrictEqual(["eu"]);
});

it("advances to the next match on a repeated letter", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="single"
      testId="tg"
      label="Country"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  expect(type(runtime, "tg-a", ["e", "e"])).toStrictEqual(["tg-eu", "tg-ee"]);
  expect(reports).toStrictEqual(["eu", "ee"]);
  // The parent never applies a report, so the **paint** stays on its value; only
  // the ring and the reports advance. That is the deferring contract.
  expect(announced(runtime, "Alpha")).toBe("pressed");
  expect(announced(runtime, "Estonia")).toBe("not pressed");
});

it("only focuses the match in multiple mode and leaves the pressed set alone", async () => {
  const reports: ReadonlyArray<string>[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="multiple"
      testId="tg"
      label="Formatting"
      defaultValue={["bold"]}
      onValueChange={(value) => reports.push(value)}
      options={[
        { value: "bold", label: "Bold" },
        { value: "italic", label: "Italic" },
        { value: "underline", label: "Underline" },
      ]}
    />,
  );
  runtime.focusNext();
  expect(focused(runtime)).toBe("tg-bold");
  runtime.keyDown("tg-bold", "i");
  expect(focused(runtime)).toBe("tg-italic");
  expect(reports).toStrictEqual([]);
  expect(announced(runtime, "Italic")).toBe("not pressed");
  expect(announced(runtime, "Bold")).toBe("pressed");
  // The focus move is real: activation still needs the item's own key.
  runtime.keyUp("tg-italic", "space");
  expect(reports).toStrictEqual([["bold", "italic"]]);
  expect(announced(runtime, "Italic")).toBe("pressed");
});

it("skips a disabled and a blank-text match", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="single"
      testId="tg"
      label="Country"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={[
        { value: "a", label: "Alpha" },
        { value: "eu", label: "Europe", disabled: true },
        { value: "", label: "" },
        { value: "ee", label: "Estonia" },
      ]}
    />,
  );
  expect(type(runtime, "tg-a", ["e"])).toStrictEqual(["tg-ee"]);
  expect(reports).toStrictEqual(["ee"]);
});

it("changes nothing on an unmatched letter and does not poison the next one", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="single"
      testId="tg"
      label="Country"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  runtime.focusNext();
  runtime.keyDown("tg-a", "z");
  expect(reports).toStrictEqual([]);
  expect(focused(runtime)).toBe("tg-a");
  expect(type(runtime, "tg-a", ["e"])).toStrictEqual(["tg-eu"]);
  expect(reports).toStrictEqual(["eu"]);
});

it("treats a held key as a repeat, and types nothing into a disabled group", async () => {
  const held: string[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="single"
      testId="tg"
      label="Country"
      value="a"
      onValueChange={(value) => held.push(value)}
      options={OPTIONS}
    />,
  );
  runtime.focusNext();
  runtime.keyDown("tg-a", "e", true);
  expect(held).toStrictEqual([]);
  expect(focused(runtime)).toBe("tg-a");
  // The refused repeat did not open a prefix: one real `e` still reaches Europe.
  runtime.keyDown("tg-a", "e");
  expect(held).toStrictEqual(["eu"]);
  expect(focused(runtime)).toBe("tg-eu");

  const disabled: string[] = [];
  const blocked = await mount(
    <ToggleGroup
      type="single"
      testId="blocked"
      label="Country"
      value="a"
      disabled
      onValueChange={(value) => disabled.push(value)}
      options={OPTIONS}
    />,
  );
  blocked.keyDown("blocked-a", "e");
  expect(disabled).toStrictEqual([]);
  expect(focused(blocked)).not.toBe("blocked-ee");
});

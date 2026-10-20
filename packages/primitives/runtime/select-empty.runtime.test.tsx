/**
 * A `Select` with nothing to list, in the real runtime.
 *
 * The bug these guard (plan 745): plan 346 closed a **disabled** select because
 * the runtime refuses every choice on it, so a painted list would be a dead
 * menu. An **empty** option list is the same dead menu — a `listbox` with no
 * rows offers nothing — and nothing refused it: measured, `Tab` focused the
 * trigger and `Enter` painted an empty `ListBox` node. A computed options list
 * (data still loading, a filtered set) reaches that state in normal use.
 *
 * The field is not disabled: the trigger stays focusable, named and showing its
 * placeholder. Only the empty list is refused, and all-disabled options still
 * open, because seeing why nothing can be picked is information.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Select, type SelectProps } from "../src/components/Select.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNodes } from "../src/testing/index.js";
import { openWindow, Surface } from "./fixture.js";

/** Whether the list's content element exists. */
const listPainted = (
  runtime: Awaited<ReturnType<typeof openWindow>>,
): boolean => Option.isSome(runtime.element("s-content"));

/** The roles the last frame published. */
const roles = (
  runtime: Awaited<ReturnType<typeof openWindow>>,
): ReadonlyArray<string> =>
  a11yNodes(runtime.a11y()).map((node) => node.aria?.role ?? "");

/** A select with the given options, mounted with a field after it. */
const scene = async (options: SelectProps["options"]) => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Select
          testId="s"
          label="Fruit"
          placeholder="Pick a fruit"
          options={options}
        />
      </Stack>
    </Surface>,
  );
  runtime.flush();
  return runtime;
};

it("does not open a list with no options", async () => {
  const runtime = await scene([]);
  runtime.focusNext();
  runtime.flush();
  expect(Option.getOrUndefined(runtime.focused())).toBe("s-trigger");

  runtime.keyDown("s-trigger", "enter");
  runtime.flush();
  expect(listPainted(runtime)).toBe(false);
  expect(roles(runtime)).not.toContain("ListBox");

  runtime.keyDown("s-trigger", "down");
  runtime.flush();
  expect(listPainted(runtime)).toBe(false);

  runtime.click("s-trigger");
  runtime.flush();
  expect(listPainted(runtime)).toBe(false);
  expect(roles(runtime)).not.toContain("ListBox");

  // The field is not broken — it is the empty state that refuses. Options
  // arriving later open normally.
  runtime.render(
    <Surface>
      <Select
        testId="s"
        label="Fruit"
        placeholder="Pick a fruit"
        options={[
          { value: "a", label: "Apple" },
          { value: "p", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  runtime.flush();
  runtime.click("s-trigger");
  runtime.flush();
  expect(listPainted(runtime)).toBe(true);
  expect(runtime.allText()).toContain("Apple");
});

it("does not open for a group with no rows", async () => {
  // A group contributes its options, so an empty group is no choice; counting
  // `options.length` would call this one entry a list.
  const runtime = await scene([{ label: "Empty", options: [] }]);
  runtime.click("s-trigger");
  runtime.flush();
  expect(listPainted(runtime)).toBe(false);
  expect(roles(runtime)).not.toContain("ListBox");
});

it("still opens when every option is disabled", async () => {
  // The gate is emptiness, not selectability: a list of disabled rows shows
  // why nothing can be picked.
  const runtime = await scene([{ value: "a", label: "Apple", disabled: true }]);
  runtime.click("s-trigger");
  runtime.flush();
  expect(listPainted(runtime)).toBe(true);
  expect(runtime.allText()).toContain("Apple");
});

it("asks a controlled parent to close an empty open request once", async () => {
  const requested: Array<boolean> = [];
  const runtime = await openWindow();
  const render = (options: SelectProps["options"]) => {
    runtime.render(
      <Surface>
        <Select
          testId="s"
          label="Fruit"
          placeholder="Pick a fruit"
          options={options}
          open
          onOpenChange={(next) => requested.push(next)}
        />
      </Surface>,
    );
    runtime.flush();
  };
  render([]);
  expect(listPainted(runtime)).toBe(false);
  expect(roles(runtime)).not.toContain("ListBox");
  expect(requested).toStrictEqual([false]);
  // The same controlled `open` does not ask again while the list is empty…
  render([]);
  expect(requested).toStrictEqual([false]);
  // …and paints once there is something to show.
  render([{ value: "a", label: "Apple" }]);
  expect(listPainted(runtime)).toBe(true);
  expect(requested).toStrictEqual([false]);
});

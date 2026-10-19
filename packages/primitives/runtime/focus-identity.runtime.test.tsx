/**
 * A composite's focus must follow the item, not its array index.
 *
 * The bug guarded (plan `692`): `useRovingFocus` stored the event-focused
 * **index**, `ToggleGroup` stored its `multiple` tab stop as an index, and
 * `CheckboxGroup` kept a second copy of the same index state. A caller that
 * reordered or filtered `options` therefore moved the ring and the Tab stop to
 * whichever item happened to occupy that position. This suite re-renders each
 * group with its options reordered and asserts the painted ring, native focus
 * and the Tab stop still name the same option — the host id and the option's
 * value are the identities the runtime and the data already provide.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { isFocusRing, type Runtime } from "../src/testing/index.js";
import { Surface, awaitFrame, openWindow, settleFocus } from "./fixture.js";

const formatting = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
  { value: "underline", label: "Underline" },
] as const;

/** The same items, with the last one moved to the front. */
const reordered = [
  { value: "underline", label: "Underline" },
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
] as const;

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "nothing");

const ringOn = (runtime: Runtime, testId: string): boolean =>
  Option.exists(runtime.element(testId), (element) =>
    isFocusRing(element.style.boxShadow),
  );

/** The ring a `CheckboxGroup` paints on the box inside its interactive row. */
const boxRingOn = (runtime: Runtime, testId: string): boolean =>
  Option.exists(
    Option.flatMap(runtime.element(testId), (row) =>
      Option.flatMap(Option.fromNullishOr(row.children[0]), (id) =>
        Option.fromNullishOr(runtime.renderer.getElement(id)),
      ),
    ),
    (box) => isFocusRing(box.style.boxShadow),
  );

const renderToggleGroup = (
  runtime: Runtime,
  mode: "single" | "multiple",
  options: ReadonlyArray<(typeof formatting)[number]>,
  selected?: string,
  marker?: boolean,
): void => {
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        {mode === "single" ? (
          <ToggleGroup
            type="single"
            testId="tg"
            label="Formatting"
            options={options}
            defaultValue={selected}
          />
        ) : (
          <ToggleGroup
            type="multiple"
            testId="tg"
            label="Formatting"
            options={options}
            defaultValue={selected === undefined ? undefined : [selected]}
          />
        )}
        <Button testId="after">After</Button>
      </Stack>
      {marker === true ? (
        <Text testId="reordered-marker">reordered</Text>
      ) : null}
    </Surface>,
  );
};

/**
 * The bug guarded: the `multiple` tab stop is "the item that last held focus",
 * an identity. Before plan `692` it was the clicked **index**, so after the
 * options were reordered the ring and `Tab` named the item now at that index.
 */
it("keeps a multiple group's ring on the clicked item through a reorder", async () => {
  const runtime = await openWindow();
  renderToggleGroup(runtime, "multiple", formatting);
  runtime.click("tg-underline");
  await awaitFrame(
    () => ringOn(runtime, "tg-underline"),
    "the clicked multiple item paints its ring",
  );

  renderToggleGroup(runtime, "multiple", reordered, undefined, true);
  await awaitFrame(
    () => Option.isSome(runtime.element("reordered-marker")),
    "the reordered multiple tree paints",
  );
  await settleFocus();
  await awaitFrame(
    () => ringOn(runtime, "tg-underline") && !ringOn(runtime, "tg-italic"),
    "the reordered multiple group keeps its ring on Underline",
  );

  runtime.click("before");
  await settleFocus();
  runtime.focusNext();
  expect(focused(runtime)).toBe("tg-underline");
});

/**
 * The same class in `single` mode: the tab stop was already value-derived, so
 * the ring and the stop disagreed after a reorder (the ring took the new item at
 * the old index).
 */
it("keeps a single group's ring on the selected item through a reorder", async () => {
  const runtime = await openWindow();
  renderToggleGroup(runtime, "single", formatting, "underline");
  runtime.click("tg-underline");
  await awaitFrame(
    () => ringOn(runtime, "tg-underline"),
    "the selected single item paints its ring",
  );

  renderToggleGroup(runtime, "single", reordered, "underline", true);
  await awaitFrame(
    () => Option.isSome(runtime.element("reordered-marker")),
    "the reordered single tree paints",
  );
  await settleFocus();
  await awaitFrame(
    () => ringOn(runtime, "tg-underline") && !ringOn(runtime, "tg-italic"),
    "the reordered single group keeps its ring on Underline",
  );
  expect(ringOn(runtime, "tg-underline")).toBe(true);
  expect(ringOn(runtime, "tg-italic")).toBe(false);
});

/**
 * `CheckboxGroup` is the same focus rule without a roving keyboard contract.
 * It used to carry its own index state and id map; plan `692` made it use the
 * one hook, so this case guards the outcome (a reorder cannot paint the ring on
 * the row that took the old position).
 */
it("keeps a checkbox group's ring on the clicked row through a reorder", async () => {
  const runtime = await openWindow();
  const options = [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
    { value: "gamma", label: "Gamma" },
  ] as const;
  const reorderedRows = [
    { value: "gamma", label: "Gamma" },
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
  ] as const;
  const renderRows = (
    rows: ReadonlyArray<{ readonly value: string; readonly label: string }>,
    marker?: boolean,
  ): void => {
    runtime.render(
      <Surface>
        <CheckboxGroup testId="cg" label="Rows" options={rows} />
        {marker === true ? (
          <Text testId="reordered-marker">reordered</Text>
        ) : null}
      </Surface>,
    );
  };

  renderRows(options);
  runtime.click("cg-gamma");
  await awaitFrame(
    () => boxRingOn(runtime, "cg-gamma"),
    "the clicked checkbox row paints its ring",
  );

  renderRows(reorderedRows, true);
  await awaitFrame(
    () => Option.isSome(runtime.element("reordered-marker")),
    "the reordered checkbox tree paints",
  );
  await settleFocus();
  await awaitFrame(
    () => boxRingOn(runtime, "cg-gamma") && !boxRingOn(runtime, "cg-beta"),
    "the reordered checkbox group keeps its ring on Gamma",
  );
  expect(boxRingOn(runtime, "cg-gamma")).toBe(true);
  expect(boxRingOn(runtime, "cg-beta")).toBe(false);
});

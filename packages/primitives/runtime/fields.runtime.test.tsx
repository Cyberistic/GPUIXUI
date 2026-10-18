/**
 * The fields and the two reused overlays, in the real GPUix runtime.
 *
 * `Input` and `TextArea` are the components whose editing is entirely the
 * runtime's (the native `<input>`/`<textarea>` holds the text), so the only
 * honest proof that they work is the runtime reporting an edit back — which is
 * what `simulateKeystrokes` plus `onValueChange` shows here.
 *
 * `Select` and `Tooltip` are thin wrappers over GPUix's own headless components
 * (PLAN.md D15), so this suite's job is the wrapper's contract: the trigger's
 * chrome, the popover's surface, and that the open/dismiss behaviour is really
 * the published one. One measured requirement of the reuse is asserted as a
 * requirement, not as success — see `COMPONENTS.md`.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { focusRing } from "@gpuixui/tokens";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import { Spacer } from "../src/components/Separator.js";
import {
  Select,
  selectHeadingHeight,
  selectListHeight,
} from "../src/components/Select.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import { TextArea } from "../src/components/TextArea.js";
import { Tooltip, tooltipHeight } from "../src/components/Tooltip.js";
import { a11yNode, type Bounds, type Runtime } from "./harness.js";
import { SURFACE, Surface, openWindow, testTheme } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** The values `onValueChange` was called with, in order. */
const recorder = (): {
  readonly values: ReadonlyArray<string>;
  readonly onValueChange: (value: string) => void;
} => {
  const values: string[] = [];
  return {
    get values() {
      return values;
    },
    onValueChange: (value) => {
      values.push(value);
    },
  };
};

/** The last value `onValueChange` reported. */
const lastValue = (values: ReadonlyArray<string>): string =>
  Option.getOrElse(Arr.last(values), () =>
    expect.fail("the field reported no edit at all"),
  );

it("announces a field's own name beside its visible Label", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Label>Project name</Label>
        <Input testId="field" label="Project name" />
      </Stack>
    </Surface>,
  );
  // The visible name and the control's name are two nodes with different
  // roles; `aria-labelledby` does not exist, so the control carries its own
  // name (plan 020 §1.4). This is the end-to-end form of `labelledBy`.
  const dump = runtime.a11y();
  expect(Option.isSome(a11yNode(dump, { role: "Label" }))).toBe(true);
  expect(
    Option.isSome(a11yNode(dump, { role: "TextInput", label: "Project name" })),
  ).toBe(true);
});

it("edits an Input through the runtime's own text handling", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Name"
        autoFocus
        onValueChange={field.onValueChange}
      />
    </Surface>,
  );
  expect(Option.getOrUndefined(runtime.focused())).toBe("field");
  runtime.type("h e l l o");
  expect(lastValue(field.values)).toBe("hello");
});

/** Whether a painted element carries the focus ring. */
const ringed = (runtime: Runtime, testId: string): boolean =>
  Option.exists(
    runtime.element(testId),
    (element) => element.style.boxShadow !== undefined,
  );

it("paints an autoFocus Input's ring on mount, and clears it when focus leaves", async () => {
  // The bug guarded: `autoFocus` takes native focus without dispatching
  // `onFocus` (plan 041 §9), so the tracked state stayed false and the field
  // that held focus looked unfocused until the next focus change.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Input testId="field" label="Name" autoFocus />
        <Button testId="after">After</Button>
      </Stack>
    </Surface>,
  );
  expect(Option.getOrUndefined(runtime.focused())).toBe("field");
  expect(ringed(runtime, "field")).toBe(true);
  runtime.click("after");
  runtime.flush();
  expect(ringed(runtime, "field")).toBe(false);
});

it("paints an autoFocus TextArea's ring on mount", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <TextArea testId="area" label="Notes" autoFocus />
    </Surface>,
  );
  expect(Option.getOrUndefined(runtime.focused())).toBe("area");
  expect(ringed(runtime, "area")).toBe(true);
});

it("paints an invalid field's border, not its surface", async () => {
  // The bug guarded (plan 091): `invalid` filled the whole field with the
  // destructive role, so a failed validation painted a red input (and dropped
  // the error border on hover). The surface must stay the field role.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <Input testId="valid" label="Valid" />
        <Input testId="invalid" label="Invalid" invalid />
        <TextArea testId="valid-area" label="Valid notes" />
        <TextArea testId="invalid-area" label="Invalid notes" invalid />
      </Stack>
    </Surface>,
  );
  const paint = (testId: string) =>
    Option.getOrElse(runtime.element(testId), () =>
      expect.fail(`the runtime painted no ${testId} field`),
    ).style;
  expect(paint("valid").backgroundColor).toBe(testTheme.colors.input);
  expect(paint("valid").borderColor).toBe(testTheme.colors.border);
  expect(paint("invalid").backgroundColor).toBe(testTheme.colors.input);
  expect(paint("invalid").borderColor).toBe(testTheme.colors.destructive);
  expect(paint("valid-area").backgroundColor).toBe(testTheme.colors.input);
  expect(paint("valid-area").borderColor).toBe(testTheme.colors.border);
  expect(paint("invalid-area").backgroundColor).toBe(testTheme.colors.input);
  expect(paint("invalid-area").borderColor).toBe(testTheme.colors.destructive);
});

it("paints no ring on a disabled autoFocus field", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input testId="field" label="Name" disabled autoFocus />
    </Surface>,
  );
  expect(runtime.focused()).toStrictEqual(Option.none());
  expect(ringed(runtime, "field")).toBe(false);
});

it("reports an Input's Enter through onSubmit", async () => {
  const runtime = await openWindow();
  const field = recorder();
  let submitted = 0;
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Name"
        autoFocus
        onValueChange={field.onValueChange}
        onSubmit={() => {
          submitted += 1;
        }}
      />
    </Surface>,
  );
  runtime.type("h i enter");
  expect(lastValue(field.values)).toBe("hi");
  expect(submitted).toBe(1);
});

it("gives a controlled Input's owner the value after each edit", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Name"
        autoFocus
        value=""
        onValueChange={field.onValueChange}
      />
    </Surface>,
  );
  runtime.type("a b");
  expect(lastValue(field.values)).toBe("ab");
});

it("refuses to edit or submit a disabled Input", async () => {
  const runtime = await openWindow();
  const field = recorder();
  let submitted = 0;
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Name"
        disabled
        onValueChange={field.onValueChange}
        onSubmit={() => {
          submitted += 1;
        }}
      />
    </Surface>,
  );
  // A click would focus a normal field; a disabled one must stay inert even
  // when the test aims at it directly.
  runtime.click("field");
  runtime.type("h e l l o");
  expect(field.values).toEqual([]);
  expect(submitted).toBe(0);
});

it("accepts no newline in a disabled TextArea", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <TextArea testId="area" disabled onValueChange={field.onValueChange} />
    </Surface>,
  );
  runtime.click("area");
  runtime.type("a enter b");
  expect(field.values).toEqual([]);
});

it("sizes a TextArea by rows, as the runtime's own height control", async () => {
  const heightOf = async (minRows: number): Promise<number> => {
    const runtime = await openWindow();
    runtime.render(
      <Surface>
        <TextArea testId="area" minRows={minRows} />
      </Surface>,
    );
    return boundsOf(runtime, "area").height;
  };
  const two = await heightOf(2);
  const four = await heightOf(4);
  expect(two).toBeGreaterThan(0);
  expect(four).toBeGreaterThan(two);
});

it("honours a caller's height over a TextArea's rows", async () => {
  // The bug guarded (plan 097): the row re-base ran *after* the caller's style
  // was resolved, so `style={{ height: 120 }}` silently painted a one-row
  // field. The same rule is guarded offline for every part; this measures it in
  // a real frame. The inset is the runtime's own box model, so the assertion is
  // that the painted height follows the requested one, not an exact pixel.
  const heightOf = async (height: number): Promise<number> => {
    const runtime = await openWindow();
    runtime.render(
      <Surface>
        <TextArea testId="area" style={{ height }} />
      </Surface>,
    );
    return boundsOf(runtime, "area").height;
  };
  const short = await heightOf(60);
  const tall = await heightOf(120);
  expect(tall - short).toBeGreaterThanOrEqual(59);
  expect(tall - short).toBeLessThanOrEqual(61);
});

it("edits a TextArea across lines", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <TextArea testId="area" autoFocus onValueChange={field.onValueChange} />
    </Surface>,
  );
  runtime.type("a b enter c d");
  const last = lastValue(field.values);
  expect(last).toContain("ab");
  expect(last).toContain("cd");
  expect(last).toContain("\n");
});

/** The `<text>` node painting `label`, if the last frame painted it. */
const textElement = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Arr.findFirst(runtime.all(), (element) => element.text === label),
    () => expect.fail(`the last frame painted no text ${label}`),
  );

/** The element a `Select` renders as its trigger. */
const triggerOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(runtime.element(`${testId}-trigger`), () =>
    expect.fail(`the Select ${testId} painted no trigger`),
  );

it("opens a Select's list and paints its options", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        placeholder="Pick one"
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  expect(runtime.allText()).not.toContain("Pear");
  runtime.clickElement(triggerOf(runtime, "sel"));
  expect(runtime.allText()).toContain("Pear");
  expect(runtime.allText()).toContain("Apple");
});

it("selects a Select option by clicking it", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        placeholder="Pick one"
        onValueChange={field.onValueChange}
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  runtime.clickElement(triggerOf(runtime, "sel"));
  const row = Option.getOrElse(
    Option.fromNullishOr(textElement(runtime, "Pear").parentId),
    () => expect.fail("the Pear option has no row"),
  );
  runtime.clickElement(
    Option.getOrElse(
      Option.fromNullishOr(runtime.renderer.getElement(row)),
      () => expect.fail("the Pear row vanished"),
    ),
  );
  expect(lastValue(field.values)).toBe("pear");
});

/** The accessibility node's own record, or a failed test. */
const ariaOf = (
  runtime: Runtime,
  match: { readonly role?: string; readonly label?: string },
) =>
  Option.getOrElse(a11yNode(runtime.a11y(), match), () =>
    expect.fail(
      `no accessibility node for ${match.role ?? "any role"} ` +
        `"${match.label ?? "any label"}"`,
    ),
  ).aria;

const selectProps = {
  testId: "sel",
  label: "Fruit",
  placeholder: "Pick one",
  options: [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
  ],
} as const;

/** The ring the runtime paints for `focusRing`, with its explicit `inset`. */
const FOCUS_RING = { ...focusRing(testTheme).boxShadow, inset: false };

/** The painted shadow of an element, as the runtime reports it. */
const shadowOf = (runtime: Runtime, testId: string) =>
  Option.flatMap(runtime.element(testId), (element) =>
    Option.fromNullishOr(element.style.boxShadow),
  );

/** The element that holds native focus, or a failed test. */
const focusedId = (runtime: Runtime): number =>
  Option.getOrElse(
    Option.fromNullishOr(runtime.renderer.getFocusedElementId()),
    () => expect.fail("no element holds native focus"),
  );

it("rings the Select trigger when Tab reaches it", async () => {
  // The bug guarded (plan 083): the trigger took native focus and painted no
  // ring, so the select was the one focusable control with no focus indicator.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <Input testId="field" label="Name" />
        <Select {...selectProps} />
        <Button testId="after">After</Button>
      </Stack>
    </Surface>,
  );
  runtime.focusNext();
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("sel-trigger");
  expect(Option.getOrUndefined(shadowOf(runtime, "sel-trigger"))).toStrictEqual(
    FOCUS_RING,
  );
  runtime.focusNext();
  expect(Option.isNone(shadowOf(runtime, "sel-trigger"))).toBe(true);
});

it("keeps the Select trigger ringed while its list is open", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select {...selectProps} />
    </Surface>,
  );
  runtime.focusNext();
  runtime.keyDown("sel-trigger", "enter");
  // The list owns native focus while it is open; the ring marks its trigger.
  expect(Option.getOrUndefined(runtime.focused())).not.toBe("sel-trigger");
  expect(Option.getOrUndefined(shadowOf(runtime, "sel-trigger"))).toStrictEqual(
    FOCUS_RING,
  );
});

it("returns focus to a ringed Select trigger after Escape", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select {...selectProps} />
    </Surface>,
  );
  runtime.focusNext();
  runtime.keyDown("sel-trigger", "enter");
  runtime.renderer.nativeSimulateKeyDown(focusedId(runtime), "escape");
  runtime.flush();
  expect(Option.getOrUndefined(runtime.focused())).toBe("sel-trigger");
  expect(Option.getOrUndefined(shadowOf(runtime, "sel-trigger"))).toStrictEqual(
    FOCUS_RING,
  );
  expect(runtime.allText()).not.toContain("Pear");
});

it("returns focus to a ringed Select trigger after committing an option", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Select {...selectProps} onValueChange={field.onValueChange} />
    </Surface>,
  );
  runtime.focusNext();
  runtime.keyDown("sel-trigger", "enter");
  runtime.renderer.nativeSimulateKeyDown(focusedId(runtime), "down");
  runtime.renderer.nativeSimulateKeyDown(focusedId(runtime), "down");
  runtime.renderer.nativeSimulateKeyDown(focusedId(runtime), "enter");
  runtime.flush();
  expect(lastValue(field.values)).toBe("pear");
  expect(Option.getOrUndefined(runtime.focused())).toBe("sel-trigger");
  expect(Option.getOrUndefined(shadowOf(runtime, "sel-trigger"))).toStrictEqual(
    FOCUS_RING,
  );
});

it("skips a disabled Select in the tab order and paints no ring on it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <Input testId="field" label="Name" />
        <Select {...selectProps} disabled />
        <Button testId="after">After</Button>
      </Stack>
    </Surface>,
  );
  runtime.focusNext();
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("after");
  expect(Option.isNone(shadowOf(runtime, "sel-trigger"))).toBe(true);
});

it("exposes a named combobox whose expanded state follows the list", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select {...selectProps} />
    </Surface>,
  );
  const closed = ariaOf(runtime, { role: "ComboBox", label: "Fruit" });
  expect(closed?.expanded).toBe(false);
  expect(closed?.value).toBe("Pick one");
  runtime.clickElement(triggerOf(runtime, "sel"));
  expect(ariaOf(runtime, { role: "ComboBox", label: "Fruit" })?.expanded).toBe(
    true,
  );
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "ListBox", label: "Fruit" }),
    ),
  ).toBe(true);
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "ListBoxOption", label: "Pear" }),
    ),
  ).toBe(true);
});

it("marks the chosen option selected and reports it as the combobox value", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select {...selectProps} />
    </Surface>,
  );
  runtime.clickElement(triggerOf(runtime, "sel"));
  const row = Option.getOrElse(
    Option.fromNullishOr(textElement(runtime, "Pear").parentId),
    () => expect.fail("the Pear option has no row"),
  );
  runtime.clickElement(
    Option.getOrElse(
      Option.fromNullishOr(runtime.renderer.getElement(row)),
      () => expect.fail("the Pear row vanished"),
    ),
  );
  const selected = ariaOf(runtime, { role: "ComboBox", label: "Fruit" });
  expect(selected?.value).toBe("Pear");
  expect(selected?.expanded).toBe(false);
  runtime.clickElement(triggerOf(runtime, "sel"));
  expect(
    ariaOf(runtime, { role: "ListBoxOption", label: "Pear" })?.selected,
  ).toBe(true);
  expect(
    ariaOf(runtime, { role: "ListBoxOption", label: "Apple" })?.selected,
  ).toBe(false);
});

/** Two named groups: the shape a long region picker needs. */
const groupedProps = {
  testId: "sel",
  label: "Region",
  options: [
    {
      label: "Europe",
      options: [
        { value: "eu", label: "Europe West" },
        { value: "eu-north", label: "Europe North" },
      ],
    },
    {
      label: "Americas",
      options: [{ value: "us", label: "United States" }],
    },
  ],
} as const;

it("paints a grouped Select's headings and names each group", async () => {
  // The bug guarded (plan 075): a list could not be grouped, so this shape was
  // unexpressible and the docs called it a limitation.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select {...groupedProps} />
    </Surface>,
  );
  runtime.clickElement(triggerOf(runtime, "sel"));
  runtime.flush();
  expect(runtime.allText()).toEqual(
    expect.arrayContaining([
      "Europe",
      "Europe West",
      "Europe North",
      "Americas",
    ]),
  );
  const group = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Group", label: "Europe" }),
    () => expect.fail("the first group produced no accessibility node"),
  );
  expect(group.aria?.role).toBe("Group");
  const heading = textElement(runtime, "Europe");
  const headingRow = Option.getOrElse(
    Option.fromNullishOr(heading.parentId),
    () => expect.fail("the heading has no row"),
  );
  const headingBox = Option.getOrElse(runtime.boundsOfId(headingRow), () =>
    expect.fail("the heading row painted no box"),
  );
  expect(
    Math.abs(headingBox.height - selectHeadingHeight(testTheme)),
  ).toBeLessThanOrEqual(1);
  // The estimate used to choose a side counts both headings; if it did not,
  // the list would paint taller than the space it was capped to.
  const list = selectListBoundsOf(runtime);
  expect(
    Math.abs(list.height - selectListHeight(3, testTheme, 2)),
  ).toBeLessThanOrEqual(1);
});

it("counts group headings when choosing the list's side", async () => {
  // The bug guarded (plan 075): a heading-blind estimate says this list fits
  // below the trigger (about 128 px in 140 px of room) when it really paints
  // about 216 px, so the list would open over the field and run off the window.
  const runtime = await openWindow();
  const groups = Arr.map(Arr.range(1, 4), (index) => ({
    label: `Group ${index}`,
    options: [{ value: `value-${index}`, label: `Option ${index}` }],
  }));
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ height: 640 }}>
        <Spacer />
        <Select testId="sel" label="Grouped" options={groups} />
      </Stack>
    </Surface>,
  );
  const trigger = selectTriggerOf(runtime, "sel");
  runtime.clickElement(trigger);
  runtime.flush();
  const triggerBox = Option.getOrElse(runtime.boundsOfId(trigger.id), () =>
    expect.fail("the Select trigger painted no box"),
  );
  const list = selectListBoundsOf(runtime);
  expect(list.y + list.height).toBeLessThanOrEqual(triggerBox.y);
  expect(
    Math.abs(list.height - selectListHeight(4, testTheme, 4)),
  ).toBeLessThanOrEqual(1);
});

it("keeps a grouped Select's keyboard order flat across a heading", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Select {...groupedProps} onValueChange={field.onValueChange} />
    </Surface>,
  );
  runtime.focusNext();
  runtime.type("enter");
  runtime.type("down");
  runtime.type("enter");
  runtime.flush();
  // The first Down lands on the first option, not on the "Europe" heading.
  expect(lastValue(field.values)).toBe("eu");
  expect(runtime.allText()).not.toContain("Europe North");
  expect(ariaOf(runtime, { role: "ComboBox", label: "Region" })?.value).toBe(
    "Europe West",
  );
});

it("commits a click on an option inside a group", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select {...groupedProps} />
    </Surface>,
  );
  runtime.clickElement(triggerOf(runtime, "sel"));
  runtime.clickElement(
    Option.getOrElse(
      Option.flatMap(
        Option.fromNullishOr(textElement(runtime, "Europe North").parentId),
        (id) => Option.fromNullishOr(runtime.renderer.getElement(id)),
      ),
      () => expect.fail("the grouped option has no row"),
    ),
  );
  expect(ariaOf(runtime, { role: "ComboBox", label: "Region" })?.value).toBe(
    "Europe North",
  );
});

/** The Select's trigger, named `${testId}-trigger` by the wrapper. */
const selectTriggerOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(runtime.element(`${testId}-trigger`), () =>
    expect.fail(`the Select ${testId} painted no trigger`),
  );

/** The list element's id: the parent of a painted option's row. */
const selectListId = (runtime: Runtime, option: string): number =>
  Option.getOrElse(
    Option.flatMap(
      Arr.findFirst(runtime.all(), (element) => element.text === option),
      (item) =>
        Option.flatMap(Option.fromNullishOr(item.parentId), (row) =>
          Option.flatMap(
            Option.fromNullishOr(runtime.renderer.getElement(row)),
            (element) => Option.fromNullishOr(element.parentId),
          ),
        ),
    ),
    () => expect.fail(`the list painted no ${option} option`),
  );

/** The painted box of the open list: the grandparent of a painted option. */
const selectListBounds = (runtime: Runtime, option: string): Bounds =>
  Option.getOrElse(
    Option.flatMap(
      Arr.findFirst(runtime.all(), (element) => element.text === option),
      (item) =>
        Option.flatMap(Option.fromNullishOr(item.parentId), (row) =>
          Option.flatMap(
            Option.fromNullishOr(runtime.renderer.getElement(row)),
            (element) =>
              Option.flatMap(Option.fromNullishOr(element.parentId), (list) =>
                runtime.boundsOfId(list),
              ),
          ),
        ),
    ),
    () => expect.fail(`the list painted no ${option} option`),
  );

/** The listbox itself, whatever rows a group puts between it and an option. */
const selectListBoundsOf = (runtime: Runtime): Bounds =>
  Option.getOrElse(
    Option.flatMap(
      Arr.findFirst(
        runtime.all(),
        (element) => element.customProps?.["role"] === "listbox",
      ),
      (list) => runtime.boundsOfId(list.id),
    ),
    () => expect.fail("the Select painted no listbox"),
  );

it("opens the Select's list at least as wide as its trigger", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box
        tone="background"
        testId="frame"
        style={{
          display: "flex",
          flexDirection: "column",
          width: 900,
          padding: 0,
        }}
      >
        <Select
          testId="sel"
          label="Fruit"
          placeholder="Choose a fruit"
          options={[
            { value: "apple", label: "Apple" },
            { value: "pear", label: "Pear" },
          ]}
        />
      </Box>
    </Surface>,
  );
  const trigger = selectTriggerOf(runtime, "sel");
  runtime.clickElement(trigger);
  runtime.flush();
  const triggerBox = Option.getOrElse(runtime.boundsOfId(trigger.id), () =>
    expect.fail("the Select trigger painted no box"),
  );
  const list = selectListBounds(runtime, "Apple");
  expect(triggerBox.width).toBeLessThan(900);
  expect(list.width).toBeGreaterThanOrEqual(triggerBox.width - 1);
});

it("makes a full-width Select's list match the trigger", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box
        tone="background"
        testId="frame"
        style={{
          display: "flex",
          flexDirection: "column",
          width: 900,
          padding: 0,
        }}
      >
        <Select
          testId="sel"
          label="Fruit"
          placeholder="Choose a fruit"
          fullWidth
          options={[
            { value: "apple", label: "Apple" },
            { value: "pear", label: "Pear" },
          ]}
        />
      </Box>
    </Surface>,
  );
  const triggerElement = selectTriggerOf(runtime, "sel");
  runtime.clickElement(triggerElement);
  runtime.flush();
  const trigger = Option.getOrElse(runtime.boundsOfId(triggerElement.id), () =>
    expect.fail("the Select trigger painted no box"),
  );
  const list = selectListBounds(runtime, "Apple");
  expect(Math.abs(list.width - trigger.width)).toBeLessThanOrEqual(1);
});

it("opens a Select's list above a trigger at the window's bottom edge", async () => {
  // The bug guarded: `fit="snap"` clamps a layer into the window without
  // flipping it (plan 156 §8), so this select used to open its list at
  // y 724..792 over a trigger at 740..772 — covering the field it belongs to.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ height: 760 }}>
        <Spacer />
        <Select
          testId="sel"
          label="Fruit"
          placeholder="Choose a fruit"
          options={[
            { value: "apple", label: "Apple" },
            { value: "pear", label: "Pear" },
          ]}
        />
      </Stack>
    </Surface>,
  );
  const triggerElement = selectTriggerOf(runtime, "sel");
  runtime.clickElement(triggerElement);
  runtime.flush();
  const trigger = Option.getOrElse(runtime.boundsOfId(triggerElement.id), () =>
    expect.fail("the Select trigger painted no box"),
  );
  const list = selectListBounds(runtime, "Apple");
  expect(list.y + list.height).toBeLessThanOrEqual(trigger.y);
  // The height the side decision estimated is the height the list paints.
  expect(
    Math.abs(list.height - selectListHeight(2, testTheme)),
  ).toBeLessThanOrEqual(1);
});

it("opens a Select's list below a trigger with room", async () => {
  // The other direction: the fix must not hard-code a side.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ height: 200 }}>
        <Select
          testId="sel"
          label="Fruit"
          placeholder="Choose a fruit"
          options={[
            { value: "apple", label: "Apple" },
            { value: "pear", label: "Pear" },
          ]}
        />
      </Stack>
    </Surface>,
  );
  const triggerElement = selectTriggerOf(runtime, "sel");
  runtime.clickElement(triggerElement);
  runtime.flush();
  const trigger = Option.getOrElse(runtime.boundsOfId(triggerElement.id), () =>
    expect.fail("the Select trigger painted no box"),
  );
  const list = selectListBounds(runtime, "Apple");
  expect(list.y).toBeGreaterThanOrEqual(trigger.y + trigger.height);
});

it("caps a long Select list to the window and scrolls it", async () => {
  // The bug guarded: nothing capped the list, so 30 options painted a 908 px
  // layer from y 8 and left the last option at y 888 in an 800 px window, with
  // no scroller to reach it (plan 068).
  const runtime = await openWindow();
  const options = Array.from({ length: 30 }, (_, index) => ({
    value: `option-${index}`,
    label: `Option ${index}`,
  }));
  runtime.render(
    <Surface>
      <Select testId="sel" label="Many" placeholder="Pick" options={options} />
    </Surface>,
  );
  const triggerElement = selectTriggerOf(runtime, "sel");
  runtime.clickElement(triggerElement);
  runtime.flush();
  const list = selectListBounds(runtime, "Option 0");
  expect(list.y + list.height).toBeLessThanOrEqual(800 - 8);
  expect(list.height).toBeLessThan(selectListHeight(30, testTheme));
  const lastOption = (): Bounds =>
    Option.getOrElse(
      Option.flatMap(
        Arr.findFirst(runtime.all(), (element) => element.text === "Option 29"),
        (element) => runtime.boundsOfId(element.id),
      ),
      () => expect.fail("the last option vanished"),
    );
  // Rows keep their height instead of shrinking inside the capped list.
  expect(lastOption().y + lastOption().height).toBeGreaterThan(
    list.y + list.height,
  );
  const listId = selectListId(runtime, "Option 0");
  const before = runtime.renderer.getScrollOffset(listId);
  expect(before).not.toBeNull();
  runtime.renderer.nativeSimulateScrollWheel(list.x + 20, list.y + 50, 0, -400);
  runtime.flush();
  const after = runtime.renderer.getScrollOffset(listId);
  expect(
    Option.getOrElse(Option.fromNullishOr(after?.[1]), () => 0),
  ).toBeLessThan(Option.getOrElse(Option.fromNullishOr(before?.[1]), () => 0));
  // The last option is reachable inside the capped list after scrolling.
  const last = lastOption();
  expect(last.y).toBeGreaterThanOrEqual(list.y);
  expect(last.y + last.height).toBeLessThanOrEqual(list.y + list.height);
});

it("scrolls a capped Select list to follow the keyboard highlight", async () => {
  // The bug guarded: the highlight moved but the capped list stayed at offset
  // 0, so 40 Down presses highlighted "Option 39" at y 1249 — outside the list
  // — and Enter committed an option the user never saw (plan 069).
  const runtime = await openWindow();
  const options = Array.from({ length: 60 }, (_, index) => ({
    value: `option-${index}`,
    label: `Option ${index}`,
  }));
  runtime.render(
    <Surface>
      <Select testId="sel" label="Many" placeholder="Pick" options={options} />
    </Surface>,
  );
  const trigger = selectTriggerOf(runtime, "sel");
  runtime.clickElement(trigger);
  runtime.flush();
  const listId = selectListId(runtime, "Option 0");
  const list = selectListBounds(runtime, "Option 0");
  const before = runtime.renderer.getScrollOffset(listId);
  expect(before).not.toBeNull();
  const focusedId = Option.getOrElse(
    Option.map(runtime.focusedElement(), (element) => element.id),
    () => expect.fail("the open list holds no focus"),
  );
  Arr.forEach(Arr.range(1, 40), () => {
    runtime.renderer.nativeSimulateKeyDown(focusedId, "down");
    runtime.renderer.dispatchNativeEvents();
    runtime.flush();
  });
  // The list scrolled...
  const after = runtime.renderer.getScrollOffset(listId);
  expect(
    Option.getOrElse(Option.fromNullishOr(after?.[1]), () => 0),
  ).toBeLessThan(Option.getOrElse(Option.fromNullishOr(before?.[1]), () => 0));
  // ...to the highlighted row, which is now inside the list.
  const highlighted = Option.getOrElse(
    Arr.findFirst(runtime.all(), (element) => {
      if (element.text === null) return false;
      const row = Option.fromNullishOr(element.parentId);
      return Option.exists(row, (parent) =>
        Option.exists(
          Option.fromNullishOr(runtime.renderer.getElement(parent)),
          (node) => node.style["backgroundColor"] === testTheme.colors.hover,
        ),
      );
    }),
    () => expect.fail("no highlighted option row"),
  );
  expect(highlighted.text).toBe("Option 39");
  const bounds = Option.getOrElse(runtime.boundsOfId(highlighted.id), () =>
    expect.fail("the highlighted option painted no box"),
  );
  expect(bounds.y).toBeGreaterThanOrEqual(list.y);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(list.y + list.height);
});

it("opens a capped Select list scrolled to its selected option", async () => {
  const runtime = await openWindow();
  const options = Array.from({ length: 60 }, (_, index) => ({
    value: `option-${index}`,
    label: `Option ${index}`,
  }));
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Many"
        placeholder="Pick"
        options={options}
        defaultValue="option-49"
      />
    </Surface>,
  );
  const trigger = selectTriggerOf(runtime, "sel");
  runtime.clickElement(trigger);
  runtime.flush();
  const listId = selectListId(runtime, "Option 0");
  const list = selectListBounds(runtime, "Option 0");
  expect(runtime.renderer.getScrollOffset(listId)).not.toBeNull();
  // The selected row is the only one wearing the selected role; the trigger's
  // painted value is a text node, not a row.
  const rowId = Option.getOrElse(
    Option.flatMap(
      Arr.findFirst(
        runtime.all(),
        (element) =>
          element.style["backgroundColor"] === testTheme.colors.selected,
      ),
      (element) => Option.fromNullishOr(element.id),
    ),
    () => expect.fail("no selected option row"),
  );
  const row = Option.getOrElse(runtime.boundsOfId(rowId), () =>
    expect.fail("the selected option painted no box"),
  );
  expect(
    Option.getOrElse(
      Option.fromNullishOr(runtime.renderer.getScrollOffset(listId)?.[1]),
      () => 0,
    ),
  ).toBeLessThan(0);
  expect(row.y).toBeGreaterThanOrEqual(list.y);
  expect(row.y + row.height).toBeLessThanOrEqual(list.y + list.height);
});

it("leaves a Select list that fits the window alone", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Few"
        placeholder="Pick"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
          { value: "c", label: "Gamma" },
        ]}
      />
    </Surface>,
  );
  const trigger = selectTriggerOf(runtime, "sel");
  runtime.clickElement(trigger);
  runtime.flush();
  const listId = selectListId(runtime, "Alpha");
  const list = selectListBounds(runtime, "Alpha");
  const focusedId = Option.getOrElse(
    Option.map(runtime.focusedElement(), (element) => element.id),
    () => expect.fail("the open list holds no focus"),
  );
  Arr.forEach(Arr.range(1, 2), () => {
    runtime.renderer.nativeSimulateKeyDown(focusedId, "down");
    runtime.renderer.dispatchNativeEvents();
    runtime.flush();
  });
  expect(runtime.renderer.getScrollOffset(listId)).toBeNull();
  const gamma = Option.getOrElse(
    Arr.findFirst(runtime.all(), (element) => element.text === "Gamma"),
    () => expect.fail("the last option vanished"),
  );
  const bounds = Option.getOrElse(runtime.boundsOfId(gamma.id), () =>
    expect.fail("the last option painted no box"),
  );
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(list.y + list.height);
});

it("opens a Tooltip below a trigger at the window's top edge", async () => {
  // The bug guarded: the runtime's floating layer defaults to `side="top"` and
  // `fit="snap"`, which clamps without flipping (plan 156 §8), so this tooltip
  // opened its tip at y 8..34 over a trigger at y 12..30 (plan 067).
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="A hint" testId="tip">
        <div testId="target" tabIndex={0} style={{ display: "flex" }}>
          <Text>Hover me</Text>
        </div>
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  const tip = boundsOf(runtime, "tip");
  const target = boundsOf(runtime, "target");
  expect(tip.y).toBeGreaterThanOrEqual(target.y + target.height);
  // The height the side decision estimated is the height the tip paints.
  expect(Math.abs(tip.height - tooltipHeight(testTheme))).toBeLessThanOrEqual(
    1,
  );
});

it("keeps a Tooltip above a trigger with room", async () => {
  // The other direction: the fix must not hard-code a side.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ height: 400 }}>
        <Spacer />
        <Tooltip content="A hint" testId="tip">
          <div testId="target" tabIndex={0} style={{ display: "flex" }}>
            <Text>Hover me</Text>
          </div>
        </Tooltip>
      </Stack>
    </Surface>,
  );
  runtime.hover("target");
  const tip = boundsOf(runtime, "tip");
  const target = boundsOf(runtime, "target");
  expect(tip.y + tip.height).toBeLessThanOrEqual(target.y);
});

it("opens a Tooltip on hover and dismisses it on click", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="A hint" side="bottom" testId="tip">
        <div testId="target" tabIndex={0} style={{ display: "flex" }}>
          <Text>Hover me</Text>
        </div>
      </Tooltip>
    </Surface>,
  );
  expect(runtime.allText()).not.toContain("A hint");
  runtime.hover("target");
  expect(runtime.allText()).toContain("A hint");
  const tip = boundsOf(runtime, "tip");
  const target = boundsOf(runtime, "target");
  expect(tip.y).toBeGreaterThanOrEqual(target.y + target.height);
  const fill = Option.flatMap(runtime.element("tip"), (element) =>
    Option.fromNullishOr(element.style.backgroundColor),
  );
  expect(Option.getOrUndefined(fill)).toBe(testTheme.colors.popover);
  runtime.click("target");
  expect(runtime.allText()).not.toContain("A hint");
});

it("announces a string Tooltip as the trigger's description and names the open tip", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="A hint" side="bottom" testId="tip">
        <div
          testId="trigger"
          role="img"
          aria-label="Revenue definition"
          tabIndex={0}
          style={{ width: 20, height: 20 }}
        />
      </Tooltip>
    </Surface>,
  );
  // The bug guarded (plan 071): the tip used to be painted but absent from the
  // accessibility tree, and the trigger carried no description.
  const trigger = Option.getOrElse(
    a11yNode(runtime.a11y(), {
      role: "Image",
      label: "Revenue definition",
    }),
    () => expect.fail("the trigger produced no accessibility node"),
  );
  expect(trigger.aria?.description).toBe("A hint");
  runtime.hover("trigger");
  runtime.flush();
  const tip = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Tooltip", label: "A hint" }),
    () => expect.fail("the open tip produced no accessibility node"),
  );
  expect(tip.aria?.role).toBe("Tooltip");
});

it("opens a Tooltip when its trigger takes keyboard focus", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="A hint" testId="tip">
        <div testId="target" tabIndex={0} style={{ display: "flex" }}>
          <Text>Trigger</Text>
        </div>
      </Tooltip>
    </Surface>,
  );
  expect(runtime.allText()).not.toContain("A hint");
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(runtime.allText()).toContain("A hint");
});

it("opens the Tooltip at the trigger's edge, not the container's", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box
        tone="background"
        testId="frame"
        style={{
          display: "flex",
          flexDirection: "column",
          width: 900,
          padding: 0,
        }}
      >
        <Tooltip content="A hint" side="bottom" testId="tip">
          <div
            testId="target"
            tabIndex={0}
            style={{ display: "flex", width: 400 }}
          >
            <Text>Trigger</Text>
          </div>
        </Tooltip>
      </Box>
    </Surface>,
  );
  runtime.hover("target");
  const target = boundsOf(runtime, "target");
  const tip = boundsOf(runtime, "tip");
  expect(Math.abs(tip.x - target.x)).toBeLessThanOrEqual(1);
  expect(tip.y).toBe(target.y + target.height);
});

it("honours align=end against the trigger rather than the container", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box
        tone="background"
        testId="frame"
        style={{
          display: "flex",
          flexDirection: "column",
          width: 900,
          padding: 0,
        }}
      >
        <Tooltip content="A hint" side="bottom" align="end" testId="tip">
          <div
            testId="target"
            tabIndex={0}
            style={{ display: "flex", width: 400 }}
          >
            <Text>Trigger</Text>
          </div>
        </Tooltip>
      </Box>
    </Surface>,
  );
  runtime.hover("target");
  const target = boundsOf(runtime, "target");
  const tip = boundsOf(runtime, "tip");
  expect(
    Math.abs(tip.x + tip.width - (target.x + target.width)),
  ).toBeLessThanOrEqual(1);
});

it("opens below the trigger inside a row container", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box
        tone="background"
        testId="frame"
        style={{
          display: "flex",
          flexDirection: "row",
          width: 900,
          height: 300,
          padding: 0,
        }}
      >
        <Tooltip content="A hint" side="bottom" testId="tip">
          <div
            testId="target"
            tabIndex={0}
            style={{ display: "flex", width: 400 }}
          >
            <Text>Trigger</Text>
          </div>
        </Tooltip>
      </Box>
    </Surface>,
  );
  runtime.hover("target");
  const target = boundsOf(runtime, "target");
  const tip = boundsOf(runtime, "tip");
  expect(tip.y).toBe(target.y + target.height);
});

it("centres a Tooltip on its trigger, not half a panel off", async () => {
  // The bug guarded (plan 095): the runtime's `align="center"` puts the tip's
  // end on the trigger's centre line, so a 42-wide tip under a 400-wide trigger
  // opened 179 px left of centre. The wrapper maps it to `start` plus a
  // measured offset.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ height: 400 }}>
        <Spacer />
        <Tooltip content="A hint" side="bottom" align="center" testId="tip">
          <div
            testId="target"
            tabIndex={0}
            style={{ display: "flex", width: 400 }}
          >
            <Text>Hover me</Text>
          </div>
        </Tooltip>
        <Spacer />
      </Stack>
    </Surface>,
  );
  runtime.hover("target");
  // The offset arrives from the second frame: root on mount, tip on open.
  runtime.flush();
  const tip = boundsOf(runtime, "tip");
  const target = boundsOf(runtime, "target");
  expect(
    Math.abs(tip.x + tip.width / 2 - (target.x + target.width / 2)),
  ).toBeLessThanOrEqual(1);
});

it("keeps the Tooltip's content inside the frame it is anchored to", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="A hint" side="bottom" testId="tip">
        <div testId="target" tabIndex={0} style={{ display: "flex" }}>
          <Text>Trigger</Text>
        </div>
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  const frame = boundsOf(runtime, SURFACE);
  const tip = boundsOf(runtime, "tip");
  expect(tip.x).toBeGreaterThanOrEqual(frame.x);
  expect(tip.x + tip.width).toBeLessThanOrEqual(frame.x + frame.width);
});

/**
 * The fields and the two reused overlays, in the real GPUix runtime.
 *
 * `Input` and `TextArea` are the components whose editing is entirely the
 * runtime's (the native `<input>`/`<textarea>` holds the text), so the only
 * honest proof that they work is the runtime reporting an edit back — which is
 * what `simulateKeystrokes` plus `onChange` shows here.
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
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import { Spacer } from "../src/components/Separator.js";
import { Select, selectListHeight } from "../src/components/Select.js";
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

/** The values `onChange` was called with, in order. */
const recorder = (): {
  readonly values: ReadonlyArray<string>;
  readonly onChange: (value: string) => void;
} => {
  const values: string[] = [];
  return {
    get values() {
      return values;
    },
    onChange: (value) => {
      values.push(value);
    },
  };
};

/** The last value `onChange` reported. */
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
      <Input testId="field" label="Name" autoFocus onChange={field.onChange} />
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
        onChange={field.onChange}
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
        onChange={field.onChange}
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
        onChange={field.onChange}
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
      <TextArea testId="area" disabled onChange={field.onChange} />
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

it("edits a TextArea across lines", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <TextArea testId="area" autoFocus onChange={field.onChange} />
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
  Option.getOrElse(
    Option.flatMap(runtime.element(testId), (element) =>
      Option.flatMap(Option.fromNullishOr(element.children[0]), (id) =>
        Option.fromNullishOr(runtime.renderer.getElement(id)),
      ),
    ),
    () => expect.fail(`the Select ${testId} painted no trigger`),
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
        onChange={field.onChange}
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

/** The Select's trigger: the root's first child, which wears `testId`'s chrome. */
const selectTriggerOf = (runtime: Runtime, testId: string) => {
  const root = Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`the runtime painted no Select ${testId}`),
  );
  return Option.getOrElse(
    Arr.head(root.children).pipe(
      Option.flatMap((id) =>
        Option.fromNullishOr(runtime.renderer.getElement(id)),
      ),
    ),
    () => expect.fail(`the Select ${testId} painted no trigger`),
  );
};

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

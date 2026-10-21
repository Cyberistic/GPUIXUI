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
import * as Schema from "effect/Schema";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import { Select } from "../src/components/Select.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import { TextArea } from "../src/components/TextArea.js";
import { Tooltip } from "../src/components/Tooltip.js";
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

it("runs onValueChange and not the deprecated alias when both are passed", async () => {
  const runtime = await openWindow();
  const field = recorder();
  let aliased = 0;
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Name"
        autoFocus
        onValueChange={field.onChange}
        onChange={() => {
          aliased += 1;
        }}
      />
    </Surface>,
  );
  runtime.type("a");
  expect(lastValue(field.values)).toBe("a");
  expect(aliased).toBe(0);
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

it("publishes a Tooltip's text as the trigger's accessible description", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="Booked revenue, net of refunds.">
        <div
          testId="target"
          role="button"
          aria-label="Revenue definition"
          tabIndex={0}
          style={{ display: "flex" }}
        >
          <Text>?</Text>
        </div>
      </Tooltip>
    </Surface>,
  );
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { label: "Revenue definition" }),
    () => expect.fail("the trigger has no accessibility node"),
  );
  expect(node.aria?.description).toBe("Booked revenue, net of refunds.");
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

it("paints the theme's hint for an empty field and replaces it with the value", async () => {
  // The claim this measures: the native field's hint is the theme's
  // `placeholder` role, not the runtime's default, and it is a hint — the
  // value replaces it once there is one.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Input
          testId="hint"
          label="Project name"
          placeholder="Find a project"
        />
        <Input
          testId="filled"
          label="Project slug"
          placeholder="Find a project"
          value="atlas"
        />
      </Stack>
    </Surface>,
  );
  const hostOf = (testId: string) =>
    Option.getOrElse(runtime.element(testId), () =>
      expect.fail(`the runtime retained no ${testId}`),
    );
  const themeOf = (testId: string) => {
    const theme = Option.getOrElse(
      Option.flatMap(
        Option.fromNullishOr(hostOf(testId).customProps?.theme),
        Schema.decodeUnknownOption(
          Schema.Record(Schema.String, Schema.Unknown),
        ),
      ),
      () => expect.fail(`${testId} handed the runtime no text theme`),
    );
    return {
      text: theme["text"],
      textFaint: theme["textFaint"],
      bg: theme["bg"],
    };
  };
  expect(hostOf("hint").customProps?.placeholder).toBe("Find a project");
  expect(themeOf("hint")).toEqual({
    text: testTheme.colors.inputForeground,
    textFaint: testTheme.colors.placeholder,
    bg: testTheme.colors.input,
  });
  const hints = (): number =>
    Arr.length(
      Arr.filter(runtime.paintedText(), (line) => line === "Find a project"),
    );
  // Only the empty field paints the hint; the filled one paints its value.
  expect(hints()).toBe(1);
  expect(runtime.paintedText()).toContain("atlas");
  runtime.click("hint");
  runtime.type("beta");
  expect(runtime.paintedText()).toContain("beta");
  expect(hints()).toBe(0);
});

it("paints the design system's selection wash on what a reader can select", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Text testId="prose" selectable>
          Selectable prose
        </Text>
        <Text testId="chrome">Chrome text</Text>
        <Input testId="field" label="Project name" />
      </Stack>
    </Surface>,
  );
  // GPUix's own default is the theme accent at 35%, which no contrast pair in
  // `@gpuixui/tokens` measures. The declared style is the reach this suite can
  // prove: the `selection` role is what the runtime is handed.
  const washOf = (testId: string) =>
    Option.flatMap(runtime.element(testId), (element) =>
      Option.fromNullishOr(element.style.selectionColor),
    );
  expect(Option.getOrUndefined(washOf("prose"))).toBe(
    testTheme.colors.selection,
  );
  expect(Option.getOrUndefined(washOf("field"))).toBe(
    testTheme.colors.selection,
  );
  expect(Option.isNone(washOf("chrome"))).toBe(true);
  // The anti-tautology guard: an accent default would pass a test that only
  // compared the two hosts with each other.
  expect(testTheme.colors.selection).not.toBe(testTheme.colors.primary);
});

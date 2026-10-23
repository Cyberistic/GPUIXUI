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
import { createRef, useState } from "react";
import type { PublicInstance } from "@gpuix/react";
import { Icon } from "@gpuixui/icons";
import { motionLevels } from "@gpuixui/motion/timing";
import { Box } from "../src/components/Box.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { IconButton } from "../src/components/IconButton.js";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import { Select } from "../src/components/Select.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Text } from "../src/components/Text.js";
import { TextArea } from "../src/components/TextArea.js";
import { Tooltip, TooltipProvider } from "../src/components/Tooltip.js";
import { a11yNode, a11yValueOf, type Bounds, type Runtime } from "./harness.js";
import {
  SURFACE,
  Surface,
  WINDOW,
  openWindow,
  sleep,
  testTheme,
} from "./fixture.js";

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
  // name (see `docs/gpuix-capabilities.md`). This is the end-to-end form of `labelledBy`.
  const dump = runtime.a11y();
  expect(Option.isSome(a11yNode(dump, { role: "Label" }))).toBe(true);
  expect(
    Option.isSome(a11yNode(dump, { role: "TextInput", label: "Project name" })),
  ).toBe(true);
});

it("focuses the field a label names when its words are pressed", async () => {
  // The bug guarded: a label was inert, so pressing the words beside a field
  // did nothing. A browser gets click-to-focus from `for`/`htmlFor`; the
  // runtime has neither, but it exposes `focusElement`, so a label given its
  // control's ref is that control's pointer target. The press is aimed inside
  // the painted words — a text leaf owns the hit test, so the leaves being
  // inert is what lets the frame take it.
  const runtime = await openWindow();
  const ref = createRef<PublicInstance>();
  const focused: string[] = [];
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Label target={ref} testId="label">
          Project name
        </Label>
        <Input
          testId="field"
          label="Project name"
          ref={ref}
          onFocus={() => focused.push("field")}
        />
      </Stack>
    </Surface>,
  );
  const label = boundsOf(runtime, "label");
  runtime.clickAt(label.x + 6, label.y + 4);
  expect(runtime.focused()).toStrictEqual(Option.some("field"));
  expect(focused).toEqual(["field"]);
});

it("leaves the focus alone when a label names no control", async () => {
  // The other direction: without a target the words are only words, and the
  // same press must not move the focus.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Label testId="label">Project name</Label>
        <Input testId="field" label="Project name" />
      </Stack>
    </Surface>,
  );
  const label = boundsOf(runtime, "label");
  runtime.clickAt(label.x + 6, label.y + 4);
  expect(runtime.focused()).toStrictEqual(Option.none());
});

it("leaves a disabled control's focus alone when its label is pressed", async () => {
  // A label holds the control's element, not its state: without `disabled` the
  // press would focus a field that refuses every key (measured — the field took
  // the focus), so the same boolean the control takes drops the press.
  const runtime = await openWindow();
  const ref = createRef<PublicInstance>();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Label target={ref} disabled testId="label">
          Project name
        </Label>
        <Input testId="field" label="Project name" ref={ref} disabled />
      </Stack>
    </Surface>,
  );
  const label = boundsOf(runtime, "label");
  runtime.clickAt(label.x + 6, label.y + 4);
  expect(runtime.focused()).toStrictEqual(Option.none());
});

it("announces the help a field carries, and the id an automation host uses", async () => {
  // The help a visible `Label description` paints used to reach nobody: there is
  // no `aria-describedby`, so the control has to carry the words itself. This is
  // the runtime's `aria-description` channel, measured on the node.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Owner email"
        description="We never share it."
        aria-id="contact-email"
      />
    </Surface>,
  );
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "TextInput", label: "Owner email" }),
    () => expect.fail("the field painted no TextInput node"),
  );
  expect(node.aria?.description).toBe("We never share it.");
  expect(node.aria?.author_id).toBe("contact-email");
});

it("hands the caller's ref the field's own element", async () => {
  // A form focuses the field it failed on, so the caller needs the element, not
  // its `testId`. The address has to be the runtime's own instance: the ref is
  // compared with the element the `testId` resolves to.
  const runtime = await openWindow();
  const ref = createRef<PublicInstance>();
  runtime.render(
    <Surface>
      <Input testId="field" label="Email" ref={ref} />
    </Surface>,
  );
  const element = Option.getOrElse(runtime.element("field"), () =>
    expect.fail("the runtime mounted no field"),
  );
  expect(ref.current?.id).toBe(element.id);
});

it("takes a disabled field out of the tab order it was given", async () => {
  // `tabIndex` is the caller's order, but a disabled field declares no ring and
  // refuses every key, so a stop there would have no cue.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <Input testId="enabled" label="Enabled" tabIndex={0} />
        <Input testId="disabled" label="Disabled" disabled tabIndex={0} />
      </Stack>
    </Surface>,
  );
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("enabled");
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).not.toBe("disabled");
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

it("applies a value the field's owner pushes mid-edit", async () => {
  // The owner correcting an edit can only take the box back when the value it
  // pushes **moves**: the next reported edit proves what the native box holds,
  // so an owner that replaces "a" with "X" must read "Xb" on the next key.
  const runtime = await openWindow();
  const values: string[] = [];
  const Owner = () => {
    const [text, setText] = useState("");
    return (
      <Surface>
        <Input
          testId="field"
          label="Name"
          autoFocus
          value={text}
          onChange={(next) => {
            values.push(next);
            setText("X");
          }}
        />
      </Surface>
    );
  };
  runtime.render(<Owner />);
  runtime.type("a");
  runtime.type("b");
  expect(values).toStrictEqual(["a", "Xb"]);
});

it("cannot take back an edit that leaves the owner's value where it was", async () => {
  // The measured limit behind the fields' missing `maxLength` (and every filter
  // or mask that removes the character just typed): a `value` is applied only
  // when it **changes**, so an owner clamping five characters reports the
  // truncated value while the native box keeps the sixth character and hands it
  // back on the next edit. A field that promised a hard cap would paint text its
  // own value does not contain. Guarded so the pages' claim fails with the
  // runtime: if a value is re-applied without changing, this case goes red and
  // `Input`/`TextArea` may start offering a cap.
  const runtime = await openWindow();
  const values: string[] = [];
  const Capped = () => {
    const [text, setText] = useState("");
    return (
      <Surface>
        <Input
          testId="field"
          label="Code"
          autoFocus
          value={text}
          onChange={(next) => {
            values.push(next);
            setText(next.slice(0, 5));
          }}
        />
      </Surface>
    );
  };
  runtime.render(<Capped />);
  runtime.type("a b c d e f g");
  expect(values).toStrictEqual([
    "a",
    "ab",
    "abc",
    "abcd",
    "abcde",
    "abcdef",
    "abcdefg",
  ]);
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

it("sizes a TextArea by whole rows when a count is fractional", async () => {
  // The bug this guards: 0.11.0's textarea reads `minRows`/`maxRows` as whole
  // rows and drops a fractional count **entirely** rather than flooring it. A
  // floor computed from a measured height (`minRows={2.5}`) therefore painted
  // one row — *fewer* than `minRows={2}` — and a fractional `maxRows` removed
  // the cap, so a six-line field painted all six rows instead of scrolling.
  const heightOf = async (props: {
    readonly minRows?: number;
    readonly maxRows?: number;
    readonly defaultValue?: string;
  }): Promise<number> => {
    const runtime = await openWindow();
    runtime.render(
      <Surface>
        <TextArea testId="area" {...props} />
      </Surface>,
    );
    return boundsOf(runtime, "area").height;
  };
  const six = "a\nb\nc\nd\ne\nf";
  const floor = await heightOf({ minRows: 2 });
  const capped = await heightOf({ maxRows: 2, defaultValue: six });
  const whole = await heightOf({ defaultValue: six });
  expect(await heightOf({ minRows: 2.5 })).toBe(floor);
  expect(await heightOf({ maxRows: 2.5, defaultValue: six })).toBe(capped);
  expect(capped).toBeLessThan(whole);
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

it("runs a TextArea's onValueChange and not the deprecated alias", async () => {
  // The bug this guards: `TextArea` read `props.onChange` directly, so the
  // documented `onValueChange` never fired — a caller who migrated off the
  // deprecated alias stopped being notified, and every other value control
  // routed through `valueChange` already. `src/components/change.test.ts` now
  // includes this file's component in its contract sweep.
  const runtime = await openWindow();
  const field = recorder();
  let aliased = 0;
  runtime.render(
    <Surface>
      <TextArea
        testId="area"
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

/** The applied style of the element a `Select` painted as its trigger. */
const triggerStyle = (runtime: Runtime, testId: string) =>
  Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`the Select trigger ${testId} painted no element`),
  ).style;

it("paints an unchosen Select's hint in the placeholder role", async () => {
  // The bug guarded: GPUix's `SelectValue` paints its fallback inside the
  // trigger, so the trigger's own colour is what the hint inherits. It kept the
  // value role, so an empty select read as a chosen one and the measured
  // `placeholder` role was never painted by this control.
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Select
        testId="fruit"
        triggerTestId="fruit-trigger"
        itemTestId={(value) => `fruit-${value}`}
        label="Fruit"
        placeholder="Pick one"
        onValueChange={field.onChange}
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  expect(triggerStyle(runtime, "fruit-trigger")["color"]).toBe(
    testTheme.colors.placeholder,
  );
  runtime.click("fruit-trigger");
  runtime.click("fruit-pear");
  // The hint has become a value, so the trigger returns to the value role.
  expect(triggerStyle(runtime, "fruit-trigger")["color"]).toBe(
    testTheme.colors.inputForeground,
  );
});

it("announces a Select's trigger as its named control", async () => {
  // The bug guarded: the accessible name landed on `GpuixSelect`'s wrapper — a
  // plain `div` with no role — and GPUix's trigger is a `div` with a tab stop
  // and no role either, so a window's accessibility tree held no node for the
  // control at all (measured: only the Window node and one tab stop). The
  // trigger now carries `role="combobox"` and the name.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        label="Fruit"
        placeholder="Pick one"
        triggerTestId="fruit-trigger"
        options={[{ value: "apple", label: "Apple" }]}
      />
    </Surface>,
  );
  const control = a11yNode(runtime.a11y(), {
    role: "ComboBox",
    label: "Fruit",
  });
  expect(Option.isSome(control)).toBe(true);
  // The actions say the node is the control a reader can press and focus.
  const actions = Option.getOrElse(
    Option.map(control, (node) => node.aria?.on_action ?? []),
    () => expect.fail("the Select trigger painted no accessibility node"),
  );
  expect(Arr.contains(actions, "Click")).toBe(true);
  expect(Arr.contains(actions, "Focus")).toBe(true);
});

it("announces the choice a closed Select holds", async () => {
  // The bug guarded: the trigger said its name ("Fruit") and whether the list
  // was open, and nothing said **what was chosen** once the list closed. A
  // reader heard "Fruit, combo box, collapsed" and had to open the list to
  // learn the answer the closed control was already showing; a value that only
  // paints cannot be read. `aria-valuetext` is the value channel 0.11.0
  // publishes, so the trigger now carries the chosen option's label — an
  // unchosen select carries none, because a placeholder is not a choice.
  const runtime = await openWindow();
  const valueOf = () =>
    a11yValueOf(runtime.a11y(), { role: "ComboBox", label: "Fruit" });
  runtime.render(
    <Surface>
      <Select
        label="Fruit"
        placeholder="Pick one"
        triggerTestId="fruit-trigger"
        itemTestId={(value) => `fruit-${value}`}
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  expect(valueOf()).toStrictEqual(Option.none());
  // An uncontrolled Select has no value prop to read, so the wrapper has to
  // keep the choice the runtime committed — the one it repaints in the trigger.
  runtime.click("fruit-trigger");
  runtime.flush();
  runtime.click("fruit-pear");
  runtime.flush();
  expect(valueOf()).toStrictEqual(Option.some("Pear"));
});

it("announces a choice the caller owns, and drops one the options no longer offer", async () => {
  // The controlled half: the trigger follows the value the caller renders, and
  // a value no option names announces nothing rather than a stale label — an
  // option list loaded from a server can leave a stored value behind.
  const runtime = await openWindow();
  const valueOf = () =>
    a11yValueOf(runtime.a11y(), { role: "ComboBox", label: "Fruit" });
  runtime.render(
    <Surface>
      <Select
        label="Fruit"
        value="pear"
        triggerTestId="fruit-trigger"
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  expect(valueOf()).toStrictEqual(Option.some("Pear"));
  runtime.render(
    <Surface>
      <Select
        label="Fruit"
        value="pear"
        triggerTestId="fruit-trigger"
        options={[{ value: "apple", label: "Apple" }]}
      />
    </Surface>,
  );
  expect(valueOf()).toStrictEqual(Option.none());
});

it("announces a Select's options, their selection and their group", async () => {
  // The bug guarded: GPUix 0.11.0's `SelectItem`, `SelectGroup` and
  // `SelectLabel` are plain `div`s with no role, so an open list painted no
  // option node at all — a reader who could not see the popup could not pick
  // from it, and the row's checked mark was the only statement of the choice.
  // The row content now carries the role, the name and the state the runtime
  // reports for it, the list holds the options, and a group's caption names the
  // run it heads.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        label="Fruit"
        placeholder="Pick one"
        triggerTestId="fruit-trigger"
        itemTestId={(value) => `fruit-${value}`}
        defaultValue="apple"
        options={[
          {
            label: "Citrus",
            options: [
              { value: "apple", label: "Apple" },
              { value: "pear", label: "Pear" },
            ],
          },
        ]}
      />
    </Surface>,
  );
  runtime.click("fruit-trigger");
  runtime.flush();
  const dump = runtime.a11y();
  const option = (label: string) =>
    a11yNode(dump, { role: "ListBoxOption", label });
  expect(Option.isSome(option("Apple"))).toBe(true);
  expect(Option.isSome(option("Pear"))).toBe(true);
  expect(
    Option.isSome(a11yNode(dump, { role: "Group", label: "Citrus" })),
  ).toBe(true);
  expect(Option.isSome(a11yNode(dump, { role: "ListBox" }))).toBe(true);
  // The state is the one the runtime reports for the row, read back off the
  // tree — so an uncontrolled Select announces its choice without a mirror.
  const selected = (label: string) =>
    Option.flatMap(option(label), (node) =>
      Option.fromNullishOr(node.aria?.selected),
    );
  expect(selected("Apple")).toStrictEqual(Option.some(true));
  expect(selected("Pear")).toStrictEqual(Option.some(false));
});

it("publishes whether its list is open", async () => {
  // The bug guarded: `combobox` requires an expanded state, and GPUix's trigger
  // publishes none — the control never said whether its popup was open. The
  // wrapper holds the state the runtime reports (a caller may take it over with
  // `open`) and hands the trigger the answer, so the node flips both ways and
  // returns when an option commits.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        label="Fruit"
        placeholder="Pick one"
        triggerTestId="fruit-trigger"
        itemTestId={(value) => `fruit-${value}`}
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  const expanded = () =>
    Option.flatMap(
      a11yNode(runtime.a11y(), { role: "ComboBox", label: "Fruit" }),
      (node) => Option.fromNullishOr(node.aria?.expanded),
    );
  expect(expanded()).toStrictEqual(Option.some(false));
  runtime.click("fruit-trigger");
  runtime.flush();
  expect(expanded()).toStrictEqual(Option.some(true));
  runtime.click("fruit-pear");
  runtime.flush();
  expect(expanded()).toStrictEqual(Option.some(false));
});

it("lets a caller own the open state", async () => {
  // The controlled half of the contract: `open`/`onOpenChange` hand the state to
  // the caller, and the trigger's `expanded` follows what the caller renders —
  // so a component that opens its list from a command can publish it too.
  const runtime = await openWindow();
  const Controlled = () => {
    const [open, setOpen] = useState(false);
    return (
      <Surface>
        <Select
          label="Fruit"
          placeholder="Pick one"
          triggerTestId="fruit-trigger"
          itemTestId={(value) => `fruit-${value}`}
          open={open}
          onOpenChange={setOpen}
          options={[
            { value: "apple", label: "Apple" },
            { value: "pear", label: "Pear" },
          ]}
        />
      </Surface>
    );
  };
  runtime.render(<Controlled />);
  const expanded = () =>
    Option.flatMap(
      a11yNode(runtime.a11y(), { role: "ComboBox", label: "Fruit" }),
      (node) => Option.fromNullishOr(node.aria?.expanded),
    );
  expect(expanded()).toStrictEqual(Option.some(false));
  runtime.click("fruit-trigger");
  runtime.flush();
  expect(expanded()).toStrictEqual(Option.some(true));
  runtime.click("fruit-pear");
  runtime.flush();
  expect(expanded()).toStrictEqual(Option.some(false));
  // The caller's prop is the state, not a hint: a host that holds `open` true
  // and refuses the change keeps its list open when an option commits, where a
  // wrapper listening only to its own mirror would have closed it.
  runtime.render(
    <Surface>
      <Select
        label="Fruit"
        placeholder="Pick one"
        triggerTestId="fruit-trigger"
        itemTestId={(value) => `fruit-${value}`}
        open
        onOpenChange={() => {}}
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  runtime.flush();
  expect(expanded()).toStrictEqual(Option.some(true));
  runtime.click("fruit-pear");
  runtime.flush();
  expect(expanded()).toStrictEqual(Option.some(true));
});

it("lifts a Select's list like every other floating surface", async () => {
  // The bug guarded: the list floats over page content and was the one floating
  // surface with no lift at all. `selectContentStyle` bounds it (the only
  // element carrying an overflow axis here), so that is also the element the
  // lift has to reach in the renderer.
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
  runtime.clickElement(triggerOf(runtime, "sel"));
  const list = Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.style["overflowY"] === "scroll",
    ),
    () => expect.fail("the Select list painted no bounded scroller"),
  );
  expect(Option.isSome(Option.fromNullishOr(list.style["boxShadow"]))).toBe(
    true,
  );
});

/** The row an option label sits in. */
const optionRowId = (runtime: Runtime, label: string): number =>
  Option.getOrElse(
    Option.fromNullishOr(textElement(runtime, label).parentId),
    () => expect.fail(`the ${label} option has no row`),
  );

/** The painted box of the row an option label sits in. */
const optionRow = (runtime: Runtime, label: string): Bounds =>
  Option.getOrElse(runtime.boundsOfId(optionRowId(runtime, label)), () =>
    expect.fail(`the ${label} row painted no box`),
  );

/** Every ancestor of an element, nearest first, bounded so a cycle cannot hang. */
const ancestorsOf = (
  runtime: Runtime,
  id: number,
  depth = 0,
): ReadonlyArray<number> => {
  if (depth > 8) return [];
  const parent = Option.flatMap(
    Option.fromNullishOr(runtime.renderer.getElement(id)),
    (element) => Option.fromNullishOr(element.parentId),
  );
  return Option.match(parent, {
    onNone: (): ReadonlyArray<number> => [],
    onSome: (parentId) => [
      parentId,
      ...ancestorsOf(runtime, parentId, depth + 1),
    ],
  });
};

/**
 * The 320px scroller a long list becomes, found through one of its rows.
 *
 * A `Select`'s content is GPUix's own element, so the convention the other
 * cases use — a `testId` on the wrapper — cannot name it; the box the wrapper
 * caps is the bound.
 */
const longScroller = (runtime: Runtime, label = "Option 1"): number =>
  Option.getOrElse(
    Arr.findFirst(ancestorsOf(runtime, optionRowId(runtime, label)), (id) =>
      Option.match(
        Option.fromNullishOr(runtime.renderer.getElementBounds(id)),
        { onNone: () => false, onSome: (bounds) => bounds.height === 320 },
      ),
    ),
    () => expect.fail("the list painted no bounded scroller"),
  );

it("paints a grouped list's captions and selects a row inside a group", async () => {
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Food"
        placeholder="Pick one"
        onChange={field.onChange}
        options={[
          {
            label: "Fruit",
            options: [{ value: "apple", label: "Apple" }],
          },
          {
            label: "Vegetables",
            options: [{ value: "leek", label: "Leek" }],
          },
        ]}
      />
    </Surface>,
  );
  runtime.clickElement(triggerOf(runtime, "sel"));

  // Both captions paint, in order, above their rows; the runtime still receives
  // one flat list, so a row inside a group is addressable exactly like any other.
  expect(runtime.allText()).toEqual(
    expect.arrayContaining(["Fruit", "Vegetables", "Apple", "Leek"]),
  );
  const leekRow = Option.getOrElse(
    Option.fromNullishOr(textElement(runtime, "Leek").parentId),
    () => expect.fail("the Leek option has no row"),
  );
  runtime.clickElement(
    Option.getOrElse(
      Option.fromNullishOr(runtime.renderer.getElement(leekRow)),
      () => expect.fail("the Leek row vanished"),
    ),
  );
  expect(lastValue(field.values)).toBe("leek");
});

it("keeps an open list inside the window when its trigger sits at the bottom", async () => {
  // GPUix's `<anchored>` snaps the layer into the window (`fit: "snap"`,
  // `snapMargin` 8). The old docs said the list "neither flips off a window
  // edge nor scrolls"; this measures the first half, so the page teaches the
  // runtime that is pinned.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box tone="background" style={{ height: 700 }} />
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
  runtime.clickElement(triggerOf(runtime, "sel"));
  const apple = optionRow(runtime, "Apple");
  const pear = optionRow(runtime, "Pear");

  expect(apple.y).toBeGreaterThanOrEqual(0);
  expect(pear.y + pear.height).toBeLessThanOrEqual(WINDOW.height);
  // Snapped above the trigger rather than painted off the bottom edge.
  expect(apple.y).toBeLessThan(pear.y);
});

it("bounds a long list and scrolls it on the wheel", async () => {
  // Measured: the runtime's own content sets no `maxHeight`/`overflow`, and
  // `SelectScrollUpButton`/`SelectScrollDownButton` are empty divs in 0.11.0, so
  // a 40-option list used to paint its tail outside the window with nothing able
  // to reach it. The wrapper caps the surface at the menus' 320px and turns it
  // into a scroller; the wheel moves it. The keyboard reveal is its own case
  // below.
  const runtime = await openWindow();
  const options = Arr.map(Arr.range(1, 40), (index) => ({
    value: `option-${index}`,
    label: `Option ${index}`,
  }));
  runtime.render(
    <Surface>
      <Box tone="background" style={{ height: 700 }} />
      <Select
        testId="sel"
        label="Long"
        placeholder="Pick one"
        options={options}
      />
    </Surface>,
  );
  runtime.clickElement(triggerOf(runtime, "sel"));
  const content = (): Bounds =>
    Option.getOrElse(
      Option.fromNullishOr(
        runtime.renderer.getElementBounds(longScroller(runtime)),
      ),
      () => expect.fail("the scroller lost its box"),
    );
  const offset = (): unknown =>
    runtime.renderer.getScrollOffset(longScroller(runtime));

  expect(content().height).toBe(320);
  expect(offset()).toEqual([0, 0]);
  const box = content();
  runtime.renderer.nativeSimulateScrollWheel(
    box.x + box.width / 2,
    box.y + box.height / 2,
    0,
    -200,
  );
  runtime.flush();
  expect(offset()).toEqual([0, -200]);
});

/**
 * The row the runtime currently highlights, found by the wash it paints.
 *
 * A `Select` row's highlight is a style value, not an attribute, so the painted
 * `hover` role is the only readout — and the assertion that matters is whether
 * that row is inside the scroller.
 */
const highlightedRow = (runtime: Runtime): Bounds =>
  Option.getOrElse(
    Option.flatMap(
      Arr.findFirst(
        runtime.all(),
        (element) => element.style.backgroundColor === testTheme.colors.hover,
      ),
      (element) => runtime.boundsOfId(element.id),
    ),
    () => expect.fail("the list painted no highlighted row"),
  );

/** Whether a row is inside the box that holds it. */
const inside = (row: Bounds, box: Bounds): boolean =>
  row.y >= box.y - 1 && row.y + row.height <= box.y + box.height + 1;

it("reveals the row a keyboard move highlights", async () => {
  // The bug guarded: the runtime scrolls its list on the wheel but never for its
  // own highlight, so twenty ArrowDowns moved the highlight over rows the 320px
  // scroller had not revealed and left the offset where it was — a keyboard
  // reader could not reach a row past the fold. The row is the only part told
  // `highlighted`, so the wrapper makes the highlighted row reveal itself.
  const runtime = await openWindow();
  const options = Arr.map(Arr.range(1, 40), (index) => ({
    value: `option-${index}`,
    label: `Option ${index}`,
  }));
  runtime.render(
    <Surface>
      <Box tone="background" style={{ height: 700 }} />
      <Select
        testId="sel"
        label="Long"
        placeholder="Pick one"
        options={options}
      />
    </Surface>,
  );
  runtime.clickElement(triggerOf(runtime, "sel"));
  const offset = (): ReadonlyArray<number> =>
    Option.getOrElse(
      Option.fromNullishOr(
        runtime.renderer.getScrollOffset(longScroller(runtime)),
      ),
      () => expect.fail("the list painted no scroll offset"),
    );

  expect(offset()[1]).toBe(0);
  runtime.type("down down down down down down down down down down");
  runtime.type("down down down down down down down down down down");
  runtime.flush();
  // Ten rows overflow the cap on their own; the highlight has to have moved the
  // list by the time it reaches the twentieth.
  const afterDowns = offset()[1] ?? 0;
  expect(afterDowns).toBeLessThan(-200);
  const scroller = (): Bounds =>
    Option.getOrElse(
      Option.fromNullishOr(
        runtime.renderer.getElementBounds(longScroller(runtime)),
      ),
      () => expect.fail("the scroller lost its box"),
    );
  const box = scroller();
  expect(inside(highlightedRow(runtime), box)).toBe(true);

  runtime.type("up up up up up up up up up up");
  runtime.type("up up up up up up up up up up");
  runtime.flush();
  // Upwards as well: the offset moves up with the highlight, and the highlighted
  // row is inside the scroller rather than left above the fold.
  expect(offset()[1] ?? 0).toBeGreaterThan(afterDowns);
  expect(inside(highlightedRow(runtime), scroller())).toBe(true);
});

it("reveals a grouped row as far as the runtime can", async () => {
  // Measurement, not a promise: `scrollIntoView` scrolls the nearest scroller to
  // the index of its **direct child**, so a row nested in a `SelectGroup` can
  // only reveal its group. Pinned so the docs can say which case is limited and
  // a runtime upgrade shows up here.
  const runtime = await openWindow();
  const group = (prefix: string, from: number) => ({
    label: prefix,
    options: Arr.map(Arr.range(from, from + 19), (index) => ({
      value: `${prefix}-${index}`,
      label: `${prefix} ${index}`,
    })),
  });
  runtime.render(
    <Surface>
      <Box tone="background" style={{ height: 700 }} />
      <Select
        testId="sel"
        label="Grouped"
        placeholder="Pick one"
        options={[group("Fruit", 1), group("Veg", 21)]}
      />
    </Surface>,
  );
  runtime.clickElement(triggerOf(runtime, "sel"));
  const box = (): Bounds =>
    Option.getOrElse(
      Option.fromNullishOr(
        runtime.renderer.getElementBounds(longScroller(runtime, "Fruit 1")),
      ),
      () => expect.fail("the grouped list painted no bounded scroller"),
    );
  const offset = (): ReadonlyArray<number> =>
    Option.getOrElse(
      Option.fromNullishOr(
        runtime.renderer.getScrollOffset(longScroller(runtime, "Fruit 1")),
      ),
      () => expect.fail("the grouped list painted no scroll offset"),
    );
  runtime.type("down down down down down down down down down down");
  runtime.flush();
  // The offset moves, so the reveal runs; whether the *row* is inside is the
  // part this case records.
  expect(offset()[1] ?? 0).toBeLessThan(0);
  expect(inside(highlightedRow(runtime), box())).toBe(true);
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

it("addresses a Select's trigger and an option row by test id", async () => {
  // The bug guarded: `testId` reached the root only — a wrapper that paints
  // nothing but its width — so an automation host had to walk the root's
  // children for the trigger and search the painted text for a row.
  const runtime = await openWindow();
  const field = recorder();
  runtime.render(
    <Surface>
      <Select
        testId="fruit"
        triggerTestId="fruit-trigger"
        itemTestId={(value) => `fruit-${value}`}
        label="Fruit"
        placeholder="Pick one"
        onValueChange={field.onChange}
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  expect(Option.isNone(runtime.element("fruit-trigger"))).toBe(false);
  runtime.click("fruit-trigger");
  expect(runtime.allText()).toContain("Pear");
  expect(Option.isSome(runtime.bounds("fruit-pear"))).toBe(true);
  runtime.click("fruit-pear");
  expect(lastValue(field.values)).toBe("pear");
});

it("marks the selected row in the list and moves the mark with the selection", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        placeholder="Pick one"
        defaultValue="apple"
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
          { value: "plum", label: "Plum" },
        ]}
      />
    </Surface>,
  );
  const marks = (): ReadonlyArray<{ readonly id: number }> =>
    Arr.filter(runtime.all(), (element) => element.type === "svg");
  const markY = (): number => {
    const [mark] = marks();
    return Option.getOrElse(
      mark === undefined ? Option.none() : runtime.boundsOfId(mark.id),
      () => expect.fail("the selected row painted no mark"),
    ).y;
  };
  runtime.clickElement(triggerOf(runtime, "sel"));
  // Exactly one row is selected, so exactly one mark is painted.
  expect(marks()).toHaveLength(1);
  const appleMark = markY();
  const pearRow = Option.getOrElse(
    Option.fromNullishOr(textElement(runtime, "Pear").parentId),
    () => expect.fail("the Pear option has no row"),
  );
  runtime.clickElement(
    Option.getOrElse(
      Option.fromNullishOr(runtime.renderer.getElement(pearRow)),
      () => expect.fail("the Pear row vanished"),
    ),
  );
  runtime.clickElement(triggerOf(runtime, "sel"));
  expect(marks()).toHaveLength(1);
  // The mark follows the runtime's reported selection, not a stale default.
  expect(markY()).toBeGreaterThan(appleMark);
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
  runtime.settleMotion();
  const tip = boundsOf(runtime, "tip");
  const target = boundsOf(runtime, "target");
  expect(tip.y).toBeGreaterThanOrEqual(target.y + target.height);
  const fill = Option.flatMap(runtime.element("tip"), (element) =>
    Option.fromNullishOr(element.style.backgroundColor),
  );
  expect(Option.getOrUndefined(fill)).toBe(testTheme.colors.popover);
  runtime.click("target");
  // A dismissed tip keeps its box for the exit tween, so the paint is still
  // there in the click's frame; the journey, not the state, is what is timed.
  expect(runtime.allText()).toContain("A hint");
  await sleep(motionLevels.fast + 40);
  expect(runtime.allText()).not.toContain("A hint");
});

it("moves the tip from the edge it is anchored to", async () => {
  // The gap guarded: the tip carried no `motion`, so it appeared at rest. The
  // runtime applies the frame as a movement relative to the anchored position,
  // which is what makes the entry readable in element bounds: a tip below its
  // trigger starts its two pixels low and rises into place.
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
  // The first painted frame is the entry: a tip below its trigger starts its
  // two pixels low, and the motion clock is what lands it.
  const entering = boundsOf(runtime, "tip");
  runtime.settleMotion();
  const resting = boundsOf(runtime, "tip");
  expect(entering.y).toBeLessThan(resting.y);
  expect(resting.y - entering.y).toBeLessThanOrEqual(2);
});

it("lands the tip at once when the reader asked for less motion", async () => {
  // The preference removes the journey, not the frames: the tip still opens and
  // still closes, but a close is an unmount rather than a held exit.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="A hint" reducedMotion testId="tip">
        <div testId="target" tabIndex={0} style={{ display: "flex" }}>
          <Text>Trigger</Text>
        </div>
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(runtime.allText()).toContain("A hint");
  runtime.click("target");
  await sleep(10);
  expect(runtime.allText()).not.toContain("A hint");
});

it("takes one hover delay from the TooltipProvider above it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <TooltipProvider delay={120}>
        <Tooltip content="A hint" testId="tip">
          <div testId="target" tabIndex={0} style={{ display: "flex" }}>
            <Text>Hover me</Text>
          </div>
        </Tooltip>
      </TooltipProvider>
    </Surface>,
  );
  runtime.hover("target");
  // The provider's delay is the tip's default: a hover does not paint at once,
  // which is the behaviour a toolbar needs when the pointer crosses its actions.
  expect(runtime.allText()).not.toContain("A hint");
  await sleep(180);
  expect(runtime.allText()).toContain("A hint");
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

it("opens a Tooltip from the IconButton it wraps and announces its text", async () => {
  // The bug guarded: an icon action is the usual tooltip trigger, and GPUix's
  // `TooltipTrigger asChild` merges its handlers into the child element. The
  // control dropped the hover pair and the `aria-description`, so the tip only
  // opened on a keyboard focus and never reached the accessibility tree.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="Booked revenue, net of refunds." testId="tip">
        <IconButton
          label="Revenue definition"
          icon={<Icon name="info" color={testTheme.colors.mutedForeground} />}
          testId="target"
        />
      </Tooltip>
    </Surface>,
  );
  expect(runtime.allText()).not.toContain("Booked revenue, net of refunds.");
  runtime.hover("target");
  expect(runtime.allText()).toContain("Booked revenue, net of refunds.");
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { label: "Revenue definition" }),
    () => expect.fail("the trigger has no accessibility node"),
  );
  expect(node.aria?.description).toBe("Booked revenue, net of refunds.");
  runtime.click("target");
  await sleep(motionLevels.fast + 40);
  expect(runtime.allText()).not.toContain("Booked revenue, net of refunds.");
});

it("opens a Tooltip from the Checkbox it wraps and announces its text", async () => {
  // The bug guarded: a checkbox in a toolbar is described by a tip, and the
  // control dropped the trigger pair, so the tip opened on a keyboard focus and
  // never on hover, and its text reached no accessibility node.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="Draws a grid over the canvas" testId="tip">
        <Checkbox label="Show grid" testId="target" />
      </Tooltip>
    </Surface>,
  );
  expect(runtime.allText()).not.toContain("Draws a grid over the canvas");
  runtime.hover("target");
  expect(runtime.allText()).toContain("Draws a grid over the canvas");
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { label: "Show grid" }),
    () => expect.fail("the checkbox has no accessibility node"),
  );
  expect(node.aria?.description).toBe("Draws a grid over the canvas");
  runtime.click("target");
  await sleep(motionLevels.fast + 40);
  expect(runtime.allText()).not.toContain("Draws a grid over the canvas");
});

it("opens a Tooltip from the Switch it wraps and announces its text", async () => {
  // Same contract as the checkbox: a setting in a toolbar is described by a
  // tip, and without the forwarded pair only the focus path opened it.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="Sends a digest every morning" testId="tip">
        <Switch label="Notifications" testId="target" />
      </Tooltip>
    </Surface>,
  );
  expect(runtime.allText()).not.toContain("Sends a digest every morning");
  runtime.hover("target");
  expect(runtime.allText()).toContain("Sends a digest every morning");
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { label: "Notifications" }),
    () => expect.fail("the switch has no accessibility node"),
  );
  expect(node.aria?.description).toBe("Sends a digest every morning");
  runtime.click("target");
  await sleep(motionLevels.fast + 40);
  expect(runtime.allText()).not.toContain("Sends a digest every morning");
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
  runtime.settleMotion();
  const frame = boundsOf(runtime, SURFACE);
  const tip = boundsOf(runtime, "tip");
  expect(tip.x).toBeGreaterThanOrEqual(frame.x);
  expect(tip.x + tip.width).toBeLessThanOrEqual(frame.x + frame.width);
});

it("paints a controlled Tooltip only while its owner says open", async () => {
  // The gap guarded: the wrapper forwarded only the delay, so the runtime's
  // `open`/`onOpenChange` never arrived and a tip could not be held open from
  // code. Controlled, the trigger's requests are observations: a press asks to
  // close and the tip stays painted until the owner agrees.
  const runtime = await openWindow();
  const requests: boolean[] = [];
  const tree = (open: boolean) => (
    <Surface>
      <Tooltip
        content="A hint"
        testId="tip"
        open={open}
        onOpenChange={(next) => requests.push(next)}
      >
        <div testId="target" tabIndex={0} style={{ display: "flex" }}>
          <Text>Trigger</Text>
        </div>
      </Tooltip>
    </Surface>
  );
  runtime.render(tree(true));
  expect(runtime.allText()).toContain("A hint");
  runtime.click("target");
  // A press is a mouse-down and a click, and the runtime asks to close on both;
  // what matters is that the request reached the owner and the tip obeyed it.
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((next) => next === false)).toBe(true);
  expect(runtime.allText()).toContain("A hint");
  runtime.render(tree(false));
  // The owner's close is a leave like any other: the box stays for its tween.
  expect(runtime.allText()).toContain("A hint");
  await sleep(motionLevels.fast + 40);
  expect(runtime.allText()).not.toContain("A hint");
});

it("opens a Tooltip that mounts default-open, with no interaction", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="A hint" testId="tip" defaultOpen>
        <div testId="target" tabIndex={0} style={{ display: "flex" }}>
          <Text>Trigger</Text>
        </div>
      </Tooltip>
    </Surface>,
  );
  expect(runtime.allText()).toContain("A hint");
});

it("paints the theme's placeholder role for an empty field, not the runtime's grey", async () => {
  // The claim this measures: the hint is the theme's `placeholder` role, not
  // the runtime's default. The bug it guards: an empty host shapes its own
  // placeholder with a fixed `#8F8F8F` (`custom_elements/input.rs` at the
  // pinned 0.11.0), so the field gives the host no placeholder at all and
  // paints the words itself in the role the contrast contract measures.
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
  // The host keeps the seam — its value, caret and fill come from it — but it
  // is given no hint to shape in its own grey.
  expect(hostOf("hint").customProps?.placeholder).toBeUndefined();
  expect(themeOf("hint")).toEqual({
    text: testTheme.colors.inputForeground,
    textFaint: testTheme.colors.placeholder,
    bg: testTheme.colors.input,
  });
  const painted = Option.getOrElse(runtime.element("hint-hint"), () =>
    expect.fail("the empty field painted no hint"),
  );
  expect(painted.style.color).toBe(testTheme.colors.placeholder);
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

it("paints an invalid field's edge, not its fill", async () => {
  // The invalid state is an edge: the field keeps the `input` fill so its value
  // stays on the pair `contrastPairs` measures, and the border plus the focus
  // line carry the destructive role. Painting the solid role behind the value
  // measured 2.45:1 in the dark theme.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input testId="field" label="Project name" invalid value="atlas" />
    </Surface>,
  );
  const style = Option.getOrElse(runtime.element("field"), () =>
    expect.fail("the runtime retained no field"),
  ).style;
  expect(style.backgroundColor).toBe(testTheme.colors.input);
  expect(style.borderColor).toBe(testTheme.colors.destructive);
  // The anti-tautology guard: the two roles are not the same value, so a test
  // that only compared the field with itself could not pass by accident.
  expect(testTheme.colors.destructive).not.toBe(testTheme.colors.input);
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

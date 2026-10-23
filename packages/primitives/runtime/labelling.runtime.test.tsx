/**
 * Labelling a control that has no `aria-labelledby`.
 *
 * GPUix 0.11.0 publishes no association between a label and the control it
 * describes, so a `Label` beside a checkbox, switch or field is **visible text
 * only**: the accessibility tree has a Label node and an unnamed control node,
 * and nothing connects them. The name has to be the control's own `label` prop.
 *
 * This is measured rather than asserted in prose because the opposite reads as
 * obviously true — every web label associates — and three docs pages used to
 * advise exactly that ("pair it with a `Label`"). The second test proves the
 * support path: the same string through `labelledBy` is what makes the control
 * announced.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Checkbox } from "../src/components/Checkbox.js";
import { Input } from "../src/components/Input.js";
import { Label, labelledBy } from "../src/components/Label.js";
import { NumberField } from "../src/components/NumberField.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { TextArea } from "../src/components/TextArea.js";
import {
  a11yDescriptionOf,
  a11yNode,
  a11yNodes,
  type Runtime,
} from "./harness.js";
import { Surface, openWindow } from "./fixture.js";

const mount = async (
  node: Parameters<Runtime["render"]>[0],
): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

const named = (runtime: Runtime, role: string, label: string) =>
  Option.isSome(a11yNode(runtime.a11y(), { role, label }));

const unnamed = (runtime: Runtime, role: string): boolean =>
  a11yNodes(runtime.a11y()).some(
    (node) => node.aria?.role === role && node.aria?.label === undefined,
  );

it("does not name a checkbox, switch or input from a Label beside it", async () => {
  const runtime = await mount(
    <Stack direction="column">
      <Label>Notifications</Label>
      <Stack direction="row">
        <Checkbox testId="c" />
        <Switch testId="s" />
      </Stack>
      <Input testId="i" />
    </Stack>,
  );

  // The label paints its text; no control borrowed it as a name.
  expect(Option.isSome(a11yNode(runtime.a11y(), { role: "Label" }))).toBe(true);
  expect(runtime.allText()).toContain("Notifications");
  // None of the controls borrowed it: each is present and unnamed.
  expect(named(runtime, "CheckBox", "Notifications")).toBe(false);
  expect(named(runtime, "Switch", "Notifications")).toBe(false);
  expect(named(runtime, "TextInput", "Notifications")).toBe(false);
  expect(unnamed(runtime, "CheckBox")).toBe(true);
  expect(unnamed(runtime, "Switch")).toBe(true);
});

it("names the controls when the same string reaches their label prop", async () => {
  const name = "Notifications";
  const runtime = await mount(
    <Stack direction="column">
      <Label>{name}</Label>
      <Stack direction="row">
        <Checkbox testId="c" {...labelledBy(name)} />
        <Switch testId="s" {...labelledBy(name)} />
      </Stack>
      <Input testId="i" {...labelledBy(name)} />
    </Stack>,
  );

  expect(named(runtime, "CheckBox", "Notifications")).toBe(true);
  expect(named(runtime, "Switch", "Notifications")).toBe(true);
  expect(named(runtime, "TextInput", "Notifications")).toBe(true);
});

it("announces the hint a field paints, while the box is empty", async () => {
  // The bug guarded: a field paints its own hint because the runtime shapes an
  // empty host's placeholder in a fixed grey no theme reaches (`fieldHint`), and
  // handing the host no `placeholder` prop also takes the runtime's
  // `aria_placeholder` with it — so a reader focused an empty email field and
  // heard no format at all. The painted words ride the one help channel 0.11.0
  // has (`aria-description`), and a caller's permanent help still wins.
  const runtime = await mount(
    <Stack direction="column">
      <Input testId="email" label="Email" placeholder="you@example.com" />
      <TextArea testId="notes" label="Notes" placeholder="What changed?" />
      <NumberField testId="copies" label="Copies" placeholder="1 to 99" />
      <Input
        testId="owner"
        label="Owner"
        description="We never share it."
        placeholder="you@example.com"
      />
      <Input
        testId="filled"
        label="Filled"
        placeholder="you@example.com"
        value="ada@example.com"
      />
    </Stack>,
  );
  const help = (role: string, label: string) =>
    a11yDescriptionOf(runtime.a11y(), { role, label });

  expect(help("TextInput", "Email")).toStrictEqual(
    Option.some("you@example.com"),
  );
  expect(help("MultilineTextInput", "Notes")).toStrictEqual(
    Option.some("What changed?"),
  );
  expect(help("TextInput", "Copies")).toStrictEqual(Option.some("1 to 99"));
  expect(help("TextInput", "Owner")).toStrictEqual(
    Option.some("We never share it."),
  );
  // The hint is gone once the box holds a value, so the channel is free again.
  expect(help("TextInput", "Filled")).toStrictEqual(Option.none());
});

it("paints no help line for a description that says nothing", async () => {
  // The bug guarded: `Label` painted its `description` whenever it was not
  // `undefined`, and a run of spaces lays out a whole line where `""` lays out
  // none — so help that arrived from data blank added a blank line under the
  // name while the control announced nothing (the description channel drops a
  // blank). Measured in the window: `""` and no description are the same box,
  // a run of spaces is not, and real help is one line taller still.
  const runtime = await mount(
    <Stack direction="column">
      <Label testId="bare">Notifications</Label>
      <Label testId="empty" description="">
        Notifications
      </Label>
      <Label testId="spaces" description="   ">
        Notifications
      </Label>
      <Label testId="written" description="We never share it.">
        Notifications
      </Label>
    </Stack>,
  );
  runtime.flush();
  const height = (testId: string): number =>
    Option.getOrElse(runtime.bounds(testId), () =>
      expect.fail(`the label "${testId}" painted no box`),
    ).height;
  expect(height("empty")).toBe(height("bare"));
  expect(height("spaces")).toBe(height("bare"));
  expect(height("written")).toBeGreaterThan(height("bare"));
});

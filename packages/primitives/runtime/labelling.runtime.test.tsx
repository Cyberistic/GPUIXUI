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
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { a11yNode, a11yNodes, type Runtime } from "./harness.js";
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
  expect(Option.isSome(a11yNode(runtime.a11y(), { role: "Label" }))).toBe(
    true,
  );
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

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { TextArea } from "../src/components/TextArea.js";
import { a11yNode, type Bounds, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const styleOf = (runtime: Runtime, testId: string): Record<string, unknown> =>
  Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`the runtime mounted no ${testId}`),
  ).style;

it("paints an Input's hint in the measured placeholder role", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input testId="field" label="Search" placeholder="Search projects" />
    </Surface>,
  );
  const hint = styleOf(runtime, "field-hint");
  expect(hint.color).toBe(testTheme.colors.placeholder);
  expect(hint.fontSize).toBe(testTheme.typography.body.fontSize);
  expect(runtime.paintedText()).toContain("Search projects");
});

it("puts the hint where the value will be typed, inside the field", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input testId="field" label="Search" placeholder="Search projects" />
    </Surface>,
  );
  const field = boundsOf(runtime, "field");
  const hint = boundsOf(runtime, "field-hint");
  const inset =
    testTheme.borderWidth.thin + testTheme.density.controlPaddingX.md;

  expect(Math.abs(hint.x - (field.x + inset))).toBeLessThanOrEqual(1);

  expect(hint.y).toBeGreaterThan(field.y);
  expect(hint.y + hint.height).toBeLessThan(field.y + field.height);
});

it("keeps the press for the field underneath", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input testId="field" label="Search" placeholder="Search projects" />
    </Surface>,
  );
  const hint = boundsOf(runtime, "field-hint");
  runtime.clickAt(hint.x + hint.width / 2, hint.y + hint.height / 2);
  expect(runtime.focused()).toStrictEqual(Option.some("field"));
});

it("hides the hint once the reader types, and brings it back when the value clears", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input testId="field" label="Search" placeholder="Search projects" />
    </Surface>,
  );
  runtime.keyDown("field", "h");
  runtime.type("i");
  expect(Option.isNone(runtime.element("field-hint"))).toBe(true);
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Search"
        value=""
        placeholder="Search projects"
      />
    </Surface>,
  );
  expect(Option.isSome(runtime.element("field-hint"))).toBe(true);
});

it("paints a TextArea's hint on its first row", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <TextArea testId="notes" label="Notes" placeholder="Describe the issue" />
    </Surface>,
  );
  const area = boundsOf(runtime, "notes");
  const hint = boundsOf(runtime, "notes-hint");
  const top = testTheme.borderWidth.thin + testTheme.density.controlPaddingX.md;
  expect(Math.abs(hint.y - (area.y + top))).toBeLessThanOrEqual(1);
  expect(styleOf(runtime, "notes-hint").color).toBe(
    testTheme.colors.placeholder,
  );
});

it("paints a NumberField's hint inside the input it sits over", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <NumberField testId="qty" label="Quantity" placeholder="Quantity" />
    </Surface>,
  );
  const hint = styleOf(runtime, "qty-hint");
  expect(hint.color).toBe(testTheme.colors.placeholder);
  const field = boundsOf(runtime, "qty");
  const box = boundsOf(runtime, "qty-hint");

  expect(box.x).toBeGreaterThanOrEqual(field.x);
  expect(box.x + box.width).toBeLessThanOrEqual(field.x + field.width);
  expect(runtime.paintedText()).toContain("Quantity");
});

it("fades a disabled hint with the field it sits in", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Search"
        placeholder="Search projects"
        disabled
      />
    </Surface>,
  );
  expect(styleOf(runtime, "field-hint").opacity).toBeLessThan(1);
});

it("reads the hint as a label beside the field", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input testId="field" label="Search" placeholder="Search projects" />
    </Surface>,
  );
  const dump = runtime.a11y();
  expect(Option.isSome(a11yNode(dump, { role: "Label" }))).toBe(true);
  expect(
    Option.isSome(a11yNode(dump, { role: "TextInput", label: "Search" })),
  ).toBe(true);
});

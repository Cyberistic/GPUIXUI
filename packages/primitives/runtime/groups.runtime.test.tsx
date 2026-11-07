import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { expect, it } from "vitest";
import { targetSize } from "@gpuixui/tokens";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import {
  a11yDescriptionOf,
  a11yNodes,
  a11yValueOf,
  type Bounds,
  type Runtime,
} from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const rowOf = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.customProps?.["aria-label"] === label,
    ),
    () => expect.fail(`the runtime retained no row labelled ${label}`),
  );

const boxOf = (runtime: Runtime, label: string) => {
  const row = rowOf(runtime, label);
  return Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(row.children[0]), (id) =>
      Option.fromNullishOr(runtime.renderer.getElement(id)),
    ),
    () => expect.fail(`the ${label} row painted no box`),
  );
};

const boundsOf = (runtime: Runtime, label: string): Bounds => {
  const row = rowOf(runtime, label);
  return Option.getOrElse(runtime.boundsOfId(row.id), () =>
    expect.fail(`the ${label} row painted no box`),
  );
};

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

const ringed = (element: {
  readonly style: { readonly focusVisible?: unknown };
}) => Option.isSome(Option.fromNullishOr(element.style.focusVisible));

const focusOn = (runtime: Runtime, label: string): void => {
  runtime.click("before");
  runtime.focusNext();
  runtime.flush();
  expect(
    Option.getOrElse(
      Option.map(runtime.focusedElement(), (element) =>
        String(element.customProps?.["aria-label"] ?? element.type),
      ),
      () => "nothing",
    ),
  ).toBe(label);
};

const groups = (props?: { readonly defaultValue?: string }) => (
  <Surface>
    <Stack direction="row">
      <Switch testId="before" label="Before" />
    </Stack>
    <RadioGroup
      testId="radios"
      label="Pick"
      defaultValue={props?.defaultValue ?? "a"}
      options={[
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ]}
    />
    <CheckboxGroup
      testId="checks"
      label="Many"
      defaultValue={["x"]}
      options={[
        { value: "x", label: "Xray" },
        { value: "y", label: "Yankee" },
      ]}
    />
  </Surface>
);

it("unchecks a checked checkbox group option when its own box is pressed", async () => {
  const runtime = await openWindow();
  let changes = 0;
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="checks"
        label="Many"
        defaultValue={["x"]}
        onValueChange={() => {
          changes += 1;
        }}
        options={[
          { value: "x", label: "Xray" },
          { value: "y", label: "Yankee" },
        ]}
      />
    </Surface>,
  );
  expect(announced(runtime, "Xray")).toBe("checked");
  runtime.clickElement(boxOf(runtime, "Xray"));
  runtime.flush();
  expect(changes).toBe(1);
  expect(announced(runtime, "Xray")).toBe("unchecked");
});

it("paints a stored selection it cannot read as no selection, not a crash", async () => {
  const runtime = await openWindow();
  // @ts-expect-error — a selection a store wrote in an older shape.
  const stored: ReadonlyArray<string> = { x: true };
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="checks"
        label="Many"
        value={stored}
        options={[
          { value: "x", label: "Xray" },
          { value: "y", label: "Yankee" },
        ]}
      />
    </Surface>,
  );
  expect(announced(runtime, "Xray")).toBe("unchecked");
  runtime.clickElement(rowOf(runtime, "Xray"));
  runtime.flush();

  expect(announced(runtime, "Xray")).toBe("checked");
});

it("declares the keyboard ring on the option that holds native focus", async () => {
  const runtime = await openWindow();
  runtime.render(groups());

  focusOn(runtime, "Alpha");
  const alpha = rowOf(runtime, "Alpha");
  expect(ringed(alpha)).toBe(true);
  expect(ringed(boxOf(runtime, "Alpha"))).toBe(false);

  runtime.focusNext();
  runtime.flush();
  const xray = rowOf(runtime, "Xray");
  expect(
    Option.getOrElse(
      Option.map(runtime.focusedElement(), (element) =>
        String(element.customProps?.["aria-label"] ?? element.type),
      ),
      () => "nothing",
    ),
  ).toBe("Xray");
  expect(ringed(xray)).toBe(true);
  expect(ringed(boxOf(runtime, "Xray"))).toBe(false);
});

it("paints a failed radio group's empty edge and keeps the chosen fill", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="radios"
        label="Pick"
        invalid
        defaultValue="a"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>,
  );

  const chosen = boxOf(runtime, "Alpha");
  const empty = boxOf(runtime, "Beta");
  expect(chosen.style["backgroundColor"]).toBe(testTheme.colors.primary);
  expect(empty.style["borderColor"]).toBe(testTheme.colors.destructive);
  expect(empty.style["backgroundColor"]).toBeUndefined();
  expect(ringed(rowOf(runtime, "Alpha"))).toBe(true);
  expect(ringed(rowOf(runtime, "Beta"))).toBe(true);
});

it("publishes a row's trimmed name, and no name at all for a blank label", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        label="Many"
        options={[
          { value: "icon", label: "   " },
          { value: "y", label: "  Yankee  " },
        ]}
      />
    </Surface>,
  );
  const names = Arr.map(
    Arr.filter(
      a11yNodes(runtime.a11y()),
      (node) => node.aria?.role === "CheckBox",
    ),
    (node) => node.aria?.label,
  );

  expect(names).toEqual([undefined, "Yankee"]);
});

it("announces an option's caption as the row's help", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <RadioGroup
          label="Pick"
          defaultValue="weekly"
          options={[
            { value: "weekly", label: "Weekly", description: "Every Monday." },
            { value: "monthly", label: "Monthly", description: "   " },
          ]}
        />
        <CheckboxGroup
          label="Channels"
          defaultValue={["push"]}
          options={[
            { value: "push", label: "Push", description: "Desktop app" },
            { value: "sms", label: "SMS" },
          ]}
        />
      </Stack>
    </Surface>,
  );
  const help = (label: string) =>
    Option.getOrUndefined(a11yDescriptionOf(runtime.a11y(), { label }));

  expect(help("Weekly")).toBe("Every Monday.");
  expect(help("Monthly")).toBeUndefined();
  expect(help("Push")).toBe("Desktop app");
  expect(help("SMS")).toBeUndefined();
});

it("paints every group option at the pressable floor", async () => {
  const runtime = await openWindow();
  runtime.render(groups());
  Arr.forEach(["Alpha", "Beta", "Xray", "Yankee"], (label) => {
    expect(boundsOf(runtime, label).height).toBeGreaterThanOrEqual(
      targetSize.minimum,
    );
  });
});

it("addresses a data-option row by the locator its value derives", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch testId="before" label="Before" />
      </Stack>
      <RadioGroup
        testId="plan"
        label="Pick"
        defaultValue="a"
        itemTestId={(value) => `plan-${value}`}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
      <CheckboxGroup
        testId="channels"
        label="Channels"
        defaultValue={["push"]}
        itemTestId={(value) => `channel-${value}`}
        options={[
          { value: "push", label: "Push" },
          { value: "sms", label: "SMS" },
        ]}
      />
      <ToggleGroup
        testId="format"
        label="Format"
        itemTestId={(value) => `format-${value}`}
        options={[
          { value: "bold", label: "Bold" },
          { value: "italic", label: "Italic" },
        ]}
      />
    </Surface>,
  );
  const row = (locator: string) =>
    Option.getOrElse(runtime.element(locator), () =>
      expect.fail(`the runtime retained no row at ${locator}`),
    );

  expect(Option.isSome(runtime.element("plan"))).toBe(true);
  expect(row("plan-b").customProps?.["aria-label"]).toBe("Beta");
  expect(row("channel-sms").customProps?.["aria-label"]).toBe("SMS");
  expect(row("format-italic").customProps?.["aria-label"]).toBe("Italic");

  runtime.clickElement(row("channel-sms"));
  runtime.flush();
  expect(announced(runtime, "SMS")).toBe("checked");
  runtime.clickElement(row("format-italic"));
  runtime.flush();
  expect(announced(runtime, "Italic")).toBe("pressed");

  focusOn(runtime, "Alpha");
  runtime.keyDown("plan-a", "down");
  runtime.flush();
  expect(Option.getOrUndefined(runtime.focused())).toBe("plan-b");
  expect(announced(runtime, "Beta")).toBe("checked");
});

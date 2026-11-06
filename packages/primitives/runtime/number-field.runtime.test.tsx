import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubHandle,
} from "../src/components/NumberField.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNode, type Bounds, type Runtime } from "./harness.js";
import { Surface, openWindow } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const recorder = (): {
  readonly values: ReadonlyArray<number>;
  readonly onChange: (value: number) => void;
} => {
  const values: number[] = [];
  return {
    get values() {
      return values;
    },
    onChange: (value) => {
      values.push(value);
    },
  };
};

const lastValue = (values: ReadonlyArray<number>): number =>
  Option.getOrElse(Arr.last(values), () =>
    expect.fail("the field reported no change at all"),
  );

const grouped = (value: number): string => value.toLocaleString("en-US");
const readGrouped = (text: string): Option.Option<number> => {
  const digits = text.replaceAll(",", "").trim();
  return /^[+-]?\d+(?:\.\d+)?$/.test(digits)
    ? Option.some(Number(digits))
    : Option.none();
};

const inputOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(
    Option.flatMap(runtime.element(testId), (element) =>
      Option.flatMap(Option.fromNullishOr(element.children[0]), (frameId) =>
        Option.flatMap(
          Option.fromNullishOr(runtime.renderer.getElement(frameId)),
          (frame) =>
            Option.flatMap(Option.fromNullishOr(frame.children[0]), (id) =>
              Option.fromNullishOr(runtime.renderer.getElement(id)),
            ),
        ),
      ),
    ),
    () => expect.fail(`the NumberField ${testId} painted no input`),
  );

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

const textOf = (runtime: Runtime, label: string): string => {
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "TextInput", label }),
    () => expect.fail(`the field ${label} announced nothing`),
  );

  return Option.getOrElse(Option.fromNullishOr(node.aria?.value), () => "");
};

const Owner = () => {
  const [value, setValue] = useState<number | undefined>(undefined);
  return (
    <Stack direction="column">
      <Button testId="push" onActivate={() => setValue(42)}>
        Push
      </Button>
      <NumberField
        testId="nf"
        label="Quantity"
        value={value}
        onChange={setValue}
      />
    </Stack>
  );
};

it("edits through the runtime's text pipeline and reports the number", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      autoFocus
      onChange={field.onChange}
    />,
  );
  runtime.type("1 2");
  expect(lastValue(field.values)).toBe(12);
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "TextInput", label: "Quantity" }),
    ),
  ).toBe(true);
});

it("keeps a trailing dot as a draft instead of rewriting it mid-edit", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      autoFocus
      precision={2}
      onChange={field.onChange}
    />,
  );
  runtime.type("1 .");
  runtime.type("5");
  expect(lastValue(field.values)).toBe(1.5);

  expect(inputOf(runtime, "nf").type).toBe("input");
});

it("paints the number it holds, including the decimals its step needs", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Score"
      autoFocus
      defaultValue={1.5}
      step={0.5}
      max={2.5}
      onChange={field.onChange}
    />,
  );

  expect(textOf(runtime, "Score")).toBe("1.5");
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(2);
  expect(textOf(runtime, "Score")).toBe("2");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(2.5);
  expect(textOf(runtime, "Score")).toBe("2.5");
});

it("paints the number it holds when a stored precision is absent", async () => {
  const field = recorder();

  const stored = { precision: null } as unknown as { precision?: number };
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Score"
      autoFocus
      defaultValue={1.5}
      step={0.5}
      max={2.5}
      onChange={field.onChange}
      {...stored}
    />,
  );
  expect(textOf(runtime, "Score")).toBe("1.5");
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(2);
  expect(textOf(runtime, "Score")).toBe("2");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(2.5);
  expect(textOf(runtime, "Score")).toBe("2.5");
});

it("hears no Home or End in a window, because the text host owns them", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      autoFocus
      defaultValue={5}
      min={0}
      max={100}
      onChange={field.onChange}
    />,
  );
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "end");
  runtime.renderer.nativeSimulateKeyDown(input.id, "home");
  expect(field.values).toStrictEqual([]);
  runtime.renderer.nativeSimulateKeyDown(input.id, "pagedown");
  expect(lastValue(field.values)).toBe(0);
  expect(textOf(runtime, "Quantity")).toBe("0");
});

it("clamps a typed value to the field's maximum", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Percent"
      autoFocus
      max={100}
      onChange={field.onChange}
    />,
  );
  runtime.type("9 9 9");
  expect(lastValue(field.values)).toBe(100);
});

it("steps with the arrow keys, and pages ten at a time", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      autoFocus
      defaultValue={50}
      onChange={field.onChange}
    />,
  );
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(51);
  runtime.renderer.nativeSimulateKeyDown(input.id, "pagedown");
  expect(lastValue(field.values)).toBe(41);
});

it("steps from a hit-tested click on the spin column and refocuses the input", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      defaultValue={50}
      onChange={field.onChange}
    />,
  );
  const box = boundsOf(runtime, "nf");
  runtime.clickAt(box.x + box.width - 8, box.y + box.height * 0.25);
  expect(lastValue(field.values)).toBe(51);
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("the stepper did not return focus to the input"),
  );
  expect(focused.type).toBe("input");
});

it("scrubs the value by dragging vertically on the spin column", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      defaultValue={50}
      onChange={field.onChange}
    />,
  );
  const box = boundsOf(runtime, "nf");
  const x = box.x + box.width - 8;
  const y = box.y + box.height * 0.25;
  runtime.mouseDownAt(x, y);
  runtime.mouseMoveAt(x, y - 20, 0);
  runtime.mouseMoveAt(x, y - 40, 0);
  runtime.mouseUpAt(x, y - 40);
  expect(lastValue(field.values)).toBe(60);
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("the scrub did not return focus to the input"),
  );
  expect(focused.id).toBe(inputOf(runtime, "nf").id);

  runtime.mouseDownAt(x, y);
  runtime.mouseUpAt(x, y);
  expect(lastValue(field.values)).toBe(61);
});

it("declares the keyboard ring on the input, the element that holds focus", async () => {
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="before">Before</Button>
      <NumberField testId="nf" label="Quantity" />
    </Stack>,
  );
  const input = inputOf(runtime, "nf");
  runtime.click("before");
  runtime.focusNext();
  runtime.flush();
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("Tab moved the focus nowhere"),
  );
  expect(focused.id).toBe(input.id);
  expect(focused.style["focusVisible"]).toBeDefined();
  expect(focused.style["boxShadow"]).toBeUndefined();
  const chrome = Option.getOrElse(runtime.element("nf"), () =>
    expect.fail("the runtime retained no field"),
  );
  expect(chrome.style["focusVisible"]).toBeUndefined();
});

it("keeps its value out of the keyboard dim, so a Tab elsewhere leaves it readable", async () => {
  const runtime = await mount(<NumberField testId="nf" label="Quantity" />);
  const input = inputOf(runtime, "nf");
  expect(input.style["keyboardFocusDim"]).toBe(false);
  const chrome = Option.getOrElse(runtime.element("nf"), () =>
    expect.fail("the runtime retained no field"),
  );
  expect(chrome.style["keyboardFocusDim"]).toBeUndefined();
});

it("refuses edits, keys and steps while disabled", async () => {
  const field = recorder();
  const runtime = await mount(
    <Stack direction="row">
      <NumberField
        testId="nf"
        label="Quantity"
        disabled
        defaultValue={50}
        onChange={field.onChange}
      />
    </Stack>,
  );
  const box = boundsOf(runtime, "nf");
  runtime.clickAt(box.x + box.width / 2, box.y + box.height / 2);
  runtime.type("1 2");
  runtime.clickAt(box.x + box.width - 8, box.y + box.height * 0.25);
  expect(field.values).toStrictEqual([]);
});

it("paints a caller's composition from the field's own state", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      defaultValue={5}
      onChange={field.onChange}
    >
      <NumberFieldInput testId="nf-input" />
      <NumberFieldIncrement testId="nf-up" />
      <NumberFieldDecrement testId="nf-down" />
    </NumberField>,
  );
  runtime.click("nf-up");
  expect(lastValue(field.values)).toBe(6);
  runtime.click("nf-down");
  expect(lastValue(field.values)).toBe(5);
});

it("leaves the caret keys to the host's text field", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      autoFocus
      defaultValue={50}
      onChange={field.onChange}
    />,
  );
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "left");
  runtime.renderer.nativeSimulateKeyUp(input.id, "left");
  runtime.renderer.nativeSimulateKeyDown(input.id, "right");
  runtime.renderer.nativeSimulateKeyUp(input.id, "right");
  expect(field.values).toStrictEqual([]);
  expect(textOf(runtime, "Quantity")).toBe("50");

  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(51);
});

it("leaves a field that never had a value empty when its edit ends", async () => {
  const field = recorder();
  const runtime = await mount(
    <Stack direction="column">
      <NumberField
        testId="nf"
        label="Quantity"
        autoFocus
        onChange={field.onChange}
      />
      <Button testId="after">After</Button>
    </Stack>,
  );
  expect(textOf(runtime, "Quantity")).toBe("");
  runtime.focusNext();
  expect(textOf(runtime, "Quantity")).toBe("");
  expect(field.values).toEqual([]);

  runtime.focus("nf");
  runtime.type("a b c");
  runtime.focusNext();
  expect(textOf(runtime, "Quantity")).toBe("");
  expect(field.values).toEqual([]);
});

it("commits the draft on Enter and reports it through onSubmit", async () => {
  const submitted = vi.fn();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      autoFocus
      precision={2}
      onSubmit={submitted}
    />,
  );
  runtime.type("1 . 5");
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.flush();
  expect(textOf(runtime, "Amount")).toBe("1.50");
  expect(submitted).toHaveBeenCalledTimes(1);
});

it("reads back the display format its caller's formatValue painted", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      autoFocus
      defaultValue={1234}
      formatValue={grouped}
      parseValue={readGrouped}
      onChange={field.onChange}
    />,
  );
  expect(textOf(runtime, "Amount")).toBe("1,234");
  runtime.type("5");
  expect(lastValue(field.values)).toBe(12345);
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.flush();
  expect(textOf(runtime, "Amount")).toBe("12,345");
});

it("keeps a grouped draft the controlled owner echoes", async () => {
  const Owner = () => {
    const [value, setValue] = useState(1234);
    return (
      <NumberField
        testId="nf"
        label="Amount"
        autoFocus
        value={value}
        formatValue={grouped}
        parseValue={readGrouped}
        onChange={setValue}
      />
    );
  };
  const runtime = await mount(<Owner />);
  expect(textOf(runtime, "Amount")).toBe("1,234");
  runtime.type("5");

  expect(textOf(runtime, "Amount")).toBe("1,2345");
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.flush();
  expect(textOf(runtime, "Amount")).toBe("12,345");
});

it("paints the value it holds when its caller's format says nothing", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      autoFocus
      defaultValue={5}
      formatValue={() => ""}
      onChange={field.onChange}
    />,
  );
  expect(textOf(runtime, "Amount")).toBe("5");

  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(6);
  expect(textOf(runtime, "Amount")).toBe("6");
});

it("shows the value its owner pushes", async () => {
  const runtime = await mount(<Owner />);
  expect(textOf(runtime, "Quantity")).toBe("");
  runtime.click("push");
  runtime.flush();
  expect(textOf(runtime, "Quantity")).toBe("42");
});

it("shows a value that arrives after the field was mounted", async () => {
  const runtime = await mount(
    <NumberField testId="nf" label="Quantity" defaultValue={50} />,
  );
  runtime.render(
    <Surface>
      <NumberField testId="nf" label="Quantity" value={5} />
    </Surface>,
  );
  runtime.flush();
  expect(textOf(runtime, "Quantity")).toBe("5");
});

it("mounts a value it cannot paint, and steps from the bound it paints", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      autoFocus
      min={0}
      max={10}
      value={Number.NaN}
      onChange={field.onChange}
    />,
  );
  expect(textOf(runtime, "Quantity")).toBe("0");
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(1);
});

it("commits a scrub once, with the value the whole drag ended on", async () => {
  const changes: Array<number> = [];
  const commits: Array<number> = [];
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      defaultValue={50}
      onValueChange={(value) => changes.push(value)}
      onValueCommit={(value) => commits.push(value)}
    />,
  );
  const box = boundsOf(runtime, "nf");
  const x = box.x + box.width - 8;
  const y = box.y + box.height * 0.25;

  runtime.mouseDownAt(x, y);
  runtime.mouseMoveAt(x, y - 20, 0);
  runtime.mouseMoveAt(x, y - 40, 0);
  runtime.flush();
  expect(changes.length).toBeGreaterThan(1);
  expect(commits).toStrictEqual([]);

  runtime.mouseUpAt(x, y - 40);
  runtime.flush();
  expect(commits).toStrictEqual([60]);

  expect(changes.at(-1)).toBe(60);
});

it("commits each step that moved the value, and no step that could not", async () => {
  const commits: Array<number> = [];
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      defaultValue={50}
      min={0}
      max={52}
      onValueCommit={(value) => commits.push(value)}
    />,
  );
  const box = boundsOf(runtime, "nf");
  runtime.clickAt(box.x + box.width - 8, box.y + box.height * 0.25);
  expect(commits).toStrictEqual([51]);

  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(commits).toStrictEqual([51, 52]);

  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(commits).toStrictEqual([51, 52]);
});

it("commits a typed edit on Enter, and not again when the field blurs", async () => {
  const commits: Array<number> = [];
  const runtime = await mount(
    <Stack direction="column">
      <NumberField
        testId="nf"
        label="Amount"
        autoFocus
        onValueCommit={(value) => commits.push(value)}
      />
      <Button testId="after">After</Button>
    </Stack>,
  );
  runtime.type("7");
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.flush();
  expect(commits).toStrictEqual([7]);

  runtime.focusNext();
  expect(commits).toStrictEqual([7]);
});

it("commits a blur only when the edit produced a number", async () => {
  const commits: Array<number> = [];
  const runtime = await mount(
    <Stack direction="column">
      <NumberField
        testId="nf"
        label="Amount"
        autoFocus
        onValueCommit={(value) => commits.push(value)}
      />
      <Button testId="after">After</Button>
    </Stack>,
  );
  runtime.focusNext();
  expect(commits).toStrictEqual([]);

  const input = inputOf(runtime, "nf");
  const focusInput = (): void => {
    runtime.renderer.focusElement(input.id);
    runtime.renderer.dispatchNativeEvents();
    runtime.renderer.flush();
  };
  focusInput();
  runtime.type("4 2");
  runtime.focusNext();
  expect(commits).toStrictEqual([42]);

  focusInput();
  runtime.type("a b c");
  runtime.focusNext();
  expect(commits).toStrictEqual([42]);
});

describe("NumberFieldScrubHandle", () => {
  const Row = ({
    initial,
    min,
    max,
    commits,
    changes,
    disabled,
  }: {
    readonly initial: number;
    readonly min?: number;
    readonly max?: number;
    readonly commits?: Array<number>;
    readonly changes?: Array<number>;
    readonly disabled?: boolean;
  }) => {
    const [value, setValue] = useState(initial);
    return (
      <Stack direction="row" gap="sm">
        <NumberFieldScrubHandle
          testId="scrub"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onValueChange={(next) => {
            changes?.push(next);
            setValue(next);
          }}
          onValueCommit={(next) => commits?.push(next)}
        >
          Width
        </NumberFieldScrubHandle>
        <NumberField
          testId="nf"
          label="Width"
          value={value}
          min={min}
          max={max}
          onValueChange={(next) => {
            changes?.push(next);
            setValue(next);
          }}
          disabled={disabled}
        />
      </Stack>
    );
  };

  const mountRow = async (row: ReactNode): Promise<Runtime> => {
    const runtime = await openWindow();
    runtime.render(<Surface>{row}</Surface>);
    return runtime;
  };

  const dragHandle = (runtime: Runtime, dx: number, shift = false): void => {
    const box = boundsOf(runtime, "scrub");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    runtime.renderer.nativeSimulateMouseDown(x, y);
    runtime.renderer.nativeSimulateMouseMove(
      x + dx,
      y,
      0,
      shift ? "shift" : undefined,
    );
    runtime.renderer.nativeSimulateMouseUp(x + dx, y);
    runtime.flush();
  };

  it("moves the value on a horizontal drag and commits once on release", async () => {
    const changes: Array<number> = [];
    const commits: Array<number> = [];
    const runtime = await mountRow(
      <Row
        initial={50}
        min={0}
        max={100}
        changes={changes}
        commits={commits}
      />,
    );

    dragHandle(runtime, 8);
    expect(changes).toStrictEqual([52]);
    expect(commits).toStrictEqual([52]);
    expect(textOf(runtime, "Width")).toBe("52");
  });

  it("leaves a click to the text entry it always was", async () => {
    const changes: Array<number> = [];
    const runtime = await mountRow(<Row initial={50} changes={changes} />);

    dragHandle(runtime, 0);
    expect(changes).toStrictEqual([]);
    const input = inputOf(runtime, "nf");
    runtime.renderer.focusElement(input.id);
    runtime.renderer.dispatchNativeEvents();
    runtime.flush();
    runtime.type("1");
    expect(changes.length).toBeGreaterThan(0);
  });

  it("clamps a drag to the field's bounds", async () => {
    const changes: Array<number> = [];
    const runtime = await mountRow(
      <Row initial={9} min={0} max={10} changes={changes} />,
    );

    dragHandle(runtime, 40);
    expect(Arr.last(changes)).toStrictEqual(Option.some(10));
  });

  it("multiplies the travel by ten while Shift is held", async () => {
    const changes: Array<number> = [];
    const runtime = await mountRow(
      <Row initial={50} min={0} max={1000} changes={changes} />,
    );

    dragHandle(runtime, 8, true);
    expect(Arr.last(changes)).toStrictEqual(Option.some(70));
  });

  it("takes no gesture while disabled", async () => {
    const changes: Array<number> = [];
    const runtime = await mountRow(
      <Row initial={50} changes={changes} disabled />,
    );

    dragHandle(runtime, 8);
    expect(changes).toStrictEqual([]);
  });
});

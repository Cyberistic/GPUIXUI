/**
 * The interactive controls in the real GPUix runtime.
 *
 * This is the suite that pays for the library owning its keyboard contract.
 * `@gpuix/react` publishes no button (plan 020 §1.5), so Enter-on-key-down and
 * Space-on-key-up are `core/keyboard.ts`'s rules — and until this suite existed
 * they had only ever been proven against a decode of the React element tree
 * (`src/components/Button.test.tsx`). Here the keys go through GPUI's own
 * dispatcher and the observation is the platform's.
 *
 * Each test names the bug it guards. A test that flips with a wrong rule (Enter
 * on key up, Space on key down, a held key activating, a disabled control
 * activating) is the bar plan 040 §2 sets.
 */

import { expect, it } from "vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { ButtonGroup } from "../src/components/ButtonGroup.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import {
  a11yNodes,
  a11yValueOf,
  createRuntime,
  type Bounds,
} from "./harness.js";
import { Surface, WINDOW, testTheme } from "./fixture.js";

const runtime = await Effect.runPromise(createRuntime(WINDOW));

const boundsOf = (testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** A control's announced state — `aria-valuetext` is the only state this runtime carries. */
const announced = (label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

const byLabel = (label: string) =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.customProps?.["aria-label"] === label,
    ),
    () => expect.fail(`the runtime retained no element labelled ${label}`),
  );

/** A counter, so an activation claim is about the number of calls. */
const counter = (): {
  readonly calls: number;
  readonly onActivate: () => void;
} => {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    onActivate: () => {
      state.calls += 1;
    },
  };
};

const renderButton = (
  props: Partial<Parameters<typeof Button>[0]> = {},
): ReturnType<typeof counter> => {
  const count = counter();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="b" onActivate={count.onActivate} {...props}>
          Save
        </Button>
      </Stack>
    </Surface>,
  );
  return count;
};

it("activates a Button on a real click", () => {
  const count = renderButton();
  runtime.click("b");
  expect(count.calls).toBe(1);
});

it("activates a Button on Enter down, and not again on the key up", () => {
  const count = renderButton();
  runtime.keyDown("b", "enter");
  runtime.keyUp("b", "enter");
  expect(count.calls).toBe(1);
});

it("activates a Button on Space up, and not on the key down before it", () => {
  const count = renderButton();
  runtime.keyDown("b", "space");
  expect(count.calls).toBe(0);
  runtime.keyUp("b", "space");
  expect(count.calls).toBe(1);
});

it("ignores a held key", () => {
  const count = renderButton();
  runtime.keyDown("b", "enter", true);
  expect(count.calls).toBe(0);
});

it("refuses to activate a disabled Button by click or by Enter", () => {
  const count = renderButton({ disabled: true });
  runtime.click("b");
  runtime.keyDown("b", "enter");
  expect(count.calls).toBe(0);
});

/**
 * Every non-empty accessibility description in the last painted frame.
 *
 * `Arr.filterMap` is not the Option-filtering helper in Effect v4 (it takes a
 * `Result`), so this is the map-then-`getSomes` pair.
 */
const descriptions = (): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(a11yNodes(runtime.a11y()), (node) =>
      Option.fromNullishOr(node.aria?.description),
    ),
  );

it("refuses to activate a loading Button, and still announces itself busy", () => {
  const count = renderButton({ loading: true, label: "Save" });
  runtime.click("b");
  runtime.keyDown("b", "enter");
  expect(count.calls).toBe(0);
  expect(descriptions()).toContain("Loading");
});

it("keeps a ButtonGroup attached with no gap and separated by the theme's gap", () => {
  const group = (mode: "attached" | "separated") => {
    runtime.render(
      <Surface>
        <ButtonGroup mode={mode} gap="sm" testId="g">
          <Button testId="one">One</Button>
          <Button testId="two">Two</Button>
        </ButtonGroup>
      </Surface>,
    );
    const one = boundsOf("one");
    const two = boundsOf("two");
    return two.x - (one.x + one.width);
  };
  expect(group("attached")).toBe(0);
  expect(group("separated")).toBe(testTheme.spacing.sm);
});

it("toggles a Checkbox on a click, and announces the state", () => {
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="cb" label="Enable" />
      </Stack>
    </Surface>,
  );
  expect(announced("Enable")).toBe("unchecked");
  runtime.click("cb");
  expect(announced("Enable")).toBe("checked");
  runtime.click("cb");
  expect(announced("Enable")).toBe("unchecked");
});

it("toggles a Checkbox on Space, and not on the key down alone", () => {
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="cb" label="Enable" />
      </Stack>
    </Surface>,
  );
  runtime.keyDown("cb", "space");
  expect(announced("Enable")).toBe("unchecked");
  runtime.keyUp("cb", "space");
  expect(announced("Enable")).toBe("checked");
});

it("announces an indeterminate Checkbox as mixed", () => {
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="cb" label="Enable" indeterminate />
      </Stack>
    </Surface>,
  );
  expect(announced("Enable")).toBe("mixed");
});

it("toggles a Switch on a click and reports the role the runtime maps it to", () => {
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch testId="sw" label="Dark mode" />
      </Stack>
    </Surface>,
  );
  expect(announced("Dark mode")).toBe("unchecked");
  runtime.click("sw");
  expect(announced("Dark mode")).toBe("checked");
  expect(
    Option.isSome(a11yValueOf(runtime.a11y(), { role: "Switch" })),
    "the switch is not exposed with the Switch role",
  ).toBe(true);
});

it("moves a RadioGroup's selection with the arrow keys", () => {
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        defaultValue="a"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>,
  );
  expect(announced("Alpha")).toBe("checked");
  expect(announced("Beta")).toBe("unchecked");
  runtime.keyDown("rg", "down");
  expect(announced("Alpha")).toBe("unchecked");
  expect(announced("Beta")).toBe("checked");
});

it("wraps a RadioGroup's arrow navigation at the end", () => {
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        defaultValue="b"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>,
  );
  expect(announced("Beta")).toBe("checked");
  runtime.keyDown("rg", "down");
  expect(announced("Alpha")).toBe("checked");
});

it("moves a RadioGroup's single tab stop with its selection", () => {
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch testId="before" label="Before" />
      </Stack>
      <RadioGroup
        testId="rg"
        label="Pick"
        defaultValue="a"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
          { value: "c", label: "Gamma" },
        ]}
      />
    </Surface>,
  );
  /** Tab forward from the control above the group. */
  const tabFromBefore = (): string => {
    runtime.click("before");
    runtime.focusNext();
    return Option.getOrElse(
      Option.map(runtime.focusedElement(), (element) =>
        String(element.customProps?.["aria-label"] ?? element.type),
      ),
      () => "nothing",
    );
  };
  expect(tabFromBefore()).toBe("Alpha");
  runtime.keyDown("rg", "down");
  expect(announced("Beta")).toBe("checked");
  expect(tabFromBefore()).toBe("Beta");
});

it("selects a RadioGroup option when its own circle is clicked", () => {
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        defaultValue="a"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>,
  );
  const beta = byLabel("Beta");
  const circle = Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(beta.children[0]), (id) =>
      Option.fromNullishOr(runtime.renderer.getElement(id)),
    ),
    () => expect.fail("the Beta radio has no circle"),
  );
  runtime.clickElement(circle);
  expect(announced("Beta")).toBe("checked");
  expect(announced("Alpha")).toBe("unchecked");
});

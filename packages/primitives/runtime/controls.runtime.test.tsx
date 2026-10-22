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
 * Each test names the bug it guards: Enter firing on key up, Space on key down,
 * a held key activating, a disabled control activating, the roving tab stop
 * staying behind the selection, and a caller's host handler being dropped
 * instead of composed with the control's own.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import { alpha, filledHover, filledPressed } from "@gpuixui/tokens";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { ButtonGroup } from "../src/components/ButtonGroup.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { Icon } from "@gpuixui/icons";
import { RadioGroup, RadioGroupItem } from "../src/components/RadioGroup.js";
import { Text } from "../src/components/Text.js";
import { Stack } from "../src/components/Stack.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { Switch } from "../src/components/Switch.js";
import {
  a11yNode,
  a11yNodes,
  a11yValueOf,
  type Bounds,
  type Runtime,
} from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** A control's announced state — `aria-valuetext` is the only state this runtime carries. */
const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

const byLabel = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.customProps?.["aria-label"] === label,
    ),
    () => expect.fail(`the runtime retained no element labelled ${label}`),
  );

/**
 * Every non-empty accessibility description in the last painted frame.
 *
 * `Arr.filterMap` is not the Option-filtering helper in Effect v4 (it takes a
 * `Result`), so this is the map-then-`getSomes` pair.
 */
const descriptions = (runtime: Runtime): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(a11yNodes(runtime.a11y()), (node) =>
      Option.fromNullishOr(node.aria?.description),
    ),
  );

/** A counter, so an activation claim is about the number of calls. */
const renderButton = async (
  props: Partial<Parameters<typeof Button>[0]> = {},
): Promise<{ readonly runtime: Runtime; readonly calls: () => number }> => {
  const runtime = await openWindow();
  let calls = 0;
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button
          testId="b"
          onActivate={() => {
            calls += 1;
          }}
          {...props}
        >
          Save
        </Button>
      </Stack>
    </Surface>,
  );
  return { runtime, calls: () => calls };
};

it("activates a Button on a real click", async () => {
  const { runtime, calls } = await renderButton();
  runtime.click("b");
  expect(calls()).toBe(1);
});

it("paints an outlined Button's edge in the measured boundary role", async () => {
  // The bug: the outline variant painted `border`, the decorative role a
  // divider uses, so a control's shape sat at 1.16:1 on the light page. The
  // runtime's own style report is the proof that the painted colour is the
  // role, not a class name in a string.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="b" variant="outline">
        Cancel
      </Button>
    </Surface>,
  );
  const edge = Option.getOrElse(
    Option.flatMap(runtime.element("b"), (element) =>
      Option.fromNullishOr(element.style.borderColor),
    ),
    () => expect.fail("the runtime retained no outlined button"),
  );
  expect(edge).toBe(testTheme.colors.borderStrong);
  expect(edge).not.toBe(testTheme.colors.border);
});

/**
 * The fill the runtime reports for an element's `hover` or `active` bucket.
 *
 * The runtime's style report carries the whole style record for the bucket, so
 * the fill is read out of it rather than assumed.
 */
const bucketFill = (
  style: Record<string, unknown>,
  bucket: "hover" | "active",
): string =>
  Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(style[bucket]), (value) =>
      Option.flatMap(
        Schema.decodeUnknownOption(
          Schema.Record(Schema.String, Schema.Unknown),
        )(value),
        (record) =>
          Option.flatMap(R.get(record, "backgroundColor"), (colour) =>
            Schema.decodeUnknownOption(Schema.String)(colour),
          ),
      ),
    ),
    () => expect.fail(`the runtime reported no ${bucket} fill`),
  );

it("paints a filled Button's hover as the theme's opaque derived fill", async () => {
  // The bug: the hover lifted the fill's alpha, so the surface behind the
  // control showed through — the same action read as two colours on a card and
  // on a dialog — and a translucent fill cannot be measured for label contrast
  // at all. The runtime's own style report is the proof that the derived fill
  // reaches the paint, not a class name in a string.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="b">Save</Button>
    </Surface>,
  );
  const style = Option.getOrElse(
    Option.flatMap(runtime.element("b"), (element) =>
      Option.fromNullishOr(runtime.renderer.getElement(element.id)?.style),
    ),
    () => expect.fail("the runtime retained no button"),
  );
  expect(bucketFill(style, "hover")).toBe(filledHover(testTheme, "primary"));
  expect(bucketFill(style, "active")).toBe(filledPressed(testTheme, "primary"));
  // The old recipe lifted the fill's alpha; the derived fill does not.
  expect(bucketFill(style, "hover")).not.toBe(
    alpha(testTheme.colors.primary, 0.9),
  );
});

it("paints a disabled filled Button with the measured pair, not a fade", async () => {
  // The bug: a disabled filled action faded itself to 50%, which composites the
  // label into the surface behind the control — under the disabled floor on the
  // card of four light styles. The neutral pair is opaque, so the runtime's own
  // style report shows the fill and the label it paints on the card.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box tone="card" padding="md">
        <Stack direction="row">
          <Button testId="filled" disabled>
            Save
          </Button>
          <Button testId="ghost" variant="ghost" disabled>
            Cancel
          </Button>
        </Stack>
      </Box>
    </Surface>,
  );
  const styleOf = (testId: string): Record<string, unknown> =>
    Option.getOrElse(
      Option.flatMap(runtime.element(testId), (element) =>
        Option.fromNullishOr(runtime.renderer.getElement(element.id)?.style),
      ),
      () => expect.fail(`the runtime retained no ${testId}`),
    );
  expect(styleOf("filled").backgroundColor).toBe(testTheme.colors.disabled);
  expect(styleOf("filled").color).toBe(testTheme.colors.disabledForeground);
  expect(styleOf("filled").opacity).toBeUndefined();
  // An unfilled action has no fill to collapse into and keeps the fade.
  expect(styleOf("ghost").opacity).toBe(0.5);
});

it("keeps a filled Button's label while another control has keyboard focus", async () => {
  // The runtime dims every other focusable element to 40% while one control has
  // keyboard focus, which on a filled action composites the label into its own
  // fill (5.0–10.5:1 at rest, 1.3–3.2:1 dimmed, `keyboardDimFailures`). The
  // declaration has to reach the painted element, not just the React tree.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="filled">Save</Button>
        <Button testId="ghost" variant="ghost">
          Cancel
        </Button>
      </Stack>
    </Surface>,
  );
  const optOut = (testId: string) =>
    Option.flatMap(runtime.element(testId), (element) =>
      Option.fromNullishOr(element.style.keyboardFocusDim),
    );
  expect(optOut("filled")).toStrictEqual(Option.some(false));
  // No fill to collapse into, so the where-can-Tab-go cue stays.
  expect(Option.isNone(optOut("ghost"))).toBe(true);
});

it("activates a Button on Enter down, and not again on the key up", async () => {
  const { runtime, calls } = await renderButton();
  runtime.keyDown("b", "enter");
  runtime.keyUp("b", "enter");
  expect(calls()).toBe(1);
});

it("activates a Button on Space up, and not on the key down before it", async () => {
  const { runtime, calls } = await renderButton();
  runtime.keyDown("b", "space");
  expect(calls()).toBe(0);
  runtime.keyUp("b", "space");
  expect(calls()).toBe(1);
});

it("ignores a held key", async () => {
  const { runtime, calls } = await renderButton();
  runtime.keyDown("b", "enter", true);
  expect(calls()).toBe(0);
});

it("refuses to activate a disabled Button by click or by Enter", async () => {
  const { runtime, calls } = await renderButton({ disabled: true });
  runtime.click("b");
  expect(calls()).toBe(0);
  runtime.keyDown("b", "enter");
  expect(calls()).toBe(0);
});

it("drops a focused control's ring and keys when it becomes disabled", async () => {
  const runtime = await openWindow();
  let changes = 0;
  const View = ({ disabled }: { readonly disabled: boolean }) => (
    <Surface>
      <Checkbox
        label="Pick"
        disabled={disabled}
        onCheckedChange={() => {
          changes += 1;
        }}
        testId="cb"
      />
    </Surface>
  );
  /** Whether the element still declares the keyboard ring the runtime paints. */
  const declaresRing = (): boolean =>
    Option.match(runtime.element("cb"), {
      onNone: () => false,
      onSome: (element) => {
        const style = runtime.renderer.getElement(element.id)?.style;
        return style !== undefined && Object.hasOwn(style, "focusVisible");
      },
    });

  runtime.render(<View disabled={false} />);
  runtime.keyDown("cb", "space");
  runtime.keyUp("cb", "space");
  expect(changes).toBe(1);
  expect(declaresRing()).toBe(true);

  // Disabling the element that holds the focus does not move that focus, so the
  // bug was a ring left painted on a control that refuses every key.
  runtime.render(<View disabled={true} />);
  expect(runtime.focused()).toStrictEqual(Option.some("cb"));
  expect(declaresRing()).toBe(false);
  runtime.keyDown("cb", "space");
  runtime.keyUp("cb", "space");
  expect(changes).toBe(1);

  // Re-enabling restores both the declaration and the activation contract.
  runtime.render(<View disabled={false} />);
  expect(declaresRing()).toBe(true);
  runtime.keyDown("cb", "space");
  runtime.keyUp("cb", "space");
  expect(changes).toBe(2);
});

it("delivers a caller's handlers through the runtime, and still acts on the event", async () => {
  const runtime = await openWindow();
  const seen: string[] = [];
  const changes: boolean[] = [];
  runtime.render(
    <Surface>
      <Checkbox
        label="Pick"
        testId="cb"
        onCheckedChange={(next) => changes.push(next)}
        onFocus={() => seen.push("focus")}
        onBlur={() => seen.push("blur")}
        onClick={() => seen.push("click")}
        onKeyDown={() => seen.push("keydown")}
        onKeyUp={() => seen.push("keyup")}
      />
      <Button testId="after">After</Button>
    </Surface>,
  );

  // The bug: the control owned every host event and a consumer could not
  // observe one. Here GPUI's own focus, pointer and key dispatch reach both.
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("cb"));
  expect(seen).toStrictEqual(["focus"]);

  runtime.click("cb");
  expect(seen.at(-1)).toBe("click");
  expect(changes).toStrictEqual([true]);

  runtime.keyDown("cb", "space");
  runtime.keyUp("cb", "space");
  expect(seen.slice(-2)).toStrictEqual(["keydown", "keyup"]);
  expect(changes).toStrictEqual([true, false]);

  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("after"));
  expect(seen.at(-1)).toBe("blur");
});

it("does not deliver a press to a caller's handler while the control is disabled", async () => {
  const runtime = await openWindow();
  let clicks = 0;
  let changes = 0;
  runtime.render(
    <Surface>
      <Checkbox
        label="Pick"
        testId="cb"
        disabled
        onClick={() => {
          clicks += 1;
        }}
        onCheckedChange={() => {
          changes += 1;
        }}
      />
    </Surface>,
  );
  runtime.click("cb");
  expect(clicks).toBe(0);
  expect(changes).toBe(0);
});

it("refuses to activate a loading Button, and still announces itself busy", async () => {
  const { runtime, calls } = await renderButton({
    loading: true,
    label: "Save",
  });
  runtime.click("b");
  expect(calls()).toBe(0);
  runtime.keyDown("b", "enter");
  expect(calls()).toBe(0);
  expect(descriptions(runtime)).toContain("Loading");
  expect(
    Option.isSome(a11yNode(runtime.a11y(), { role: "Button", label: "Save" })),
  ).toBe(true);
});

it("names a Button by its text child", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="b">Save changes</Button>
    </Surface>,
  );
  // The bug: a role="button" div named only by its painted text was unnamed in
  // the accessibility tree.
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Button", label: "Save changes" }),
    ),
  ).toBe(true);
});

it("keeps a ButtonGroup attached with no gap and separated by the theme's gap", async () => {
  const gapOf = async (mode: "attached" | "separated"): Promise<number> => {
    const runtime = await openWindow();
    runtime.render(
      <Surface>
        <ButtonGroup mode={mode} gap="sm" testId="g">
          <Button testId="one">One</Button>
          <Button testId="two">Two</Button>
        </ButtonGroup>
      </Surface>,
    );
    const one = boundsOf(runtime, "one");
    const two = boundsOf(runtime, "two");
    return two.x - (one.x + one.width);
  };
  expect(await gapOf("attached")).toBe(0);
  expect(await gapOf("separated")).toBe(testTheme.spacing.sm);
});

it("names a ButtonGroup for assistive technology", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ButtonGroup label="Text alignment" testId="g">
        <Button>Left</Button>
        <Button>Right</Button>
      </ButtonGroup>
    </Surface>,
  );
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Group", label: "Text alignment" }),
    ),
  ).toBe(true);
});

it("jumps a RadioGroup to its enabled ends with Home and End", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        defaultValue="c"
        options={[
          { value: "a", label: "Alpha", disabled: true },
          { value: "b", label: "Beta" },
          { value: "c", label: "Gamma" },
          { value: "d", label: "Delta" },
          { value: "e", label: "Epsilon", disabled: true },
        ]}
      />
    </Surface>,
  );
  runtime.keyDown("rg", "home");
  expect(announced(runtime, "Beta")).toBe("checked");
  runtime.keyDown("rg", "end");
  expect(announced(runtime, "Delta")).toBe("checked");
});

it("toggles a Checkbox on a click, and announces the state", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="cb" label="Enable" />
      </Stack>
    </Surface>,
  );
  expect(announced(runtime, "Enable")).toBe("unchecked");
  // The runtime maps our `role="checkbox"` to AccessKit's CheckBox, so the
  // value text is not standing in for a role it lacks.
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "CheckBox", label: "Enable" }),
    ),
  ).toBe(true);
  runtime.click("cb");
  expect(announced(runtime, "Enable")).toBe("checked");
  runtime.click("cb");
  expect(announced(runtime, "Enable")).toBe("unchecked");
});

it("toggles a Checkbox on Space, and not on the key down alone", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="cb" label="Enable" />
      </Stack>
    </Surface>,
  );
  runtime.keyDown("cb", "space");
  expect(announced(runtime, "Enable")).toBe("unchecked");
  runtime.keyUp("cb", "space");
  expect(announced(runtime, "Enable")).toBe("checked");
});

it("announces an indeterminate Checkbox as mixed", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="cb" label="Enable" indeterminate />
      </Stack>
    </Surface>,
  );
  expect(announced(runtime, "Enable")).toBe("mixed");
});

it("toggles a Checkbox through a custom mark", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="cb" label="Enable" defaultChecked>
          <Icon name="star" color="#ffffff" size={12} />
        </Checkbox>
      </Stack>
    </Surface>,
  );
  expect(announced(runtime, "Enable")).toBe("checked");
  runtime.click("cb");
  expect(announced(runtime, "Enable")).toBe("unchecked");
});

it("toggles a CheckboxGroup option on a click without clearing the others", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="cgroup"
        label="Channels"
        defaultValue={["email"]}
        options={[
          { value: "email", label: "Email" },
          { value: "push", label: "Push" },
        ]}
      />
    </Surface>,
  );
  expect(announced(runtime, "Email")).toBe("checked");
  expect(announced(runtime, "Push")).toBe("unchecked");
  runtime.clickElement(byLabel(runtime, "Push"));
  expect(announced(runtime, "Email")).toBe("checked");
  expect(announced(runtime, "Push")).toBe("checked");
});

it("moves a CheckboxGroup's focus with an arrow without toggling the value", async () => {
  // The key goes through GPUI's dispatcher to the focused row, and the group's
  // handler runs from the ancestor: this is the check that proves a real key
  // path moves focus, not only the element-tree test that calls the wrapper.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch testId="before" label="Before" />
      </Stack>
      <CheckboxGroup
        testId="cgroup"
        label="Channels"
        options={[
          { value: "email", label: "Email" },
          { value: "push", label: "Push" },
        ]}
      />
    </Surface>,
  );
  runtime.click("before");
  runtime.focusNext();
  expect(focusedLabel(runtime)).toBe("Email");
  keyDownFocused(runtime, "down");
  expect(focusedLabel(runtime)).toBe("Push");
  expect(announced(runtime, "Email")).toBe("unchecked");
  expect(announced(runtime, "Push")).toBe("unchecked");
});

it("toggles a ToggleGroup option on a click and announces the pressed mode", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        testId="tgroup"
        label="Formatting"
        type="single"
        options={[
          { value: "bold", label: "Bold" },
          { value: "italic", label: "Italic" },
        ]}
      />
    </Surface>,
  );
  expect(announced(runtime, "Bold")).toBe("not pressed");
  runtime.clickElement(byLabel(runtime, "Bold"));
  expect(announced(runtime, "Bold")).toBe("pressed");
  runtime.clickElement(byLabel(runtime, "Italic"));
  expect(announced(runtime, "Bold")).toBe("not pressed");
  expect(announced(runtime, "Italic")).toBe("pressed");
});

it("moves a ToggleGroup's focus with an arrow without changing the mode", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch testId="before" label="Before" />
      </Stack>
      <ToggleGroup
        testId="tgroup"
        label="Formatting"
        options={[
          { value: "bold", label: "Bold" },
          { value: "italic", label: "Italic" },
        ]}
      />
    </Surface>,
  );
  runtime.click("before");
  runtime.focusNext();
  expect(focusedLabel(runtime)).toBe("Bold");
  keyDownFocused(runtime, "right");
  expect(focusedLabel(runtime)).toBe("Italic");
  expect(announced(runtime, "Bold")).toBe("not pressed");
  expect(announced(runtime, "Italic")).toBe("not pressed");
});

it("toggles a Switch through a custom glyph", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch testId="sw" label="Dark mode">
          <Icon name="sun" color="#000000" size={8} />
        </Switch>
      </Stack>
    </Surface>,
  );
  runtime.click("sw");
  expect(announced(runtime, "Dark mode")).toBe("checked");
});

it("toggles a Switch on a click and reports the role the runtime maps it to", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch testId="sw" label="Dark mode" />
      </Stack>
    </Surface>,
  );
  expect(announced(runtime, "Dark mode")).toBe("unchecked");
  runtime.click("sw");
  expect(announced(runtime, "Dark mode")).toBe("checked");
  expect(Option.isSome(a11yValueOf(runtime.a11y(), { role: "Switch" }))).toBe(
    true,
  );
});

it("moves a RadioGroup's selection with the arrow keys", async () => {
  const runtime = await openWindow();
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
  expect(announced(runtime, "Alpha")).toBe("checked");
  expect(announced(runtime, "Beta")).toBe("unchecked");
  runtime.keyDown("rg", "down");
  expect(announced(runtime, "Alpha")).toBe("unchecked");
  expect(announced(runtime, "Beta")).toBe("checked");
});

it("wraps a RadioGroup's arrow navigation at the end", async () => {
  const runtime = await openWindow();
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
  expect(announced(runtime, "Beta")).toBe("checked");
  runtime.keyDown("rg", "down");
  expect(announced(runtime, "Alpha")).toBe("checked");
});

it("exposes a named RadioGroup of named RadioButtons", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Plan"
        defaultValue="a"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>,
  );
  const dump = runtime.a11y();
  expect(
    Option.isSome(a11yNode(dump, { role: "RadioGroup", label: "Plan" })),
  ).toBe(true);
  expect(
    Option.isSome(a11yNode(dump, { role: "RadioButton", label: "Alpha" })),
  ).toBe(true);
  expect(
    Option.isSome(a11yNode(dump, { role: "RadioButton", label: "Beta" })),
  ).toBe(true);
});

it("skips a disabled option in a RadioGroup's arrow navigation", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        defaultValue="a"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta", disabled: true },
          { value: "c", label: "Gamma" },
        ]}
      />
    </Surface>,
  );
  runtime.keyDown("rg", "down");
  // A disabled option is not a destination: the arrow lands on the next
  // enabled one, the way the platform behaves.
  expect(announced(runtime, "Beta")).toBe("unchecked");
  expect(announced(runtime, "Gamma")).toBe("checked");
});

it("moves a RadioGroup's single tab stop with its selection", async () => {
  const runtime = await openWindow();
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
  expect(announced(runtime, "Beta")).toBe("checked");
  expect(tabFromBefore()).toBe("Beta");
});

/**
 * A key down delivered to whatever already holds focus.
 *
 * The existing helpers focus the element named by `testId`; a radio option has
 * no `testId` of its own, and a user never focuses the wrapper. This is the
 * honest path: the key goes to the focused item, as GPUI delivers it.
 */
const keyDownFocused = (runtime: Runtime, key: string): void =>
  Option.match(runtime.focusedElement(), {
    onNone: () => {
      expect.fail("nothing holds focus, so no key can be delivered");
    },
    onSome: (element) => {
      runtime.renderer.nativeSimulateKeyDown(element.id, key);
    },
  });

/** The accessible name of whatever holds native focus. */
const focusedLabel = (runtime: Runtime): string =>
  Option.getOrElse(
    Option.map(runtime.focusedElement(), (element) =>
      String(element.customProps?.["aria-label"] ?? element.type),
    ),
    () => "nothing",
  );

/** The circle a radio option paints — decoration inside the row that is the control. */
const circleOf = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(byLabel(runtime, label).children[0]),
      (id) => Option.fromNullishOr(runtime.renderer.getElement(id)),
    ),
    () => expect.fail(`the ${label} radio has no circle`),
  );

/**
 * Whether an element declares the runtime's keyboard ring.
 *
 * The paint itself is the playground's `focus-visible` probe (plan 053): the test
 * renderer reports the declared style, not pixels. What is asserted here is the
 * contract — the ring is declared at rest as `focusVisible`, so the runtime
 * decides when to paint it, and nothing paints a shadow ring on a press.
 */
const ringed = (element: {
  readonly style: { readonly focusVisible?: unknown };
}): boolean => Option.isSome(Option.fromNullishOr(element.style.focusVisible));

/** The old workaround: a shadow merged while a control held focus. */
const shadowed = (element: {
  readonly style: { readonly boxShadow?: unknown };
}): boolean => Option.isSome(Option.fromNullishOr(element.style.boxShadow));

it("paints no shadow ring on an option box, before or after a press", async () => {
  const runtime = await openWindow();
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
        ]}
      />
      <Stack direction="row">
        <Switch testId="after" label="After" />
      </Stack>
    </Surface>,
  );
  runtime.click("before");
  runtime.focusNext();
  runtime.flush();
  expect(focusedLabel(runtime)).toBe("Alpha");
  // The ring is the focused row's `focusVisible` outline (measured by
  // `groups.runtime.test.tsx`); the box never carried a shadow workaround, and a
  // click must not start painting one.
  expect(shadowed(circleOf(runtime, "Alpha"))).toBe(false);
  expect(shadowed(circleOf(runtime, "Beta"))).toBe(false);
  runtime.click("rg");
  runtime.flush();
  expect(shadowed(circleOf(runtime, "Alpha"))).toBe(false);
  expect(shadowed(circleOf(runtime, "Beta"))).toBe(false);
});

it("declares the keyboard ring on a Checkbox and a Switch, and never a shadow", async () => {
  // The bug this guards: a ring merged while `focused` made a mouse press paint
  // exactly what a Tab paints. The ring is now declared at rest and the runtime
  // paints it only after keyboard input (plan 053's probe).
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="cb" label="Agree" />
        <Switch testId="sw" label="Dark mode" />
      </Stack>
    </Surface>,
  );
  const box = (label: string) => byLabel(runtime, label);
  expect(ringed(box("Agree"))).toBe(true);
  expect(ringed(box("Dark mode"))).toBe(true);
  runtime.click("cb");
  runtime.flush();
  expect(shadowed(box("Agree"))).toBe(false);
  runtime.click("sw");
  runtime.flush();
  expect(shadowed(box("Agree"))).toBe(false);
  expect(shadowed(box("Dark mode"))).toBe(false);
});

it("moves native focus with the selection when an arrow moves it", async () => {
  const runtime = await openWindow();
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
        ]}
      />
    </Surface>,
  );
  runtime.click("before");
  runtime.focusNext();
  expect(focusedLabel(runtime)).toBe("Alpha");
  keyDownFocused(runtime, "down");
  runtime.flush();
  // The bug guarded: selection and tab stop moved to Beta while native focus
  // stayed on Alpha, so the ring would have sat on the wrong option.
  expect(announced(runtime, "Beta")).toBe("checked");
  expect(focusedLabel(runtime)).toBe("Beta");
  expect(shadowed(circleOf(runtime, "Alpha"))).toBe(false);
  expect(shadowed(circleOf(runtime, "Beta"))).toBe(false);
});

it("follows a controlled value change with the tab stop", async () => {
  const runtime = await openWindow();
  const view = (value: string) => (
    <Surface>
      <Stack direction="row">
        <Switch testId="before" label="Before" />
      </Stack>
      <RadioGroup
        testId="rg"
        label="Pick"
        value={value}
        onValueChange={() => {}}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>
  );
  runtime.render(view("a"));
  runtime.render(view("b"));
  runtime.click("before");
  runtime.focusNext();
  // The bug guarded: the roving index was state initialised at mount, so a
  // parent that set the value left the tab stop on the old option.
  expect(focusedLabel(runtime)).toBe("Beta");
});

it("selects a RadioGroupItem when its rich content is pressed", async () => {
  // The bug this guards: GPUix hit-tests the deepest element and does not
  // bubble, so a row whose content took the press would be selectable only on
  // its circle. The item path must keep the row the hit target.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        defaultValue="a"
        onValueChange={() => {}}
      >
        <RadioGroupItem value="a" label="Alpha">
          <Text role="label">Alpha</Text>
        </RadioGroupItem>
        <RadioGroupItem value="b" label="Beta">
          <Text role="label">Beta</Text>
          <Text role="caption" tone="muted">
            Tomorrow
          </Text>
        </RadioGroupItem>
      </RadioGroup>
    </Surface>,
  );
  const row = byLabel(runtime, "Beta");
  const box = Option.getOrElse(runtime.boundsOfId(row.id), () =>
    expect.fail("the Beta row painted no box"),
  );
  // The row's centre is over its content, not its circle.
  runtime.clickAt(box.x + box.width / 2, box.y + box.height / 2);
  expect(announced(runtime, "Beta")).toBe("checked");
  expect(announced(runtime, "Alpha")).toBe("unchecked");
});

it("selects a RadioGroup option when its own circle is clicked", async () => {
  const runtime = await openWindow();
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
  const beta = byLabel(runtime, "Beta");
  const circle = Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(beta.children[0]), (id) =>
      Option.fromNullishOr(runtime.renderer.getElement(id)),
    ),
    () => expect.fail("the Beta radio has no circle"),
  );
  runtime.clickElement(circle);
  expect(announced(runtime, "Beta")).toBe("checked");
  expect(announced(runtime, "Alpha")).toBe("unchecked");
});

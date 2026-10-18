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
 * staying behind the selection, and a button wired with the familiar `onClick`
 * that no key could reach (plan 085).
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { EventPayload } from "@gpuix/react";
import { buttonRecipeRing } from "../src/core/recipes.js";
import { Button } from "../src/components/Button.js";
import { ButtonGroup } from "../src/components/ButtonGroup.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { IconButton } from "../src/components/IconButton.js";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Toggle } from "../src/components/Toggle.js";
import {
  a11yNode,
  a11yNodes,
  a11yValueOf,
  isWithin,
  type Bounds,
  type Runtime,
} from "../src/testing/index.js";
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

it("names a text Button from its content, and lets an explicit label win", async () => {
  const { runtime } = await renderButton();
  expect(
    Option.isSome(a11yNode(runtime.a11y(), { role: "Button", label: "Save" })),
  ).toBe(true);

  const explicit = await renderButton({ children: "×", label: "Close" });
  expect(
    Option.isSome(
      a11yNode(explicit.runtime.a11y(), { role: "Button", label: "Close" }),
    ),
  ).toBe(true);
  expect(
    Option.isSome(
      a11yNode(explicit.runtime.a11y(), { role: "Button", label: "×" }),
    ),
  ).toBe(false);
});

it("leaves an icon-only Button unnamed rather than inventing a name", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="icon">
          <div style={{ width: 8, height: 8 }} />
        </Button>
      </Stack>
    </Surface>,
  );
  const button = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Button" }),
    () => expect.fail("the runtime exposed no Button node"),
  );
  expect(button.aria?.label).toBeUndefined();
});

it("names a text Toggle from its content", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Toggle testId="t">Bold</Toggle>
      </Stack>
    </Surface>,
  );
  expect(
    Option.isSome(a11yNode(runtime.a11y(), { role: "Button", label: "Bold" })),
  ).toBe(true);
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

/**
 * A Button wired the way a consumer (and the components contract) writes it:
 * the familiar `onClick`, with no `onActivate` beside it.
 */
const renderOnClickButton = async (
  props: Partial<Parameters<typeof Button>[0]> = {},
): Promise<{ runtime: Runtime; clicks: ReadonlyArray<EventPayload> }> => {
  const runtime = await openWindow();
  const clicks: EventPayload[] = [];
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="b" onClick={(event) => clicks.push(event)} {...props}>
          Save
        </Button>
      </Stack>
    </Surface>,
  );
  return { runtime, clicks };
};

it("reports a keyboard activation through onClick when only onClick is wired", async () => {
  // The bug guarded (plan 085): the key path called onActivate alone, so the
  // familiar prop left a keyboard user with a button that did nothing.
  const { runtime, clicks } = await renderOnClickButton();
  runtime.keyDown("b", "enter");
  expect(clicks).toHaveLength(1);
  expect(clicks[0]?.key).toBe("enter");
});

it("reports Space through onClick on key up, never on the key down before it", async () => {
  const { runtime, clicks } = await renderOnClickButton();
  runtime.keyDown("b", "space");
  expect(clicks).toHaveLength(0);
  runtime.keyUp("b", "space");
  expect(clicks).toHaveLength(1);
});

it("reports no onClick for a held key, a disabled button or a busy one", async () => {
  const held = await renderOnClickButton();
  held.runtime.keyDown("b", "enter", true);
  expect(held.clicks).toHaveLength(0);

  const disabled = await renderOnClickButton({ disabled: true });
  disabled.runtime.keyDown("b", "enter");
  disabled.runtime.click("b");
  expect(disabled.clicks).toHaveLength(0);

  const loading = await renderOnClickButton({ loading: true });
  loading.runtime.keyDown("b", "enter");
  expect(loading.clicks).toHaveLength(0);
});

it("reports a real click through onClick with the click's own event", async () => {
  const { runtime, clicks } = await renderOnClickButton();
  runtime.click("b");
  expect(clicks).toHaveLength(1);
  expect(clicks[0]?.key).toBeUndefined();
});

/** An IconButton with a counted activation. */
const mountIconButton = async (
  props: Partial<Parameters<typeof IconButton>[0]> = {},
): Promise<{ runtime: Runtime; calls: () => number }> => {
  const runtime = await openWindow();
  let calls = 0;
  runtime.render(
    <Surface>
      <Stack direction="row">
        <IconButton
          testId="ib"
          icon="x"
          label="Close"
          onActivate={() => {
            calls += 1;
          }}
          {...props}
        />
      </Stack>
    </Surface>,
  );
  return { runtime, calls: () => calls };
};

it("exposes one named Button and no Image node for the decorative icon", async () => {
  const { runtime } = await mountIconButton();
  expect(
    Option.isSome(a11yNode(runtime.a11y(), { role: "Button", label: "Close" })),
  ).toBe(true);
  expect(
    Arr.every(a11yNodes(runtime.a11y()), (node) => node.aria?.role !== "Image"),
  ).toBe(true);
});

it("activates an IconButton by click, Enter and Space", async () => {
  const { runtime, calls } = await mountIconButton();
  runtime.click("ib");
  expect(calls()).toBe(1);
  runtime.keyDown("ib", "enter");
  expect(calls()).toBe(2);
  runtime.keyUp("ib", "space");
  expect(calls()).toBe(3);
});

it("tints the icon with the variant's foreground and paints a square box", async () => {
  const { runtime } = await mountIconButton({ variant: "ghost", size: "lg" });
  const icon = Option.getOrElse(
    Arr.findFirst(runtime.all(), (element) => element.type === "svg"),
    () => expect.fail("the runtime painted no svg for the icon"),
  );
  expect(icon.style["color"]).toBe(testTheme.colors.foreground);
  expect(icon.style["width"]).toBe(testTheme.iconSize.lg);
  const bounds = boundsOf(runtime, "ib");
  expect(bounds.width).toBe(bounds.height);
  // shadcn's icon-lg is `size-10` (plan 370), not the density metric.
  expect(bounds.height).toBe(40);
});

it("paints the shadcn recipe's size table", async () => {
  // Plan 370: the primitive consumes the new-york-v4 geometry rather than the
  // density presets — `h-9`, `h-8`, `h-10`, `size-9`, and a field's `h-9`.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" gap="sm">
        <Button testId="md">Default</Button>
        <Button testId="sm" size="sm">
          Small
        </Button>
        <Button testId="lg" size="lg">
          Large
        </Button>
        <Button testId="icon" square>
          +
        </Button>
        <Input testId="field" label="Name" />
      </Stack>
    </Surface>,
  );
  expect(boundsOf(runtime, "md").height).toBe(36);
  expect(boundsOf(runtime, "sm").height).toBe(32);
  expect(boundsOf(runtime, "lg").height).toBe(40);
  expect(boundsOf(runtime, "icon").height).toBe(36);
  expect(boundsOf(runtime, "icon").width).toBe(36);
  // A native `<input>` reports its content box: two thin borders inside 36.
  expect(boundsOf(runtime, "field").height).toBe(
    36 - 2 * testTheme.borderWidth.thin,
  );
});

it("paints one spinner instead of an icon while loading, and refuses activation", async () => {
  const { runtime, calls } = await mountIconButton({ loading: true });
  expect(
    Arr.isReadonlyArrayEmpty(
      Arr.filter(runtime.all(), (element) => element.type === "svg"),
    ),
  ).toBe(true);
  expect(descriptions(runtime)).toContain("Loading");
  runtime.click("ib");
  runtime.keyDown("ib", "enter");
  expect(calls()).toBe(0);
});

it("takes a disabled IconButton out of the tab order and refuses activation", async () => {
  const { runtime, calls } = await mountIconButton({ disabled: true });
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.none());
  runtime.click("ib");
  runtime.keyDown("ib", "enter");
  expect(calls()).toBe(0);
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

it("stacks a vertical ButtonGroup into full-width rows", async () => {
  // The gap guarded (plan 096): ButtonGroup was hard-coded to one centred row,
  // so a vertical action stack — which every other group supports — hugged each
  // label and left the group ragged. The axis is layout only: the clip, the
  // radius and the gap rules stay the ones plan 078 measured.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ButtonGroup
        orientation="vertical"
        mode="attached"
        label="Actions"
        testId="g"
      >
        <Button testId="one">One</Button>
        <Button testId="two">Two</Button>
        <Button testId="three">Three</Button>
      </ButtonGroup>
    </Surface>,
  );
  const group = boundsOf(runtime, "g");
  const one = boundsOf(runtime, "one");
  const two = boundsOf(runtime, "two");
  const three = boundsOf(runtime, "three");
  expect([one.y, two.y, three.y]).toStrictEqual([
    group.y,
    group.y + one.height,
    group.y + one.height + two.height,
  ]);
  expect([one.width, two.width, three.width]).toStrictEqual([
    group.width,
    group.width,
    group.width,
  ]);
  const radiusOf = (id: string): unknown =>
    Option.getOrUndefined(
      Option.map(
        runtime.element(id),
        (element) => element.style["borderRadius"],
      ),
    );
  expect(["one", "two", "three"].map(radiusOf)).toStrictEqual([0, 0, 0]);
  expect(radiusOf("g")).toBe(testTheme.radius.md);
  expect(
    Option.getOrUndefined(
      Option.map(runtime.element("g"), (element) => element.style["overflow"]),
    ),
  ).toBe("hidden");
});

it("paints an attached group's focus ring inside its clip", async () => {
  // The bug guarded (plan 344): measured, an attached group's box is exactly
  // its buttons' union, so the focused button's 2px ring spread lay outside the
  // group's `overflow: hidden` clip on three sides and under the next sibling
  // on the fourth — a keyboard user saw no focus at all. The ring is now an
  // inset overlay drawn inside the button, from the recipe ring's width/colour.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ButtonGroup mode="attached" testId="g" label="Actions">
        <Button testId="one">One</Button>
        <Button testId="two">Two</Button>
      </ButtonGroup>
    </Surface>,
  );
  const before = boundsOf(runtime, "one");
  runtime.focusNext();
  runtime.flush();
  expect(runtime.focused()).toStrictEqual(Option.some("one"));
  const group = boundsOf(runtime, "g");
  const one = boundsOf(runtime, "one");
  // The overlay takes no layout space: focusing moves nothing.
  expect(one).toStrictEqual(before);
  // The clip starts and ends exactly at the button — why an outer ring is cut.
  expect([one.x, one.y, one.height]).toStrictEqual([
    group.x,
    group.y,
    group.height,
  ]);
  const button = Option.getOrElse(runtime.element("one"), () =>
    expect.fail("the focused button painted no element"),
  );
  expect(button.style.boxShadow).toBeUndefined();
  const rings = Arr.filter(
    runtime.all(),
    (element) =>
      element.id !== button.id &&
      isWithin(runtime, element, button.id) &&
      element.style.position === "absolute",
  );
  expect(rings).toHaveLength(1);
  const ring = Option.getOrElse(Arr.head(rings), () =>
    expect.fail("the group painted no ring inside the button"),
  );
  // The clipped overlay carries the recipe's ring (plan 370): `ring-[3px]`.
  expect(ring.style.borderWidth).toBe(
    buttonRecipeRing(testTheme)?.spreadRadius,
  );
  expect(ring.style.borderColor).toBe(buttonRecipeRing(testTheme)?.color);
  const ringBounds = Option.getOrElse(runtime.boundsOfId(ring.id), () =>
    expect.fail("the ring painted no box"),
  );
  // The ring's edge is the button's edge: the whole band is inside the clip.
  expect(ringBounds.x).toBeCloseTo(one.x, 1);
  expect(ringBounds.y).toBeCloseTo(one.y, 1);
  expect(ringBounds.width).toBeCloseTo(one.width, 1);
  expect(ringBounds.height).toBeCloseTo(one.height, 1);
});

it("keeps the outer ring for a separated group", async () => {
  // The other direction of plan 344: a separated group does not clip, so the
  // button keeps the one shared recipe ring shadow and paints no overlay.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ButtonGroup mode="separated" testId="g" label="Actions">
        <Button testId="one">One</Button>
        <Button testId="two">Two</Button>
      </ButtonGroup>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  const button = Option.getOrElse(runtime.element("one"), () =>
    expect.fail("the focused button painted no element"),
  );
  expect(button.style.boxShadow).toStrictEqual({
    ...buttonRecipeRing(testTheme),
    inset: false,
  });
  expect(
    Arr.filter(
      runtime.all(),
      (element) =>
        element.id !== button.id &&
        isWithin(runtime, element, button.id) &&
        element.style.position === "absolute",
    ),
  ).toHaveLength(0);
});

it("squares the buttons of an attached group so a shared edge has no notch", async () => {
  // The bug guarded (plan 078): every child kept radius.md inside a zero-gap
  // group, so two attached buttons met with a rounded notch between them; the
  // clip only rounds the group's own boundary.
  const radiusOf = (runtime: Runtime, id: string): unknown =>
    Option.getOrUndefined(
      Option.map(
        runtime.element(id),
        (element) => element.style["borderRadius"],
      ),
    );
  const attached = await openWindow();
  attached.render(
    <Surface>
      <ButtonGroup mode="attached" testId="g" label="Alignment">
        <Button testId="a">Left</Button>
        <Button testId="b">Center</Button>
        <Button testId="c">Right</Button>
      </ButtonGroup>
    </Surface>,
  );
  expect(["a", "b", "c"].map((id) => radiusOf(attached, id))).toStrictEqual([
    0, 0, 0,
  ]);
  expect(radiusOf(attached, "g")).toBe(testTheme.radius.md);
  expect(
    Option.getOrUndefined(
      Option.map(attached.element("g"), (element) => element.style["overflow"]),
    ),
  ).toBe("hidden");

  const separated = await openWindow();
  separated.render(
    <Surface>
      <ButtonGroup mode="separated" testId="g" label="Alignment">
        <Button testId="a">Left</Button>
        <Button testId="b">Center</Button>
      </ButtonGroup>
    </Surface>,
  );
  expect(["a", "b"].map((id) => radiusOf(separated, id))).toStrictEqual([
    testTheme.radius.md,
    testTheme.radius.md,
  ]);
});

it("lets an explicit radius win over the group's shape", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ButtonGroup mode="attached" testId="g" label="Alignment">
        <Button testId="a" radius="sm">
          Left
        </Button>
        <Button testId="b">Center</Button>
      </ButtonGroup>
    </Surface>,
  );
  const radiusOf = (id: string): unknown =>
    Option.getOrUndefined(
      Option.map(
        runtime.element(id),
        (element) => element.style["borderRadius"],
      ),
    );
  expect(radiusOf("a")).toBe(testTheme.radius.sm);
  expect(radiusOf("b")).toBe(0);
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

it("takes a checked supplied after mount", async () => {
  // The bug guarded (plan 324): the shared controlled rule froze the mode at
  // mount, so a checkbox that became controlled later kept announcing
  // "unchecked". The observable is the accessibility value, not the prop.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox testId="cb" label="Enable" />
    </Surface>,
  );
  expect(announced(runtime, "Enable")).toBe("unchecked");
  runtime.render(
    <Surface>
      <Checkbox testId="cb" label="Enable" checked />
    </Surface>,
  );
  expect(announced(runtime, "Enable")).toBe("checked");
});

it("does not toggle a standalone Checkbox from a Label beside it", async () => {
  // Plan 087's docs claim, measured: the runtime has no `htmlFor` or
  // `aria-labelledby` and a sibling `<text>` is not part of the control, so the
  // visible name is cosmetic. If this ever toggles, the docs and the
  // `CheckboxGroup` row guidance are wrong.
  const runtime = await openWindow();
  let toggles = 0;
  runtime.render(
    <Surface>
      <Stack direction="row" align="center" gap="sm">
        <Checkbox
          testId="cb"
          label="Email"
          onValueChange={() => {
            toggles += 1;
          }}
        />
        <Label testId="label">Email</Label>
      </Stack>
    </Surface>,
  );
  runtime.click("label");
  expect(toggles).toBe(0);
  runtime.click("cb");
  expect(toggles).toBe(1);
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

/** The switch's thumb box, which is the switch's only child. */
const switchThumb = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(
    Option.flatMap(runtime.element(testId), (element) =>
      Option.flatMap(Option.fromNullishOr(element.children[0]), (id) =>
        runtime.boundsOfId(id),
      ),
    ),
    () => expect.fail(`the ${testId} switch painted no thumb`),
  );

it("slides the switch thumb to its new end instead of jumping", async () => {
  // The bug guarded (plan 329): the thumb was laid out with the track's
  // `justifyContent`, so a toggle teleported from one end to the other in one
  // frame. Measured travel at `md`: dx 3 → 13, dy 2.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Switch testId="sw" label="Wifi" />
    </Surface>,
  );
  const track = boundsOf(runtime, "sw");
  const rest = switchThumb(runtime, "sw");
  expect(rest.x - track.x).toBe(3);
  expect(rest.y - track.y).toBe(2);

  runtime.click("sw");
  runtime.advanceMotion(0);
  const atClick = switchThumb(runtime, "sw");
  runtime.advanceMotion(100);
  const midway = switchThumb(runtime, "sw");
  runtime.advanceMotion(200);
  const end = switchThumb(runtime, "sw");

  expect(atClick.x).toBe(rest.x); // no jump on the click
  expect(midway.x).toBeGreaterThan(rest.x);
  expect(midway.x).toBeLessThan(end.x);
  expect(end.x - track.x).toBe(13); // the resting place the layout painter had
  expect(end.y).toBe(rest.y);
});

it("rests a controlled switch at the end it mounted with", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Switch testId="sw" label="Wifi" checked />
    </Surface>,
  );
  // Mount applies `initial`, so a switch that starts on paints no slide.
  const track = boundsOf(runtime, "sw");
  expect(switchThumb(runtime, "sw").x - track.x).toBe(13);
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

it("activates the focused radio on Space up, not the value's tab stop", async () => {
  const runtime = await openWindow();
  const calls: string[] = [];
  // A controlled parent that records every request but keeps `value="a"`: a
  // deferred or rejected selection, the state where focus and value diverge.
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        value="a"
        onValueChange={(next) => calls.push(next)}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  expect(runtime.focused()).toStrictEqual(Option.some("rg-a"));
  runtime.keyDown("rg-a", "down");
  runtime.flush();
  expect(runtime.focused()).toStrictEqual(Option.some("rg-b"));
  expect(announced(runtime, "Alpha")).toBe("checked");
  // Space acts on key up: the down phase must report nothing.
  runtime.keyDown("rg-b", "space");
  runtime.flush();
  expect(calls).toStrictEqual(["b"]);
  runtime.keyUp("rg-b", "space");
  runtime.flush();
  // The focused radio, not the value-derived tab stop (which is still Alpha).
  expect(calls).toStrictEqual(["b", "b"]);
});

it("activates the focused radio on Enter, not the value's tab stop", async () => {
  const runtime = await openWindow();
  const calls: string[] = [];
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        value="a"
        onValueChange={(next) => calls.push(next)}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>,
  );
  runtime.keyDown("rg-a", "down");
  runtime.flush();
  runtime.keyDown("rg-b", "enter");
  runtime.flush();
  // Enter re-selecting Alpha is a no-op the shared notify rule suppresses, so
  // the old handler made the key look dead instead of choosing Beta.
  expect(calls).toStrictEqual(["b", "b"]);
});

it("selects the tab stop on an activation key with no focused option", async () => {
  const runtime = await openWindow();
  const calls: string[] = [];
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        onValueChange={(next) => calls.push(next)}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>,
  );
  // No item has taken focus: a key delivered to the group itself still acts.
  runtime.keyUp("rg", "space");
  runtime.flush();
  expect(calls).toStrictEqual(["a"]);
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

/** The circle a radio option paints — the ring lands on it, not on the row. */
const circleOf = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(byLabel(runtime, label).children[0]),
      (id) => Option.fromNullishOr(runtime.renderer.getElement(id)),
    ),
    () => expect.fail(`the ${label} radio has no circle`),
  );

/** Whether a radio option paints the focus ring. */
const ringed = (runtime: Runtime, label: string): boolean =>
  Option.isSome(Option.fromNullishOr(circleOf(runtime, label).style.boxShadow));

it("rings the radio that holds focus, and only that one", async () => {
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
  expect(ringed(runtime, "Alpha")).toBe(true);
  expect(ringed(runtime, "Beta")).toBe(false);
  runtime.focusNext();
  runtime.flush();
  expect(ringed(runtime, "Alpha")).toBe(false);
});

it("paints a RadioGroup's failed validation on the empty circles", async () => {
  const runtime = await openWindow();
  const radioGroup = (invalid: boolean) => (
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        invalid={invalid}
        defaultValue="a"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    </Surface>
  );
  runtime.render(radioGroup(true));
  runtime.flush();
  expect(circleOf(runtime, "Alpha").style.borderColor).toBe(
    testTheme.colors.primary,
  );
  expect(circleOf(runtime, "Beta").style.borderColor).toBe(
    testTheme.colors.destructive,
  );
  runtime.render(radioGroup(false));
  runtime.flush();
  expect(circleOf(runtime, "Beta").style.borderColor).toBe(
    testTheme.colors.input,
  );
});

it("rings a focused Checkbox and Switch, and clears it when focus leaves", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="cb" label="Agree" />
        <Switch testId="sw" label="Dark mode" />
      </Stack>
    </Surface>,
  );
  const shadow = (label: string): boolean =>
    Option.isSome(
      Option.fromNullishOr(byLabel(runtime, label).style.boxShadow),
    );
  runtime.click("cb");
  runtime.flush();
  expect(shadow("Agree")).toBe(true);
  runtime.click("sw");
  runtime.flush();
  // The ring moved with focus: a stale one would leave both painted.
  expect(shadow("Agree")).toBe(false);
  expect(shadow("Dark mode")).toBe(true);
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
  expect(ringed(runtime, "Alpha")).toBe(false);
  expect(ringed(runtime, "Beta")).toBe(true);
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

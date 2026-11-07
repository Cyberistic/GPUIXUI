import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import { createRef } from "react";
import type { PublicInstance } from "@gpuix/react";
import {
  alpha,
  filledHover,
  filledPressed,
  platformTheme,
  themes,
} from "@gpuixui/tokens";
import type { EventPayload } from "@gpuix/react";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import {
  ButtonGroup,
  type ButtonGroupMode,
} from "../src/components/ButtonGroup.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { Icon } from "@gpuixui/icons";
import { IconButton } from "../src/components/IconButton.js";
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
import { TYPE_AHEAD_RESET_MS } from "../src/core/keyboard.js";
import type { ControlSize, SpaceStep } from "../src/core/theme.js";
import { pressWash } from "../src/core/pointer.js";
import { sleep, Surface, openWindow, testTheme } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

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

const descriptions = (runtime: Runtime): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(a11yNodes(runtime.a11y()), (node) =>
      Option.fromNullishOr(node.aria?.description),
    ),
  );

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

it("hands the activation the event the platform dispatched", async () => {
  const runtime = await openWindow();
  const seen: Array<EventPayload> = [];
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button
          testId="b"
          onActivate={(event) => {
            seen.push(event);
          }}
        >
          Save
        </Button>
      </Stack>
    </Surface>,
  );
  const box = boundsOf(runtime, "b");
  runtime.click("b");
  const click = seen[0] ?? expect.fail("the click reported no activation");
  expect(click.eventType).toBe("click");
  expect(click.x).toBeGreaterThanOrEqual(box.x);
  expect(click.x).toBeLessThanOrEqual(box.x + box.width);
  expect(click.y).toBeGreaterThanOrEqual(box.y);
  expect(click.y).toBeLessThanOrEqual(box.y + box.height);

  runtime.keyDown("b", "enter");
  const key = seen[1] ?? expect.fail("Enter reported no activation");
  expect(key.eventType).toBe("keyDown");
  expect(key.key).toBe("enter");
  expect(seen.length).toBe(2);
});

it("paints an outlined Button's edge in the measured boundary role", async () => {
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

  expect(bucketFill(style, "hover")).not.toBe(
    alpha(testTheme.colors.primary, 0.9),
  );
});

it("paints a ghost Button's press on the wash it replaces", async () => {
  const macos = platformTheme(themes.light, "darwin");
  const runtime = await openWindow();
  runtime.render(
    <Surface theme={macos}>
      <Button testId="ghost" variant="ghost">
        Undo
      </Button>
    </Surface>,
  );
  const style = Option.getOrElse(
    Option.flatMap(runtime.element("ghost"), (element) =>
      Option.fromNullishOr(runtime.renderer.getElement(element.id)?.style),
    ),
    () => expect.fail("the runtime retained no ghost button"),
  );
  expect(bucketFill(style, "hover")).toBe(macos.colors.hover);
  expect(bucketFill(style, "active")).toBe(pressWash(macos));

  expect(bucketFill(style, "active")).not.toBe(macos.colors.active);
});

it("paints a checked Checkbox's feedback as the theme's opaque derived fill", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox
        testId="check"
        label="Agree"
        checked
        onCheckedChange={() => {}}
      />
    </Surface>,
  );
  const drawingId = Option.getOrElse(
    Option.flatMap(runtime.element("check"), (element) =>
      Option.fromNullishOr(element.children[0] ?? null),
    ),
    () => expect.fail("the runtime retained no checkbox drawing"),
  );
  const style = Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(drawingId), (id) =>
      Option.fromNullishOr(runtime.renderer.getElement(id)?.style),
    ),
    () => expect.fail("the runtime reported no style for the drawing"),
  );
  expect(bucketFill(style, "hover")).toBe(filledHover(testTheme, "primary"));
  expect(bucketFill(style, "active")).toBe(filledPressed(testTheme, "primary"));

  expect(bucketFill(style, "hover")).not.toBe(
    alpha(testTheme.colors.primary, 0.9),
  );
});

it("skips a disabled busy Button in the tab order, and focuses it from code", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="busy" disabled loading>
          Save
        </Button>
        <Button testId="after">Cancel</Button>
      </Stack>
    </Surface>,
  );
  const stop = Option.flatMap(runtime.element("busy"), (element) =>
    Option.fromNullishOr(element.customProps?.tabIndex),
  );
  expect(stop).toStrictEqual(Option.some(-1));
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("after"));
  runtime.focus("busy");
  expect(runtime.focused()).toStrictEqual(Option.some("busy"));
});

it("walks past an action a leaving surface has taken out of the Tab order", async () => {
  const runtime = await openWindow();
  let calls = 0;
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button
          testId="leaving"
          tabIndex={-1}
          onActivate={() => {
            calls += 1;
          }}
        >
          Save
        </Button>
        <Button testId="after">Cancel</Button>
      </Stack>
    </Surface>,
  );
  const stop = Option.flatMap(runtime.element("leaving"), (element) =>
    Option.fromNullishOr(element.customProps?.tabIndex),
  );
  expect(stop).toStrictEqual(Option.some(-1));
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("after"));

  runtime.focus("leaving");
  expect(runtime.focused()).toStrictEqual(Option.some("leaving"));
  runtime.click("leaving");
  expect(calls).toBe(1);
});

it("paints a disabled filled Button with the measured pair, not a fade", async () => {
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

  expect(styleOf("ghost").opacity).toBe(0.5);
});

it("keeps a filled Button's label while another control has keyboard focus", async () => {
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

  runtime.render(<View disabled={true} />);
  expect(runtime.focused()).toStrictEqual(Option.some("cb"));
  expect(declaresRing()).toBe(false);
  runtime.keyDown("cb", "space");
  runtime.keyUp("cb", "space");
  expect(changes).toBe(1);

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

it("announces a busy Button in the caller's words", async () => {
  const { runtime } = await renderButton({
    loading: true,
    label: "Save",
    loadingLabel: "Chargement",
  });
  expect(descriptions(runtime)).toContain("Chargement");
  expect(descriptions(runtime)).not.toContain("Loading");
});

it("names a Button by its text child", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="b">Save changes</Button>
    </Surface>,
  );

  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Button", label: "Save changes" }),
    ),
  ).toBe(true);
});

it("hands a trigger's ref, state and pointer pair to the element", async () => {
  const runtime = await openWindow();

  const refs: Array<Option.Option<number>> = [];
  const hovers: string[] = [];
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button
          testId="b"
          label="Filters"
          ref={(instance) => {
            refs.push(
              Option.map(Option.fromNullishOr(instance), (held) => held.id),
            );
          }}
          aria-expanded
          aria-selected
          onMouseEnter={() => hovers.push("enter")}
          onMouseLeave={() => hovers.push("leave")}
        >
          Filters
        </Button>
        <Button testId="after">After</Button>
      </Stack>
    </Surface>,
  );

  const id = Option.getOrElse(
    Option.flatMap(Arr.last(refs), (held) => held),
    () => expect.fail("the button's ref never ran"),
  );
  expect(
    Option.map(runtime.element("b"), (element) => element.id),
  ).toStrictEqual(Option.some(id));

  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Button", label: "Filters" }),
    () => expect.fail("no accessibility node named Filters"),
  );
  expect({
    expanded: node.aria?.expanded,
    selected: node.aria?.selected,
  }).toStrictEqual({ expanded: true, selected: true });

  runtime.hover("b");
  expect(hovers).toStrictEqual(["enter"]);
  runtime.hover("after");
  expect(hovers).toStrictEqual(["enter", "leave"]);
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

it("stacks a vertical group's actions with no gap and one shared width", async () => {
  const layoutOf = async (
    mode: "attached" | "separated",
  ): Promise<{ gap: number; widths: ReadonlyArray<number> }> => {
    const runtime = await openWindow();
    runtime.render(
      <Surface>
        <ButtonGroup mode={mode} orientation="vertical" gap="sm" testId="g">
          <Button testId="one">One</Button>
          <Button testId="two">A much longer label</Button>
        </ButtonGroup>
      </Surface>,
    );
    const one = boundsOf(runtime, "one");
    const two = boundsOf(runtime, "two");
    return {
      gap: two.y - (one.y + one.height),
      widths: [one.width, two.width],
    };
  };
  const attached = await layoutOf("attached");
  expect(attached.gap).toBe(0);
  expect(attached.widths[0]).toBe(attached.widths[1]);
  expect(await layoutOf("separated")).toStrictEqual({
    gap: testTheme.spacing.sm,
    widths: attached.widths,
  });
});

it("keeps a square action square inside a vertical group", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ButtonGroup orientation="vertical" testId="g">
        <IconButton
          testId="zoom"
          label="Zoom in"
          icon={<Icon name="plus" color={testTheme.colors.foreground} />}
        />
        <Button testId="reset">Reset the whole view</Button>
      </ButtonGroup>
    </Surface>,
  );
  const zoom = boundsOf(runtime, "zoom");
  const reset = boundsOf(runtime, "reset");
  expect(zoom.width).toBe(zoom.height);
  expect(zoom.width).toBeLessThan(reset.width);
});

it("squares an attached group's children so its seams do not show the page", async () => {
  const radii = async (mode: ButtonGroupMode) => {
    const runtime = await openWindow();
    runtime.render(
      <Surface>
        <ButtonGroup mode={mode} testId="g">
          <Button testId="one">One</Button>
          <Button testId="two">Two</Button>
        </ButtonGroup>
      </Surface>,
    );
    return Arr.map(["one", "two"] as const, (id) =>
      Option.flatMap(runtime.element(id), (element) =>
        Option.fromNullishOr(element.style.borderRadius),
      ),
    );
  };
  expect(await radii("attached")).toStrictEqual([
    Option.some(0),
    Option.some(0),
  ]);
  expect(await radii("separated")).toStrictEqual([
    Option.some(testTheme.radius.md),
    Option.some(testTheme.radius.md),
  ]);

  expect(await radii("segmented" as ButtonGroupMode)).toStrictEqual([
    Option.some(0),
    Option.some(0),
  ]);
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

it("keeps a restored toolbar's gap when its stored step is absent", async () => {
  const gapOf = async (gap: SpaceStep | null): Promise<number> => {
    const runtime = await openWindow();
    runtime.render(
      <Surface>
        <ButtonGroup mode="separated" gap={gap} testId="g">
          <Button testId="one">One</Button>
          <Button testId="two">Two</Button>
        </ButtonGroup>
      </Surface>,
    );
    const one = boundsOf(runtime, "one");
    const two = boundsOf(runtime, "two");
    return two.x - (one.x + one.width);
  };

  expect(await gapOf(null)).toBe(testTheme.spacing.sm);
  expect(await gapOf("huge" as SpaceStep)).toBe(testTheme.spacing.sm);
  expect(await gapOf("lg")).toBe(testTheme.spacing.lg);
});

it("addresses and measures the group's own element", async () => {
  const runtime = await openWindow();
  const ref = createRef<PublicInstance>();
  const measured: Array<{ readonly x: number; readonly width: number }> = [];
  runtime.render(
    <Surface>
      <ButtonGroup
        label="Text alignment"
        testId="g"
        aria-id="toolbar"
        ref={ref}
        onLayout={(event) =>
          measured.push({ x: event.x ?? 0, width: event.width ?? 0 })
        }
      >
        <Button testId="one">One</Button>
        <Button testId="two">Two</Button>
      </ButtonGroup>
    </Surface>,
  );
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  const group = Option.getOrElse(runtime.element("g"), () =>
    expect.fail("the runtime painted no button group"),
  );
  expect(ref.current?.id).toBe(group.id);
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Group", label: "Text alignment" }),
    () => expect.fail("the runtime painted no group node"),
  );
  expect(node.aria?.author_id).toBe("toolbar");
  const box = Option.getOrElse(runtime.bounds("g"), () =>
    expect.fail("the group painted no box"),
  );
  expect(measured).toHaveLength(1);
  expect(measured[0]?.x).toBe(box.x);
  expect(measured[0]?.width).toBe(box.width);
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

it("reaches a radio option by the prefix a reader types, and starts the buffer over after the pause", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        options={[
          { value: "alpine", label: "Alpine" },
          { value: "alpha", label: "Alpha" },
          { value: "bravo", label: "Bravo" },
        ]}
      />
    </Surface>,
  );

  runtime.keyDown("rg", "a");
  expect(announced(runtime, "Alpha")).toBe("checked");

  runtime.keyDown("rg", "l");
  expect(announced(runtime, "Alpine")).toBe("checked");
  await sleep(TYPE_AHEAD_RESET_MS + 100);

  runtime.keyDown("rg", "p");
  expect(announced(runtime, "Alpine")).toBe("checked");
});

it("leaves a shortcut chord's key to the platform", async () => {
  const runtime = await openWindow();
  let activations = 0;
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button
          testId="b"
          onActivate={() => {
            activations += 1;
          }}
        >
          Save
        </Button>
      </Stack>
      <RadioGroup
        testId="rg"
        label="Pick"
        defaultValue="beta"
        options={[
          { value: "alpha", label: "Alpha" },
          { value: "beta", label: "Beta" },
        ]}
      />
    </Surface>,
  );
  runtime.keyDown("b", "cmd-enter");
  expect(activations).toBe(0);
  runtime.keyDown("b", "enter");
  expect(activations).toBe(1);
  runtime.keyDown("rg", "cmd-a");
  expect(announced(runtime, "Beta")).toBe("checked");
  runtime.keyDown("rg", "a");
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

it("keeps a declined controlled RadioGroup's arrows and tab stop on the row that holds focus", async () => {
  const reported: string[] = [];
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="rg"
        label="Pick"
        value="a"
        onValueChange={(next) => {
          reported.push(next);
        }}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
          { value: "c", label: "Gamma" },
        ]}
      />
      <Switch testId="after" label="After" />
    </Surface>,
  );
  runtime.keyDown("rg", "down");
  expect(focusedLabel(runtime)).toBe("Beta");
  keyDownFocused(runtime, "down");
  expect(focusedLabel(runtime)).toBe("Gamma");
  expect(reported).toStrictEqual(["b", "c"]);

  expect(announced(runtime, "Alpha")).toBe("checked");
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("after"));
});

const keyDownFocused = (runtime: Runtime, key: string): void =>
  Option.match(runtime.focusedElement(), {
    onNone: () => {
      expect.fail("nothing holds focus, so no key can be delivered");
    },
    onSome: (element) => {
      runtime.renderer.nativeSimulateKeyDown(element.id, key);
    },
  });

const focusedLabel = (runtime: Runtime): string =>
  Option.getOrElse(
    Option.map(runtime.focusedElement(), (element) =>
      String(element.customProps?.["aria-label"] ?? element.type),
    ),
    () => "nothing",
  );

const circleOf = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(byLabel(runtime, label).children[0]),
      (id) => Option.fromNullishOr(runtime.renderer.getElement(id)),
    ),
    () => expect.fail(`the ${label} radio has no circle`),
  );

const ringed = (element: {
  readonly style: { readonly focusVisible?: unknown };
}): boolean => Option.isSome(Option.fromNullishOr(element.style.focusVisible));

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

  expect(shadowed(circleOf(runtime, "Alpha"))).toBe(false);
  expect(shadowed(circleOf(runtime, "Beta"))).toBe(false);
  runtime.click("rg");
  runtime.flush();
  expect(shadowed(circleOf(runtime, "Alpha"))).toBe(false);
  expect(shadowed(circleOf(runtime, "Beta"))).toBe(false);
});

it("declares the keyboard ring on a Checkbox and a Switch, and never a shadow", async () => {
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

  expect(focusedLabel(runtime)).toBe("Beta");
});

it("selects a RadioGroupItem when its rich content is pressed", async () => {
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

it("paints a control whose stored size name the scale no longer carries at the default height", async () => {
  const stored = "huge" as ControlSize;
  expect(Object.keys(testTheme.density.controlHeight)).not.toContain(stored);
  const { runtime, calls } = await renderButton({ size: stored });
  const box = boundsOf(runtime, "b");
  expect(box.height).toBe(testTheme.density.controlHeight.md);
  runtime.clickAt(box.x + box.width / 2, box.y + box.height / 2);
  expect(calls()).toBe(1);
});

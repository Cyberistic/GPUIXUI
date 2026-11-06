import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import type {
  MessagesSource,
  PrimitiveMessages,
} from "../src/core/messages.js";
import { Button } from "../src/components/Button.js";
import { MessagesProvider } from "../src/components/MessagesProvider.js";
import { OTPField } from "../src/components/OTPField.js";
import { Progress } from "../src/components/Progress.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { RangeSlider } from "../src/components/Slider.js";
import { Rating } from "../src/components/Rating.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Text } from "../src/components/Text.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { a11yNode, a11yValueOf, type Runtime } from "./harness.js";
import { openWindow, Surface } from "./fixture.js";

const french: PrimitiveMessages = {
  selection: { checked: "coché", unchecked: "décoché", mixed: "partiel" },
  press: { pressed: "enfoncé", notPressed: "relâché" },
  star: { checked: "plein", half: "demi", unchecked: "vide" },
  starName: (index, max) => `étoile ${index} sur ${max}`,
  scrollRegion: "Zone de défilement",
  codeDigit: (index, label) => `${label ?? "Code"} chiffre ${index + 1}`,
  loading: { busy: "Chargement", indeterminate: "chargement" },
  rangeEnd: (label, end) =>
    `${end === "start" ? "minimum" : "maximum"} de ${label}`,
};

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

const named = (runtime: Runtime, role: string, label: string): boolean =>
  Option.isSome(a11yNode(runtime.a11y(), { role, label }));

const described = (runtime: Runtime, label: string): Option.Option<string> =>
  Option.flatMap(a11yNode(runtime.a11y(), { label }), (node) =>
    Option.fromNullishOr(node.aria?.description),
  );

it("announces every control's state in the caller's words", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface messages={french}>
      <Stack direction="column" gap="sm">
        <Checkbox testId="check" label="Notify" defaultChecked />
        <CheckboxGroup
          label="Channels"
          options={[{ value: "email", label: "Email" }]}
          defaultValue={["email"]}
        />
        <RadioGroup
          label="Size"
          options={[{ value: "a", label: "Alpha" }]}
          defaultValue="a"
        />
        <Switch testId="switch" label="Wi-Fi" defaultChecked />
        <Toggle testId="toggle" label="Bold" defaultPressed />
        <ToggleGroup
          label="Align"
          type="single"
          defaultValue="left"
          options={[{ value: "left", label: "Left" }]}
        />
        <ScrollArea
          axis="vertical"
          testId="scroller"
          viewportTestId="scroller-port"
          style={{ height: 60 }}
        >
          <Text>rows</Text>
        </ScrollArea>
        <OTPField length={2} />
        <Rating testId="rating" label="Qualité" max={2} defaultValue={1} />
      </Stack>
    </Surface>,
  );

  expect(announced(runtime, "Notify")).toBe("coché");
  expect(announced(runtime, "Email")).toBe("coché");
  expect(announced(runtime, "Alpha")).toBe("coché");
  expect(announced(runtime, "Wi-Fi")).toBe("coché");
  expect(announced(runtime, "Bold")).toBe("enfoncé");
  expect(announced(runtime, "Left")).toBe("enfoncé");

  expect(announced(runtime, "étoile 1 sur 2")).toBe("plein");
  expect(announced(runtime, "étoile 2 sur 2")).toBe("vide");

  expect(named(runtime, "Group", "Zone de défilement")).toBe(true);
  expect(named(runtime, "TextInput", "Code chiffre 1")).toBe(true);
});

it("lets a nested provider extend the table instead of resetting it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface messages={french}>
      <MessagesProvider
        messages={{ press: { pressed: "appuyé", notPressed: "relâché" } }}
      >
        <Stack direction="column" gap="sm">
          <Toggle testId="toggle" label="Italic" defaultPressed />
          <Checkbox testId="check" label="Preview" defaultChecked />
        </Stack>
      </MessagesProvider>
    </Surface>,
  );

  expect(announced(runtime, "Italic")).toBe("appuyé");

  expect(announced(runtime, "Preview")).toBe("coché");
});

it("keeps the words a nested provider leaves undefined", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface messages={french}>
      <MessagesProvider
        messages={{ selection: undefined, starName: undefined }}
      >
        <Stack direction="column" gap="sm">
          <Checkbox testId="check" label="Preview" defaultChecked />
          <Rating testId="rating" label="Qualité" max={2} defaultValue={1} />
        </Stack>
      </MessagesProvider>
    </Surface>,
  );

  expect(announced(runtime, "Preview")).toBe("coché");
  expect(announced(runtime, "étoile 1 sur 2")).toBe("plein");
  expect(announced(runtime, "étoile 2 sur 2")).toBe("vide");
});

it("announces a busy action and an indeterminate bar in the caller's words", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface messages={french}>
      <Stack direction="column" gap="sm">
        <Button testId="save" loading>
          Save
        </Button>
        <Progress testId="bar" label="Import" />
      </Stack>
    </Surface>,
  );

  expect(
    Option.getOrElse(described(runtime, "Save"), () =>
      expect.fail("the busy action carries no description"),
    ),
  ).toBe("Chargement");

  expect(named(runtime, "Status", "Chargement")).toBe(true);
  expect(announced(runtime, "Import")).toBe("chargement");
});

it("names a range slider's ends in the caller's words", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface messages={french}>
      <RangeSlider label="Prix" defaultValue={[20, 60]} />
    </Surface>,
  );

  expect(named(runtime, "Slider", "minimum de Prix")).toBe(true);
  expect(named(runtime, "Slider", "maximum de Prix")).toBe(true);
  expect(announced(runtime, "minimum de Prix")).toBe("20");
  expect(announced(runtime, "maximum de Prix")).toBe("60");
});

it("keeps the shipped sentence when a caller's says nothing", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface
      messages={{
        ...french,
        starName: () => "",
        codeDigit: () => "",
        rangeEnd: () => "",
      }}
    >
      <Stack direction="column" gap="sm">
        <Rating testId="rating" label="Qualité" max={2} defaultValue={1} />
        <OTPField length={2} label="Vérification" />
        <RangeSlider label="Prix" defaultValue={[20, 60]} />
      </Stack>
    </Surface>,
  );

  expect(announced(runtime, "1 of 2")).toBe("plein");
  expect(announced(runtime, "2 of 2")).toBe("vide");
  expect(named(runtime, "TextInput", "Vérification digit 1")).toBe(true);
  expect(named(runtime, "TextInput", "Vérification digit 2")).toBe(true);
  expect(named(runtime, "Slider", "Prix minimum")).toBe(true);
  expect(named(runtime, "Slider", "Prix maximum")).toBe(true);
});

it("keeps the shipped state word when the table's says nothing", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface
      messages={{
        ...french,
        selection: { checked: "", unchecked: "", mixed: "" },
        press: { pressed: "", notPressed: "" },
        star: { checked: "", half: "", unchecked: "" },
        scrollRegion: "  ",
        loading: { busy: "  ", indeterminate: "" },
      }}
    >
      <Stack direction="column" gap="sm">
        <Checkbox testId="check" label="Notify" defaultChecked />
        <Toggle testId="toggle" label="Bold" defaultPressed />
        <Rating testId="rating" label="Qualité" max={2} defaultValue={1} />
        <Button testId="save" loading>
          Save
        </Button>
        <Progress testId="bar" label="Import" />
        <ScrollArea
          axis="vertical"
          testId="scroller"
          viewportTestId="scroller-port"
          style={{ height: 60 }}
        >
          <Text>rows</Text>
        </ScrollArea>
      </Stack>
    </Surface>,
  );

  expect(announced(runtime, "Notify")).toBe("checked");
  expect(announced(runtime, "Bold")).toBe("pressed");

  expect(announced(runtime, "étoile 1 sur 2")).toBe("checked");
  expect(announced(runtime, "étoile 2 sur 2")).toBe("unchecked");
  expect(
    Option.getOrElse(described(runtime, "Save"), () =>
      expect.fail("the busy action carries no description"),
    ),
  ).toBe("Loading");
  expect(named(runtime, "Status", "Loading")).toBe(true);
  expect(announced(runtime, "Import")).toBe("loading");

  expect(named(runtime, "Group", "Scroll region")).toBe(true);
});

it("keeps a tree a stored words table reaches, and the words it lost", async () => {
  const runtime = await openWindow();
  const stored: MessagesSource = {
    selection: { checked: "sélectionné", unchecked: null, mixed: null },
    starName: null,
    loading: null,
    scrollRegion: null,
  };
  runtime.render(
    <Surface messages={french}>
      <MessagesProvider messages={stored}>
        <MessagesProvider messages={null}>
          <Stack direction="column" gap="sm">
            <Checkbox testId="checked" label="Notify" defaultChecked />
            <Checkbox testId="unchecked" label="Preview" />
            <Rating testId="rating" label="Qualité" max={2} defaultValue={1} />
            <Progress testId="bar" label="Import" />
            <ScrollArea
              axis="vertical"
              testId="scroller"
              viewportTestId="scroller-port"
              style={{ height: 60 }}
            >
              <Text>rows</Text>
            </ScrollArea>
          </Stack>
        </MessagesProvider>
      </MessagesProvider>
    </Surface>,
  );

  expect(announced(runtime, "Notify")).toBe("sélectionné");
  expect(announced(runtime, "Preview")).toBe("décoché");

  expect(announced(runtime, "étoile 1 sur 2")).toBe("plein");
  expect(announced(runtime, "étoile 2 sur 2")).toBe("vide");

  expect(announced(runtime, "Import")).toBe("chargement");
  expect(named(runtime, "Group", "Zone de défilement")).toBe(true);
});

it("keeps the shipped words when a caller names none", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Checkbox testId="check" label="Notify" defaultChecked />
        <Rating testId="rating" label="Quality" max={2} defaultValue={1} />
        <ScrollArea
          axis="vertical"
          testId="scroller"
          viewportTestId="scroller-port"
          style={{ height: 60 }}
        >
          <Text>rows</Text>
        </ScrollArea>
      </Stack>
    </Surface>,
  );

  expect(announced(runtime, "Notify")).toBe("checked");
  expect(announced(runtime, "1 of 2")).toBe("checked");
  expect(announced(runtime, "2 of 2")).toBe("unchecked");
  expect(named(runtime, "Group", "Scroll region")).toBe(true);
});

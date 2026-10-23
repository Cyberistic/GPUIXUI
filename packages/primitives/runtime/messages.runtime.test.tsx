/**
 * The words a control announces, in a real window.
 *
 * `messages.test.tsx` proves each pure render function announces the table it is
 * handed; this suite proves the other half — that `useMessages` carries the
 * provider's table to the element GPUI paints, and that the a11y dump reads the
 * translated word. It is the same seam `loadingLabel` needed: a localised
 * interface must not hear English from its own controls.
 *
 * One window per test (`runtime/fixture.tsx`), and every window here names a
 * different vocabulary, so a component that quietly kept a literal would report
 * the English word and fail by name.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import type { PrimitiveMessages } from "../src/core/messages.js";
import { Button } from "../src/components/Button.js";
import { MessagesProvider } from "../src/components/MessagesProvider.js";
import { OTPField } from "../src/components/OTPField.js";
import { Progress } from "../src/components/Progress.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Text } from "../src/components/Text.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { a11yNode, a11yValueOf, type Runtime } from "./harness.js";
import { openWindow, Surface } from "./fixture.js";

/** A caller's table: what a French interface announces. */
const french: PrimitiveMessages = {
  selection: { checked: "coché", unchecked: "décoché", mixed: "partiel" },
  press: { pressed: "enfoncé", notPressed: "relâché" },
  star: { checked: "plein", half: "demi", unchecked: "vide" },
  starName: (index, max) => `étoile ${index} sur ${max}`,
  scrollRegion: "Zone de défilement",
  codeDigit: (index, label) => `${label ?? "Code"} chiffre ${index + 1}`,
  loading: { busy: "Chargement", indeterminate: "chargement" },
};

/** The word the accessibility node named `label` announces. */
const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

/** Whether a node with this role and name is in the painted tree. */
const named = (runtime: Runtime, role: string, label: string): boolean =>
  Option.isSome(a11yNode(runtime.a11y(), { role, label }));

/** The description the accessibility node named `label` carries. */
const described = (runtime: Runtime, label: string): Option.Option<string> =>
  Option.flatMap(a11yNode(runtime.a11y(), { label }), (node) =>
    Option.fromNullishOr(node.aria?.description),
  );

it("announces every control's state in the caller's words", async () => {
  // The bug: `checked`, `mixed`, `pressed`, `Scroll region` and `Code digit N`
  // were English literals in the components, so the provider's table reached
  // nothing and a localised interface heard its own controls speak English.
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
  // A rating names each star from the table and announces how much of it is
  // filled — the second vocabulary the seam carries.
  expect(announced(runtime, "étoile 1 sur 2")).toBe("plein");
  expect(announced(runtime, "étoile 2 sur 2")).toBe("vide");
  // The scroll region names itself from the table, and a code cell names its
  // position in the caller's sentence.
  expect(named(runtime, "Group", "Zone de défilement")).toBe(true);
  expect(named(runtime, "TextInput", "Code chiffre 1")).toBe(true);
});

it("lets a nested provider extend the table instead of resetting it", async () => {
  // The bug: the nested provider replaced the table whole, so a dialog that
  // named its own two words silenced the page's selection words around it.
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
  // Not reset to English: the selection group came from the outer provider.
  expect(announced(runtime, "Preview")).toBe("coché");
});

it("keeps the words a nested provider leaves undefined", async () => {
  // The bug: a group a caller forwards as `undefined` — an optional prop it
  // never received — erased the table above it instead of inheriting. The
  // selection group dropped back to the shipped English, and an erased
  // `starName` made Rating throw while rendering, which this window painted as
  // no rating at all rather than as an error.
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
  // The bug: the busy word and the indeterminate word were the only announced
  // copy outside the table, so a French tree heard "Loading" from every action
  // and "loading" from every bar unless it repeated a prop on each instance.
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
  // The busy spinner is named too, so the indicator is not a silent status.
  expect(named(runtime, "Status", "Chargement")).toBe(true);
  expect(announced(runtime, "Import")).toBe("chargement");
});

it("keeps the shipped words when a caller names none", async () => {
  // The compatibility direction: adopting the seam changes nothing on a screen
  // that names no words.
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

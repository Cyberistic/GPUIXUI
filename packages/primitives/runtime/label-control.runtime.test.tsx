/**
 * A press on a `Label` moves native focus to its control (plan `749`).
 *
 * The bug guarded: `docs/label.mdx` said a label "cannot move focus to another
 * element", so every form's visible name was inert to the pointer. These cases
 * press the painted name and description of a real label in the real renderer;
 * without the activation wiring, focus stays on the sentinel in each of them.
 * The label is a pointer affordance only — it never becomes a tab stop, and the
 * control's own `label` is still its accessible name.
 */

import { type RefObject, createRef } from "react";
import type { PublicInstance } from "@gpuix/react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { TestElement } from "@gpuix/react/testing";
import { Button } from "../src/components/Button.js";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import { Stack } from "../src/components/Stack.js";
import type { Runtime } from "../src/testing/runtime.js";
import { openWindow, Surface } from "./fixture.js";

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "nothing");

/** The painted `<text>` run with exactly this string. */
const textRun = (runtime: Runtime, text: string): TestElement =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.type === "text" && element.text === text,
    ),
    () => expect.fail(`no painted text run reads ${JSON.stringify(text)}`),
  );

const pressName = (runtime: Runtime, text: string): void =>
  runtime.clickElement(textRun(runtime, text));

const fieldRef = (): RefObject<PublicInstance | null> =>
  createRef<PublicInstance>();

it("a press on the name focuses its control", async () => {
  const runtime = await openWindow();
  const email = fieldRef();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Button testId="sentinel">Before</Button>
        <Label testId="label" control={email}>
          Email
        </Label>
        <Input testId="email" label="Email" ref={email} />
      </Stack>
    </Surface>,
  );
  runtime.flush();
  // Put focus somewhere else first, so the assertion cannot pass by default.
  runtime.keyDown("sentinel", "a");
  expect(focused(runtime)).toBe("sentinel");

  pressName(runtime, "Email");
  expect(focused(runtime)).toBe("email");
});

it("a press on the description is the same target", async () => {
  const runtime = await openWindow();
  const email = fieldRef();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Button testId="sentinel">Before</Button>
        <Label
          testId="label"
          control={email}
          description="Shown on invitations"
        >
          Email
        </Label>
        <Input testId="email" label="Email" ref={email} />
      </Stack>
    </Surface>,
  );
  runtime.flush();
  runtime.keyDown("sentinel", "a");

  pressName(runtime, "Shown on invitations");
  expect(focused(runtime)).toBe("email");
});

it("the whole label box is the target", async () => {
  const runtime = await openWindow();
  const email = fieldRef();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Button testId="sentinel">Before</Button>
        <Label testId="label" control={email}>
          Email
        </Label>
        <Input testId="email" label="Email" ref={email} />
      </Stack>
    </Surface>,
  );
  runtime.flush();
  runtime.keyDown("sentinel", "a");

  // The label is full width; its centre is the empty space beside the name.
  runtime.click("label");
  expect(focused(runtime)).toBe("email");
});

it("a label without a control moves nothing", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Button testId="sentinel">Before</Button>
        <Label testId="label">Email</Label>
        <Input testId="email" label="Email" />
      </Stack>
    </Surface>,
  );
  runtime.flush();
  runtime.keyDown("sentinel", "a");

  pressName(runtime, "Email");
  expect(focused(runtime)).toBe("sentinel");
});

it("a ref that names nothing is a no-op", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Button testId="sentinel">Before</Button>
        <Label testId="label" control={fieldRef()}>
          Email
        </Label>
      </Stack>
    </Surface>,
  );
  runtime.flush();
  runtime.keyDown("sentinel", "a");

  pressName(runtime, "Email");
  expect(focused(runtime)).toBe("sentinel");
});

it("the label is never a tab stop", async () => {
  const runtime = await openWindow();
  const email = fieldRef();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Button testId="sentinel">Before</Button>
        <Label testId="label" control={email}>
          Email
        </Label>
        <Input testId="email" label="Email" ref={email} />
      </Stack>
    </Surface>,
  );
  runtime.flush();
  runtime.keyDown("sentinel", "a");

  runtime.focusNext();
  expect(focused(runtime)).toBe("email");
});

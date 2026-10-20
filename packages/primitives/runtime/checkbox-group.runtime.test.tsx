/**
 * `CheckboxGroup` in the real GPUix runtime.
 *
 * What only the renderer can show: a press anywhere on the row (including the
 * empty space and the label) toggles it, the select-all parent derives
 * all / some / none over the options a user can actually toggle, a disabled
 * option neither joins nor leaves the parent's selection, the rows are the tab
 * stops, and the error border and focus ring land on the box.
 *
 * The state channel is `aria-valuetext` because 0.10.0 has no `aria-checked`
 * (plan 020 §1.4).
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { Stack } from "../src/components/Stack.js";
import { a11yValueOf, type Runtime } from "../src/testing/index.js";
import { Surface, awaitFrame, openWindow, testTheme } from "./fixture.js";

const channels = [
  { value: "email", label: "Email", description: "A digest." },
  { value: "push", label: "Push" },
] as const;

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "nothing");

/** The painted style of the box inside a row. */
const boxStyle = (runtime: Runtime, testId: string): Record<string, unknown> =>
  Option.getOrElse(
    Option.flatMap(runtime.element(testId), (row) =>
      Option.flatMap(Option.fromNullishOr(row.children[0]), (id) =>
        Option.fromNullishOr(runtime.renderer.getElement(id)?.style),
      ),
    ),
    () => expect.fail(`the row ${testId} painted no box`),
  );

it("toggles on a press anywhere on the row, label included", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup testId="cg" label="Channels" options={channels} />
    </Surface>,
  );
  // The centre of the row is the label column, not the box: a checkbox row is
  // one hit target, which is what makes the visible label real.
  runtime.click("cg-email");
  expect(announced(runtime, "Email")).toBe("checked");
  runtime.click("cg-email");
  expect(announced(runtime, "Email")).toBe("unchecked");
});

it("derives the select-all parent's all / some / none state and clears it again", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="cg"
        label="Channels"
        selectAll="All channels"
        options={channels}
        defaultValue={["email"]}
      />
    </Surface>,
  );
  expect(announced(runtime, "All channels")).toBe("mixed");
  runtime.click("cg-all");
  expect(announced(runtime, "All channels")).toBe("checked");
  expect(announced(runtime, "Email")).toBe("checked");
  expect(announced(runtime, "Push")).toBe("checked");
  runtime.click("cg-all");
  expect(announced(runtime, "All channels")).toBe("unchecked");
  expect(announced(runtime, "Email")).toBe("unchecked");
  expect(announced(runtime, "Push")).toBe("unchecked");
});

it("never clears a disabled option's value through select-all", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="cg"
        label="Channels"
        selectAll="All channels"
        options={[
          { value: "email", label: "Email" },
          { value: "push", label: "Push" },
          { value: "sms", label: "SMS", disabled: true },
        ]}
        defaultValue={["sms"]}
      />
    </Surface>,
  );
  expect(announced(runtime, "All channels")).toBe("unchecked");
  runtime.click("cg-all");
  expect(announced(runtime, "All channels")).toBe("checked");
  expect(announced(runtime, "SMS")).toBe("checked");
  runtime.click("cg-all");
  expect(announced(runtime, "All channels")).toBe("unchecked");
  expect(announced(runtime, "SMS")).toBe("checked");
});

it("toggles on Space up and Enter down, and ignores a held key", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup testId="cg" label="Channels" options={channels} />
    </Surface>,
  );
  runtime.keyDown("cg-email", "space");
  expect(announced(runtime, "Email")).toBe("unchecked");
  runtime.keyUp("cg-email", "space");
  expect(announced(runtime, "Email")).toBe("checked");
  runtime.keyDown("cg-push", "enter");
  expect(announced(runtime, "Push")).toBe("checked");
  runtime.keyDown("cg-push", "enter", true);
  expect(announced(runtime, "Push")).toBe("checked");
});

it("refuses a disabled row and walks past it with Tab", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        <CheckboxGroup
          testId="cg"
          label="Channels"
          options={[
            { value: "email", label: "Email" },
            { value: "push", label: "Push" },
            { value: "sms", label: "SMS", disabled: true },
          ]}
        />
        <Button testId="after">After</Button>
      </Stack>
    </Surface>,
  );
  runtime.click("cg-sms");
  expect(announced(runtime, "SMS")).toBe("unchecked");
  runtime.click("before");
  runtime.focusNext();
  expect(focused(runtime)).toBe("cg-email");
  runtime.focusNext();
  expect(focused(runtime)).toBe("cg-push");
  runtime.focusNext();
  expect(focused(runtime)).toBe("after");
});

it("paints the error border on the empty boxes and the ring on the focused one", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="cg"
        label="Channels"
        options={channels}
        defaultValue={["email"]}
        invalid
      />
    </Surface>,
  );
  expect(boxStyle(runtime, "cg-email").borderColor).toBe(
    testTheme.colors.primary,
  );
  expect(boxStyle(runtime, "cg-push").borderColor).toBe(
    testTheme.colors.destructive,
  );
  runtime.keyDown("cg-push", "enter");
  runtime.flush();
  await awaitFrame(
    () => boxStyle(runtime, "cg-push").boxShadow !== undefined,
    "the focused checkbox row paints its ring",
  );
  expect(focused(runtime)).toBe("cg-push");
  expect(boxStyle(runtime, "cg-push").boxShadow).toBeDefined();
});

/**
 * A visible label inside a standalone `Checkbox` and `Switch`, in the real
 * runtime.
 *
 * The bug these guard (plan 740): both controls documented that a `Label`
 * beside them is cosmetic — not clickable and not associated, because GPUix
 * 0.10.0 has no `aria-labelledby`. The data-driven groups already solve this by
 * making the row the control. With a text child, a standalone control is now
 * that same row: one accessibility node, one tab stop and one hit area, with
 * the box/track as its decoration. Without children the old tree is unchanged.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Tooltip } from "../src/components/Tooltip.js";
import { a11yValueOf, type Runtime } from "../src/testing/index.js";
import { awaitFrame, openWindow, Surface } from "./fixture.js";

/** What the node with this name announces, or a failure naming it. */
const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "nothing");

/** The painted style of the box/track inside a labelled control. */
const childStyle = (
  runtime: Runtime,
  testId: string,
): Record<string, unknown> =>
  Option.getOrElse(
    Option.flatMap(runtime.element(testId), (row) =>
      Option.flatMap(Option.fromNullishOr(row.children[0]), (id) =>
        Option.fromNullishOr(runtime.renderer.getElement(id)?.style),
      ),
    ),
    () => expect.fail(`the control ${testId} painted no box or track`),
  );

it("toggles a labelled Checkbox from a press on its visible text", async () => {
  // The press lands on the row's centre — the text column, not the box — which
  // is exactly the area that used to be inert.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox testId="c">Email notifications</Checkbox>
    </Surface>,
  );
  expect(announced(runtime, "Email notifications")).toBe("unchecked");
  expect(runtime.allText()).toContain("Email notifications");
  runtime.click("c");
  expect(announced(runtime, "Email notifications")).toBe("checked");
  runtime.click("c");
  expect(announced(runtime, "Email notifications")).toBe("unchecked");
});

it("reaches a labelled Checkbox once in the tab order, and toggles on Space", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Checkbox testId="c">Email notifications</Checkbox>
        <Button testId="next" label="Continue">
          Continue
        </Button>
      </Stack>
    </Surface>,
  );
  runtime.focusNext();
  expect(focused(runtime)).toBe("c");
  expect(runtime.allText()).toContain("Email notifications");
  runtime.keyDown("c", "space");
  runtime.keyUp("c", "space");
  expect(announced(runtime, "Email notifications")).toBe("checked");
  // One stop for the whole row: the next Tab leaves it for the button.
  runtime.focusNext();
  expect(focused(runtime)).toBe("next");
});

it("paints the focus ring on a labelled Checkbox's box, not around the row", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox testId="c">Email notifications</Checkbox>
    </Surface>,
  );
  runtime.focusNext();
  await awaitFrame(
    () => childStyle(runtime, "c").boxShadow !== undefined,
    "the box paints the focus ring",
  );
  expect(childStyle(runtime, "c").boxShadow).toBeDefined();
  const rowRing = Option.flatMap(runtime.element("c"), (row) =>
    Option.flatMap(
      Option.fromNullishOr(runtime.renderer.getElement(row.id)?.style),
      (style) => Option.fromNullishOr(style.boxShadow),
    ),
  );
  expect(Option.isNone(rowRing)).toBe(true);
});

it("refuses a press and leaves the tab order while a labelled Checkbox is disabled", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Checkbox testId="c" disabled>
          Email notifications
        </Checkbox>
        <Button testId="next" label="Continue">
          Continue
        </Button>
      </Stack>
    </Surface>,
  );
  runtime.click("c");
  expect(announced(runtime, "Email notifications")).toBe("unchecked");
  expect(runtime.allText()).toContain("Email notifications");
  runtime.focusNext();
  expect(focused(runtime)).toBe("next");
});

it("toggles a labelled Switch from its visible text and announces the state", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Switch testId="s">Pause all notifications</Switch>
    </Surface>,
  );
  expect(announced(runtime, "Pause all notifications")).toBe("unchecked");
  expect(runtime.allText()).toContain("Pause all notifications");
  runtime.click("s");
  expect(announced(runtime, "Pause all notifications")).toBe("checked");
});

it("keeps a labelled Checkbox a Tooltip trigger", async () => {
  // The row still forwards the slot contract: the tip opens on the focused
  // host, and the text stays the control's name.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="Account email" side="bottom" testId="tip">
        <Checkbox testId="c">Email notifications</Checkbox>
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await awaitFrame(
    () => runtime.allText().includes("Account email"),
    "the tip paints",
  );
  expect(focused(runtime)).toBe("c");
  expect(announced(runtime, "Email notifications")).toBe("unchecked");
  expect(runtime.allText()).toContain("Email notifications");
});

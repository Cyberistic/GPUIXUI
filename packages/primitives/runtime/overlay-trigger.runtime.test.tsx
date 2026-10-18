/**
 * A slot trigger: the button family inside a `Tooltip`, in the real runtime.
 *
 * GPUix's `TooltipTrigger` composes with `asChild`, which **clones** the child
 * with its event handlers and `aria-description` (`@gpuix/react@0.10.0`,
 * `renderSlot`). A React component boundary drops any prop it does not declare,
 * so before plan 341 the documented example — a `Tooltip` around a `Button` —
 * painted no tip on hover and none on keyboard focus. Every existing tooltip
 * test used a raw `<div>`, which is why the class of bug was invisible.
 *
 * These cases guard the component half of the slot contract: the injected
 * handlers reach the host element, the component still owns its focus ring and
 * activation, and the tip's string reaches the accessibility tree.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { IconButton } from "../src/components/IconButton.js";
import { Toggle } from "../src/components/Toggle.js";
import { Tooltip } from "../src/components/Tooltip.js";
import { a11yNode } from "../src/testing/index.js";
import { openWindow, Surface } from "./fixture.js";

const TIP = "A hint";

/** Whether the open tip's text is painted in the current frame. */
const tipPainted = (text: ReadonlyArray<string>): boolean => text.includes(TIP);

it("opens a Tooltip on hover when its trigger is a Button", async () => {
  // The bug guarded (plan 341): `onMouseEnter` was cloned onto the `Button`
  // component, which declared no such prop, so the tip never opened.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  expect(tipPainted(runtime.allText())).toBe(false);
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on keyboard focus when its trigger is a Button", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("closes a hovered Tooltip when its Button trigger is clicked", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
  runtime.click("target");
  expect(tipPainted(runtime.allText())).toBe(false);
});

it("opens a Tooltip on hover when its trigger is an IconButton", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <IconButton testId="target" icon="x" label="Close" />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("opens a Tooltip on hover when its trigger is a Toggle", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Toggle testId="target" label="Bold">
          Bold
        </Toggle>
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("announces a Tooltip as a Button trigger's description", async () => {
  // The same slot passes `aria-description`, not only events. The documented
  // example is a `Button`, so its tip must be readable while the tip is shut.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Button testId="target" label="Delete">
          Delete
        </Button>
      </Tooltip>
    </Surface>,
  );
  const trigger = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Button", label: "Delete" }),
    () => expect.fail("the Button produced no accessibility node"),
  );
  expect(trigger.aria?.description).toBe(TIP);
});

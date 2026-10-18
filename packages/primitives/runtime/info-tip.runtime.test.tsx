/**
 * `InfoTip` in the real GPUix runtime.
 *
 * The regression guarded (plan 073): `examples/basic-app` wrapped the info icon
 * in a bare `Box`, which paints no role, no name and no tab stop — the tip was
 * hover-only and invisible to assistive technology. This suite mounts the one
 * honest shape and proves the keyboard path, the description, and the ring.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { focusRing } from "@gpuixui/tokens";
import { InfoTip } from "../src/components/InfoTip.js";
import { a11yNode, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const CONTENT = "Booked revenue, net of refunds.";

const renderTip = (runtime: Runtime): void =>
  runtime.render(
    <Surface>
      <InfoTip
        content={CONTENT}
        label="Revenue definition"
        testId="trigger"
        tipTestId="tip"
      />
    </Surface>,
  );

it("opens an InfoTip on hover", async () => {
  const runtime = await openWindow();
  renderTip(runtime);
  expect(runtime.allText()).not.toContain(CONTENT);
  runtime.hover("trigger");
  expect(runtime.allText()).toContain(CONTENT);
});

it("reaches an InfoTip by keyboard, with its name and description", async () => {
  const runtime = await openWindow();
  renderTip(runtime);
  const trigger = Option.getOrElse(
    a11yNode(runtime.a11y(), {
      role: "Image",
      label: "Revenue definition",
    }),
    () => expect.fail("the trigger produced no accessibility node"),
  );
  expect(trigger.aria?.description).toBe(CONTENT);
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("trigger");
  expect(runtime.allText()).toContain(CONTENT);
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Tooltip", label: CONTENT }),
    ),
  ).toBe(true);
});

it("paints a focus ring on the trigger", async () => {
  const runtime = await openWindow();
  renderTip(runtime);
  const before = Option.flatMap(runtime.element("trigger"), (element) =>
    Option.fromNullishOr(element.style.boxShadow),
  );
  expect(before).toStrictEqual(Option.none());
  runtime.focusNext();
  const after = Option.flatMap(runtime.element("trigger"), (element) =>
    Option.fromNullishOr(element.style.boxShadow),
  );
  // The runtime reports the ring with an explicit `inset: false`, so the
  // authored value is compared field for field plus that normalisation.
  expect(Option.getOrUndefined(after)).toStrictEqual({
    ...focusRing(testTheme).boxShadow,
    inset: false,
  });
});

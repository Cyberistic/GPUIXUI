/**
 * A focusable `Surface` as a slot trigger, in the real runtime.
 *
 * The bug this guards (plan `733`): `docs/tooltip.mdx` promises that every
 * single-root focusable Tier 1 control forwards the slot contract, and a
 * labelled `Surface` with `tabIndex` is exactly one (`role="group"`, a name, a
 * tab stop). It declared no `TriggerHandlers`, so `TooltipTrigger asChild`'s
 * cloned handlers, `ref` and `aria-description` stopped at the component
 * boundary: the tip never opened and the group carried no description.
 *
 * The pointer path is measured here, not assumed: the `<img>` that owns the
 * surface's pixels fills the host, yet the runtime still delivers the slot's
 * `onMouseEnter` to the host, so a focusable surface is both a hover and a
 * keyboard trigger. A static surface has no focus path and must stay a named
 * image with no handlers.
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import { expect, it } from "vitest";
import {
  Surface as SurfacePrimitive,
  Tooltip,
  type SurfaceAdapter,
  type SurfaceBounds,
} from "../src/index.js";
import { a11yNode } from "../src/testing/index.js";
import { awaitFrame, openWindow, Surface } from "./fixture.js";

const TIP = "Revenue by region";

/** An adapter that records nothing it does not need: this suite is about the host. */
const adapter = (): SurfaceAdapter => ({
  kind: "recorder",
  create: () => Effect.void,
  resize: (_bounds: SurfaceBounds) => Effect.void,
  focus: () => Effect.void,
  blur: () => Effect.void,
  setVisible: (_visible: boolean) => Effect.void,
  setTheme: (_mode) => Effect.void,
  destroy: () => Effect.void,
});

/** Whether the open tip's text is painted in the current frame. */
const tipPainted = (text: ReadonlyArray<string>): boolean => text.includes(TIP);

it("opens a Tooltip on keyboard focus when its trigger is a Surface", async () => {
  // Without the slot contract the cloned `ref` never reaches the host, so the
  // wrapper cannot match the tracker's focused id and the tip stays shut.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <SurfacePrimitive
          adapter={adapter()}
          width={120}
          height={80}
          label="Revenue"
          tabIndex={0}
          testId="target"
        />
      </Tooltip>
    </Surface>,
  );

  runtime.focusNext();
  runtime.flush();
  await awaitFrame(() => tipPainted(runtime.allText()), "the tip paints");

  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { label: "Revenue" }),
    () => expect.fail("the Surface produced no accessibility node"),
  );
  expect(node.aria?.description).toBe(TIP);
});

it("opens a Tooltip on hover when its trigger is a Surface", async () => {
  // Measured: the full-size image does not swallow the pointer — the runtime
  // delivers the slot's `onMouseEnter` to the host, so a surface is both a
  // hover and a keyboard trigger.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <SurfacePrimitive
          adapter={adapter()}
          width={120}
          height={80}
          label="Revenue"
          tabIndex={0}
          testId="target"
        />
      </Tooltip>
    </Surface>,
  );

  runtime.hover("target");
  runtime.flush();
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("leaves a static Surface a named image that is not a trigger", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <SurfacePrimitive
          adapter={adapter()}
          width={120}
          height={80}
          label="Revenue"
          testId="target"
        />
      </Tooltip>
    </Surface>,
  );

  runtime.focusNext();
  runtime.hover("target");
  runtime.flush();
  expect(Option.isNone(runtime.focused())).toBe(true);
  expect(tipPainted(runtime.allText())).toBe(false);
});

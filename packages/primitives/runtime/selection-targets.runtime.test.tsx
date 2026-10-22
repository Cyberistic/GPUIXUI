/**
 * The press target of the standalone selection controls, in the real runtime.
 *
 * A checkbox draws at an icon step (16px at `md`) and a switch track is one
 * icon-height tall, so each was its own press box — under the 24px floor WCAG
 * 2.2 SC 2.5.8 states. Two measured rules make the larger target safe:
 *
 * 1. **The drawing is decoration.** A painted element owns a mouse-blocking
 *    hitbox (`style.rs` `should_occlude`), so the box or track is drawn with
 *    `pointerEvents: "none"`; the press falls through to the target that owns
 *    the role, the focus and the ring. Its `hover` refinement still paints —
 *    `pointerEvents: "none"` removes the blocking, not the element's hitbox.
 * 2. **The padding is not a second activation.** The target owns the only press
 *    handler, so a press on the drawing and a press on the padding each report
 *    exactly one change.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { expect, it } from "vitest";
import { targetSize } from "@gpuixui/tokens";
import { Checkbox } from "../src/components/Checkbox.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { type Bounds, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

it("toggles a Checkbox from its padding and its drawing exactly once each", async () => {
  // The bugs this guards: the icon-sized box was its own press target, and a
  // second handler on the padding would make one press toggle twice (back to
  // where it started).
  const runtime = await openWindow();
  let changes = 0;
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox
          testId="check"
          label="Agree"
          checked={false}
          onCheckedChange={() => {
            changes += 1;
          }}
        />
      </Stack>
    </Surface>,
  );
  const target = boundsOf(runtime, "check");
  expect(target.width).toBeGreaterThanOrEqual(targetSize.minimum);
  expect(target.height).toBeGreaterThanOrEqual(targetSize.minimum);

  // The drawing is the icon-sized square centred in the target: this point is
  // inside the target and outside the drawing.
  runtime.clickAt(target.x + 2, target.y + 2);
  runtime.flush();
  expect(changes).toBe(1);

  runtime.clickAt(target.x + target.width / 2, target.y + target.height / 2);
  runtime.flush();
  expect(changes).toBe(2);
});

it("toggles a Switch from its padding and its track exactly once each", async () => {
  const runtime = await openWindow();
  let changes = 0;
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch
          testId="toggle"
          label="Dark mode"
          checked={false}
          onCheckedChange={() => {
            changes += 1;
          }}
        />
      </Stack>
    </Surface>,
  );
  const target = boundsOf(runtime, "toggle");
  expect(target.height).toBeGreaterThanOrEqual(targetSize.minimum);
  expect(target.width).toBeGreaterThan(testTheme.iconSize.md);

  // The track is one icon-height tall, centred in the target: this point is the
  // band above it.
  runtime.clickAt(target.x + target.width / 2, target.y + 2);
  runtime.flush();
  expect(changes).toBe(1);

  runtime.clickAt(target.x + target.width / 2, target.y + target.height / 2);
  runtime.flush();
  expect(changes).toBe(2);
});

it("paints an empty box's and track's edge in the measured boundary role", async () => {
  // The bug this guards: the empty edge was the `input` role, which is a field
  // *fill* in this system — `#FFFFFF` on a `#FFFFFF` card in the light theme
  // (1.00:1), so an unchecked box drawn its whole resting state invisibly. The
  // declared colour is read back off the mounted window, not off the recipe.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="check" label="Agree" />
        <Switch testId="toggle" label="Notify" />
      </Stack>
    </Surface>,
  );
  const edges = Arr.map(
    Arr.filter(
      runtime.all(),
      (element) => element.style.borderColor !== undefined,
    ),
    (element) => element.style.borderColor,
  );
  expect(edges).toStrictEqual([
    testTheme.colors.borderStrong,
    testTheme.colors.borderStrong,
  ]);
});

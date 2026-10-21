/**
 * `Switch`'s slide in the real GPUix runtime.
 *
 * The bug this suite guards: the thumb was positioned by the track's
 * `justifyContent`, which the runtime cannot animate, so the knob jumped. It is
 * now an absolutely positioned child placed by its `left` inset, and the
 * component hands that value to `motion` as the animation target.
 *
 * Only a running frame can show the difference: the declared element tree says
 * "animate to 14", and this measures that the paint is still at the resting
 * offset before the motion clock moves and at the far offset after it. It also
 * pins the geometry the slide depends on — the knob stays inside the pill in
 * both states.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Switch } from "../src/components/Switch.js";
import { Stack } from "../src/components/Stack.js";
import { switchThumbInset, switchThumbTravel } from "../src/core/selection.js";
import type { Bounds, Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

/**
 * The track inside the switch's press target.
 *
 * The `testId` addresses the target — the element with the role, the focus and
 * the ring — and the track is the first child it draws.
 */
const trackElement = (runtime: Runtime) => {
  const target = Option.getOrElse(runtime.element("s"), () =>
    expect.fail("the runtime retained no switch"),
  );
  return Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(target.children[0]), (id) =>
      Option.fromNullishOr(runtime.renderer.getElement(id)),
    ),
    () => expect.fail("the switch drew no track"),
  );
};

/** The track's painted box, failing when it painted none. */
const trackOf = (runtime: Runtime): Bounds =>
  Option.getOrElse(runtime.boundsOfId(trackElement(runtime).id), () =>
    expect.fail("the switch painted no track"),
  );

/** The thumb's painted box: the track's only painted child. */
const thumbOf = (runtime: Runtime): Bounds => {
  const thumb = trackElement(runtime).children[0];
  return Option.getOrElse(
    thumb === undefined ? Option.none() : runtime.boundsOfId(thumb),
    () => expect.fail("the switch painted no thumb"),
  );
};

const spec = { state: "checked", size: "md", accent: "primary" } as const;

it("slides the thumb to the far edge when the state changes", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Switch testId="s" label="Airplane mode" />
    </Surface>,
  );
  const rest = thumbOf(runtime);
  const travel = switchThumbTravel(spec, testTheme);
  // `left` is measured from the padding box, so the painted offset from the
  // track's own edge is the inset plus its border.
  const inset = switchThumbInset(testTheme) + testTheme.borderWidth.thin;
  expect(rest.x).toBe(trackOf(runtime).x + inset);

  runtime.click("s");
  runtime.flush();
  // The click commits the new motion target; the paint is still at rest.
  expect(thumbOf(runtime).x).toBe(rest.x);

  runtime.renderer.clockFastForward(300);
  runtime.flush();
  expect(thumbOf(runtime).x).toBe(rest.x + travel);
});

it("keeps the knob's gap to each edge equal in both states", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Switch testId="s" label="Airplane mode" />
    </Surface>,
  );
  const gaps = (): readonly [number, number] => {
    const track = trackOf(runtime);
    const thumb = thumbOf(runtime);
    return [thumb.x - track.x, track.x + track.width - (thumb.x + thumb.width)];
  };
  const inside = (): boolean => {
    const track = trackOf(runtime);
    const thumb = thumbOf(runtime);
    return (
      thumb.x >= track.x &&
      thumb.x + thumb.width <= track.x + track.width &&
      thumb.y >= track.y &&
      thumb.y + thumb.height <= track.y + track.height
    );
  };
  expect(inside()).toBe(true);
  const rest = gaps();
  runtime.click("s");
  runtime.renderer.clockFastForward(300);
  runtime.flush();
  expect(inside()).toBe(true);
  // The checked knob mirrors the resting one: the same edge gap, on the other
  // side. A travel computed without the borders leaves them unequal.
  expect(gaps()).toEqual([rest[1], rest[0]]);
  expect(rest[0]).toBe(
    testTheme.borderWidth.thin + switchThumbInset(testTheme),
  );
});

it("paints the track's checked fill and leaves it at rest when disabled", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch testId="s" label="Airplane mode" />
      </Stack>
    </Surface>,
  );
  const fill = (): unknown => trackElement(runtime).style["backgroundColor"];
  expect(fill()).toBe(testTheme.colors.muted);
  runtime.click("s");
  runtime.renderer.clockFastForward(300);
  runtime.flush();
  expect(fill()).toBe(testTheme.colors.primary);
});

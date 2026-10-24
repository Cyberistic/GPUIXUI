/**
 * `Switch`'s slide in the real GPUix runtime.
 *
 * The bug this suite guards: the thumb was positioned by the track's
 * `justifyContent`, which the runtime cannot animate, so the knob jumped. It is
 * now an absolutely positioned child placed by its `left` inset, and the
 * component hands that value to `motion` as the animation target.
 *
 * Only a running frame can show the difference: the declared element tree says
 * "animate to 14", and this measures that the paint has not reached the far
 * offset before the motion clock moves (a frame may already have advanced it a
 * fraction under load) and is exactly there after it. It also pins the geometry
 * the slide depends on — the knob stays inside the pill in both states.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { MotionProvider } from "@gpuixui/motion/react";
import { Switch } from "../src/components/Switch.js";
import { Stack } from "../src/components/Stack.js";
import {
  switchThumbInset,
  switchThumbTravel,
  switchBox,
} from "../src/core/selection.js";
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
  // `left` is measured from the padding box while the authored inset is from
  // the track's outer edge, so the painted offset is the inset itself.
  const inset = switchThumbInset(spec, testTheme);
  expect(rest.x).toBe(trackOf(runtime).x + inset);

  runtime.click("s");
  runtime.flush();
  // The click commits the new motion target. The animation may already have
  // advanced a fraction of a pixel by the time the frame is read under load, so
  // the property is "has not arrived", not "exactly at rest" — an instant jump
  // (no motion) paints the far edge in this very frame and fails here.
  const afterClick = thumbOf(runtime).x;
  expect(afterClick).toBeGreaterThanOrEqual(rest.x);
  expect(afterClick).toBeLessThan(rest.x + travel);

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
  expect(rest[0]).toBe(switchThumbInset(spec, testTheme));
});

it("centres the knob between the track's top and bottom edges", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Switch testId="s" label="Airplane mode" />
    </Surface>,
  );
  const track = trackOf(runtime);
  const thumb = thumbOf(runtime);
  const top = thumb.y - track.y;
  const bottom = track.y + track.height - (thumb.y + thumb.height);
  // `top` is measured from the padding box exactly as `left` is, so the painted
  // gap includes the border on each side: a top computed on the border box
  // leaves the knob one border-width high and the bottom gap too small.
  const box = switchBox(spec.size, testTheme);
  const centred =
    testTheme.borderWidth.thin + (box.height - box.border * 2 - box.knob) / 2;
  expect(top).toBe(bottom);
  expect(top).toBe(centred);
});

it("lands the thumb at once under the provider's reduced preference", async () => {
  // The bug guarded: every animated primitive defaulted its own `reducedMotion`
  // to false, so an app that wrapped its tree in the library's one
  // `MotionProvider` still animated a switch unless it repeated the flag on
  // every instance. This switch is given no prop at all; the first case in the
  // file is the negative control, where the same click-frame read is still
  // short of the far edge.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <MotionProvider preference="reduced">
        <Switch testId="s" label="Airplane mode" />
      </MotionProvider>
    </Surface>,
  );
  const rest = thumbOf(runtime);
  const travel = switchThumbTravel(spec, testTheme);

  runtime.click("s");
  runtime.flush();

  expect(thumbOf(runtime).x).toBe(rest.x + travel);
});

it("paints the edge a platform switch declares", async () => {
  // The bug guarded: the seam decoded a declared switch table and rebuilt it
  // from the three fills, dropping `edge`. Windows' off track is `transparent`
  // with a 1px rim, so the window painted a white knob on nothing — the whole
  // control vanished — and macOS's rim shadow went with it. `core/selection`
  // pins both styles; this reads the style the window actually applied.
  const runtime = await openWindow();
  runtime.render(
    <Surface theme={platformTheme(lightTheme, "win32")}>
      <Switch testId="s" label="Airplane mode" />
    </Surface>,
  );
  const track = trackElement(runtime).style;
  expect(track["backgroundColor"]).toBe("transparent");
  expect(track["borderColor"]).toBe("#8A8A8A");

  runtime.render(
    <Surface theme={platformTheme(lightTheme, "darwin")}>
      <Switch testId="s" label="Airplane mode" />
    </Surface>,
  );
  // The runtime states every shadow field, so the expectation names the ones
  // the edge paints and lets the renderer fill the rest (`inset: false`).
  expect(trackElement(runtime).style["boxShadow"]).toMatchObject({
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: 1,
    color: "#C7C7CC",
  });
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

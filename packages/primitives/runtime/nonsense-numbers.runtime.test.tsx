/**
 * A public number that cannot be painted must never reach the paint.
 *
 * **The bug this file guards (plan 371).** Four primitives passed a caller's
 * number straight into layout or text: `NumberField min={NaN}` painted the
 * string "NaN" and suppressed every step (the painted value was NaN, so the
 * no-op guard swallowed the report), an inverted `min`/`max` collapsed to the
 * maximum (`min=100 max=0` painted "0" for 150), `step={Infinity}` painted
 * "Infinity", an `Icon size={NaN}` lost its width and height (a 0-high mark
 * stretched across the window), a `Spinner size={NaN}` painted a 0-high row,
 * and a `Skeleton height={NaN}` painted 0 high. Each is now total: an unusable
 * length falls back to the prop's documented default, a bound that is not a
 * number is ignored, and an inverted pair is swapped like every slider's.
 *
 * One window per test, as `fixture.tsx` requires; the style walk reads the
 * renderer's own retained tree rather than a decoded element.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { Icon } from "@gpuixui/icons";
import { Box } from "../src/components/Box.js";
import { Grid } from "../src/components/Stack.js";
import { NumberField } from "../src/components/NumberField.js";
import { Skeleton } from "../src/components/Skeleton.js";
import { Spinner } from "../src/components/Spinner.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const inputOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(
    Option.flatMap(runtime.element(testId), (element) =>
      Option.flatMap(Option.fromNullishOr(element.children[0]), (id) =>
        Option.fromNullishOr(runtime.renderer.getElement(id)),
      ),
    ),
    () => expect.fail(`the NumberField ${testId} painted no input`),
  );

/** Every numeric value a style carried in the last frame, by element and key. */
const numericStyles = (
  runtime: Runtime,
): ReadonlyArray<{
  readonly id: number;
  readonly key: string;
  readonly value: number;
}> =>
  Arr.flatMap(runtime.all(), (element) =>
    Arr.flatMap(R.toEntries(element.style), ([key, value]) =>
      typeof value === "number" ? [{ id: element.id, key, value }] : [],
    ),
  );

it("never paints a number the runtime cannot draw", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Icon
        name="check"
        color={testTheme.colors.primary}
        size={Number.POSITIVE_INFINITY}
      />
      <Spinner size={Number.NaN} />
      <Skeleton height={Number.NaN} />
      <Grid columns={Number.NaN}>
        <Box tone="card" style={{ width: 40, height: 20 }} />
        <Box tone="card" style={{ width: 40, height: 20 }} />
      </Grid>
    </Surface>,
  );
  const nonsense = Arr.filter(
    numericStyles(runtime),
    (entry) => !Number.isFinite(entry.value),
  );
  expect(nonsense).toEqual([]);
  const negative = Arr.filter(
    numericStyles(runtime),
    (entry) =>
      (entry.key === "width" || entry.key === "height") && entry.value < 0,
  );
  expect(negative).toEqual([]);
});

it("paints the fallback the component documents", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Icon
        name="check"
        color={testTheme.colors.primary}
        size={Number.NaN}
        testId="icon"
      />
      <Spinner size={Number.NaN} testId="spinner" />
      <Skeleton height={Number.NaN} testId="skeleton" />
    </Surface>,
  );
  const icon = boundsOf(runtime, "icon");
  // A named size is a square on the 24-grid; the default is `md`.
  expect(icon.width).toBe(testTheme.iconSize.md);
  expect(icon.height).toBe(testTheme.iconSize.md);
  expect(boundsOf(runtime, "spinner").height).toBe(testTheme.iconSize.md);
  expect(boundsOf(runtime, "skeleton").height).toBe(
    testTheme.typography.body.lineHeight,
  );
});

it("never paints NaNs for a bound or a step it cannot read", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <NumberField
        testId="nan-min"
        label="NaN minimum"
        min={Number.NaN}
        defaultValue={5}
      />
      <NumberField
        testId="nan-max"
        label="NaN maximum"
        max={Number.NaN}
        defaultValue={5}
      />
      <NumberField
        testId="inverted"
        label="Inverted"
        min={100}
        max={0}
        defaultValue={150}
      />
      <NumberField
        testId="inf-step"
        label="Infinite step"
        step={Number.POSITIVE_INFINITY}
        defaultValue={5}
      />
    </Surface>,
  );
  const painted = runtime.paintedText();
  expect(painted).not.toContain("NaN");
  expect(painted).not.toContain("Infinity");
  // A non-finite bound is absent, so the value is painted as it was given; an
  // inverted pair is swapped, so 150 takes the range's top.
  expect(painted).toStrictEqual(["5", "5", "100", "5"]);
});

it("steps an inverted field inside the swapped range", async () => {
  const runtime = await openWindow();
  const values: number[] = [];
  runtime.render(
    <Surface>
      <NumberField
        testId="inverted"
        label="Inverted"
        min={100}
        max={0}
        defaultValue={150}
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  const input = inputOf(runtime, "inverted");
  runtime.renderer.nativeSimulateKeyDown(input.id, "down");
  expect(values).toStrictEqual([99]);
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(values).toStrictEqual([99, 100]);
});

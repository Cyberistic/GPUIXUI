/**
 * Reading a mounted frame's paint: the colour helpers every theme suite shares.
 *
 * `theme.runtime.test.tsx` proves the two palettes and the switch;
 * `theme-axes.runtime.test.tsx` proves high contrast, density and platform type.
 * Both ask the same question — "what colour did this element apply, and is it a
 * member of the active palette?" — so the query lives here rather than twice.
 */

import { expect } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { Runtime } from "../src/testing/index.js";

/** The applied style of the element with `testId`, as the runtime holds it. */
export const styleOf = (
  runtime: Runtime,
  testId: string,
): Readonly<Record<string, unknown>> =>
  Option.getOrElse(
    Option.map(runtime.element(testId), (element) => element.style),
    () => expect.fail(`the runtime retained no ${testId}`),
  );

/** The painted value of one style property, failing when it is absent. */
export const painted = (
  runtime: Runtime,
  testId: string,
  property: string,
): string =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(styleOf(runtime, testId)[property]),
      (value) => Option.fromNullishOr(typeof value === "string" ? value : null),
    ),
    () => expect.fail(`${testId} painted no ${property}`),
  );

/** A 6- or 8-digit hex colour, the only shape the palette produces. */
export const isColour = (value: string): boolean =>
  /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);

/** The RGB part of a palette entry, so a lifted-alpha colour still matches. */
export const rgbOf = (colour: string): string =>
  colour.slice(0, 7).toUpperCase();

/** Every colour-shaped value the tree applied, in element order. */
export const paintedColours = (runtime: Runtime): ReadonlyArray<string> =>
  Arr.flatMap(runtime.all(), (element) =>
    Arr.map(
      Arr.filter(
        R.values(element.style),
        (value): value is string =>
          typeof value === "string" && isColour(value),
      ),
      rgbOf,
    ),
  );

import { expect } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { Runtime } from "./harness.js";

export const styleOf = (
  runtime: Runtime,
  testId: string,
): Readonly<Record<string, unknown>> =>
  Option.getOrElse(
    Option.map(runtime.element(testId), (element) => element.style),
    () => expect.fail(`the runtime retained no ${testId}`),
  );

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

export const isColour = (value: string): boolean =>
  /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);

export const rgbOf = (colour: string): string =>
  colour.slice(0, 7).toUpperCase();

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

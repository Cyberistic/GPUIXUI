/**
 * A computed `Progress` percentage, announced and painted.
 *
 * **The bug guarded (plan `755`).** `Progress`'s only accessibility channel is
 * `aria-valuetext` (0.10.0 has no `aria-valuenow`), and the renderer
 * interpolated the clamped percentage raw. A caller feeding the normal computed
 * value — `(loaded / total) * 100` — therefore announced
 * `"33.333333333333336%"`, a nineteen-character float spoken on every progress
 * tick. The fix rounds the *sentence* and leaves the fill's geometry exact, so
 * this file asserts both halves: a rounded AccessKit value and a one-third
 * painted fill. Rounding the paint, or reverting the announcement, fails here.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Progress } from "../src/components/Progress.js";
import { a11yValueOf, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

/** The child elements of `testId`, in order. */
const childrenOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(
    Option.map(runtime.element(testId), (element) => element.children),
    () => expect.fail(`the runtime retained no ${testId}`),
  );

it("announces a computed Progress as a whole percent and paints its fraction", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" value={100 / 3} label="Uploading" />
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Uploading" })).toEqual(
    Option.some("33%"),
  );
  const track = Option.getOrElse(runtime.bounds("pg"), () =>
    expect.fail("the Progress painted no track"),
  );
  const fill = Option.getOrElse(
    Option.flatMap(Arr.head(childrenOf(runtime, "pg")), (id) =>
      runtime.boundsOfId(id),
    ),
    () => expect.fail("the Progress painted no fill"),
  );
  expect(Math.abs(fill.width - track.width / 3)).toBeLessThanOrEqual(1);
});

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
 *
 * **The seam (plan `780`).** A bar that stands for a quantity announces the
 * caller's sentence instead — `"3 of 10 files"` — while an indeterminate bar
 * keeps `"loading"`; both are asserted against the real AccessKit tree.
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

it("announces the caller's sentence for a Progress that counts something", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress
        testId="pg"
        value={42}
        label="Copying files"
        formatValue={() => "3 of 10 files"}
      />
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Copying files" })).toEqual(
    Option.some("3 of 10 files"),
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
  expect(Math.abs(fill.width - track.width * 0.42)).toBeLessThanOrEqual(1);
});

it("keeps an indeterminate Progress's announcement as loading", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress
        testId="pg"
        label="Preparing"
        formatValue={() => "not a value"}
      />
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Preparing" })).toEqual(
    Option.some("loading"),
  );
});

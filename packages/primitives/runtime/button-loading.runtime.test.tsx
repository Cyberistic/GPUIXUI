/**
 * A busy `Button`'s spinner in the real GPUix runtime.
 *
 * The bug guarded (plan 754): the default `Spinner` lights its dot with
 * `colors.primary`, which is exactly a primary button's fill, so the one dot
 * that carries the animation was invisible and the busy indicator read as a
 * moving hole. `Button` now passes the variant's foreground to the spinner;
 * this case reads the painted fill and every painted dot, so the assertion is
 * about contrast and not about a prop value.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { TestElement } from "@gpuix/react/testing";
import { Button } from "../src/components/Button.js";
import type { Runtime } from "../src/testing/index.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const idOf = (runtime: Runtime, testId: string): number =>
  Option.getOrElse(
    Option.map(runtime.element(testId), (element) => element.id),
    () => expect.fail(`the runtime retained no ${testId}`),
  );

const styleOf = (
  runtime: Runtime,
  id: number,
): Readonly<Record<string, unknown>> =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(runtime.renderer.getElement(id)),
      (element) => element.style,
    ),
    () => expect.fail(`element ${id} vanished`),
  );

const childrenOf = (runtime: Runtime, id: number): ReadonlyArray<number> =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(runtime.renderer.getElement(id)),
      (element: TestElement) => element.children,
    ),
    () => expect.fail(`element ${id} vanished`),
  );

it("paints a busy Button's spinner in the variant foreground", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="busy" loading label="Saving" />
    </Surface>,
  );
  const button = styleOf(runtime, idOf(runtime, "busy"));
  expect(button["backgroundColor"]).toBe(testTheme.colors.primary);
  const spinnerId = Option.getOrElse(
    Arr.head(childrenOf(runtime, idOf(runtime, "busy"))),
    () => expect.fail("the Button painted no spinner"),
  );
  const dots = childrenOf(runtime, spinnerId);
  expect(Arr.length(dots)).toBe(3);
  Arr.forEach(dots, (id) => {
    expect(styleOf(runtime, id)["backgroundColor"]).toBe(
      testTheme.colors.primaryForeground,
    );
  });
});

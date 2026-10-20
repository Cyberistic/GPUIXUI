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
import { IconButton } from "../src/components/IconButton.js";
import { Spinner } from "../src/components/Spinner.js";
import { a11yNodes, type Runtime } from "../src/testing/index.js";
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

it("does not add a second Loading status inside a busy control", async () => {
  // The bug guarded (plan 785): the spinner published `Status: Loading` as a
  // child of a button whose description already said "Loading", so one action
  // reached assistive technology as two nodes saying the same thing. The
  // standalone spinner is still a status and still carries its own name.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="busy" loading>
        Saving
      </Button>
      <IconButton testId="icon-busy" icon="check" label="Apply" loading />
      <Spinner testId="standalone" label="Standalone" />
    </Surface>,
  );
  const nodes = a11yNodes(runtime.a11y());
  const statuses = nodes.filter((node) => node.aria?.role === "Status");
  expect(statuses).toHaveLength(1);
  expect(statuses[0]?.aria?.label).toBe("Standalone");

  const button = nodes.find((node) => node.aria?.label === "Saving");
  expect(button?.aria?.role).toBe("Button");
  expect(button?.aria?.description).toBe("Loading");
  const iconButton = nodes.find((node) => node.aria?.label === "Apply");
  expect(iconButton?.aria?.role).toBe("Button");
  expect(iconButton?.aria?.description).toBe("Loading");
});

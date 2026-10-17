/**
 * The loading indicators in the real GPUix runtime.
 *
 * These are the components the capability map forces to be *discrete*: the
 * runtime's `motion` animates opacity, width and insets and nothing else, so a
 * skeleton pulses opacity and a spinner advances a lit dot instead of rotating
 * (plan 020 §1.2/§1.6). That makes them the components a resolver test cannot
 * judge at all: whether the step actually moves the pixels is only observable in
 * a running frame, so this suite samples the frame over real time.
 *
 * The step is advanced by a React interval, not by GPUI's clock, so the timer
 * here is a real one (`fixture.tsx`'s `sleep`) and the assertion is "both states
 * were painted", which cannot flake the way a single timed sample would.
 */

import { expect, it } from "vitest";
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Progress } from "../src/components/Progress.js";
import { Skeleton } from "../src/components/Skeleton.js";
import { Spinner } from "../src/components/Spinner.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNode, a11yValueOf, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

/** The child elements of `testId`, in order. */
const childrenOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(
    Option.map(runtime.element(testId), (element) => element.children),
    () => expect.fail(`the runtime retained no ${testId}`),
  );

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

/**
 * Read `read()` `samples` times, ~100 ms apart, flushing the frame between.
 *
 * A sampled set rather than one timed reading: the step is a JS interval, so a
 * single sample would be a race with the timer. Both states being painted is
 * what the component promises, and it cannot flake.
 */
const sample = <A,>(
  runtime: Runtime,
  read: () => A,
  samples: number,
): Promise<ReadonlyArray<A>> =>
  Effect.runPromise(
    Effect.forEach(
      Arr.range(0, Math.max(0, samples - 1)),
      (index) =>
        Effect.map(
          index === 0
            ? Effect.void
            : Effect.andThen(
                Effect.sleep(Duration.millis(100)),
                Effect.sync(() => runtime.flush()),
              ),
          () => read(),
        ),
      { concurrency: 1 },
    ),
  );

it("announces a determinate Progress's value as a percentage", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" value={42} label="Uploading" />
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Uploading" })).toEqual(
    Option.some("42%"),
  );
  expect(
    Option.isSome(a11yNode(runtime.a11y(), { role: "ProgressIndicator" })),
  ).toBe(true);
});

it("fills a determinate Progress to its value", async () => {
  const runtime = await openWindow();
  const widths = async (
    value: number,
  ): Promise<{ readonly track: number; readonly fill: number }> => {
    runtime.render(
      <Surface>
        <Progress testId="pg" value={value} />
      </Surface>,
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
    return { track: track.width, fill: fill.width };
  };
  const full = await widths(100);
  expect(full.fill).toBe(full.track);
  expect((await widths(0)).fill).toBe(0);
  const partial = await widths(42);
  expect(partial.fill).toBeGreaterThan(0);
  expect(partial.fill).toBeLessThan(partial.track);
});

it("clamps a Progress value outside 0–100", async () => {
  const runtime = await openWindow();
  const announced = async (value: number): Promise<string> => {
    runtime.render(
      <Surface>
        <Progress testId="pg" value={value} label="Uploading" />
      </Surface>,
    );
    return Option.getOrElse(
      a11yValueOf(runtime.a11y(), { label: "Uploading" }),
      () => expect.fail("the Progress announced no value"),
    );
  };
  expect(await announced(140)).toBe("100%");
  expect(await announced(-5)).toBe("0%");
});

it("moves an indeterminate Progress's segment over time", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" label="Uploading" />
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Uploading" })).toEqual(
    Option.some("loading"),
  );
  const offsets = await sample(
    runtime,
    () => {
      const lead = Arr.head(childrenOf(runtime, "pg"));
      return Option.getOrUndefined(
        Option.flatMap(lead, (id) =>
          Option.fromNullishOr(styleOf(runtime, id)["width"]),
        ),
      );
    },
    6,
  );
  expect(new Set(offsets).size).toBeGreaterThan(1);
});

it("pulses a Skeleton's opacity between both of its states", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Skeleton testId="sk" width={100} height={20} />
    </Surface>,
  );
  const opacities = await sample(
    runtime,
    () => String(styleOf(runtime, idOf(runtime, "sk"))["opacity"]),
    9,
  );
  expect(new Set(opacities).size).toBeGreaterThan(1);
  expect(
    Arr.every(opacities, (value) => value === "1" || value === "0.6"),
  ).toBe(true);
});

it("moves a Spinner's lit dot instead of rotating it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Spinner testId="sp" label="Working" />
      </Stack>
    </Surface>,
  );
  const dots = childrenOf(runtime, "sp");
  // The lit dot is the one painted with the accent role; the runtime cannot
  // rotate, so the dot index is the whole animation.
  const litIndex = (): number =>
    Option.getOrElse(
      Arr.findFirstIndex(
        dots,
        (id) =>
          styleOf(runtime, id)["backgroundColor"] === testTheme.colors.primary,
      ),
      () => expect.fail("no Spinner dot took the accent role"),
    );
  const indexes = await sample(runtime, litIndex, 5);
  expect(new Set(indexes).size).toBeGreaterThan(1);
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Status", label: "Working" }),
    ),
  ).toBe(true);
});

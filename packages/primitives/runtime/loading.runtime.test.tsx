/**
 * The loading indicators in the real GPUix runtime.
 *
 * These are the components the capability map forces to be *discrete*: the
 * runtime's `motion` animates opacity, width and insets and nothing else, so a
 * skeleton pulses opacity and a spinner advances a lit dot instead of rotating
 * (see `docs/gpuix-capabilities.md`). That makes them the components a resolver test cannot
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
import { Button } from "../src/components/Button.js";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "../src/components/Progress.js";
import { Skeleton } from "../src/components/Skeleton.js";
import { Spinner } from "../src/components/Spinner.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import { useStep } from "../src/components/internal.js";
import { a11yNode, a11yValueOf, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

/** The child elements of `testId`, in order. */
const childrenOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(
    Option.map(runtime.element(testId), (element) => element.children),
    () => expect.fail(`the runtime retained no ${testId}`),
  );

/** The child element ids of an element by id. */
const childrenOfId = (runtime: Runtime, id: number) =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(runtime.renderer.getElement(id)),
      (element) => element.children,
    ),
    () => expect.fail(`element ${id} vanished`),
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
    // The root is the frame; the bar is its only child, the fill the bar's.
    const trackId = Option.getOrElse(Arr.head(childrenOf(runtime, "pg")), () =>
      expect.fail("the Progress painted no track"),
    );
    const fillId = Option.getOrElse(
      Arr.head(childrenOfId(runtime, trackId)),
      () => expect.fail("the Progress painted no fill"),
    );
    const track = Option.getOrElse(runtime.boundsOfId(trackId), () =>
      expect.fail("the Progress painted no track box"),
    );
    const fill = Option.getOrElse(runtime.boundsOfId(fillId), () =>
      expect.fail("the Progress painted no fill box"),
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

it("paints a Progress's held-ahead buffer in the gap it reports", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" value={40} buffer={70} />
    </Surface>,
  );
  const trackId = Option.getOrElse(Arr.head(childrenOf(runtime, "pg")), () =>
    expect.fail("the Progress painted no track"),
  );
  const segments = childrenOfId(runtime, trackId);
  const segmentId = (index: number): number =>
    Option.getOrElse(Arr.get(segments, index), () =>
      expect.fail(`the Progress painted no segment ${index}`),
    );
  const boxOf = (id: number) =>
    Option.getOrElse(runtime.boundsOfId(id), () =>
      expect.fail("the Progress painted no segment box"),
    );
  const track = boxOf(trackId);
  const fill = boxOf(segmentId(0));
  const bufferId = segmentId(1);
  const buffer = boxOf(bufferId);
  // The fill is the value's share; the buffer is the segment after it, ending
  // at the buffer's own share.
  expect(Math.abs(fill.width - track.width * 0.4)).toBeLessThan(2);
  expect(Math.abs(buffer.x - (track.x + track.width * 0.4))).toBeLessThan(2);
  expect(Math.abs(buffer.width - track.width * 0.3)).toBeLessThan(2);
  // Painted in the mark role the indicator contract measures on the track.
  expect(styleOf(runtime, bufferId)["backgroundColor"]).toBe(
    testTheme.colors.mutedForeground,
  );
});

it("paints a caller's Progress composition from the same resolved state", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" value={50} label="Uploading">
        <ProgressTrack testId="track">
          <ProgressIndicator testId="fill" />
        </ProgressTrack>
      </Progress>
    </Surface>,
  );
  // The parts read the root's context in the real renderer: a part wired to
  // the wrong state would paint at the wrong width or not at all.
  const track = Option.getOrElse(runtime.bounds("track"), () =>
    expect.fail("the composed track painted no box"),
  );
  const fill = Option.getOrElse(runtime.bounds("fill"), () =>
    expect.fail("the composed indicator painted no box"),
  );
  expect(Math.abs(fill.width - track.width / 2)).toBeLessThan(2);
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
  // The **painted** position of the moving fill is the measure, not the lead's
  // declared width: the track used to lay its segments out as blocks, so the
  // lead's width changed every step while the fill stayed pinned at the start
  // of the bar and the motion was invisible.
  const offsets = await sample(
    runtime,
    () => {
      const track = Arr.head(childrenOf(runtime, "pg"));
      const fill = Option.flatMap(track, (id) =>
        Option.fromNullishOr(childrenOfId(runtime, id)[1]),
      );
      return Option.getOrUndefined(
        Option.flatMap(fill, (id) =>
          Option.map(runtime.boundsOfId(id), (box) => box.x),
        ),
      );
    },
    6,
  );
  expect(new Set(offsets).size).toBeGreaterThan(1);
  // The moving fill is inside the track, not clipped below it.
  const trackBox = Option.getOrElse(
    Option.flatMap(Arr.head(childrenOf(runtime, "pg")), runtime.boundsOfId),
    () => expect.fail("the Progress painted no track"),
  );
  expect(offsets.every((x) => x === undefined || x >= trackBox.x)).toBe(true);
});

it("paints an indeterminate Progress in its own tone", async () => {
  // The bug guarded: the moving segment ignored the tone and painted the
  // primary role, so a destructive task looked like a neutral one until the
  // value arrived.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" label="Uploading" tone="destructive" />
    </Surface>,
  );
  const track = Option.getOrElse(Arr.head(childrenOf(runtime, "pg")), () =>
    expect.fail("the Progress painted no track"),
  );
  // The indeterminate track holds a lead segment and then the fill.
  const fill = childrenOfId(runtime, track)[1];
  expect(fill).toBeDefined();
  expect(styleOf(runtime, fill ?? -1)["backgroundColor"]).toBe(
    testTheme.colors.destructive,
  );
});

/** Shows the step a counter is on, so a running timer is visible. */
const StepProbe = ({ running }: { readonly running: boolean }) => {
  const step = useStep(4, 60, running);
  return <Text testId="probe">{String(step)}</Text>;
};

it("keeps a step counter still while it is not running", async () => {
  // The bug guarded: the determinate bar ran the step timer for a segment it
  // never paints, waking the tree every interval for nothing.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <StepProbe running={false} />
    </Surface>,
  );
  const steps = await sample(
    runtime,
    () => Option.getOrElse(runtime.text("probe"), () => ""),
    5,
  );
  expect(new Set(steps)).toStrictEqual(new Set(["0"]));
});

it("advances a step counter while it is running", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <StepProbe running={true} />
    </Surface>,
  );
  const steps = await sample(
    runtime,
    () => Option.getOrElse(runtime.text("probe"), () => ""),
    6,
  );
  expect(new Set(steps).size).toBeGreaterThan(1);
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
  // Every dot takes the accent and the trail fades through opacity, so the lit
  // dot is the opaque one. The runtime cannot rotate: the index is the whole
  // animation.
  expect(
    Arr.every(
      dots,
      (id) =>
        styleOf(runtime, id)["backgroundColor"] === testTheme.colors.primary,
    ),
  ).toBe(true);
  const litIndex = (): number =>
    Option.getOrElse(
      Arr.findFirstIndex(dots, (id) => styleOf(runtime, id)["opacity"] === 1),
      () => expect.fail("no Spinner dot is fully opaque"),
    );
  const indexes = await sample(runtime, litIndex, 5);
  expect(new Set(indexes).size).toBeGreaterThan(1);
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Status", label: "Working" }),
    ),
  ).toBe(true);
});

it("holds every indicator still when the reader asked for less motion", async () => {
  // The bug guarded: `@gpuix/native` exposes no reduced-motion preference, so
  // nothing passed one down and all three timed indicators kept waking the
  // tree and moving — a reader who asked not to see motion saw it anyway.
  // The frames a running interval would change are the skeleton's opacity, the
  // spinner's dot opacities and the indeterminate bar's lead width.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Skeleton testId="sk" width={100} height={20} reducedMotion />
        <Spinner testId="sp" label="Working" reducedMotion />
        <Progress testId="pg" label="Uploading" reducedMotion />
      </Stack>
    </Surface>,
  );
  const progressLeadWidth = (): string => {
    const track = Arr.head(childrenOf(runtime, "pg"));
    const lead = Option.flatMap(track, (id) =>
      Arr.head(childrenOfId(runtime, id)),
    );
    const width = Option.flatMap(lead, (id) =>
      Option.fromNullishOr(styleOf(runtime, id)["width"]),
    );
    return Option.match(width, {
      onNone: () => "none",
      onSome: (value) => String(value),
    });
  };
  const frame = (): string =>
    [
      String(styleOf(runtime, idOf(runtime, "sk"))["opacity"]),
      Arr.map(childrenOf(runtime, "sp"), (id) =>
        String(styleOf(runtime, id)["opacity"]),
      ).join(","),
      progressLeadWidth(),
    ].join("|");
  const frames = await sample(runtime, frame, 6);
  expect(new Set(frames).size).toBe(1);
  // ...and each one is still an indicator rather than an empty box: three dots
  // in the status row and a segment inside the track.
  expect(childrenOf(runtime, "sp")).toHaveLength(3);
  expect(progressLeadWidth()).not.toBe("none");
});

it("moves a disabled busy button's spinner onto the neutral pair", async () => {
  // The bug guarded: a disabled filled action paints `disabled` behind
  // `disabledForeground`, but the spinner kept the action's on-colour — white
  // dots on the light theme's neutral fill, an indicator that vanishes.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="disabled-btn" variant="primary" loading disabled>
        Save
      </Button>
    </Surface>,
  );
  const spinner =
    childrenOf(runtime, "disabled-btn")[0] ?? expect.fail("no spinner");
  expect(
    Arr.map(
      childrenOfId(runtime, spinner),
      (id) => styleOf(runtime, id)["backgroundColor"],
    ),
  ).toEqual([
    testTheme.colors.disabledForeground,
    testTheme.colors.disabledForeground,
    testTheme.colors.disabledForeground,
  ]);
});

it("paints a loading button's spinner in its fill's on-colour", async () => {
  // The bug guarded: a busy brand button rendered a brand spinner on its own
  // brand fill (1.00:1), so the indicator vanished exactly where it mattered.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="primary-btn" variant="primary" loading>
          Save
        </Button>
        <Button testId="secondary-btn" variant="secondary" loading>
          Save
        </Button>
      </Stack>
    </Surface>,
  );
  const dotColours = (testId: string): ReadonlyArray<unknown> => {
    const spinner = childrenOf(runtime, testId)[0] ?? expect.fail("no spinner");
    return Arr.map(
      childrenOfId(runtime, spinner),
      (id) => styleOf(runtime, id)["backgroundColor"],
    );
  };
  expect(dotColours("primary-btn")).toEqual([
    testTheme.colors.primaryForeground,
    testTheme.colors.primaryForeground,
    testTheme.colors.primaryForeground,
  ]);
  expect(dotColours("secondary-btn")).toEqual([
    testTheme.colors.secondaryForeground,
    testTheme.colors.secondaryForeground,
    testTheme.colors.secondaryForeground,
  ]);
});

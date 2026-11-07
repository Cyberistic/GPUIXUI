import { expect, it } from "vitest";
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Box } from "../src/components/Box.js";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
  type ProgressProps,
} from "../src/components/Progress.js";
import { Meter } from "../src/components/Meter.js";
import { Skeleton } from "../src/components/Skeleton.js";
import { Spinner } from "../src/components/Spinner.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import { useStep } from "../src/components/internal.js";
import type { RadiusStep } from "../src/core/theme.js";
import {
  a11yDescriptionOf,
  a11yNode,
  a11yNodes,
  a11yValueOf,
  type Runtime,
} from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const childrenOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(
    Option.map(runtime.element(testId), (element) => element.children),
    () => expect.fail(`the runtime retained no ${testId}`),
  );

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

const widthOf = (runtime: Runtime, testId: string): number =>
  Option.getOrElse(
    Option.map(runtime.bounds(testId), (bounds) => bounds.width),
    () => expect.fail(`the runtime painted no box for ${testId}`),
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

it("says a Progress's share in the caller's words in a window", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress
        testId="pg"
        value={42}
        label="Uploading"
        formatValue={(percent) => `${percent}% uploaded`}
      >
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
        <ProgressValue testId="pg-value" />
      </Progress>
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Uploading" })).toEqual(
    Option.some("42% uploaded"),
  );
  expect(runtime.text("pg-value")).toEqual(Option.some("42% uploaded"));
});

it("keeps a Progress's own words when its formatter says nothing", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" value={42} label="Uploading" formatValue={() => ""}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
        <ProgressValue testId="pg-value" />
      </Progress>
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Uploading" })).toEqual(
    Option.some("42%"),
  );
  expect(runtime.text("pg-value")).toEqual(Option.some("42%"));

  runtime.render(
    <Surface>
      <Progress testId="pg" label="Uploading" loadingText="  " />
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Uploading" })).toEqual(
    Option.some("loading"),
  );
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

  expect(Math.abs(fill.width - track.width * 0.4)).toBeLessThan(2);
  expect(Math.abs(buffer.x - (track.x + track.width * 0.4))).toBeLessThan(2);
  expect(Math.abs(buffer.width - track.width * 0.3)).toBeLessThan(2);

  expect(styleOf(runtime, bufferId)["backgroundColor"]).toBe(
    testTheme.colors.mutedForeground,
  );
});

it("paints a muted bar's held share in a role its fill does not use", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" value={20} buffer={80} tone="muted" />
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
  const fill = styleOf(runtime, segmentId(0))["backgroundColor"];
  const buffer = styleOf(runtime, segmentId(1))["backgroundColor"];
  expect(fill).toBe(testTheme.colors.mutedForeground);
  expect(buffer).toBe(testTheme.colors.borderStrong);
  expect(buffer).not.toBe(fill);
});

it("paints no caption line for a Progress label that arrived blank", async () => {
  const runtime = await openWindow();
  const composed = (label: string) => (
    <Surface>
      <Progress testId="pg" value={42} label={label}>
        <ProgressTrack testId="track">
          <ProgressIndicator />
        </ProgressTrack>
        <ProgressLabel testId="caption" />
      </Progress>
    </Surface>
  );
  runtime.render(composed("   "));
  expect(runtime.bounds("caption")).toStrictEqual(Option.none());
  expect(runtime.allText()).not.toContain("   ");
  runtime.render(composed("Uploading"));
  expect(runtime.allText()).toContain("Uploading");
});

it("keeps a Progress's stored label for a caption child that says nothing", async () => {
  const runtime = await openWindow();
  const composed = (label: string, child: string) => (
    <Surface>
      <Progress testId="pg" value={42} label={label}>
        <ProgressTrack testId="track">
          <ProgressIndicator />
        </ProgressTrack>
        <ProgressLabel testId="caption">{child}</ProgressLabel>
      </Progress>
    </Surface>
  );
  runtime.render(composed("Uploading", "   "));
  expect(runtime.allText()).toContain("Uploading");
  expect(runtime.allText()).not.toContain("   ");

  runtime.render(composed("  ", "   "));
  expect(runtime.bounds("caption")).toStrictEqual(Option.none());

  runtime.render(composed("Uploading", "Saving"));
  expect(runtime.allText()).toContain("Saving");
  expect(runtime.allText()).not.toContain("Uploading");
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

  const trackBox = Option.getOrElse(
    Option.flatMap(Arr.head(childrenOf(runtime, "pg")), runtime.boundsOfId),
    () => expect.fail("the Progress painted no track"),
  );
  expect(offsets.every((x) => x === undefined || x >= trackBox.x)).toBe(true);
});

it("reads a stored Progress share it cannot read as absence, not as NaN%", async () => {
  const runtime = await openWindow();

  const stored = { value: "half" } as unknown as ProgressProps;
  runtime.render(
    <Surface>
      <Progress testId="pg" label="Uploading" {...stored} />
    </Surface>,
  );
  const wordOf = (): string =>
    Option.getOrElse(a11yValueOf(runtime.a11y(), { label: "Uploading" }), () =>
      expect.fail("the Progress announced no value"),
    );
  expect(wordOf()).toBe("loading");
  const fillOffsets = await sample(
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
  expect(new Set(fillOffsets).size).toBeGreaterThan(1);

  runtime.render(
    <Surface>
      <Progress testId="pg" value={40} label="Uploading" />
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Uploading" })).toEqual(
    Option.some("40%"),
  );
});

it("announces an indeterminate Progress in the caller's word", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" label="Uploading" loadingText="Chargement" />
    </Surface>,
  );
  expect(a11yValueOf(runtime.a11y(), { label: "Uploading" })).toEqual(
    Option.some("Chargement"),
  );
});

it("paints an indeterminate Progress in its own tone", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" label="Uploading" tone="destructive" />
    </Surface>,
  );
  const track = Option.getOrElse(Arr.head(childrenOf(runtime, "pg")), () =>
    expect.fail("the Progress painted no track"),
  );

  const fill = childrenOfId(runtime, track)[1];
  expect(fill).toBeDefined();
  expect(styleOf(runtime, fill ?? -1)["backgroundColor"]).toBe(
    testTheme.colors.destructive,
  );
});

const StepProbe = ({ running }: { readonly running: boolean }) => {
  const step = useStep(4, 60, running);
  return <Text testId="probe">{String(step)}</Text>;
};

it("keeps a step counter still while it is not running", async () => {
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

it("paints a skeleton's blank side as the default box, not as nothing", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <Skeleton testId="blank" width="" height={20} />
        <Skeleton testId="plain" height={20} />
      </Stack>
    </Surface>,
  );
  const blank = widthOf(runtime, "blank");
  const plain = widthOf(runtime, "plain");
  expect(plain).toBeGreaterThan(0);
  expect(blank).toBe(plain);
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

it("measures and names a status leaf where it is painted", async () => {
  const runtime = await openWindow();
  const boxes: Array<{ width: number; height: number }> = [];
  const refs: Array<number> = [];
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Skeleton
          testId="placeholder"
          height={24}
          ref={(instance) => {
            Option.match(Option.fromNullishOr(instance), {
              onNone: () => {},
              onSome: (held) => refs.push(held.id),
            });
          }}
          onLayout={(event) =>
            boxes.push({ width: event.width ?? 0, height: event.height ?? 0 })
          }
        />
        <Progress
          testId="upload"
          label="Upload"
          value={40}
          aria-id="upload-bar"
        />
        <Meter
          testId="disk"
          label="Disk"
          value={4}
          max={8}
          aria-id="disk-meter"
        />
        <Spinner testId="busy" label="Working" aria-id="busy-dot" />
      </Stack>
    </Surface>,
  );
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  const painted = Option.getOrElse(runtime.bounds("placeholder"), () =>
    expect.fail("the runtime painted no box for the placeholder"),
  );

  expect(Option.getOrUndefined(Arr.last(boxes))).toStrictEqual({
    width: painted.width,
    height: painted.height,
  });
  expect(painted.height).toBe(24);
  const held = Option.getOrElse(Arr.head(refs), () =>
    expect.fail("the skeleton's ref never ran"),
  );
  expect(
    Option.map(runtime.element("placeholder"), (element) => element.id),
  ).toStrictEqual(Option.some(held));

  const addressed = (role: string, label: string): string | undefined =>
    Option.getOrElse(a11yNode(runtime.a11y(), { role, label }), () =>
      expect.fail(`the runtime painted no ${role} named ${label}`),
    ).aria?.author_id;
  expect(addressed("ProgressIndicator", "Upload")).toBe("upload-bar");
  expect(addressed("Meter", "Disk")).toBe("disk-meter");
  expect(addressed("Status", "Working")).toBe("busy-dot");
});

it("leaves no unnamed status node for a silent spinner", async () => {
  const runtime = await openWindow();
  const statusLabels = (): ReadonlyArray<string | undefined> =>
    Arr.map(
      Arr.filter(
        a11yNodes(runtime.a11y()),
        (node) => node.aria?.role === "Status",
      ),
      (node) => node.aria?.label,
    );
  runtime.render(
    <Surface>
      <Spinner testId="named" label="Working" />
    </Surface>,
  );
  expect(statusLabels()).toEqual(["Working"]);
  runtime.render(
    <Surface>
      <Spinner testId="silent" label="" />
    </Surface>,
  );
  expect(statusLabels()).toEqual([]);
  runtime.render(
    <Surface>
      <Button testId="silent-busy" loading loadingLabel="">
        Save
      </Button>
    </Surface>,
  );
  expect(statusLabels()).toEqual([]);
  expect(
    a11yDescriptionOf(runtime.a11y(), { role: "Button", label: "Save" }),
  ).toEqual(Option.none());

  runtime.render(
    <Surface>
      <Button testId="named-busy" loading>
        Save
      </Button>
    </Surface>,
  );
  expect(statusLabels()).toEqual(["Loading"]);
});

it("paints a Skeleton box when a measured side cannot be laid out", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Skeleton testId="sk" width={Number.NaN} height={20} reducedMotion />
      </Stack>
    </Surface>,
  );
  const drawn = Option.getOrElse(runtime.bounds("sk"), () =>
    expect.fail("the runtime painted no skeleton"),
  );
  expect(drawn.width).toBeGreaterThan(0);
  expect(drawn.height).toBe(20);
});

it("paints the corner a stored radius name documents in a window", async () => {
  const stored = "xl2" as RadiusStep;
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Skeleton testId="sk" radius={stored} reducedMotion />
        <Box testId="bx" tone="card" radius={stored} />
      </Stack>
    </Surface>,
  );
  expect(styleOf(runtime, idOf(runtime, "sk"))["borderRadius"]).toBe(
    testTheme.radius.sm,
  );
  expect(styleOf(runtime, idOf(runtime, "bx"))["borderRadius"]).toBeUndefined();
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

  expect(childrenOf(runtime, "sp")).toHaveLength(3);
  expect(progressLeadWidth()).not.toBe("none");
});

it("moves a disabled busy button's spinner onto the neutral pair", async () => {
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

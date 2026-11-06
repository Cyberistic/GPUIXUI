import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle, type Theme } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { Button, RadioGroup, RadioGroupItem } from "@gpuixui/primitives";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale } from "./frame.js";
import {
  RADIO_CHOICES,
  RADIO_COLUMN,
  RADIO_IDS,
  RADIO_NONE,
  RADIO_OFF_CHOICES,
  RADIO_PLAN_CHOICES,
  RADIO_PLAN_VALUE,
  RADIO_SKIP_AFTER,
  RADIO_SKIP_CHOICES,
  RADIO_SKIP_INITIAL,
  fieldOf,
  isDiscWidth,
  isRingWidth,
  planReadout,
  radioReadout,
  radioRowId,
  selectionInk,
  type RadioChoice,
} from "./radio-group.js";

const SETTLE = Duration.millis(120);

const REST = "radio-rest";
const RING = "radio-ring";
const CHOICE = "radio-choice";

const Group = ({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xs,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {title}
      </text>
      {children}
    </div>
  );
};

const choiceRow =
  (group: string, theme: Theme) =>
  (choice: RadioChoice): ReactNode => (
    <RadioGroupItem
      key={choice.value}
      value={choice.value}
      label={choice.label}
      disabled={choice.disabled}
    >
      <text
        testId={radioRowId(group, choice.value)}
        style={{
          ...textStyle(theme, "label"),
          color: theme.colors.foreground,
        }}
      >
        {choice.label}
      </text>
    </RadioGroupItem>
  );

export const RadioGroupProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [pointer, setPointer] = useState("");
  const [pointerReports, setPointerReports] = useState(0);
  const [keys, setKeys] = useState("");
  const [keyReports, setKeyReports] = useState(0);
  const [skip, setSkip] = useState(RADIO_SKIP_INITIAL);
  const [skipReports, setSkipReports] = useState(0);
  const [offReports, setOffReports] = useState(0);
  const [planLast, setPlanLast] = useState(RADIO_NONE);
  const [planReports, setPlanReports] = useState(0);
  const width = RADIO_COLUMN;

  return (
    <div
      testId={RADIO_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          width: window.width - theme.spacing.xl * 2,
          color: theme.colors.foreground,
        }}
      >
        A radio group: a press or an arrow chooses one row, the whole group is
        one Tab stop, and the choice paints a primary disc while keyboard focus
        paints the ring around its row.
      </text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.lg,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          }}
        >
          <Group title="Pointer">
            <RadioGroup
              label="Pointer"
              testId={RADIO_IDS.pointer}
              value={pointer}
              style={{ width }}
              onValueChange={(next) => {
                setPointer(next);
                setPointerReports((count) => count + 1);
              }}
            >
              {Arr.map(RADIO_CHOICES, choiceRow("pointer", theme))}
            </RadioGroup>
          </Group>
          <Readout testId={RADIO_IDS.pointerReadout}>
            {radioReadout({ value: pointer, reports: pointerReports })}
          </Readout>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          }}
        >
          <Button testId={RADIO_IDS.before} variant="secondary" size="sm">
            Before
          </Button>
          <Group title="Keys">
            <RadioGroup
              label="Keys"
              testId={RADIO_IDS.keys}
              options={RADIO_CHOICES}
              value={keys}
              style={{ width }}
              onValueChange={(next) => {
                setKeys(next);
                setKeyReports((count) => count + 1);
              }}
            />
          </Group>
          <Readout testId={RADIO_IDS.keysReadout}>
            {radioReadout({ value: keys, reports: keyReports })}
          </Readout>
          <Button testId={RADIO_IDS.after} variant="secondary" size="sm">
            After
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          }}
        >
          <Group title="Skip">
            <RadioGroup
              label="Skip"
              testId={RADIO_IDS.skip}
              value={skip}
              style={{ width }}
              onValueChange={(next) => {
                setSkip(next);
                setSkipReports((count) => count + 1);
              }}
            >
              {Arr.map(RADIO_SKIP_CHOICES, choiceRow("skip", theme))}
            </RadioGroup>
          </Group>
          <Readout testId={RADIO_IDS.skipReadout}>
            {radioReadout({ value: skip, reports: skipReports })}
          </Readout>
          <Group title="Off">
            <RadioGroup
              label="Off"
              testId={RADIO_IDS.off}
              disabled
              style={{ width }}
              onValueChange={() => setOffReports((count) => count + 1)}
            >
              {Arr.map(RADIO_OFF_CHOICES, choiceRow("off", theme))}
            </RadioGroup>
          </Group>
          <Readout testId={RADIO_IDS.offReadout}>
            {radioReadout({ value: "", reports: offReports })}
          </Readout>
          <Group title="Declined">
            <RadioGroup
              label="Declined"
              testId={RADIO_IDS.plan}
              value={RADIO_PLAN_VALUE}
              style={{ width }}
              onValueChange={(next) => {
                setPlanLast(next);
                setPlanReports((count) => count + 1);
              }}
            >
              {Arr.map(RADIO_PLAN_CHOICES, choiceRow("plan", theme))}
            </RadioGroup>
          </Group>
          <Readout testId={RADIO_IDS.planReadout}>
            {planReadout({
              value: RADIO_PLAN_VALUE,
              last: planLast,
              reports: planReports,
            })}
          </Readout>
        </div>
      </div>
    </div>
  );
};

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<Box, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

const capture = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<
  { readonly pixels: Pixels.Pixels; readonly scale: number },
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    yield* ctx.host.capture(name);
    const pixels = yield* ctx.host.pixels(name);
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      `${name} is the window at a whole device scale`,
      captureScale(pixels, size),
    );
    return { pixels, scale } as const;
  });

const INK_PAD = 6;

const cropOf = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  box: Box,
  scale: number,
  label: string,
): Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the frame holds ${label}`,
      Option.fromNullishOr(
        Pixels.crop(
          frame,
          new Pixels.PixelRegion({
            x: Math.round((box.x - INK_PAD) * scale),
            y: Math.round((box.y - INK_PAD) * scale),
            width: Math.round((box.width + INK_PAD * 2) * scale),
            height: Math.round((box.height + INK_PAD * 2) * scale),
          }),
        ),
      ),
    );
  });

const inkIn = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  box: Box,
  scale: number,
  ink: Pixels.Rgba,
  label: string,
): Effect.Effect<
  { readonly count: number; readonly width: number },
  Smoke.SmokeAssertionError
> =>
  Effect.gen(function* () {
    const crop = yield* cropOf(ctx, frame, box, scale, label);
    const bound = Option.fromNullishOr(Pixels.boundsOfColour(crop, ink));
    return {
      count: Pixels.countColour(crop, ink),
      width: Option.getOrElse(
        Option.map(bound, (region) => region.width),
        () => 0,
      ),
    };
  });

export const radioGroupSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(RADIO_IDS.probe);
    yield* Effect.sleep(SETTLE);
    const readout = (testId: string) => ctx.host.text(testId);
    const ink = yield* ctx.expectSome(
      "the theme's primary role is paintable",
      Option.fromNullishOr(
        Pixels.hexToRgba(selectionInk(palettes.dark.colors.primary)),
      ),
    );
    const pointerBox = yield* paintedBox(ctx, RADIO_IDS.pointer);
    const keysBox = yield* paintedBox(ctx, RADIO_IDS.keys);

    yield* ctx.expectEqual(
      "the pointer group starts with no choice",
      yield* readout(RADIO_IDS.pointerReadout),
      radioReadout({ value: "", reports: 0 }),
    );
    yield* ctx.expectEqual(
      "the keys group starts with no choice",
      yield* readout(RADIO_IDS.keysReadout),
      radioReadout({ value: "", reports: 0 }),
    );
    yield* ctx.expectEqual(
      "the skip group starts on the value it was given",
      yield* readout(RADIO_IDS.skipReadout),
      radioReadout({ value: RADIO_SKIP_INITIAL, reports: 0 }),
    );
    yield* ctx.expectEqual(
      "the declined group starts on the value its owner keeps",
      yield* readout(RADIO_IDS.planReadout),
      planReadout({ value: RADIO_PLAN_VALUE, last: RADIO_NONE, reports: 0 }),
    );

    const rest = yield* capture(ctx, REST);
    yield* ctx.expectEqual(
      "an unchosen group paints no primary ink",
      (yield* inkIn(
        ctx,
        rest.pixels,
        pointerBox,
        rest.scale,
        ink,
        RADIO_IDS.pointer,
      )).count,
      0,
    );
    yield* ctx.expectEqual(
      "a group with no focus ring paints no primary ink",
      (yield* inkIn(ctx, rest.pixels, keysBox, rest.scale, ink, RADIO_IDS.keys))
        .count,
      0,
    );

    yield* ctx.host.click(radioRowId("pointer", "a1"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a row chooses it and reports once",
      yield* readout(RADIO_IDS.pointerReadout),
      radioReadout({ value: "a1", reports: 1 }),
    );
    const chosen = yield* capture(ctx, CHOICE);
    const disc = yield* inkIn(
      ctx,
      chosen.pixels,
      pointerBox,
      chosen.scale,
      ink,
      RADIO_IDS.pointer,
    );
    yield* ctx.expectEqual(
      "the chosen row paints the primary ink",
      disc.count > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a press paints the selection disc, not the keyboard ring",
      isDiscWidth(disc.width, pointerBox.width * chosen.scale),
      true,
    );
    yield* ctx.expectEqual(
      "a press on one group paints no ink in another",
      (yield* inkIn(
        ctx,
        chosen.pixels,
        keysBox,
        chosen.scale,
        ink,
        RADIO_IDS.keys,
      )).count,
      0,
    );

    yield* ctx.host.click(RADIO_IDS.before);
    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    const ring = yield* capture(ctx, RING);
    const focusInk = yield* inkIn(
      ctx,
      ring.pixels,
      keysBox,
      ring.scale,
      ink,
      RADIO_IDS.keys,
    );
    yield* ctx.expectEqual(
      "keyboard focus paints the ring around its row",
      focusInk.count > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the keyboard ring is wider than a selection disc",
      isRingWidth(focusInk.width, keysBox.width * ring.scale),
      true,
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Tab enters the group and the first arrow chooses the next row",
      yield* readout(RADIO_IDS.keysReadout),
      radioReadout({ value: "b2", reports: 1 }),
    );

    yield* ctx.host.key("g");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a typed prefix chooses the row it names",
      yield* readout(RADIO_IDS.keysReadout),
      radioReadout({ value: "g3", reports: 2 }),
    );
    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home chooses the first row",
      yield* readout(RADIO_IDS.keysReadout),
      radioReadout({ value: "a1", reports: 3 }),
    );
    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End chooses the last row",
      yield* readout(RADIO_IDS.keysReadout),
      radioReadout({ value: "d4", reports: 4 }),
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow past the last row wraps to the first",
      yield* readout(RADIO_IDS.keysReadout),
      radioReadout({ value: "a1", reports: 5 }),
    );
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Space on the chosen row reports nothing",
      yield* readout(RADIO_IDS.keysReadout),
      radioReadout({ value: "a1", reports: 5 }),
    );

    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "one Tab leaves the whole group",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "nothing",
      ),
      RADIO_IDS.after,
    );

    yield* ctx.host.click(radioRowId("skip", "s2"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled row refuses a press",
      yield* readout(RADIO_IDS.skipReadout),
      radioReadout({ value: RADIO_SKIP_INITIAL, reports: 0 }),
    );
    yield* ctx.host.click(radioRowId("skip", "s1"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "pressing the chosen row reports nothing",
      yield* readout(RADIO_IDS.skipReadout),
      radioReadout({ value: RADIO_SKIP_INITIAL, reports: 0 }),
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow steps over the disabled row",
      yield* readout(RADIO_IDS.skipReadout),
      radioReadout({ value: RADIO_SKIP_AFTER, reports: 1 }),
    );

    yield* ctx.host.click(radioRowId("off", "o1"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a disabled group reports nothing",
      yield* readout(RADIO_IDS.offReadout),
      "reports=0",
    );

    yield* ctx.host.click(radioRowId("plan", "p1"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "pressing the kept value reports nothing",
      yield* readout(RADIO_IDS.planReadout),
      planReadout({ value: RADIO_PLAN_VALUE, last: RADIO_NONE, reports: 0 }),
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the first arrow reports the row after the kept value",
      yield* readout(RADIO_IDS.planReadout),
      planReadout({ value: RADIO_PLAN_VALUE, last: "p2", reports: 1 }),
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the second arrow continues from the focused row, not the kept value",
      yield* readout(RADIO_IDS.planReadout),
      planReadout({ value: RADIO_PLAN_VALUE, last: "p3", reports: 2 }),
    );
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Space chooses the row that holds focus, not the kept value",
      yield* readout(RADIO_IDS.planReadout),
      planReadout({ value: RADIO_PLAN_VALUE, last: "p3", reports: 3 }),
    );
    yield* ctx.expectEqual(
      "the declined group still paints the value its owner kept",
      Option.isSome(fieldOf(yield* readout(RADIO_IDS.planReadout), "value")),
      true,
    );
  });

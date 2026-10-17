/**
 * `drag-targets` — pointer capture across elements and native file drops.
 *
 * A captured drag is how the split pane, the table resize and the workspace tab
 * move work, but all three keep the gesture on one element. A tab that moves
 * between panes, or a drag-and-drop target, needs to know where the gesture
 * ends and whether the element under the pointer sees hover during it. This
 * probe logs every mouse and drop event on three adjacent boxes and records the
 * measured order.
 *
 * Measured facts: plan `162` §8.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import type { Props } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

type Recorder = (entry: string) => void;

/** One box: every mouse event, and a drop handler only when `droppable`. */
const DragBox = ({
  testId,
  name,
  droppable,
  record,
}: {
  readonly testId: string;
  readonly name: string;
  readonly droppable: boolean;
  readonly record: Recorder;
}) => {
  const theme = useTheme();
  const props: Props = {
    testId,
    onMouseDown: () => record(`${name}:down`),
    onMouseMove: () => record(`${name}:move`),
    onMouseUp: () => record(`${name}:up`),
    onMouseEnter: () => record(`${name}:enter`),
    onMouseLeave: () => record(`${name}:leave`),
    onClick: () => record(`${name}:click`),
    ...(droppable
      ? {
          onFileDrop: (event) =>
            record(
              `${name}:drop:${Arr.join(event.paths ?? [], "+")}@${Math.round(event.x ?? -1)},${Math.round(event.y ?? -1)}`,
            ),
        }
      : {}),
  };
  return (
    <div
      {...props}
      style={{
        width: 100,
        height: 100,
        backgroundColor: theme.colors.muted,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    />
  );
};

const DragProbe = () => {
  const theme = useTheme();
  const [log, setLog] = useState<ReadonlyArray<string>>([]);
  const record = (entry: string): void =>
    setLog((previous) => Arr.append(previous, entry));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 60,
        }}
      >
        <DragBox testId="drag-a" name="A" droppable={false} record={record} />
        <DragBox testId="drag-b" name="B" droppable record={record} />
        <DragBox testId="drag-c" name="C" droppable={false} record={record} />
      </div>
      <Readout testId="drag-log">{Arr.join(log, ">")}</Readout>
    </div>
  );
};

/** The event log, or `""` before the first event. */
const logOf = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text("drag-log")), () => "");

/** The drop log: the entries that contain a `:drop:` payload. */
const dropsOf = (ctx: Smoke.SmokeContext): string =>
  Arr.join(
    Arr.filter(Str.split(">")(logOf(ctx)), (entry) =>
      Str.includes(":drop:")(entry),
    ),
    ">",
  );

export const dragTargetsScenario: PlaygroundScenario = {
  id: "drag-targets",
  title: "Drag targets: capture, hover edges and file drops",
  capability: "drag",
  view: () => <DragProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // A’s centre is 50 px in; B’s is 100 + 60 + 50 = 210 px in.
      ctx.host.drag("drag-a", 170, 0);
      const log = logOf(ctx);

      yield* ctx.expectContains("the press reached the source", log, "A:down");
      yield* ctx.expectContains("the source keeps the moves", log, "A:move");
      yield* ctx.expectEqual(
        "the target receives no moves during capture",
        Str.includes("B:move")(log),
        false,
      );
      yield* ctx.expectContains(
        "the gesture ends on the captured source",
        log,
        "A:up",
      );
      yield* ctx.expectEqual(
        "the element under the pointer receives no up",
        Str.includes("B:up")(log),
        false,
      );

      // Hover is the interesting half: the log is split at the up, because the
      // measurement shows whether the target saw enter while the button was down.
      const beforeUp = Option.getOrElse(
        Arr.head(Str.split("A:up")(log)),
        () => "",
      );
      const afterUp = Option.getOrElse(
        Arr.get(Str.split("A:up")(log), 1),
        () => "",
      );
      yield* ctx.expectContains(
        "the pointer entered the source before the drag",
        beforeUp,
        "A:enter",
      );
      yield* ctx.expectEqual(
        "the target gets no hover while the button is down",
        Str.includes("B:enter")(beforeUp),
        false,
      );
      yield* ctx.expectContains(
        "the target's hover settles once the gesture ends",
        afterUp,
        "B:enter",
      );
      yield* ctx.expectContains(
        "the source's leave settles once the gesture ends",
        afterUp,
        "A:leave",
      );
      yield* ctx.expectContains(
        "a captured drag still ends in a click on the source",
        log,
        "A:click",
      );

      ctx.host.fileDrop("drag-b", ["/tmp/report.png", "/tmp/data.csv"]);
      const drop = dropsOf(ctx);
      yield* ctx.expectContains(
        "the target receives both paths",
        drop,
        "B:drop:/tmp/report.png+/tmp/data.csv@",
      );
      const coordinates = Option.getOrElse(
        Arr.get(Str.split("@")(drop), 1),
        () => "",
      );
      yield* ctx.expectEqual(
        "the drop carries its window coordinates",
        Option.isSome(Str.match(/^\d+,\d+$/)(coordinates)),
        true,
      );

      ctx.host.fileDrop("drag-c", ["/tmp/ignored.png"]);
      yield* ctx.expectEqual(
        "an element without a drop handler receives no drop",
        Str.includes("C:drop")(logOf(ctx)),
        false,
      );
      yield* ctx.expectContains(
        "a dropped-on element without a handler still sees a click",
        logOf(ctx),
        "C:click",
      );

      ctx.host.click("drag-b");
      ctx.host.hover("drag-a");
      const after = logOf(ctx);
      yield* ctx.expectContains(
        "the target still receives clicks after the gesture",
        after,
        "B:click",
      );
      const afterClick = Option.getOrElse(
        Arr.get(Str.split("B:click")(after), 1),
        () => "",
      );
      yield* ctx.expectContains(
        "hover works after the gesture",
        afterClick,
        "A:enter",
      );
      yield* ctx.expectEqual(
        "the hover move still reaches the element",
        Str.endsWith("A:move")(after),
        true,
      );
    }),
};

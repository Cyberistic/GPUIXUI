import { Effect } from "effect";
import * as Option from "effect/Option";
import { examples } from "@gpuixui/data/examples";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";

const text = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(id)), () => "");

const TableExample = examples["table"];

export const dataTableScenario: ScenarioBody = {
  view: () => (TableExample === undefined ? null : <TableExample />),
  steps: (ctx) =>
    Effect.gen(function* () {
      const header = yield* ctx.expectSome(
        "the header painted",
        Option.fromNullishOr(ctx.host.bounds("files-name")),
      );
      const firstRow = yield* ctx.expectSome(
        "the first row painted",
        Option.fromNullishOr(ctx.host.bounds("files-row-file-1")),
      );
      yield* ctx.expectEqual(
        "the rows start below the header",
        firstRow.y > header.y,
        true,
      );

      ctx.host.click("files-name-sort");
      ctx.host.click("files-name-sort");
      yield* ctx.expectContains(
        "the second header press flipped the sort",
        text(ctx, "files-readout"),
        "name-desc",
      );
      const sortedFirst = yield* ctx.expectSome(
        "the descending sort painted a top row",
        Option.fromNullishOr(ctx.host.bounds("files-row-file-1")),
      );
      yield* ctx.expectEqual(
        "the unsorted first row is no longer at the top",
        sortedFirst.y > firstRow.y + 37,
        true,
      );
      const firstAfter = yield* ctx.expectSome(
        "the moved first row painted",
        Option.fromNullishOr(ctx.host.bounds("files-row-file-60")),
      );
      yield* ctx.expectNear(
        "the descending sort moved file-060 to the top edge",
        firstAfter.y,
        firstRow.y,
        1,
      );

      ctx.host.click("files-row-file-60");
      yield* ctx.expectContains(
        "the press chose the row it landed on",
        text(ctx, "files-readout"),
        "1 selected",
      );
      yield* ctx.expectEqual(
        "the chosen row paints the selection wash",
        ctx.host.paintedStyle("files-row-file-60")?.backgroundColor !==
          ctx.host.paintedStyle("files-row-file-59")?.backgroundColor,
        true,
      );
      ctx.host.click("files-name-sort");
      yield* ctx.expectContains(
        "the selection survived a re-sort",
        text(ctx, "files-readout"),
        "1 selected",
      );

      ctx.host.wheel("files-body", 0, -300);
      const scrolled = yield* ctx.expectSome(
        "the body reports a scroll offset",
        Option.fromNullishOr(ctx.host.scrollOffset("files-body")),
      );
      yield* ctx.expectEqual(
        "the wheel scrolled the rows",
        scrolled.y < 0,
        true,
      );
      const headerAfter = yield* ctx.expectSome(
        "the header still painted",
        Option.fromNullishOr(ctx.host.bounds("files-name")),
      );
      yield* ctx.expectNear(
        "the header keeps its painted position",
        headerAfter.y,
        header.y,
        1,
      );

      ctx.host.click("files-filter");
      ctx.host.key("001");
      yield* ctx.expectContains(
        "the narrower set released the hidden selection",
        text(ctx, "files-readout"),
        "1 rows · 0 selected",
      );
      yield* ctx.expectEqual(
        "a filtered-out row paints nothing",
        ctx.host.bounds("files-row-file-60") === null,
        true,
      );

      ctx.host.drag("files-divider-name", 60, 0, 8);
      yield* ctx.expectContains(
        "the drag widened the name column",
        text(ctx, "files-readout"),
        "w=320",
      );
      const widened = yield* ctx.expectSome(
        "the widened header painted",
        Option.fromNullishOr(ctx.host.bounds("files-name")),
      );
      yield* ctx.expectNear(
        "the header paints the width the drag produced",
        widened.width,
        320,
        2,
      );
      ctx.host.drag("files-divider-name", -600, 0, 8);
      yield* ctx.expectContains(
        "the drag clamps at the column's minimum",
        text(ctx, "files-readout"),
        "w=120",
      );

      ctx.host.click("files-columns");
      ctx.host.click("files-columns-toggle-status");

      yield* ctx.expectContains(
        "hiding a column takes its width out of the content",
        text(ctx, "files-readout"),
        "content=210",
      );
      yield* ctx.expectEqual(
        "the hidden column's header paints nothing",
        ctx.host.bounds("files-status") === null,
        true,
      );

      ctx.host.click("files-columns-move-size");
      ctx.host.click("files-columns-move-size-left");
      yield* ctx.expectContains(
        "the move changed the painted order",
        text(ctx, "files-readout"),
        "cols=size,name",
      );
      yield* ctx.expectContains(
        "the move kept the content width",
        text(ctx, "files-readout"),
        "content=210",
      );
    }),
};

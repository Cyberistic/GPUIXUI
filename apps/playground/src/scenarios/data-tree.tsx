import { Effect } from "effect";
import * as Option from "effect/Option";
import { examples } from "@gpuixui/data/examples";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";
import {
  DATA_TREE_COLLAPSE,
  DATA_TREE_EXPAND,
  DATA_TREE_INITIAL,
  DATA_TREE_READOUT,
  DATA_TREE_REVEAL,
  DATA_TREE_ROWS_ALL,
  DATA_TREE_ROWS_OPEN,
  dataTreeReadout,
  dataTreeRow,
} from "../live/data-tree.js";

const text = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(id)), () => "");

const readout = (rows: number, active: string): string =>
  dataTreeReadout({ rows, active: Option.some(active) });

const rowSlot = (key: string): string => `${dataTreeRow(key)}-slot`;

const TreeExample = examples["tree"];
const ExpandableRowsExample = examples["expandable-rows"];

export const dataTreeScenario: ScenarioBody = {
  view: () => (TreeExample === undefined ? null : <TreeExample />),
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the tree paints its roots and one open folder",
        text(ctx, DATA_TREE_READOUT),
        DATA_TREE_INITIAL,
      );
      yield* ctx.expectEqual(
        "the closed folder's child paints nothing",
        ctx.host.bounds(dataTreeRow("readme.md")) === null,
        true,
      );

      const parentSlot = yield* ctx.expectSome(
        "the parent's chevron slot painted",
        Option.fromNullishOr(ctx.host.bounds(rowSlot("src"))),
      );
      const childSlot = yield* ctx.expectSome(
        "the child's chevron slot painted",
        Option.fromNullishOr(ctx.host.bounds(rowSlot("components"))),
      );
      yield* ctx.expectNear(
        "a child insets 16px under its parent",
        childSlot.x - parentSlot.x,
        16,
        1,
      );

      ctx.host.click(dataTreeRow("docs"));
      yield* ctx.expectContains(
        "the press opened the folder it hit",
        text(ctx, DATA_TREE_READOUT),
        readout(7, "docs"),
      );
      yield* ctx.expectSome(
        "the opened folder's child painted",
        Option.fromNullishOr(ctx.host.bounds(dataTreeRow("readme.md"))),
      );

      ctx.host.click(dataTreeRow("readme.md"));
      yield* ctx.expectContains(
        "the press moved the cursor to the file",
        text(ctx, DATA_TREE_READOUT),
        "active=readme.md",
      );
      const focusedAfterPress = yield* ctx.expectSome(
        "a row holds native focus after the press",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "the pressed row holds native focus",
        focusedAfterPress,
        dataTreeRow("readme.md"),
      );
      ctx.host.key("down");
      yield* ctx.expectContains(
        "the arrow moved the cursor",
        text(ctx, DATA_TREE_READOUT),
        "active=guide.md",
      );
      const focusedAfterKey = yield* ctx.expectSome(
        "a row holds native focus after the key",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "the arrow moved native focus with the cursor",
        focusedAfterKey,
        dataTreeRow("guide.md"),
      );

      ctx.host.key("left");
      yield* ctx.expectContains(
        "Left stepped out to the parent folder",
        text(ctx, DATA_TREE_READOUT),
        "active=docs",
      );
      ctx.host.key("left");
      yield* ctx.expectContains(
        "Left closed the branch but kept the row",
        text(ctx, DATA_TREE_READOUT),
        readout(DATA_TREE_ROWS_OPEN, "docs"),
      );

      ctx.host.click(DATA_TREE_EXPAND);
      yield* ctx.expectContains(
        "expand all opened every branch",
        text(ctx, DATA_TREE_READOUT),
        `${DATA_TREE_ROWS_ALL} rows`,
      );

      ctx.host.click(dataTreeRow("index.ts"));
      ctx.host.key("r");
      yield* ctx.expectContains(
        "a typed prefix moved the cursor to the row it names",
        text(ctx, DATA_TREE_READOUT),
        "active=readme.md",
      );

      ctx.host.click(DATA_TREE_COLLAPSE);
      ctx.host.click(DATA_TREE_REVEAL);
      yield* ctx.expectContains(
        "the reveal moved the cursor to the deep row",
        text(ctx, DATA_TREE_READOUT),
        "active=row.tsx",
      );
      yield* ctx.expectSome(
        "the reveal opened the path, so the row paints",
        Option.fromNullishOr(ctx.host.bounds(dataTreeRow("row.tsx"))),
      );
    }),
};

export const dataExpandableRowsScenario: ScenarioBody = {
  view: () =>
    ExpandableRowsExample === undefined ? null : <ExpandableRowsExample />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the table starts with every row closed",
        text(ctx, "expandable-readout"),
        "4 files · open=",
      );

      const rowBefore = yield* ctx.expectSome(
        "a later row painted",
        Option.fromNullishOr(ctx.host.bounds("expandable-row-table")),
      );

      ctx.host.click("expandable-row-index");
      yield* ctx.expectContains(
        "the press opened the row it hit",
        text(ctx, "expandable-readout"),
        "open=index",
      );
      yield* ctx.expectContains(
        "the panel painted its own content",
        text(ctx, "expandable-detail-index"),
        "src/index.ts",
      );

      const row = yield* ctx.expectSome(
        "the opened row painted",
        Option.fromNullishOr(ctx.host.bounds("expandable-row-index")),
      );
      const panel = yield* ctx.expectSome(
        "the panel painted",
        Option.fromNullishOr(ctx.host.bounds("expandable-detail-index")),
      );
      yield* ctx.expectNear("the panel starts with its row", panel.x, row.x, 1);
      yield* ctx.expectNear(
        "the panel spans the row's content width",
        panel.width,
        row.width,
        1,
      );
      const rowAfter = yield* ctx.expectSome(
        "the later row still painted",
        Option.fromNullishOr(ctx.host.bounds("expandable-row-table")),
      );
      yield* ctx.expectNear(
        "the panel pushed the rows below it down by its height",
        rowAfter.y - rowBefore.y,
        panel.height,
        1,
      );

      ctx.host.click("expandable-kv-index-label-path");
      yield* ctx.expectContains(
        "a press on the panel kept the row open",
        text(ctx, "expandable-readout"),
        "open=index",
      );

      ctx.host.click("expandable-row-index");
      yield* ctx.expectContains(
        "the second press closed the row",
        text(ctx, "expandable-readout"),
        "4 files · open=",
      );
      yield* ctx.expectEqual(
        "the closed row's panel paints nothing",
        ctx.host.bounds("expandable-detail-index") === null,
        true,
      );
    }),
};

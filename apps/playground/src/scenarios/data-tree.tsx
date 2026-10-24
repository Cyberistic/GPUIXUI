/**
 * Tier 3 probes: the shipped `@gpuixui/data` tree and expandable row, mounted
 * from their examples.
 *
 * The package behaviour suites own the paint in the offscreen renderer; these
 * probes are the second host a plan can read, and they exercise the composition
 * the way an application does: a press opens the folder it lands on, the arrow
 * keys move native focus with the cursor, a reveal opens the path to a deep row,
 * and an expanded row opens a panel that is as wide as the table and pushes the
 * rows below it.
 *
 * The ids are the examples' own (`tree-row-src`, `expandable-detail-index`, …),
 * so a probe that drifts from the shipped screen fails instead of measuring a
 * copy.
 */
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

/** The example's readout line, so the scenario cannot print another spelling. */
const readout = (rows: number, active: string): string =>
  dataTreeReadout({ rows, active: Option.some(active) });

/** A row's chevron slot: the inset a nested row is measured by. */
const rowSlot = (key: string): string => `${dataTreeRow(key)}-slot`;

const TreeExample = examples["tree"];
const ExpandableRowsExample = examples["expandable-rows"];

export const dataTreeScenario: ScenarioBody = {
  view: () => (TreeExample === undefined ? null : <TreeExample />),
  steps: (ctx) =>
    Effect.gen(function* () {
      // `src` starts open, so the tree paints its children and `docs` stays shut.
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

      // A nested row insets one step: the chevron slot is the row's own inset.
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

      // A press opens the folder it lands on.
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

      // A press on a file moves the cursor and takes the focus the arrow key
      // needs; the next row is then one key away.
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

      // Left steps out of a file to its parent, and a second Left closes the
      // open branch without leaving the row.
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

      // Type-ahead jumps to the first match after the cursor.
      ctx.host.click(DATA_TREE_EXPAND);
      yield* ctx.expectContains(
        "expand all opened every branch",
        text(ctx, DATA_TREE_READOUT),
        `${DATA_TREE_ROWS_ALL} rows`,
      );
      // A press on a visible row takes the focus the typed key needs: the
      // button above took it when it was pressed.
      ctx.host.click(dataTreeRow("index.ts"));
      ctx.host.key("r");
      yield* ctx.expectContains(
        "a typed prefix moved the cursor to the row it names",
        text(ctx, DATA_TREE_READOUT),
        "active=readme.md",
      );

      // A reveal opens the path to a deep row and moves the cursor to it.
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

      // The panel is a sibling row, so it spans the table's content and takes
      // its own height in the column.
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

      // A press on the panel is not the row's press.
      ctx.host.click("expandable-kv-index-label-path");
      yield* ctx.expectContains(
        "a press on the panel kept the row open",
        text(ctx, "expandable-readout"),
        "open=index",
      );

      // A second press on the row closes it again.
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

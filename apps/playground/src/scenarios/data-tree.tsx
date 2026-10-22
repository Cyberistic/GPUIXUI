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

const text = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(id)), () => "");

const TreeExample = examples["tree"];
const ExpandableRowsExample = examples["expandable-rows"];

export const dataTreeScenario: ScenarioBody = {
  view: () => (TreeExample === undefined ? null : <TreeExample />),
  steps: (ctx) =>
    Effect.gen(function* () {
      // `src` starts open, so the tree paints its children and `docs` stays shut.
      yield* ctx.expectContains(
        "the tree paints its roots and one open folder",
        text(ctx, "tree-readout"),
        "5 rows · active=src",
      );
      yield* ctx.expectEqual(
        "the closed folder's child paints nothing",
        ctx.host.bounds("tree-row-readme.md") === null,
        true,
      );

      // A nested row insets one step: the chevron slot is the row's own inset.
      const parentSlot = yield* ctx.expectSome(
        "the parent's chevron slot painted",
        Option.fromNullishOr(ctx.host.bounds("tree-row-src-slot")),
      );
      const childSlot = yield* ctx.expectSome(
        "the child's chevron slot painted",
        Option.fromNullishOr(ctx.host.bounds("tree-row-components-slot")),
      );
      yield* ctx.expectNear(
        "a child insets 16px under its parent",
        childSlot.x - parentSlot.x,
        16,
        1,
      );

      // A press opens the folder it lands on.
      ctx.host.click("tree-row-docs");
      yield* ctx.expectContains(
        "the press opened the folder it hit",
        text(ctx, "tree-readout"),
        "7 rows · active=docs",
      );
      yield* ctx.expectSome(
        "the opened folder's child painted",
        Option.fromNullishOr(ctx.host.bounds("tree-row-readme.md")),
      );

      // A press on a file moves the cursor and takes the focus the arrow key
      // needs; the next row is then one key away.
      ctx.host.click("tree-row-readme.md");
      yield* ctx.expectContains(
        "the press moved the cursor to the file",
        text(ctx, "tree-readout"),
        "active=readme.md",
      );
      const focusedAfterPress = yield* ctx.expectSome(
        "a row holds native focus after the press",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "the pressed row holds native focus",
        focusedAfterPress,
        "tree-row-readme.md",
      );
      ctx.host.key("down");
      yield* ctx.expectContains(
        "the arrow moved the cursor",
        text(ctx, "tree-readout"),
        "active=guide.md",
      );
      const focusedAfterKey = yield* ctx.expectSome(
        "a row holds native focus after the key",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "the arrow moved native focus with the cursor",
        focusedAfterKey,
        "tree-row-guide.md",
      );

      // Left steps out of a file to its parent, and a second Left closes the
      // open branch without leaving the row.
      ctx.host.key("left");
      yield* ctx.expectContains(
        "Left stepped out to the parent folder",
        text(ctx, "tree-readout"),
        "active=docs",
      );
      ctx.host.key("left");
      yield* ctx.expectContains(
        "Left closed the branch but kept the row",
        text(ctx, "tree-readout"),
        "5 rows · active=docs",
      );

      // Type-ahead jumps to the first match after the cursor.
      ctx.host.click("tree-expand");
      yield* ctx.expectContains(
        "expand all opened every branch",
        text(ctx, "tree-readout"),
        "11 rows",
      );
      // A press on a visible row takes the focus the typed key needs: the
      // button above took it when it was pressed.
      ctx.host.click("tree-row-index.ts");
      ctx.host.key("r");
      yield* ctx.expectContains(
        "a typed prefix moved the cursor to the row it names",
        text(ctx, "tree-readout"),
        "active=readme.md",
      );

      // A reveal opens the path to a deep row and moves the cursor to it.
      ctx.host.click("tree-collapse");
      ctx.host.click("tree-reveal");
      yield* ctx.expectContains(
        "the reveal moved the cursor to the deep row",
        text(ctx, "tree-readout"),
        "active=row.tsx",
      );
      yield* ctx.expectSome(
        "the reveal opened the path, so the row paints",
        Option.fromNullishOr(ctx.host.bounds("tree-row-row.tsx")),
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

/**
 * `file-tree-lifecycle`: the shipped `@gpuixui/files` `FileTree` in a window.
 *
 * The headless `virtual-tree-lifecycle` scenario measured the runtime's
 * `<virtual-list>` around a probe-local flattening, and the Tier 4 *File trees*
 * row cites it for the shipped tree. This probe mounts the **component**: its
 * declarative parts built from a flat path list, its folder press, its file
 * press, its one tab stop and its definite height.
 *
 * What a window alone answers: whether a folder press opens only its subtree
 * and reports no selection, whether a file press selects it, whether arrow keys
 * move native focus row by row, and whether the `height` prop is a scroller
 * rather than a clip.
 *
 * Every check is a `ctx.expect*` at the step that makes it — the helpers only
 * read — so the count the README prints is the number of assertion sites.
 *
 * Captures: `file-tree-open`.
 */

import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  buildFileTree,
  FileTree,
  FileTreeFile,
  FileTreeFolder,
  type FileNode,
} from "@gpuixui/files";
import type { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Readout } from "../ui.js";
import {
  FILE_TREE_ASSETS,
  FILE_TREE_BUTTON,
  FILE_TREE_IDS,
  FILE_TREE_INDEX,
  FILE_TREE_INDEX_PICKED,
  FILE_TREE_LOGO,
  FILE_TREE_OPENED,
  FILE_TREE_PATHS,
  FILE_TREE_README,
  FILE_TREE_README_PICKED,
  FILE_TREE_REST,
  FILE_TREE_ROWS_OPEN,
  FILE_TREE_SCROLL,
  FILE_TREE_SRC,
  FILE_TREE_VISIBLE_ROWS,
  fileTreeReadout,
  fileTreeRow,
  type FileTreeState,
} from "./file-tree.js";
import { settleUntil } from "./settle.js";

/** The one capture: the tree with a folder open and a file selected. */
const CAPTURE = "file-tree-open";

const CAPTION =
  "The shipped FileTree: a folder press opens only its own subtree, a file press selects it, the arrow keys move native focus, and the height the tree was handed is a scroller.";

/** The parts for one path list, so the probe mounts the component's own tree. */
const renderNodes = (
  nodes: ReadonlyArray<FileNode>,
): ReadonlyArray<ReactNode> =>
  Arr.map(nodes, (node) =>
    node.children === undefined ? (
      <FileTreeFile key={node.path} path={node.path} name={node.name} />
    ) : (
      <FileTreeFolder key={node.path} path={node.path} name={node.name}>
        {renderNodes(node.children)}
      </FileTreeFolder>
    ),
  );

/** The view: the shipped tree over a flat path list and its readout. */
export const FileTreeProbe = (): ReactNode => {
  const theme = useTheme();
  const [state, setState] = useState<FileTreeState>(FILE_TREE_REST);
  const roots = useMemo(() => renderNodes(buildFileTree(FILE_TREE_PATHS)), []);
  const onSelect = useCallback(
    (path: string) =>
      setState((current) => ({
        ...current,
        selected: [path],
        picked: Option.some(path),
      })),
    [],
  );
  const onExpandedChange = useCallback(
    (opens: ReadonlyArray<string>) =>
      setState((current) => ({ ...current, opens })),
    [],
  );
  return (
    <div
      testId={FILE_TREE_IDS.probe}
      style={{
        width: 420,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {CAPTION}
      </text>
      <FileTree
        testId={FILE_TREE_IDS.tree}
        aria-label="Workspace files"
        height={FILE_TREE_VISIBLE_ROWS * theme.density.rowHeight}
        onExpandedChange={onExpandedChange}
        onSelect={onSelect}
        selected={state.selected[0]}
      >
        {roots}
      </FileTree>
      <Readout testId={FILE_TREE_IDS.readout}>{fileTreeReadout(state)}</Readout>
    </div>
  );
};

/** The probe's steps: open a folder, scroll, choose, walk by keyboard. */
export const fileTreeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(FILE_TREE_IDS.tree);
    yield* Effect.sleep(Duration.millis(400));

    type Failure = Smoke.SmokeAssertionError | Smoke.SmokeHostError;

    /** The readout once it reports `expected`, which a press reports a frame later. */
    const readout = (expected: string): Effect.Effect<string, Failure> =>
      settleUntil(ctx.host.text(FILE_TREE_IDS.readout), (line) =>
        line.includes(expected),
      );

    /** The element that holds native focus, or `none`. */
    const focused = (): Effect.Effect<string, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.focused(), (id) =>
        Option.getOrElse(Option.fromNullishOr(id), () => "none"),
      );

    /** Whether an id paints a box at all, so a row's absence is read, not assumed. */
    const painted = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.bounds(testId), (bounds) => bounds !== null);

    /** A reader's press on a row: move onto it, then press it. */
    const press = (path: string): Effect.Effect<void, Smoke.SmokeHostError> =>
      Effect.gen(function* () {
        yield* ctx.host.hover(fileTreeRow(path));
        yield* ctx.host.click(fileTreeRow(path));
      });

    // ── At rest: four roots, folded children, one definite height ────────────
    yield* ctx.expectEqual(
      "the readout starts empty and reports nothing open",
      yield* readout(fileTreeReadout(FILE_TREE_REST)),
      fileTreeReadout(FILE_TREE_REST),
    );
    const assetsRow = yield* ctx.expectSome(
      "the first root paints its own row",
      Option.fromNullishOr(
        yield* ctx.host.bounds(fileTreeRow(FILE_TREE_ASSETS)),
      ),
    );
    yield* ctx.expectSome(
      "the second root paints its own row",
      Option.fromNullishOr(yield* ctx.host.bounds(fileTreeRow(FILE_TREE_SRC))),
    );
    yield* ctx.expectSome(
      "the third root paints its own row",
      Option.fromNullishOr(yield* ctx.host.bounds(fileTreeRow("config.json"))),
    );
    yield* ctx.expectSome(
      "the fourth root paints its own row",
      Option.fromNullishOr(
        yield* ctx.host.bounds(fileTreeRow(FILE_TREE_README)),
      ),
    );
    yield* ctx.expectEqual(
      "a folded folder has no child row",
      yield* painted(fileTreeRow(FILE_TREE_LOGO)),
      false,
    );
    const tree = yield* ctx.expectSome(
      "the tree paints its own box",
      Option.fromNullishOr(yield* ctx.host.bounds(FILE_TREE_IDS.tree)),
    );
    yield* ctx.expectNear(
      "the tree lays its rows out in the definite height it was handed",
      tree.height,
      FILE_TREE_VISIBLE_ROWS * assetsRow.height,
      1,
    );

    // ── A press on a folder opens only its subtree and selects nothing ───────
    yield* press(FILE_TREE_SRC);
    yield* ctx.expectEqual(
      "the readout reports the open folder and no selection",
      yield* readout(fileTreeReadout(FILE_TREE_OPENED)),
      fileTreeReadout(FILE_TREE_OPENED),
    );
    yield* ctx.expectEqual(
      "a press on a folder paints its first child",
      yield* painted(fileTreeRow(FILE_TREE_BUTTON)),
      true,
    );
    yield* ctx.expectEqual(
      "the second child paints below it",
      yield* painted(fileTreeRow(FILE_TREE_INDEX)),
      true,
    );
    yield* ctx.expectEqual(
      "the sibling folder the press did not name stays folded",
      yield* painted(fileTreeRow(FILE_TREE_LOGO)),
      false,
    );

    // ── The two rows the folder opened sit below the box, and it scrolls ─────
    const opened = yield* ctx.expectSome(
      "the sixth row lays out its box",
      Option.fromNullishOr(
        yield* ctx.host.bounds(fileTreeRow(FILE_TREE_README)),
      ),
    );
    yield* ctx.expectEqual(
      "the row below the box starts outside it, so the height clips rather than grows",
      opened.y >= tree.y + tree.height - 1,
      true,
    );
    yield* ctx.host.wheel(FILE_TREE_IDS.tree, 0, -FILE_TREE_SCROLL);
    const scrolled = yield* settleUntil(
      Effect.map(
        ctx.host.scrollOffset(FILE_TREE_IDS.tree),
        Option.fromNullishOr,
      ),
      (offset) => Option.exists(offset, (read) => read.y < 0),
    );
    yield* ctx.expectNear(
      "the wheel scrolls the tree to the end of its own content",
      Option.getOrElse(
        Option.map(scrolled, (offset) => offset.y),
        () => Number.NaN,
      ),
      -(FILE_TREE_ROWS_OPEN - FILE_TREE_VISIBLE_ROWS) * assetsRow.height,
      1,
    );
    const bottom = yield* ctx.expectSome(
      "the bottom row paints its box after the scroll",
      Option.fromNullishOr(
        yield* ctx.host.bounds(fileTreeRow(FILE_TREE_README)),
      ),
    );
    yield* ctx.expectEqual(
      "the row the wheel revealed is inside the box",
      bottom.y >= tree.y && bottom.y < tree.y + tree.height,
      true,
    );
    const top = yield* ctx.expectSome(
      "the first row keeps its box after the scroll",
      Option.fromNullishOr(
        yield* ctx.host.bounds(fileTreeRow(FILE_TREE_ASSETS)),
      ),
    );
    yield* ctx.expectEqual(
      "the row the wheel pushed out is above the box",
      top.y < tree.y,
      true,
    );

    // ── A press on a file selects it and leaves the folder open ─────────────
    yield* press(FILE_TREE_README);
    yield* ctx.expectEqual(
      "a press on a file selects it and reports it once",
      yield* readout(fileTreeReadout(FILE_TREE_README_PICKED)),
      fileTreeReadout(FILE_TREE_README_PICKED),
    );
    yield* ctx.expectEqual(
      "the folder the file sits in stays open",
      yield* painted(fileTreeRow(FILE_TREE_BUTTON)),
      true,
    );

    // ── Back to the top, where the keyboard starts ──────────────────────────
    yield* ctx.host.wheel(FILE_TREE_IDS.tree, 0, FILE_TREE_SCROLL);
    const rested = yield* settleUntil(
      Effect.map(
        ctx.host.scrollOffset(FILE_TREE_IDS.tree),
        Option.fromNullishOr,
      ),
      (offset) => Option.exists(offset, (read) => read.y === 0),
    );
    yield* ctx.expectEqual(
      "the wheel back up returns the tree to its own top",
      Option.exists(rested, (offset) => offset.y === 0),
      true,
    );

    // ── One tab stop, and the keys move native focus row by row ──────────────
    yield* press(FILE_TREE_BUTTON);
    yield* Effect.sleep(Duration.millis(200));
    yield* ctx.expectEqual(
      "the press lands native focus on the row it selected",
      yield* settleUntil(
        focused(),
        (id) => id === fileTreeRow(FILE_TREE_BUTTON),
      ),
      fileTreeRow(FILE_TREE_BUTTON),
    );
    yield* ctx.host.key("down");
    yield* ctx.expectEqual(
      "an arrow moves the cursor and native focus to the next row",
      yield* settleUntil(
        focused(),
        (id) => id === fileTreeRow(FILE_TREE_INDEX),
      ),
      fileTreeRow(FILE_TREE_INDEX),
    );
    yield* ctx.host.key("enter");
    yield* ctx.expectEqual(
      "Enter selects the file the focus holds",
      yield* readout(fileTreeReadout(FILE_TREE_INDEX_PICKED)),
      fileTreeReadout(FILE_TREE_INDEX_PICKED),
    );
    yield* ctx.host.key("r");
    yield* ctx.host.key("e");
    yield* ctx.expectEqual(
      "a typed prefix takes the focus to the row it names",
      yield* settleUntil(
        focused(),
        (id) => id === fileTreeRow(FILE_TREE_README),
      ),
      fileTreeRow(FILE_TREE_README),
    );

    // Captures come last: a screenshot stalls the animation clock.
    yield* ctx.host.capture(CAPTURE);
  });

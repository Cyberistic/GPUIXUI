import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { afterEach, describe, expect, it } from "vitest";
import { useExpandedRows } from "../tree/use-expanded.js";
import { VirtualTree } from "../virtual/tree.js";
import { VirtualTable } from "../virtual/table.js";
import { DEFAULT_ROW_HEIGHT } from "../virtual/window.js";
import { TableCell, TableHeaderCell, TableRow } from "../table/table.js";
import { textStyle, useTheme } from "../theme.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

const ROWS = 1_000;

const REVEAL_ROW = 900;

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

const paintedRows = (mounted: DataTestRoot): ReadonlyArray<number> =>
  Arr.filterMap(mounted.renderer.getPaintedText(), (line) => {
    const index = /^row-(\d+)$/.exec(line)?.[1];
    return index === undefined
      ? Result.failVoid
      : Result.succeed(Number(index));
  });

const retainedRows = (mounted: DataTestRoot): ReadonlyArray<number> =>
  Arr.filterMap(mounted.renderer.getAllText(), (line) => {
    const index = /^row-(\d+)$/.exec(line)?.[1];
    return index === undefined
      ? Result.failVoid
      : Result.succeed(Number(index));
  });

const boundsOf = (mounted: DataTestRoot, testId: string) => {
  const element = mounted.renderer.findByTestId(testId);
  if (element === undefined)
    throw new Error(`no element with testId ${testId}`);
  const bounds = mounted.renderer.getElementBounds(element.id);
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  return bounds;
};

const table = (options: {
  readonly rowHeight: number;
  readonly reveal?: { readonly index: number };
}) => {
  const Example = () => {
    const theme = useTheme();
    return (
      <VirtualTable
        height={240}
        aria-label="Rows"
        count={ROWS}
        rowHeight={options.rowHeight}
        reveal={options.reveal}
        header={
          <TableRow>
            <TableHeaderCell width={180} testId="height-header">
              Name
            </TableHeaderCell>
          </TableRow>
        }
        row={(index) => (
          <TableRow testId={`height-row-${index}`}>
            <TableCell width={180}>
              <text style={textStyle(theme, "body")}>{`row-${index}`}</text>
            </TableCell>
          </TableRow>
        )}
      />
    );
  };
  return <Example />;
};

const wheel = (mounted: DataTestRoot, deltaY: number): void => {
  const header = boundsOf(mounted, "height-header");
  mounted.renderer.nativeSimulateScrollWheel(
    header.x + 20,
    header.y + header.height + 10,
    0,
    deltaY,
  );
  mounted.renderer.flush();
};

describe("a row height the window cannot read", () => {
  it("names the height this package's own row paints", () => {
    const mounted = renderData(table({ rowHeight: DEFAULT_ROW_HEIGHT }));
    root = mounted;
    settle(mounted);

    expect(boundsOf(mounted, "height-row-0").height).toBe(DEFAULT_ROW_HEIGHT);
  });

  it("mounts a window of the set, not a row per pixel", () => {
    const mounted = renderData(table({ rowHeight: Number.NaN }));
    root = mounted;
    settle(mounted);

    expect(retainedRows(mounted).length).toBeLessThan(60);
    expect(paintedRows(mounted).length).toBeGreaterThanOrEqual(5);
    expect(paintedRows(mounted)[0]).toBe(0);
  });

  it("follows the paint to the last row", () => {
    const mounted = renderData(table({ rowHeight: Number.NaN }));
    root = mounted;
    settle(mounted);

    Arr.forEach(Arr.range(1, 100), () => wheel(mounted, -600));

    const painted = paintedRows(mounted);
    expect(Option.getOrUndefined(Arr.last(painted))).toBe(ROWS - 1);

    expect(painted).toEqual(Arr.range(painted[0] ?? 0, painted.at(-1) ?? 0));
  });

  it("reveals a row the runtime can scroll to", () => {
    const mounted = renderData(
      table({ rowHeight: Number.NaN, reveal: { index: REVEAL_ROW } }),
    );
    root = mounted;
    settle(mounted);

    expect(paintedRows(mounted)).toContain(REVEAL_ROW);
  });
});

const NODES = 200;

const nodes = Arr.map(Arr.range(0, NODES - 1), (index) => ({
  id: `node-${index}`,
  label: `node ${index}`,
}));

const Tree = ({ rowHeight }: { readonly rowHeight: number }) => {
  const tree = useExpandedRows({
    roots: nodes,
    keyOf: (node) => node.id,
    childrenOf: () => [],
    labelOf: (node) => node.label,
    initialActive: "node-0",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 320 }}>
      <text testId="height-tree-readout">
        {`active=${Option.getOrElse(tree.active, () => "-")}`}
      </text>
      <VirtualTree
        testId="height-tree"
        aria-label="Nodes"
        height={240}
        rowHeight={rowHeight}
        rows={tree.rows}
        cursor={tree.cursor}
        onCursorChange={tree.setCursor}
        labelOf={(node) => node.label}
      />
    </div>
  );
};

describe("a windowed tree whose row height cannot be read", () => {
  it("retains a window and keeps the cursor's row mounted", () => {
    const mounted = renderData(<Tree rowHeight={Number.NaN} />);
    root = mounted;
    settle(mounted);

    const painted = (): ReadonlyArray<string> =>
      Arr.filter(mounted.renderer.getPaintedText(), (line) =>
        /^node \d+$/.test(line),
      );
    expect(painted().length).toBeGreaterThan(3);
    expect(painted().length).toBeLessThan(60);

    const active = (): string => {
      const line = Arr.findFirst(mounted.renderer.getAllText(), (text) =>
        text.startsWith("active="),
      );
      if (Option.isNone(line)) throw new Error("no tree readout");
      return line.value.slice("active=".length);
    };
    const row = boundsOf(mounted, `height-tree-row-${active()}`);
    mounted.renderer.nativeSimulateScrollWheel(row.x + 20, row.y + 4, 0, -600);
    mounted.renderer.flush();

    expect(painted()).toContain(active().replace("node-", "node "));
    expect(painted().length).toBeLessThan(60);
  });
});

/**
 * A project file tree: open a folder, walk the rows from the keyboard, and
 * choose files with a press (single) or the checkbox (multi).
 *
 * This is the whole composition a consumer copies. `FileTree` composes
 * `@gpuixui/data`'s tree (expansion, the roving tab stop, type-ahead and the
 * arrow keys) with a glyph per kind and a selection: a press on a row chooses it
 * alone, and the leading checkbox toggles it in the set.
 *
 * The readout paints the selected count, so a behaviour suite can read the
 * selection without reaching into the component.
 */

import * as Arr from "effect/Array";
import { useState } from "react";
import { buildFileTree, FileTree } from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

const paths = [
  "src/index.ts",
  "src/components/button.tsx",
  "src/components/table/row.tsx",
  "docs/readme.md",
  "assets/logo.png",
  "package.json",
];

/** The tree and the readout that proves what it selected. */
export const FileTreeExample = () => {
  const theme = useTheme();
  const [selected, setSelected] = useState<ReadonlyArray<string>>([]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 420,
      }}
    >
      <text
        testId="file-tree-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`${Arr.length(selected)} selected · ${Arr.join(", ")(selected) || "none"}`}
      </text>
      <FileTree
        testId="files"
        aria-label="Project files"
        height={280}
        roots={buildFileTree(paths)}
        keyOf={(node) => node.path}
        childrenOf={(node) => node.children ?? []}
        labelOf={(node) => node.name}
        onSelectionChange={setSelected}
      />
    </div>
  );
};

import { useState } from "react";
import { FileTree, FileTreeFile, FileTreeFolder } from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

export const FileTreeExample = () => {
  const theme = useTheme();
  const [selected, setSelected] = useState<string | undefined>("src/index.ts");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 360,
      }}
    >
      <text
        testId="file-tree-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {selected === undefined ? "nothing selected" : `selected: ${selected}`}
      </text>
      <FileTree
        testId="files"
        aria-label="Project files"
        height={280}
        defaultExpanded={["src", "src/components"]}
        selected={selected}
        onSelect={setSelected}
      >
        <FileTreeFolder path="src" name="src">
          <FileTreeFolder path="src/components" name="components">
            <FileTreeFile path="src/components/button.tsx" name="button.tsx" />
            <FileTreeFolder path="src/components/table" name="table">
              <FileTreeFile
                path="src/components/table/row.tsx"
                name="row.tsx"
              />
            </FileTreeFolder>
          </FileTreeFolder>
          <FileTreeFile path="src/index.ts" name="index.ts" />
        </FileTreeFolder>
        <FileTreeFolder path="docs" name="docs">
          <FileTreeFile path="docs/readme.md" name="readme.md" />
        </FileTreeFolder>
        <FileTreeFolder path="assets" name="assets">
          <FileTreeFile path="assets/logo.png" name="logo.png" />
        </FileTreeFolder>
        <FileTreeFile path="package.json" name="package.json" />
      </FileTree>
    </div>
  );
};

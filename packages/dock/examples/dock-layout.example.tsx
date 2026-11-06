import { useState } from "react";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { darkTheme } from "@gpuixui/tokens";
import { DockLayout, DockTab, type DockNode } from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

const initial: DockNode = {
  kind: "split",
  id: "root",
  orientation: "horizontal",
  size: 0.6,
  first: {
    kind: "tabs",
    id: "editor",
    activeTab: "code",
    tabs: [
      new DockTab({ id: "code", label: "Code" }),
      new DockTab({ id: "preview", label: "Preview" }),
    ],
  },
  second: {
    kind: "split",
    id: "side",
    orientation: "vertical",
    size: 0.5,
    first: {
      kind: "tabs",
      id: "outline",
      activeTab: "symbols",
      tabs: [new DockTab({ id: "symbols", label: "Symbols" })],
    },
    second: {
      kind: "tabs",
      id: "terminal",
      activeTab: "shell",
      tabs: [new DockTab({ id: "shell", label: "Shell" })],
    },
  },
};

const TAB_BODIES: Readonly<Record<string, string>> = {
  code: "The active editor tab.",
  preview: "Switch tabs to repaint this pane without moving the split.",
  symbols: "The outline, in its own split.",
  shell: "The terminal, below the outline.",
};

const TabPane = ({ id }: { id: string }) => {
  const theme = useTheme();
  return (
    <div style={{ padding: theme.spacing.md }}>
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {TAB_BODIES[id] ?? id}
      </text>
    </div>
  );
};

export const DockLayoutExample = () => {
  const [layout, setLayout] = useState<DockNode>(initial);
  return (
    <ThemeProvider theme={darkTheme}>
      <div style={{ width: 640, height: 320, display: "flex" }}>
        <DockLayout
          layout={layout}
          onLayoutChange={setLayout}
          renderTab={(id) => <TabPane id={id} />}
        />
      </div>
    </ThemeProvider>
  );
};

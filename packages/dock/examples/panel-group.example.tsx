import { useState } from "react";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { darkTheme } from "@gpuixui/tokens";
import { Panel, PanelLayout, PanelGroup } from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

const initial = new PanelLayout({
  orientation: "horizontal",
  panels: [
    new Panel({
      id: "sidebar",
      label: "Sidebar",
      size: 0.2,
      collapsible: true,
    }),
    new Panel({ id: "editor", label: "Editor", size: 0.55 }),
    new Panel({
      id: "inspector",
      label: "Inspector",
      size: 0.25,
      collapsible: true,
    }),
  ],
});

const Pane = ({ body }: { body: string }) => {
  const theme = useTheme();
  return (
    <div style={{ padding: theme.spacing.md }}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {body}
      </text>
    </div>
  );
};

const PANELS: Readonly<Record<string, string>> = {
  sidebar:
    "Collapse me from the header; the editor and inspector fill the gap.",
  editor: "The middle pane is the widest share and cannot collapse.",
  inspector: "A collapse persists in the layout and round-trips through JSON.",
};

export const PanelGroupExample = () => {
  const [layout, setLayout] = useState<PanelLayout>(initial);
  return (
    <ThemeProvider theme={darkTheme}>
      <div style={{ width: 640, height: 320, display: "flex" }}>
        <PanelGroup
          layout={layout}
          onLayoutChange={setLayout}
          renderPanel={(id) => <Pane body={PANELS[id] ?? ""} />}
        />
      </div>
    </ThemeProvider>
  );
};

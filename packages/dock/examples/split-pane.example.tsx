/**
 * A two-pane split: a sidebar and a document, resized from the divider or the
 * keyboard. The size is the caller's `useState`, so the re-clamp on a window or
 * sibling reflow is the app's, exactly as `dock-reflow` measured.
 */

import { useState } from "react";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { darkTheme } from "@gpuixui/tokens";
import { SplitPane } from "../src/split-pane.js";
import { textStyle, useTheme } from "../src/theme.js";

const Pane = ({ title, body }: { title: string; body: string }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
      }}
    >
      <text
        style={{ ...textStyle(theme, "h3"), color: theme.colors.foreground }}
      >
        {title}
      </text>
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

/** A sidebar and a document behind one draggable divider. */
export const SplitPaneExample = () => {
  const [size, setSize] = useState(240);
  return (
    <ThemeProvider theme={darkTheme}>
      <div style={{ width: 560, height: 320, display: "flex" }}>
        <SplitPane
          size={size}
          onResize={setSize}
          min={160}
          max={400}
          dividerLabel="Sidebar width"
          first={
            <Pane
              title="Sidebar"
              body="Drag the divider, or focus it and press the arrows."
            />
          }
          second={
            <Pane
              title="Document"
              body="The second pane fills what the first leaves."
            />
          }
        />
      </div>
    </ThemeProvider>
  );
};

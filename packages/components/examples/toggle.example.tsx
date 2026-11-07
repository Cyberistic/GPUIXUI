/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { Icon } from "@gpuixui/icons";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { Toggle } from "../src/toggle.js";

export const ToggleExample = () => {
  const theme = useTheme();
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [grid, setGrid] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        maxWidth: 420,
      }}
    >
      <div
        role="group"
        aria-label="Text formatting"
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.xs,
        }}
      >
        <Toggle pressed={bold} onPressedChange={setBold} label="Bold">
          Bold
        </Toggle>
        <Toggle
          pressed={italic}
          onPressedChange={setItalic}
          label="Italic"
          variant="outline"
        >
          Italic
        </Toggle>
        <Toggle
          pressed={grid}
          onPressedChange={setGrid}
          label="Grid view"
          variant="outline"
          square
          leading={
            <Icon name="grid" size="sm" color={theme.colors.foreground} />
          }
        />
        <Toggle disabled label="Underline">
          Underline
        </Toggle>
      </div>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {[bold && "bold", italic && "italic", grid && "grid"]
          .filter(Boolean)
          .join(", ") || "nothing pressed"}
      </text>
    </div>
  );
};

/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { ToggleGroup, ToggleGroupItem } from "../src/toggle-group.js";

const alignments = ["Left", "Centre", "Right", "Justify"] as const;

export const ToggleGroupExample = () => {
  const theme = useTheme();
  const [alignment, setAlignment] = useState("Centre");
  const [formats, setFormats] = useState<ReadonlyArray<string>>(["Bold"]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        maxWidth: 460,
      }}
    >
      <ToggleGroup
        type="single"
        label="Alignment"
        variant="outline"
        value={alignment}
        onValueChange={setAlignment}
      >
        {alignments.map((name) => (
          <ToggleGroupItem key={name} value={name} label={`Align ${name}`}>
            {name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        type="multiple"
        label="Formatting"
        value={formats}
        onValueChange={setFormats}
      >
        <ToggleGroupItem value="Bold" label="Bold">
          Bold
        </ToggleGroupItem>
        <ToggleGroupItem value="Italic" label="Italic">
          Italic
        </ToggleGroupItem>
        <ToggleGroupItem value="Underline" label="Underline">
          Underline
        </ToggleGroupItem>
      </ToggleGroup>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {alignment} · {formats.join(", ") || "no formats"}
      </text>
    </div>
  );
};

/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { useTheme } from "../src/authoring.js";
import { ColorSwatches } from "../src/color-swatches.js";

export const ColorSwatchesExample = () => {
  const { colors } = useTheme();
  const accents = [
    colors.primary,
    colors.destructive,
    colors.ring,
    colors.mutedForeground,
  ];
  const [chosen, setChosen] = useState(0);
  return (
    <ColorSwatches
      label="Accent colour"
      colors={accents}
      value={accents[chosen]}
      onValueChange={(color) => setChosen(accents.indexOf(color))}
    />
  );
};

/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { ColorSwatches } from "../src/color-swatches.js";

const ACCENTS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#22C55E", "#6B7280"];

export const ColorSwatchesExample = () => {
  const [accent, setAccent] = useState(ACCENTS[0]);
  return <ColorSwatches label="Accent colour" colors={ACCENTS} value={accent} onValueChange={setAccent} />;
};

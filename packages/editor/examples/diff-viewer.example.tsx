/** @jsxImportSource @gpuix/react */
import { DiffViewer } from "../src/diff/diff-viewer.js";

const before = `const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);`;

const after = `export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);`;

export const DiffViewerExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <DiffViewer before={before} after={after} mode="unified" />
    <DiffViewer before={before} after={after} mode="split" />
  </div>
);

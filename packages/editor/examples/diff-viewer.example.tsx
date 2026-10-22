/**
 * DiffViewer example: the same edit as a unified and a split diff.
 *
 * The two sources differ by one changed line; the unified view merges them into
 * one column and the split view lays the before and after sides side by side,
 * both tinting the added and removed lines in the success and destructive soft
 * roles.
 */

import { DiffViewer } from "../src/diff/diff-viewer.js";

const before = `const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);`;

const after = `export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);`;

/** One edit, shown unified and split. */
export const DiffViewerExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <DiffViewer before={before} after={after} mode="unified" />
    <DiffViewer before={before} after={after} mode="split" />
  </div>
);

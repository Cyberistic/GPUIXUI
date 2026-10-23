/**
 * Browser preview for the Motion grid page.
 *
 * The native grid travels its cells to their new slots when the order changes;
 * the preview lays the cells out by slot and shuffles the order, so each cell
 * slides to its new square.
 */

import { useState } from "react";

const tools = ["Atlas", "Console", "Logs", "Secrets", "DNS", "Edge"];

const columns = 3;
const cellWidth = 150;
const rowHeight = 96;
const gap = 12;

const slot = (
  index: number,
): { readonly left: number; readonly top: number } => ({
  left: (index % columns) * (cellWidth + gap),
  top: Math.floor(index / columns) * (rowHeight + gap),
});

export function MotionGridDemo() {
  const [order, setOrder] = useState(tools);

  return (
    <div className="gx-motiongrid">
      <div
        className="gx-motiongrid-stage"
        style={{
          width: columns * cellWidth + (columns - 1) * gap,
          height: 2 * (rowHeight + gap),
        }}
      >
        {order.map((label, index) => {
          const position = slot(index);
          return (
            <div
              className="gx-motiongrid-cell"
              key={label}
              style={{ left: position.left, top: position.top }}
            >
              {label}
            </div>
          );
        })}
      </div>
      <button
        className="gx-btn gx-btn-secondary gx-btn-sm"
        onClick={() => setOrder([...order].reverse())}
        type="button"
      >
        Shuffle
      </button>
    </div>
  );
}

export const motionGridDemoSource = `import { MotionGrid } from "@gpuixui/components/motion-grid";

<MotionGrid
  items={tools.map((tool) => ({ id: tool.id, content: <ToolCard tool={tool} /> }))}
  columns={3}
  cellWidth={160}
  rowHeight={120}
  gap={12}
  label="Tool board"
/>;`;

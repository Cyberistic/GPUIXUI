/**
 * MotionGrid example: a board of tools whose cards change places.
 *
 * Composition, not a gallery: the grid is the workspace's reorderable board, and
 * the two actions change the order the way a drag, a sort or a filter would —
 * the cells that move travel to their new slots, and the ones that stay put do
 * not replay. The reduced strip shows the same grid under the preference where a
 * reorder is an assignment rather than a journey.
 */

import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { MotionGrid, type MotionGridItem } from "../src/motion-grid.js";
import { MotionProvider } from "../src/motion.js";

/** The board's fixed cell size: three columns of 140 × 96, with 12 px gaps. */
const board = {
  columns: 3,
  cellWidth: 140,
  rowHeight: 96,
  gap: 12,
} as const;

interface Tool {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

/** Six tools, in the order the board opens with. */
const tools: ReadonlyArray<Tool> = [
  { id: "notes", title: "Notes", detail: "Scratch pad" },
  { id: "spec", title: "Spec", detail: "Current draft" },
  { id: "logs", title: "Logs", detail: "This morning" },
  { id: "tokens", title: "Tokens", detail: "Theme scales" },
  { id: "tests", title: "Tests", detail: "Last run" },
  { id: "deploy", title: "Deploy", detail: "Staging" },
];

/** One card: the tool's title and a line of detail, inside the slot. */
const Card = ({ tool }: { readonly tool: Tool }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.card,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "bodyStrong"),
          color: theme.colors.cardForeground,
        }}
      >
        {tool.title}
      </text>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {tool.detail}
      </text>
    </div>
  );
};

/** The cards for one arrangement of tool ids. */
const cards = (order: ReadonlyArray<string>): ReadonlyArray<MotionGridItem> =>
  order.flatMap((id) => {
    const tool = tools.find((candidate) => candidate.id === id);
    return tool === undefined ? [] : [{ id, content: <Card tool={tool} /> }];
  });

/** A reorderable board, and the same board painted under the reduced preference. */
export const MotionGridExample = () => {
  const theme = useTheme();
  const [order, setOrder] = useState<ReadonlyArray<string>>(
    tools.map((tool) => tool.id),
  );

  /** Turn the board by one place: every card that moves is a different slot. */
  const rotate = () => {
    const [first, ...rest] = order;
    setOrder(first === undefined ? order : [...rest, first]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <MotionGrid items={cards(order)} label="Tool board" {...board} />
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Button variant="secondary" onClick={rotate}>
          Rotate the board
        </Button>
        <Button
          variant="ghost"
          onClick={() => setOrder(tools.map((tool) => tool.id))}
        >
          Reset
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <MotionProvider preference="reduced">
          <MotionGrid
            items={cards(["spec", "notes", "logs"])}
            columns={3}
            cellWidth={96}
            rowHeight={64}
            gap={theme.spacing.sm}
            label="Reduced board"
          />
        </MotionProvider>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The same grid under the reduced preference: a reorder paints the new
          slots in the frame it changes.
        </text>
      </div>
    </div>
  );
};

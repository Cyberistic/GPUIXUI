import * as Arr from "effect/Array";
import { Text } from "@gpuixui/primitives";
import { useState } from "react";
import {
  Kanban,
  type KanbanCard,
  type KanbanColumn,
  type KanbanMove,
  type KanbanOrder,
} from "../src/kanban.js";

const columns: ReadonlyArray<KanbanColumn> = [
  { id: "open", title: "Open" },
  { id: "hunting", title: "Hunting" },
  { id: "cleared", title: "Cleared" },
];

const cards: ReadonlyArray<KanbanCard> = [
  {
    id: "exam",
    column: "open",
    title: "Pass the Hunter Exam",
    description: "Survive the fourth phase",
  },
  {
    id: "troupe",
    column: "hunting",
    title: "Track the Phantom Troupe",
    description: "Yorknew City",
  },
  {
    id: "ging",
    column: "hunting",
    title: "Find Ging Freecss",
    description: "Follow the tape",
  },
  {
    id: "greed",
    column: "cleared",
    title: "Clear Greed Island",
  },
];

const initialOrder: KanbanOrder = Arr.map(cards, (card) => ({
  id: card.id,
  column: card.column,
}));

export const KanbanExample = () => {
  const [order, setOrder] = useState<KanbanOrder>(initialOrder);
  const [last, setLast] = useState("No move yet");

  const move = (next: KanbanMove): void => {
    setLast(`${next.id}: ${next.from} → ${next.to} at ${String(next.index)}`);
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 760 }}
    >
      <Kanban
        label="Hunter contracts"
        columns={columns}
        cards={cards}
        order={order}
        onOrderChange={setOrder}
        onMove={move}
      />
      <Text role="caption" tone="muted">
        {last}
      </Text>
    </div>
  );
};

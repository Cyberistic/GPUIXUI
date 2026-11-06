import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Kanban,
  type KanbanCard,
  type KanbanColumn,
  type KanbanMove,
  type KanbanOrder,
} from "../kanban.js";
import {
  clickCentreOf,
  pressKey,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import { lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

let page: ComponentTestRoot | undefined;
afterEach(() => {
  page?.unmount();
  page = undefined;
});

const columns: ReadonlyArray<KanbanColumn> = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "Doing" },
];

const cards: ReadonlyArray<KanbanCard> = [
  { id: "a", column: "todo", title: "Pass the exam" },
  { id: "b", column: "todo", title: "Find Ging" },
  { id: "c", column: "doing", title: "Track the troupe" },
];

const idOf = (root: ComponentTestRoot, testId: string): number => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined) throw new Error(`no element "${testId}"`);
  return element.id;
};

const insideColumn = (
  root: ComponentTestRoot,
  cardTestId: string,
  columnTestId: string,
): boolean => {
  const card = root.renderer.findByTestId(cardTestId);
  if (card === undefined) throw new Error(`no element "${cardTestId}"`);
  const walk = (id: number | null | undefined): boolean => {
    if (id === null || id === undefined) return false;
    const element = root.renderer.getElement(id);
    if (element === undefined) return false;
    return element.testId === columnTestId || walk(element.parentId);
  };
  return walk(card.parentId);
};

const Board = ({
  onMove,
  onCardClick,
  onOrderChange,
  order,
}: {
  readonly onMove?: (move: KanbanMove) => void;
  readonly onCardClick?: (card: KanbanCard) => void;
  readonly onOrderChange?: (order: KanbanOrder) => void;
  readonly order?: KanbanOrder;
}) => (
  <Kanban
    label="Hunter contracts"
    testId="board"
    cards={cards}
    columns={columns}
    onCardClick={onCardClick}
    onMove={onMove}
    onOrderChange={onOrderChange}
    order={order}
  />
);

describe("the pointer", () => {
  it("paints one insertion line and moves the card to it", () => {
    const onMove = vi.fn<(move: KanbanMove) => void>();
    const onCardClick = vi.fn();
    const root = renderComponent(
      <Board onMove={onMove} onCardClick={onCardClick} />,
      "light",
    );
    page = root;
    settle(root);

    const card = requireBounds(root, "board-card-a");
    const target = requireBounds(root, "board-column-doing");
    const before =
      root.renderer.findByTestId("board-column-doing")?.style.backgroundColor;

    root.renderer.nativeSimulateMouseDown(
      card.x + card.width / 2,
      card.y + card.height / 2,
    );
    settle(root);
    root.renderer.nativeSimulateMouseMove(
      target.x + target.width / 2,
      target.y + target.height - 2,
      0,
    );
    settle(root);

    const line = root.renderer.findByTestId("board-drop-line");
    expect(line).toBeDefined();
    expect(line?.style.backgroundColor).toBe(lightTheme.colors.primary);

    expect(
      root.renderer.findByTestId("board-column-doing")?.style.backgroundColor,
    ).toBe(before);

    root.renderer.nativeSimulateMouseUp(
      target.x + target.width / 2,
      target.y + target.height - 2,
    );
    settle(root);

    expect(onMove).toHaveBeenCalledWith({
      id: "a",
      from: "todo",
      to: "doing",
      index: 1,
    });
    expect(insideColumn(root, "board-card-a", "board-column-doing")).toBe(true);

    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("calls onCardClick for a press that never moves", () => {
    const onCardClick = vi.fn();
    const root = renderComponent(<Board onCardClick={onCardClick} />);
    page = root;
    settle(root);

    clickCentreOf(root, "board-card-a");

    expect(onCardClick).toHaveBeenCalledTimes(1);
    expect(onCardClick.mock.calls[0]?.[0]).toMatchObject({ id: "a" });
  });
});

describe("the keyboard", () => {
  it("moves a card right and keeps the focus on it", () => {
    const onMove = vi.fn<(move: KanbanMove) => void>();
    const onOrderChange = vi.fn<(order: KanbanOrder) => void>();
    const root = renderComponent(
      <Board onMove={onMove} onOrderChange={onOrderChange} />,
    );
    page = root;
    settle(root);

    root.renderer.focusElement(idOf(root, "board-card-a"));
    pressKey(root, "right");
    settle(root);

    expect(onMove).toHaveBeenCalledWith({
      id: "a",
      from: "todo",
      to: "doing",
      index: 0,
    });
    expect(insideColumn(root, "board-card-a", "board-column-doing")).toBe(true);

    expect(root.renderer.getFocusedElementId()).toBe(
      idOf(root, "board-card-a"),
    );
    expect(onOrderChange).toHaveBeenCalled();
  });

  it("reorders inside a column and stops at its end", () => {
    const onMove = vi.fn<(move: KanbanMove) => void>();
    const root = renderComponent(<Board onMove={onMove} />);
    page = root;
    settle(root);

    root.renderer.focusElement(idOf(root, "board-card-b"));
    pressKey(root, "up");
    settle(root);

    expect(onMove).toHaveBeenLastCalledWith({
      id: "b",
      from: "todo",
      to: "todo",
      index: 0,
    });

    root.renderer.focusElement(idOf(root, "board-card-b"));
    pressKey(root, "up");
    settle(root);

    expect(onMove).toHaveBeenCalledTimes(1);
  });
});

describe("a controlled order", () => {
  it("reports the move without painting it until the caller accepts", () => {
    const onMove = vi.fn<(move: KanbanMove) => void>();
    const onOrderChange = vi.fn<(order: KanbanOrder) => void>();
    const order: KanbanOrder = [
      { id: "a", column: "todo" },
      { id: "b", column: "todo" },
      { id: "c", column: "doing" },
    ];
    const root = renderComponent(
      <Board onMove={onMove} onOrderChange={onOrderChange} order={order} />,
    );
    page = root;
    settle(root);

    root.renderer.focusElement(idOf(root, "board-card-a"));
    pressKey(root, "right");
    settle(root);

    expect(onOrderChange).toHaveBeenCalledWith([
      { id: "b", column: "todo" },
      { id: "a", column: "doing" },
      { id: "c", column: "doing" },
    ]);

    expect(insideColumn(root, "board-card-a", "board-column-todo")).toBe(true);
  });
});

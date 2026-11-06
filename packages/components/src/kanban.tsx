// No `@dnd-kit/core`: it reads `document`/`getBoundingClientRect`, which 0.11.0 lacks.
// Drag is pointer capture plus `renderer.getElementBounds` (`docs/gpuix-capabilities.md`).
import type {
  EventPayload,
  KeyEvent,
  NativeRenderer,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { primaryButton } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useControllableState } from "./internal/controllable.js";
import { keyboardRing, textStyle, useTheme } from "./internal/theme.js";
import {
  columnAt,
  columnCards,
  directionOf,
  dropIndexFromCentres,
  keyboardMove,
  moveCardInOrder,
  resolveOrder,
  type KanbanCard,
  type KanbanColumn,
  type KanbanColumnBox,
  type KanbanDirection,
  type KanbanMove,
  type KanbanOrder,
} from "./kanban/logic.js";

export type {
  KanbanCard,
  KanbanColumn,
  KanbanDirection,
  KanbanMove,
  KanbanOrder,
  KanbanPlacement,
} from "./kanban/logic.js";

export interface KanbanCardState {
  readonly dragging: boolean;
}

export interface KanbanProps {
  readonly columns: ReadonlyArray<KanbanColumn>;

  readonly cards: ReadonlyArray<KanbanCard>;

  readonly order?: KanbanOrder;

  readonly defaultOrder?: KanbanOrder;

  readonly onOrderChange?: (order: KanbanOrder) => void;

  readonly onMove?: (move: KanbanMove) => void;

  readonly onCardClick?: (card: KanbanCard) => void;

  readonly label?: string;

  readonly cardLabel?: (card: KanbanCard) => string;

  readonly renderCard?: (card: KanbanCard, state: KanbanCardState) => ReactNode;

  readonly style?: StyleDesc;

  readonly testId?: string;
}

interface DropTarget {
  readonly column: string;
  readonly index: number;
}

interface Drag {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  moved: boolean;
}

const sameDrop = (
  current: Option.Option<DropTarget>,
  next: Option.Option<DropTarget>,
): boolean =>
  Option.match(current, {
    onNone: () => Option.isNone(next),
    onSome: (held) =>
      Option.exists(
        next,
        (target) =>
          target.column === held.column && target.index === held.index,
      ),
  });

const locatorOf = (
  base: string | undefined,
  kind: string,
  id: string,
): string | undefined =>
  base === undefined ? undefined : `${base}-${kind}-${id}`;

const isPlain = (event: EventPayload): boolean =>
  event.modifiers?.cmd !== true &&
  event.modifiers?.ctrl !== true &&
  event.modifiers?.alt !== true &&
  event.modifiers?.shift !== true;

const boundsOf = (
  renderer: NativeRenderer | null,
  id: number | undefined,
): Option.Option<{
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}> =>
  id === undefined
    ? Option.none()
    : Option.fromNullishOr(renderer?.getElementBounds?.(id));

export const Kanban = ({
  columns,
  cards,
  order,
  defaultOrder,
  onOrderChange,
  onMove,
  onCardClick,
  label,
  cardLabel,
  renderCard,
  style,
  testId,
}: KanbanProps) => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const [stored, setStored] = useControllableState<KanbanOrder>({
    value: order,
    defaultValue: resolveOrder(cards, columns, defaultOrder),
    onChange: onOrderChange,
  });
  const placed = resolveOrder(cards, columns, stored);
  const [dragging, setDragging] = useState<Option.Option<string>>(
    Option.none(),
  );
  const [drop, setDrop] = useState<Option.Option<DropTarget>>(Option.none());
  const drag = useRef<Option.Option<Drag>>(Option.none());
  const suppressClick = useRef(false);
  const pendingFocus = useRef<Option.Option<string>>(Option.none());
  const columnIds = useRef(new Map<string, number>());
  const cardIds = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    Option.match(pendingFocus.current, {
      onNone: () => undefined,
      onSome: (id) => {
        pendingFocus.current = Option.none();
        Option.match(Option.fromNullishOr(cardIds.current.get(id)), {
          onNone: () => undefined,
          onSome: (nativeId) => renderer?.focusElement?.(nativeId),
        });
      },
    });
  });

  const apply = (move: KanbanMove): void => {
    const current = Option.getOrElse(
      Arr.findFirstIndex(
        columnCards(placed, move.from),
        (id) => id === move.id,
      ),
      () => -1,
    );
    if (move.to === move.from && move.index === current) return;
    pendingFocus.current = Option.some(move.id);
    setStored(moveCardInOrder(placed, move.id, move.to, move.index));
    onMove?.(move);
  };

  const dropAt = (
    x: number,
    y: number,
    id: string,
  ): Option.Option<DropTarget> => {
    const boxes: ReadonlyArray<KanbanColumnBox> = Arr.flatMap(
      columns,
      (column) =>
        Option.match(boundsOf(renderer, columnIds.current.get(column.id)), {
          onNone: () => [],
          onSome: (box) => [
            {
              id: column.id,
              left: box.x,
              right: box.x + box.width,
            },
          ],
        }),
    );

    return Option.map(columnAt(x, boxes), (column) => {
      const centres = Arr.flatMap(columnCards(placed, column), (card) =>
        card === id
          ? []
          : Option.match(boundsOf(renderer, cardIds.current.get(card)), {
              onNone: () => [],
              onSome: (box) => [box.y + box.height / 2],
            }),
      );
      return { column, index: dropIndexFromCentres(centres, y) };
    });
  };

  const finishDrag = (event: EventPayload): void => {
    Option.match(drag.current, {
      onNone: () => undefined,
      onSome: (gesture) => {
        const x = event.x ?? gesture.x;
        const y = event.y ?? gesture.y;
        drag.current = Option.none();
        suppressClick.current = gesture.moved;
        setDragging(Option.none());
        setDrop(Option.none());
        if (!gesture.moved) return;
        Option.match(dropAt(x, y, gesture.id), {
          onNone: () => undefined,
          onSome: (target) =>
            apply({
              id: gesture.id,
              from: Option.getOrElse(
                Option.map(
                  Arr.findFirst(placed, (entry) => entry.id === gesture.id),
                  (entry) => entry.column,
                ),
                () => target.column,
              ),
              to: target.column,
              index: target.index,
            }),
        });
      },
    });
  };

  const cardSurface = (draggingHere: boolean): StyleDesc => ({
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    color: theme.colors.cardForeground,
    cursor: draggingHere ? "grabbing" : "grab",
    opacity: draggingHere ? 0.45 : 1,
    ...keyboardRing(theme),
  });

  const dropLine = (key: string) => (
    <div
      key={key}
      testId={testId === undefined ? undefined : `${testId}-drop-line`}
      role="presentation"
      style={{
        height: 2,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.primary,
      }}
    />
  );

  return (
    <div
      role="group"
      aria-label={label ?? "Kanban board"}
      testId={testId}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.lg,
          width: "100%",
          minWidth: 0,
        },
        style,
      )}
    >
      {Arr.map(columns, (column) => {
        const ids = columnCards(placed, column.id);
        const target = Option.exists(drop, (held) => held.column === column.id);
        const visible = Arr.filter(
          ids,
          (id) => !Option.exists(dragging, (held) => held === id),
        );
        const before = Option.flatMap(drop, (held) =>
          held.column === column.id
            ? Arr.get(visible, held.index)
            : Option.none(),
        );

        return (
          <div
            key={column.id}
            ref={(instance: PublicInstance | null) => {
              if (instance === null) columnIds.current.delete(column.id);
              else columnIds.current.set(column.id, instance.id);
            }}
            role="group"
            aria-label={column.title}
            testId={locatorOf(testId, "column", column.id)}
            style={{
              display: "flex",
              flexGrow: 1,
              flexBasis: 0,
              flexDirection: "column",
              gap: theme.spacing.sm,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
                paddingLeft: theme.spacing["2xs"],
                paddingRight: theme.spacing["2xs"],
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {column.title}
              </text>
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {String(Arr.length(ids))}
              </text>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.sm,
                minHeight: theme.spacing["2xs"],
              }}
            >
              {Arr.map(ids, (id) => {
                const card = Arr.findFirst(cards, (entry) => entry.id === id);
                return Option.match(card, {
                  onNone: () => null,
                  onSome: (card) => {
                    const draggingHere = Option.exists(
                      dragging,
                      (held) => held === card.id,
                    );
                    const lineHere = Option.exists(
                      before,
                      (anchor) => anchor === card.id,
                    );
                    return (
                      <Fragment key={card.id}>
                        {target && lineHere
                          ? dropLine(`${card.id}-before`)
                          : null}
                        <div
                          ref={(instance: PublicInstance | null) => {
                            if (instance === null)
                              cardIds.current.delete(card.id);
                            else cardIds.current.set(card.id, instance.id);
                          }}
                          role="button"
                          aria-label={cardLabel?.(card) ?? card.title}
                          aria-description="Use the arrow keys to move this card."
                          tabIndex={0}
                          testId={locatorOf(testId, "card", card.id)}
                          style={cardSurface(draggingHere)}
                          onMouseDown={(event) => {
                            if (!primaryButton(event)) return;
                            suppressClick.current = false;
                            drag.current = Option.some({
                              id: card.id,
                              x: event.x ?? 0,
                              y: event.y ?? 0,
                              moved: false,
                            });
                            Option.match(
                              Option.fromNullishOr(
                                cardIds.current.get(card.id),
                              ),
                              {
                                onNone: () => undefined,
                                onSome: (id) => renderer?.focusElement?.(id),
                              },
                            );
                            setDragging(Option.some(card.id));
                          }}
                          onMouseMove={(event) => {
                            Option.match(drag.current, {
                              onNone: () => undefined,
                              onSome: (gesture) => {
                                if (event.pressedButton !== 0) {
                                  drag.current = Option.none();
                                  setDragging(Option.none());
                                  setDrop(Option.none());
                                  return;
                                }
                                const x = event.x ?? gesture.x;
                                const y = event.y ?? gesture.y;
                                if (
                                  !gesture.moved &&
                                  Math.abs(x - gesture.x) < 4 &&
                                  Math.abs(y - gesture.y) < 4
                                ) {
                                  return;
                                }
                                gesture.moved = true;
                                const next = dropAt(x, y, gesture.id);
                                setDrop((current) =>
                                  sameDrop(current, next) ? current : next,
                                );
                              },
                            });
                          }}
                          onMouseUp={finishDrag}
                          onClick={() => {
                            if (suppressClick.current) return;
                            onCardClick?.(card);
                          }}
                          onKeyDown={(event: KeyEvent) => {
                            Option.match(directionOf(event.key), {
                              onNone: () => undefined,
                              onSome: (direction) => {
                                if (!isPlain(event)) return;
                                event.preventDefault();
                                Option.match(
                                  keyboardMove(
                                    placed,
                                    columns,
                                    card.id,
                                    direction,
                                  ),
                                  {
                                    onNone: () => undefined,
                                    onSome: apply,
                                  },
                                );
                              },
                            });
                            if (event.key === "enter") onCardClick?.(card);
                            if (event.key === "space") event.preventDefault();
                          }}
                          onKeyUp={(event: KeyEvent) => {
                            if (event.key === "space") onCardClick?.(card);
                          }}
                        >
                          {renderCard === undefined ? (
                            <>
                              <text
                                style={{
                                  ...textStyle(theme, "bodyStrong"),
                                  color: theme.colors.cardForeground,
                                }}
                              >
                                {card.title}
                              </text>
                              {card.description === undefined ? null : (
                                <text
                                  style={{
                                    ...textStyle(theme, "caption"),
                                    color: theme.colors.mutedForeground,
                                  }}
                                >
                                  {card.description}
                                </text>
                              )}
                            </>
                          ) : (
                            renderCard(card, { dragging: draggingHere })
                          )}
                        </div>
                      </Fragment>
                    );
                  },
                });
              })}
              {target && Option.isNone(before)
                ? dropLine(`${column.id}-end`)
                : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const cardsInColumn = columnCards;

export const kanbanDirectionOf = (
  key: string | undefined,
): Option.Option<KanbanDirection> => directionOf(key);

export const kanbanMeta = {
  name: "Kanban",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "No `aria-grabbed` or `aria-dropeffect`: 0.11.0's aria set is closed, so a move is spoken through the card's name and the arrow-key contract",
    "No `document`, `window` or `getBoundingClientRect`: drag is pointer capture plus `renderer.getElementBounds`, which is why `@dnd-kit/core` cannot be used",
    "No live region: a move is not announced; the column counts are painted text",
  ],
  docs: "docs/kanban.mdx",
  example: "examples/kanban.example.tsx",
  testFile: "src/behaviour/kanban.test.tsx",
} as const;

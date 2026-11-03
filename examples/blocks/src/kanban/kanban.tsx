/** @jsxImportSource @gpuix/react */
/**
 * Kanban — three columns of cards; a card is dragged to another column.
 *
 * The drag is the divider's rule (`@gpuixui/dock`): a card subscribes to both
 * `onMouseDown` and `onMouseMove`, so the runtime captures the pointer for the
 * whole gesture. While it is held, a raised copy follows the pointer, drawn
 * last so it paints over every column. On release the card moves to the
 * column whose measured bounds (`onLayout`) hold the pointer.
 */
import { Avatar } from "@gpuixui/components/avatar";
import { Badge } from "@gpuixui/components/badge";
import { Card } from "@gpuixui/components/card";
import type { EventPayload } from "@gpuix/react";
import { Stack, Text } from "@gpuixui/primitives";
import { elevationShadow } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useRef, useState } from "react";
import { board, columns, type Column, type Task } from "./data.js";
import { columnAt, moveTask, type Bounds } from "./logic.js";

interface Drag {
  readonly id: string;
  readonly from: Column;
  readonly originX: number;
  readonly originY: number;
  readonly dx: number;
  readonly dy: number;
}

interface Rect extends Bounds {
  readonly y: number;
  readonly height: number;
}

const rectOf = (event: EventPayload): Rect => ({
  x: event.x ?? 0,
  y: event.y ?? 0,
  width: event.width ?? 0,
  height: event.height ?? 0,
});

/** The board, as a window's whole content. */
export const Kanban = () => {
  const theme = useTheme();
  const [tasks, setTasks] = useState(board);
  // The press lives in a ref: the runtime can deliver a whole gesture before
  // React commits the render the press scheduled (`drag-between-panes`).
  const drag = useRef<Drag | null>(null);
  const [offset, setOffset] = useState<Pick<Drag, "id" | "dx" | "dy"> | null>(
    null,
  );
  const bounds = useRef<Partial<Record<Column, Bounds>>>({});
  // Where each card and the board sit in the window, for the ghost's position.
  const rects = useRef<Partial<Record<string, Rect>>>({});
  const origin = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 });

  const drop = (x: number) => {
    const pressed = drag.current;
    if (pressed === null) return;
    Option.map(columnAt(bounds.current, x), (to) =>
      setTasks((now) => moveTask(now, pressed.id, pressed.from, to)),
    );
    drag.current = null;
    setOffset(null);
  };

  const face = (task: Task) => (
    <Stack direction="column" gap="sm">
      <Text role="label">{task.title}</Text>
      <Stack direction="row" align="center" justify="between">
        <Badge variant="neutral">{task.tag}</Badge>
        <Avatar name={task.owner} size="sm" />
      </Stack>
    </Stack>
  );

  // Both listeners sit on the card, the element that paints a background: a
  // press stops at the first painted hitbox, and the pair arms pointer capture.
  // The card stays in its slot, faded, and keeps the gesture.
  const card = (column: Column, task: Task) => (
    <Card
      key={task.id}
      variant="outline"
      testId={`task-${task.id}`}
      style={{
        padding: theme.spacing.lg,
        opacity: offset?.id === task.id ? 0.4 : 1,
      }}
      onLayout={(event) => {
        rects.current = { ...rects.current, [task.id]: rectOf(event) };
      }}
      onMouseDown={(event) => {
        drag.current = {
          id: task.id,
          from: column,
          originX: event.x ?? 0,
          originY: event.y ?? 0,
          dx: 0,
          dy: 0,
        };
        setOffset({ id: task.id, dx: 0, dy: 0 });
      }}
      onMouseMove={(event) => {
        const pressed = drag.current;
        if (pressed?.id !== task.id) return;
        if (event.pressedButton !== 0) return drop(event.x ?? pressed.originX);
        setOffset({
          id: task.id,
          dx: (event.x ?? 0) - pressed.originX,
          dy: (event.y ?? 0) - pressed.originY,
        });
      }}
      onMouseUp={(event) => drop(event.x ?? 0)}
    >
      {face(task)}
    </Card>
  );

  // The runtime paints siblings in tree order and the published API has no
  // `zIndex`, so the lifted card is drawn last, over every column.
  const ghost = Option.flatMap(Option.fromNullishOr(offset), (lifted) =>
    Option.flatMap(Option.fromNullishOr(rects.current[lifted.id]), (rect) =>
      Option.map(
        Arr.findFirst(
          Arr.flatten(Arr.map(columns, (column) => tasks[column])),
          (task) => task.id === lifted.id,
        ),
        (task) => (
          <Card
            variant="outline"
            testId="task-ghost"
            style={{
              position: "absolute",
              left: rect.x - origin.current.x + lifted.dx,
              top: rect.y - origin.current.y + lifted.dy,
              width: rect.width,
              padding: theme.spacing.lg,
              pointerEvents: "none",
              boxShadow: elevationShadow(theme, "lg"),
            }}
          >
            {face(task)}
          </Card>
        ),
      ),
    ),
  );

  return (
    <div
      testId="kanban"
      onLayout={(event) => {
        origin.current = rectOf(event);
      }}
      style={{
        display: "flex",
        flexDirection: "row",
        gap: theme.spacing.lg,
        flexGrow: 1,
        width: "100%",
        height: "100%",
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      {Arr.map(columns, (column) => (
        <div
          key={column}
          testId={`column-${column}`}
          onLayout={(event) => {
            bounds.current = {
              ...bounds.current,
              [column]: { x: event.x ?? 0, width: event.width ?? 0 },
            };
          }}
          style={{
            flexGrow: 1,
            flexBasis: 0,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.muted,
          }}
        >
          <Stack
            direction="row"
            align="center"
            justify="between"
            style={{ paddingBottom: theme.spacing.xs }}
          >
            <Text role="label">{column}</Text>
            <Text role="caption" tone="muted">
              {String(tasks[column].length)}
            </Text>
          </Stack>
          {Arr.map(tasks[column], (task) => card(column, task))}
        </div>
      ))}
      {Option.getOrNull(ghost)}
    </div>
  );
};

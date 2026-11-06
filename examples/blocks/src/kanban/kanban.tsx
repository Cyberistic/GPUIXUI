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

export const Kanban = () => {
  const theme = useTheme();
  const [tasks, setTasks] = useState(board);

  const drag = useRef<Drag | null>(null);
  const [offset, setOffset] = useState<Pick<Drag, "id" | "dx" | "dy"> | null>(
    null,
  );
  const bounds = useRef<Partial<Record<Column, Bounds>>>({});

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

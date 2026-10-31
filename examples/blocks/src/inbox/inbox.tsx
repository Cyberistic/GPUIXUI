/**
 * Inbox — a thread list beside the open thread. A click on a thread opens it.
 */
import { Avatar } from "@gpuixui/components/avatar";
import { Badge } from "@gpuixui/components/badge";
import { Button, Separator, Stack, Text } from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { threads } from "./data.js";

/** The inbox, as a window's whole content. */
export const Inbox = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(threads[0]?.id ?? "");
  const current = Arr.findFirst(threads, (thread) => thread.id === open);
  return (
    <Stack
      direction="row"
      testId="inbox"
      style={{
        flexGrow: 1,
        width: "100%",
        height: "100%",
        alignItems: "stretch",
        backgroundColor: theme.colors.background,
      }}
    >
      <Stack
        direction="column"
        style={{
          flexBasis: 0,
          flexGrow: 2,
          borderRightWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        {Arr.map(threads, (thread) => (
          <div
            key={thread.id}
            testId={`thread-${thread.id}`}
            onClick={() => setOpen(thread.id)}
            style={{
              display: "flex",
              flexDirection: "row",
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              borderBottomWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor:
                thread.id === open ? theme.colors.accent : undefined,
            }}
          >
            <Avatar name={thread.from} size="sm" />
            <Stack
              direction="column"
              gap="2xs"
              style={{ flexGrow: 1, minWidth: 0 }}
            >
              <Stack direction="row" justify="between" align="center">
                <Text role="label">{thread.from}</Text>
                <Text role="caption" tone="muted">
                  {thread.when}
                </Text>
              </Stack>
              <Text role="body" truncate>
                {thread.subject}
              </Text>
              <Text role="caption" tone="muted" truncate>
                {thread.preview}
              </Text>
            </Stack>
          </div>
        ))}
      </Stack>
      {Option.match(current, {
        onNone: () => null,
        onSome: (thread) => (
          <Stack
            direction="column"
            gap="lg"
            style={{ flexBasis: 0, flexGrow: 3, padding: theme.spacing.xl }}
          >
            <Stack direction="row" gap="sm" align="center">
              <Avatar name={thread.from} size="md" />
              <Stack direction="column" gap="2xs" style={{ flexGrow: 1 }}>
                <Text role="label">{thread.from}</Text>
                <Text role="caption" tone="muted">
                  {thread.when}
                </Text>
              </Stack>
              {thread.unread ? <Badge variant="primary">New</Badge> : null}
            </Stack>
            <Separator orientation="horizontal" />
            <Text role="h3">{thread.subject}</Text>
            <Text role="body" tone="muted">
              {thread.preview}
            </Text>
            <Stack direction="row" gap="sm">
              <Button variant="primary" size="sm">
                Reply
              </Button>
              <Button variant="ghost" size="sm">
                Archive
              </Button>
            </Stack>
          </Stack>
        ),
      })}
    </Stack>
  );
};

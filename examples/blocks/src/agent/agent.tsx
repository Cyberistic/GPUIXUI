/**
 * Agent — an AI coding assistant window (plan 729): sessions in the source
 * list, the transcript and a composer in the content, and the files the
 * session touched in the inspector.
 */
import { Avatar } from "@gpuixui/components/avatar";
import { Badge } from "@gpuixui/components/badge";
import { Button, Input, Stack, Text } from "@gpuixui/primitives";
import { SourceList, Window, WindowToolbar } from "@gpuixui/shell";
import type { PlatformName } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { sessions, touched, transcript } from "./data.js";
import { send } from "./logic.js";

export const Agent = ({ platform }: { readonly platform?: PlatformName }) => {
  const theme = useTheme();
  const [session, setSession] = useState<string>("s1");
  const [turns, setTurns] = useState(transcript);
  const [draft, setDraft] = useState("");
  const submit = () => {
    setTurns(send(turns, draft));
    setDraft("");
  };

  return (
    <Window
      testId="agent"
      {...(platform === undefined ? {} : { platform })}
      sidebar={
        <SourceList
          label="Sessions"
          value={session}
          onValueChange={setSession}
          sections={[
            {
              id: "sessions",
              title: "Today",
              items: Arr.map(sessions, (entry) => ({
                id: entry.id,
                label: entry.label,
                icon: "bot" as const,
              })),
            },
          ]}
        />
      }
      toolbar={
        <WindowToolbar
          title="Retry failed payments"
          actions={<Badge variant="success">Tests pass</Badge>}
        />
      }
      inspector={
        <Stack
          direction="column"
          gap="sm"
          style={{ padding: theme.spacing.lg }}
        >
          <Text role="bodyStrong">Changed files</Text>
          {Arr.map(touched, (file) => (
            <Stack
              key={file.path}
              direction="row"
              style={{ justifyContent: "space-between" }}
            >
              <Text>{file.path}</Text>
              <Text tone="muted">{file.change}</Text>
            </Stack>
          ))}
        </Stack>
      }
    >
      <Stack
        direction="column"
        gap="md"
        style={{ flexGrow: 1, padding: theme.spacing.lg }}
      >
        {Arr.map(turns, (turn) => (
          <Stack
            key={turn.id}
            direction="row"
            gap="sm"
            testId={`turn-${turn.id}`}
            style={{ alignItems: "flex-start" }}
          >
            <Avatar
              name={turn.from === "you" ? "Leorio Paradinight" : "Agent"}
              size="xs"
            />
            <Text style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
              {turn.text}
            </Text>
          </Stack>
        ))}
      </Stack>
      <Stack
        direction="row"
        gap="sm"
        style={{
          padding: theme.spacing.md,
          borderTopWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <Input
          label="Message"
          testId="composer"
          placeholder="Ask the agent"
          value={draft}
          onValueChange={setDraft}
          onSubmit={submit}
          style={{ flexGrow: 1 }}
        />
        <Button testId="send" onActivate={submit}>
          Send
        </Button>
      </Stack>
    </Window>
  );
};

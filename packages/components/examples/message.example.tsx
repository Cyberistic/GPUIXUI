/**
 * Message example: the three row variants and every slot, without a transport.
 *
 * "Stream the reply" grows the assistant body token by token, which proves
 * markdown repaint and the streaming status. "Fail the tool call" flips the
 * fetch row to `failed` so the destructive status is visible. "Retry" is the
 * consumer's action slot; it only reports the intent.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import {
  Message,
  MessageActions,
  MessageAttachments,
  MessageAvatar,
  MessageContent,
  MessageReasoning,
  MessageSources,
  MessageStreaming,
  MessageToolCalls,
} from "../src/message.js";

const WORDS = [
  "Here",
  "is",
  "the",
  "answer:",
  "the",
  "dialog",
  "traps",
  "Tab.",
];

/** A conversation excerpt with a live stream and a failing tool call. */
export const MessageExample = () => {
  const theme = useTheme();
  const [body, setBody] = useState("The dialog **traps** Tab.");
  const [streaming, setStreaming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retries, setRetries] = useState(0);
  const remaining = useRef(0);

  useEffect(() => {
    if (!streaming) return;
    const timer = setInterval(() => {
      if (remaining.current <= 0) {
        setStreaming(false);
        return;
      }
      remaining.current -= 1;
      const word = WORDS[WORDS.length - remaining.current - 1] ?? "…";
      setBody((current) => `${current} ${word}`);
    }, 140);
    return () => clearInterval(timer);
  }, [streaming]);

  const stream = (): void => {
    if (streaming) return;
    remaining.current = WORDS.length;
    setStreaming(true);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        width: 560,
      }}
    >
      <Message variant="system">
        <MessageContent text="Session started · 10:42" format="text" />
      </Message>

      <Message variant="assistant">
        <MessageAvatar name="Ada Lovelace" testId="assistant-avatar" />
        <MessageContent testId="assistant-body" text={body} />
        <MessageStreaming testId="streaming" />
        <MessageReasoning
          testId="reasoning"
          text="Checked the modal rules before answering."
        />
        <MessageToolCalls
          calls={[
            { name: "search_docs", status: "done", result: "3 results" },
            {
              name: "read_dialog",
              status: failed ? "failed" : "done",
              result: failed ? "permission denied" : "focused surface found",
            },
          ]}
        />
        <MessageSources
          sources={[
            { label: "Dialog docs", url: "https://ui.shadcn.com/docs" },
          ]}
          onSelect={() => undefined}
        />
        <MessageActions>
          <Button size="sm" onClick={stream} disabled={streaming}>
            Stream the reply
          </Button>
          <Button size="sm" onClick={() => setRetries((count) => count + 1)}>
            Retry
          </Button>
        </MessageActions>
      </Message>

      <Message variant="user">
        <MessageAvatar name="Grace Hopper" testId="user-avatar" />
        <MessageContent
          text="Does the dialog return focus to the trigger?"
          format="text"
        />
        <MessageAttachments
          attachments={[{ name: "notes.md", meta: "4 KB" }]}
        />
      </Message>

      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.sm }}
      >
        <Button size="sm" variant="ghost" onClick={() => setFailed(!failed)}>
          {failed ? "Fix the tool call" : "Fail the tool call"}
        </Button>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {retries === 0
            ? "Retry is the consumer's action."
            : `Retry reported ${retries} ${retries === 1 ? "time" : "times"}.`}
        </text>
      </div>
    </div>
  );
};

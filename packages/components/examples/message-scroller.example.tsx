/**
 * MessageScroller example: a conversation that follows new rows and leaves a
 * reader who scrolled up alone.
 *
 * "Append message" adds a row. "Stream a reply" grows the last row token by
 * token, which proves the pinned viewport keeps the bottom in sight without a
 * new child. Scroll up first and the affordance appears while the same stream
 * keeps running.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import {
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "../src/message-scroller.js";

interface Message {
  readonly id: number;
  readonly from: string;
  readonly body: string;
}

const initial: ReadonlyArray<Message> = [
  { id: 1, from: "Ada", body: "The layout pass is done." },
  { id: 2, from: "Grace", body: "Overlays still need a native check." },
  { id: 3, from: "Ada", body: "I will take the dialog probe." },
];

const WORDS = [
  "Here",
  "is",
  "the",
  "streamed",
  "reply:",
  "tokens",
  "arrive",
  "while",
  "the",
  "reader",
  "stays",
  "where",
  "they",
  "are.",
];

/** A conversation with an append control and a token-stream control. */
export const MessageScrollerExample = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState(initial);
  const [streaming, setStreaming] = useState(false);
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
      setMessages((current) => {
        const last = current[current.length - 1];
        if (last === undefined) return current;
        return [
          ...current.slice(0, -1),
          { ...last, body: `${last.body} ${word}` },
        ];
      });
    }, 140);
    return () => clearInterval(timer);
  }, [streaming]);

  const append = (): void => {
    setMessages((current) => [
      ...current,
      {
        id: current.length + 1,
        from: "Ada",
        body: `Message ${current.length + 1} from the app.`,
      },
    ]);
  };

  const stream = (): void => {
    if (streaming) return;
    remaining.current = WORDS.length;
    setMessages((current) => [
      ...current,
      { id: current.length + 1, from: "Assistant", body: "" },
    ]);
    setStreaming(true);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 520,
      }}
    >
      <MessageScroller label="Conversation">
        <MessageScrollerViewport
          testId="message-scroller"
          style={{
            height: 280,
            padding: theme.spacing.md,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.card,
          }}
        >
          {messages.map((message) => (
            <MessageScrollerItem key={message.id}>
              <text
                style={{
                  ...textStyle(theme, "label"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {message.from}
              </text>
              <text>{message.body}</text>
            </MessageScrollerItem>
          ))}
        </MessageScrollerViewport>
        <MessageScrollerJumpToLatest />
      </MessageScroller>
      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.sm }}
      >
        <Button size="sm" onClick={append}>
          Append message
        </Button>
        <Button size="sm" onClick={stream} disabled={streaming}>
          {streaming ? "Streaming…" : "Stream a reply"}
        </Button>
      </div>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Scroll up, then append or stream: the view stays put and the affordance
        counts what arrived.
      </text>
    </div>
  );
};

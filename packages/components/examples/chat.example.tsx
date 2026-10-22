/**
 * Chat example: a conversation driven by the same state machine the components
 * use, with a scripted reply — no model is called.
 *
 * Send a message: it is appended, the status walks `submitting → streaming`, and
 * words arrive one at a time. Stop ends the reply early (`Escape` does the same
 * through the composer). Every third send fails on purpose so the retry path is
 * one press away.
 */

import { useEffect, useRef, useState } from "react";
import {
  ChatComposer,
  ChatMessages,
  ChatRoot,
  chatMove,
  type ChatStatus,
} from "../src/chat.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import {
  MessageAvatar,
  MessageContent,
  MessageRoot,
  type MessageVariant,
} from "../src/message.js";

const REPLY =
  "The release is green. Three fixes landed: the overlay dismissal order, the tabs anchor and the disabled label.";

interface Row {
  readonly id: number;
  readonly variant: MessageVariant;
  readonly body: string;
  readonly streaming: boolean;
}

const seed: ReadonlyArray<Row> = [
  { id: 1, variant: "user", body: "Is the release green?", streaming: false },
  {
    id: 2,
    variant: "assistant",
    body: "Not yet — the last fix is still running.",
    streaming: false,
  },
];

/** Replace the last row's body and streaming marker. */
const editLast = (rows: ReadonlyArray<Row>, body: string, streaming: boolean) =>
  rows.map((row, index) =>
    index === rows.length - 1 ? { ...row, body, streaming } : row,
  );

/** Mark the last row finished without touching what it said. */
const finishLast = (rows: ReadonlyArray<Row>): ReadonlyArray<Row> =>
  rows.map((row, index) =>
    index === rows.length - 1 ? { ...row, streaming: false } : row,
  );

/** A conversation with a scripted stream, a stop control and a failure path. */
export const ChatExample = () => {
  const theme = useTheme();
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [rows, setRows] = useState<ReadonlyArray<Row>>(seed);
  const words = useRef<ReadonlyArray<string>>([]);
  const sends = useRef(0);
  const shouldFail = useRef(false);
  const nextId = useRef(seed.length + 1);

  useEffect(() => {
    if (status === "idle" || status === "error") return;
    if (status === "submitting") {
      const opening = setTimeout(() => setStatus("streaming"), 250);
      return () => clearTimeout(opening);
    }

    const timer = setInterval(() => {
      if (shouldFail.current && words.current.length <= 6) {
        setStatus("error");
        setRows((current) => editLast(current, "The deploy timed out.", false));
        return;
      }
      const remaining = words.current.slice(1);
      const word = words.current[0];
      if (word === undefined) {
        setStatus("idle");
        setRows(finishLast);
        return;
      }
      words.current = remaining;
      setRows((current) =>
        editLast(
          current,
          current[current.length - 1]?.body === ""
            ? word
            : `${current[current.length - 1]?.body} ${word}`,
          remaining.length > 0,
        ),
      );
    }, 110);

    return () => clearInterval(timer);
  }, [status]);

  const send = (message: string): void => {
    if (chatMove(status, "submit").status === status) return;
    sends.current += 1;
    shouldFail.current = sends.current % 3 === 0;
    words.current = REPLY.split(" ");
    setRows((current) => [
      ...current,
      {
        id: nextId.current++,
        variant: "user",
        body: message,
        streaming: false,
      },
      {
        id: nextId.current++,
        variant: "assistant",
        body: "",
        streaming: true,
      },
    ]);
  };

  const stop = (): void => {
    words.current = [];
    setRows(finishLast);
  };

  const retry = (): void => {
    shouldFail.current = false;
    words.current = REPLY.split(" ");
    setRows((current) => [
      ...current,
      {
        id: nextId.current++,
        variant: "assistant",
        body: "",
        streaming: true,
      },
    ]);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 560,
        height: 460,
      }}
    >
      <ChatRoot
        label="Release conversation"
        status={status}
        onStatusChange={setStatus}
        onSubmit={send}
        onStop={stop}
        onRetry={retry}
        error="The reply failed. Retry, or send a shorter prompt."
      >
        <ChatMessages testId="chat-example-messages">
          {rows.map((row) => (
            <MessageRoot
              key={row.id}
              testId={`chat-row-${row.id}`}
              variant={row.variant}
            >
              <MessageAvatar />
              <MessageContent
                testId={`chat-body-${row.id}`}
                streaming={row.streaming}
              >
                <text>{row.body}</text>
              </MessageContent>
            </MessageRoot>
          ))}
        </ChatMessages>
        <ChatComposer
          testId="chat-example-composer"
          hint="Enter sends · Shift+Enter adds a line · Escape stops the reply"
        />
      </ChatRoot>
      <text
        testId="chat-example-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`Scripted transport · ${status} · ${rows.length} rows`}
      </text>
    </div>
  );
};

/**
 * Chat example: a real conversation loop with a simulated transport.
 *
 * The app owns the async work: it appends the user row, sets `submitting`, then
 * grows the assistant row (`streaming`) and finally sets `idle` — or `error` when
 * "Fail the reply" is on, which shows the alert and lets the draft retry. "Attach"
 * appends a fake attachment through the app's own callback; the component only
 * renders the control.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { Chat, ChatComposer, ChatMessages } from "../src/chat.js";
import type { ChatStatus } from "../src/chat/logic.js";
import { ChatStatus as Status } from "../src/chat/logic.js";
import {
  Message,
  MessageActions,
  MessageAttachments,
  MessageAvatar,
  MessageContent,
  MessageReasoning,
} from "../src/message.js";

interface Turn {
  readonly id: number;
  readonly from: "user" | "assistant";
  readonly body: string;
  readonly attachment?: string;
}

const REPLY = ["Tab", "wraps", "inside", "the", "dialog,", "then", "returns."];

const initial: ReadonlyArray<Turn> = [
  { id: 1, from: "user", body: "How does the dialog handle focus?" },
  {
    id: 2,
    from: "assistant",
    body: "It moves focus into the surface and returns it to the trigger.",
  },
];

/** A conversation with a simulated stream, a failure path and an attach hook. */
export const ChatExample = () => {
  const theme = useTheme();
  const [status, setStatus] = useState<ChatStatus>({ _tag: "idle" });
  const [turns, setTurns] = useState<ReadonlyArray<Turn>>(initial);
  const [fail, setFail] = useState(false);
  const [attached, setAttached] = useState(0);
  const remaining = useRef(0);

  useEffect(() => {
    if (!Status.guards.streaming(status)) return;
    const timer = setInterval(() => {
      if (remaining.current <= 0) {
        setStatus({ _tag: "idle" });
        return;
      }
      remaining.current -= 1;
      const word = REPLY[REPLY.length - remaining.current - 1] ?? "…";
      setTurns((current) => {
        const last = current[current.length - 1];
        if (last === undefined || last.from !== "assistant") return current;
        return [
          ...current.slice(0, -1),
          { ...last, body: `${last.body} ${word}` },
        ];
      });
      if (fail && remaining.current === 2) {
        setStatus({ _tag: "error", message: "The connection dropped." });
      }
    }, 180);
    return () => clearInterval(timer);
  }, [status, fail]);

  const submit = (text: string): void => {
    const id = turns.length + 1;
    setTurns((current) => [
      ...current,
      { id, from: "user", body: text },
      { id: id + 1, from: "assistant", body: "" },
    ]);
    remaining.current = REPLY.length;
    setStatus({ _tag: "submitting" });
    setTimeout(() => setStatus({ _tag: "streaming" }), 200);
  };

  const stop = (): void => {
    remaining.current = 0;
    setStatus({ _tag: "idle" });
  };

  const attach = (): void => {
    const next = attached + 1;
    setAttached(next);
    setTurns((current) => [
      ...current,
      {
        id: current.length + 1,
        from: "user",
        body: "Attached a file for context.",
        attachment: `notes-${next}.md`,
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
        height: 600,
      }}
    >
      <Chat
        label="Assistant"
        status={status}
        onStatusChange={setStatus}
        onSubmit={submit}
        onStop={stop}
        onAttach={attach}
      >
        <ChatMessages testId="chat-messages">
          {turns.map((turn) => (
            <Message key={turn.id} variant={turn.from}>
              <MessageAvatar name={turn.from === "user" ? "Grace" : "Ada"} />
              <MessageContent
                text={turn.body === "" ? "…" : turn.body}
                format={turn.from === "user" ? "text" : "markdown"}
              />
              {turn.from === "assistant" ? (
                <>
                  <MessageReasoning text="Checked the modal focus rules." />
                  <MessageActions>
                    <Button size="sm" onClick={() => submit("Explain again")}>
                      Retry
                    </Button>
                  </MessageActions>
                </>
              ) : null}
              {turn.attachment === undefined ? null : (
                <MessageAttachments
                  attachments={[{ name: turn.attachment, meta: "4 KB" }]}
                />
              )}
            </Message>
          ))}
        </ChatMessages>
        <ChatComposer
          label="Message the assistant"
          testId="composer"
          placeholder="Ask about the dialog…"
        />
      </Chat>
      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.sm }}
      >
        <Button size="sm" variant="ghost" onClick={() => setFail(!fail)}>
          {fail ? "Let the reply finish" : "Fail the reply"}
        </Button>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Status:{" "}
          {Status.match(status, {
            idle: () => "idle",
            submitting: () => "submitting",
            streaming: () => "streaming",
            error: () => "error",
          })}
        </text>
      </div>
    </div>
  );
};

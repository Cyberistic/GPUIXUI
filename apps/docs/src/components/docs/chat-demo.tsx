/**
 * Browser preview for the Chat page.
 *
 * The shipped chat is a conversation scaffold: `ChatRoot` owns a four-state
 * status machine (`idle` / `submitting` / `streaming` / `error`), `ChatMessages`
 * is the scroller that follows the tail and holds the empty and failed-reply
 * panels, and `ChatComposer` is the field whose control swaps between Send and
 * Stop. The preview mirrors that contract with HTML: the composer refuses an
 * empty send, a busy conversation shows Stop, and the failed-reply row sits
 * between the transcript and the composer, where a reader who scrolled up still
 * sees it. The transport is the consumer's; the preview never calls a model.
 */

import { useState } from "react";

type ChatStatus = "idle" | "streaming" | "error";

const transcript: ReadonlyArray<{
  readonly role: "assistant" | "user";
  readonly author: string;
  readonly body: string;
}> = [
  {
    role: "assistant",
    author: "Assistant",
    body: "The deploy finished — every check is green.",
  },
  {
    role: "user",
    author: "You",
    body: "Roll it to the whole team, then.",
  },
];

export function ChatDemo() {
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [draft, setDraft] = useState("");
  const busy = status === "streaming";

  return (
    <div className="gx-chat">
      <div className="gx-chat-head">
        <div className="gx-chat-head-copy">
          <p className="gx-chat-title">Atlas support</p>
          <p className="gx-chat-status" role="status">
            status: <b>{status}</b>
          </p>
        </div>
        <div aria-label="Conversation status" className="gx-chat-switch">
          {(["idle", "streaming", "error"] as const).map((value) => (
            <button
              aria-pressed={status === value}
              className="gx-chat-choice"
              data-chosen={status === value ? "" : undefined}
              key={value}
              onClick={() => setStatus(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="gx-chat-messages">
        {transcript.map((message) => (
          <div
            className="gx-chat-row"
            data-role={message.role}
            key={message.role}
          >
            <span aria-hidden="true" className="gx-chat-avatar">
              {message.role === "user" ? "Y" : "A"}
            </span>
            <div className="gx-chat-bubble" data-role={message.role}>
              <span className="gx-chat-author">{message.author}</span>
              <span className="gx-chat-body">{message.body}</span>
            </div>
          </div>
        ))}
      </div>

      {status === "error" ? (
        <div className="gx-chat-error">
          <span className="gx-chat-error-text">The reply failed.</span>
          <button
            className="gx-btn gx-btn-secondary gx-btn-sm"
            onClick={() => setStatus("idle")}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="gx-chat-composer">
        <div className="gx-chat-composer-row">
          <textarea
            aria-label="Message"
            className="gx-chat-field"
            onChange={(event) => setDraft(event.currentTarget.value)}
            placeholder="Send a message…"
            value={draft}
          />
          {busy ? (
            <button
              className="gx-btn gx-btn-secondary gx-btn-sm"
              onClick={() => setStatus("idle")}
              type="button"
            >
              Stop
            </button>
          ) : (
            <button
              className="gx-btn gx-btn-primary gx-btn-sm"
              disabled={draft.trim() === ""}
              onClick={() => setDraft("")}
              type="button"
            >
              Send
            </button>
          )}
        </div>
        <span className="gx-chat-hint">
          Enter sends · Shift+Enter adds a line
        </span>
      </div>
    </div>
  );
}

export const chatDemoSource = `import {
  ChatComposer,
  ChatMessages,
  ChatRoot,
  MessageContent,
  MessageRoot,
} from "@gpuixui/components";

export const Conversation = ({
  status,
  setStatus,
  messages,
  send,
  stop,
  retry,
}) => (
  // The status machine is the one authority: while a reply is open the composer
  // shows Stop, and a submit is refused. The transport is the consumer's.
  <ChatRoot
    status={status}
    onStatusChange={setStatus}
    onSubmit={send}
    onStop={stop}
    onRetry={retry}
  >
    <ChatMessages>
      {messages.map((message) => (
        <MessageRoot key={message.id} variant={message.role}>
          <MessageContent>{message.body}</MessageContent>
        </MessageRoot>
      ))}
    </ChatMessages>
    <ChatComposer hint="Enter sends · Shift+Enter adds a line" />
  </ChatRoot>
);`;

/**
 * Browser preview for the Message page.
 *
 * A message is one row of a conversation: a variant (`user`, `assistant`,
 * `system`) plus optional slots — reasoning, tool calls, citations, a streaming
 * marker and an action row — that are data props, so a slot renders when it is
 * supplied. The preview draws a rich assistant reply (collapsed reasoning, a
 * done tool call, two citations, the action row) beside a user bubble and a
 * streaming reply, and lets the reader open the reasoning the way the native
 * `Collapsible` does.
 */

import { useState, type ReactNode } from "react";

type Variant = "user" | "assistant" | "system";

const AUTHOR: Readonly<Record<Variant, string>> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
};

function Avatar({ variant }: { readonly variant: Variant }) {
  return (
    <span aria-hidden="true" className="gx-message-avatar">
      {variant === "user" ? "Y" : "A"}
    </span>
  );
}

function Reasoning({ text }: { readonly text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="gx-message-reasoning">
      <button
        aria-expanded={open}
        className="gx-message-reasoning-trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>Reasoning</span>
        <span aria-hidden="true" className="gx-message-chevron">
          {open ? "⌃" : "⌄"}
        </span>
      </button>
      {open ? <p className="gx-message-reasoning-content">{text}</p> : null}
    </div>
  );
}

function ToolCall({
  name,
  status,
  result,
}: {
  readonly name: string;
  readonly status: "done" | "failed";
  readonly result: string;
}) {
  return (
    <div className="gx-message-tool">
      <div className="gx-message-tool-head">
        <span className="gx-message-tool-name">{name}</span>
        <span className="gx-message-tool-status" data-status={status}>
          {status === "failed" ? "✕" : "✓"}{" "}
          {status === "done" ? "Done" : "Failed"}
        </span>
      </div>
      <p className="gx-message-tool-result">{result}</p>
    </div>
  );
}

function Sources({ items }: { readonly items: ReadonlyArray<string> }) {
  return (
    <div className="gx-message-sources" aria-label="Sources" role="list">
      {items.map((item) => (
        <span className="gx-message-source" key={item} role="listitem">
          <span aria-hidden="true" className="gx-message-source-mark">
            ↗
          </span>
          {item}
        </span>
      ))}
    </div>
  );
}

function Actions({ onCopy }: { readonly onCopy: () => void }) {
  return (
    <div
      aria-label="Message actions"
      className="gx-message-actions"
      role="group"
    >
      <button
        className="gx-btn gx-btn-ghost gx-btn-sm"
        onClick={onCopy}
        type="button"
      >
        Copy
      </button>
      <button className="gx-btn gx-btn-ghost gx-btn-sm" type="button">
        Retry
      </button>
      <button className="gx-btn gx-btn-ghost gx-btn-sm" type="button">
        Helpful
      </button>
      <button className="gx-btn gx-btn-ghost gx-btn-sm" type="button">
        Not helpful
      </button>
    </div>
  );
}

function Row({
  variant,
  children,
}: {
  readonly variant: Variant;
  readonly children: ReactNode;
}) {
  return (
    <div
      className="gx-message"
      data-variant={variant}
      role="group"
      aria-label={AUTHOR[variant]}
    >
      <Avatar variant={variant} />
      <div className="gx-message-content" data-variant={variant}>
        {children}
      </div>
    </div>
  );
}

export function MessageDemo() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="gx-message-scene">
      <Row variant="assistant">
        <Reasoning text="The error is a timeout, not a schema mismatch, so the retry can reuse the same payload." />
        <div className="gx-message-bubble" data-variant="assistant">
          <p className="gx-message-body">
            The export timed out after three tries, so nothing left the machine.
            I bumped the retry budget and the next run should land it.
          </p>
        </div>
        <ToolCall
          name="export_runs"
          result="queued · 4,210 rows"
          status="done"
        />
        <Sources items={["docs/release-notes.md", "api/export"]} />
        <Actions
          onCopy={() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        />
        {copied ? (
          <span className="gx-message-copied" role="status">
            Copied — the consumer owns the clipboard path.
          </span>
        ) : null}
      </Row>

      <Row variant="user">
        <div className="gx-message-bubble" data-variant="user">
          <p className="gx-message-body">Thanks — roll it to staging.</p>
        </div>
      </Row>

      <Row variant="assistant">
        <div className="gx-message-bubble" data-variant="assistant">
          <p className="gx-message-body">Rolling it out now…</p>
        </div>
        <span className="gx-message-streaming">
          <span aria-hidden="true" className="gx-message-streaming-dot" />
          Streaming…
        </span>
      </Row>

      <p className="gx-message-note">
        A user message is a soft bubble on the right of its avatar; an
        assistant&rsquo;s is plain prose. The action row renders nothing without
        a handler, and Copy is the consumer&rsquo;s — the runtime has no
        clipboard write.
      </p>
    </div>
  );
}

export const messageDemoSource = `import {
  MessageActions,
  MessageAvatar,
  MessageContent,
  MessageRoot,
} from "@gpuixui/components";

export const Reply = ({ message, copy, retry, feedback }) => (
  <MessageRoot variant={message.role}>
    <MessageAvatar />
    <MessageContent
      reasoning={message.reasoning}
      toolCalls={message.tools}
      sources={message.sources}
      streaming={message.streaming}
    >
      <text>{message.body}</text>
      <MessageActions onCopy={copy} onRetry={retry} onFeedback={feedback} />
    </MessageContent>
  </MessageRoot>
);`;

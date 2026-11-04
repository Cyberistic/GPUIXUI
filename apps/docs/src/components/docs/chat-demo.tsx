/**
 * Browser block for the Chat page — the conversation, drawn as HTML.
 *
 * The shipped parts are GPUix host elements, so the docs mirror the composition
 * instead of mounting it: a fixed header, the transcript as the only flexible
 * row, a composer that never moves, and a jump control floating over the
 * transcript's bottom edge. Every turn is a `Message` row — an avatar and a meta
 * line where a speaker starts a run, then a `Bubble`; two consecutive replies
 * share one run and join their corners. The reader's bubble is the primary fill,
 * the agent's is muted, and one reply carries a reaction pill that crosses its
 * bottom edge.
 *
 * The conversation is the guild's: a dossier moves through its intel bank, its
 * seals, the exam and the register. The transport is scripted. The transcript
 * follows the live edge only while the reader is at it; scrolling up releases
 * the view and the floating control counts what arrived. The third send fails on
 * purpose so Retry is one press away.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { BrowserIcon } from "./browser-icon";

type ChatStatus = "idle" | "streaming" | "error";

type Group = "single" | "first" | "middle" | "last";

export interface Row {
  readonly id: number;
  readonly role: "assistant" | "user";
  readonly body: string;
  readonly at: string;
  readonly live: boolean;
  readonly reaction?: string;
  /** A picture the speaker sent, painted inside the bubble. */
  readonly image?: { readonly src: string; readonly alt: string };
}

const REPLY =
  "The dossier is sealed. The exam is recorded and the renown is on the licence.";

const seed: ReadonlyArray<Row> = [
  {
    id: 1,
    role: "user",
    body: "Is the Valar Mortis dossier ready for the register?",
    at: "09:41",
    live: false,
  },
  {
    id: 2,
    role: "assistant",
    body: "Not yet — the intel bank is still missing two seals.",
    at: "09:41",
    live: false,
  },
  {
    id: 3,
    role: "assistant",
    body: "The exam is passed. The renown is banked with the licence.",
    at: "09:42",
    live: false,
    reaction: "👍",
  },
  {
    id: 4,
    role: "user",
    body: "Then seal it and enter it in the register.",
    at: "09:42",
    live: false,
  },
];

const STATUS_COPY: Readonly<Record<ChatStatus, string>> = {
  idle: "Ask the agent to seal a dossier or move a licence.",
  streaming: "Replying…",
  error: "The reply failed. Retry, or send a shorter message.",
};

/** The turns of the transcript: consecutive rows from one speaker share a run. */
const runsOf = (rows: ReadonlyArray<Row>): ReadonlyArray<ReadonlyArray<Row>> =>
  rows.reduce<ReadonlyArray<ReadonlyArray<Row>>>((runs, row) => {
    const last = runs[runs.length - 1];
    return last?.[0]?.role === row.role
      ? [...runs.slice(0, -1), [...last, row]]
      : [...runs, [row]];
  }, []);

/** Where a row sits in its run, so a grouped bubble joins its inner corners. */
const groupOf = (index: number, length: number): Group =>
  length === 1
    ? "single"
    : index === 0
      ? "first"
      : index === length - 1
        ? "last"
        : "middle";

/** One turn: the avatar and meta line where a speaker starts, then the bubble. */
function Row({
  row,
  first,
  group,
  participants,
}: {
  readonly row: Row;
  readonly first: boolean;
  readonly group: Group;
  readonly participants: { readonly user: string; readonly assistant: string };
}) {
  const reader = row.role === "user";
  return (
    <div
      className="gx-chat-row"
      data-live={row.live ? "" : undefined}
      data-role={row.role}
    >
      <span
        aria-hidden="true"
        className="gx-chat-avatar"
        data-empty={first ? undefined : ""}
      >
        {reader
          ? participants.user.slice(0, 1).toUpperCase()
          : participants.assistant.slice(0, 1).toUpperCase()}
      </span>
      <div className="gx-chat-message">
        {first ? (
          <p className="gx-chat-meta">
            {reader ? participants.user : participants.assistant} · {row.at}
          </p>
        ) : null}
        <div
          className="gx-bubble"
          data-align={reader ? "end" : "start"}
          data-group={group === "single" ? undefined : group}
        >
          <p
            className="gx-bubble-surface"
            data-variant={reader ? "default" : "muted"}
          >
            {row.body === "" ? "…" : row.body}
            {row.image === undefined ? null : (
              <img
                alt={row.image.alt}
                className="gx-chat-image"
                height={129}
                loading="lazy"
                src={row.image.src}
                width={230}
              />
            )}
          </p>
          {row.reaction === undefined ? null : (
            <div
              aria-label={`Reaction: ${row.reaction}`}
              className="gx-bubble-reactions"
              role="img"
            >
              {row.reaction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface ChatDemoProps {
  /** The opening transcript; the default is the docs page's agent thread. */
  readonly seed?: ReadonlyArray<Row>;
  /** What the assistant streams back after a send. */
  readonly reply?: string;
  readonly title?: string;
  /** The idle line under the title. */
  readonly idleSummary?: string;
  readonly placeholder?: string;
  readonly participants?: { readonly user: string; readonly assistant: string };
  /** Whether the transcript opens at the newest message. */
  readonly startPinned?: boolean;
  /** Whether the "jump to latest" affordance is drawn. */
  readonly showJump?: boolean;
}

export function ChatDemo({
  seed: initialSeed = seed,
  reply = REPLY,
  title = "New Thread",
  idleSummary = STATUS_COPY.idle,
  placeholder = "Ask the agent to seal a dossier…",
  participants = { user: "You", assistant: "Assistant" },
  startPinned = true,
  showJump = true,
}: ChatDemoProps = {}) {
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [rows, setRows] = useState<ReadonlyArray<Row>>(initialSeed);
  const [draft, setDraft] = useState("");
  const [pinned, setPinned] = useState(startPinned);
  const [unread, setUnread] = useState(0);
  const [sends, setSends] = useState(0);
  const transcript = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLTextAreaElement | null>(null);
  const words = useRef<ReadonlyArray<string>>([]);
  const nextId = useRef(initialSeed.length + 1);
  const busy = status === "streaming";

  const scrollToEnd = useCallback(() => {
    const element = transcript.current;
    if (element !== null) element.scrollTop = element.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    if (pinned) scrollToEnd();
  }, [pinned, rows, scrollToEnd]);

  // A thread that opens at the top stays there even when the browser restores
  // the scroll position of the page's scroll containers.
  useLayoutEffect(() => {
    if (startPinned) return;
    const element = transcript.current;
    if (element !== null) element.scrollTop = 0;
  }, [startPinned]);

  // The native field grows to its content; the drawing measures the same way,
  // so the row's cross axis is the line count's, not one fixed row.
  useLayoutEffect(() => {
    const element = field.current;
    if (element === null) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [draft]);

  useEffect(() => {
    if (status !== "streaming") return;
    const timer = setInterval(() => {
      const word = words.current[0];
      if (word === undefined) {
        setStatus("idle");
        setRows((current) =>
          current.map((row) => (row.live ? { ...row, live: false } : row)),
        );
        return;
      }
      words.current = words.current.slice(1);
      setRows((current) =>
        current.map((row) =>
          row.live
            ? { ...row, body: row.body === "" ? word : `${row.body} ${word}` }
            : row,
        ),
      );
    }, 110);
    return () => clearInterval(timer);
  }, [status]);

  const send = (): void => {
    if (busy || draft.trim() === "") return;
    const failing = (sends + 1) % 3 === 0;
    setSends((count) => count + 1);
    words.current = reply.split(" ");
    setStatus("streaming");
    setRows((current) => {
      const next = [
        ...current,
        {
          id: nextId.current++,
          role: "user" as const,
          body: draft,
          at: "now",
          live: false,
        },
        {
          id: nextId.current++,
          role: "assistant" as const,
          body: "",
          at: "now",
          live: true,
        },
      ];
      return failing
        ? next.map((row) =>
            row.id === next[next.length - 1]?.id
              ? { ...row, body: "The reply failed.", live: false }
              : row,
          )
        : next;
    });
    if (failing) {
      setStatus("error");
    } else if (!pinned) {
      setUnread((count) => count + 2);
    }
    setDraft("");
  };

  const stop = (): void => {
    words.current = [];
    setStatus("idle");
    setRows((current) =>
      current.map((row) => (row.live ? { ...row, live: false } : row)),
    );
  };

  const retry = (): void => {
    words.current = reply.split(" ");
    setStatus("streaming");
    setRows((current) => [
      ...current,
      {
        id: nextId.current++,
        role: "assistant",
        body: "",
        at: "now",
        live: true,
      },
    ]);
  };

  const reset = (): void => {
    words.current = [];
    setStatus("idle");
    setRows(initialSeed);
    setDraft("");
    setUnread(0);
    setPinned(true);
  };

  const atEnd = (): boolean => {
    const element = transcript.current;
    if (element === null) return true;
    return (
      element.scrollHeight - element.scrollTop - element.clientHeight <= 24
    );
  };

  return (
    <div className="gx-chat" data-pinned={pinned ? "true" : "false"}>
      <div className="gx-chat-head">
        <div className="gx-chat-head-copy">
          <p className="gx-chat-title">{title}</p>
          <p
            className="gx-chat-summary"
            data-error={status === "error" ? "" : undefined}
            role="status"
          >
            {status === "idle" ? idleSummary : STATUS_COPY[status]}
          </p>
        </div>
        <div className="gx-chat-head-actions">
          <button
            className="gx-btn gx-btn-ghost gx-btn-sm"
            disabled={busy}
            onClick={reset}
            type="button"
          >
            Reset
          </button>
          {status === "error" ? (
            <button
              className="gx-btn gx-btn-primary gx-btn-sm"
              onClick={retry}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>

      <div className="gx-chat-stage">
        <div
          className="gx-chat-messages"
          onScroll={() => {
            const next = atEnd();
            setPinned(next);
            if (next) setUnread(0);
          }}
          ref={transcript}
        >
          <div className="gx-chat-content">
            {runsOf(rows).map((run) => (
              <div
                className="gx-chat-turn"
                data-role={run[0]?.role}
                key={run[0]?.id}
              >
                {run.map((row, index) => (
                  <Row
                    first={index === 0}
                    group={groupOf(index, run.length)}
                    key={row.id}
                    participants={participants}
                    row={row}
                  />
                ))}
              </div>
            ))}
            {busy ? (
              <p className="gx-chat-sr">
                {participants.assistant} is replying.
              </p>
            ) : null}
          </div>
        </div>
        {pinned || !showJump ? null : (
          <div className="gx-chat-jump">
            <button
              className="gx-btn gx-btn-secondary gx-btn-sm"
              onClick={() => {
                scrollToEnd();
                setPinned(true);
                setUnread(0);
              }}
              type="button"
            >
              {unread === 0
                ? "Jump to latest"
                : `${unread} new ${unread === 1 ? "message" : "messages"}`}
            </button>
          </div>
        )}
      </div>

      <div className="gx-chat-composer">
        <div className="gx-chat-composer-row">
          <textarea
            aria-label="Message"
            className="gx-chat-field"
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={placeholder}
            ref={field}
            rows={1}
            value={draft}
          />
          {busy ? (
            <button
              className="gx-btn gx-btn-secondary gx-btn-sm"
              onClick={stop}
              type="button"
            >
              Stop
            </button>
          ) : (
            <button
              aria-label="Send"
              className="gx-btn gx-btn-primary gx-btn-sm"
              disabled={draft.trim() === ""}
              onClick={send}
              type="button"
            >
              <BrowserIcon className="gx-chat-send-icon" name="send" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const chatDemoSource = `import {
  Bubble,
  BubbleContent,
  BubbleReactions,
  ChatComposer,
  ChatHeader,
  ChatMessages,
  ChatRoot,
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  chatMove,
} from "@gpuixui/components";

export const Conversation = ({ status, setStatus, messages, send, stop, retry }) => (
  // The middle grows; the header and composer do not. Appending a row or
  // streaming a reply cannot move the composer.
  <ChatRoot
    status={status}
    onStatusChange={setStatus}
    onSubmit={send}
    onStop={stop}
    onRetry={retry}
  >
    <ChatHeader
      title="New Thread"
      description="Ask the agent to seal a dossier or move a licence."
    />
    <ChatMessages>
      {messages.map((message) => (
        <Message key={message.id} variant={message.role} timestamp={message.at}>
          <MessageAvatar />
          <MessageContent streaming={message.streaming}>
            <MessageHeader />
            <Bubble
              align={message.role === "user" ? "end" : "start"}
              variant={message.role === "user" ? "default" : "muted"}
              group={message.group}
            >
              <BubbleContent>{message.body}</BubbleContent>
              {message.reaction ? (
                <BubbleReactions label={\`Reaction: \${message.reaction}\`}>
                  {message.reaction}
                </BubbleReactions>
              ) : null}
            </Bubble>
          </MessageContent>
        </Message>
      ))}
    </ChatMessages>
    <ChatComposer
      placeholder="Ask the agent to seal a dossier…"
      hint="Enter sends · Shift+Enter adds a line"
    />
  </ChatRoot>
);`;

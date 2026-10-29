/**
 * Browser preview for the Message scroller page.
 *
 * The shipped scroller follows the tail while the reader is at the end and
 * leaves them alone when they are not. The preview reproduces the contract with
 * the browser's own numbers: `scrollHeight - scrollTop - clientHeight` is the
 * distance to the tail, an appended row scrolls only while the reader is at it,
 * and the floating control appears over the viewport's bottom edge only while
 * the reader is away. The transcript is a real scroll container with a fixed
 * height; the padding belongs to its content, and no row paints a box.
 */

import { useLayoutEffect, useRef, useState } from "react";

interface Message {
  readonly id: number;
  readonly from: string;
  readonly at: string;
  readonly body: string;
}

/** A scroll container's three measurements, in the browser's own units. */
export interface ScrollBox {
  readonly scrollHeight: number;
  readonly scrollTop: number;
  readonly clientHeight: number;
}

/** Whether the reader is close enough to the tail to keep following it. */
export const atEnd = (box: ScrollBox, threshold = 24): boolean =>
  box.scrollHeight - box.scrollTop - box.clientHeight <= threshold;

/** A container's three measurements, or a box at rest when there is none. */
const boxOf = (element: HTMLDivElement | null): ScrollBox =>
  element === null
    ? { scrollHeight: 0, scrollTop: 0, clientHeight: 0 }
    : {
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
        clientHeight: element.clientHeight,
      };

/** The jump control's copy: the word when nothing arrived, else the count. */
export const jumpLabel = (unread: number): string =>
  unread === 0
    ? "Jump to latest"
    : `${unread} new ${unread === 1 ? "message" : "messages"}`;

const initial: ReadonlyArray<Message> = [
  { id: 1, from: "Ada", at: "09:38", body: "Build #481 passed in 2m 14s." },
  { id: 2, from: "Grace", at: "09:39", body: "Nightly export is at 62%." },
  { id: 3, from: "Ada", at: "09:40", body: "Ingest queue is empty again." },
  { id: 4, from: "Lin", at: "09:41", body: "Release notes are with the team." },
  { id: 5, from: "Grace", at: "09:42", body: "Cache warm-up took 38s." },
  {
    id: 6,
    from: "Ada",
    at: "09:43",
    body: "Nightly export finished in 6m 02s.",
  },
  { id: 7, from: "Lin", at: "09:44", body: "Ingest holds two batches." },
];

export function MessageScrollerDemo() {
  const [messages, setMessages] = useState<ReadonlyArray<Message>>(initial);
  const [pinned, setPinned] = useState(true);
  const [unread, setUnread] = useState(0);
  const viewport = useRef<HTMLDivElement | null>(null);

  const scrollToEnd = (): void => {
    const element = viewport.current;
    if (element !== null) element.scrollTop = element.scrollHeight;
  };

  // A pinned reader follows every arrival; a released one keeps their place.
  useLayoutEffect(() => {
    if (pinned) scrollToEnd();
  }, [messages, pinned]);

  const append = (): void => {
    setMessages((current) => [
      ...current,
      {
        id: (current[current.length - 1]?.id ?? 0) + 1,
        from: "Ada",
        at: "now",
        body: `Run #${current.length + 1} finished.`,
      },
    ]);
    if (!pinned) setUnread((count) => count + 1);
  };

  const jump = (): void => {
    scrollToEnd();
    setPinned(true);
    setUnread(0);
  };

  const reset = (): void => {
    setMessages(initial);
    setPinned(true);
    setUnread(0);
  };

  return (
    <div className="gx-scroller">
      <div className="gx-scroller-card">
        <p className="gx-scroller-title">Conversation</p>
        <div className="gx-scroller-stage">
          <div
            aria-label="Conversation"
            className="gx-scroller-viewport"
            onScroll={() => {
              const next = atEnd(boxOf(viewport.current));
              setPinned(next);
              if (next) setUnread(0);
            }}
            ref={viewport}
            role="region"
            tabIndex={0}
          >
            <div className="gx-scroller-content">
              {messages.map((message) => (
                <div className="gx-scroller-row" key={message.id}>
                  <span className="gx-scroller-row-meta">
                    {message.from} · {message.at}
                  </span>
                  <span className="gx-scroller-row-body">{message.body}</span>
                </div>
              ))}
            </div>
          </div>
          {pinned ? null : (
            <div className="gx-scroller-jump">
              <button
                className="gx-btn gx-btn-secondary gx-btn-sm"
                onClick={jump}
                type="button"
              >
                {jumpLabel(unread)}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="gx-scroller-actions">
        <button
          className="gx-btn gx-btn-secondary gx-btn-sm"
          onClick={append}
          type="button"
        >
          Append message
        </button>
        <button
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={reset}
          type="button"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export const messageScrollerDemoSource = `import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "@gpuixui/components";

export const Conversation = ({ messages }) => (
  <MessageScroller label="Conversation">
    <MessageScrollerViewport style={{ height: 320 }}>
      <MessageScrollerContent style={{ padding: 12 }}>
        {messages.map((message) => (
          <MessageScrollerItem key={message.id}>
            <text>{message.body}</text>
          </MessageScrollerItem>
        ))}
      </MessageScrollerContent>
    </MessageScrollerViewport>
    <MessageScrollerJumpToLatest />
  </MessageScroller>
);`;

/**
 * Browser preview for the Message scroller page.
 *
 * The shipped scroller follows the tail while the reader is at the end and
 * leaves them alone when they are not: a 1px sentinel's position relative to
 * the viewport is the pin measure, and `JumpToLatest` renders only while
 * unpinned, with the unread count. The preview reproduces that contract — an
 * appended row stays out of sight once the reader has scrolled up, and the
 * affordance below the viewport reports how many are new.
 */

import { useState } from "react";

const initial = [
  "Build #481 passed in 2m 14s.",
  "Nightly export is at 62%.",
  "Ingest queue is empty again.",
] as const;

export function MessageScrollerDemo() {
  const [messages, setMessages] = useState<ReadonlyArray<string>>(initial);
  const [pinned, setPinned] = useState(true);
  const [unread, setUnread] = useState(0);

  const append = (): void => {
    setMessages((current) => [
      ...current,
      `Run #${current.length + 1} finished.`,
    ]);
    if (!pinned) setUnread((current) => current + 1);
  };

  const scrollUp = (): void => {
    setPinned(false);
  };

  const jump = (): void => {
    setPinned(true);
    setUnread(0);
  };

  return (
    <div className="gx-scroller">
      <div className="gx-scroller-card">
        <p className="gx-scroller-title">Conversation</p>
        <div className="gx-scroller-viewport" aria-label="Conversation">
          {messages.map((message, index) => (
            <div className="gx-scroller-row" key={index}>
              <span className="gx-scroller-row-meta">#{index + 1}</span>
              <span className="gx-scroller-row-body">{message}</span>
            </div>
          ))}
        </div>
        {pinned ? null : (
          <button className="gx-scroller-jump" onClick={jump} type="button">
            {unread === 0
              ? "Jump to latest"
              : `${unread} new ${unread === 1 ? "message" : "messages"}`}
          </button>
        )}
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
            disabled={!pinned}
            onClick={scrollUp}
            type="button"
          >
            Scroll up
          </button>
        </div>
        <p className="gx-scroller-readout">
          pinned: <b>{pinned ? "true" : "false"}</b> · unread: <b>{unread}</b>
        </p>
      </div>
      <p className="gx-scroller-note">
        The pin is measured from a 1px tail sentinel, not a scroll height. The
        affordance sits beneath the viewport — an overlay would resolve against
        the window in 0.11.0, not the corner.
      </p>
    </div>
  );
}

export const messageScrollerDemoSource = `import {
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "@gpuixui/components";

export const Conversation = ({ messages }) => (
  <MessageScroller label="Conversation">
    <MessageScrollerViewport style={{ height: 320 }}>
      {messages.map((message) => (
        <MessageScrollerItem key={message.id}>
          <text>{message.body}</text>
        </MessageScrollerItem>
      ))}
    </MessageScrollerViewport>
    <MessageScrollerJumpToLatest />
  </MessageScroller>
);`;

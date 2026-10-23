/**
 * Chat behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: an empty conversation with no explanation; a composer
 * that sends a second message while the first is still streaming; a Stop that
 * reaches the transport as a submit; Escape doing nothing while a reply is open;
 * a draft that is not cleared after a send; a failed reply with no way to retry;
 * an appended message that pushes the composer around; and rows that do not
 * follow the tail while the reader is pinned.
 *
 * The composer's key contract is measured here rather than assumed: Enter
 * arrives as the textarea's `onSubmit` and Shift+Enter as a newline that reaches
 * no handler, so the suite proves the send path and the newline path separately.
 */

import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import type { ChatStatus } from "../chat/logic.js";
import { ChatComposer, ChatMessages, ChatRoot } from "../chat.js";
import { clickCentreOf, requireBounds } from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { MessageContent, MessageRoot } from "../message.js";

/** One conversation: a bounded transcript, then the composer. */
const Conversation = ({
  rows,
  status,
  onSubmit,
  onStop,
  onRetry,
  onStatusChange,
  error,
  empty,
}: {
  readonly rows: number;
  readonly status?: ChatStatus;
  readonly onSubmit?: (message: string) => void;
  readonly onStop?: () => void;
  readonly onRetry?: () => void;
  readonly onStatusChange?: (status: ChatStatus) => void;
  readonly error?: string;
  readonly empty?: string;
}) => (
  <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
    <ChatRoot
      testId="chat"
      status={status}
      onSubmit={onSubmit ?? (() => undefined)}
      onStop={onStop}
      onRetry={onRetry}
      onStatusChange={onStatusChange}
      error={error}
    >
      <ChatMessages
        empty={
          empty === undefined ? undefined : <text testId="empty">{empty}</text>
        }
      >
        {Array.from({ length: rows }, (_, index) => (
          <MessageRoot key={index} testId={`row-${index}`} variant="assistant">
            <MessageContent testId={`body-${index}`}>
              <text>{`message ${index}`}</text>
            </MessageContent>
          </MessageRoot>
        ))}
      </ChatMessages>
      <ChatComposer testId="composer" hint="Enter to send" />
    </ChatRoot>
  </div>
);

/** Focus the field and send each character as a real key press. */
const type = (root: ComponentTestRoot, text: string): void => {
  root.renderer.focusElement(
    root.renderer.findByTestId("chat-field")?.id ?? -1,
  );
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

/** The viewport's vertical scroll offset; `0` when it has not scrolled. */
const offsetOf = (root: ComponentTestRoot): number =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(root.renderer.findByTestId("chat-messages")),
      (viewport) =>
        Option.fromNullishOr(root.renderer.getScrollOffset(viewport.id)?.[1]),
    ),
    () => 0,
  );

/** Wheel over the transcript. Positive values scroll toward older rows. */
const wheel = (root: ComponentTestRoot, deltaY: number): void => {
  const { x, y, width, height } = requireBounds(root, "chat-messages");
  root.renderer.nativeSimulateScrollWheel(
    x + width / 2,
    y + height / 2,
    0,
    deltaY,
  );
};

/** Whether the last row sits inside the transcript's painted box. */
const endIsVisible = (root: ComponentTestRoot, last: number): boolean => {
  const viewport = requireBounds(root, "chat-messages");
  const row = requireBounds(root, `row-${last}`);
  return row.y + row.height <= viewport.y + viewport.height + 1;
};

describe("Chat", () => {
  it("explains an empty conversation", () => {
    const root = renderComponent(<Conversation rows={0} />);

    expect(root.renderer.findByTestId("chat-empty")).toBeDefined();
    expect(root.renderer.getAllText()).toEqual(
      expect.arrayContaining([
        "Start the conversation",
        "Messages you send appear here.",
      ]),
    );

    root.unmount();
  });

  it("lets the caller replace the empty panel and hides it once rows exist", () => {
    const root = renderComponent(<Conversation rows={0} empty="Nothing yet" />);

    expect(root.renderer.getAllText()).toContain("Nothing yet");
    expect(root.renderer.getAllText()).not.toContain("Start the conversation");

    root.rerender(<Conversation rows={2} empty="Nothing yet" />);
    expect(root.renderer.findByTestId("chat-empty")).toBeUndefined();
    expect(root.renderer.getAllText()).not.toContain("Nothing yet");

    root.unmount();
  });

  it("sends the drafted text on Enter, clears the draft and moves to submitting", () => {
    const onSubmit = vi.fn();
    const onStatusChange = vi.fn();
    const root = renderComponent(
      <Conversation
        rows={1}
        onSubmit={onSubmit}
        onStatusChange={onStatusChange}
      />,
    );

    type(root, "hello");
    root.renderer.simulateKeystrokes("enter");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("hello");
    expect(onStatusChange).toHaveBeenCalledWith("submitting");

    // The consumer reports the reply finished, so the next send is allowed.
    root.rerender(
      <Conversation
        rows={1}
        status="idle"
        onSubmit={onSubmit}
        onStatusChange={onStatusChange}
      />,
    );
    // The draft was cleared: the next send is only what was typed afterwards.
    type(root, "again");
    root.renderer.simulateKeystrokes("enter");
    expect(onSubmit).toHaveBeenLastCalledWith("again");

    root.unmount();
  });

  it("opens a new line on Shift+Enter without sending", () => {
    const onSubmit = vi.fn();
    const root = renderComponent(<Conversation rows={1} onSubmit={onSubmit} />);

    type(root, "first");
    root.renderer.simulateKeystrokes("shift-enter");
    type(root, "second");

    expect(onSubmit).not.toHaveBeenCalled();

    root.renderer.simulateKeystrokes("enter");
    expect(onSubmit).toHaveBeenCalledWith("first\nsecond");

    root.unmount();
  });

  it("offers Stop instead of Send while a reply is open", () => {
    const root = renderComponent(
      <Conversation rows={1} status="streaming" onStop={() => undefined} />,
    );

    expect(root.renderer.findByTestId("chat-stop")).toBeDefined();
    expect(root.renderer.findByTestId("chat-send")).toBeUndefined();

    root.unmount();
  });

  it("refuses a send while a reply is open, and keeps the draft it refused", () => {
    const onSubmit = vi.fn();
    const root = renderComponent(
      <Conversation
        rows={1}
        status="streaming"
        onSubmit={onSubmit}
        onStop={() => undefined}
      />,
    );

    type(root, "queued");
    root.renderer.simulateKeystrokes("enter");

    expect(onSubmit).not.toHaveBeenCalled();
    // The machine refuses the submit, so the reader's words must survive it:
    // clearing a draft nobody received is how a message disappears.
    expect(root.renderer.findByTestId("chat-field")?.customProps?.value).toBe(
      "queued",
    );

    // The same draft is what the next accepted send carries.
    root.rerender(
      <Conversation rows={1} onSubmit={onSubmit} onStop={() => undefined} />,
    );
    root.renderer.simulateKeystrokes("enter");
    expect(onSubmit).toHaveBeenCalledWith("queued");

    root.unmount();
  });

  it("stops the open reply with Escape and re-enables Send", () => {
    const onStop = vi.fn();
    const onStatusChange = vi.fn();
    const onSubmit = vi.fn();
    const root = renderComponent(
      <Conversation
        rows={1}
        status="streaming"
        onSubmit={onSubmit}
        onStop={onStop}
        onStatusChange={onStatusChange}
      />,
    );

    type(root, "a");
    root.renderer.simulateKeystrokes("escape");

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("idle");

    root.rerender(
      <Conversation
        rows={1}
        onSubmit={onSubmit}
        onStop={onStop}
        onStatusChange={onStatusChange}
      />,
    );
    expect(root.renderer.findByTestId("chat-send")).toBeDefined();

    root.unmount();
  });

  it("shows a failed reply and retries it", () => {
    const onRetry = vi.fn();
    const onStatusChange = vi.fn();
    const root = renderComponent(
      <Conversation
        rows={2}
        status="error"
        error="The model timed out."
        onRetry={onRetry}
        onStatusChange={onStatusChange}
      />,
    );

    expect(root.renderer.findByTestId("chat-error")).toBeDefined();
    expect(root.renderer.getAllText()).toContain("The model timed out.");

    clickCentreOf(root, "chat-error-retry");
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("submitting");

    root.unmount();
  });

  it("keeps the failed reply visible when the reader is scrolled to the top", () => {
    const root = renderComponent(
      <Conversation rows={30} status="error" onRetry={() => undefined} />,
    );
    wheel(root, 2000);

    // The failure is laid out between the viewport and the affordance, so a
    // reader at the top of a long transcript still sees it without scrolling.
    // Inside the scroller it would sit past the viewport's box, off the window.
    const error = requireBounds(root, "chat-error");
    const viewport = requireBounds(root, "chat-messages");
    const chat = requireBounds(root, "chat");
    expect(error.y).toBeGreaterThanOrEqual(viewport.y + viewport.height);
    expect(error.y + error.height).toBeLessThanOrEqual(
      chat.y + chat.height + 1,
    );

    root.unmount();
  });

  it("takes a disabled field out of the tab order and paints the disabled role", () => {
    const root = renderComponent(
      <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
        <ChatRoot onSubmit={() => undefined}>
          <ChatMessages>
            <MessageRoot testId="row">
              <MessageContent>
                <text>hi</text>
              </MessageContent>
            </MessageRoot>
          </ChatMessages>
          <ChatComposer testId="composer" disabled />
        </ChatRoot>
      </div>,
    );
    const field = root.renderer.findByTestId("chat-field");
    const theme = darkTheme;

    expect(field?.customProps?.tabIndex).toBe(-1);
    expect(field?.style.color).toBe(theme.colors.disabledForeground);

    root.unmount();
  });

  it("keeps the composer in place when a message arrives and follows the tail", () => {
    const root = renderComponent(<Conversation rows={30} />);
    const composerBefore = requireBounds(root, "composer");
    expect(endIsVisible(root, 29)).toBe(true);

    root.rerender(<Conversation rows={31} />);

    expect(endIsVisible(root, 30)).toBe(true);
    expect(requireBounds(root, "composer").y).toBe(composerBefore.y);

    root.unmount();
  });

  it("does not yank a reader who scrolled up while a message arrives", () => {
    const root = renderComponent(<Conversation rows={30} />);
    wheel(root, 160);
    const before = offsetOf(root);
    expect(before).toBeLessThan(0);

    root.rerender(<Conversation rows={31} />);

    expect(offsetOf(root)).toBe(before);
    expect(endIsVisible(root, 30)).toBe(false);

    root.unmount();
  });

  it("renders the attachments and hint a caller supplies", () => {
    const root = renderComponent(
      <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
        <ChatRoot onSubmit={() => undefined}>
          <ChatMessages>
            <MessageRoot testId="row">
              <MessageContent>
                <text>hi</text>
              </MessageContent>
            </MessageRoot>
          </ChatMessages>
          <ChatComposer
            testId="composer"
            hint="Enter to send"
            attachments={<text>report.pdf</text>}
          />
        </ChatRoot>
      </div>,
    );

    expect(root.renderer.getAllText()).toEqual(
      expect.arrayContaining(["report.pdf", "Enter to send"]),
    );

    root.unmount();
  });
});

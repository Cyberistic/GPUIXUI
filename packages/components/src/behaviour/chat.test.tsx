/**
 * Chat behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a composer that submits while the assistant is still
 * answering; Shift+Enter sending instead of adding a newline; a Stop control
 * that sends the draft; Escape that stops an idle conversation; an error with
 * no visible message or no way to retry; an Attach control rendered without a
 * handler; a transcript that does not follow an appended row; and an empty
 * state the caller cannot place.
 */

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../internal/button.js";
import type { ChatStatus as Status } from "../chat/logic.js";
import { Chat, ChatComposer, ChatEmpty, ChatMessages } from "../chat.js";
import { Message, MessageContent } from "../message.js";
import { nodesWithRole } from "../internal/a11y.js";
import { clickCentreOf } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

const idle: Status = { _tag: "idle" };
const submitting: Status = { _tag: "submitting" };
const streaming: Status = { _tag: "streaming" };

/** Focus the composer and type each character as a real key press. */
const focusComposer = (chat: ComponentTestRoot): void => {
  const composer = chat.renderer.findByTestId("composer");
  if (composer === undefined) throw new Error("no composer");
  chat.renderer.focusElement(composer.id);
};

const type = (chat: ComponentTestRoot, text: string): void => {
  focusComposer(chat);
  text.split("").forEach((key) => chat.renderer.simulateKeystrokes(key));
};

/** Click the measured centre of the element whose text is `text`. */
const clickText = (chat: ComponentTestRoot, text: string): void => {
  const element = chat.renderer.findByText(text);
  if (element === undefined) throw new Error(`no element with text ${text}`);
  const bounds = chat.renderer.getElementBounds(element.id);
  if (bounds === null) throw new Error(`no bounds for ${text}`);
  chat.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
};

const Harness = ({
  status,
  onSubmit,
  onStop,
  onStatusChange,
  onAttach,
  rows = [],
}: {
  readonly status: Status;
  readonly onSubmit: (text: string) => void;
  readonly onStop?: () => void;
  readonly onStatusChange?: (status: Status) => void;
  readonly onAttach?: () => void;
  readonly rows?: ReadonlyArray<string>;
}) => (
  <div
    style={{
      width: 480,
      height: 640,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Chat
      label="Assistant"
      status={status}
      onSubmit={onSubmit}
      onStop={onStop}
      onStatusChange={onStatusChange}
      onAttach={onAttach}
    >
      <ChatMessages testId="messages" style={{ height: 240 }}>
        {rows.map((row) => (
          <Message key={row} variant="assistant">
            <MessageContent text={row} />
          </Message>
        ))}
      </ChatMessages>
      <ChatComposer label="Message the assistant" testId="composer" />
    </Chat>
  </div>
);

describe("Chat", () => {
  it("submits a trimmed draft once on Enter and clears it", () => {
    const onSubmit = vi.fn();
    const onStatusChange = vi.fn();
    const chat = renderComponent(
      <Harness
        status={idle}
        onSubmit={onSubmit}
        onStatusChange={onStatusChange}
      />,
    );

    type(chat, "  hello  ");
    chat.renderer.simulateKeystrokes("enter");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("hello");
    expect(onStatusChange).toHaveBeenCalledWith({ _tag: "submitting" });

    chat.renderer.simulateKeystrokes("enter");
    expect(onSubmit).toHaveBeenCalledTimes(1);

    chat.unmount();
  });

  it("keeps Shift+Enter as a newline and does not submit", () => {
    const onSubmit = vi.fn();
    const chat = renderComponent(<Harness status={idle} onSubmit={onSubmit} />);

    type(chat, "one");
    chat.renderer.simulateKeystrokes("shift-enter");

    expect(onSubmit).not.toHaveBeenCalled();

    type(chat, "two");
    chat.renderer.simulateKeystrokes("enter");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("one\ntwo");

    chat.unmount();
  });

  it("stops instead of submitting while streaming", () => {
    const onSubmit = vi.fn();
    const onStop = vi.fn();
    const onStatusChange = vi.fn();
    const chat = renderComponent(
      <Harness
        status={streaming}
        onSubmit={onSubmit}
        onStop={onStop}
        onStatusChange={onStatusChange}
      />,
    );

    expect(chat.renderer.findByText("Send")).toBeUndefined();
    expect(chat.renderer.findByText("Stop")).toBeDefined();

    clickText(chat, "Stop");

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onStatusChange).toHaveBeenCalledWith({ _tag: "idle" });

    chat.unmount();
  });

  it("does not submit again while submitting", () => {
    const onSubmit = vi.fn();
    const chat = renderComponent(
      <Harness status={submitting} onSubmit={onSubmit} />,
    );

    type(chat, "again");
    chat.renderer.simulateKeystrokes("enter");

    expect(onSubmit).not.toHaveBeenCalled();

    chat.unmount();
  });

  it("shows the error message and lets the draft retry", () => {
    const onSubmit = vi.fn();
    const chat = renderComponent(
      <Harness
        status={{ _tag: "error", message: "The model timed out." }}
        onSubmit={onSubmit}
      />,
    );

    expect(nodesWithRole(chat.renderer, "alert")).toHaveLength(1);
    expect(chat.renderer.getAllText()).toContain("The model timed out.");

    type(chat, "retry");
    chat.renderer.simulateKeystrokes("enter");

    expect(onSubmit).toHaveBeenCalledWith("retry");

    chat.unmount();
  });

  it("stops on Escape only while work is in flight", () => {
    const onSubmit = vi.fn();
    const onStop = vi.fn();
    const chat = renderComponent(
      <Harness status={streaming} onSubmit={onSubmit} onStop={onStop} />,
    );

    focusComposer(chat);
    chat.renderer.simulateKeystrokes("escape");
    expect(onStop).toHaveBeenCalledTimes(1);

    chat.rerender(
      <Harness status={idle} onSubmit={onSubmit} onStop={onStop} />,
    );

    focusComposer(chat);
    chat.renderer.simulateKeystrokes("escape");
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();

    chat.unmount();
  });

  it("renders Attach only when the caller wires it, and runs it once", () => {
    const onSubmit = vi.fn();
    const onAttach = vi.fn();
    const chat = renderComponent(
      <Harness status={idle} onSubmit={onSubmit} onAttach={onAttach} />,
    );

    clickText(chat, "Attach files");
    expect(onAttach).toHaveBeenCalledTimes(1);

    chat.rerender(<Harness status={idle} onSubmit={onSubmit} />);
    expect(chat.renderer.findByText("Attach files")).toBeUndefined();

    chat.unmount();
  });

  it("follows an appended row while pinned", () => {
    const onSubmit = vi.fn();
    const Follow = () => {
      const [rows, setRows] = useState(
        Array.from({ length: 30 }, (_, index) => `Row ${index + 1}`),
      );
      return (
        <div
          style={{
            width: 480,
            height: 640,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Chat label="Assistant" status={idle} onSubmit={onSubmit}>
            <ChatMessages testId="messages" style={{ height: 240 }}>
              {rows.map((row) => (
                <Message key={row} variant="assistant">
                  <MessageContent text={row} />
                </Message>
              ))}
            </ChatMessages>
            <Button
              testId="append"
              onClick={() => setRows([...rows, `Row ${rows.length + 1}`])}
            >
              Append
            </Button>
            <ChatComposer label="Message the assistant" testId="composer" />
          </Chat>
        </div>
      );
    };
    const chat = renderComponent(<Follow />);
    const viewport = chat.renderer.findByTestId("messages-viewport");
    if (viewport === undefined) throw new Error("no viewport");
    const before = chat.renderer.getScrollOffset(viewport.id);
    if (before === null) throw new Error("the transcript is not scrollable");

    clickCentreOf(chat, "append");

    const after = chat.renderer.getScrollOffset(viewport.id);
    if (after === null) throw new Error("the transcript is not scrollable");
    expect(after[1]).toBeLessThan(before[1]);

    chat.unmount();
  });

  it("renders the empty-state slot the caller places", () => {
    const chat = renderComponent(
      <Chat label="Assistant" status={idle} onSubmit={vi.fn()}>
        <ChatMessages testId="messages">
          <ChatEmpty
            title="No messages yet"
            description="Ask about the workspace."
          />
        </ChatMessages>
        <ChatComposer label="Message the assistant" testId="composer" />
      </Chat>,
    );

    expect(chat.renderer.getAllText()).toEqual(
      expect.arrayContaining(["No messages yet", "Ask about the workspace."]),
    );

    chat.unmount();
  });
});

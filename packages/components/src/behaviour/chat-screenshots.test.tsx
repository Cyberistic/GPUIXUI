/**
 * The chat family's evidence frames, through the native test renderer.
 *
 * Four states a reviewer reads: an idle conversation, a streaming reply, a
 * reader scrolled up with the jump control visible, and the full chat block at
 * the docs page's size. Each frame is the real GPUix paint, and each assertion
 * proves the state actually painted before the file was written — a blank
 * window is not evidence.
 *
 * The files land under `apps/playground/.artifacts/live/`, which is gitignored:
 * local evidence for the run, never repository content.
 */

import { mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Button } from "../internal/button.js";
import {
  ChatComposer,
  ChatHeader,
  ChatMessages,
  ChatRoot,
  type ChatStatus,
} from "../chat.js";
import { Bubble, BubbleContent } from "../bubble.js";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "../message.js";
import { requireBounds, settle } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

const directory = fileURLToPath(
  new URL("../../../../apps/playground/.artifacts/live/", import.meta.url),
);

const frame = (name: string): string => {
  mkdirSync(directory, { recursive: true });
  return `${directory}${name}.png`;
};

const capture = (
  root: ReturnType<typeof renderComponent>,
  path: string,
): number => {
  root.renderer.captureScreenshot(path);
  return statSync(path).size;
};

interface BlockProps {
  readonly status: ChatStatus;
  readonly rows: number;
  readonly grown?: boolean;
  readonly height?: number;
}

/** The block the docs page mounts: header, transcript, composer. */
const Block = ({ status, rows, grown, height = 560 }: BlockProps) => (
  <div
    style={{
      width: 780,
      height,
      display: "flex",
      flexDirection: "column",
      padding: 18,
    }}
  >
    <ChatRoot
      testId="chat-block"
      status={status}
      onSubmit={() => undefined}
      onStop={() => undefined}
      onRetry={() => undefined}
    >
      <ChatHeader
        title="New Thread"
        description="Ask the agent to change your code."
        actions={
          <Button size="sm" variant="ghost">
            Reset
          </Button>
        }
      />
      <ChatMessages testId="chat-block-messages">
        {Array.from({ length: rows }, (_, index) => {
          const role = index % 2 === 0 ? "user" : "assistant";
          return (
            <Message
              key={index}
              testId={`chat-block-row-${index}`}
              variant={role}
              timestamp={`09:${String(40 + index).padStart(2, "0")}`}
              style={grown && index === rows - 1 ? { height: 120 } : undefined}
            >
              <MessageAvatar />
              <MessageContent
                testId={`chat-block-body-${index}`}
                streaming={grown === true && index === rows - 1}
              >
                <MessageHeader />
                <Bubble
                  align={role === "user" ? "end" : "start"}
                  variant={role === "user" ? "muted" : "ghost"}
                >
                  <BubbleContent>
                    <text>
                      {role === "user"
                        ? "Is the release green?"
                        : "Every check passed except the last fix, which is still running."}
                    </text>
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          );
        })}
      </ChatMessages>
      <ChatComposer
        testId="chat-block-composer"
        hint="Enter sends · Shift+Enter adds a line"
      />
    </ChatRoot>
  </div>
);

/** Wheel over the transcript. Positive scrolls toward older rows. */
const wheel = (
  root: ReturnType<typeof renderComponent>,
  deltaY: number,
): void => {
  const { x, y, width, height } = requireBounds(root, "chat-block-messages");
  root.renderer.nativeSimulateScrollWheel(
    x + width / 2,
    y + height / 2,
    0,
    deltaY,
  );
};

describe.skipIf(process.platform !== "darwin")("Chat frames", () => {
  it("captures the idle conversation", () => {
    const root = renderComponent(<Block status="idle" rows={4} />);
    expect(requireBounds(root, "chat-block-composer").height).toBeGreaterThan(
      0,
    );
    expect(capture(root, frame("chat-idle"))).toBeGreaterThan(0);
    root.unmount();
  });

  it("captures a streaming reply", () => {
    const root = renderComponent(<Block status="streaming" rows={5} grown />);
    expect(root.renderer.findByTestId("message-streaming")).toBeDefined();
    expect(capture(root, frame("chat-streaming"))).toBeGreaterThan(0);
    root.unmount();
  });

  it("captures a reader scrolled up with the jump control", () => {
    const root = renderComponent(<Block status="idle" rows={18} />);
    wheel(root, 240);
    settle(root);
    expect(root.renderer.findByTestId("chat-jump")?.customProps?.tabIndex).toBe(
      0,
    );
    expect(capture(root, frame("chat-scrolled"))).toBeGreaterThan(0);
    root.unmount();
  });

  it("captures the full chat block", () => {
    const root = renderComponent(
      <Block status="idle" rows={8} height={640} />,
      "light",
    );
    expect(requireBounds(root, "chat-block").height).toBeGreaterThan(0);
    expect(capture(root, frame("chat-block"))).toBeGreaterThan(0);
    root.unmount();
  });
});
